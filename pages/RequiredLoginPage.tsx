import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function RequiredLoginPage({ loading, error, onLogin }: { loading: boolean; error: string | null; onLogin: (identifier?: string, password?: string) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [whatsAppLogin, setWhatsAppLogin] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const transition = useRef(new Animated.Value(1)).current;
  const changeView = (change: () => void) => Animated.timing(transition, { toValue: 0, duration: 170, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
    if (!finished) return;
    change();
    transition.setValue(0);
    Animated.timing(transition, { toValue: 1, duration: 330, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  });
  const leaveLogin = (action: () => void) => Animated.timing(transition, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished) action(); });
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <Animated.View style={[s.transitionPage, { opacity: transition, transform: [{ translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
    <View style={s.hero}><Image source={require('../images/blumaple-header-white.png')} style={s.logo} resizeMode="contain" /></View>
    {whatsAppLogin ? <View style={s.card}>
      <Text style={s.resetTitle}>SIGN IN WITH WHATSAPP</Text>
      <Text style={s.resetSubtitle}>Enter your WhatsApp number and the 4-digit OTP</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <View style={s.whatsAppNumberRow}><View style={s.countryCode}><Text style={s.countryCodeText}>+91</Text></View><TextInput value={whatsAppNumber} onChangeText={value => { setWhatsAppNumber(value.replace(/\D/g, '').slice(0, 10)); setOtpRequested(false); }} keyboardType="number-pad" maxLength={10} placeholder="WhatsApp number" placeholderTextColor="#858D98" style={[s.input, s.whatsAppNumberInput]} /><Pressable disabled={whatsAppNumber.length !== 10} onPress={() => setOtpRequested(true)} style={[s.sendOtpButton, whatsAppNumber.length !== 10 && s.sendOtpDisabled]}><Text style={s.sendOtpText}>{otpRequested ? 'Sent' : 'Send OTP'}</Text></Pressable></View>
      <View style={s.otpRow}>{otp.map((digit, index) => <TextInput key={index} value={digit} onChangeText={(value) => setOtp((current) => current.map((item, itemIndex) => itemIndex === index ? value.replace(/\D/g, '').slice(-1) : item))} keyboardType="number-pad" maxLength={1} textAlign="center" style={s.otpInput} />)}</View>
      <Pressable disabled={loading} onPress={() => onLogin()} style={s.primary}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>VERIFY OTP</Text>}</Pressable>
      <Pressable onPress={() => changeView(() => setWhatsAppLogin(false))} style={s.cancel}><Text style={s.cancelText}>Back to sign in ›</Text></Pressable>
    </View> : resetting ? <View style={s.card}>
      <Text style={s.resetTitle}>RESET YOUR PASSWORD</Text>
      <Text style={s.resetSubtitle}>We will send you an email to reset your password</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="Email address" placeholderTextColor="#858D98" style={s.input} />
      <Pressable disabled={loading} onPress={() => onLogin()} style={s.primary}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>SUBMIT</Text>}</Pressable>
      <Pressable onPress={() => changeView(() => setResetting(false))} style={s.cancel}><Text style={s.cancelText}>Cancel ›</Text></Pressable>
    </View> : creating ? <View style={s.card}>
      <Text style={s.createTitle}>CREATE AN ACCOUNT</Text>
      <Text style={s.createSubtitle}>Enter your information below to proceed. If you already have an account, please log in instead.</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <View style={s.nameRow}><TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#858D98" style={[s.input, s.nameInput]} /><TextInput value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#858D98" style={[s.input, s.nameInput]} /></View>
      <TextInput value={gstNumber} onChangeText={setGstNumber} autoCapitalize="characters" placeholder="GST number (optional)" placeholderTextColor="#858D98" style={s.input} />
      <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor="#858D98" style={s.input} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor="#858D98" style={s.input} />
      <Pressable disabled={loading} onPress={() => onLogin()} style={s.primary}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>CREATE AN ACCOUNT</Text>}</Pressable>
      <View style={s.loginRow}><Text style={s.accountText}>Already have an account? </Text><Pressable onPress={() => changeView(() => setCreating(false))}><Text style={s.createLoginLink}>Login ›</Text></Pressable></View>
    </View> : <View style={s.card}>
      <Text style={s.title}>LOGIN</Text>
      <Text style={s.subtitle}>If you have an account with us, please log in.</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="Email address" placeholderTextColor="#858D98" style={s.input} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor="#858D98" style={s.input} />
      <Pressable disabled={loading} onPress={() => identifier.trim().toLowerCase() === 'admin@app.com' && password === '12345' ? leaveLogin(() => onLogin(identifier, password)) : onLogin(identifier, password)} style={s.primary}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>SIGN IN</Text>}</Pressable>
      <View style={s.accountRow}><Text style={s.accountText}>Don't have an account? </Text><Pressable onPress={() => changeView(() => setCreating(true))}><Text style={s.linkText}>Create an account ›</Text></Pressable></View>
      <Pressable onPress={() => changeView(() => setResetting(true))} style={s.forgot}><Text style={s.linkText}>Forgot your password? ›</Text></Pressable>
      <Pressable onPress={() => changeView(() => setWhatsAppLogin(true))} style={s.whatsApp}><Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" /><Text style={s.whatsAppText}>Sign in with WhatsApp OTP</Text></Pressable>
      <Pressable disabled={loading} onPress={() => changeView(() => onLogin())} style={s.google}><View style={s.googleIcon}><Ionicons name="logo-google" size={20} color="#DB4437" /></View><Text style={s.googleText}>Sign in with Google</Text></Pressable>
    </View>}
    </Animated.View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  transitionPage: { flex: 1 },
  whatsAppNumberRow: { marginBottom: 10, flexDirection: 'row', alignItems: 'stretch', gap: 6 }, countryCode: { width: 45, height: 48, borderWidth: 1, borderColor: '#ECEDEF', borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F7F9' }, countryCodeText: { color: '#1A1C1D', fontSize: 12, fontWeight: '800' }, whatsAppNumberInput: { flex: 1, minWidth: 0, marginBottom: 0 }, sendOtpButton: { width: 72, height: 48, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366' }, sendOtpDisabled: { opacity: 0.4 }, sendOtpText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  page: { flex: 1, backgroundColor: '#0A254A' }, hero: { flex: 1, minHeight: 120, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' }, logo: { width: 220, height: 68 }, card: { paddingHorizontal: 22, paddingTop: 25, paddingBottom: 28, borderTopLeftRadius: 26, borderTopRightRadius: 26, alignItems: 'stretch', backgroundColor: '#FFFFFF' }, title: { color: '#111111', fontSize: 21, fontWeight: '500', textAlign: 'center' }, subtitle: { marginTop: 10, marginBottom: 26, color: '#222222', fontSize: 11, textAlign: 'center' }, resetTitle: { color: '#1A1C1D', fontSize: 23, fontWeight: '500', textAlign: 'center' }, resetSubtitle: { marginTop: 13, marginBottom: 30, color: '#2C2D2E', fontSize: 12, textAlign: 'center' }, createTitle: { color: '#1A1C1D', fontSize: 23, fontWeight: '500', textAlign: 'center' }, createSubtitle: { marginTop: 13, marginBottom: 22, paddingHorizontal: 8, color: '#2C2D2E', fontSize: 12, lineHeight: 18, textAlign: 'center' }, nameRow: { flexDirection: 'row', gap: 9 }, nameInput: { flex: 1 }, otpRow: { marginBottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 12 }, otpInput: { width: 48, height: 50, borderWidth: 1, borderColor: '#D8DADE', borderRadius: 7, color: '#1A1C1D', fontSize: 20, fontWeight: '700', backgroundColor: '#FFFFFF' }, error: { marginBottom: 12, padding: 10, borderRadius: 8, color: '#A32825', backgroundColor: '#FCE9E8', fontSize: 12, lineHeight: 17 }, input: { height: 48, marginBottom: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: '#ECEDEF', borderRadius: 6, color: '#1A1C1D', fontSize: 12, backgroundColor: '#FFFFFF' }, primary: { height: 48, marginTop: 6, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D2E30' }, primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, accountRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, loginRow: { marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, accountText: { color: '#151515', fontSize: 11 }, linkText: { color: '#3F72E5', fontSize: 11 }, createLoginLink: { color: '#3F72E5', fontSize: 14 }, forgot: { marginTop: 9, alignSelf: 'center' }, cancel: { marginTop: 20, alignSelf: 'center', padding: 4 }, cancelText: { color: '#3F72E5', fontSize: 14 }, whatsApp: { alignSelf: 'center', minWidth: 190, height: 38, marginTop: 12, paddingHorizontal: 14, borderRadius: 5, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366' }, whatsAppText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }, google: { alignSelf: 'center', height: 38, marginTop: 8, borderWidth: 1, borderColor: '#8E9298', borderRadius: 5, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' }, googleIcon: { width: 42, alignSelf: 'stretch', borderRightWidth: 1, borderRightColor: '#8E9298', alignItems: 'center', justifyContent: 'center' }, googleText: { paddingHorizontal: 14, color: '#333333', fontSize: 12 },
});
