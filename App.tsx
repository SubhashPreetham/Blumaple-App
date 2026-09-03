import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Inter_400Regular, useFonts } from '@expo-google-fonts/inter';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchShopifyCollectionPreviews, fetchShopifyCollectionProductCount, fetchShopifyCollectionProducts, fetchShopifyMainMenu, fetchShopifyProducts, ShopifyCollectionPreview, ShopifyMenuItem, ShopifyProduct } from './src/shopify';
import { CheckoutPage } from './pages/CheckoutPage';
import { AddressPage } from './pages/AddressPage';
import { OrderResultPage } from './pages/OrderResultPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryCollectionPage } from './pages/CategoryCollectionPage';
import { DashboardPage } from './pages/DashboardPage';
import { ShippingAddress } from './pages/types';

const palette = {
  ink: '#2C2D2E',
  heading: '#1A1C1D',
  blue: '#3F72E5',
  red: '#E53935',
  paleBlue: '#F5F5F5',
  green: '#34C759',
  muted: '#777777',
  border: '#F5F5F5',
  white: '#FFFFFF',
};
const homeChrome = '#D3DDEA';
const footerDiscountTag = require('./assets/ui/discount-tag.png');

type Product = {
  id: string;
  name: string;
  price: string;
  oldPrice: string;
  discount: string;
  image: ImageSourcePropType;
  images?: ImageSourcePropType[];
  description?: string;
  availableForSale?: boolean;
  brand?: string;
  vendor?: string;
  sku?: string;
  unitPrice?: number;
  currencyCode?: string;
  techSpec?: string;
  collectionIds?: string[];
  handle?: string;
};

type CartItem = { product: Product; quantity: number };
type OrderOutcome = { success: boolean; orderId?: string; items: CartItem[]; paymentMethod: 'online' | 'cod'; total: number; tax: number; codFee: number };
type ReturnScreen = 'home' | 'categories' | 'categoryCollection' | 'collection' | 'product' | 'cart';

type UploadedCarouselSlide = { id: string; image: string; title: string; collection: string };
type UploadedCarouselData = Record<string, UploadedCarouselSlide[]>;

const shopCategoryLabels = {
  Audio: ['Headphones', 'Earbuds', 'Speakers', 'Microphones', 'Soundbars', 'Turntables', 'Audio Accessories'],
  Capture: ['Cameras', 'Lenses', 'Action Cameras', 'Drones', 'Tripods', 'Lighting', 'Camera Bags'],
  Computers: ['Laptops', 'Desktops', 'Monitors', 'Keyboards', 'Storage', 'Networking', 'Accessories'],
  'Smart Tech': ['Smart Watches', 'Phones', 'Tablets', 'Smart Home', 'VR', 'Trackers', 'Chargers'],
  Home: ['Appliances', 'Kitchen', 'Cleaning', 'Climate', 'Lighting', 'Security', 'Furniture'],
  Lifestyle: ['Fitness', 'Personal Care', 'Travel', 'Gaming', 'Wearables', 'Outdoors', 'Gifts'],
  Industry: ['Tools', 'Safety', 'Measuring', 'Automation', 'Power', 'Workshop', 'Components'],
} as const;

const shopCategoryImages = [
  require('./assets/figma/category-audio-plain.png'),
  require('./assets/figma/category-camera-plain.png'),
  require('./assets/figma/category-computers-plain.png'),
  require('./assets/figma/category-smart-tech-plain.png'),
  require('./assets/figma/category-home-plain.png'),
  require('./assets/figma/category-lifestyle-plain.png'),
  require('./assets/figma/category-industry-plain.png'),
  require('./assets/figma/product-57.png'),
  require('./assets/figma/product-58.png'),
  require('./assets/figma/product-59.png'),
  require('./assets/figma/product-60.png'),
  require('./assets/figma/product-61.png'),
] as const;

const banners = [
  require('./assets/figma/banner-audio.png'),
  require('./assets/figma/banner-2.png'),
  require('./assets/figma/banner-3.png'),
];

const homeMenus = [
  { label: 'Audio', hero: require('./assets/figma/banner-audio.png') },
  { label: 'Capture', hero: require('./assets/figma/banner-3.png') },
  { label: 'Computers', hero: require('./assets/figma/banner-2.png') },
  { label: 'Smart Tech', hero: require('./assets/figma/banner-3.png') },
  { label: 'Home', hero: require('./assets/figma/category-home.png') },
  { label: 'Lifestyle', hero: require('./assets/figma/category-lifestyle.png') },
  { label: 'Industry', hero: require('./assets/figma/category-industry.png') },
] as const;

const excludedShopifyMenuItems = new Set(['Express Hub', 'Blumaple Business', 'Track Your Order']);

const products: Product[] = [
  { id: 'akg', name: 'AKG Studio Headphones', price: '₹2,345', oldPrice: '₹3,455', discount: '30% off', image: require('./assets/figma/product-headphones.png') },
  { id: 'pods', name: 'Wireless Noise Cancelling Buds', price: '₹1,899', oldPrice: '₹2,699', discount: '30% off', image: require('./assets/figma/product-57.png') },
  { id: 'camera', name: 'Compact Digital Camera', price: '₹6,499', oldPrice: '₹8,499', discount: '24% off', image: require('./assets/figma/product-58.png') },
  { id: 'watch', name: 'Active Smart Watch', price: '₹2,799', oldPrice: '₹3,999', discount: '30% off', image: require('./assets/figma/product-59.png') },
  { id: 'speaker', name: 'Portable Bluetooth Speaker', price: '₹1,499', oldPrice: '₹2,199', discount: '32% off', image: require('./assets/figma/product-60.png') },
  { id: 'keyboard', name: 'Wireless Compact Keyboard', price: '₹2,099', oldPrice: '₹2,999', discount: '30% off', image: require('./assets/figma/product-61.png') },
];

function money(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(Number(amount));
}

function ordinalDate(date: Date) {
  const day = date.getDate();
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th';
  return `${date.toLocaleString('en-US', { month: 'short' })} ${day}${suffix}`;
}

function mapShopifyProduct(product: ShopifyProduct): Product {
  const variant = product.variants.nodes[0];
  const priceAmount = Number(variant?.price.amount ?? 0);
  const compareAmount = Number(variant?.compareAtPrice?.amount ?? 0);
  const discount = compareAmount > priceAmount && compareAmount > 0 ? `${Math.round((1 - priceAmount / compareAmount) * 100)}% off` : '';
  const remoteImages: ImageSourcePropType[] = product.images.nodes.map(image => ({ uri: image.url }));

  return {
    id: product.id,
    name: product.title,
    price: variant ? money(variant.price.amount, variant.price.currencyCode) : 'Unavailable',
    oldPrice: variant?.compareAtPrice ? money(variant.compareAtPrice.amount, variant.compareAtPrice.currencyCode) : '',
    discount,
    image: remoteImages[0] ?? require('./assets/figma/product-headphones.png'),
    images: remoteImages,
    description: product.description,
    availableForSale: variant?.availableForSale ?? false,
    brand: product.brandName?.value ?? '',
    vendor: product.vendor,
    sku: variant?.sku ?? '',
    unitPrice: priceAmount,
    currencyCode: variant?.price.currencyCode,
    techSpec: product.techSpec?.value ?? '',
    collectionIds: product.collections.nodes.map(collection => collection.id),
    handle: product.handle,
  };
}

function plainHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function parseTechSpecTable(value?: string) {
  if (!value) return [];
  return [...value.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(match => {
    const row = match[1] ?? '';
    const heading = row.match(/<th[^>]*>([\s\S]*?)<\/th>/i)?.[1] ?? '';
    const detail = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? '';
    return [plainHtml(heading), plainHtml(detail)] as const;
  }).filter(([heading, detail]) => heading || detail);
}

function ProductCard({ item, width, favorite, onFavorite, onAdd, onOpen, showFavorite = true, collectionLayout = false }: { item: Product; width: number; favorite: boolean; onFavorite: () => void; onAdd: () => void; onOpen?: () => void; showFavorite?: boolean; collectionLayout?: boolean }) {
  if (collectionLayout) {
    const availableForSale = item.availableForSale ?? true;
    const discountLabel = item.discount ? `-${item.discount.replace(/\s*off/i, '')}` : '';
    return <View style={[styles.collectionProductCard, { width }]}>
      <Pressable onPress={onOpen} style={styles.collectionProductVisual}>
        <Image source={item.image} style={[styles.collectionProductImage, !availableForSale && styles.collectionUnavailable]} resizeMode="contain" />
        {!availableForSale ? <View style={styles.collectionComingSoon}><Text style={styles.collectionComingSoonText}>Coming soon</Text></View> : discountLabel ? <View style={styles.collectionDiscountBadge}><Text style={styles.collectionDiscountText}>{discountLabel}</Text></View> : null}
        {showFavorite ? <Pressable hitSlop={10} onPress={onFavorite} style={styles.collectionHeart}><Ionicons name={favorite ? 'heart' : 'heart-outline'} size={21} color={palette.blue} /></Pressable> : null}
        <Pressable onPress={availableForSale ? onAdd : () => {}} style={[styles.collectionImageAction, !availableForSale && styles.collectionNotifyAction]}><Text style={[styles.collectionImageActionText, !availableForSale && styles.collectionNotifyText]}>{availableForSale ? 'ADD' : 'NOTIFY'}</Text></Pressable>
      </Pressable>
      <Text numberOfLines={2} style={[styles.collectionProductName, !availableForSale && styles.collectionUnavailable]}>{item.name}</Text>
      <View style={[styles.collectionPriceRow, !availableForSale && styles.collectionUnavailable]}><Text style={[styles.collectionPrice, item.oldPrice && styles.collectionSalePrice]}>{item.price}</Text>{item.oldPrice ? <Text numberOfLines={1} style={styles.collectionOldPrice}>{item.oldPrice}</Text> : null}</View>
    </View>;
  }
  return (
    <View style={[styles.productCard, { width }]}>
      <Pressable onPress={onOpen} style={styles.productVisual}>
        <Image source={item.image} style={styles.productImage} resizeMode="contain" />
        {showFavorite ? <Pressable accessibilityRole="button" accessibilityLabel={`Favorite ${item.name}`} hitSlop={10} onPress={onFavorite} style={styles.heart}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={25} color={palette.blue} />
        </Pressable> : null}
      </Pressable>
      <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{item.price}</Text>
        <Text style={styles.oldPrice}>{item.oldPrice}</Text>
        <Text style={styles.discount}>{item.discount}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onAdd} style={({ pressed }) => [styles.cartButton, pressed && styles.pressed]}>
        <Text style={styles.cartButtonText}>Add to cart</Text>
      </Pressable>
    </View>
  );
}

function SectionTitle({ children }: React.PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function CartonBoxLoader() {
  const flapProgress = useRef(new Animated.Value(0)).current;
  const lift = flapProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const tilt = flapProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-7deg', '0deg'] });
  const scale = flapProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(flapProgress, { toValue: 1, duration: 480, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(flapProgress, { toValue: 0, duration: 480, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(160),
    ]));
    animation.start();
    return () => animation.stop();
  }, [flapProgress]);

  return <View style={styles.cartonLoader} accessibilityLabel="Loading collections">
    <Animated.View style={{ transform: [{ translateY: lift }, { rotate: tilt }, { scale }] }}>
      <MaterialCommunityIcons name="package-variant-closed" size={46} color="#B97435" />
    </Animated.View>
  </View>;
}

const detailColors = [
  { name: 'White', image: require('./assets/figma/detail-white.png') },
  { name: 'Black & Gold', image: require('./assets/figma/detail-black-gold.png') },
  { name: 'Black', image: require('./assets/figma/detail-black.png') },
  { name: 'Green', image: require('./assets/figma/detail-green.png') },
];

function ProductDetail({ width, cartCount, product, recommendations, onBack, onAdd, onCheckout, onOpenProduct }: { width: number; cartCount: number; product: Product; recommendations: Product[]; onBack: () => void; onAdd: (product: Product) => void; onCheckout: () => void; onOpenProduct: (product: Product) => void }) {
  const [colorIndex, setColorIndex] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [shareVisible, setShareVisible] = useState(false);
  const detailGalleryRef = useRef<ScrollView>(null);
  const choices = product.images?.length ? product.images.map((image, index) => ({ name: index === 0 ? 'Default' : `View ${index + 1}`, image })) : detailColors;
  const availableForSale = product.availableForSale ?? true;
  const detailDiscountLabel = product.discount ? `(-${product.discount.replace(/\s*off/i, '')})` : '';
  const vendorName = product.vendor?.trim() ?? '';
  const deliveryOffsets = vendorName.toLowerCase() === 'usa warehouse' ? [10, 15] : vendorName.toLowerCase() === 'india warehouse' ? [2, 4] : [3, 7];
  const deliveryStart = new Date();
  const deliveryEnd = new Date();
  deliveryStart.setDate(deliveryStart.getDate() + deliveryOffsets[0]!);
  deliveryEnd.setDate(deliveryEnd.getDate() + deliveryOffsets[1]!);
  const deliveryRange = `${ordinalDate(deliveryStart)} - ${ordinalDate(deliveryEnd)}`;
  const storefrontDomain = process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const productUrl = product.handle && storefrontDomain ? `https://${storefrontDomain}/products/${product.handle}` : 'https://blumaple.com';
  const shareMessage = `${product.name}\n${productUrl}`;
  const shareFallback = () => Share.share({ message: shareMessage, url: productUrl, title: product.name });
  const shareTo = async (destination: 'whatsapp' | 'mail' | 'instagram' | 'facebook') => {
    const encodedMessage = encodeURIComponent(shareMessage);
    const destinationUrl = destination === 'whatsapp'
      ? `https://wa.me/?text=${encodedMessage}`
      : destination === 'mail'
        ? `mailto:?subject=${encodeURIComponent(product.name)}&body=${encodedMessage}`
        : destination === 'instagram'
          ? `instagram://share?text=${encodedMessage}`
          : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;
    setShareVisible(false);
    const supported = await Linking.canOpenURL(destinationUrl);
    if (supported) await Linking.openURL(destinationUrl);
    else await shareFallback();
  };
  const copyProductLink = async () => {
    await Clipboard.setStringAsync(productUrl);
    setShareVisible(false);
    Alert.alert('Link copied', 'Product link copied to your clipboard.');
  };
  const fallbackUnitPrice = Number(product.price.replace(/[^0-9.]/g, ''));
  const unitPrice = product.unitPrice ?? fallbackUnitPrice;
  const floatingTotal = Number.isFinite(unitPrice) ? money(String(unitPrice * quantity), product.currencyCode ?? 'INR') : product.price;
  const parsedTechSpecs = parseTechSpecTable(product.techSpec);
  const specificationRows = parsedTechSpecs.length ? parsedTechSpecs : [
    ['SKU', product.sku || 'Not specified'],
    ['Brand', product.brand || 'Not specified'],
    ['Shipping', product.vendor || 'Not specified'],
  ] as const;
  const rows = [
    ['Key points', product.description ? product.description.split(/[.!?]/).filter(Boolean).slice(0, 3).map(point => `• ${point.trim()}`).join('\n') : `• Premium quality ${product.name}\n• Designed for dependable everyday use\n• Verified product from Blumaple`],
    ['Warranty / Shipping / Returns', '• Free shipping on eligible orders\n• No additional customs duties will be charged\n• 7-day return policy applies to eligible products\n• Tracking details will be shared after dispatch'],
    ['Specifications & details', ''],
    ['Product description', product.description || 'Product details are available from the Shopify store.'],
  ] as const;

  return <View style={[styles.detailPage, { width }]}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
      <View style={styles.detailHeroSection}>
        <ScrollView ref={detailGalleryRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false} style={styles.detailGallery} onMomentumScrollEnd={event => setColorIndex(Math.round(event.nativeEvent.contentOffset.x / width))}>
          {choices.map((option, index) => <Image key={`hero-${option.name}-${index}`} source={option.image} style={[styles.detailHero, { width }]} resizeMode="contain" />)}
        </ScrollView>
        <View style={styles.detailOverlayHeader}>
          <Pressable onPress={onBack} style={styles.detailCircleButton}><Ionicons name="arrow-back" size={22} color={palette.ink} /></Pressable>
          <View style={styles.detailOverlayActions}><Pressable style={styles.detailCircleButton}><Ionicons name="heart-outline" size={22} color={palette.ink} /></Pressable><Pressable onPress={() => setShareVisible(true)} style={styles.detailCircleButton}><Ionicons name="share-social-outline" size={21} color={palette.ink} /></Pressable></View>
        </View>
        <View style={styles.detailDots}>{choices.map((_, i) => <View key={i} style={[styles.detailDot, i === colorIndex && styles.detailDotActive]} />)}</View>
      </View>
      {choices.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detailThumbnailScroller} contentContainerStyle={styles.detailThumbnails}>{choices.map((option, index) => <Pressable key={`${option.name}-${index}`} onPress={() => { setColorIndex(index); detailGalleryRef.current?.scrollTo({ x: index * width, animated: true }); }} style={[styles.detailThumbnail, index === colorIndex && styles.detailThumbnailActive]}><Image source={option.image} style={styles.swatchImage} resizeMode="contain" /></Pressable>)}</ScrollView> : null}
      <View style={styles.detailInfoCard}>
        <Text style={styles.detailTitle}>{product.name}</Text>
        <View style={styles.detailPriceRow}><Text style={styles.detailPrice}>{product.price}</Text>{product.oldPrice ? <Text style={styles.detailOldPrice}>{product.oldPrice}</Text> : null}{detailDiscountLabel ? <Text style={styles.detailDiscount}>{detailDiscountLabel}</Text> : null}</View>
        <Text style={styles.inclusive}>Inclusive of all taxes · Free shipping</Text>
        <Text style={styles.detailBrandLine}>Brand: <Text style={styles.detailBrandValue}>{product.brand || 'Not specified'}</Text> | {product.vendor || 'Warehouse not specified'}</Text>
      </View>
      <View style={styles.detailInfoCard}>
        <View style={styles.detailStockRow}><View style={[styles.stockDot, !availableForSale && styles.stockDotUnavailable]} /><Text style={[styles.stockText, !availableForSale && styles.stockTextUnavailable]}>{availableForSale ? 'In stock' : 'Coming soon'}</Text></View>
        <View style={styles.quantityRow}><Text style={styles.quantityLabel}>Quantity</Text><View style={styles.quantityControl}><Pressable onPress={() => setQuantity(value => Math.max(1, value - 1))}><Text style={styles.quantityButton}>−</Text></Pressable><Text style={styles.quantityValue}>{quantity}</Text><Pressable onPress={() => setQuantity(value => value + 1)}><Text style={styles.quantityButton}>+</Text></Pressable></View></View>
        <Text style={styles.deliveryEstimate}>Estimated Delivery: <Text style={styles.deliveryEstimateValue}>{deliveryRange}</Text></Text>
        {availableForSale ? <Pressable onPress={onCheckout} style={styles.buyNowButton}><Text style={styles.buyNowButtonText}>BUY IT NOW</Text></Pressable> : null}
        {vendorName.toLowerCase() === 'india warehouse' ? <View style={styles.codBox}><Text style={styles.codText}>Cash on Delivery accepted</Text></View> : null}
        <View style={styles.paymentTrustBox}>
          <View style={styles.paymentLogoSlot}><Image source={require('./assets/payment/visa.png')} style={styles.paymentLogoImage} resizeMode="contain" /></View>
          <View style={styles.paymentLogoSlot}><Image source={require('./assets/payment/google-pay.png')} style={styles.paymentLogoImage} resizeMode="contain" /></View>
          <View style={styles.paymentLogoSlot}><Image source={require('./assets/payment/bhim.png')} style={styles.paymentLogoImage} resizeMode="contain" /></View>
          <View style={styles.paymentLogoSlot}><Image source={require('./assets/payment/phonepe.png')} style={styles.paymentLogoImage} resizeMode="contain" /></View>
        </View>
      </View>
      {rows.map(([title, copy]) => { const open = expanded === title; const specifications = title === 'Specifications & details'; return <Pressable key={title} onPress={() => setExpanded(open ? null : title)} style={styles.accordion}><View style={styles.accordionHeading}><Text style={styles.accordionTitle}>{title}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} /></View>{open ? specifications ? <View style={styles.specTable}>{specificationRows.map(([heading, detail], index) => <View key={`${heading}-${index}`} style={[styles.specRow, index === specificationRows.length - 1 && styles.specRowLast]}><View style={styles.specHeadingCell}><Text style={styles.specHeadingText}>{heading}</Text></View><View style={styles.specDetailCell}><Text style={styles.specDetailText}>{detail}</Text></View></View>)}</View> : <Text style={styles.accordionCopy}>{copy}</Text> : null}</Pressable>; })}
      <Text style={styles.similarTitle}>You may also like</Text>
      <Text style={styles.similarSubtitle}>Combine your style with these products</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.detailRecommendations}>{recommendations.filter(item => item.id !== product.id).slice(0, 12).map(item => <ProductCard key={`similar-${item.id}`} item={item} width={150} favorite={false} collectionLayout onFavorite={() => {}} onAdd={() => onAdd(item)} onOpen={() => onOpenProduct(item)} />)}</ScrollView>
    </ScrollView>
    <View style={styles.buyBar}><View><Text style={styles.buyBarPrice}>{floatingTotal}</Text><Text style={styles.buyBarTax}>Inclusive of all taxes</Text></View><Pressable onPress={availableForSale ? () => onAdd(product) : () => {}} style={[styles.addLarge, !availableForSale && styles.notifyLarge]}><Text style={styles.addLargeText}>{availableForSale ? 'Add to cart' : 'Notify me'}</Text></Pressable></View>
    <Modal visible={shareVisible} transparent animationType="slide" onRequestClose={() => setShareVisible(false)}>
      <Pressable style={styles.shareBackdrop} onPress={() => setShareVisible(false)}><Pressable style={styles.shareSheet} onPress={() => {}}>
        <View style={styles.shareSheetHeader}><Text style={styles.shareSheetTitle}>Share product</Text><Pressable onPress={() => setShareVisible(false)}><Ionicons name="close" size={23} color={palette.ink} /></Pressable></View>
        <View style={styles.shareActions}><Pressable onPress={() => shareTo('whatsapp')} style={styles.shareAction}><View style={[styles.shareIcon, styles.whatsappIcon]}><Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" /></View><Text style={styles.shareActionText}>WhatsApp</Text></Pressable><Pressable onPress={() => shareTo('mail')} style={styles.shareAction}><View style={[styles.shareIcon, styles.mailIcon]}><Ionicons name="mail" size={22} color="#FFFFFF" /></View><Text style={styles.shareActionText}>Mail</Text></Pressable><Pressable onPress={() => shareTo('instagram')} style={styles.shareAction}><View style={[styles.shareIcon, styles.instagramIcon]}><Ionicons name="logo-instagram" size={23} color="#FFFFFF" /></View><Text style={styles.shareActionText}>Instagram</Text></Pressable><Pressable onPress={() => shareTo('facebook')} style={styles.shareAction}><View style={[styles.shareIcon, styles.facebookIcon]}><Ionicons name="logo-facebook" size={23} color="#FFFFFF" /></View><Text style={styles.shareActionText}>Facebook</Text></Pressable></View>
        <Pressable onPress={copyProductLink} style={styles.copyLinkButton}><Ionicons name="copy-outline" size={20} color={palette.blue} /><Text style={styles.copyLinkText}>Copy link</Text></Pressable>
      </Pressable></Pressable>
    </Modal>
  </View>;
}

function CartPopup({ item, count, onOpen, containerStyle }: { item: Product | null; count: number; onOpen: () => void; containerStyle?: any }) {
  return <Animated.View pointerEvents="box-none" style={[styles.cartPopupLayer, containerStyle]}><Pressable onPress={onOpen} style={styles.cartPopup}>
    {item ? <Image source={item.image} style={styles.cartPopupImage} resizeMode="contain" /> : <Ionicons name="cart" size={28} color="#FFFFFF" />}
    <View style={styles.cartPopupCopy}><Text style={styles.cartPopupTitle}>View cart</Text><Text style={styles.cartPopupCount}>{count} {count === 1 ? 'item' : 'items'}</Text></View>
    <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
  </Pressable></Animated.View>;
}

function HelpFab({ product, cartVisible = false }: { product?: Product | null; cartVisible?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [enquiry, setEnquiry] = useState('');
  const message = `Hi, Blumaple, need help${product?.handle ? `\nhttps://blumaple.com/products/${product.handle}` : ''}`;
  const openWhatsApp = () => Linking.openURL(`https://wa.me/917386714141?text=${encodeURIComponent(message)}`);
  const sendContact = () => {
    const body = `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nEnquiry:\n${enquiry}`;
    Linking.openURL(`mailto:blumaple-ww@blumaple.com?subject=${encodeURIComponent('Blumaple support enquiry')}&body=${encodeURIComponent(body)}`);
    setContactVisible(false);
  };
  // Keep the support control clear of the cart bar from the first render.
  const bottom = 152;

  return <View pointerEvents="box-none" style={[styles.helpLayer, { bottom }]}>
    {expanded ? <View style={styles.helpActions}>
      <Pressable onPress={() => setContactVisible(true)} style={styles.helpAction}><Ionicons name="mail-outline" size={25} color="#FFFFFF" /></Pressable>
      <Pressable onPress={() => Linking.openURL('tel:+917386714141')} style={styles.helpAction}><Ionicons name="call-outline" size={25} color="#FFFFFF" /></Pressable>
      <Pressable onPress={openWhatsApp} style={styles.helpAction}><Ionicons name="logo-whatsapp" size={25} color="#FFFFFF" /></Pressable>
    </View> : null}
    <Pressable onPress={() => setExpanded(value => !value)} style={styles.helpMain}><Ionicons name={expanded ? 'close' : 'headset-outline'} size={25} color="#FFFFFF" /></Pressable>
    <Modal visible={contactVisible} transparent animationType="slide" onRequestClose={() => setContactVisible(false)}>
      <Pressable style={styles.helpModalBackdrop} onPress={() => setContactVisible(false)}>
        <Pressable style={styles.helpSheet} onPress={() => {}}>
          <View style={styles.helpSheetHeader}><Text style={styles.helpSheetTitle}>Contact Blumaple</Text><Pressable onPress={() => setContactVisible(false)}><Ionicons name="close" size={23} color={palette.heading} /></Pressable></View>
          <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor="#7B8490" style={styles.helpInput} />
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#7B8490" keyboardType="email-address" style={styles.helpInput} />
          <TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor="#7B8490" keyboardType="phone-pad" style={styles.helpInput} />
          <TextInput value={enquiry} onChangeText={setEnquiry} placeholder="Enquiry" placeholderTextColor="#7B8490" multiline textAlignVertical="top" style={[styles.helpInput, styles.helpEnquiry]} />
          <Pressable onPress={sendContact} style={styles.helpSubmit}><Text style={styles.helpSubmitText}>Send enquiry</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
}

function CartPage({ items, recentlyViewed, onBack, onChangeQuantity, onCheckout, onOpenProduct, onAdd }: { items: CartItem[]; recentlyViewed: Product[]; onBack: () => void; onChangeQuantity: (productId: string, change: number) => void; onCheckout: () => void; onOpenProduct: (product: Product) => void; onAdd: (product: Product) => void }) {
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = items.reduce((total, { product, quantity }) => total + (product.unitPrice ?? (Number(product.price.replace(/[^0-9.]/g, '')) || 0)) * quantity, 0);
  const cartTotalText = money(String(cartTotal), items[0]?.product.currencyCode ?? 'INR');
  return <View style={styles.cartPage}>
    <View style={styles.cartPageHeader}><Pressable onPress={onBack} hitSlop={10} style={styles.cartBackButton}><Ionicons name="arrow-back" size={23} color={palette.white} /></Pressable><Text style={styles.cartPageTitle}>My Cart</Text></View>
    {items.length ? <ScrollView contentContainerStyle={styles.cartList} showsVerticalScrollIndicator={false}>{items.map(({ product, quantity }) => <View key={product.id} style={styles.cartListItem}>
      <Image source={product.image} style={styles.cartListImage} resizeMode="contain" />
      <View style={styles.cartListCopy}><Text numberOfLines={3} style={styles.cartListName}>{product.name}</Text><Text style={styles.cartListPrice}>{product.price}</Text></View>
      <View style={styles.cartListActions}><View style={styles.cartQuantityControl}><Pressable hitSlop={8} onPress={() => onChangeQuantity(product.id, -1)}><Text style={styles.cartQuantityButton}>−</Text></Pressable><Text style={styles.cartQuantityValue}>{quantity}</Text><Pressable hitSlop={8} onPress={() => onChangeQuantity(product.id, 1)}><Text style={styles.cartQuantityButton}>+</Text></Pressable></View></View>
      <Text numberOfLines={1} style={styles.cartLineTotal}>{product.unitPrice ? money(String(product.unitPrice * quantity), product.currencyCode ?? 'INR') : product.price}</Text>
    </View>)}{recentlyViewed.length ? <View style={styles.cartSuggestions}><Text style={styles.cartSuggestionsTitle}>Suggestions</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cartSuggestionRow}>{recentlyViewed.map(product => <View key={product.id} style={styles.cartSuggestionCard}><Pressable onPress={() => onOpenProduct(product)}><Image source={product.image} style={styles.cartSuggestionImage} resizeMode="contain" /><Text numberOfLines={2} style={styles.cartSuggestionName}>{product.name}</Text><Text style={styles.cartSuggestionPrice}>{product.price}</Text></Pressable><Pressable onPress={() => onAdd(product)} style={styles.cartSuggestionAdd}><Text style={styles.cartSuggestionAddText}>ADD</Text></Pressable></View>)}</ScrollView></View> : null}</ScrollView> : <View style={styles.emptyCart}><Ionicons name="bag-handle-outline" size={44} color={palette.blue} /><Text style={styles.emptyCartTitle}>Your cart is empty</Text><Text style={styles.emptyCartCopy}>Add products to see them here.</Text></View>}
    {items.length ? <View style={styles.cartCheckoutBar}><View style={styles.cartTotalBlock}><Text style={styles.cartItemCount}>{itemCount} {itemCount === 1 ? 'item' : 'items'} in cart</Text><Text style={styles.cartTotalText}>Total: {cartTotalText}</Text></View><Pressable onPress={onCheckout} style={styles.cartCheckoutButton}><Text style={styles.cartCheckoutText}>Proceed to checkout</Text></Pressable></View> : null}
  </View>;
}

function Storefront() {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const contentWidth = Math.min(screenWidth, 440);
  const cardWidth = Math.max(156, (contentWidth - 46) / 2);
  const trendingCardWidth = Math.max(138, (contentWidth - 96) / 2);
  const carouselCardWidth = Math.round((contentWidth - 20) / 2);
  const carouselStep = carouselCardWidth + 12;
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeCategory, setActiveCategory] = useState('Audio');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartPopupVisible, setCartPopupVisible] = useState(false);
  const [cartPreview, setCartPreview] = useState<Product | null>(null);
  const [productReturnScreen, setProductReturnScreen] = useState<ReturnScreen>('home');
  const [cartReturnScreen, setCartReturnScreen] = useState<ReturnScreen>('home');
  const [categoryCollectionReturnScreen, setCategoryCollectionReturnScreen] = useState<'home' | 'categories'>('home');
  const [screen, setScreen] = useState<'home' | 'categories' | 'categoryCollection' | 'collection' | 'product' | 'cart' | 'checkout' | 'address' | 'orderSuccess' | 'orderFailure'>('home');
  const [shopifyProducts, setShopifyProducts] = useState<Product[]>([]);
  const [shopifyMenuItems, setShopifyMenuItems] = useState<ShopifyMenuItem[]>([]);
  const [shopifyCollectionPreviews, setShopifyCollectionPreviews] = useState<Record<string, ShopifyCollectionPreview>>({});
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState<ShopifyMenuItem | null>(null);
  const [selectedCollectionItem, setSelectedCollectionItem] = useState<ShopifyMenuItem | null>(null);
  const [collectionPageProducts, setCollectionPageProducts] = useState<ShopifyProduct[]>([]);
  const [collectionPageLoading, setCollectionPageLoading] = useState(false);
  const [collectionPageLoadingMore, setCollectionPageLoadingMore] = useState(false);
  const [collectionPageHasNext, setCollectionPageHasNext] = useState(false);
  const [collectionPageCursor, setCollectionPageCursor] = useState<string | null>(null);
  const [collectionPageTotal, setCollectionPageTotal] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [productPageRecommendations, setProductPageRecommendations] = useState<Product[]>([]);
  const [shopifyLoading, setShopifyLoading] = useState(true);
  const [shopifyError, setShopifyError] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [checkoutInitialStage, setCheckoutInitialStage] = useState<2 | 3>(2);
  const [orderOutcome, setOrderOutcome] = useState<OrderOutcome | null>(null);
  const [pincodeModalVisible, setPincodeModalVisible] = useState(false);
  const [pincode, setPincode] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [uploadedCarousels, setUploadedCarousels] = useState<UploadedCarouselData>({});
  const [openingAnimationVisible, setOpeningAnimationVisible] = useState(true);
  const carouselRef = useRef<ScrollView>(null);
  const carouselPositionRef = useRef(0);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home') return false;
      if (screen === 'orderSuccess') { setScreen('home'); return true; }
      if (screen === 'orderFailure') { setScreen('checkout'); return true; }
      if (screen === 'address' || screen === 'checkout') { setScreen('cart'); return true; }
      if (screen === 'cart') { setCartPopupVisible(cartItems.length > 0); setScreen(cartReturnScreen); return true; }
      if (screen === 'product') { setScreen(productReturnScreen); return true; }
      if (screen === 'categoryCollection') { setScreen(categoryCollectionReturnScreen); return true; }
      if (screen === 'collection') { setScreen('home'); return true; }
      if (screen === 'categories') { setScreen('home'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [cartItems, cartReturnScreen, categoryCollectionReturnScreen, productReturnScreen, screen]);
  const browseChromeCollapsedRef = useRef(false);
  const browseChromeProgress = useRef(new Animated.Value(0)).current;
  const collapseBrowseChrome = screen === 'home' || screen === 'categories';
  const transportProgress = useRef(new Animated.Value(0)).current;
  const openingProgress = useRef(new Animated.Value(0)).current;
  const flightTrailScale = transportProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] });
  const truckTrailScale = transportProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const flightPhaseOpacity = transportProgress.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [1, 1, 0, 0] });
  const truckPhaseOpacity = transportProgress.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] });
  const flightTrailOffset = Animated.multiply(Animated.subtract(flightTrailScale, 1), contentWidth / 2);
  const truckTrailOffset = Animated.multiply(Animated.subtract(truckTrailScale, 1), contentWidth / 2);
  const flightTranslateX = Animated.subtract(Animated.multiply(flightTrailScale, contentWidth), 19);
  const truckTranslateX = Animated.subtract(Animated.multiply(truckTrailScale, contentWidth), 21);
  const openingFlightTranslateX = openingProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [-180, contentWidth + 180, contentWidth + 180],
  });
  const openingTruckTranslateX = openingProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [-180, -180, contentWidth + 180],
  });
  const openingFlightOpacity = openingProgress.interpolate({ inputRange: [0, 0.59, 0.62, 1], outputRange: [0.5, 0.5, 0, 0] });
  const openingTruckOpacity = openingProgress.interpolate({ inputRange: [0, 0.38, 0.4, 1], outputRange: [0, 0, 0.5, 0.5] });
  const homeHeaderHeight = browseChromeProgress.interpolate({ inputRange: [0, 1], outputRange: [(screen === 'home' || screen === 'categories') ? 126 : 82, 0] });
  const homeHeaderOpacity = browseChromeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const homeFooterTranslateY = browseChromeProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 74] });
  const homeFooterOpacity = browseChromeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const homeCartTranslateY = browseChromeProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 62] });

  const setBrowseChromeVisibility = (collapsed: boolean) => {
    // Scroll events can arrive before React has committed the state update. Keep
    // this ref in sync immediately so the same animation is never restarted.
    if (collapsed === browseChromeCollapsedRef.current) return;
    browseChromeCollapsedRef.current = collapsed;
    Animated.timing(browseChromeProgress, {
      toValue: collapsed ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };
  const catalog = shopifyProducts.length ? shopifyProducts : products;
  const cartCount = useMemo(() => cartItems.reduce((total, item) => total + item.quantity, 0), [cartItems]);
  const recommendations = useMemo(() => catalog.slice(0, 4), [catalog]);
  const filteredShopifyMenuItems = useMemo(
    () => shopifyMenuItems.filter(item => !excludedShopifyMenuItems.has(item.title.trim())),
    [shopifyMenuItems],
  );
  const displayHomeMenus = useMemo(() => filteredShopifyMenuItems.length
    ? filteredShopifyMenuItems.map((item, index) => ({ label: item.title.trim(), hero: homeMenus[index % homeMenus.length]!.hero }))
    : [...homeMenus],
  [filteredShopifyMenuItems]);
  const activeHomeMenu = displayHomeMenus.find(menu => menu.label === activeCategory) ?? displayHomeMenus[0]!;
  const activeShopifyMenu = filteredShopifyMenuItems.find(item => item.title.trim() === activeHomeMenu.label);
  const categoryIndex = Math.max(0, displayHomeMenus.findIndex(menu => menu.label === activeHomeMenu.label));
  const shopCategories = useMemo(
    () => {
      const collectionItems = activeShopifyMenu?.items.flatMap(group => group.items.length
        ? group.items.map(collection => ({ collection, group }))
        : [{ collection: group, group }]) ?? [];
      return collectionItems.length
        ? collectionItems.map(({ collection, group }, index) => {
          const preview = collection.resource ? shopifyCollectionPreviews[collection.resource.id] : undefined;
          const firstProductImage = preview?.products.nodes[0]?.images.nodes[0]?.url;
          const collectionImage = preview?.image?.url;
          return {
            id: collection.id,
            label: collection.title.trim(),
            image: collectionImage ? { uri: collectionImage } as ImageSourcePropType : firstProductImage ? { uri: firstProductImage } as ImageSourcePropType : shopCategoryImages[(index + categoryIndex * 2) % shopCategoryImages.length]!,
            collection,
            group,
          };
        })
        : (shopCategoryLabels[activeHomeMenu.label as keyof typeof shopCategoryLabels] ?? []).map((label, index) => ({
          id: `${activeHomeMenu.label}-${label}`,
          label,
          image: shopCategoryImages[(index + categoryIndex * 2) % shopCategoryImages.length]!,
          collection: undefined,
          group: undefined,
        }));
    },
    [activeHomeMenu.label, activeShopifyMenu, categoryIndex, shopifyCollectionPreviews],
  );
  const categoryProducts = useMemo(
    () => {
      const seen = new Set<string>();
      const menuProducts = (activeShopifyMenu?.items.flatMap(group => [group, ...group.items]) ?? [])
        .map(item => item.resource ? shopifyCollectionPreviews[item.resource.id]?.products.nodes[0] : undefined)
        .filter((product): product is ShopifyProduct => Boolean(product))
        .filter(product => {
          if (seen.has(product.id)) return false;
          seen.add(product.id);
          return true;
        })
        .map(mapShopifyProduct);
      if (menuProducts.length) return menuProducts;
      return Array.from({ length: Math.min(5, catalog.length) }, (_, index) => catalog[(categoryIndex + index) % catalog.length]!).filter(Boolean);
    },
    [activeShopifyMenu, catalog, categoryIndex, shopifyCollectionPreviews],
  );
  const carouselProducts = useMemo(
    () => Array.from({ length: 4 }, (_, index) => categoryProducts[index % categoryProducts.length] ?? products[0]!),
    [categoryProducts],
  );
  const browserCarouselApiUrl = typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.hostname}:3001/api/carousels` : '';
  const carouselApiUrl = process.env.EXPO_PUBLIC_CAROUSEL_API_URL ?? browserCarouselApiUrl;
  const uploadedSlides = uploadedCarousels[activeHomeMenu.label]?.filter(slide => slide.image) ?? [];
  const carouselSlides = useMemo(() => activeShopifyMenu?.items.length
    ? activeShopifyMenu.items.map((item, index) => {
      const preview = item.resource ? shopifyCollectionPreviews[item.resource.id] : undefined;
      const shopifyProduct = preview?.products.nodes[0];
      const product = shopifyProduct ? mapShopifyProduct(shopifyProduct) : categoryProducts[index % categoryProducts.length] ?? products[0]!;
      const collectionImage = preview?.image?.url;
      // Do not use a product image while the collection image is still loading.
      // That visual swap is distracting and makes the carousel look incorrect.
      return collectionImage ? { id: item.id, image: { uri: collectionImage } as ImageSourcePropType, title: item.title.trim(), subtitle: '', product, category: item } : null;
    })
      .filter((slide): slide is NonNullable<typeof slide> => Boolean(slide))
    : uploadedSlides.length
      ? uploadedSlides.map((slide, index) => ({ id: slide.id, image: { uri: slide.image } as ImageSourcePropType, title: slide.title || `${activeHomeMenu.label} picks`, subtitle: slide.collection ? `Shop ${slide.collection}` : `Trending ${activeHomeMenu.label.toLowerCase()} pick`, product: categoryProducts[index % categoryProducts.length] ?? products[0]!, category: undefined }))
      : [],
  [activeHomeMenu.label, activeShopifyMenu, carouselProducts, categoryProducts, shopifyCollectionPreviews, uploadedSlides]);
  const carouselSlideCount = Math.max(1, carouselSlides.length);

  useEffect(() => {
    if (screen !== 'home' && screen !== 'categories') return;
    transportProgress.setValue(0);
    const transportAnimation = Animated.loop(Animated.timing(transportProgress, {
      toValue: 1,
      duration: 5000,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    transportAnimation.start();
    return () => transportAnimation.stop();
  }, [contentWidth, screen, transportProgress]);

  useEffect(() => {
    browseChromeCollapsedRef.current = false;
    browseChromeProgress.setValue(0);
  }, [browseChromeProgress, collapseBrowseChrome, screen]);

  useEffect(() => {
    openingProgress.setValue(0);
    const openingAnimation = Animated.timing(openingProgress, {
      toValue: 1,
      duration: 5200,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    openingAnimation.start(({ finished }) => {
      if (finished) setOpeningAnimationVisible(false);
    });
    return () => openingAnimation.stop();
  }, [contentWidth, openingProgress]);

  useEffect(() => {
    if (screen !== 'home') return;
    setActiveBanner(0);
    carouselPositionRef.current = carouselSlideCount;
    const frame = requestAnimationFrame(() => carouselRef.current?.scrollTo({ x: carouselStep * carouselSlideCount, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [activeHomeMenu.label, carouselSlideCount, carouselStep, screen]);

  useEffect(() => {
    if (screen !== 'home' || carouselSlideCount < 2) return;
    const interval = setInterval(() => {
      let nextPosition = carouselPositionRef.current + 1;
      if (nextPosition >= carouselSlideCount * 2) {
        carouselPositionRef.current = carouselSlideCount;
        carouselRef.current?.scrollTo({ x: carouselStep * carouselSlideCount, animated: false });
        nextPosition = carouselSlideCount + 1;
      }
      carouselPositionRef.current = nextPosition;
      carouselRef.current?.scrollTo({ x: carouselStep * nextPosition, animated: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [carouselSlideCount, carouselStep, screen]);

  useEffect(() => {
    fetchShopifyProducts()
      .then(items => {
        setShopifyProducts(items.map(mapShopifyProduct));
        setShopifyError(items.length ? null : 'Shopify connected, but no published Storefront products were returned.');
      })
      .catch(error => setShopifyError(error instanceof Error ? error.message : 'Unable to load Shopify products.'))
      .finally(() => setShopifyLoading(false));
  }, []);

  useEffect(() => {
    fetchShopifyMainMenu()
      .then(items => setShopifyMenuItems(items))
      .catch(() => setShopifyMenuItems([]));
  }, []);

  useEffect(() => {
    const menuCollections = screen === 'categories'
      ? filteredShopifyMenuItems.flatMap(menu => menu.items.flatMap(group => [group, ...group.items]))
      : activeShopifyMenu?.items.flatMap(group => [group, ...group.items]) ?? [];
    const collectionIds = [...new Set(menuCollections.map(item => item.resource?.id).filter((id): id is string => Boolean(id)))];
    if (!collectionIds.length) return;
    fetchShopifyCollectionPreviews(collectionIds)
      .then(previews => setShopifyCollectionPreviews(current => ({
        ...current,
        ...Object.fromEntries(previews.map(preview => [preview.id, preview])),
      })))
      .catch(() => undefined);
  }, [activeShopifyMenu, filteredShopifyMenuItems, screen]);

  useEffect(() => {
    const collectionId = selectedCollectionItem?.resource?.id;
    if (screen !== 'categoryCollection' || !collectionId) return;
    let cancelled = false;
    setCollectionPageLoading(true);
    setCollectionPageProducts([]);
    setCollectionPageHasNext(false);
    setCollectionPageCursor(null);
    setCollectionPageTotal(null);
    fetchShopifyCollectionProducts(collectionId)
      .then(page => {
        if (cancelled) return;
        setCollectionPageProducts(page.products);
        setCollectionPageHasNext(page.hasNextPage);
        setCollectionPageCursor(page.endCursor);
      })
      .catch(() => {
        if (cancelled) return;
        setCollectionPageProducts([]);
        setCollectionPageHasNext(false);
        setCollectionPageCursor(null);
      })
      .finally(() => { if (!cancelled) setCollectionPageLoading(false); });
    fetchShopifyCollectionProductCount(collectionId)
      .then(total => { if (!cancelled) setCollectionPageTotal(total); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [screen, selectedCollectionItem]);

  const loadMoreCollectionProducts = () => {
    const collectionId = selectedCollectionItem?.resource?.id;
    if (!collectionId || !collectionPageHasNext || !collectionPageCursor || collectionPageLoadingMore) return;
    setCollectionPageLoadingMore(true);
    fetchShopifyCollectionProducts(collectionId, 30, collectionPageCursor)
      .then(page => {
        setCollectionPageProducts(current => {
          const existingIds = new Set(current.map(product => product.id));
          return [...current, ...page.products.filter(product => !existingIds.has(product.id))];
        });
        setCollectionPageHasNext(page.hasNextPage);
        setCollectionPageCursor(page.endCursor);
      })
      .catch(() => undefined)
      .finally(() => setCollectionPageLoadingMore(false));
  };

  useEffect(() => {
    if (!carouselApiUrl) return;
    fetch(carouselApiUrl).then(response => response.ok ? response.json() : Promise.reject()).then((data: UploadedCarouselData) => setUploadedCarousels(data)).catch(() => undefined);
  }, [carouselApiUrl]);

  const toggleFavorite = (id: string) => setFavorites(current => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const addToCart = (product: Product) => {
    setCartItems(current => {
      const existing = current.find(item => item.product.id === product.id);
      return existing
        ? current.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { product, quantity: 1 }];
    });
    setCartPreview(product);
    setCartPopupVisible(true);
  };

  const changeCartQuantity = (productId: string, change: number) => setCartItems(current => current
    .map(item => item.product.id === productId ? { ...item, quantity: item.quantity + change } : item)
    .filter(item => item.quantity > 0));

  const openCart = () => {
    setCartPopupVisible(false);
    setCartReturnScreen(screen === 'product' || screen === 'collection' || screen === 'categoryCollection' || screen === 'categories' ? screen : 'home');
    setScreen('cart');
  };

  const returnFromCart = () => {
    setCartPopupVisible(cartItems.length > 0);
    setScreen(cartReturnScreen);
  };

  const openProduct = (product: Product, preferredCollectionId?: string) => {
    setRecentlyViewed(current => [product, ...current.filter(item => item.id !== product.id)].slice(0, 10));
    setProductReturnScreen(screen === 'product' || screen === 'collection' || screen === 'categoryCollection' || screen === 'categories' || screen === 'cart' ? screen : 'home');
    setSelectedProduct(product);
    setScreen('product');
    const collectionId = preferredCollectionId ?? product.collectionIds?.[0];
    if (!collectionId) {
      setProductPageRecommendations([]);
      return;
    }
    setProductPageRecommendations([product]);
    fetchShopifyCollectionProducts(collectionId, 250)
      .then(page => setProductPageRecommendations(page.products.map(mapShopifyProduct)))
      .catch(() => setProductPageRecommendations([]));
  };

  const openCategoryCollection = (category: ShopifyMenuItem, collection: ShopifyMenuItem, origin: 'home' | 'categories') => {
    // Clear stale results before this screen becomes visible. The fetch effect
    // then fills it with this collection's actual products.
    setCollectionPageProducts([]);
    setCollectionPageTotal(null);
    setCollectionPageLoading(true);
    setSelectedCategoryGroup(category);
    setSelectedCollectionItem(collection);
    setCategoryCollectionReturnScreen(origin);
    setScreen('categoryCollection');
  };

  const renderProduct = (item: Product) => (
    <ProductCard key={item.id} item={item} width={cardWidth} favorite={favorites.has(item.id)} onFavorite={() => toggleFavorite(item.id)} onAdd={() => addToCart(item)} onOpen={() => openProduct(item)} />
  );

  if (screen === 'categoryCollection' && selectedCategoryGroup && selectedCollectionItem) return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}>
    <StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} />
    <CategoryCollectionPage
      category={selectedCategoryGroup}
      selectedCollection={selectedCollectionItem}
      previews={shopifyCollectionPreviews}
      products={collectionPageProducts}
      loading={collectionPageLoading}
      totalProducts={collectionPageTotal}
      loadingMore={collectionPageLoadingMore}
      hasNextPage={collectionPageHasNext}
      onLoadMore={loadMoreCollectionProducts}
      onBack={() => setScreen(categoryCollectionReturnScreen)}
      onSelectCollection={collection => {
        setCollectionPageProducts([]);
        setCollectionPageTotal(null);
        setCollectionPageLoading(true);
        setSelectedCollectionItem(collection);
      }}
      onAdd={product => addToCart(mapShopifyProduct(product))}
      onOpenProduct={product => openProduct(mapShopifyProduct(product), selectedCollectionItem.resource?.id)}
    />
    <HelpFab cartVisible={cartPopupVisible} />
    {cartPopupVisible ? <CartPopup item={cartPreview} count={cartCount} onOpen={openCart} containerStyle={[styles.collectionCartPopupLayer, { paddingBottom: Math.max(insets.bottom + 10, 38) }]} /> : null}
  </SafeAreaView>;

  if (screen === 'product' && selectedProduct) {
    const recommendations = productPageRecommendations.some(item => item.id === selectedProduct.id) ? productPageRecommendations : products;
    return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} /><ProductDetail width={contentWidth} cartCount={cartCount} product={selectedProduct} recommendations={recommendations} onBack={() => setScreen(productReturnScreen)} onAdd={addToCart} onCheckout={() => { setCartItems(current => current.length ? current : [{ product: selectedProduct, quantity: 1 }]); setCheckoutInitialStage(2); setScreen('address'); }} onOpenProduct={openProduct} />{cartPopupVisible ? <CartPopup item={cartPreview} count={cartCount} onOpen={openCart} /> : null}<HelpFab product={selectedProduct} cartVisible={cartPopupVisible} /></SafeAreaView>;
  }

  if (screen === 'cart') {
    const cartProductIds = new Set(cartItems.map(item => item.product.id));
    const cartCollectionIds = new Set(cartItems.flatMap(item => item.product.collectionIds ?? []));
    const sameCollectionProducts = products.filter(product => !cartProductIds.has(product.id) && (product.collectionIds ?? []).some(collectionId => cartCollectionIds.has(collectionId)));
    const trendingProducts = categoryProducts.filter(product => !cartProductIds.has(product.id));
    const bestSellingProducts = [...products].filter(product => !cartProductIds.has(product.id) && product.availableForSale !== false).sort((a, b) => Number(b.discount.replace(/[^0-9]/g, '')) - Number(a.discount.replace(/[^0-9]/g, '')));
    const seenSuggestionIds = new Set<string>();
    const cartSuggestions = [recentlyViewed, sameCollectionProducts, trendingProducts, bestSellingProducts].flat().filter(product => {
      if (cartProductIds.has(product.id) || seenSuggestionIds.has(product.id)) return false;
      seenSuggestionIds.add(product.id);
      return true;
    }).slice(0, 16);
    return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><CartPage items={cartItems} recentlyViewed={cartSuggestions} onBack={returnFromCart} onChangeQuantity={changeCartQuantity} onCheckout={() => { if (cartItems[0]) { setSelectedProduct(cartItems[0].product); setCheckoutInitialStage(2); setScreen('address'); } }} onOpenProduct={product => openProduct(product)} onAdd={addToCart} /></SafeAreaView>;
  }

  if ((screen === 'orderSuccess' || screen === 'orderFailure') && orderOutcome) return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><OrderResultPage success={orderOutcome.success} orderId={orderOutcome.orderId} items={orderOutcome.items} address={shippingAddress} paymentMethod={orderOutcome.paymentMethod} total={orderOutcome.total} tax={orderOutcome.tax} codFee={orderOutcome.codFee} onHome={() => setScreen('home')} onRetry={() => setScreen('checkout')} /></SafeAreaView>;

  if (screen === 'checkout' && selectedProduct) return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><CheckoutPage product={selectedProduct} quantity={Math.max(1, cartCount)} items={cartItems.length ? cartItems : [{ product: selectedProduct, quantity: Math.max(1, cartCount) }]} address={shippingAddress} initialStage={checkoutInitialStage} onBack={() => setScreen('cart')} onAddress={() => setScreen('address')} onTestResult={(result) => { const orderItems = cartItems.length ? cartItems : [{ product: selectedProduct, quantity: Math.max(1, cartCount) }]; setOrderOutcome({ ...result, items: orderItems, orderId: result.success ? `BM/APP-${Math.floor(1000 + Math.random() * 9000)}` : undefined }); if (result.success) setCartItems([]); setScreen(result.success ? 'orderSuccess' : 'orderFailure'); }} /></SafeAreaView>;

  if (screen === 'address') return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><AddressPage onBack={() => setScreen('cart')} onSave={(address, stage) => { setShippingAddress(address); setCheckoutInitialStage(stage); setScreen('checkout'); }} /></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.safeArea, (screen === 'home' || screen === 'categories') && styles.homeSafeArea]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} />
      <View style={[styles.app, { width: contentWidth }]}>
        {screen === 'collection' ? <View style={styles.collectionHeader}>
          <Pressable onPress={() => setScreen('home')} hitSlop={10}><Ionicons name="arrow-back" size={19} color={palette.white} /></Pressable>
          <Text style={styles.collectionHeaderTitle}>AUDIO</Text>
          <View style={styles.collectionHeaderActions}><Ionicons name="search-outline" size={20} color={palette.white} /><Ionicons name="cart-outline" size={22} color={palette.white} /></View>
        </View> : collapseBrowseChrome ? <Animated.View style={[styles.homeCollapsibleHeader, { height: homeHeaderHeight, opacity: homeHeaderOpacity }]}>
          <View style={[styles.deliveryHeader, screen === 'home' && styles.homeHeroSurface]}>
          <View style={styles.deliveryBrandBlock}>
            <Image source={require('./images/blumaple-header-white.png')} style={styles.deliveryLogo} resizeMode="contain" />
            <Pressable onPress={() => setPincodeModalVisible(true)} style={styles.addAddressButton}><Ionicons name="location-outline" size={21} color={palette.white} /><Text style={[styles.addAddressText, styles.homeHeaderText]}>{deliveryPincode ? `Deliver to ${deliveryPincode}` : 'Deliver to'}</Text></Pressable>
          </View>
          <View style={styles.deliveryActions}>
            <View>
              <Pressable onPress={() => selectedProduct && setScreen('checkout')}><Ionicons name="person-circle" size={46} color={palette.white} /></Pressable>
            </View>
          </View>
          </View>
          {(screen === 'home' || screen === 'categories') ? <View style={[styles.transportLane, styles.homeHeroSurface]} pointerEvents="none"><View style={styles.orbitLine} /><Animated.View style={[styles.orbitLine, styles.redTrack, { opacity: flightPhaseOpacity }]} /><Animated.View style={[styles.orbitLine, styles.blueTrack, { opacity: truckPhaseOpacity }]} /><Animated.View style={[styles.transportTrail, styles.flightTrail, { width: contentWidth, opacity: flightPhaseOpacity, transform: [{ translateX: flightTrailOffset }, { scaleX: flightTrailScale }] }]} /><Animated.View style={[styles.transportTrail, styles.truckTrail, { width: contentWidth, opacity: truckPhaseOpacity, transform: [{ translateX: truckTrailOffset }, { scaleX: truckTrailScale }] }]} /><Animated.View style={[styles.transportFlight, { opacity: flightPhaseOpacity, transform: [{ translateX: flightTranslateX }] }]}><Ionicons name="airplane" size={38} color={palette.blue} /></Animated.View><Animated.View style={[styles.transportTruck, { opacity: truckPhaseOpacity, transform: [{ translateX: truckTranslateX }] }]}><MaterialCommunityIcons name="truck-fast-outline" size={42} color={palette.red} /></Animated.View></View> : null}
        </Animated.View> : <View style={styles.deliveryHeader}>
          <View style={styles.deliveryBrandBlock}>
            <Image source={require('./images/blumaple-header-white.png')} style={styles.deliveryLogo} resizeMode="contain" />
            <Pressable onPress={() => setPincodeModalVisible(true)} style={styles.addAddressButton}><Ionicons name="location-outline" size={21} color={palette.blue} /><Text style={styles.addAddressText}>{deliveryPincode ? `Deliver to ${deliveryPincode}` : 'Deliver to'}</Text></Pressable>
          </View>
          <View style={styles.deliveryActions}><Pressable onPress={() => selectedProduct && setScreen('checkout')}><Ionicons name="person-circle" size={46} color={palette.ink} /></Pressable></View>
        </View>}

        {(screen === 'home' || screen === 'categories') && <View style={[styles.staticSearchZone, (screen === 'home' || screen === 'categories') && styles.homeHeroSurface]}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={palette.ink} />
            <TextInput placeholder="Search for products, brands and more" placeholderTextColor="#9B9B9B" style={styles.searchInput} />
          </View>
        </View>}

        <Animated.ScrollView
          key={screen}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={[styles.content, collapseBrowseChrome && styles.browseContent]}
          onScroll={collapseBrowseChrome ? event => {
            const offsetY = event.nativeEvent.contentOffset.y;
            // The separate close/open thresholds prevent slow-scroll oscillation.
            if (!browseChromeCollapsedRef.current && offsetY > 24) setBrowseChromeVisibility(true);
            if (browseChromeCollapsedRef.current && offsetY < 8) setBrowseChromeVisibility(false);
          } : undefined}
          scrollEventThrottle={16}
        >
          {screen === 'home' ? <>
          <View style={[styles.carouselHeaderZone, styles.homeHeroSurface]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} directionalLockEnabled nestedScrollEnabled decelerationRate="normal" scrollEventThrottle={16} contentContainerStyle={styles.blinkTabs}>
            {displayHomeMenus.map((menu, index) => (
              <Pressable key={menu.label} onPress={() => setActiveCategory(menu.label)} style={[styles.blinkTab, index < displayHomeMenus.length - 1 && styles.blinkTabPartition, activeCategory === menu.label && styles.blinkTabActive]}>
                {activeCategory !== menu.label && <LinearGradient pointerEvents="none" colors={['#FFFFFF', '#EEF2F7']} style={styles.blinkTabGradient} />}
                <Ionicons name={menu.label === 'Audio' ? 'headset-outline' : menu.label === 'Capture' ? 'camera-outline' : menu.label === 'Computers' ? 'laptop-outline' : menu.label === 'Smart Tech' ? 'watch-outline' : menu.label === 'Home' ? 'home-outline' : menu.label === 'Lifestyle' ? 'sparkles-outline' : 'build-outline'} size={29} color={activeCategory === menu.label ? palette.white : palette.ink} />
                <Text style={[styles.blinkTabText, activeCategory === menu.label && styles.blinkTabTextActive]}>{menu.label}</Text>
                {activeCategory === menu.label && <View style={styles.blinkTabIndicator} />}
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.carouselFade}>
          {carouselSlides.length ? <><ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            ref={carouselRef}
            snapToInterval={carouselStep}
            decelerationRate="normal"
            overScrollMode="never"
            onMomentumScrollEnd={event => {
              const index = Math.round(event.nativeEvent.contentOffset.x / carouselStep);
              setActiveBanner(index % carouselSlideCount);
              carouselPositionRef.current = index;
              if (index >= carouselSlideCount * 2) requestAnimationFrame(() => {
                carouselPositionRef.current = index - carouselSlideCount;
                carouselRef.current?.scrollTo({ x: carouselPositionRef.current * carouselStep, animated: false });
              });
              if (index <= 0) requestAnimationFrame(() => {
                carouselPositionRef.current = index + carouselSlideCount;
                carouselRef.current?.scrollTo({ x: carouselPositionRef.current * carouselStep, animated: false });
              });
            }}
            contentContainerStyle={[styles.promoCards, { paddingHorizontal: carouselCardWidth / 2 }]}
          >
            {[...carouselSlides, ...carouselSlides, ...carouselSlides].map((slide, index) => <Pressable key={`${activeHomeMenu.label}-${slide.id}-${index}`} style={[styles.promoCard, { width: carouselCardWidth }]} onPress={() => {
              if (slide.category) {
                const firstCollection = slide.category.items[0] ?? slide.category;
                openCategoryCollection(slide.category, firstCollection, 'home');
              } else {
                openProduct(slide.product);
              }
            }}>
              <View style={styles.promoImageFrame}><Image source={slide.image} style={styles.promoImage} resizeMode="contain" /></View>
              <View style={styles.promoCopy}><Text numberOfLines={2} style={styles.promoTitle}>{slide.title}</Text>{slide.subtitle ? <Text style={styles.promoSubtitle}>{slide.subtitle}</Text> : null}</View>
            </Pressable>)}
          </ScrollView>
          <View style={styles.dots}>{Array.from({ length: carouselSlideCount }).map((_, index) => <View key={index} style={[styles.dot, index === activeBanner && styles.dotActive]} />)}</View></> : <View style={styles.carouselLoading}><CartonBoxLoader /></View>}
          </View>
          </View>
          <View style={[styles.zigzagPartition, styles.homeHeroSurface]}>{Array.from({ length: 30 }).map((_, index) => <View key={index} style={styles.zigzagTooth} />)}</View>
          <View style={styles.homeProductSections}>
          <SectionTitle>Shop by Category</SectionTitle>
          <View style={styles.shopCategoryGrid}>
            {shopCategories.map(({ id, label, image, collection, group }) => <Pressable key={id} style={styles.shopCategoryItem} onPress={() => {
              if (collection && group) {
                openCategoryCollection(group, collection, 'home');
              } else {
                setScreen('collection');
              }
            }}>
              <View style={styles.shopCategoryImageBlock}><View style={styles.shopCategoryImageClip}><Image source={image} style={styles.shopCategoryImage} resizeMode="contain" /></View></View>
              <Text numberOfLines={2} style={styles.shopCategoryLabel}>{label}</Text>
            </Pressable>)}
          </View>
          <SectionTitle>Trending</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingProductRow}>
            {categoryProducts.map(item => <ProductCard key={`explore-${activeHomeMenu.label}-${item.id}`} item={item} width={trendingCardWidth} favorite={favorites.has(item.id)} collectionLayout onFavorite={() => toggleFavorite(item.id)} onAdd={() => addToCart(item)} onOpen={() => openProduct(item)} />)}
          </ScrollView>
          <SectionTitle>Best Selling</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingProductRow}>
            {categoryProducts.map(item => <ProductCard key={`grid-${activeHomeMenu.label}-${item.id}`} item={item} width={trendingCardWidth} favorite={favorites.has(item.id)} collectionLayout onFavorite={() => toggleFavorite(item.id)} onAdd={() => addToCart(item)} onOpen={() => openProduct(item)} />)}
          </ScrollView>
          </View>

          </> : screen === 'categories' ? <CategoriesPage
            menuItems={filteredShopifyMenuItems}
            previews={shopifyCollectionPreviews}
            onSelectCollection={(category, collection) => {
              openCategoryCollection(category, collection, 'categories');
            }}
          /> : <>
            <View style={styles.audioHubHeading}>
              <Text style={styles.audioHubTitle}>The Audio Hub</Text>
              <Text style={styles.audioHubLink}>Explore All Audio Products →</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionCategoryRow}>
              {[
                ['Headphones', require('./assets/figma/product-headphones.png')],
                ['Earbuds', require('./assets/figma/product-57.png')],
                ['Speakers', require('./assets/figma/product-60.png')],
                ['Microphones', require('./assets/figma/category-audio.png')],
                ['VR', require('./assets/figma/category-smart-tech.png')],
              ].map(([label, image]) => <Pressable key={label as string} style={styles.collectionCategory} onPress={() => setActiveCategory(label as string)}>
                <Image source={image as ImageSourcePropType} style={styles.collectionCategoryImage} resizeMode="cover" />
                <Text style={styles.collectionCategoryLabel}>{label as string}</Text>
              </Pressable>)}
            </ScrollView>
            <Image source={require('./assets/figma/banner-audio.png')} style={styles.collectionBanner} resizeMode="cover" />
            <View style={styles.collectionDots}><View style={styles.collectionDot} /><View style={styles.collectionDot} /><View style={styles.collectionDotActive} /></View>
            <SectionTitle>Top Brands You'll Love</SectionTitle>
            <View style={styles.collectionBrandRow}>{['boAt', 'JBL', 'SONY'].map((brand, index) => <View key={brand} style={styles.collectionBrand}><Text style={[styles.collectionBrandText, index === 1 && styles.jbl]}>{brand}</Text></View>)}</View>
            <SectionTitle>Products worth buying</SectionTitle>
            <View style={styles.grid}>
              {[...catalog, ...catalog].slice(0, 6).map((item, index) => <ProductCard key={`collection-${item.id}-${index}`} item={item} width={cardWidth} favorite={favorites.has(item.id)} onFavorite={() => toggleFavorite(item.id)} onAdd={() => addToCart(item)} onOpen={() => openProduct(item)} />)}
            </View>
          </>}
        </Animated.ScrollView>
        <Animated.View style={[styles.floatingFooter, collapseBrowseChrome && { opacity: homeFooterOpacity, transform: [{ translateY: homeFooterTranslateY }] }]}>
          <Pressable onPress={() => setScreen('home')} style={[styles.footerTab, (screen === 'home' || screen === 'collection') && styles.footerTabSelected]}>
            <Ionicons name={screen === 'home' ? 'home' : 'home-outline'} size={25} color={screen === 'home' ? palette.blue : palette.muted} />
            <Text style={[styles.footerTabText, screen === 'home' && styles.footerTabActive]}>Home</Text>
          </Pressable>
          <Pressable onPress={() => setScreen('categories')} style={[styles.footerTab, screen === 'categories' && styles.footerTabSelected]}>
            <Ionicons name={screen === 'categories' ? 'grid' : 'grid-outline'} size={25} color={screen === 'categories' ? palette.blue : palette.muted} />
            <Text style={[styles.footerTabText, screen === 'categories' && styles.footerTabActive]}>Categories</Text>
          </Pressable>
          <Pressable onPress={() => selectedProduct && setScreen('checkout')} style={styles.footerTab}>
            <Ionicons name="bag-handle-outline" size={25} color="#555" />
            <Text style={styles.footerTabText}>Orders</Text>
          </Pressable>
          <Pressable style={styles.footerTab}>
            <Ionicons name="heart-outline" size={25} color="#555" />
            <Text style={styles.footerTabText}>Wishlist</Text>
          </Pressable>
          <Pressable style={[styles.footerTab, styles.offersFooterTab]}>
            <View style={styles.offersFooterBadge}><Image source={footerDiscountTag} style={styles.offersFooterImage} resizeMode="contain" /></View>
          </Pressable>
        </Animated.View>
      </View>
      <Modal visible={pincodeModalVisible} transparent animationType="fade" onRequestClose={() => setPincodeModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPincodeModalVisible(false)}>
          <Pressable style={styles.pincodeModal} onPress={() => {}}>
            <Text style={styles.pincodeTitle}>Check delivery availability</Text>
            <Text style={styles.pincodeCopy}>Enter your pincode to see whether delivery is available in your area.</Text>
            <TextInput value={pincode} onChangeText={setPincode} keyboardType="number-pad" maxLength={6} placeholder="Enter 6 digit pincode" placeholderTextColor="#8D8D8D" style={styles.pincodeInput} />
            <Pressable onPress={() => { setDeliveryPincode(pincode); setPincodeModalVisible(false); }} style={styles.pincodeCheck}><Text style={styles.pincodeCheckText}>Check</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      {cartPopupVisible ? <CartPopup item={cartPreview} count={cartCount} onOpen={openCart} containerStyle={collapseBrowseChrome ? { transform: [{ translateY: homeCartTranslateY }] } : undefined} /> : null}
      <HelpFab cartVisible={cartPopupVisible} />
      {collapseBrowseChrome ? <View pointerEvents="none" style={[styles.bottomSafeFill, { height: insets.bottom }]} /> : null}
      {openingAnimationVisible ? <View pointerEvents="none" style={styles.openingAnimationOverlay}>
        <Text style={styles.openingAnimationMessage}>Discover world‑class products, curated for you.</Text>
        {[
          { top: '10%', left: -80, size: 42 }, { top: '23%', left: 20, size: 50 }, { top: '37%', left: -25, size: 39 },
          { top: '58%', left: 55, size: 47 }, { top: '72%', left: -55, size: 44 }, { top: '86%', left: 10, size: 51 },
        ].map((vehicle, index) => <Animated.View key={`opening-flight-${index}`} style={[styles.openingVehicle, { top: vehicle.top as `${number}%`, left: vehicle.left, opacity: openingFlightOpacity, transform: [{ translateX: openingFlightTranslateX }] }]}>
          <Ionicons name="airplane" size={vehicle.size} color={palette.blue} />
        </Animated.View>)}
        {[
          { top: '13%', left: 35, size: 48 }, { top: '28%', left: -65, size: 43 }, { top: '43%', left: 5, size: 52 },
          { top: '61%', left: -20, size: 45 }, { top: '76%', left: 65, size: 50 }, { top: '89%', left: -70, size: 46 },
        ].map((vehicle, index) => <Animated.View key={`opening-truck-${index}`} style={[styles.openingVehicle, { top: vehicle.top as `${number}%`, left: vehicle.left, opacity: openingTruckOpacity, transform: [{ translateX: openingTruckTranslateX }] }]}>
          <MaterialCommunityIcons name="truck-fast-outline" size={vehicle.size} color={palette.red} />
        </Animated.View>)}
      </View> : null}
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular });
  const showDashboard = typeof window !== 'undefined' && window.location && new URLSearchParams(window.location.search).has('dashboard');
  if (!fontsLoaded) return null;
  return <SafeAreaProvider>{showDashboard ? <DashboardPage /> : <Storefront />}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  homeSafeArea: { backgroundColor: '#0A254A' },
  homeHeroSurface: { position: 'relative', overflow: 'hidden', backgroundColor: '#0A254A' },
  app: { flex: 1, alignSelf: 'center', backgroundColor: palette.white },
  openingAnimationOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, overflow: 'hidden', backgroundColor: '#F5F5F5' },
  openingAnimationMessage: { position: 'absolute', left: 24, right: 24, top: '45%', zIndex: 2, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 23, lineHeight: 31, fontWeight: '800', textAlign: 'center' },
  openingVehicle: { position: 'absolute' },
  homeCollapsibleHeader: { overflow: 'hidden', backgroundColor: '#0A254A' },
  deliveryHeader: { minHeight: 82, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0A254A' },
  transportLane: { height: 44, overflow: 'hidden', position: 'relative', backgroundColor: homeChrome },
  orbitLine: { position: 'absolute', left: 0, right: 0, top: 16, height: 4, borderRadius: 2, backgroundColor: '#C9D2DF' },
  redTrack: { backgroundColor: palette.red },
  blueTrack: { backgroundColor: palette.blue },
  transportTrail: { position: 'absolute', left: 0, top: 16, height: 4, borderRadius: 2 },
  flightTrail: { backgroundColor: palette.blue },
  truckTrail: { backgroundColor: palette.red },
  transportFlight: { position: 'absolute', left: 0, top: -1 },
  transportTruck: { position: 'absolute', left: 0, top: -3 },
  deliveryBrandBlock: { zIndex: 1, flex: 1, marginLeft: 0, position: 'relative' },
  deliveryLogo: { width: 245, height: 63, marginTop: -15, marginLeft: -39, alignSelf: 'flex-start' },
  addAddressButton: { position: 'absolute', left: -39, bottom: -17, width: 245, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  addAddressText: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '500' },
  homeHeaderText: { color: palette.white },
  deliveryBrand: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 18, fontWeight: '800' },
  deliveryTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  deliveryTime: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -1 },
  deliveryDistance: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, overflow: 'hidden', backgroundColor: '#DCE7FF', color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  deliveryAddress: { marginTop: 2, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '600' },
  deliveryActions: { zIndex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  wallet: { width: 47, height: 47, borderRadius: 24, backgroundColor: palette.white, justifyContent: 'center', alignItems: 'center' },
  walletText: { marginTop: -2, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '800' },
  modalBackdrop: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.42)' },
  pincodeModal: { borderRadius: 16, padding: 22, backgroundColor: palette.white },
  pincodeTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '800' },
  pincodeCopy: { marginTop: 8, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  pincodeInput: { height: 49, marginTop: 20, borderWidth: 1, borderColor: palette.border, borderRadius: 8, paddingHorizontal: 14, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '600' },
  pincodeCheck: { height: 48, marginTop: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.blue },
  pincodeCheckText: { color: palette.white, fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '800' },
  header: { height: 63, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
  brand: { fontFamily: 'Inter_400Regular', fontSize: 17, fontWeight: '600', color: palette.blue },
  addressLine: { marginTop: 1 },
  addressTitle: { fontFamily: 'Inter_400Regular', fontSize: 7, lineHeight: 9, fontWeight: '700', color: palette.ink },
  addressSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 6, lineHeight: 8, color: palette.ink },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  badge: { position: 'absolute', right: -7, top: -7, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: palette.white, fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '700' },
  content: { paddingHorizontal: 0, paddingBottom: 72 },
  browseContent: { paddingBottom: 10 },
  carouselHeaderZone: { marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: homeChrome },
  carouselFade: { marginTop: 18, marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: 'transparent' },
  carouselLoading: { height: 238, marginHorizontal: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A254A' },
  carouselLoadingText: { color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '600' },
  cartonLoader: { width: 66, height: 58, alignItems: 'center', justifyContent: 'flex-end' },
  zigzagPartition: { height: 14, marginHorizontal: 0, flexDirection: 'row', overflow: 'hidden', backgroundColor: homeChrome },
  bottomSafeFill: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 25, backgroundColor: homeChrome },
  zigzagTooth: { width: 16, height: 16, marginHorizontal: 1, marginTop: 6, backgroundColor: palette.white, transform: [{ rotate: '45deg' }] },
  staticSearchZone: { paddingTop: 0, paddingBottom: 8, backgroundColor: homeChrome },
  searchBox: { height: 50, marginHorizontal: 16, borderWidth: 1, borderColor: '#AEB7C3', borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: palette.white },
  searchInput: { flex: 1, padding: 0, fontFamily: 'Inter_400Regular', fontSize: 12, color: palette.ink },
  blinkTabs: { gap: 3, paddingTop: 12, paddingHorizontal: 10, alignItems: 'flex-start', backgroundColor: 'transparent' },
  blinkTab: { width: 78, height: 72, borderBottomWidth: 2, borderBottomColor: '#000000', borderRadius: 10, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 7, backgroundColor: 'transparent' },
  blinkTabGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 9 },
  blinkTabPartition: { borderRightWidth: 2, borderRightColor: '#000000' },
  blinkTabActive: { backgroundColor: palette.blue },
  blinkTabIndicator: { position: 'absolute', left: 10, right: 10, bottom: 0, height: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: palette.white },
  blinkTabText: { marginTop: 6, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 14, fontWeight: '500', textAlign: 'center' },
  blinkTabTextActive: { color: palette.white, fontWeight: '800' },
  promoCards: { gap: 12, paddingVertical: 8 },
  promoCard: { height: 270, borderWidth: 1, borderColor: '#FFFFFF', borderRadius: 21, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 7, elevation: 4 },
  promoImageFrame: { ...StyleSheet.absoluteFillObject, borderRadius: 19, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  promoImage: { width: '100%', height: '100%', transform: [{ scale: 1.28 }] },
  promoCopy: { position: 'absolute', left: 13, right: 10, bottom: 15 },
  promoTitle: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 17, lineHeight: 20, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.58)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  promoSubtitle: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 14, marginTop: 4, width: 140, textShadowColor: 'rgba(0,0,0,0.58)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  blinkDivider: { marginTop: 15, marginHorizontal: 0, paddingVertical: 12, alignItems: 'center', backgroundColor: '#EEF3FF' },
  blinkDividerText: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 12, letterSpacing: 2, fontWeight: '800' },
  exploreRow: { gap: 10, paddingBottom: 10 },
  trendingProductRow: { gap: 12, paddingHorizontal: 2, paddingBottom: 5 },
  homeProductSections: { paddingHorizontal: 12 },
  shopCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, rowGap: 14 },
  shopCategoryItem: { width: '25%', paddingHorizontal: 5, alignItems: 'center' },
  shopCategoryImageBlock: { width: '100%', aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 5, elevation: 3 },
  shopCategoryImageClip: { width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  shopCategoryImage: { width: '100%', height: '100%', borderRadius: 12, transform: [{ scale: 1.24 }] },
  shopCategoryLabel: { minHeight: 30, marginTop: 7, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center' },
  exploreCard: { width: 130, height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border },
  trendingCard: { flex: 1, width: undefined },
  exploreImage: { width: '84%', alignSelf: 'center', height: 112, marginTop: 10, backgroundColor: palette.white },
  exploreHeart: { position: 'absolute', top: 10, right: 10 },
  exploreName: { marginTop: 13, paddingHorizontal: 10, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  shopifyStatus: { minHeight: 42, marginTop: 12, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  shopifyConnected: { backgroundColor: '#E9F7EE' },
  shopifyError: { backgroundColor: '#FCEDED' },
  shopifyStatusText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, color: palette.ink },
  categoryRow: { gap: 9, paddingTop: 16, paddingBottom: 14 },
  category: { width: 48, alignItems: 'center' },
  categoryImage: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#B7CAD8' },
  categoryActive: { borderWidth: 2, borderColor: palette.blue },
  categoryLabel: { fontFamily: 'Inter_400Regular', fontSize: 8, lineHeight: 11, fontWeight: '600', marginTop: 4, color: palette.ink, textAlign: 'center' },
  categoryLabelActive: { color: palette.blue },
  banner: { height: 116, borderRadius: 9, marginRight: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)' },
  dots: { height: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#B33C52' },
  dotActive: { width: 4, backgroundColor: palette.blue },
  sectionTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 19, fontWeight: '800', marginTop: 22, marginBottom: 12 },
  productCard: { marginBottom: 15 },
  collectionProductCard: { marginBottom: 0 },
  collectionProductVisual: { width: '100%', aspectRatio: 0.92, borderWidth: 1, borderColor: '#E7E7E7', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  collectionProductImage: { width: '94%', height: '94%' },
  collectionUnavailable: { opacity: 0.45 },
  collectionDiscountBadge: { position: 'absolute', top: 0, left: 0, minWidth: 38, height: 22, paddingHorizontal: 6, borderTopLeftRadius: 9, borderBottomRightRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D83434' },
  collectionDiscountText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '900' },
  collectionComingSoon: { position: 'absolute', top: 0, left: 0, height: 24, paddingHorizontal: 8, borderTopLeftRadius: 9, borderBottomRightRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B98725' },
  collectionComingSoonText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '900' },
  collectionHeart: { position: 'absolute', top: 7, right: 7 },
  collectionImageAction: { position: 'absolute', right: 0, bottom: -19, minWidth: 62, height: 38, paddingHorizontal: 10, borderWidth: 1.5, borderColor: palette.blue, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  collectionImageActionText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  collectionNotifyAction: { borderColor: '#2E8B36', backgroundColor: '#FFFFFF' },
  collectionNotifyText: { color: '#2E8B36' },
  collectionProductName: { minHeight: 34, marginTop: 25, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  collectionPriceRow: { height: 46, marginTop: 3, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', alignItems: 'baseline', columnGap: 4, rowGap: 2, overflow: 'hidden' },
  collectionPrice: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '900' },
  collectionSalePrice: { color: '#D83434' },
  collectionOldPrice: { flexShrink: 1, color: '#666666', fontFamily: 'Inter_400Regular', fontSize: 10, textDecorationLine: 'line-through' },
  productRow: { gap: 5 },
  productVisual: { height: 109, borderRadius: 6, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, justifyContent: 'center', alignItems: 'center' },
  productImage: { width: '80%', height: '88%' },
  heart: { position: 'absolute', right: 6, top: 5 },
  productName: { marginTop: 7, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 14, fontWeight: '800', color: palette.ink },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  price: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 17, fontWeight: '800' },
  oldPrice: { fontFamily: 'Inter_400Regular', fontSize: 10, color: 'rgba(0,0,0,0.45)', textDecorationLine: 'line-through' },
  discount: { fontFamily: 'Inter_400Regular', fontSize: 10, color: palette.green },
  cartButton: { width: '88%', alignSelf: 'center', height: 30, borderRadius: 15, borderWidth: 1, borderColor: palette.blue, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  cartButtonText: { color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '800' },
  pressed: { opacity: 0.6 },
  logoStrip: { flexDirection: 'row', gap: 8, marginVertical: 2, overflow: 'hidden' },
  logoTile: { width: 84, height: 43, borderRadius: 5, backgroundColor: '#E1E7ED', alignItems: 'center', justifyContent: 'center' },
  logoTilePink: { backgroundColor: '#EFDCDD' },
  logoText: { fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '900', color: '#303236' },
  reviewCard: { width: 188, height: 84, marginRight: 10, borderRadius: 4, padding: 8, flexDirection: 'row', backgroundColor: '#E8DEE4' },
  reviewCopy: { flex: 1 },
  reviewQuote: { width: 110, fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 12, color: palette.ink },
  stars: { color: '#2B547B', fontFamily: 'Inter_400Regular', fontSize: 10, letterSpacing: 1, marginTop: 3 },
  reviewer: { fontFamily: 'Inter_400Regular', fontSize: 8, fontWeight: '800', marginTop: 2 },
  reviewImage: { width: 56, height: 65, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' },
  collectionHeading: { marginTop: 24, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  collectionTitle: { fontFamily: 'Inter_400Regular', fontSize: 22, fontWeight: '800', color: palette.ink },
  collectionCount: { fontFamily: 'Inter_400Regular', fontSize: 13, color: palette.muted },
  collectionHeader: { height: 47, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#294565', backgroundColor: '#0A254A' },
  collectionHeaderTitle: { marginLeft: 12, fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '800', color: palette.white },
  collectionHeaderActions: { marginLeft: 'auto', flexDirection: 'row', gap: 18, alignItems: 'center' },
  audioHubHeading: { marginTop: 15 },
  audioHubTitle: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 20, fontWeight: '800', color: palette.heading },
  audioHubLink: { marginTop: 1, color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 8, fontWeight: '700' },
  collectionCategoryRow: { paddingTop: 13, paddingBottom: 11, gap: 9 },
  collectionCategory: { width: 49, alignItems: 'center' },
  collectionCategoryImage: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#E7EDF1' },
  collectionCategoryLabel: { marginTop: 4, fontFamily: 'Inter_400Regular', fontSize: 7, lineHeight: 9, fontWeight: '700', textAlign: 'center', color: palette.ink },
  collectionBanner: { width: '100%', height: 97, borderRadius: 6 },
  collectionDots: { height: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 2 },
  collectionDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#C94D5A' },
  collectionDotActive: { width: 5, height: 3, borderRadius: 2, backgroundColor: palette.blue },
  collectionBrandRow: { flexDirection: 'row', gap: 9, marginBottom: 11 },
  collectionBrand: { flex: 1, height: 37, borderRadius: 5, borderWidth: 1, borderColor: '#D7D7D7', alignItems: 'center', justifyContent: 'center' },
  collectionBrandText: { fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '500', color: '#111' },
  jbl: { color: '#E52C22', fontWeight: '900' },
  floatingFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, height: 70, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: homeChrome, borderTopWidth: 1, borderColor: '#D5DBE3' },
  cartPopupLayer: { ...StyleSheet.absoluteFillObject, zIndex: 50, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 82 },
  collectionCartPopupLayer: {},
  cartPopup: { width: 174, height: 58, paddingHorizontal: 8, borderRadius: 13, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.blue, shadowColor: '#000000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 7 },
  cartPopupImage: { width: 38, height: 38, borderRadius: 5, backgroundColor: '#FFFFFF' },
  cartPopupCopy: { flex: 1, marginLeft: 8 },
  cartPopupTitle: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '900' },
  cartPopupCount: { marginTop: 1, color: 'rgba(255,255,255,0.88)', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '700' },
  helpLayer: { position: 'absolute', right: 14, zIndex: 70, alignItems: 'flex-end' },
  helpActions: { gap: 8, marginBottom: 9, alignItems: 'center' },
  helpMain: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#57BE65', shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  helpAction: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#57BE65', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 4, elevation: 3 },
  helpModalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  helpSheet: { padding: 18, paddingBottom: 28, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#FFFFFF' },
  helpSheetHeader: { marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  helpSheetTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 18, fontWeight: '900' },
  helpInput: { height: 48, marginBottom: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: '#D5DBE3', borderRadius: 9, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14 },
  helpEnquiry: { height: 106, paddingTop: 12 },
  helpSubmit: { height: 48, marginTop: 2, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2E8B36' },
  helpSubmitText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '900' },
  cartPage: { flex: 1, backgroundColor: '#F5F5F5' },
  cartPageHeader: { height: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#0A254A', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#294565' },
  cartBackButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  cartPageTitle: { color: palette.white, fontFamily: 'Inter_400Regular', fontSize: 21, fontWeight: '900' },
  cartList: { padding: 12, gap: 12, paddingBottom: 112 },
  cartListItem: { minHeight: 116, padding: 9, borderRadius: 12, flexDirection: 'row', position: 'relative', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 2 },
  cartListImage: { width: 76, height: 98, borderRadius: 8, backgroundColor: '#FFFFFF' },
  cartListCopy: { flex: 1, marginLeft: 10, paddingVertical: 2 },
  cartListName: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  cartListPrice: { marginTop: 1, color: '#D83434', fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  cartListActions: { width: 82, alignItems: 'flex-end', paddingVertical: 2 },
  cartQuantityControl: { width: 74, height: 32, borderRadius: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2E8B36' },
  cartQuantityButton: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 18, lineHeight: 21, fontWeight: '600' },
  cartQuantityValue: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  cartLineTotal: { position: 'absolute', right: 9, bottom: 9, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 18, lineHeight: 22, fontWeight: '900' },
  cartSuggestions: { marginTop: 8 },
  cartSuggestionsTitle: { marginBottom: 10, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '900' },
  cartSuggestionRow: { gap: 10, paddingRight: 4 },
  cartSuggestionCard: { width: 118, padding: 8, borderRadius: 10, backgroundColor: '#FFFFFF' },
  cartSuggestionImage: { width: '100%', height: 88, borderRadius: 7, backgroundColor: '#FFFFFF' },
  cartSuggestionName: { marginTop: 7, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  cartSuggestionPrice: { marginTop: 3, color: '#D83434', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  cartSuggestionAdd: { height: 30, marginTop: 7, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  cartSuggestionAddText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyCartTitle: { marginTop: 14, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '900' },
  emptyCartCopy: { marginTop: 6, color: '#697386', fontFamily: 'Inter_400Regular', fontSize: 13 },
  cartCheckoutBar: { height: 70, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D5DBE3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: homeChrome },
  cartTotalBlock: { flex: 1 },
  cartItemCount: { color: '#697386', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '700' },
  cartTotalText: { marginTop: 2, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 17, fontWeight: '900' },
  cartCheckoutButton: { height: 46, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  cartCheckoutText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '900' },
  footerTab: { flex: 1, alignSelf: 'stretch', borderTopWidth: 3, borderTopColor: 'transparent', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#F8F9FB' },
  footerTabSelected: { borderTopColor: palette.blue, backgroundColor: '#FFFFFF' },
  footerTabText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#555', fontWeight: '500' },
  footerTabActive: { color: palette.blue, fontWeight: '700' },
  offersFooterTab: { paddingHorizontal: 3 },
  offersFooterBadge: { alignSelf: 'stretch', height: 60, alignItems: 'center', justifyContent: 'center' },
  offersFooterImage: { width: 52, height: 52, shadowColor: '#9D1E1E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.24, shadowRadius: 4, elevation: 4 },
  detailPage: { flex: 1, alignSelf: 'center', backgroundColor: '#F4F5FA' },
  detailContent: { paddingBottom: 0 },
  detailHeroSection: { height: 310, backgroundColor: '#FFFFFF' },
  detailGallery: { width: '100%', backgroundColor: '#FFFFFF' },
  detailHero: { width: '100%', height: '100%' },
  detailOverlayHeader: { position: 'absolute', top: 10, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailOverlayActions: { flexDirection: 'row', gap: 7 },
  detailCircleButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  detailDots: { position: 'absolute', left: 0, right: 0, bottom: 10, height: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  detailDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(43,84,123,0.48)' },
  detailDotActive: { backgroundColor: '#CC3438' },
  detailThumbnailScroller: { width: '100%', flexGrow: 0, backgroundColor: '#FFFFFF' },
  detailThumbnails: { minWidth: '100%', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  detailThumbnail: { width: 54, height: 54, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 9, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  detailThumbnailActive: { borderWidth: 2, borderColor: palette.blue },
  swatchImage: { width: '100%', height: '100%' },
  detailInfoCard: { marginHorizontal: 12, marginTop: 8, padding: 13, borderRadius: 14, backgroundColor: '#FFFFFF' },
  detailTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 20, lineHeight: 26, fontWeight: '900' },
  detailPriceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 7, marginTop: 7 },
  detailPrice: { color: '#D83434', fontFamily: 'Inter_400Regular', fontSize: 25, fontWeight: '900' },
  detailOldPrice: { color: '#1A1C1D', fontFamily: 'Inter_400Regular', fontSize: 15, textDecorationLine: 'line-through' },
  detailDiscount: { marginLeft: -4, color: '#D83434', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900', transform: [{ translateY: -7 }] },
  inclusive: { color: '#536071', fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 5 },
  detailBrandLine: { marginTop: 10, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 21 },
  detailBrandValue: { fontWeight: '900' },
  detailStockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#2E8B36' },
  stockDotUnavailable: { backgroundColor: '#B98725' },
  stockText: { color: '#2E8B36', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '800' },
  stockTextUnavailable: { color: '#B98725' },
  quantityRow: { marginTop: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quantityLabel: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '800' },
  quantityControl: { width: 116, height: 40, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  quantityButton: { paddingHorizontal: 10, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 22 },
  quantityValue: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '800' },
  deliveryEstimate: { marginTop: 18, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 15 },
  deliveryEstimateValue: { fontWeight: '900' },
  codBox: { height: 48, marginTop: 12, borderWidth: 1.5, borderColor: '#2E8B36', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  codText: { color: '#22812E', fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '900' },
  paymentTrustBox: { height: 48, marginTop: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: '#DDE1E7', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' },
  paymentLogoSlot: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  paymentLogoImage: { width: 72, height: 44 },
  buyNowButton: { height: 48, marginTop: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2D2E' },
  buyNowButtonText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '900' },
  accordion: { minHeight: 62, marginHorizontal: 12, marginTop: 10, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 18, backgroundColor: '#FFFFFF' },
  accordionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionTitle: { fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '800' },
  accordionCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#4D5562', marginTop: 12, lineHeight: 20 },
  specTable: { marginTop: 14, borderWidth: 1, borderColor: '#DDE1E7', borderRadius: 8, overflow: 'hidden' },
  specRow: { minHeight: 48, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#DDE1E7' },
  specRowLast: { borderBottomWidth: 0 },
  specHeadingCell: { width: '42%', padding: 10, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#DDE1E7', backgroundColor: '#F6F7F9' },
  specDetailCell: { flex: 1, padding: 10, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  specHeadingText: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, fontWeight: '800' },
  specDetailText: { color: '#4D5562', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  similarTitle: { marginHorizontal: 14, marginTop: 24, fontFamily: 'Inter_400Regular', fontSize: 20, fontWeight: '900' },
  similarSubtitle: { marginHorizontal: 14, marginTop: 4, color: '#667085', fontFamily: 'Inter_400Regular', fontSize: 12 },
  detailRecommendations: { gap: 12, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 0 },
  buyBar: { height: 70, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: homeChrome, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D5DBE3' },
  buyBarPrice: { marginTop: 2, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '900' },
  buyBarTax: { marginTop: 2, color: '#667085', fontFamily: 'Inter_400Regular', fontSize: 10 },
  addLarge: { width: '56%', height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  notifyLarge: { backgroundColor: '#2E8B36' },
  addLargeText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '900' },
  shareBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  shareSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28, backgroundColor: '#FFFFFF' },
  shareSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareSheetTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '900' },
  shareActions: { marginTop: 22, flexDirection: 'row', justifyContent: 'space-between' },
  shareAction: { width: '22%', alignItems: 'center' },
  shareIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  whatsappIcon: { backgroundColor: '#25D366' },
  mailIcon: { backgroundColor: '#3F72E5' },
  instagramIcon: { backgroundColor: '#D9467A' },
  facebookIcon: { backgroundColor: '#1877F2' },
  shareActionText: { marginTop: 7, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  copyLinkButton: { height: 48, marginTop: 24, borderWidth: 1.5, borderColor: palette.blue, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  copyLinkText: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '900' },
});
