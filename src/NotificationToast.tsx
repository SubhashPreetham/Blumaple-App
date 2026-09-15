import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ToastContext = createContext({ show: () => {}, hide: () => {} });
export const useNotificationToast = () => useContext(ToastContext);

export function NotificationToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    opacity.stopAnimation();
    opacity.setValue(0);
    setVisible(false);
  }, [opacity]);
  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    opacity.stopAnimation();
    setVisible(true);
    Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }, 860);
  }, [opacity]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <ToastContext.Provider value={{ show, hide }}><View style={s.root}>
    {children}
    {visible ? <Animated.View pointerEvents="none" style={[s.position, { bottom: insets.bottom + 80, opacity }]}>
      <View style={s.toast}><Text accessibilityRole="alert" style={s.text}>We&apos;ll notify you</Text></View>
    </Animated.View> : null}
  </View></ToastContext.Provider>;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  position: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 1000, elevation: 30 },
  toast: { borderRadius: 22, paddingHorizontal: 22, paddingVertical: 12, backgroundColor: '#1A1C1D' },
  text: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
