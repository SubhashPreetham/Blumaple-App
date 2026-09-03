import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShopifyCustomer } from '../src/shopifyCustomerAuth';
import { savedAddresses } from './AddressPage';

type Section = 'personal' | 'addresses' | 'about' | 'policies' | 'faq' | 'notifications';

const menu: Array<{ id: Section; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'personal', label: 'Personal', icon: 'person-outline' },
  { id: 'addresses', label: 'Saved address', icon: 'location-outline' },
  { id: 'about', label: 'About us', icon: 'information-circle-outline' },
  { id: 'policies', label: 'Policies', icon: 'document-text-outline' },
  { id: 'faq', label: 'FAQ', icon: 'help-circle-outline' },
  { id: 'notifications', label: 'Notification', icon: 'notifications-outline' },
];

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
    title: 'Shipping Policy – Blumaple LLP',
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
    title: 'Terms and Conditions – Blumaple LLP',
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
    title: 'Privacy Policy – Blumaple',
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

export function ProfilePage({ customer, onLogout }: { customer: ShopifyCustomer | null; onLogout: () => void }) {
  const [section, setSection] = useState<Section>('personal');
  const [aboutOpen, setAboutOpen] = useState(true);
  const [openPolicies, setOpenPolicies] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState({ orders: true, offers: true, arrivals: false, whatsapp: true });
  const toggle = (key: keyof typeof notifications) => setNotifications(current => ({ ...current, [key]: !current[key] }));

  return <View style={s.page}>
    <View style={s.layout}>
      <View style={s.sidebar}>
        {menu.map(item => <Pressable key={item.id} onPress={() => setSection(item.id)} style={[s.menuItem, section === item.id && s.menuItemActive]}>
          <Ionicons name={item.icon} size={18} color={section === item.id ? '#FFFFFF' : '#536071'} />
          <Text style={[s.menuText, section === item.id && s.menuTextActive]}>{item.label}</Text>
        </Pressable>)}
      </View>

      <ScrollView style={s.content} contentContainerStyle={s.contentContainer} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {section === 'personal' ? <>
          <Text style={s.sectionTitle}>Personal details</Text>
          <Detail label="Name" value={customer?.displayName || 'Admin'} />
          <Detail label="Phone" value="+91 98765 43210" />
          <Detail label="Email" value={customer?.emailAddress?.emailAddress || 'admin@app.com'} />
          <Pressable style={s.primaryButton}><Text style={s.primaryButtonText}>Reset password</Text></Pressable>
        </> : null}

        {section === 'addresses' ? <>
          <Text style={s.sectionTitle}>Saved addresses</Text>
          {savedAddresses.map(address => <View key={address.label} style={s.addressCard}>
            <View style={s.addressHeader}><Text style={s.addressLabel}>{address.label}</Text><Ionicons name="location" size={16} color="#3F72E5" /></View>
            <Text style={s.addressName}>{address.name}</Text>
            <Text style={s.body}>{address.building}, {address.line}</Text>
            <Text style={s.body}>{address.city}, {address.state} – {address.pincode}</Text>
            <Text style={s.body}>+91 {address.phone}</Text>
          </View>)}
        </> : null}

        {section === 'about' ? <>
          <Pressable onPress={() => setAboutOpen(value => !value)} style={s.accordionHeader}>
            <Text style={s.accordionTitle}>About Us</Text>
            <Ionicons name={aboutOpen ? 'chevron-up' : 'chevron-down'} size={19} color="#3F72E5" />
          </Pressable>
          {aboutOpen ? <>
          <Text style={s.tagline}>Bridging Global Excellence to Your Doorstep</Text>
          <Text style={s.body}>Blumaple is an e-commerce brand built on a simple belief: India deserves world-class technology and lifestyle solutions. We bring trusted global innovations to India and make them easy to access, reliable to use, and suitable for everyday living.</Text>
          <Text style={s.body}>Our purpose is to connect international quality with Indian needs by offering products that improve comfort, convenience, productivity and personal style. Blumaple stands for progress, trust and a modern way of living where technology truly supports India’s growth.</Text>

          <Text style={s.aboutHeading}>What We Offer</Text>
          <Text style={s.tagline}>A Curated Global Selection</Text>
          <Text style={s.body}>We offer a carefully selected range of tech, industrial, lifestyle, home and smart essentials sourced from trusted global markets.</Text>
          <Text style={s.body}>Every product is chosen for:</Text>
          {['Quality', 'Durability', 'Long term value', 'Practical everyday use'].map(item => <Text key={item} style={s.bullet}>• {item}</Text>)}

          <Text style={s.aboutSubheading}>Our Product Categories</Text>
          {['Imported tech gadgets', 'Smart accessories', 'Fashion and personal style items', 'Home and lifestyle essentials', 'Innovative solutions for modern living'].map(item => <Text key={item} style={s.bullet}>• {item}</Text>)}
          <Text style={s.body}>Our collection keeps expanding to match new trends, customer needs and the way people live today.</Text>

          <Text style={s.aboutHeading}>Our Milestones</Text>
          <Text style={s.tagline}>Commitment Beyond Commerce</Text>
          <Text style={s.milestoneYear}>2020</Text><Text style={s.milestoneTitle}>🌱 The Foundation!</Text>
          <Text style={s.body}>We opened our digital doors with a focused mission: democratizing access to premium products without compromising quality. Starting with core categories like electronics and accessories, we laid the groundwork for a customer-first philosophy.</Text>
          <Text style={s.milestoneYear}>2021</Text><Text style={s.milestoneTitle}>🤝 Building Trust</Text>
          <Text style={s.body}>As demand grew, we expanded our product range, introduced new categories, and launched our website to enhance accessibility. At the same time, we focused on building trust—improving customer support, introducing dedicated account managers, and refining our operations to better serve our customers.</Text>
          <Text style={s.milestoneYear}>2022</Text><Text style={s.milestoneTitle}>🚀 Accelerating Growth!</Text>
          <Text style={s.body}>To keep up with customer needs, we further expanded our catalog, optimized our logistics, and introduced more structured processes. These improvements helped us streamline cross-border fulfillment and deliver a better overall experience.</Text>
          <Text style={s.milestoneYear}>2023</Text><Text style={s.milestoneTitle}>📈 Expansion</Text>
          <Text style={s.body}>We built a more efficient, tech-driven fulfillment center to improve our supply chain. Alongside this, we enhanced our internal tools to increase operational efficiency, ensuring faster and more reliable service.</Text>
          <Text style={s.milestoneYear}>2024</Text><Text style={s.milestoneTitle}>🏆 Defining Excellence</Text>
          <Text style={s.body}>With a sharper focus on customer satisfaction, we achieved a higher customer happiness index. We also took steps to strengthen our B2B services, helping businesses source and ship international products more efficiently.</Text>

          <Text style={s.aboutHeading}>Why Choose Blumaple?</Text>
          <Text style={s.tagline}>A Brand Built on Trust</Text>
          <Text style={s.featureTitle}>Transparent &amp; Ethical Sourcing</Text><Text style={s.body}>We partner only with verified suppliers to ensure authenticity, fair pricing, and reliable global sourcing.</Text>
          <Text style={s.featureTitle}>Fast &amp; Dependable Delivery</Text><Text style={s.body}>Our logistics partnerships enable secure nationwide shipping with reliable tracking and efficient fulfilment.</Text>
          <Text style={s.featureTitle}>Dedicated Customer Support</Text><Text style={s.body}>Our support team assists customers through every stage, from product selection to post-purchase service.</Text>
          <Text style={s.featureTitle}>Innovation Driven Selection</Text><Text style={s.body}>We continuously identify emerging technologies and global trends to deliver future-ready products.</Text>
          <Text style={s.featureTitle}>Tailored Business &amp; Consumer Solutions</Text><Text style={s.body}>We customize product sourcing to match individual, business, and vendor requirements efficiently.</Text>

          <Text style={s.aboutHeading}>Mission</Text>
          <Text style={s.body}>Our mission is to bring technology that empowers India.</Text>
          <Text style={s.body}>We want to bridge global quality with Indian expectations, delivering products that elevate comfort, boost productivity, enhance convenience, and add a touch of personal style.</Text>
          <Text style={s.body}>We work every day to set higher benchmarks in:</Text>
          {['Product selection', 'Customer support', 'Digital experience', 'Long term brand value'].map(item => <Text key={item} style={s.bullet}>• {item}</Text>)}
          <Text style={s.body}>Our goal is to create a lifestyle where technology supports growth and confidence.</Text>

          <Text style={s.aboutHeading}>Vision</Text>
          <Text style={s.body}>Our vision is to introduce a modern lifestyle that transforms India.</Text>
          <Text style={s.body}>We aim to build Blumaple into a trusted national brand known for reliability, authenticity and smart solutions.</Text>
          <Text style={s.body}>We want to lead India toward a future where smart living is simple, affordable and accessible to everyone.</Text>
          <Text style={s.body}>We envision a future where smart living is simple, affordable, and accessible to everyone across the country.</Text>
          <Text style={s.bullet}><Text style={s.bulletLead}>• Accessibility: </Text>Making global products simple and affordable for every household and business.</Text>
          <Text style={s.bullet}><Text style={s.bulletLead}>• Industry Leadership: </Text>Setting benchmarks in ethical B2B and B2C commerce.</Text>
          <Text style={s.bullet}><Text style={s.bulletLead}>• Customer Trust: </Text>Becoming the preferred partner for customers, retailers, and enterprises.</Text>
          </> : null}
        </> : null}

        {section === 'policies' ? <>
          <Text style={s.sectionTitle}>Our Policies</Text>
          {policyDocuments.map(document => <View key={document.title} style={s.policyDocument}>
            <Pressable onPress={() => setOpenPolicies(current => {
              const next = new Set(current);
              next.has(document.title) ? next.delete(document.title) : next.add(document.title);
              return next;
            })} style={s.accordionHeader}>
              <Text style={s.policyDocumentTitle}>{document.title}</Text>
              <Ionicons name={openPolicies.has(document.title) ? 'chevron-up' : 'chevron-down'} size={19} color="#3F72E5" />
            </Pressable>
            {openPolicies.has(document.title) ? <Text style={s.policyLongForm}>{document.content}</Text> : null}
          </View>)}
        </> : null}

        {section === 'faq' ? <>
          <Text style={s.sectionTitle}>Frequently asked questions</Text>
          <Text style={s.policyTitle}>Is Cash on Delivery (COD) available?</Text>
          <Text style={s.body}>COD is available only on INDIA warehouse products. Online payment is required for USA warehouse products, as they involve importing.</Text>
          <Text style={s.policyTitle}>What are the warranty terms?</Text>
          <Text style={s.body}>Warranty terms vary by product and brand. A manufacturer warranty is provided where applicable.</Text>
          <Text style={s.policyTitle}>Can I cancel my order after placing it?</Text>
          <Text style={s.body}>Orders can be cancelled within 24 hours of purchase. Once the item is shipped internationally, cancellation isn’t possible.</Text>
          <Text style={s.policyTitle}>What is the return period?</Text>
          <Text style={s.body}>You can request a return within 7 days of receiving your product, provided it is not physically damaged.</Text>
          <Text style={s.policyTitle}>Can I negotiate if I buy in bulk?</Text>
          <Text style={s.body}>Yes, bulk purchase discounts are available. Please contact our support team at help@blumaple.com</Text>
          <Text style={s.policyTitle}>Do I need to pay any custom duties?</Text>
          <Text style={s.body}>No, you don’t need to pay any extra custom duties. Blumaple takes care of all customs clearance.</Text>
          <Text style={s.policyTitle}>Are there any additional shipping charges?</Text>
          <Text style={s.body}>No, it’s free shipping on all orders.</Text>
          <Text style={s.policyTitle}>How can I track my order?</Text>
          <Text style={s.body}>Enter your Order ID here: <Text style={s.inlineLink}>ORDER TRACKING</Text></Text>
          <Text style={s.policyTitle}>Why does delivery take 10+ business days?</Text>
          <Text style={s.body}>We source products directly from global suppliers, and international shipping, customs clearance, and doorstep delivery may take additional time.</Text>
          <Text style={s.policyTitle}>Where is Blumaple located?</Text>
          <Text style={s.body}>Blumaple is based in Hyderabad, India and operates as an online-only store.</Text>
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
      </ScrollView>
    </View>
    <View style={s.footer}><Pressable onPress={onLogout} style={s.logoutButton}><Ionicons name="log-out-outline" size={18} color="#FFFFFF" /><Text style={s.logoutButtonText}>Log out</Text></Pressable></View>
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, width: '100%', backgroundColor: '#FFFFFF' },
  layout: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  sidebar: { width: 116, overflow: 'hidden', borderRightWidth: 1, borderRightColor: '#C7D2E0', backgroundColor: '#E9EDF2' },
  menuItem: { minHeight: 58, paddingHorizontal: 10, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C7D2E0' },
  menuItemActive: { backgroundColor: '#3F72E5' },
  menuText: { flex: 1, color: '#536071', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  menuTextActive: { color: '#FFFFFF' },
  content: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { flexGrow: 1, padding: 14, paddingBottom: 36 },
  sectionTitle: { marginBottom: 13, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 17, lineHeight: 22, fontWeight: '900' },
  detail: { marginBottom: 11, paddingBottom: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDE2E8' },
  detailLabel: { color: '#7A8491', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '700' },
  detailValue: { marginTop: 4, color: '#1A1C1D', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  primaryButton: { minHeight: 42, marginTop: 7, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3F72E5' },
  primaryButtonText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  addressCard: { marginBottom: 11, padding: 11, borderWidth: 1, borderColor: '#DDE3EA', borderRadius: 10, backgroundColor: '#F9FBFD' },
  addressHeader: { marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addressLabel: { color: '#3F72E5', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  addressName: { marginBottom: 3, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  body: { marginBottom: 10, color: '#596575', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  tagline: { marginTop: -7, marginBottom: 13, color: '#3F72E5', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, fontStyle: 'italic', fontWeight: '700' },
  aboutHeading: { marginTop: 16, marginBottom: 10, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  aboutSubheading: { marginTop: 14, marginBottom: 8, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 19, fontWeight: '900' },
  bullet: { marginBottom: 6, paddingLeft: 3, color: '#596575', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  bulletLead: { color: '#17202B', fontWeight: '900' },
  milestoneYear: { marginTop: 13, color: '#3F72E5', fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '900' },
  milestoneTitle: { marginTop: 4, marginBottom: 6, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, fontWeight: '900' },
  featureTitle: { marginTop: 7, marginBottom: 4, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, fontWeight: '900' },
  policyTitle: { marginTop: 3, marginBottom: 4, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  policyDocument: { marginBottom: 10 },
  policyDocumentTitle: { flex: 1, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, fontWeight: '900' },
  policyLongForm: { color: '#596575', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 18 },
  accordionHeader: { minHeight: 50, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderColor: '#D5DBE3', borderRadius: 9, backgroundColor: '#F5F8FC' },
  accordionTitle: { flex: 1, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '900' },
  footer: { height: 66, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#D5DBE3', backgroundColor: '#E9EDF2' },
  logoutButton: { minWidth: 132, height: 42, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9, backgroundColor: '#3F72E5' },
  logoutButtonText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  inlineLink: { color: '#3F72E5', fontWeight: '900' },
  notificationRow: { minHeight: 65, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDE2E8' },
  notificationCopy: { flex: 1, paddingRight: 5 }, notificationTitle: { color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' }, notificationDescription: { marginTop: 3, color: '#7A8491', fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 13 },
});
