import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShopifyCustomer } from '../src/shopifyCustomerAuth';
import { savedAddresses } from './AddressPage';

type Section = 'personal' | 'addresses' | 'about' | 'policies' | 'notifications';

const menu: Array<{ id: Section; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'personal', label: 'Personal', icon: 'person-outline' },
  { id: 'addresses', label: 'Saved address', icon: 'location-outline' },
  { id: 'about', label: 'About us', icon: 'information-circle-outline' },
  { id: 'policies', label: 'Policies', icon: 'document-text-outline' },
  { id: 'notifications', label: 'Notification', icon: 'notifications-outline' },
];

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={s.detail}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value}</Text></View>;
}

export function ProfilePage({ customer, onLogout }: { customer: ShopifyCustomer | null; onLogout: () => void }) {
  const [section, setSection] = useState<Section>('personal');
  const [notifications, setNotifications] = useState({ orders: true, offers: true, arrivals: false, whatsapp: true });
  const toggle = (key: keyof typeof notifications) => setNotifications(current => ({ ...current, [key]: !current[key] }));

  return <View style={s.page}>
    <Text style={s.heading}>My Profile</Text>
    <View style={s.layout}>
      <View style={s.sidebar}>
        {menu.map(item => <Pressable key={item.id} onPress={() => setSection(item.id)} style={[s.menuItem, section === item.id && s.menuItemActive]}>
          <Ionicons name={item.icon} size={18} color={section === item.id ? '#FFFFFF' : '#536071'} />
          <Text style={[s.menuText, section === item.id && s.menuTextActive]}>{item.label}</Text>
        </Pressable>)}
        <Pressable onPress={onLogout} style={[s.menuItem, s.logoutItem]}><Ionicons name="log-out-outline" size={18} color="#C93835" /><Text style={s.logoutText}>Log out</Text></Pressable>
      </View>

      <View style={s.content}>
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
          <Text style={s.sectionTitle}>About Blumaple</Text>
          <Text style={s.body}>Blumaple brings thoughtfully selected technology and lifestyle products together in one convenient shopping experience.</Text>
          <Text style={s.body}>We focus on dependable products, clear information, secure shopping and responsive support. Our goal is to make discovering and ordering the right products simple—from browsing to delivery.</Text>
          <Text style={s.body}>Every collection is arranged to help customers compare options quickly and shop with confidence.</Text>
        </> : null}

        {section === 'policies' ? <>
          <Text style={s.sectionTitle}>Our policies</Text>
          <Text style={s.policyTitle}>Shipping</Text><Text style={s.body}>Orders are processed after confirmation. Delivery estimates depend on product availability and the destination pincode.</Text>
          <Text style={s.policyTitle}>Returns</Text><Text style={s.body}>Eligible products may be returned within seven days of delivery in their original condition, packaging and accessories.</Text>
          <Text style={s.policyTitle}>Privacy</Text><Text style={s.body}>Customer information is used to process orders, provide support and improve the shopping experience. We do not sell personal information.</Text>
          <Text style={s.policyTitle}>Payments</Text><Text style={s.body}>Payments are processed securely through available payment providers. Refund timing may vary by bank or payment method.</Text>
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
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 12, paddingTop: 18, paddingBottom: 20, backgroundColor: '#FFFFFF' },
  heading: { marginBottom: 15, color: '#1A1C1D', fontFamily: 'Inter_400Regular', fontSize: 22, fontWeight: '900' },
  layout: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sidebar: { width: 112, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E6EB', borderRadius: 12, backgroundColor: '#F7F9FB' },
  menuItem: { minHeight: 55, paddingHorizontal: 9, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDE2E8' },
  menuItemActive: { backgroundColor: '#3F72E5' },
  menuText: { flex: 1, color: '#536071', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  menuTextActive: { color: '#FFFFFF' },
  logoutItem: { borderBottomWidth: 0 }, logoutText: { color: '#C93835', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '800' },
  content: { flex: 1, minHeight: 390, padding: 13, borderWidth: 1, borderColor: '#E2E6EB', borderRadius: 12, backgroundColor: '#FFFFFF' },
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
  policyTitle: { marginTop: 3, marginBottom: 4, color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  notificationRow: { minHeight: 65, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDE2E8' },
  notificationCopy: { flex: 1, paddingRight: 5 }, notificationTitle: { color: '#17202B', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' }, notificationDescription: { marginTop: 3, color: '#7A8491', fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 13 },
});
