import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { ShopifyCustomer } from '../src/shopifyCustomerAuth';

type Section = 'overview' | 'personal' | 'addresses' | 'billing' | 'about' | 'policies' | 'faq' | 'notifications';

const accountMenu: Array<{ id: Exclude<Section, 'overview'>; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'personal', label: 'Account details', description: 'Manage your personal information', icon: 'person-circle-outline' },
  { id: 'addresses', label: 'Saved addresses', description: 'Manage delivery addresses', icon: 'location-outline' },
  { id: 'billing', label: 'Billing address', description: 'Manage business billing details', icon: 'card-outline' },
  { id: 'notifications', label: 'Notifications', description: 'Control order and offer alerts', icon: 'notifications-outline' },
];

const supportMenu: Array<{ id: Exclude<Section, 'overview'>; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'about', label: 'About Blumaple', description: 'Our story and values', icon: 'information-circle-outline' },
  { id: 'policies', label: 'Policies', description: 'Returns, shipping and privacy', icon: 'document-text-outline' },
  { id: 'faq', label: 'Get help', description: 'Frequently asked questions', icon: 'help-circle-outline' },
];

const faqItems = [
  ['Is Cash on Delivery (COD) available?', 'COD is available only on INDIA warehouse products. Online payment is required for USA warehouse products, as they involve importing.'],
  ['What are the warranty terms?', 'Warranty terms vary by product and brand. A manufacturer warranty is provided where applicable.'],
  ['Can I cancel my order after placing it?', 'Orders can be cancelled within 24 hours of purchase. Once the item is shipped internationally, cancellation isn’t possible.'],
  ['What is the return period?', 'You can request a return within 7 days of receiving your product, provided it is not physically damaged.'],
  ['Can I negotiate if I buy in bulk?', 'Yes, bulk purchase discounts are available. Please contact our support team at help@blumaple.com'],
  ['Do I need to pay any custom duties?', 'No, you don’t need to pay any extra custom duties. Blumaple takes care of all customs clearance.'],
  ['Are there any additional shipping charges?', 'No, it’s free shipping on all orders.'],
  ['How can I track my order?', 'Enter your Order ID here: ORDER TRACKING'],
  ['Why does delivery take 10+ business days?', 'We source products directly from global suppliers, and international shipping, customs clearance, and doorstep delivery may take additional time.'],
  ['Where is Blumaple located?', 'Blumaple is based in Hyderabad, India and operates as an online-only store.'],
] as const;

type ProfileAddress = { label: string; name: string; lastName: string; email: string; phone: string; company: string; building: string; line: string; city: string; state: string; pincode: string; gstin?: string };
const emptyAddress: ProfileAddress = { label: 'Home', name: '', lastName: '', email: '', phone: '', company: '', building: '', line: '', city: '', state: '', pincode: '' };

function AddressField({ placeholder, value, onChangeText, keyboardType = 'default', maxLength }: { placeholder: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad'; maxLength?: number }) {
  return <TextInput style={s.modalField} placeholder={placeholder} placeholderTextColor="#777E89" value={value} onChangeText={onChangeText} keyboardType={keyboardType} maxLength={maxLength} />;
}

const policyDocuments = [
  {
    title: 'Return, Refund & Warranty Policy',
    content: `Thank you for choosing Blumaple. We value your trust and are committed to providing high-quality products and reliable service. Please read our Return, Refund, and Warranty policy carefully before making a purchase.

By shopping with Blumaple, you agree to the terms outlined below.

1. Warranty Policy

• We provide a 15-day Seller Warranty from the date of delivery for all eligible products.
• This warranty covers manufacturing defects and product malfunctions under normal usage.
• Please note: U.S. imported products do not carry manufacturer warranty in India. Our seller warranty is limited to the first 15 days from delivery.
• After the 15-day warranty period, in exceptional cases, Blumaple may assist with product re-import for service/repair. 50% of re-import costs (including export charges, customs duty, and international shipping) will be borne by Blumaple. The remaining 50% must be covered by the customer.

2. Eligibility for Returns

• The product must be unused, in its original condition, and returned in the original packaging with all accessories, manuals, and invoices.
• The return request must be raised within 7 days from the date of delivery.
• Returns may not be accepted for customized, special-order, or clearance products, unless defective or damaged on arrival.

3. Return Process

1) Contact Us: Reach out to help@blumaple.com within 7 days of delivery. Provide your order number, product details, and reason for the return.
2) Authorization: Our team will review your request and issue a Return Authorization (RA) number with instructions. Returns sent without authorization may not be accepted.
3) Packaging & Shipping: Securely pack the product in its original packaging with all items included. Customers are responsible for return shipping unless the product is defective, damaged, or incorrect.

4. Refund Process

• Once we receive the returned product and verify its condition, your refund will be processed.
• Refund Method: Refunds will be issued to the original payment method. Please allow 7–10 business days for the refund to reflect.
• Original shipping charges are non-refundable, except for damaged, defective, or incorrect products.
• If you received a damaged or incorrect product, Blumaple will issue a full refund including shipping charges.

5. Important Notes

• Used, damaged, or incomplete returns may not qualify for a refund or warranty claim.
• Support after the 15-day window follows the shared re-import cost policy in Section 1.
• Blumaple reserves the right to amend this policy without prior notice. Updates will be available on this page.

6. Frequently Asked Questions

Q1. Can I return a product after 7 days?
Returns are only accepted within 7 days of delivery. After this period, Blumaple may assist with re-import support, with costs shared equally between Blumaple and the customer.

Q2. Who pays for return shipping?
Blumaple covers return shipping for defective, damaged, or incorrect products. Customers are responsible in other cases.

Q3. Can I return a used or opened product?
No. Products must be unused, unassembled, and in original packaging with all accessories included.

Q4. How long does it take to get a refund?
Refunds are processed within 7–10 business days after the returned product is received and verified.

Q5. Do all products come with warranty?
Blumaple offers a 15-day Seller Warranty. U.S. imports do not have official manufacturer warranty in India. Beyond 15 days, shared-cost re-import support may be available.

7. Contact Us

Email: help@blumaple.com
Phone/WhatsApp: +91 9000133275
Website: https://blumaple.com`,
  },
  {
    title: 'Shipping Policy',
    content: `Thank you for shopping with Blumaple LLP. We are committed to ensuring a smooth and reliable delivery experience across India.

1. Processing Time

• Orders are typically processed within 1–2 business days after payment confirmation, excluding weekends and public holidays.
• Times may vary with product availability or high-demand periods.

2. Delivery Time

• Standard Delivery (USA Warehouse): 10–15 business days from shipment.
• Quick Delivery (India Warehouse): 2 business days from shipment.
• Timelines may vary due to courier delays, weather, or regional restrictions.

3. Shipping Costs

Blumaple LLP offers free shipping.

4. Order Tracking

Once shipped, you will receive a tracking ID by email and WhatsApp. Use it on the courier partner’s website.

5. Address Accuracy

Customers must provide a complete and accurate address. Blumaple LLP is not liable for delays or failed deliveries caused by incorrect details.

6. Damaged, Delayed, or Missing Items

Contact support within 48 hours of delivery and provide your order number and clear photos where applicable. We will assist with a replacement or refund. Courier delays are outside our direct control, but we will help resolve them.

7. Shipping Restrictions

• Shipping is currently available only within India.
• We do not ship internationally.
• We cannot deliver to PO Boxes or military addresses.

8. Customer Support

Email: help@blumaple.com
Phone/WhatsApp: +91 9000133275`,
  },
  {
    title: 'Terms and Conditions',
    content: `Welcome to Blumaple LLP (“we,” “us,” or “our”). By accessing our website, purchasing products, or using our services, you agree to these Terms and Conditions.

1. Acceptance of Terms

By using this website, placing an order, or accessing our services, you confirm that you have read, understood, and agreed to these Terms.

2. Company Information

Blumaple LLP is an importer and supplier of premium global brands specializing in computer electronics, professional audio and video equipment, smart technology solutions, and accessories. We primarily import USA-based products.

3. Product Information

We strive for accurate descriptions, specifications, images, and pricing, but errors may occur. We may correct details without notice. Certain USA imports may not carry warranties valid in India; see our Return, Refund & Warranty Policy.

4. Orders and Payment

Orders are subject to acceptance and availability. Full payment is required using an accepted checkout method. An email confirmation does not guarantee acceptance. We may cancel orders due to unavailability, pricing errors, or suspected fraud.

5. Shipping and Delivery

• USA Warehouse: 10–15 business days from shipment.
• India Warehouse: 3 business days from shipment.
• We are not liable for delays beyond our control and do not offer international shipping.

6. Returns, Refunds & Warranties

We offer a 15-day seller warranty for most products. Manufacturer warranty may not apply to USA imports in India. After 15 days, Blumaple may bear 50% of re-import costs while the customer bears the remainder. Returns follow our Return & Refund Policy.

7. Intellectual Property

All logos, images, text, graphics, and software belong to Blumaple LLP or its licensors. Unauthorized use or distribution is prohibited.

8. User Conduct

You agree not to violate laws, engage in fraud or harmful activity, upload misleading or infringing content, or misrepresent your identity.

9. Limitation of Liability

Blumaple LLP is not liable for indirect, incidental, or consequential damages. Our liability will not exceed the amount paid for the product concerned.

10. Privacy & Data Protection

Please refer to our Privacy Policy to understand how we collect, use, and safeguard personal information.

11. Modifications to Terms

We may update these Terms without prior notice. Continued use after an update constitutes acceptance.

12. Governing Law

These Terms are governed by Indian law. Disputes are subject to the exclusive jurisdiction of courts in Hyderabad, India.

Note for Customers

Certain international warranties may not be valid in India. Review product-specific warranty and return details before purchase.`,
  },
  {
    title: 'Privacy Policy',
    content: `Effective Date: 07-07-2025

Blumaple respects your privacy and is committed to protecting the personal information you share with us.

1. Information We Collect

• Personal details: name, email, phone number, company name, and job title.
• Purchase information: billing/shipping address and payment details processed by third parties.
• Technical data: IP address, browser type, device information, and cookies.
• Information submitted through LinkedIn, Meta, or website lead forms.

2. How We Use Your Information

We use it to deliver products and services, answer support requests, share opted-in promotions, improve customer experience, and meet legal requirements.

3. Sharing of Information

We do not sell or rent personal information. We share data only with trusted service providers, marketing platforms for advertising and lead generation, or legal authorities when required.

4. Data Security

We use industry-standard safeguards, but no transmission or storage method is completely secure.

5. Your Rights

You may access, update, or delete your information; opt out of marketing; and request details about data use. Contact help@blumaple.com.

6. Cookies & Tracking

We use cookies and similar technologies to improve browsing, analyze traffic, and personalize content. Browser settings can manage preferences.

7. Third-Party Links

We are not responsible for third-party privacy practices. Please review their policies.

8. Updates to this Policy

Changes will appear here with an updated Effective Date.

9. Contact Us

Email: help@blumaple.com
Website: https://www.blumaple.com
Address: 1-61/AS/B/104, 1st Floor, B Block Asian Suncity Complex, Kothaguda, Hyderabad, Telangana 500084`,
  },
];

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={s.detail}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value}</Text></View>;
}

export function ProfilePage({ customer, onBack, setMainBackAction, onLogout }: { customer: ShopifyCustomer | null; onBack: () => void; setMainBackAction: (action: () => void) => void; onLogout: () => void }) {
  const [section, setSection] = useState<Section>('overview');
  const [aboutOpen, setAboutOpen] = useState(true);
  const [openPolicies, setOpenPolicies] = useState<Set<string>>(new Set());
  const [openFaqs, setOpenFaqs] = useState<Set<string>>(new Set());
  const [profileAddresses, setProfileAddresses] = useState<ProfileAddress[]>([]);
  const [billingAddresses, setBillingAddresses] = useState<ProfileAddress[]>([]);
  const [addressStorageReady, setAddressStorageReady] = useState(false);
  const [addressModal, setAddressModal] = useState<'saved' | 'billing' | null>(null);
  const [addressForm, setAddressForm] = useState<ProfileAddress>(emptyAddress);
  const [personalName, setPersonalName] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const logoutSheetProgress = useRef(new Animated.Value(0)).current;
  const [notifications, setNotifications] = useState({ orders: true, offers: true, arrivals: false, whatsapp: true });
  const loggedIn = Boolean(customer);
  useEffect(() => {
    setMainBackAction(section === 'overview' ? onBack : () => setSection('overview'));
  }, [onBack, section, setMainBackAction]);
  useEffect(() => {
    if (!customer) return;
    setAddressStorageReady(false);
    const shopifyAddresses = (customer.addresses?.nodes || []).map((address, index) => ({ label: index === 0 ? 'Default' : `Address ${index + 1}`, name: address.firstName || customer.firstName || '', lastName: address.lastName || customer.lastName || '', email: customer.emailAddress?.emailAddress || '', phone: (address.phoneNumber || customer.phoneNumber?.phoneNumber || '').replace(/\D/g, '').slice(-10), company: address.company || '', building: address.address1 || '', line: address.address2 || '', city: address.city || '', state: address.zoneCode || '', pincode: address.zip || '' }));
    const storageKey = `blumaple.profile.addresses.${customer.id.replace(/[^A-Za-z0-9._-]/g, '_')}`;
    SecureStore.getItemAsync(storageKey).catch(() => null).then(value => {
      if (!value) { setProfileAddresses(shopifyAddresses); return; }
      try { const stored = JSON.parse(value) as { saved?: ProfileAddress[]; billing?: ProfileAddress[] }; setProfileAddresses(stored.saved?.length ? stored.saved : shopifyAddresses); setBillingAddresses(stored.billing || []); } catch { setProfileAddresses(shopifyAddresses); }
    }).finally(() => setAddressStorageReady(true));
  }, [customer]);
  useEffect(() => {
    if (!customer) return;
    const storageKey = `blumaple.profile.personal.${customer.id.replace(/[^A-Za-z0-9._-]/g, '_')}`;
    SecureStore.getItemAsync(storageKey).catch(() => null).then(value => {
      try {
        const saved = value ? JSON.parse(value) as { name?: string; phone?: string } : null;
        setPersonalName(saved?.name || customer.displayName || customer.firstName || '');
        setPersonalPhone((saved?.phone || customer.phoneNumber?.phoneNumber || '').replace(/\D/g, '').slice(-10));
      } catch {
        setPersonalName(customer.displayName || customer.firstName || '');
        setPersonalPhone((customer.phoneNumber?.phoneNumber || '').replace(/\D/g, '').slice(-10));
      }
    });
  }, [customer]);
  useEffect(() => {
    if (!customer || !addressStorageReady) return;
    const safeCustomerId = customer.id.replace(/[^A-Za-z0-9._-]/g, '_');
    void SecureStore.setItemAsync(`blumaple.profile.addresses.${safeCustomerId}`, JSON.stringify({ saved: profileAddresses, billing: billingAddresses })).catch(() => {});
  }, [addressStorageReady, billingAddresses, customer, profileAddresses]);
  const toggle = (key: keyof typeof notifications) => setNotifications(current => ({ ...current, [key]: !current[key] }));
  const setAddressValue = (key: keyof ProfileAddress, value: string) => setAddressForm(current => ({ ...current, [key]: value }));
  const openAddressModal = (kind: 'saved' | 'billing') => { setAddressForm({ ...emptyAddress }); setAddressModal(kind); };
  const saveProfileAddress = () => {
    const commonFieldsInvalid = addressForm.phone.length !== 10 || addressForm.building.trim().length < 2 || addressForm.city.trim().length < 2 || addressForm.pincode.length !== 6;
    const identityFieldsInvalid = addressModal === 'billing'
      ? !addressForm.gstin?.trim() || addressForm.company.trim().length < 2
      : addressForm.name.trim().length < 2;
    if (commonFieldsInvalid || identityFieldsInvalid) {
      Alert.alert('Complete your address', `Fill all required ${addressModal === 'billing' ? 'billing' : 'address'} fields.`); return;
    }
    const saved = { ...addressForm, label: addressModal === 'billing' ? 'Billing' : addressForm.label || 'Home' };
    addressModal === 'billing' ? setBillingAddresses([saved]) : setProfileAddresses(current => [...current, saved]);
    setAddressModal(null);
  };
  const savePersonalDetails = () => {
    const normalizedPhone = personalPhone.replace(/\D/g, '');
    if (personalName.trim().length < 2) { setPersonalError('Enter your full name.'); return; }
    if (normalizedPhone.length !== 10) { setPersonalError('A valid 10-digit mobile number is required.'); return; }
    if (!customer) return;
    const storageKey = `blumaple.profile.personal.${customer.id.replace(/[^A-Za-z0-9._-]/g, '_')}`;
    void SecureStore.setItemAsync(storageKey, JSON.stringify({ name: personalName.trim(), phone: normalizedPhone })).catch(() => {});
    setPersonalName(personalName.trim());
    setPersonalPhone(normalizedPhone);
    setPersonalError(null);
    setEditingPersonal(false);
  };
  const dismissLogout = (afterDismiss?: () => void) => {
    Animated.timing(logoutSheetProgress, { toValue: 0, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      setLogoutVisible(false);
      afterDismiss?.();
    });
  };
  const confirmLogout = () => {
    if (!loggedIn) return;
    logoutSheetProgress.setValue(0);
    setLogoutVisible(true);
    requestAnimationFrame(() => Animated.timing(logoutSheetProgress, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start());
  };

  const name = personalName || customer?.displayName || customer?.firstName || 'Blumaple customer';
  const email = customer?.emailAddress?.emailAddress || 'Your account details';
  const initials = name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const renderMenuRow = (item: (typeof accountMenu)[number]) => <Pressable key={item.id} onPress={() => setSection(item.id)} style={({ pressed }) => [s.menuRow, pressed && s.menuRowPressed]}>
    <View style={s.menuIcon}><Ionicons name={item.icon} size={22} color="#3377D6" /></View>
    <View style={s.menuCopy}><Text style={s.menuRowTitle}>{item.label}</Text><Text style={s.menuRowDescription}>{item.description}</Text></View>
    <Ionicons name="chevron-forward" size={19} color="#7D8CA1" />
  </Pressable>;

  return <View style={s.page}>
      <ScrollView style={s.content} contentContainerStyle={s.contentContainer} showsVerticalScrollIndicator={false} scrollEnabled={section !== 'overview'} nestedScrollEnabled bounces={section !== 'overview'} alwaysBounceVertical={section !== 'overview'} decelerationRate="normal" scrollEventThrottle={16} overScrollMode="auto">
        {section === 'overview' ? <>
          <View style={s.profileCard}>
            <View style={s.profileOrbLarge} /><View style={s.profileOrbSmall} />
            <View style={s.profileAvatar}><Text style={s.profileAvatarText}>{initials}</Text></View>
            <View style={s.profileCopy}><Text style={s.profileMembership}>BLUMAPLE MEMBER</Text><Text numberOfLines={1} style={s.profileName}>{name}</Text><Text numberOfLines={1} style={s.profileEmail}>{email}</Text></View>
            <Pressable onPress={() => setSection('personal')} hitSlop={8} style={s.editProfileButton}><Ionicons name="pencil-outline" size={19} color="#3377D6" /></Pressable>
          </View>
          <View style={s.menuCard}>{accountMenu.map(renderMenuRow)}</View>
          <View style={s.menuCard}>{supportMenu.map(renderMenuRow)}<Pressable disabled={!loggedIn} onPress={confirmLogout} style={({ pressed }) => [s.menuRow, s.logoutRow, !loggedIn && s.logoutRowDisabled, pressed && s.menuRowPressed]}><View style={[s.menuIcon, s.logoutIcon]}><Ionicons name="log-out-outline" size={22} color="#3377D6" /></View><View style={s.menuCopy}><Text style={s.menuRowTitle}>Log out</Text><Text style={s.menuRowDescription}>Sign out of this device</Text></View><Ionicons name="chevron-forward" size={19} color="#7D8CA1" /></Pressable></View>
          <View style={s.appVersionWrap}><Text style={s.appVersion}>Blumaple · Version 1.0.0</Text></View>
        </> : <>
        {section === 'personal' ? <>
          <View style={s.detailHeadingRow}><View><Text style={s.sectionTitle}>Personal details</Text><Text style={s.sectionSubtitle}>Manage your account information</Text></View><Pressable onPress={() => { setPersonalError(null); setEditingPersonal(value => !value); }} style={s.editDetailsButton}><Ionicons name={editingPersonal ? 'close' : 'pencil-outline'} size={17} color="#3377D6" /><Text style={s.editDetailsButtonText}>{editingPersonal ? 'Cancel' : 'Edit'}</Text></Pressable></View>
          <View style={s.personalFormCard}>
            <Text style={s.fieldLabel}>FULL NAME</Text>
            <TextInput value={personalName} editable={editingPersonal} onChangeText={setPersonalName} placeholder="Your full name" placeholderTextColor="#8B98AA" style={[s.personalInput, !editingPersonal && s.personalInputLocked]} />
            <Text style={s.fieldLabel}>MOBILE NUMBER <Text style={s.requiredMark}>*</Text></Text>
            <View style={[s.phoneInputRow, !editingPersonal && s.personalInputLocked]}><Text style={s.countryCode}>+91</Text><TextInput value={personalPhone} editable={editingPersonal} onChangeText={value => setPersonalPhone(value.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" placeholder="10-digit mobile number" placeholderTextColor="#8B98AA" style={s.phoneInput} /></View>
            <Text style={s.fieldHint}>Required for order and delivery updates.</Text>
            <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
            <View style={s.emailLockedRow}><Ionicons name="lock-closed" size={15} color="#718198" /><Text numberOfLines={1} style={s.emailLockedText}>{email}</Text></View>
            <Text style={s.fieldHint}>Email is verified and cannot be changed here.</Text>
            {personalError ? <Text style={s.personalError}>{personalError}</Text> : null}
          </View>
          {editingPersonal ? <Pressable onPress={savePersonalDetails} style={s.primaryButton}><Text style={s.primaryButtonText}>Save changes</Text></Pressable> : <Pressable style={s.resetPasswordButton}><Ionicons name="key-outline" size={17} color="#3377D6" /><Text style={s.resetPasswordText}>Reset password</Text></Pressable>}
        </> : null}

        {section === 'addresses' ? <>
          <Text style={s.sectionTitle}>Saved addresses</Text>
          {profileAddresses.map((address, index) => <View key={`${address.label}-${index}`} style={s.addressCard}>
            <View style={s.addressHeader}><Text style={s.addressLabel}>{address.label}</Text><Pressable onPress={() => setProfileAddresses(current => current.filter((_, addressIndex) => addressIndex !== index))} hitSlop={8} style={s.deleteAddressButton}><Ionicons name="trash-outline" size={14} color="#C93835" /></Pressable></View>
            <Text style={s.addressName}>{address.name}</Text>
            <Text style={s.body}>{address.building}, {address.line}</Text>
            <Text style={s.body}>{address.city}, {address.state} – {address.pincode}</Text>
            <Text style={s.body}>+91 {address.phone}</Text>
          </View>)}
          <Pressable onPress={() => openAddressModal('saved')} style={s.addAddressButton}><Ionicons name="add-circle-outline" size={19} color="#FFFFFF" /><Text style={s.addAddressText}>Add address</Text></Pressable>
        </> : null}

        {section === 'billing' ? <>
          <Text style={s.sectionTitle}>Billing address</Text>
          {billingAddresses.map((address, index) => <View key={`billing-${index}`} style={s.addressCard}><View style={s.addressHeader}><Text style={s.addressLabel}>Billing</Text><Pressable onPress={() => setBillingAddresses([])} hitSlop={8} style={s.deleteAddressButton}><Ionicons name="trash-outline" size={14} color="#C93835" /></Pressable></View><Text style={s.addressName}>{address.company}</Text><Text style={s.gstinValue}>GSTIN: {address.gstin}</Text><Text style={s.body}>{address.building}{address.line ? `, ${address.line}` : ''}</Text><Text style={s.body}>{address.city}, {address.state} – {address.pincode}</Text><Text style={s.body}>+91 {address.phone}</Text></View>)}
          {!billingAddresses.length ? <><View style={s.emptyAddress}><Ionicons name="business-outline" size={30} color="#3377D6" /><Text style={s.emptyAddressText}>No billing address added</Text></View><Pressable onPress={() => openAddressModal('billing')} style={s.addAddressButton}><Ionicons name="add-circle-outline" size={19} color="#FFFFFF" /><Text style={s.addAddressText}>Add billing address</Text></Pressable></> : null}
        </> : null}

        {section === 'about' ? <>
          <View style={s.infoHero}><Image source={require('../assets/ui/home-maple-leaf.png')} style={s.aboutHeroLeaf} resizeMode="contain" /><Text style={s.infoHeroEyebrow}>ABOUT BLUMAPLE</Text><Text style={s.infoHeroTitle}>Global finds.{`\n`}Better everyday.</Text><Text style={s.infoHeroCopy}>Thoughtfully sourced technology and lifestyle essentials, made simple for India.</Text></View>
          <View style={s.aboutIntroCard}><Text style={s.aboutIntroTitle}>Bridging global excellence to your doorstep</Text><Text style={s.aboutIntroCopy}>We connect trusted global innovation with real Indian needs—bringing reliable products that add comfort, confidence and convenience to everyday living.</Text></View>
          <View style={s.aboutSectionCard}><Text style={s.aboutCardLabel}>WHAT WE CURATE</Text><Text style={s.aboutCardTitle}>A selection with purpose</Text><Text style={s.body}>Tech, smart accessories, lifestyle, home and industrial essentials—chosen for quality, durability and long-term value.</Text><View style={s.aboutChipRow}>{['Quality first', 'Built to last', 'Practical'].map(item => <View key={item} style={s.aboutChip}><Text style={s.aboutChipText}>{item}</Text></View>)}</View></View>
          <View style={s.aboutSectionCard}><Text style={s.aboutCardLabel}>OUR JOURNEY</Text><Text style={s.aboutCardTitle}>Built on progress</Text>{[['2020', 'The foundation'], ['2021', 'Building trust'], ['2022', 'Accelerating growth'], ['2023', 'Smarter fulfilment'], ['2024', 'Defining excellence'], ['2025', 'Website launch'], ['2026', 'Blumaple app launch']].map(([year, title], index) => <View key={year} style={[s.timelineRow, index === 6 && s.timelineRowLast]}><View style={s.timelineYear}><Text style={s.timelineYearText}>{year}</Text></View><Text style={s.timelineTitle}>{title}</Text></View>)}</View>
          <View style={s.aboutSectionCard}><Text style={s.aboutCardLabel}>WHY BLUMAPLE</Text><Text style={s.aboutCardTitle}>Designed around trust</Text>{[['shield-checkmark-outline', 'Verified global sourcing'], ['paper-plane-outline', 'Dependable delivery'], ['headset-outline', 'Human support']].map(([icon, title]) => <View key={title} style={s.aboutFeatureRow}><View style={s.aboutFeatureIcon}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color="#3377D6" /></View><Text style={s.aboutFeatureText}>{title}</Text></View>)}</View>
          <View style={s.missionCard}><Text style={s.missionLabel}>OUR MISSION</Text><Text style={s.missionText}>Bring technology that empowers India—making global quality feel accessible, useful and close to home.</Text></View>
        </> : null}

        {section === 'policies' ? <>
          <View style={s.infoHero}><View style={s.infoHeroIcon}><Ionicons name="shield-checkmark-outline" size={24} color="#FFFFFF" /></View><Text style={s.infoHeroEyebrow}>SHOP WITH CONFIDENCE</Text><Text style={s.infoHeroTitle}>Clear policies.{`\n`}No surprises.</Text><Text style={s.infoHeroCopy}>Everything you need to know before and after placing an order.</Text></View>
          {policyDocuments.map(document => <View key={document.title} style={s.policyDocument}>
            <Pressable onPress={() => setOpenPolicies(current => {
              const next = new Set(current);
              next.has(document.title) ? next.delete(document.title) : next.add(document.title);
              return next;
            })} style={s.accordionHeader}>
              <View style={s.policyIcon}><Ionicons name="document-text-outline" size={19} color="#3377D6" /></View><View style={s.policyDocumentCopy}><Text style={s.policyDocumentKicker}>POLICY DOCUMENT</Text><Text style={s.policyDocumentTitle}>{document.title}</Text></View><View style={s.policyChevron}><Ionicons name={openPolicies.has(document.title) ? 'chevron-up' : 'chevron-down'} size={18} color="#3377D6" /></View>
            </Pressable>
            {openPolicies.has(document.title) ? <View style={s.policyContent}><Text style={s.policyLongForm}>{document.content}</Text></View> : null}
          </View>)}
        </> : null}

        {section === 'faq' ? <>
          <View style={s.helpHero}><View style={s.helpHeroIcon}><Ionicons name="headset-outline" size={25} color="#FFFFFF" /></View><View style={s.helpHeroCopy}><Text style={s.helpHeroTitle}>Need a hand?</Text><Text style={s.helpHeroSubtitle}>Our support team is ready to help with orders, products and delivery.</Text></View></View>
          <Pressable onPress={() => Linking.openURL('https://wa.me/917386714141?text=Hi%20Blumaple%2C%20I%20need%20help.')} style={s.helpWhatsApp}><Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" /><View style={s.helpActionCopy}><Text style={s.helpWhatsAppTitle}>Chat on WhatsApp</Text><Text style={s.helpWhatsAppSubtitle}>Typically replies the fastest</Text></View><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></Pressable>
          <View style={s.helpQuickActions}><Pressable onPress={() => Linking.openURL('tel:+917386714141')} style={s.helpQuickAction}><View style={s.helpQuickIcon}><Ionicons name="call-outline" size={19} color="#3377D6" /></View><Text style={s.helpQuickTitle}>Call us</Text><Text style={s.helpQuickCopy}>+91 73867 14141</Text></Pressable><Pressable onPress={() => Linking.openURL('mailto:help@blumaple.com')} style={s.helpQuickAction}><View style={s.helpQuickIcon}><Ionicons name="mail-outline" size={19} color="#3377D6" /></View><Text style={s.helpQuickTitle}>Email us</Text><Text style={s.helpQuickCopy}>help@blumaple.com</Text></Pressable></View>
          <Text style={s.helpFaqLabel}>OR BROWSE ANSWERS</Text>
          <Text style={s.sectionTitle}>Frequently asked questions</Text>
          {faqItems.map(([question, answer]) => <View key={question} style={s.faqItem}><Pressable onPress={() => setOpenFaqs(current => { const next = new Set(current); next.has(question) ? next.delete(question) : next.add(question); return next; })} style={s.faqHeader}><Text style={s.faqQuestion}>{question}</Text><Ionicons name={openFaqs.has(question) ? 'chevron-up' : 'chevron-down'} size={18} color="#3F72E5" /></Pressable>{openFaqs.has(question) ? <Text style={s.faqAnswer}>{answer}</Text> : null}</View>)}
        </> : null}

        {section === 'notifications' ? <>
          <Text style={s.sectionTitle}>Notifications</Text>
          {([
            ['orders', 'Order updates', 'Confirmation, shipping and delivery alerts'],
            ['offers', 'Offers & discounts', 'Promotions and limited-time deals'],
            ['arrivals', 'New arrivals', 'Updates when new products are added'],
            ['whatsapp', 'WhatsApp updates', 'Receive important updates on WhatsApp'],
          ] as const).map(([key, title, description]) => <View key={key} style={s.notificationRow}><View style={s.notificationCopy}><Text style={s.notificationTitle}>{title}</Text><Text style={s.notificationDescription}>{description}</Text></View><Switch value={notifications[key]} onValueChange={() => toggle(key)} trackColor={{ false: '#CDD3DA', true: '#9DB8F0' }} thumbColor={notifications[key] ? '#3F72E5' : '#F5F5F5'} /></View>)}
        </> : null}
        </>}
      </ScrollView>
    <Modal visible={Boolean(addressModal)} transparent animationType="slide" onRequestClose={() => setAddressModal(null)}><Pressable style={s.modalBackdrop} onPress={() => setAddressModal(null)}><Pressable style={s.addressSheet} onPress={() => {}}><View style={s.modalHeading}><Text style={s.modalTitle}>{addressModal === 'billing' ? 'Add billing address' : 'Add saved address'}</Text><Pressable onPress={() => setAddressModal(null)}><Ionicons name="close" size={24} color="#17202B" /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.modalContent}>{addressModal === 'billing' ? <><AddressField placeholder="GSTIN" value={addressForm.gstin || ''} onChangeText={value => setAddressValue('gstin', value.toUpperCase())} maxLength={15} /><AddressField placeholder="Business name" value={addressForm.company} onChangeText={value => setAddressValue('company', value)} /></> : <><AddressField placeholder="Email or mobile phone number" value={addressForm.email} onChangeText={value => setAddressValue('email', value)} keyboardType="email-address" /><View style={s.modalTwoCol}><AddressField placeholder="First name" value={addressForm.name} onChangeText={value => setAddressValue('name', value)} /><AddressField placeholder="Last name (optional)" value={addressForm.lastName} onChangeText={value => setAddressValue('lastName', value)} /></View><AddressField placeholder="Company (optional)" value={addressForm.company} onChangeText={value => setAddressValue('company', value)} /></>}<AddressField placeholder="Address" value={addressForm.building} onChangeText={value => setAddressValue('building', value)} /><AddressField placeholder="Apartment, suite, etc. (optional)" value={addressForm.line} onChangeText={value => setAddressValue('line', value)} /><AddressField placeholder="City" value={addressForm.city} onChangeText={value => setAddressValue('city', value)} /><AddressField placeholder="State" value={addressForm.state} onChangeText={value => setAddressValue('state', value)} /><AddressField placeholder="PIN code" value={addressForm.pincode} onChangeText={value => setAddressValue('pincode', value)} keyboardType="number-pad" maxLength={6} /><AddressField placeholder="Phone" value={addressForm.phone} onChangeText={value => setAddressValue('phone', value)} keyboardType="phone-pad" maxLength={10} /></ScrollView><View style={s.modalActions}><Pressable onPress={() => setAddressModal(null)} style={s.modalCancel}><Text style={s.modalCancelText}>Cancel</Text></Pressable><Pressable onPress={saveProfileAddress} style={s.modalSave}><Text style={s.modalSaveText}>Save address</Text></Pressable></View></Pressable></Pressable></Modal>
    <Modal visible={logoutVisible} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => dismissLogout()}><View style={s.logoutModalRoot}><Animated.View pointerEvents="none" style={[s.logoutDimmer, { opacity: logoutSheetProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]} /><Pressable style={StyleSheet.absoluteFill} onPress={() => dismissLogout()} /><Animated.View style={{ transform: [{ translateY: logoutSheetProgress.interpolate({ inputRange: [0, 1], outputRange: [340, 0] }) }] }}><Pressable style={s.logoutSheet} onPress={() => {}}><View style={s.logoutHandle} /><Text style={s.logoutSheetTitle}>Logout</Text><View style={s.logoutDivider} /><Text style={s.logoutSheetCopy}>Are you sure you want to log out?</Text><View style={s.logoutActions}><Pressable onPress={() => dismissLogout()} style={s.logoutCancel}><Text style={s.logoutCancelText}>Cancel</Text></Pressable><Pressable onPress={() => dismissLogout(onLogout)} style={s.logoutConfirm}><Text style={s.logoutConfirmText}>Yes, Logout</Text></Pressable></View></Pressable></Animated.View></View></Modal>
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, width: '100%', backgroundColor: '#EEF4FF' },
  layout: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  sidebar: { width: 116, overflow: 'hidden', borderRightWidth: 1, borderRightColor: '#C7D2E0', backgroundColor: '#E9EDF2' },
  menuItem: { minHeight: 58, paddingHorizontal: 10, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C7D2E0' },
  menuItemActive: { backgroundColor: '#3F72E5' },
  menuText: { flex: 1, color: '#536071', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  menuTextActive: { color: '#FFFFFF' },
  content: { flex: 1, backgroundColor: '#EEF4FF' },
  contentContainer: { flexGrow: 1, padding: 12, paddingBottom: 16 },
  profileCard: { minHeight: 88, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: '#102D5B', shadowColor: '#0C2141', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 4 },
  profileOrbLarge: { position: 'absolute', width: 145, height: 145, right: -46, top: -72, borderRadius: 73, backgroundColor: '#1D5EBA', opacity: 0.54 },
  profileOrbSmall: { position: 'absolute', width: 72, height: 72, right: 54, bottom: -47, borderRadius: 36, borderWidth: 14, borderColor: '#4C8DF6', opacity: 0.38 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D9E9FF', borderWidth: 2, borderColor: '#80B4FF' },
  profileAvatarText: { color: '#1B5FB5', fontFamily: 'Inter_400Regular', fontSize: 17, fontWeight: '900' },
  profileCopy: { flex: 1, minWidth: 0, marginLeft: 13, marginRight: 8 },
  profileMembership: { marginBottom: 2, color: '#8CBFFF', fontFamily: 'Inter_400Regular', fontSize: 8, letterSpacing: 0.8, fontWeight: '900' },
  profileName: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '900' },
  profileEmail: { marginTop: 3, color: '#D2E4FF', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '600' },
  editProfileButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  menuCard: { marginBottom: 10, overflow: 'hidden', borderRadius: 16, backgroundColor: '#FFFFFF', shadowColor: '#31527A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  menuRow: { minHeight: 54, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E7ECF4' },
  menuRowPressed: { backgroundColor: '#F4F8FF' },
  menuIcon: { width: 30, height: 34, alignItems: 'flex-start', justifyContent: 'center' },
  menuCopy: { flex: 1, minWidth: 0, marginLeft: 9, marginRight: 8 },
  menuRowTitle: { color: '#1B2533', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '800' },
  menuRowDescription: { marginTop: 1, color: '#8490A0', fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 12, fontWeight: '600' },
  logoutRow: { borderBottomWidth: 0 },
  logoutRowDisabled: { opacity: 0.45 },
  logoutIcon: {},
  appVersionWrap: { marginTop: 'auto', paddingTop: 4, alignItems: 'center' },
  appVersion: { color: '#9AA5B5', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '600' },
  sectionTitle: { marginBottom: 13, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 19, lineHeight: 24, fontWeight: '900' },
  detailHeadingRow: { marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sectionSubtitle: { marginTop: -10, color: '#718198', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '600' },
  editDetailsButton: { minHeight: 34, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 17, backgroundColor: '#E5F0FF' },
  editDetailsButtonText: { color: '#3377D6', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '900' },
  personalFormCard: { padding: 14, borderWidth: 1, borderColor: '#DDE7F4', borderRadius: 16, backgroundColor: '#FFFFFF', shadowColor: '#31527A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  fieldLabel: { marginTop: 2, marginBottom: 7, color: '#3F526C', fontFamily: 'Inter_400Regular', fontSize: 10, letterSpacing: 0.55, fontWeight: '900' },
  requiredMark: { color: '#D14444' },
  personalInput: { height: 47, marginBottom: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#C9D8EB', borderRadius: 10, color: '#18263A', fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '700', backgroundColor: '#FFFFFF' },
  personalInputLocked: { color: '#65758A', borderColor: '#E2E8F1', backgroundColor: '#F4F7FB' },
  phoneInputRow: { height: 47, marginBottom: 5, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#C9D8EB', borderRadius: 10, backgroundColor: '#FFFFFF' },
  countryCode: { height: 25, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: '#D8E2EF', color: '#3377D6', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 25, fontWeight: '900' },
  phoneInput: { flex: 1, height: '100%', paddingHorizontal: 12, color: '#18263A', fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '700' },
  fieldHint: { marginTop: -1, marginBottom: 15, color: '#8491A2', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, fontWeight: '600' },
  emailLockedRow: { height: 47, marginBottom: 5, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#E2E8F1', borderRadius: 10, backgroundColor: '#F1F5FA' },
  emailLockedText: { flex: 1, color: '#65758A', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '700' },
  personalError: { marginTop: -4, marginBottom: 10, color: '#C93835', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '800' },
  detail: { marginBottom: 11, paddingBottom: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDE2E8' },
  detailLabel: { color: '#7A8491', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '700' },
  detailValue: { marginTop: 4, color: '#1A1C1D', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  primaryButton: { minHeight: 42, marginTop: 7, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3F72E5' },
  primaryButtonText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  resetPasswordButton: { minHeight: 46, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: '#9BBEED', borderRadius: 10, backgroundColor: '#FFFFFF' },
  resetPasswordText: { color: '#3377D6', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  addressCard: { marginBottom: 12, padding: 15, borderWidth: 1, borderColor: '#DDE7F4', borderRadius: 16, backgroundColor: '#FFFFFF', shadowColor: '#31527A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  addressHeader: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deleteAddressButton: { width: 30, height: 30, borderWidth: 1, borderColor: '#F1CECF', borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF6F6' },
  addressLabel: { paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden', borderRadius: 7, color: '#2867C8', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', backgroundColor: '#E8F1FF' },
  addressName: { marginBottom: 5, color: '#172A43', fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '900' },
  gstinValue: { marginBottom: 7, color: '#2867C8', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, fontWeight: '900' },
  addAddressButton: { minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, backgroundColor: '#347BE2', shadowColor: '#2360BA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.17, shadowRadius: 7, elevation: 3 },
  addAddressText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  addressSectionDivider: { height: 1, marginVertical: 20, backgroundColor: '#DDE2E8' },
  emptyAddress: { minHeight: 156, marginBottom: 14, alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#AFC9EB', borderRadius: 16, backgroundColor: '#F8FBFF' },
  emptyAddressText: { color: '#62758D', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  body: { marginBottom: 8, color: '#65758A', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  infoHero: { marginBottom: 14, padding: 19, overflow: 'hidden', borderRadius: 19, backgroundColor: '#0A254A' },
  infoHeroIcon: { width: 44, height: 44, marginBottom: 17, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D94955' },
  aboutHeroLeaf: { width: 54, height: 54, marginBottom: 10 },
  infoHeroEyebrow: { color: '#AFC9ED', fontFamily: 'Inter_400Regular', fontSize: 10, letterSpacing: 1.15, fontWeight: '900' },
  infoHeroTitle: { marginTop: 7, color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 27, lineHeight: 30, letterSpacing: -0.7, fontWeight: '900' },
  infoHeroCopy: { width: '88%', marginTop: 10, color: '#D5E4F7', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  aboutIntroCard: { marginBottom: 12, padding: 16, borderWidth: 1, borderColor: '#D9E5F3', borderRadius: 16, backgroundColor: '#FFFFFF' },
  aboutIntroTitle: { color: '#172A43', fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 20, fontWeight: '900' },
  aboutIntroCopy: { marginTop: 7, color: '#68788C', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  aboutSectionCard: { marginBottom: 12, padding: 16, borderWidth: 1, borderColor: '#D9E5F3', borderRadius: 16, backgroundColor: '#FFFFFF', shadowColor: '#31527A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  aboutCardLabel: { color: '#D94955', fontFamily: 'Inter_400Regular', fontSize: 10, letterSpacing: 0.9, fontWeight: '900' },
  aboutCardTitle: { marginTop: 5, marginBottom: 8, color: '#172A43', fontFamily: 'Inter_400Regular', fontSize: 17, lineHeight: 22, fontWeight: '900' },
  aboutChipRow: { marginTop: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  aboutChip: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EFF5FC' },
  aboutChipText: { color: '#3377D6', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '900' },
  timelineRow: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: 11, borderLeftWidth: 2, borderLeftColor: '#D8E5F4', paddingLeft: 11, paddingBottom: 9 },
  timelineRowLast: { paddingBottom: 0 },
  timelineYear: { minWidth: 39, paddingHorizontal: 5, paddingVertical: 4, borderRadius: 6, alignItems: 'center', backgroundColor: '#E8F1FF' },
  timelineYearText: { color: '#3377D6', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '900' },
  timelineTitle: { color: '#33475F', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  aboutFeatureRow: { minHeight: 43, marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aboutFeatureIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2FF' },
  aboutFeatureText: { color: '#3A4C62', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  missionCard: { marginBottom: 8, padding: 17, borderRadius: 16, backgroundColor: '#D94955' },
  missionLabel: { color: '#FFE7E8', fontFamily: 'Inter_400Regular', fontSize: 10, letterSpacing: 1, fontWeight: '900' },
  missionText: { marginTop: 7, color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, fontWeight: '800' },
  helpHero: { marginBottom: 10, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 17, backgroundColor: '#0A254A' },
  helpHeroIcon: { width: 45, height: 45, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D94955' },
  helpHeroCopy: { flex: 1 },
  helpHeroTitle: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 17, fontWeight: '900' },
  helpHeroSubtitle: { marginTop: 3, color: '#D4E4F8', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  helpWhatsApp: { minHeight: 62, marginBottom: 10, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 15, backgroundColor: '#1E9E58', shadowColor: '#167A43', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 7, elevation: 3 },
  helpActionCopy: { flex: 1 },
  helpWhatsAppTitle: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  helpWhatsAppSubtitle: { marginTop: 2, color: '#E2F8EA', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '600' },
  helpQuickActions: { marginBottom: 18, flexDirection: 'row', gap: 10 },
  helpQuickAction: { flex: 1, minHeight: 112, padding: 13, borderWidth: 1, borderColor: '#D9E5F3', borderRadius: 15, backgroundColor: '#FFFFFF' },
  helpQuickIcon: { width: 33, height: 33, marginBottom: 9, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2FF' },
  helpQuickTitle: { color: '#243A54', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  helpQuickCopy: { marginTop: 3, color: '#728197', fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 13, fontWeight: '600' },
  helpFaqLabel: { marginBottom: 5, color: '#8290A2', fontFamily: 'Inter_400Regular', fontSize: 10, letterSpacing: 0.9, fontWeight: '900' },
  tagline: { marginTop: -7, marginBottom: 13, color: '#3F72E5', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, fontStyle: 'italic', fontWeight: '700' },
  aboutHeading: { marginTop: 16, marginBottom: 10, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  aboutSubheading: { marginTop: 14, marginBottom: 8, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 19, fontWeight: '900' },
  bullet: { marginBottom: 6, paddingLeft: 3, color: '#596575', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  bulletLead: { color: '#17202B', fontWeight: '900' },
  milestoneYear: { marginTop: 13, color: '#3F72E5', fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '900' },
  milestoneTitle: { marginTop: 4, marginBottom: 6, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, fontWeight: '900' },
  featureTitle: { marginTop: 7, marginBottom: 4, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, fontWeight: '900' },
  policyTitle: { marginTop: 3, marginBottom: 4, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  policyDocument: { marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#D9E5F3', borderRadius: 16, backgroundColor: '#FFFFFF', shadowColor: '#31527A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  policyIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2FF' },
  policyDocumentCopy: { flex: 1, minWidth: 0 },
  policyDocumentKicker: { marginBottom: 3, color: '#8494A8', fontFamily: 'Inter_400Regular', fontSize: 9, letterSpacing: 0.7, fontWeight: '900' },
  policyDocumentTitle: { flex: 1, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, fontWeight: '900' },
  policyChevron: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F6FC' },
  policyContent: { paddingHorizontal: 16, paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#E5EDF6', backgroundColor: '#F8FBFF' },
  policyLongForm: { color: '#596575', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 18 },
  accordionHeader: { minHeight: 68, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: '#FFFFFF' },
  accordionTitle: { flex: 1, color: '#1B2A40', fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '900' },
  faqItem: { marginBottom: 11, overflow: 'hidden', borderWidth: 1, borderColor: '#DFE8F4', borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#31527A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 5, elevation: 1 },
  faqHeader: { minHeight: 58, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF' },
  faqQuestion: { flex: 1, color: '#1B2A40', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, fontWeight: '800' },
  faqAnswer: { paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5EBF3', color: '#65758A', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, backgroundColor: '#F8FBFF' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.46)' },
  addressSheet: { maxHeight: '90%', paddingTop: 18, overflow: 'hidden', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF' },
  modalHeading: { paddingHorizontal: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D5DBE3' },
  modalTitle: { color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 18, fontWeight: '900' },
  modalContent: { padding: 18, gap: 10 },
  modalField: { flex: 1, minHeight: 50, paddingHorizontal: 13, borderWidth: 1, borderColor: '#D8DADD', borderRadius: 10, color: '#1A1C1D', fontFamily: 'Inter_400Regular', fontSize: 13, backgroundColor: '#FFFFFF' },
  modalTwoCol: { flexDirection: 'row', gap: 8 },
  modalActions: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 20, flexDirection: 'row', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D5DBE3', backgroundColor: '#FFFFFF' },
  modalCancel: { flex: 1, height: 46, borderWidth: 1, borderColor: '#AEB7C3', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: '#536071', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '800' },
  modalSave: { flex: 1.4, height: 46, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3F72E5' },
  modalSaveText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  logoutModalRoot: { flex: 1, justifyContent: 'flex-end' },
  logoutDimmer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(17, 27, 41, 0.48)' },
  logoutSheet: { paddingHorizontal: 22, paddingBottom: 52, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#FFFFFF' },
  logoutHandle: { width: 42, height: 4, marginTop: 10, marginBottom: 20, alignSelf: 'center', borderRadius: 2, backgroundColor: '#D8DEE8' },
  logoutSheetTitle: { color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 20, textAlign: 'center', fontWeight: '900' },
  logoutDivider: { height: StyleSheet.hairlineWidth, marginTop: 18, backgroundColor: '#DCE3ED' },
  logoutSheetCopy: { marginTop: 24, color: '#647185', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  logoutActions: { marginTop: 26, flexDirection: 'row', gap: 12 },
  logoutCancel: { flex: 1, height: 50, borderWidth: 1.5, borderColor: '#90B8F3', borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  logoutCancelText: { color: '#3377D6', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  logoutConfirm: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4C8DF6' },
  logoutConfirmText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  footer: { height: 66, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#D5DBE3', backgroundColor: '#FFFFFF' },
  logoutButton: { minWidth: 132, height: 42, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9, backgroundColor: '#3F72E5' },
  logoutButtonDisabled: { opacity: 0.42 },
  logoutButtonText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  inlineLink: { color: '#3F72E5', fontWeight: '900' },
  notificationRow: { minHeight: 72, marginBottom: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DFE8F4', borderRadius: 14, backgroundColor: '#FFFFFF' },
  notificationCopy: { flex: 1, paddingRight: 9 }, notificationTitle: { color: '#1B2A40', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' }, notificationDescription: { marginTop: 4, color: '#718198', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14 },
});
