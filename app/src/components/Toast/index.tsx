import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
  success: { icon: 'check-circle', color: '#1B8A3D', bg: '#E6F7EC', border: '#1B8A3D' },
  error:   { icon: 'x-circle',     color: '#DF1515', bg: '#FFF0F0', border: '#DF1515' },
  warning: { icon: 'alert-circle', color: '#B86E00', bg: '#FFF8E6', border: '#B86E00' },
  info:    { icon: 'info',         color: '#5A189A', bg: '#EAE3F0', border: '#5A189A' },
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
            shadowColor: '#000',
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
