import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setVisible(true);
    return new Promise(resolve => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setVisible(false);
    resolverRef.current?.(true);
  };

  const handleCancel = () => {
    setVisible(false);
    resolverRef.current?.(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#F8F5FC', borderRadius: 18, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#3C096C', marginBottom: 8 }}>
              {options.title}
            </Text>
            <Text style={{ fontSize: 14, color: '#5A189A', lineHeight: 20, marginBottom: 24 }}>
              {options.message}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={handleCancel}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 10,
                  backgroundColor: '#EAE3F0', alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '600', color: '#3C096C', fontSize: 15 }}>
                  {options.cancelText ?? 'Cancelar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 10,
                  backgroundColor: options.destructive ? '#DF1515' : '#3C096C',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '600', color: '#fff', fontSize: 15 }}>
                  {options.confirmText ?? 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}
