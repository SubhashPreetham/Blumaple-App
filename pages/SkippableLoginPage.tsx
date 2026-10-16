// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';

export function SkippableLoginPage({ loading, error, onLogin, onGoogleLogin, onSkip, directToLogin = false }: { loading: boolean; error: string | null; onLogin: (identifier?: string, password?: string) => void; onGoogleLogin: () => void; onSkip: () => void; directToLogin?: boolean }) {
  const { width: screenWidth } = useWindowDimensions();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [landing, setLanding] = useState(!directToLogin);
  const [splash, setSplash] = useState(!directToLogin);
  const [splashBrandReady, setSplashBrandReady] = useState(false);
  const [introSlide, setIntroSlide] = useState(0);
  const [startPressed, setStartPressed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [signupError, setSignupError] = useState<string | null>(null);
  const transition = useRef(new Animated.Value(1)).current;
  const welcomeSlideProgress = useRef(new Animated.Value(1)).current;
  const splashProgress = useRef(new Animated.Value(0)).current;
  const splashEntrance = useRef(new Animated.Value(0)).current;
  const productRowTop = useRef(new Animated.Value(0)).current;
  const productRowBottom = useRef(new Animated.Value(-392)).current;
  const startingRef = useRef(false);
  const welcomeSlides = [
    { title: 'Discover\nsomething ', accent: 'new.', copy: 'Thoughtfully curated products\nfor your everyday and beyond.' },
    { title: 'From global brands to\n', accent: 'unique finds.', copy: 'Explore a world of trusted brands,\nhandpicked for you.' },
    { title: 'Because the best is\nyet to ', accent: 'be.', copy: 'New products. Fresh ideas.\nAlways something to discover.' },
  ];
  const brandLogos = [
    require('../images/dji logo.png'), require('../images/insta360 logo.png'), require('../images/sony logo.png'), require('../images/nikon logo.png'), require('../images/gopro logo.png'),
    require('../images/casio logo.png'), require('../images/logitech logo.png'), require('../images/samsung logo.png'), require('../images/canon logo.png'), require('../images/jbl logo.png'),
  ];
  const welcomeProducts = [
    require('../images/product 1.png'), require('../images/product 2.png'), require('../images/product 3.png'), require('../images/product 4.png'),
    require('../images/product 5.png'), require('../images/product 6.png'), require('../images/product 7.png'), require('../images/product 8.png'),
  ];
  const welcomeAssets = [require('../images/image copy 2.png'), ...brandLogos, ...welcomeProducts];
  const splashBrand = require('../images/blumaple logo.webp');
  useEffect(() => {
    Asset.loadAsync([splashBrand]).finally(() => setSplashBrandReady(true));
  }, [splashBrand]);
  useEffect(() => {
    Asset.loadAsync(welcomeAssets).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!splash || !splashBrandReady) return;
    splashProgress.setValue(0);
    splashEntrance.setValue(0);
    Animated.timing(splashEntrance, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const animation = Animated.timing(splashProgress, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });
    animation.start(({ finished }) => { if (finished) changeView(() => setSplash(false)); });
    return () => { animation.stop(); };
  }, [splash, splashBrandReady, splashEntrance, splashProgress]);
  useEffect(() => {
    if (!landing || introSlide !== 2) return;
    productRowTop.setValue(0);
    productRowBottom.setValue(-392);
    const topLoop = Animated.loop(Animated.timing(productRowTop, { toValue: -392, duration: 12000, easing: Easing.linear, useNativeDriver: true }));
    const bottomLoop = Animated.loop(Animated.timing(productRowBottom, { toValue: 0, duration: 12000, easing: Easing.linear, useNativeDriver: true }));
    const startTimer = setTimeout(() => { topLoop.start(); bottomLoop.start(); }, 360);
    return () => { clearTimeout(startTimer); topLoop.stop(); bottomLoop.stop(); };
  }, [introSlide, landing, productRowBottom, productRowTop]);
  const changeView = (change: () => void) => Animated.timing(transition, { toValue: 0, duration: 220, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
    if (!finished) return;
    change();
    transition.setValue(0);
    Animated.timing(transition, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  });
  const leaveLogin = (action: () => void) => Animated.timing(transition, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished) action(); });
  const continueToVerification = () => {
    if (!fullName.trim() || !identifier.trim() || !password || !confirmPassword) {
      setSignupError('Complete all fields to continue.');
      return;
    }
    if (password !== confirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }
    setSignupError(null);
    changeView(() => setVerifyingEmail(true));
  };
  const verifyEmail = () => {
    if (otp.join('').length !== 4) {
      setSignupError('Enter the 4-digit verification code.');
      return;
    }
    setSignupError(null);
    changeView(() => {
      setVerifyingEmail(false);
      setCreating(false);
    });
  };
  const visibleError = error && !/customer login is not configured/i.test(error) ? error : null;
  const enterApp = () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStartPressed(true);
    setTimeout(() => {
      // Keep the navy canvas visible while the welcome tree is replaced by login.
      // This avoids Android briefly compositing the white form sheet between views.
      transition.stopAnimation();
      transition.setValue(0);
      setLanding(false);
      requestAnimationFrame(() => Animated.timing(transition, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start());
    }, 120);
  };
  const continueWelcome = () => {
    if (introSlide === welcomeSlides.length - 1) { enterApp(); return; }
    Animated.timing(welcomeSlideProgress, { toValue: 0, duration: 180, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setIntroSlide(current => current + 1);
      welcomeSlideProgress.setValue(0);
      Animated.timing(welcomeSlideProgress, { toValue: 1, duration: 430, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
  };
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View pointerEvents="none" style={s.transitionBackdrop} />
    <Animated.View style={[s.transitionPage, { opacity: transition }]}> 
    {splash ? <View style={s.splash}>
      <Animated.View style={[s.splashCenter, { opacity: splashEntrance, transform: [{ scale: splashEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}><Image source={splashBrand} style={s.splashBrandImage} resizeMode="contain" /></Animated.View>
    </View> : landing ? <View style={s.welcome}>
      <Animated.View style={[s.welcomeSlide, { opacity: welcomeSlideProgress }]}><View style={[s.welcomeVisualBlank, { height: screenWidth - (introSlide === 0 ? 0 : 28), marginTop: introSlide === 0 ? -28 : 0 }, introSlide === 0 && s.welcomeHeroVisualBlank, introSlide === 1 && s.welcomeBrandVisualBlank, introSlide === 2 && s.welcomeProductVisualBlank]}>{introSlide === 0 ? <View style={s.welcomeHeroVisual}><Image source={require('../images/image copy 2.png')} resizeMode="contain" style={s.welcomeHeroImage} /><LinearGradient pointerEvents="none" start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} colors={['rgba(7,26,51,0)', 'rgba(21,68,110,0.12)', 'rgba(11,39,72,0.55)', 'rgba(7,26,51,0.94)', '#071A33']} locations={[0, 0.36, 0.60, 0.84, 1]} style={s.welcomeHeroBlend} /></View> : introSlide === 1 ? <View style={[s.brandCloud, { height: screenWidth * 0.82 }]}><View style={s.brandCloudGlow} /><View style={s.brandCloudGlowRed} /><View style={s.brandCloudRingOuter} /><View style={s.brandCloudRingInner} />{brandLogos.map((logo, index) => <View key={index} style={[s.brandCard, s[`brandCard${index}`]]}><Image source={logo} resizeMode="contain" style={s.brandCardLogo} /></View>)}</View> : <View style={s.productMarquee}><View style={s.productRowClip}><Animated.View style={[s.productRow, { transform: [{ translateX: productRowTop }] }]}>{[...welcomeProducts.slice(0, 4), ...welcomeProducts.slice(0, 4)].map((product, index) => <View key={`top-${index}`} style={s.welcomeProductCard}><Image source={product} resizeMode="contain" style={s.welcomeProductImage} /></View>)}</Animated.View></View><View style={s.productRowClip}><Animated.View style={[s.productRow, { transform: [{ translateX: productRowBottom }] }]}>{[...welcomeProducts.slice(4), ...welcomeProducts.slice(4)].map((product, index) => <View key={`bottom-${index}`} style={s.welcomeProductCard}><Image source={product} resizeMode="contain" style={s.welcomeProductImage} /></View>)}</Animated.View></View></View>}</View>
      <View style={s.welcomeContent}><Text style={s.welcomeCount}>0{introSlide + 1} / 03</Text><Text style={s.welcomeTitle}>{welcomeSlides[introSlide].title}<Text style={s.welcomeTitleAccent}>{welcomeSlides[introSlide].accent}</Text></Text><Text style={s.welcomeCopy}>{welcomeSlides[introSlide].copy}</Text></View></Animated.View>
      <View style={s.welcomeFooter}><View style={s.welcomeDots}>{welcomeSlides.map((_, index) => <View key={index} style={[s.welcomeDot, index === introSlide && s.welcomeDotActive]} />)}</View>{introSlide === welcomeSlides.length - 1 ? <Pressable onPress={continueWelcome} style={[s.welcomePrimary, startPressed && s.welcomePrimaryPressed]}><Text style={[s.welcomePrimaryText, startPressed && s.welcomePrimaryTextPressed]}>Get Started</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></Pressable> : <Pressable onPress={continueWelcome} style={({ pressed }) => [s.welcomeNext, pressed && s.welcomeNextPressed]}><Text style={s.welcomeNextText}>Next</Text><View style={s.welcomeNextArrow}><Ionicons name="arrow-forward" size={16} color="#FFFFFF" /></View></Pressable>}</View>
    </View> : <>
    {!verifyingEmail ? <Pressable onPress={() => leaveLogin(onSkip)} hitSlop={12} style={s.skip}><Text style={s.skipText}>Skip</Text></Pressable> : null}
    <LinearGradient colors={['#071A33', '#0A254A', 'rgba(35,70,113,0.34)', 'rgba(245,245,243,0)']} locations={[0, 0.42, 0.76, 1]} style={s.hero}><Image source={require('../images/blumaple-header-white.png')} style={s.logo} resizeMode="contain" /></LinearGradient>
    {resetting ? <View style={s.card}>
      <Text style={s.resetTitle}>RESET YOUR PASSWORD</Text>
      <Text style={s.resetSubtitle}>We will send you an email to reset your password</Text>
      {visibleError ? <Text style={s.error}>{visibleError}</Text> : null}
      <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="Email address" placeholderTextColor="#858D98" style={s.input} />
      <Pressable disabled={loading} onPress={() => onLogin()} style={s.primary}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>SUBMIT</Text>}</Pressable>
      <Pressable onPress={() => changeView(() => setResetting(false))} style={s.cancel}><Text style={s.cancelText}>Cancel ›</Text></Pressable>
    </View> : verifyingEmail ? <View style={s.card}>
      <Text style={s.createTitle}>VERIFY YOUR EMAIL</Text>
      <Text style={s.createSubtitle}>Enter the 4-digit verification code sent to{`\n`}<Text style={s.verificationEmail}>{identifier}</Text></Text>
      {signupError ? <Text style={s.error}>{signupError}</Text> : null}
      <View style={s.otpRow}>{otp.map((digit, index) => <TextInput key={index} value={digit} onChangeText={value => setOtp(current => current.map((item, position) => position === index ? value.replace(/\D/g, '').slice(-1) : item))} keyboardType="number-pad" maxLength={1} textAlign="center" style={s.otpInput} />)}</View>
      <Pressable onPress={verifyEmail} style={s.primary}><Text style={s.primaryText}>VERIFY EMAIL</Text></Pressable>
      <Pressable onPress={() => changeView(() => { setVerifyingEmail(false); setSignupError(null); })} style={s.cancel}><Text style={s.cancelText}>Back to details</Text></Pressable>
    </View> : creating ? <View style={s.card}>
      <Text style={s.createTitle}>CREATE AN ACCOUNT</Text>
      <Text style={s.createSubtitle}>Set up your account, then we’ll verify your email address.</Text>
      {signupError ? <Text style={s.error}>{signupError}</Text> : null}
      <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor="#858D98" style={s.input} />
      <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor="#858D98" style={s.input} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor="#858D98" style={s.input} />
      <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Confirm password" placeholderTextColor="#858D98" style={s.input} />
      <Pressable onPress={continueToVerification} style={s.primary}><Text style={s.primaryText}>CONTINUE</Text></Pressable>
      <View style={s.loginRow}><Text style={s.accountText}>Already have an account? </Text><Pressable onPress={() => changeView(() => setCreating(false))}><Text style={s.createLoginLink}>Login ›</Text></Pressable></View>
    </View> : <View style={s.card}>
      <Text style={s.title}>LOGIN</Text>
      <Text style={s.subtitle}>Use the same email and password as your Blumaple website account.</Text>
      {visibleError ? <Text style={s.error}>{visibleError}</Text> : null}
      <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="Email address" placeholderTextColor="#858D98" style={s.input} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor="#858D98" style={s.input} />
      <Pressable disabled={loading} onPress={() => leaveLogin(() => onLogin(identifier, password))} style={s.primary}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>SIGN IN</Text>}</Pressable>
      <View style={s.accountRow}><Text style={s.accountText}>Don't have an account? </Text><Pressable onPress={() => changeView(() => setCreating(true))}><Text style={s.linkText}>Create an account ›</Text></Pressable></View>
      <Pressable onPress={() => changeView(() => setResetting(true))} style={s.forgot}><Text style={s.linkText}>Forgot your password? ›</Text></Pressable>
      <Pressable disabled={loading} onPress={() => changeView(onGoogleLogin)} style={s.google}><View style={s.googleIcon}><Ionicons name="logo-google" size={20} color="#DB4437" /></View><Text style={s.googleText}>Sign in with Google</Text></Pressable>
    </View>}</>}
    </Animated.View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  transitionPage: { flex: 1, backgroundColor: '#071A33' },
  transitionBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#071A33' },
  whatsAppNumberRow: { marginBottom: 10, flexDirection: 'row', alignItems: 'stretch', gap: 6 }, countryCode: { width: 45, height: 48, borderWidth: 1, borderColor: '#ECEDEF', borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F7F9' }, countryCodeText: { color: '#1A1C1D', fontSize: 12, fontWeight: '800' }, whatsAppNumberInput: { flex: 1, minWidth: 0, marginBottom: 0 }, sendOtpButton: { width: 72, height: 48, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366' }, sendOtpDisabled: { opacity: 0.4 }, sendOtpText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  page: { flex: 1, backgroundColor: '#071A33' }, skip: { position: 'absolute', zIndex: 3, top: 18, right: 18, paddingHorizontal: 13, paddingVertical: 8 }, skipText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, welcome: { flex: 1, overflow: 'hidden', paddingHorizontal: 28, justifyContent: 'space-between', backgroundColor: '#071A33' }, welcomeImage: { position: 'absolute', top: -64, left: '-20%', width: '140%', height: '102%' }, welcomeImageFade: { position: 'absolute', top: -64, left: 0, right: 0, height: '108%' }, welcomeBrand: { position: 'absolute', left: 28, right: 28, bottom: 154, alignItems: 'flex-start' }, slideDots: { height: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }, slideDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.48)' }, slideProgressTrack: { width: 30, height: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.34)' }, slideProgressFill: { height: '100%', borderRadius: 4, backgroundColor: '#D44949' }, welcomeTagline: { marginTop: 15, color: '#FFFFFF', fontSize: 34, lineHeight: 38, letterSpacing: -1.2, fontWeight: '900' }, welcomeSupportingText: { width: 265, marginTop: 14, color: '#D5E1EF', fontSize: 13, lineHeight: 19, fontWeight: '600' }, welcomeActions: { position: 'absolute', left: 28, right: 28, bottom: 26 }, welcomePrimary: { height: 66, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', borderRadius: 33, overflow: 'hidden', backgroundColor: '#F8FBFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.76)', shadowColor: '#020B18', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 }, welcomeFill: { ...StyleSheet.absoluteFillObject, left: 0, right: 0 }, welcomeFillGradient: { flex: 1 }, welcomeStartIcon: { position: 'absolute', left: 8, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A254A', shadowColor: '#06172D', shadowOpacity: 0.25, shadowRadius: 7, elevation: 3 }, welcomeLeaf: { width: 29, height: 29 }, welcomePrimaryText: { flex: 1, marginLeft: 65, color: '#0A254A', fontSize: 15, fontWeight: '900' }, welcomeChevrons: { flexDirection: 'row', marginRight: 10 }, welcomeSecondary: { height: 50, borderWidth: 1.5, borderColor: '#0A254A', borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.82)' }, welcomeSecondaryText: { color: '#0A254A', fontSize: 14, fontWeight: '900' }, hero: { flex: 1, minHeight: 205, overflow: 'hidden', paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' }, heroBloomLarge: { position: 'absolute', width: 330, height: 330, top: -138, alignSelf: 'center', borderRadius: 165, borderWidth: 1, borderColor: 'rgba(178,204,238,0.2)', backgroundColor: 'rgba(61,96,145,0.18)' }, heroBloomSmall: { position: 'absolute', width: 190, height: 190, top: 5, right: -70, borderRadius: 95, backgroundColor: 'rgba(76,112,160,0.17)' }, logo: { width: 226, height: 74 }, card: { paddingHorizontal: 22, paddingTop: 25, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, alignItems: 'stretch', backgroundColor: '#FFFFFF' }, title: { color: '#111111', fontSize: 21, fontWeight: '500', textAlign: 'center' }, subtitle: { marginTop: 10, marginBottom: 26, color: '#222222', fontSize: 11, textAlign: 'center' }, resetTitle: { color: '#1A1C1D', fontSize: 23, fontWeight: '500', textAlign: 'center' }, resetSubtitle: { marginTop: 13, marginBottom: 30, color: '#2C2D2E', fontSize: 12, textAlign: 'center' }, createTitle: { color: '#1A1C1D', fontSize: 23, fontWeight: '500', textAlign: 'center' }, createSubtitle: { marginTop: 13, marginBottom: 22, paddingHorizontal: 8, color: '#2C2D2E', fontSize: 12, lineHeight: 18, textAlign: 'center' }, nameRow: { flexDirection: 'row', gap: 9 }, nameInput: { flex: 1 }, otpRow: { marginBottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 12 }, otpInput: { width: 48, height: 50, borderWidth: 1, borderColor: '#D8DADE', borderRadius: 7, color: '#1A1C1D', fontSize: 20, fontWeight: '700', backgroundColor: '#FFFFFF' }, error: { marginBottom: 12, padding: 10, borderRadius: 8, color: '#A32825', backgroundColor: '#FCE9E8', fontSize: 12, lineHeight: 17 }, input: { height: 48, marginBottom: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: '#E1E8F1', borderRadius: 10, color: '#1A1C1D', fontSize: 12, backgroundColor: '#F8FAFD' }, primary: { height: 48, marginTop: 6, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A254A' }, primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, accountRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, loginRow: { marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, accountText: { color: '#151515', fontSize: 11 }, linkText: { color: '#123E72', fontSize: 11 }, createLoginLink: { color: '#123E72', fontSize: 14 }, forgot: { marginTop: 9, alignSelf: 'center', padding: 4 }, cancel: { marginTop: 20, alignSelf: 'center', padding: 4 }, cancelText: { color: '#123E72', fontSize: 14 }, whatsApp: { alignSelf: 'center', minWidth: 190, height: 38, marginTop: 12, paddingHorizontal: 14, borderRadius: 5, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366' }, whatsAppText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }, google: { alignSelf: 'center', height: 38, marginTop: 8, borderWidth: 1, borderColor: '#D6E0ED', borderRadius: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' }, googleIcon: { width: 42, alignSelf: 'stretch', borderRightWidth: 1, borderRightColor: '#E0E7F1', alignItems: 'center', justifyContent: 'center' }, googleText: { paddingHorizontal: 14, color: '#333333', fontSize: 12 },
  welcomeFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  thumbLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  welcomePrimary: { height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#030B17', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  welcomePrimaryPressed: { backgroundColor: '#D94955', transform: [{ scale: 0.98 }] },
  welcomePrimaryText: { color: '#0A254A', fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  welcomePrimaryTextPressed: { color: '#FFFFFF' },
  splash: { flex: 1, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 34, paddingBottom: 52, backgroundColor: '#071A33' },
  splashCenter: { position: 'absolute', top: '50%', left: 0, right: 0, marginTop: -63, alignItems: 'center', justifyContent: 'center' },
  splashBrandImage: { width: 160, height: 126 },
  splashPortal: { position: 'absolute', top: '53%', left: 0, right: 0, height: 182, alignItems: 'center', justifyContent: 'center' },
  discoveryDeck: { position: 'relative', width: 214, height: 104, alignItems: 'center', justifyContent: 'center' },
  discoveryCard: { position: 'absolute', width: 66, height: 86, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(182,222,255,0.46)', backgroundColor: 'rgba(32,91,151,0.52)' },
  discoveryCardLeft: { left: 20, transform: [{ rotate: '-8deg' }] },
  discoveryCardRight: { right: 20, transform: [{ rotate: '8deg' }] },
  discoveryCardFocus: { zIndex: 3, width: 78, height: 98, borderColor: 'rgba(221,241,255,0.86)', backgroundColor: 'rgba(44,119,194,0.92)', shadowColor: '#6EB9FF', shadowOpacity: 0.65, shadowRadius: 17, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  discoveryHeart: { position: 'absolute', right: 8, top: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D94955', shadowColor: '#D94955', shadowOpacity: 0.7, shadowRadius: 7, shadowOffset: { width: 0, height: 2 } },
  discoveryShine: { position: 'absolute', zIndex: 4, top: 9, width: 27, height: 77, borderRadius: 14, backgroundColor: 'rgba(219,243,255,0.35)', transform: [{ rotate: '18deg' }] },
  discoveryDots: { position: 'absolute', bottom: 31, flexDirection: 'row', gap: 6, alignItems: 'center' },
  discoveryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(187,218,246,0.38)' },
  discoveryDotActive: { width: 22, backgroundColor: '#D94955' },
  portalLabel: { position: 'absolute', bottom: 2, color: '#DCEEFF', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  splashTagline: { marginTop: 8, color: '#D8E4F4', fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '400', letterSpacing: 0.2 },
  welcomeTagline: { marginTop: 15, color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 34, lineHeight: 39, letterSpacing: -0.35, fontWeight: '400' },
  skip: { position: 'absolute', zIndex: 5, top: 50, right: 18, paddingHorizontal: 13, paddingVertical: 8 },
  verificationEmail: { color: '#0A254A', fontWeight: '800' },
  page: { flex: 1, backgroundColor: '#071A33' },
  card: { paddingHorizontal: 22, paddingTop: 25, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, alignItems: 'stretch', borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF', shadowColor: '#969696', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 4 },
  welcome: { flex: 1, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 30, backgroundColor: '#071A33' },
  welcomeSlide: { flex: 1 },
  welcomeVisualBlank: { height: '43%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  welcomeHeroVisualBlank: { marginTop: -28, marginHorizontal: -28, overflow: 'hidden', alignItems: 'stretch', justifyContent: 'flex-start' },
  welcomeBrandVisualBlank: { justifyContent: 'flex-start' },
  welcomeProductVisualBlank: { marginHorizontal: -28, alignItems: 'stretch' },
  welcomeHeroVisual: { flex: 1, alignSelf: 'stretch', position: 'relative' },
  welcomeHeroImage: { width: '100%', height: '100%' },
  welcomeHeroBlend: { ...StyleSheet.absoluteFillObject },
  welcomeVisualHalo: { position: 'absolute', width: 330, height: 330, borderRadius: 165, borderWidth: 1, borderColor: 'rgba(160,189,231,0.16)', backgroundColor: 'rgba(43,80,133,0.13)' },
  welcomeVisualPanel: { width: '100%', height: '78%', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(197,217,244,0.14)', backgroundColor: 'rgba(10,37,74,0.16)' },
  productMarquee: { width: '100%', height: '86%', justifyContent: 'center', gap: 14, overflow: 'visible' },
  productRowClip: { height: 94, width: '100%', overflow: 'visible', justifyContent: 'center' },
  productRow: { position: 'absolute', left: 0, flexDirection: 'row', gap: 10 },
  welcomeProductCard: { width: 88, height: 88, padding: 8, borderRadius: 18, backgroundColor: '#FFFFFF', shadowColor: '#020B18', shadowOpacity: 0.25, shadowRadius: 11, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  welcomeProductImage: { width: '100%', height: '100%' },
  brandCloud: { width: '100%', height: '100%', position: 'relative' },
  brandCloudGlow: { position: 'absolute', alignSelf: 'center', top: '18%', width: 258, height: 184, borderRadius: 130, backgroundColor: 'rgba(52, 104, 173, 0.23)' },
  brandCloudGlowRed: { position: 'absolute', right: '1%', bottom: '1%', width: 112, height: 112, borderRadius: 56, backgroundColor: 'rgba(217, 73, 85, 0.15)' },
  brandCloudRingOuter: { position: 'absolute', alignSelf: 'center', top: '15%', width: '94%', height: '70%', borderRadius: 150, borderWidth: 1, borderColor: 'rgba(176, 211, 245, 0.18)' },
  brandCloudRingInner: { position: 'absolute', alignSelf: 'center', top: '29%', width: '62%', height: '42%', borderRadius: 95, borderWidth: 1, borderColor: 'rgba(217, 73, 85, 0.24)' },
  brandCard: { position: 'absolute', width: 78, height: 58, padding: 8, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 6 },
  brandCardLogo: { width: '100%', height: '100%' },
  brandCard0: { left: '4%', top: '4%' },
  brandCard1: { left: '39%', top: '0%' },
  brandCard2: { left: '74%', top: '5%' },
  brandCard3: { left: '21%', top: '30%' },
  brandCard4: { left: '57%', top: '27%' },
  brandCard5: { left: '4%', top: '56%' },
  brandCard6: { left: '39%', top: '52%' },
  brandCard7: { left: '74%', top: '57%' },
  brandCard8: { left: '21%', top: '80%' },
  brandCard9: { left: '57%', top: '77%' },
  welcomeContent: { minHeight: 206, paddingTop: 55 },
  welcomeCount: { color: '#B7C9DF', fontSize: 14, fontWeight: '600', letterSpacing: 0.4 },
  welcomeTitle: { marginTop: 27, color: '#FFFFFF', fontSize: 32, lineHeight: 38, fontWeight: '400', letterSpacing: -0.7 },
  welcomeTitleAccent: { color: '#E0474F' },
  welcomeCopy: { marginTop: 17, color: '#CBD8E8', fontSize: 15, lineHeight: 22, fontWeight: '400' },
  welcomeFooter: { minHeight: 72, marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcomeDots: { height: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
  welcomeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.28)' },
  welcomeDotActive: { backgroundColor: '#FFFFFF' },
  welcomeNext: { height: 48, paddingLeft: 17, paddingRight: 6, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.10)' },
  welcomeNextPressed: { backgroundColor: 'rgba(255,255,255,0.21)', borderColor: 'rgba(255,255,255,0.42)', transform: [{ scale: 0.96 }] },
  welcomeNextText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  welcomeNextArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D94955' },
  welcomePrimary: { height: 54, paddingHorizontal: 22, borderRadius: 27, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#D94955', shadowColor: '#020B18', shadowOpacity: 0.24, shadowRadius: 13, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  welcomePrimaryPressed: { backgroundColor: '#C83B48', transform: [{ scale: 0.985 }] },
  welcomePrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.1 },
  welcomePrimaryTextPressed: { color: '#FFFFFF' },
});
