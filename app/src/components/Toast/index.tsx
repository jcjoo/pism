import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/color';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const CONFIG: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: { icon: 'check-circle', color: colors.success.main, bg: colors.success.light, border: colors.success.main },
  error:   { icon: 'x-circle',     color: colors.danger.main, bg: colors.danger.light, border: colors.danger.main },
  warning: { icon: 'alert-circle', color: colors.warning.dark, bg: colors.warning.light, border: colors.warning.dark },
  info:    { icon: 'info',         color: colors.primary.main, bg: colors.light.main, border: colors.primary.main },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, options: ToastOptions = {}) => {
    const { type: t = 'info', duration = 3000 } = options;
    setMessage(msg);
    setType(t);

    if (timer.current) clearTimeout(timer.current);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -16, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, duration);
  }, [opacity, translateY]);

  const cfg = CONFIG[type];

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 56,
          left: 16,
          right: 16,
          zIndex: 9999,
          opacity,
          transform: [{ translateY }],
        }}
      >
        <View
          style={{
            backgroundColor: cfg.bg,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            borderLeftWidth: 4,
            borderLeftColor: cfg.border,
            shadowColor: 'black',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 6,
            elevation: 6,
          }}
        >
          <Feather name={cfg.icon as any} size={20} color={cfg.color} />
          <Text style={{ marginLeft: 10, flex: 1, color: '#1a1a1a', fontSize: 14, fontWeight: '500', lineHeight: 20 }}>
            {message}
          </Text>
        </View>
      </Animated.View>
    </ToastContext.Provider>
  );
}
