import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function RequiredLoginPage({ loading, error, onLogin }: { loading: boolean; error: string | null; onLogin: (identifier?: string, password?: string) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [whatsAppLogin, setWhatsAppLogin] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={s.hero}><Image source={require('../images/blumaple-header-white.png')} style={s.logo} resizeMode="contain" /></View>
    {whatsAppLogin ? <View style={s.card}>
      <Text style={s.resetTitle}>SIGN IN WITH WHATSAPP</Text>
      <Text style={s.resetSubtitle}>Enter your WhatsApp number and the 4-digit OTP</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <TextInput value={whatsAppNumber} onChangeText={setWhatsAppNumber} keyboardType="phone-pad" placeholder="WhatsApp number" placeholderTextColor="#858D98" style={s.input} />
      <View style={s.otpRow}>{otp.map((digit, index) => <TextInput key={index} value={digit} onChangeText={(value) => setOtp((current) => current.map((item, itemIndex) => itemIndex === index ? value.replace(/\D/g, '').slice(-1) : item))} keyboardType="number-pad" maxLength={1} textAlign="center" style={s.otpInput} />)}</View>
      <Pressable disabled={loading} onPress={() => onLogin()} style={s.primary}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>VERIFY OTP</Text>}</Pressable>
      <Pressable onPress={() => setWhatsAppLogin(false)} style={s.cancel}><Text style={s.cancelText}>Back to sign in ›</Text></Pressable>
    </View> : resetting ? <View style={s.card}>
      <Text style={s.resetTitle}>RESET YOUR PASSWORD</Text>
      <Text style={s.resetSubtitle}>We will send you an email to reset your password</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="Email address" placeholderTextColor="#858D98" style={s.input} />
      <Pressable disabled={loading} onPress={() => onLogin()} style={s.primary}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>SUBMIT</Text>}</Pressable>
      <Pressable onPress={() => setResetting(false)} style={s.cancel}><Text style={s.cancelText}>Cancel ›</Text></Pressable>
    </View> : creating ? <View style={s.card}>
      <Text style={s.createTitle}>CREATE AN ACCOUNT</Text>
      <Text style={s.createSubtitle}>Enter your information below to proceed. If you already have an account, please log in instead.</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <View style={s.nameRow}><TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#858D98" style={[s.input, s.nameInput]} /><TextInput value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#858D98" style={[s.input, s.nameInput]} /></View>
      <TextInput value={gstNumber} onChangeText={setGstNumber} autoCapitalize="characters" placeholder="GST number (optional)" placeholderTextColor="#858D98" style={s.input} />
      <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor="#858D98" style={s.input} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor="#858D98" style={s.input} />
      <Pressable disabled={loading} onPress={() => onLogin()} style={s.primary}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>CREATE AN ACCOUNT</Text>}</Pressable>
      <View style={s.loginRow}><Text style={s.accountText}>Already have an account? </Text><Pressable onPress={() => setCreating(false)}><Text style={s.createLoginLink}>Login ›</Text></Pressable></View>
    </View> : <View style={s.card}>
      <Text style={s.title}>LOGIN</Text>
      <Text style={s.subtitle}>If you have an account with us, please log in.</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="Email address" placeholderTextColor="#858D98" style={s.input} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor="#858D98" style={s.input} />
      <Pressable disabled={loading} onPress={() => onLogin(identifier, password)} style={s.primary}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>SIGN IN</Text>}</Pressable>
      <View style={s.accountRow}><Text style={s.accountText}>Don't have an account? </Text><Pressable onPress={() => setCreating(true)}><Text style={s.linkText}>Create an account ›</Text></Pressable></View>
      <Pressable onPress={() => setResetting(true)} style={s.forgot}><Text style={s.linkText}>Forgot your password? ›</Text></Pressable>
      <Pressable onPress={() => setWhatsAppLogin(true)} style={s.whatsApp}><Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" /><Text style={s.whatsAppText}>Sign in with WhatsApp OTP</Text></Pressable>
      <Pressable disabled={loading} onPress={() => onLogin()} style={s.google}><View style={s.googleIcon}><Ionicons name="logo-google" size={20} color="#DB4437" /></View><Text style={s.googleText}>Sign in with Google</Text></Pressable>
    </View>}
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0A254A' }, hero: { flex: 1, minHeight: 120, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' }, logo: { width: 220, height: 68 }, card: { paddingHorizontal: 22, paddingTop: 25, paddingBottom: 28, borderTopLeftRadius: 26, borderTopRightRadius: 26, alignItems: 'stretch', backgroundColor: '#FFFFFF' }, title: { color: '#111111', fontSize: 21, fontWeight: '500', textAlign: 'center' }, subtitle: { marginTop: 10, marginBottom: 26, color: '#222222', fontSize: 11, textAlign: 'center' }, resetTitle: { color: '#1A1C1D', fontSize: 23, fontWeight: '500', textAlign: 'center' }, resetSubtitle: { marginTop: 13, marginBottom: 30, color: '#2C2D2E', fontSize: 12, textAlign: 'center' }, createTitle: { color: '#1A1C1D', fontSize: 23, fontWeight: '500', textAlign: 'center' }, createSubtitle: { marginTop: 13, marginBottom: 22, paddingHorizontal: 8, color: '#2C2D2E', fontSize: 12, lineHeight: 18, textAlign: 'center' }, nameRow: { flexDirection: 'row', gap: 9 }, nameInput: { flex: 1 }, otpRow: { marginBottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 12 }, otpInput: { width: 48, height: 50, borderWidth: 1, borderColor: '#D8DADE', borderRadius: 7, color: '#1A1C1D', fontSize: 20, fontWeight: '700', backgroundColor: '#FFFFFF' }, error: { marginBottom: 12, padding: 10, borderRadius: 8, color: '#A32825', backgroundColor: '#FCE9E8', fontSize: 12, lineHeight: 17 }, input: { height: 48, marginBottom: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: '#ECEDEF', borderRadius: 6, color: '#1A1C1D', fontSize: 12, backgroundColor: '#FFFFFF' }, primary: { height: 48, marginTop: 6, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D2E30' }, primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, accountRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, loginRow: { marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, accountText: { color: '#151515', fontSize: 11 }, linkText: { color: '#3F72E5', fontSize: 11 }, createLoginLink: { color: '#3F72E5', fontSize: 14 }, forgot: { marginTop: 9, alignSelf: 'center' }, cancel: { marginTop: 20, alignSelf: 'center', padding: 4 }, cancelText: { color: '#3F72E5', fontSize: 14 }, whatsApp: { alignSelf: 'center', minWidth: 190, height: 38, marginTop: 12, paddingHorizontal: 14, borderRadius: 5, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366' }, whatsAppText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }, google: { alignSelf: 'center', height: 38, marginTop: 8, borderWidth: 1, borderColor: '#8E9298', borderRadius: 5, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' }, googleIcon: { width: 42, alignSelf: 'stretch', borderRightWidth: 1, borderRightColor: '#8E9298', alignItems: 'center', justifyContent: 'center' }, googleText: { paddingHorizontal: 14, color: '#333333', fontSize: 12 },
});
