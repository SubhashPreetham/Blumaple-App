import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShippingAddress, ShopProduct } from './types';

type LineItem = { product: ShopProduct; quantity: number };
type Props = { success: boolean; orderId?: string; items: LineItem[]; address: ShippingAddress | null; paymentMethod: 'online' | 'cod'; total: number; tax: number; codFee: number; onHome: () => void; onRetry: () => void };
const priceOf = (value: string) => Number(value.replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0;
const money = (value: number) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function OrderResultPage({ success, orderId, items, address, paymentMethod, total, tax, codFee, onHome, onRetry }: Props) {
  const heading = success ? 'Order Successful' : 'Order Failed';
  return <View style={s.page}>
    <View style={s.header}><Pressable onPress={onHome} hitSlop={10}><Ionicons name="arrow-back" size={25} color="#1A1C1D" /></Pressable><Text style={s.headerTitle}>ORDER DETAILS</Text><View style={s.spacer} /></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={[s.icon, success ? s.successIcon : s.failIcon]}><Ionicons name={success ? 'checkmark' : 'close'} size={36} color="#FFFFFF" /></View>
      <Text style={s.heading}>{heading}</Text>
      <Text style={s.subtitle}>{success ? 'Your order has been placed successfully.' : 'We could not place your order. No order has been created.'}</Text>
      {success && orderId ? <View style={s.orderId}><Text style={s.orderIdLabel}>Order ID</Text><Text style={s.orderIdValue}>{orderId}</Text></View> : null}
      <Text style={s.section}>Order summary</Text>
      <View style={s.card}>{items.map((item, index) => <View key={item.product.id}><View style={s.item}><Image source={item.product.image} style={s.image} resizeMode="contain" /><View style={s.itemCopy}><Text numberOfLines={2} style={s.product}>{item.product.name}</Text><Text style={s.quantity}>{item.quantity} {item.quantity === 1 ? 'item' : 'items'}</Text></View><Text style={s.itemPrice}>{money(priceOf(item.product.price) * item.quantity)}</Text></View>{index < items.length - 1 ? <View style={s.line} /> : null}</View>)}<View style={s.line} /><Row label="Tax included" value={money(tax)} />{codFee > 0 ? <><View style={s.smallGap} /><Row label="COD processing fee" value={money(codFee)} /></> : null}<View style={s.line} /><Row label="Total" value={money(total)} total /></View>
      <Text style={s.section}>Payment mode</Text><View style={s.card}><Text style={s.payment}>{paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online payment'}</Text></View>
      {address ? <><Text style={s.section}>Delivery address</Text><View style={s.card}><Text style={s.customer}>{address.name}</Text><Text style={s.address}>{address.phone}</Text>{address.email ? <Text style={s.address}>{address.email}</Text> : null}<Text style={s.address}>{address.line}</Text><Text style={s.address}>{address.city} - {address.pincode}</Text></View></> : null}
    </ScrollView>
    {success ? <Pressable onPress={onHome} style={s.primary}><Text style={s.primaryText}>Continue shopping</Text></Pressable> : <Pressable onPress={onRetry} style={s.primary}><Text style={s.primaryText}>Try again</Text></Pressable>}
  </View>;
}

function Row({ label, value, total = false }: { label: string; value: string; total?: boolean }) { return <View style={s.row}><Text style={[s.rowLabel, total && s.total]}>{label}</Text><Text style={[s.rowValue, total && s.total]}>{value}</Text></View>; }

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:'#FFF'},header:{height:70,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:'#F0F0F0'},headerTitle:{color:'#3F72E5',fontSize:15,fontWeight:'900'},spacer:{width:25},content:{padding:18,paddingBottom:98},icon:{width:68,height:68,borderRadius:34,alignSelf:'center',alignItems:'center',justifyContent:'center',marginTop:9},successIcon:{backgroundColor:'#2E8B36'},failIcon:{backgroundColor:'#D83434'},heading:{marginTop:13,textAlign:'center',color:'#1A1C1D',fontSize:24,fontWeight:'900'},subtitle:{marginTop:6,textAlign:'center',color:'#667085',fontSize:13,lineHeight:19},orderId:{marginTop:18,padding:14,borderRadius:10,backgroundColor:'#EEF3FF',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},orderIdLabel:{color:'#536071',fontSize:13,fontWeight:'700'},orderIdValue:{color:'#3F72E5',fontSize:15,fontWeight:'900'},section:{marginTop:22,marginBottom:9,color:'#1A1C1D',fontSize:18,fontWeight:'900'},card:{padding:14,borderWidth:1,borderColor:'#E4E7EC',borderRadius:12,backgroundColor:'#FFF'},item:{flexDirection:'row',alignItems:'center'},image:{width:48,height:48,borderRadius:6},itemCopy:{flex:1,marginLeft:9,paddingRight:8},product:{color:'#1A1C1D',fontSize:13,fontWeight:'800',lineHeight:18},quantity:{marginTop:3,color:'#697386',fontSize:11},itemPrice:{color:'#1A1C1D',fontSize:13,fontWeight:'900'},line:{height:1,marginVertical:12,backgroundColor:'#E7E9EC'},smallGap:{height:8},row:{flexDirection:'row',justifyContent:'space-between'},rowLabel:{color:'#536071',fontSize:13},rowValue:{color:'#1A1C1D',fontSize:13,fontWeight:'800'},total:{color:'#1A1C1D',fontSize:16,fontWeight:'900'},payment:{color:'#1A1C1D',fontSize:14,fontWeight:'800'},customer:{color:'#1A1C1D',fontSize:15,fontWeight:'900',marginBottom:4},address:{color:'#536071',fontSize:13,lineHeight:19},primary:{position:'absolute',left:16,right:16,bottom:18,height:56,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:'#3F72E5'},primaryText:{color:'#FFF',fontSize:16,fontWeight:'900'},
});
