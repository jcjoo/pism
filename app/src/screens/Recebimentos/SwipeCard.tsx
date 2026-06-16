import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, PanResponder, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RouteStop, SwipeCardHandle } from './types';
import { colors } from '@/theme/color';
import {
  renderPrice, formatDate, isInstallment, installmentCount,
  pendingInstallments, effectiveDueDate, STATUS, openDrivingNav,
} from './helpers';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.28;

interface SwipeCardProps {
  stop:             RouteStop;
  onRequestReceive: () => void;
  onSwipeLeft:      () => void;
}

export const SwipeCard = React.forwardRef<SwipeCardHandle, SwipeCardProps>(
  ({ stop, onRequestReceive, onSwipeLeft }, ref) => {
    const pan     = useRef(new Animated.ValueXY()).current;
    const swiping = useRef(false);
    const reqRef  = useRef(onRequestReceive);
    const skipRef = useRef(onSwipeLeft);
    reqRef.current  = onRequestReceive;
    skipRef.current = onSwipeLeft;

    const resetPos = () => {
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6, tension: 80,
      }).start();
    };

    const doAnimateOut = (dir: 'left' | 'right'): Promise<void> =>
      new Promise(resolve => {
        swiping.current = true;
        Animated.timing(pan, {
          toValue: { x: dir === 'right' ? SCREEN_W * 1.5 : -SCREEN_W * 1.5, y: 0 },
          duration: 280, useNativeDriver: false,
        }).start(() => resolve());
      });

    React.useImperativeHandle(ref, () => ({ animateOut: doAnimateOut }));

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > 8,
        onPanResponderMove: (_, g) => {
          if (swiping.current) return;
          pan.x.setValue(g.dx);
          pan.y.setValue(g.dy * 0.12);
        },
        onPanResponderRelease: (_, g) => {
          if (swiping.current) return;
          if (g.dx > SWIPE_THRESHOLD) {
            resetPos();
            setTimeout(() => reqRef.current(), 160);
          } else if (g.dx < -SWIPE_THRESHOLD) {
            doAnimateOut('left').then(() => skipRef.current());
          } else {
            resetPos();
          }
        },
        onPanResponderTerminate: () => { if (!swiping.current) resetPos(); },
      })
    ).current;

    const rotate = pan.x.interpolate({
      inputRange: [-SCREEN_W, 0, SCREEN_W], outputRange: ['-12deg', '0deg', '12deg'], extrapolate: 'clamp',
    });
    const receivedOpacity = pan.x.interpolate({ inputRange: [20, 100],  outputRange: [0, 1], extrapolate: 'clamp' });
    const skipOpacity     = pan.x.interpolate({ inputRange: [-100, -20], outputRange: [1, 0], extrapolate: 'clamp' });

    const cfg    = STATUS[stop.status];
    const days   = stop.days;
    const isInst = isInstallment(stop.sale);
    const pend   = pendingInstallments(stop.sale);

    return (
      <Animated.View
        style={[
          {
            backgroundColor: colors.light.dark, borderRadius: 20, padding: 24,
            elevation: 6, shadowColor: 'black', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15, shadowRadius: 8,
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
          },
          { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Animated.View style={[
          { position: 'absolute', borderWidth: 3, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, top: 28, zIndex: 20 },
          { left: 20, borderColor: colors.success.main, transform: [{ rotate: '-15deg' }] },
          { opacity: receivedOpacity },
        ]}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: 2, color: colors.success.main }}>RECEBIDO</Text>
        </Animated.View>

        <Animated.View style={[
          { position: 'absolute', borderWidth: 3, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, top: 28, zIndex: 20 },
          { right: 20, borderColor: colors.danger.main, transform: [{ rotate: '15deg' }] },
          { opacity: skipOpacity },
        ]}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: 2, color: colors.danger.main }}>PULAR</Text>
        </Animated.View>

        <View className="flex-1 items-center justify-center">
          <Text className="text-[22px] font-bold text-primary-dark text-center mb-1">{stop.sale.clients?.name}</Text>
          <Text className="text-[13px] text-primary text-center mb-4 px-2">
            {stop.sale.clients?.address}
            {stop.city ? `, ${stop.city}` : ''}
            {stop.sale.clients?.municipio?.uf ? ` - ${stop.sale.clients.municipio.uf}` : ''}
          </Text>

          <Text className="text-[32px] font-bold text-center mb-1 text-secondary-dark">
            {renderPrice(stop.total)}
          </Text>

          {isInst && (
            <View className="flex-row items-center gap-1.5 mb-1">
              <Feather name="credit-card" size={12} color={colors.primary.main} />
              <Text className="text-[12px] text-primary font-semibold">
                {pend.length} de {installmentCount(stop.sale)} parcelas pendentes
              </Text>
            </View>
          )}

          <View className="w-4/5 border-t border-primary-light/40 my-3" />

          {stop.sale.sale_items.map((item, i) => (
            <Text key={i} className="text-[13px] text-primary-dark text-center mb-1">
              ({item.quantity}x) {item.products?.name} – {renderPrice(item.price * item.quantity)}
            </Text>
          ))}

          <View className="w-4/5 border-t border-primary-light/40 my-3" />

          <Text className="text-xs text-primary text-center mb-0.5">Data compra: {formatDate(stop.sale.created_at)}</Text>
          <Text className="text-xs text-primary text-center mb-4">
            {isInst ? `Próx. parcela: ${formatDate(effectiveDueDate(stop.sale))}` : `Vencimento: ${formatDate(stop.sale.dueDate)}`}
          </Text>

          {!!stop.sale.observation && (
            <View className="flex-row items-start gap-2 bg-white/60 rounded-[10px] px-3 py-2.5 mb-3 mx-4">
              <Feather name="message-square" size={14} color={colors.primary.main} style={{ marginTop: 1 }} />
              <Text className="text-[13px] text-primary-dark italic flex-1">{stop.sale.observation}</Text>
            </View>
          )}

          <View className="mt-2 px-3.5 py-1.5 rounded-full" style={{ backgroundColor: cfg.color }}>
            <Text className="text-xs font-bold text-white tracking-wide">
              {days < 0
                ? `${Math.abs(days)} dia${Math.abs(days) > 1 ? 's' : ''} em atraso`
                : days === 0 ? 'Vence hoje'
                : `Vence em ${days} dia${days > 1 ? 's' : ''}`}
            </Text>
          </View>

          <TouchableOpacity
            className="mt-5 flex-row items-center gap-1.5 opacity-60"
            onPress={() => openDrivingNav(stop.sale.clients?.address ?? '', stop.city)}
          >
            <Feather name="navigation" size={13} color={colors.primary.dark} />
            <Text className="text-[11px] text-primary-dark underline">Abrir no Maps</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }
);
