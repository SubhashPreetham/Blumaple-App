import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
  Keyboard,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Inter_400Regular, useFonts } from '@expo-google-fonts/inter';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchShopifyCollectionPreviews, fetchShopifyCollectionProductCount, fetchShopifyCollectionProducts, fetchShopifyMainMenu, fetchShopifyProducts, searchShopifyProducts, ShopifyCollectionPreview, ShopifyMenuItem, ShopifyProduct } from './src/shopify';
import { CheckoutPage } from './pages/CheckoutPage';
import { AddressPage } from './pages/AddressPage';
import { OrderResultPage } from './pages/OrderResultPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryCollectionPage } from './pages/CategoryCollectionPage';
import { DashboardPage } from './pages/DashboardPage';
import { SkippableLoginPage } from './pages/SkippableLoginPage';
import { RequiredLoginPage } from './pages/RequiredLoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { ShippingAddress } from './pages/types';
import { useShopifyCustomerAuth } from './src/shopifyCustomerAuth';

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

const SEARCH_PLACEHOLDERS = ['Watches', 'Cameras', 'Headphones', 'Radios', 'Mobile Cases', 'Tumblers', 'Computer Peripharels', 'System Components'];

const BOTTOM_NAV_HEIGHT = 70;
const FLOATING_CART_GAP = 12;
const FLOATING_CART_HEIGHT = 58;
const FLOATING_CONTROL_GAP = 12;
const WISHLIST_ACTIVE_COLOR = '#B85C5C';
const homeChrome = '#D3DDEA';
const footerDiscountTag = require('./assets/ui/offers.png');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  searchKeywords?: string;
};

type CartItem = { product: Product; quantity: number };
type HistoryOrder = { id: string; date: string; products: Product[]; amount: string; status: 'Delivered' | 'Shipped' | 'Processing' | 'Cancelled' | 'Returned'; deliveredAt?: string; shippingAddress: string };
type OrderOutcome = { success: boolean; orderId?: string; items: CartItem[]; paymentMethod: 'online' | 'cod'; total: number; tax: number; codFee: number };
type ReturnScreen = 'home' | 'categories' | 'categoryCollection' | 'wishlist' | 'offers' | 'orders' | 'search' | 'product' | 'cart';

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
    searchKeywords: [...product.tags, product.description, product.techSpec?.value ?? '', product.variants.nodes[0]?.sku ?? '', ...product.collections.nodes.flatMap(collection => [collection.title, collection.handle])].join(' '),
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

function useNotifyConfirmation() {
  const [notified, setNotified] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const notify = () => {
    if (timer.current) clearTimeout(timer.current);
    if (notified) {
      setNotified(false);
      setShowMessage(false);
      timer.current = null;
      return;
    }
    setNotified(true);
    setShowMessage(true);
    timer.current = setTimeout(() => {
      setShowMessage(false);
      timer.current = null;
    }, 1000);
  };

  return { notified, showMessage, notify };
}

function NotifyConfirmation({ notified, showMessage, color = '#2E8B36' }: { notified: boolean; showMessage: boolean; color?: string }) {
  return <>
    {notified ? <View style={styles.notifyIconWrap}><Ionicons name="notifications" size={18} color={color} /><View style={styles.notifyTick}><Ionicons name="checkmark" size={10} color="#FFFFFF" /></View></View> : <Text style={[styles.collectionImageActionText, { color }]}>NOTIFY</Text>}
    {showMessage ? <View pointerEvents="none" style={styles.notifyToast}><Text style={styles.notifyToastText}>We&apos;ll notify you</Text></View> : null}
  </>;
}

function ProductCard({ item, width, favorite, onFavorite, onAdd, onOpen, showFavorite = true, collectionLayout = false }: { item: Product; width: number; favorite: boolean; onFavorite: () => void; onAdd: () => void; onOpen?: () => void; showFavorite?: boolean; collectionLayout?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const notifyConfirmation = useNotifyConfirmation();
  useEffect(() => setImageFailed(false), [item.image]);
  if (collectionLayout) {
    const availableForSale = item.availableForSale ?? true;
    const discountLabel = item.discount ? `-${item.discount.replace(/\s*off/i, '')}` : '';
    return <View style={[styles.collectionProductCard, { width }]}>
      <Pressable onPress={onOpen} style={styles.collectionProductVisual}>
        {imageFailed ? <Ionicons name="image-outline" size={34} color="#A7B0BC" /> : <Image source={item.image} style={[styles.collectionProductImage, !availableForSale && styles.collectionUnavailable]} resizeMode="contain" onError={() => setImageFailed(true)} />}
        {!availableForSale ? <View style={styles.collectionComingSoon}><Text style={styles.collectionComingSoonText}>Coming soon</Text></View> : discountLabel ? <View style={styles.collectionDiscountBadge}><Text style={styles.collectionDiscountText}>{discountLabel}</Text></View> : null}
        {showFavorite ? <Pressable hitSlop={10} onPress={onFavorite} style={styles.collectionHeart}><Ionicons name={favorite ? 'heart' : 'heart-outline'} size={21} color={favorite ? WISHLIST_ACTIVE_COLOR : palette.blue} /></Pressable> : null}
        <Pressable onPress={availableForSale ? onAdd : notifyConfirmation.notify} style={[styles.collectionImageAction, !availableForSale && styles.collectionNotifyAction]}>{availableForSale ? <Text style={styles.collectionImageActionText}>ADD</Text> : <NotifyConfirmation notified={notifyConfirmation.notified} showMessage={notifyConfirmation.showMessage} />}</Pressable>
      </Pressable>
      <Text numberOfLines={2} style={[styles.collectionProductName, !availableForSale && styles.collectionUnavailable]}>{item.name}</Text>
      <View style={[styles.collectionPriceRow, !availableForSale && styles.collectionUnavailable]}><Text style={[styles.collectionPrice, item.oldPrice && styles.collectionSalePrice]}>{item.price}</Text>{item.oldPrice ? <Text numberOfLines={1} style={styles.collectionOldPrice}>{item.oldPrice}</Text> : null}</View>
    </View>;
  }
  return (
    <View style={[styles.productCard, { width }]}>
      <Pressable onPress={onOpen} style={styles.productVisual}>
        {imageFailed ? <Ionicons name="image-outline" size={30} color="#A7B0BC" /> : <Image source={item.image} style={styles.productImage} resizeMode="contain" onError={() => setImageFailed(true)} />}
        {showFavorite ? <Pressable accessibilityRole="button" accessibilityLabel={`Favorite ${item.name}`} hitSlop={10} onPress={onFavorite} style={styles.heart}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={25} color={favorite ? WISHLIST_ACTIVE_COLOR : palette.blue} />
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

function RotatingSearchIcon({ size = 24 }: { size?: number }) {
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.timing(orbit, {
      toValue: 1,
      duration: 1100,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [orbit]);

  const translateX = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [-9, 0, 9, 0, -9] });
  const translateY = orbit.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -6, 0, 6, 0] });
  return <Animated.View style={{ transform: [{ translateX }, { translateY }] }}><Ionicons name="search-outline" size={size} color={palette.blue} /></Animated.View>;
}

function CartonBoxLoader({ size = 46 }: { size?: number }) {
  const flapProgress = useRef(new Animated.Value(0)).current;
  const closedOpacity = flapProgress.interpolate({ inputRange: [0, 0.42, 0.58, 1], outputRange: [1, 1, 0, 0] });
  const openOpacity = flapProgress.interpolate({ inputRange: [0, 0.42, 0.58, 1], outputRange: [0, 0, 1, 1] });
  const lidLift = flapProgress.interpolate({ inputRange: [0, 1], outputRange: [2, -4] });
  const scale = flapProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] });

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(flapProgress, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.delay(260),
      Animated.timing(flapProgress, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.delay(220),
    ]));
    animation.start();
    return () => animation.stop();
  }, [flapProgress]);

  return <View style={[styles.cartonLoader, { width: size + 20, height: size + 12 }]} accessibilityLabel="Loading collections">
    <Animated.View style={[styles.openingCarton, { width: size, height: size }]}>
      <Animated.View style={[styles.openingCartonIcon, { opacity: closedOpacity, transform: [{ scale }] }]}><MaterialCommunityIcons name="package-variant-closed" size={size} color="#B97435" /></Animated.View>
      <Animated.View style={[styles.openingCartonIcon, { opacity: openOpacity, transform: [{ translateY: lidLift }, { scale }] }]}><MaterialCommunityIcons name="package-variant" size={size} color="#B97435" /></Animated.View>
    </Animated.View>
  </View>;
}

function CollectionArtwork({ source }: { source?: ImageSourcePropType }) {
  const [loaded, setLoaded] = useState(false);
  const sourceKey = typeof source === 'object' && source && 'uri' in source ? source.uri : source;
  useEffect(() => {
    let active = true;
    setLoaded(false);
    if (typeof sourceKey === 'string') Image.prefetch(sourceKey).then(() => { if (active) setLoaded(true); }).catch(() => undefined);
    return () => { active = false; };
  }, [sourceKey]);

  if (!source) return <CartonBoxLoader size={28} />;
  return <View style={styles.collectionArtwork}>
    {!loaded ? <CartonBoxLoader size={28} /> : null}
    <Image source={source} style={[styles.shopCategoryImage, !loaded && styles.collectionArtworkHidden]} resizeMode="contain" onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />
  </View>;
}

function ProductDetail({ width, cartCount, product, recommendations, favoriteIds, onBack, onAdd, onCheckout, onOpenProduct, onFavorite }: { width: number; cartCount: number; product: Product; recommendations: Product[]; favoriteIds: Set<string>; onBack: () => void; onAdd: (product: Product) => void; onCheckout: () => void; onOpenProduct: (product: Product) => void; onFavorite: (product: Product) => void }) {
  const notifyConfirmation = useNotifyConfirmation();
  const [colorIndex, setColorIndex] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [shareVisible, setShareVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState<Array<{ id: string; name: string; rating: number; text: string }>>([
    { id: 'verified-1', name: 'Verified customer', rating: 5, text: 'Excellent quality and secure packaging. The product matched the description.' },
    { id: 'verified-2', name: 'Blumaple customer', rating: 4, text: 'Good product and helpful delivery updates throughout the order.' },
  ]);
  const detailGalleryRef = useRef<ScrollView>(null);
  const choices = product.images?.length ? product.images.map((image, index) => ({ name: index === 0 ? 'Default' : `View ${index + 1}`, image })) : [{ name: 'Default', image: product.image }];
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
  const reviewAverage = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const submitReview = () => {
    if (!reviewRating) { Alert.alert('Choose a rating', 'Please select between one and five stars.'); return; }
    if (!reviewText.trim()) { Alert.alert('Write a review', 'Please share your experience before submitting.'); return; }
    setReviews(current => [{ id: `review-${Date.now()}`, name: 'You', rating: reviewRating, text: reviewText.trim() }, ...current]);
    setReviewRating(0);
    setReviewText('');
  };

  return <View style={[styles.detailPage, { width }]}>
    <ScrollView showsVerticalScrollIndicator={false} bounces alwaysBounceVertical decelerationRate="normal" scrollEventThrottle={16} overScrollMode="auto" contentContainerStyle={styles.detailContent}>
      <View style={styles.detailHeroSection}>
        <ScrollView ref={detailGalleryRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces alwaysBounceHorizontal directionalLockEnabled decelerationRate="normal" scrollEventThrottle={16} style={styles.detailGallery} onMomentumScrollEnd={event => setColorIndex(Math.round(event.nativeEvent.contentOffset.x / width))}>
          {choices.map((option, index) => <Image key={`hero-${option.name}-${index}`} source={option.image} style={[styles.detailHero, { width }]} resizeMode="contain" />)}
        </ScrollView>
        <View style={styles.detailOverlayHeader}>
          <Pressable onPress={onBack} style={styles.detailCircleButton}><Ionicons name="arrow-back" size={22} color={palette.ink} /></Pressable>
          <View style={styles.detailOverlayActions}><Pressable onPress={() => onFavorite(product)} style={styles.detailCircleButton}><Ionicons name={favoriteIds.has(product.id) ? 'heart' : 'heart-outline'} size={22} color={favoriteIds.has(product.id) ? WISHLIST_ACTIVE_COLOR : palette.ink} /></Pressable><Pressable onPress={() => setShareVisible(true)} style={styles.detailCircleButton}><Ionicons name="share-social-outline" size={21} color={palette.ink} /></Pressable></View>
        </View>
        <View style={styles.detailDots}>{choices.map((_, i) => <View key={i} style={[styles.detailDot, i === colorIndex && styles.detailDotActive]} />)}</View>
      </View>
      {choices.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces alwaysBounceHorizontal directionalLockEnabled decelerationRate="normal" scrollEventThrottle={16} style={styles.detailThumbnailScroller} contentContainerStyle={styles.detailThumbnails}>{choices.map((option, index) => <Pressable key={`${option.name}-${index}`} onPress={() => { setColorIndex(index); detailGalleryRef.current?.scrollTo({ x: index * width, animated: true }); }} style={[styles.detailThumbnail, index === colorIndex && styles.detailThumbnailActive]}><Image source={option.image} style={styles.swatchImage} resizeMode="contain" /></Pressable>)}</ScrollView> : null}
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
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeadingRow}><View><Text style={styles.reviewHeading}>Ratings &amp; Reviews</Text><Text style={styles.reviewSummary}>{reviewAverage.toFixed(1)} ★ · {reviews.length} reviews</Text></View><Ionicons name="chatbox-ellipses-outline" size={25} color={palette.blue} /></View>
        <Text style={styles.reviewPrompt}>Rate this product</Text>
        <View style={styles.reviewStars}>{[1, 2, 3, 4, 5].map(star => <Pressable key={star} onPress={() => setReviewRating(star)} hitSlop={5}><Ionicons name={star <= reviewRating ? 'star' : 'star-outline'} size={28} color="#F2A900" /></Pressable>)}</View>
        <TextInput value={reviewText} onChangeText={setReviewText} multiline textAlignVertical="top" placeholder="Write your review" placeholderTextColor="#8B929D" style={styles.reviewInput} />
        <Pressable onPress={submitReview} style={styles.reviewSubmit}><Text style={styles.reviewSubmitText}>Submit review</Text></Pressable>
        <Text style={styles.reviewListHeading}>Customer reviews</Text>
        {reviews.map(review => <View key={review.id} style={styles.productReviewCard}><View style={styles.reviewCardHeader}><Text style={styles.reviewName}>{review.name}</Text><Text style={styles.reviewCardRating}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text></View><Text style={styles.reviewBody}>{review.text}</Text></View>)}
      </View>
      <Text style={styles.similarTitle}>You may also like</Text>
      <Text style={styles.similarSubtitle}>Combine your style with these products</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces alwaysBounceHorizontal directionalLockEnabled decelerationRate="normal" scrollEventThrottle={16} contentContainerStyle={styles.detailRecommendations}>{recommendations.filter(item => item.id !== product.id).slice(0, 12).map(item => <ProductCard key={`similar-${item.id}`} item={item} width={150} favorite={favoriteIds.has(item.id)} collectionLayout onFavorite={() => onFavorite(item)} onAdd={() => onAdd(item)} onOpen={() => onOpenProduct(item)} />)}</ScrollView>
    </ScrollView>
    <View style={styles.buyBar}><View><Text style={styles.buyBarPrice}>{floatingTotal}</Text><Text style={styles.buyBarTax}>Inclusive of all taxes</Text></View><Pressable onPress={availableForSale ? () => onAdd(product) : notifyConfirmation.notify} style={[styles.addLarge, !availableForSale && styles.notifyLarge]}>{availableForSale ? <Text style={styles.addLargeText}>Add to cart</Text> : <NotifyConfirmation notified={notifyConfirmation.notified} showMessage={notifyConfirmation.showMessage} color="#FFFFFF" />}</Pressable></View>
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

function WishlistCard({ item, width, onOpen, onRemove, onAdd }: { item: Product; width: number; onOpen: () => void; onRemove?: () => void; onAdd: () => void }) {
  const available = item.availableForSale !== false;
  const notifyConfirmation = useNotifyConfirmation();
  return <View style={[styles.wishlistCard, { width }]}> 
    <Pressable onPress={onOpen} style={styles.wishlistProductLink}>
      <View style={styles.wishlistImageFrame}><Image source={item.image} style={styles.wishlistImage} resizeMode="contain" />{item.discount ? <View style={styles.wishlistDiscountBadge}><Text style={styles.wishlistDiscountBadgeText}>{item.discount}</Text></View> : null}</View>
      <Text numberOfLines={2} style={styles.wishlistTitle}>{item.name}</Text>
      <View style={styles.wishlistPriceRow}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.wishlistPrice}>{item.price}</Text>
        {item.oldPrice ? <Text numberOfLines={1} style={styles.wishlistOldPrice}>{item.oldPrice}</Text> : null}
      </View>
    </Pressable>
    <Pressable onPress={available ? onAdd : notifyConfirmation.notify} style={[styles.wishlistAddButton, !available && styles.wishlistNotifyButton]}>{available ? <><Ionicons name="cart-outline" size={17} color="#FFFFFF" /><Text style={styles.wishlistAddText}>Add to cart</Text></> : <NotifyConfirmation notified={notifyConfirmation.notified} showMessage={notifyConfirmation.showMessage} color="#FFFFFF" />}</Pressable>
    {onRemove ? <Pressable onPress={onRemove} style={styles.wishlistRemoveButton}><Ionicons name="trash-outline" size={16} color={palette.red} /><Text style={styles.wishlistRemoveText}>Remove</Text></Pressable> : null}
  </View>;
}

function HelpFab({ product, cartBottom = 0 }: { product?: Product | null; cartBottom?: number }) {
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
  const bottom = cartBottom + FLOATING_CART_HEIGHT + FLOATING_CONTROL_GAP;

  return <View pointerEvents="box-none" style={[styles.helpLayer, { bottom }]}>
    {expanded ? <View style={styles.helpActions}>
      <Pressable onPress={() => setContactVisible(true)} style={styles.helpAction}><Ionicons name="mail-outline" size={25} color="#FFFFFF" /></Pressable>
      <Pressable onPress={() => Linking.openURL('tel:+917386714141')} style={styles.helpAction}><Ionicons name="call-outline" size={25} color="#FFFFFF" /></Pressable>
      <Pressable onPress={openWhatsApp} style={styles.helpAction}><Ionicons name="logo-whatsapp" size={25} color="#FFFFFF" /></Pressable>
    </View> : null}
    <Pressable onPress={() => setExpanded(value => !value)} style={[styles.helpMain, expanded && styles.helpMainClose]}><Ionicons name={expanded ? 'close' : 'headset-outline'} size={25} color="#FFFFFF" /></Pressable>
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
    {items.length ? <ScrollView contentContainerStyle={styles.cartList} showsVerticalScrollIndicator={false} bounces alwaysBounceVertical decelerationRate="normal" scrollEventThrottle={16} overScrollMode="auto">{items.map(({ product, quantity }) => <View key={product.id} style={styles.cartListItem}>
      <Image source={product.image} style={styles.cartListImage} resizeMode="contain" />
      <View style={styles.cartListCopy}><Text numberOfLines={3} style={styles.cartListName}>{product.name}</Text><Text style={styles.cartListPrice}>{product.price}</Text></View>
      <View style={styles.cartListActions}><View style={styles.cartQuantityControl}><Pressable hitSlop={8} onPress={() => onChangeQuantity(product.id, -1)}><Text style={styles.cartQuantityButton}>−</Text></Pressable><Text style={styles.cartQuantityValue}>{quantity}</Text><Pressable hitSlop={8} onPress={() => onChangeQuantity(product.id, 1)}><Text style={styles.cartQuantityButton}>+</Text></Pressable></View></View>
      <Text numberOfLines={1} style={styles.cartLineTotal}>{product.unitPrice ? money(String(product.unitPrice * quantity), product.currencyCode ?? 'INR') : product.price}</Text>
    </View>)}{recentlyViewed.length ? <View style={styles.cartSuggestions}><Text style={styles.cartSuggestionsTitle}>Suggestions</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cartSuggestionRow}>{recentlyViewed.map(product => <View key={product.id} style={styles.cartSuggestionCard}><Pressable onPress={() => onOpenProduct(product)}><Image source={product.image} style={styles.cartSuggestionImage} resizeMode="contain" /><Text numberOfLines={2} style={styles.cartSuggestionName}>{product.name}</Text><Text style={styles.cartSuggestionPrice}>{product.price}</Text></Pressable><Pressable onPress={() => onAdd(product)} style={styles.cartSuggestionAdd}><Text style={styles.cartSuggestionAddText}>ADD</Text></Pressable></View>)}</ScrollView></View> : null}</ScrollView> : <View style={styles.emptyCart}><Ionicons name="bag-handle-outline" size={44} color={palette.blue} /><Text style={styles.emptyCartTitle}>Your cart is empty</Text><Text style={styles.emptyCartCopy}>Add products to see them here.</Text></View>}
    {items.length ? <View style={styles.cartCheckoutBar}><View style={styles.cartTotalBlock}><Text style={styles.cartItemCount}>{itemCount} {itemCount === 1 ? 'item' : 'items'} in cart</Text><Text style={styles.cartTotalText}>Total: {cartTotalText}</Text></View><Pressable onPress={onCheckout} style={styles.cartCheckoutButton}><Text style={styles.cartCheckoutText}>Proceed to checkout</Text></Pressable></View> : null}
  </View>;
}

function Storefront() {
  const customerAuth = useShopifyCustomerAuth();
  const insets = useSafeAreaInsets();
  const floatingCartBottom = BOTTOM_NAV_HEIGHT + FLOATING_CART_GAP + insets.bottom;
  const screenWidth = Dimensions.get('window').width;
  const contentWidth = Math.min(screenWidth, 440);
  const cardWidth = Math.max(156, (contentWidth - 46) / 2);
  const wishlistCardWidth = (contentWidth - 36) / 2;
  const trendingCardWidth = Math.max(138, (contentWidth - 96) / 2);
  const carouselCardWidth = Math.round((contentWidth - 20) / 2);
  const carouselStep = carouselCardWidth + 12;
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeCategory, setActiveCategory] = useState('Audio');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteProducts, setFavoriteProducts] = useState<Record<string, Product>>({});
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartPopupVisible, setCartPopupVisible] = useState(false);
  const [cartPreview, setCartPreview] = useState<Product | null>(null);
  const [productReturnScreen, setProductReturnScreen] = useState<ReturnScreen>('home');
  const [cartReturnScreen, setCartReturnScreen] = useState<ReturnScreen>('home');
  const [categoryCollectionReturnScreen, setCategoryCollectionReturnScreen] = useState<'home' | 'categories' | 'offers'>('home');
  const [screen, setScreen] = useState<'home' | 'categories' | 'categoryCollection' | 'wishlist' | 'offers' | 'orders' | 'profile' | 'search' | 'product' | 'cart' | 'checkout' | 'address' | 'orderSuccess' | 'orderFailure'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPlaceholderIndex, setSearchPlaceholderIndex] = useState(0);
  const searchPlaceholderY = useRef(new Animated.Value(0)).current;
  const searchPlaceholderOpacity = useRef(new Animated.Value(1)).current;
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [remoteSearchProducts, setRemoteSearchProducts] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [searchHasNextPage, setSearchHasNextPage] = useState(false);
  const [searchCursor, setSearchCursor] = useState<string | null>(null);
  const [searchFilterVisible, setSearchFilterVisible] = useState(false);
  const [searchBrands, setSearchBrands] = useState<Set<string>>(new Set());
  const [searchVendors, setSearchVendors] = useState<Set<string>>(new Set());
  const [searchSort, setSearchSort] = useState<'Recommended' | 'Price: Low' | 'Price: High' | 'Name'>('Recommended');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<HistoryOrder | null>(null);
  const [orderDetailMode, setOrderDetailMode] = useState<'tracking' | 'return' | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [returnPolicyOpen, setReturnPolicyOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnImages, setReturnImages] = useState<string[]>([]);
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
  const [initialLoginSkipped, setInitialLoginSkipped] = useState(false);
  const [checkoutLoginRequired, setCheckoutLoginRequired] = useState(false);
  const [footerPageTransitioning, setFooterPageTransitioning] = useState(false);
  const [activeFooterTab, setActiveFooterTab] = useState<'home' | 'categories' | 'orders' | 'wishlist' | 'offers'>('home');
  const carouselRef = useRef<ScrollView>(null);
  const carouselPositionRef = useRef(0);
  const orderDetailsScrollRef = useRef<ScrollView>(null);
  const productRecommendationRequestRef = useRef(0);

  useEffect(() => {
    const rotatePlaceholder = () => {
      Animated.parallel([
        Animated.timing(searchPlaceholderY, { toValue: -12, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(searchPlaceholderOpacity, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (!finished) return;
        setSearchPlaceholderIndex(current => (current + 1) % SEARCH_PLACEHOLDERS.length);
        requestAnimationFrame(() => {
          searchPlaceholderY.setValue(12);
          searchPlaceholderOpacity.setValue(0);
          requestAnimationFrame(() => {
            Animated.parallel([
              Animated.timing(searchPlaceholderY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.timing(searchPlaceholderOpacity, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]).start();
          });
        });
      });
    };
    const interval = setInterval(rotatePlaceholder, 2000);
    return () => {
      clearInterval(interval);
      searchPlaceholderY.stopAnimation();
      searchPlaceholderOpacity.stopAnimation();
    };
  }, [searchPlaceholderOpacity, searchPlaceholderY]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home') return false;
      if (screen === 'orderSuccess') { setScreen('home'); return true; }
      if (screen === 'orderFailure') { setScreen('checkout'); return true; }
      if (screen === 'address' || screen === 'checkout') { setScreen('cart'); return true; }
      if (screen === 'cart') { setCartPopupVisible(cartItems.length > 0); setScreen(cartReturnScreen); return true; }
      if (screen === 'product') { setScreen(productReturnScreen); return true; }
      if (screen === 'categoryCollection') { setScreen(categoryCollectionReturnScreen); return true; }
      if (screen === 'wishlist') { setScreen('home'); return true; }
      if (screen === 'search') { setScreen('home'); return true; }
      if (screen === 'offers') { setScreen('home'); return true; }
      if (screen === 'orders') { setScreen('home'); return true; }
      if (screen === 'profile') { setScreen('home'); return true; }
      if (screen === 'categories') { setScreen('home'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [cartItems, cartReturnScreen, categoryCollectionReturnScreen, productReturnScreen, screen]);

  useEffect(() => {
    if (screen === 'home' || screen === 'categories' || screen === 'orders' || screen === 'wishlist' || screen === 'offers') {
      setActiveFooterTab(screen);
    }
  }, [screen]);
  const browseChromeCollapsedRef = useRef(false);
  const browseFooterCollapsedRef = useRef(false);
  const lastBrowseScrollYRef = useRef(0);
  const browseContentHeightRef = useRef(0);
  const browseViewportHeightRef = useRef(0);
  const browseChromeProgress = useRef(new Animated.Value(0)).current;
  const browseFooterProgress = useRef(new Animated.Value(0)).current;
  const collapseBrowseChrome = screen === 'home' || screen === 'categories' || screen === 'wishlist' || screen === 'offers' || screen === 'orders' || screen === 'profile';
  const storefrontHeaderVisible = collapseBrowseChrome
    && screen !== 'profile'
    && !openingAnimationVisible
    && !customerAuth.loading
    && (customerAuth.isLoggedIn || initialLoginSkipped)
    && !checkoutLoginRequired;
  const transportProgress = useRef(new Animated.Value(0)).current;
  const openingProgress = useRef(new Animated.Value(0)).current;
  const openingFlightProgress = useRef(new Animated.Value(0)).current;
  const openingTruckProgress = useRef(new Animated.Value(0)).current;
  const loginEntranceProgress = useRef(new Animated.Value(0)).current;
  const storefrontEntranceProgress = useRef(new Animated.Value(0)).current;
  const pincodeModalProgress = useRef(new Animated.Value(0)).current;
  const profileEntranceProgress = useRef(new Animated.Value(0)).current;
  const suppressHomeEntranceRef = useRef(false);
  const homeSearchEntrance = useRef(new Animated.Value(0)).current;
  const homeCarouselEntrance = useRef(new Animated.Value(0)).current;
  const homeCategoryEntrance = useRef(new Animated.Value(0)).current;
  const homeTrendingEntrance = useRef(new Animated.Value(0)).current;
  const homeBestSellingEntrance = useRef(new Animated.Value(0)).current;
  const flightTrailScale = transportProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] });
  const truckTrailScale = transportProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const flightPhaseOpacity = transportProgress.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [1, 1, 0, 0] });
  const truckPhaseOpacity = transportProgress.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] });
  const flightTrailOffset = Animated.multiply(Animated.subtract(flightTrailScale, 1), contentWidth / 2);
  const truckTrailOffset = Animated.multiply(Animated.subtract(truckTrailScale, 1), contentWidth / 2);
  const flightTranslateX = Animated.subtract(Animated.multiply(flightTrailScale, contentWidth), 19);
  const truckTranslateX = Animated.subtract(Animated.multiply(truckTrailScale, contentWidth), 21);
  const openingFlightTranslateX = openingFlightProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });
  const openingTruckTranslateX = openingTruckProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });
  const openingFlightOpacity = openingProgress.interpolate({ inputRange: [0, 0.025, 0.075, 0.235, 0.285, 1], outputRange: [0, 0, 1, 1, 0, 0] });
  const openingTruckOpacity = openingProgress.interpolate({ inputRange: [0, 0.245, 0.295, 0.455, 0.51, 1], outputRange: [0, 0, 1, 1, 0, 0] });
  const openingClosedBoxOpacity = openingProgress.interpolate({ inputRange: [0, 0.515, 0.555, 0.64, 0.72, 1], outputRange: [0, 0, 1, 1, 0, 0] });
  const openingOpenBoxOpacity = openingProgress.interpolate({ inputRange: [0, 0.64, 0.72, 1], outputRange: [0, 0, 1, 1] });
  const openingBoxLift = openingProgress.interpolate({ inputRange: [0, 0.64, 0.76, 1], outputRange: [3, 3, -4, -4] });
  const loginEntranceOpacity = loginEntranceProgress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 0, 1] });
  const loginEntranceTranslateY = loginEntranceProgress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const homeSearchTranslateY = homeSearchEntrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  const homeCarouselTranslateY = homeCarouselEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const homeCategoryTranslateY = homeCategoryEntrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const homeTrendingTranslateY = homeTrendingEntrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const homeBestSellingTranslateY = homeBestSellingEntrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const pincodeModalScale = pincodeModalProgress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const pincodeModalTranslateY = pincodeModalProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const profileEntranceOpacity = profileEntranceProgress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.35, 1] });
  const backRevealOpacity = 1;
  const backRevealTranslateX = 0;
  const homeHeaderHeight = browseChromeProgress.interpolate({ inputRange: [0, 1], outputRange: [(screen === 'home' || screen === 'categories' || screen === 'wishlist' || screen === 'offers' || screen === 'orders') ? 126 : 82, 0] });
  const homeHeaderOpacity = browseChromeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const homeFooterTranslateY = browseFooterProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 74] });
  const homeFooterOpacity = browseFooterProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const setBrowseChromeVisibility = (collapsed: boolean) => {
    // Scroll events can arrive before React has committed the state update. Keep
    // this ref in sync immediately so the same animation is never restarted.
    if (collapsed === browseChromeCollapsedRef.current) return;
    browseChromeCollapsedRef.current = collapsed;
    Animated.timing(browseChromeProgress, {
      toValue: collapsed ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };
  const setBrowseFooterVisibility = (collapsed: boolean) => {
    if (collapsed === browseFooterCollapsedRef.current) return;
    browseFooterCollapsedRef.current = collapsed;
    Animated.timing(browseFooterProgress, {
      toValue: collapsed ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  const catalog = shopifyProducts;
  const cartCount = useMemo(() => cartItems.reduce((total, item) => total + item.quantity, 0), [cartItems]);
  const recommendations = useMemo(() => catalog.slice(0, 4), [catalog]);
  const wishlistProducts = useMemo(() => Object.values(favoriteProducts), [favoriteProducts]);
  const localSearchMatches = useMemo(() => {
    const keywords = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return keywords.length ? shopifyProducts.filter(product => keywords.every(keyword => `${product.name} ${product.sku ?? ''}`.toLowerCase().includes(keyword))) : [];
  }, [searchQuery, shopifyProducts]);
  const searchMatches = remoteSearchProducts.length ? remoteSearchProducts : localSearchMatches;
  const displayedSearchResults = useMemo(() => {
    const filtered = remoteSearchProducts.filter(product => (!searchBrands.size || searchBrands.has(product.brand?.trim() ?? '')) && (!searchVendors.size || searchVendors.has(product.vendor?.trim() ?? '')));
    if (searchSort === 'Price: Low') filtered.sort((a, b) => (a.unitPrice ?? 0) - (b.unitPrice ?? 0));
    if (searchSort === 'Price: High') filtered.sort((a, b) => (b.unitPrice ?? 0) - (a.unitPrice ?? 0));
    if (searchSort === 'Name') filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [remoteSearchProducts, searchBrands, searchSort, searchVendors]);
  const searchBrandOptions = useMemo(() => [...new Set(remoteSearchProducts.map(product => product.brand?.trim() ?? '').filter(Boolean))].sort(), [remoteSearchProducts]);
  const searchVendorOptions = useMemo(() => [...new Set(remoteSearchProducts.map(product => product.vendor?.trim() ?? '').filter(Boolean))].sort(), [remoteSearchProducts]);
  const searchFilterCount = searchBrands.size + searchVendors.size;
  const toggleSearchFilter = (value: string, type: 'brand' | 'vendor') => {
    const setter = type === 'brand' ? setSearchBrands : setSearchVendors;
    setter(current => { const next = new Set(current); next.has(value) ? next.delete(value) : next.add(value); return next; });
  };
  const submitSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;
    setSubmittedSearch(query);
    setScreen('search');
    setSearchLoading(true);
    setSearchError(null);
    searchShopifyProducts(query, 30).then(page => {
      setRemoteSearchProducts(page.products.map(mapShopifyProduct));
      setSearchHasNextPage(page.hasNextPage);
      setSearchCursor(page.endCursor);
    }).catch(error => setSearchError(error instanceof Error ? error.message : 'Search failed.')).finally(() => setSearchLoading(false));
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (screen !== 'home') return;
    if (!query) { setRemoteSearchProducts([]); setSearchLoading(false); setSearchError(null); setSearchHasNextPage(false); setSearchCursor(null); return; }
    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);
    setRemoteSearchProducts([]);
    setSearchHasNextPage(false);
    setSearchCursor(null);
    const timer = setTimeout(() => {
      searchShopifyProducts(query, 2).then(page => {
        if (!cancelled) {
          setRemoteSearchProducts(page.products.map(mapShopifyProduct));
          setSearchHasNextPage(page.hasNextPage);
          setSearchCursor(page.endCursor);
        }
      }).catch(error => {
        if (!cancelled) { setRemoteSearchProducts([]); setSearchError(error instanceof Error ? error.message : 'Search failed.'); }
      }).finally(() => { if (!cancelled) setSearchLoading(false); });
    }, 60);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [screen, searchQuery]);

  const loadMoreSearchResults = () => {
    if (!submittedSearch || !searchHasNextPage || !searchCursor || searchLoadingMore) return;
    setSearchLoadingMore(true);
    searchShopifyProducts(submittedSearch, 30, searchCursor).then(page => {
      setRemoteSearchProducts(current => {
        const ids = new Set(current.map(product => product.id));
        return [...current, ...page.products.map(mapShopifyProduct).filter(product => !ids.has(product.id))];
      });
      setSearchHasNextPage(page.hasNextPage);
      setSearchCursor(page.endCursor);
    }).catch(error => setSearchError(error instanceof Error ? error.message : 'Unable to load more results.')).finally(() => setSearchLoadingMore(false));
  };

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { shown.remove(); hidden.remove(); };
  }, []);
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
          const collectionImage = preview?.image?.url;
          return {
            id: collection.id,
            label: collection.title.trim(),
            image: collectionImage ? { uri: collectionImage } as ImageSourcePropType : undefined,
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
  const browserCarouselApiUrl = typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.hostname}:3001/api/carousels` : '';
  const carouselApiUrl = process.env.EXPO_PUBLIC_CAROUSEL_API_URL ?? browserCarouselApiUrl;
  const uploadedSlides = uploadedCarousels[activeHomeMenu.label]?.filter(slide => slide.image) ?? [];
  const carouselSlides = useMemo(() => activeShopifyMenu?.items.length
    ? activeShopifyMenu.items.map(item => {
      const preview = item.resource ? shopifyCollectionPreviews[item.resource.id] : undefined;
      const shopifyProduct = preview?.products.nodes[0];
      const product = shopifyProduct ? mapShopifyProduct(shopifyProduct) : undefined;
      const collectionImage = preview?.image?.url;
      // Do not use a product image while the collection image is still loading.
      // That visual swap is distracting and makes the carousel look incorrect.
      return collectionImage && product ? { id: item.id, image: { uri: collectionImage } as ImageSourcePropType, title: item.title.trim(), subtitle: '', product, category: item } : null;
    })
      .filter((slide): slide is NonNullable<typeof slide> => Boolean(slide))
    : uploadedSlides.length && categoryProducts.length
      ? uploadedSlides.map((slide, index) => ({ id: slide.id, image: { uri: slide.image } as ImageSourcePropType, title: slide.title || `${activeHomeMenu.label} picks`, subtitle: slide.collection ? `Shop ${slide.collection}` : `Trending ${activeHomeMenu.label.toLowerCase()} pick`, product: categoryProducts[index % categoryProducts.length]!, category: undefined }))
      : [],
  [activeHomeMenu.label, activeShopifyMenu, categoryProducts, shopifyCollectionPreviews, uploadedSlides]);
  const carouselSlideCount = Math.max(1, carouselSlides.length);
  const offerCollections = carouselSlides.slice(0, 8);
  const historyOrders = useMemo<HistoryOrder[]>(() => {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const cases: Array<{ status: HistoryOrder['status']; orderedDaysAgo: number; deliveredDaysAgo?: number }> = [
      { status: 'Delivered', orderedDaysAgo: 9, deliveredDaysAgo: 3 },
      { status: 'Delivered', orderedDaysAgo: 22, deliveredDaysAgo: 12 },
      { status: 'Shipped', orderedDaysAgo: 5 },
      { status: 'Processing', orderedDaysAgo: 2 },
      { status: 'Cancelled', orderedDaysAgo: 14 },
      { status: 'Returned', orderedDaysAgo: 30, deliveredDaysAgo: 20 },
    ];
    return cases.map(({ status, orderedDaysAgo, deliveredDaysAgo }, index) => {
      const orderProducts = Array.from({ length: index % 3 + 1 }, (_, productIndex) => catalog[(index * 2 + productIndex) % catalog.length]!).filter(Boolean);
      const total = orderProducts.reduce((sum, product) => sum + (product.unitPrice ?? (Number(product.price.replace(/[^0-9.]/g, '')) || 0)), 0);
      return {
        id: `BM/APP-${4821 + index * 137}`,
        date: new Date(now - orderedDaysAgo * day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        products: orderProducts,
        amount: money(String(total), orderProducts[0]?.currencyCode ?? 'INR'),
        status,
        deliveredAt: deliveredDaysAgo === undefined ? undefined : new Date(now - deliveredDaysAgo * day).toISOString(),
        shippingAddress: index % 2 === 0 ? 'Ananya Sharma, 18 MG Road, Indiranagar, Bengaluru, Karnataka 560038 · +91 98765 43210' : 'Rahul Menon, 42 Lake View Street, Anna Nagar, Chennai, Tamil Nadu 600040 · +91 91234 56789',
      };
    });
  }, [catalog]);

  useEffect(() => {
    if (!storefrontHeaderVisible) {
      transportProgress.stopAnimation();
      transportProgress.setValue(0);
      return;
    }
    transportProgress.setValue(0);
    const transportAnimation = Animated.loop(Animated.timing(transportProgress, {
      toValue: 1,
      duration: 3000,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    transportAnimation.start();
    return () => transportAnimation.stop();
  }, [contentWidth, storefrontHeaderVisible, transportProgress]);

  useEffect(() => {
    browseChromeCollapsedRef.current = false;
    browseFooterCollapsedRef.current = false;
    lastBrowseScrollYRef.current = 0;
    browseChromeProgress.stopAnimation();
    browseFooterProgress.stopAnimation();
    browseChromeProgress.setValue(0);
    browseFooterProgress.setValue(0);
  }, [browseChromeProgress, browseFooterProgress, collapseBrowseChrome, screen]);

  useEffect(() => {
    if (screen === 'home' && !keyboardVisible) setSearchQuery('');
  }, [keyboardVisible, screen]);

  useEffect(() => {
    openingProgress.setValue(0);
    openingFlightProgress.setValue(0);
    openingTruckProgress.setValue(0);
    const openingAnimation = Animated.timing(openingProgress, {
      toValue: 1,
      duration: 5400,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    const flightAnimation = Animated.sequence([
      Animated.delay(300),
      Animated.timing(openingFlightProgress, {
        toValue: 1,
        duration: 1140,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    const truckAnimation = Animated.sequence([
      Animated.delay(1480),
      Animated.timing(openingTruckProgress, {
        toValue: 1,
        duration: 1190,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    flightAnimation.start();
    truckAnimation.start();
    openingAnimation.start(({ finished }) => {
      if (finished) setOpeningAnimationVisible(false);
    });
    return () => {
      openingAnimation.stop();
      flightAnimation.stop();
      truckAnimation.stop();
    };
  }, [contentWidth, openingFlightProgress, openingProgress, openingTruckProgress]);

  useEffect(() => {
    const shouldShowInitialLogin = !openingAnimationVisible && !customerAuth.loading && !customerAuth.isLoggedIn && !initialLoginSkipped && !checkoutLoginRequired;
    if (!shouldShowInitialLogin) {
      loginEntranceProgress.setValue(0);
      return;
    }
    const entranceAnimation = Animated.timing(loginEntranceProgress, {
      toValue: 1,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    entranceAnimation.start();
    return () => entranceAnimation.stop();
  }, [checkoutLoginRequired, customerAuth.isLoggedIn, customerAuth.loading, initialLoginSkipped, loginEntranceProgress, openingAnimationVisible]);

  useEffect(() => {
    const shouldShowStorefront = !openingAnimationVisible && !customerAuth.loading && (customerAuth.isLoggedIn || initialLoginSkipped) && !checkoutLoginRequired;
    if (!shouldShowStorefront) {
      storefrontEntranceProgress.setValue(0);
      return;
    }
    const entranceAnimation = Animated.timing(storefrontEntranceProgress, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    entranceAnimation.start();
    return () => entranceAnimation.stop();
  }, [checkoutLoginRequired, customerAuth.isLoggedIn, customerAuth.loading, initialLoginSkipped, openingAnimationVisible, storefrontEntranceProgress]);

  useEffect(() => {
    const sections = [homeSearchEntrance, homeCarouselEntrance, homeCategoryEntrance, homeTrendingEntrance, homeBestSellingEntrance];
    if (screen === 'home' && suppressHomeEntranceRef.current) {
      sections.forEach(section => section.setValue(1));
      suppressHomeEntranceRef.current = false;
      return;
    }
    sections.forEach(section => section.setValue(0));
    if (screen !== 'home' || footerPageTransitioning || openingAnimationVisible || customerAuth.loading || (!customerAuth.isLoggedIn && !initialLoginSkipped) || checkoutLoginRequired) return;
    const entranceAnimation = Animated.stagger(95, sections.map(section => Animated.timing(section, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })));
    entranceAnimation.start();
    return () => entranceAnimation.stop();
  }, [checkoutLoginRequired, customerAuth.isLoggedIn, customerAuth.loading, footerPageTransitioning, homeBestSellingEntrance, homeCarouselEntrance, homeCategoryEntrance, homeSearchEntrance, homeTrendingEntrance, initialLoginSkipped, openingAnimationVisible, screen]);

  useEffect(() => {
    if (!checkoutLoginRequired || !customerAuth.isLoggedIn) return;
    setCheckoutLoginRequired(false);
    setScreen('address');
  }, [checkoutLoginRequired, customerAuth.isLoggedIn]);

  useEffect(() => {
    if (screen !== 'home' || footerPageTransitioning) return;
    const initialSlide = carouselSlideCount > 1 ? 1 : 0;
    setActiveBanner(initialSlide);
    carouselPositionRef.current = carouselSlideCount + initialSlide;
    const frame = requestAnimationFrame(() => carouselRef.current?.scrollTo({ x: carouselStep * carouselPositionRef.current, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [activeHomeMenu.label, carouselSlideCount, carouselStep, footerPageTransitioning, screen]);

  useEffect(() => {
    const homeIsVisible = screen === 'home' && !footerPageTransitioning && !openingAnimationVisible && !customerAuth.loading && (customerAuth.isLoggedIn || initialLoginSkipped) && !checkoutLoginRequired;
    if (!homeIsVisible || carouselSlideCount < 2) return;
    const advanceCarousel = () => {
      let nextPosition = carouselPositionRef.current + 1;
      if (nextPosition >= carouselSlideCount * 2) {
        carouselPositionRef.current = carouselSlideCount;
        carouselRef.current?.scrollTo({ x: carouselStep * carouselSlideCount, animated: false });
        nextPosition = carouselSlideCount + 1;
      }
      carouselPositionRef.current = nextPosition;
      carouselRef.current?.scrollTo({ x: carouselStep * nextPosition, animated: true });
    };
    const interval = setInterval(advanceCarousel, 3000);
    return () => clearInterval(interval);
  }, [carouselSlideCount, carouselStep, checkoutLoginRequired, customerAuth.isLoggedIn, customerAuth.loading, footerPageTransitioning, initialLoginSkipped, openingAnimationVisible, screen]);

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

  const toggleFavorite = (product: Product) => {
    setFavorites(current => {
      const next = new Set(current);
      next.has(product.id) ? next.delete(product.id) : next.add(product.id);
      return next;
    });
    setFavoriteProducts(current => {
      if (current[product.id]) {
        const next = { ...current };
        delete next[product.id];
        return next;
      }
      return { ...current, [product.id]: product };
    });
  };

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
    setCartReturnScreen(screen === 'product' || screen === 'categoryCollection' || screen === 'categories' || screen === 'wishlist' || screen === 'offers' || screen === 'orders' ? screen : 'home');
    setScreen('cart');
  };

  const navigateBack = (target: typeof screen) => {
    if (target === 'home') suppressHomeEntranceRef.current = true;
    LayoutAnimation.configureNext({
      duration: 360,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setScreen(target);
  };

  const returnFromCart = () => {
    setCartPopupVisible(cartItems.length > 0);
    navigateBack(cartReturnScreen);
  };

  const openProduct = (product: Product, preferredCollectionId?: string) => {
    const recommendationRequest = ++productRecommendationRequestRef.current;
    setRecentlyViewed(current => [product, ...current.filter(item => item.id !== product.id)].slice(0, 10));
    if (screen !== 'product') setProductReturnScreen(screen === 'categoryCollection' || screen === 'categories' || screen === 'wishlist' || screen === 'offers' || screen === 'orders' || screen === 'search' || screen === 'cart' ? screen : 'home');
    setSelectedProduct(product);
    setScreen('product');
    const collectionId = preferredCollectionId ?? product.collectionIds?.[0];
    if (!collectionId) {
      setProductPageRecommendations(shopifyProducts.filter(item => item.id !== product.id));
      return;
    }
    setProductPageRecommendations([product]);
    fetchShopifyCollectionProducts(collectionId, 250)
      .then(page => {
        if (productRecommendationRequestRef.current === recommendationRequest) setProductPageRecommendations(page.products.map(mapShopifyProduct));
      })
      .catch(() => {
        if (productRecommendationRequestRef.current === recommendationRequest) setProductPageRecommendations([]);
      });
  };

  const openCategoryCollection = (category: ShopifyMenuItem, collection: ShopifyMenuItem, origin: 'home' | 'categories' | 'offers') => {
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

  const openFooterPage = (target: 'home' | 'categories' | 'orders' | 'wishlist' | 'offers') => {
    if (screen === target || footerPageTransitioning) return;
    setActiveFooterTab(target);
    setFooterPageTransitioning(true);
    requestAnimationFrame(() => {
      setScreen(target);
      requestAnimationFrame(() => setFooterPageTransitioning(false));
    });
  };

  const openPincodeModal = () => {
    pincodeModalProgress.setValue(0);
    setPincodeModalVisible(true);
    requestAnimationFrame(() => Animated.spring(pincodeModalProgress, {
      toValue: 1,
      damping: 20,
      stiffness: 210,
      mass: 0.8,
      useNativeDriver: true,
    }).start());
  };

  const openProfile = () => {
    profileEntranceProgress.setValue(0);
    setScreen('profile');
    requestAnimationFrame(() => Animated.timing(profileEntranceProgress, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start());
  };

  const closePincodeModal = () => {
    Animated.timing(pincodeModalProgress, {
      toValue: 0,
      duration: 170,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setPincodeModalVisible(false);
    });
  };

  const openOffers = () => {
    openFooterPage('offers');
  };

  const isTrackableOrder = (order: HistoryOrder) => order.status === 'Shipped' || order.status === 'Processing';
  const isReturnEligibleOrder = (order: HistoryOrder) => order.status === 'Delivered'
    && Boolean(order.deliveredAt)
    && Date.now() - new Date(order.deliveredAt!).getTime() <= 7 * 24 * 60 * 60 * 1000;
  const openHistoryOrder = (order: HistoryOrder) => {
    setSelectedHistoryOrder(order);
    setOrderDetailMode(null);
    setOrderDetailLoading(false);
    setReturnPolicyOpen(false);
    setReturnReason('');
    setReturnImages([]);
  };
  const closeHistoryOrder = () => {
    setSelectedHistoryOrder(null);
    setOrderDetailMode(null);
    setOrderDetailLoading(false);
  };
  const openHistoryOrderAction = (order: HistoryOrder, mode: 'tracking' | 'return') => {
    openHistoryOrder(order);
    setOrderDetailLoading(true);
    setTimeout(() => {
      setOrderDetailLoading(false);
      setOrderDetailMode(mode);
      setTimeout(() => orderDetailsScrollRef.current?.scrollToEnd({ animated: true }), 280);
    }, 650);
  };
  const pickReturnPictures = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach pictures to your return request.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled) setReturnImages(current => [...current, ...result.assets.map(asset => asset.uri)].slice(0, 5));
  };

  const renderProduct = (item: Product) => (
    <ProductCard key={item.id} item={item} width={cardWidth} favorite={favorites.has(item.id)} onFavorite={() => toggleFavorite(item)} onAdd={() => addToCart(item)} onOpen={() => openProduct(item)} />
  );

  if (!openingAnimationVisible && !customerAuth.loading && !customerAuth.isLoggedIn && !initialLoginSkipped && !checkoutLoginRequired) {
    return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" /><Animated.View style={[styles.loginEntrance, { opacity: loginEntranceOpacity, transform: [{ translateY: loginEntranceTranslateY }] }]}><SkippableLoginPage loading={customerAuth.loading} error={customerAuth.error} onLogin={customerAuth.login} onSkip={() => setInitialLoginSkipped(true)} /></Animated.View></SafeAreaView>;
  }

  if (checkoutLoginRequired && !customerAuth.isLoggedIn) {
    return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" /><RequiredLoginPage loading={customerAuth.loading} error={customerAuth.error} onLogin={customerAuth.login} onClose={() => { setCheckoutLoginRequired(false); setScreen('cart'); }} /></SafeAreaView>;
  }

  if (screen === 'categoryCollection' && selectedCategoryGroup && selectedCollectionItem) return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}>
    <StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} />
    <Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}>
    <CategoryCollectionPage
      category={selectedCategoryGroup}
      selectedCollection={selectedCollectionItem}
      previews={shopifyCollectionPreviews}
      products={collectionPageProducts}
      loading={collectionPageLoading}
      totalProducts={collectionPageTotal}
      loadingMore={collectionPageLoadingMore}
      hasNextPage={collectionPageHasNext}
      favoriteIds={favorites}
      onLoadMore={loadMoreCollectionProducts}
      onBack={() => navigateBack(categoryCollectionReturnScreen)}
      onSelectCollection={collection => {
        setCollectionPageProducts([]);
        setCollectionPageTotal(null);
        setCollectionPageLoading(true);
        setSelectedCollectionItem(collection);
      }}
      onAdd={product => addToCart(mapShopifyProduct(product))}
      onToggleFavorite={product => toggleFavorite(mapShopifyProduct(product))}
      onOpenProduct={product => openProduct(mapShopifyProduct(product), selectedCollectionItem.resource?.id)}
    />
    <HelpFab cartBottom={floatingCartBottom} />
    {cartPopupVisible ? <CartPopup item={cartPreview} count={cartCount} onOpen={openCart} containerStyle={[styles.collectionCartPopupLayer, { paddingBottom: floatingCartBottom }]} /> : null}
    </Animated.View>
  </SafeAreaView>;

  if (screen === 'product' && selectedProduct) {
    const recommendations = productPageRecommendations;
    return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} /><Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}><ProductDetail key={selectedProduct.id} width={contentWidth} cartCount={cartCount} product={selectedProduct} recommendations={recommendations} favoriteIds={favorites} onBack={() => navigateBack(productReturnScreen)} onAdd={addToCart} onCheckout={() => { setCartItems(current => current.length ? current : [{ product: selectedProduct, quantity: 1 }]); setCheckoutInitialStage(2); if (customerAuth.isLoggedIn) setScreen('address'); else setCheckoutLoginRequired(true); }} onOpenProduct={openProduct} onFavorite={toggleFavorite} />{cartPopupVisible ? <CartPopup item={cartPreview} count={cartCount} onOpen={openCart} containerStyle={{ paddingBottom: floatingCartBottom }} /> : null}<HelpFab product={selectedProduct} cartBottom={floatingCartBottom} /></Animated.View></SafeAreaView>;
  }

  if (screen === 'cart') {
    const cartProductIds = new Set(cartItems.map(item => item.product.id));
    const cartCollectionIds = new Set(cartItems.flatMap(item => item.product.collectionIds ?? []));
    const sameCollectionProducts = shopifyProducts.filter(product => !cartProductIds.has(product.id) && (product.collectionIds ?? []).some(collectionId => cartCollectionIds.has(collectionId)));
    const trendingProducts = categoryProducts.filter(product => !cartProductIds.has(product.id));
    const bestSellingProducts = [...shopifyProducts].filter(product => !cartProductIds.has(product.id) && product.availableForSale !== false).sort((a, b) => Number(b.discount.replace(/[^0-9]/g, '')) - Number(a.discount.replace(/[^0-9]/g, '')));
    const seenSuggestionIds = new Set<string>();
    const cartSuggestions = [recentlyViewed, sameCollectionProducts, trendingProducts, bestSellingProducts].flat().filter(product => {
      if (cartProductIds.has(product.id) || seenSuggestionIds.has(product.id)) return false;
      seenSuggestionIds.add(product.id);
      return true;
    }).slice(0, 16);
    return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}><CartPage items={cartItems} recentlyViewed={cartSuggestions} onBack={returnFromCart} onChangeQuantity={changeCartQuantity} onCheckout={() => { if (cartItems[0]) { setSelectedProduct(cartItems[0].product); setCheckoutInitialStage(2); if (customerAuth.isLoggedIn) setScreen('address'); else setCheckoutLoginRequired(true); } }} onOpenProduct={product => openProduct(product)} onAdd={addToCart} /></Animated.View></SafeAreaView>;
  }

  if ((screen === 'orderSuccess' || screen === 'orderFailure') && orderOutcome) return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><OrderResultPage success={orderOutcome.success} orderId={orderOutcome.orderId} items={orderOutcome.items} address={shippingAddress} paymentMethod={orderOutcome.paymentMethod} total={orderOutcome.total} tax={orderOutcome.tax} codFee={orderOutcome.codFee} onHome={() => setScreen('home')} onRetry={() => setScreen('checkout')} /></SafeAreaView>;

  if (screen === 'checkout' && selectedProduct) return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}><CheckoutPage product={selectedProduct} quantity={Math.max(1, cartCount)} items={cartItems.length ? cartItems : [{ product: selectedProduct, quantity: Math.max(1, cartCount) }]} address={shippingAddress} initialStage={checkoutInitialStage} onBack={() => navigateBack('cart')} onAddress={() => setScreen('address')} onTestResult={(result) => { const orderItems = cartItems.length ? cartItems : [{ product: selectedProduct, quantity: Math.max(1, cartCount) }]; setOrderOutcome({ ...result, items: orderItems, orderId: result.success ? `BM/APP-${Math.floor(1000 + Math.random() * 9000)}` : undefined }); if (result.success) setCartItems([]); setScreen(result.success ? 'orderSuccess' : 'orderFailure'); }} /></Animated.View></SafeAreaView>;

  if (screen === 'address') return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}><AddressPage onBack={() => navigateBack('cart')} onSave={(address, stage) => { setShippingAddress(address); setCheckoutInitialStage(stage); setScreen('checkout'); }} /></Animated.View></SafeAreaView>;

  if (screen === 'search') return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}>
    <StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} />
    <Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}>
    <View style={styles.searchResultsHeader}><Pressable onPress={() => navigateBack('home')} hitSlop={10}><Ionicons name="arrow-back" size={24} color="#FFFFFF" /></Pressable><View style={styles.searchResultsHeaderCopy}><Text style={styles.searchResultsHeaderTitle}>Search Results</Text><Text style={styles.searchResultsHeaderSubtitle}>Results for “{submittedSearch}”</Text></View><View style={{ width: 24 }} /></View>
    <ScrollView style={styles.searchResultsPage} contentContainerStyle={styles.searchResultsContent} showsVerticalScrollIndicator={false} bounces alwaysBounceVertical decelerationRate="normal" scrollEventThrottle={16} overScrollMode="auto">
      <View style={styles.wishlistHeadingBlock}><Text style={styles.wishlistHeading}>Search Results</Text><Text style={styles.wishlistCount}>{displayedSearchResults.length} products</Text></View>
      <View style={styles.searchControls}><Pressable onPress={() => setSearchFilterVisible(true)} style={[styles.searchControl, searchFilterCount > 0 && styles.searchControlActive]}><Ionicons name="options-outline" size={18} color={searchFilterCount ? '#FFFFFF' : palette.ink} /><Text numberOfLines={1} style={[styles.searchControlText, searchFilterCount > 0 && styles.searchControlTextActive]}>Filters{searchFilterCount ? ` (${searchFilterCount})` : ''}</Text><Ionicons name="chevron-down" size={15} color={searchFilterCount ? '#FFFFFF' : palette.ink} /></Pressable><Pressable onPress={() => setSearchSort(current => current === 'Recommended' ? 'Price: Low' : current === 'Price: Low' ? 'Price: High' : current === 'Price: High' ? 'Name' : 'Recommended')} style={styles.searchControl}><Ionicons name="swap-vertical" size={18} color={palette.ink} /><Text numberOfLines={1} style={styles.searchControlText}>Sort: {searchSort}</Text><Ionicons name="chevron-down" size={15} color={palette.ink} /></Pressable></View>
      {searchLoading ? <View style={styles.wishlistEmpty}><RotatingSearchIcon size={34} /></View> : searchError ? <View style={styles.wishlistEmpty}><Ionicons name="cloud-offline-outline" size={52} color={palette.red} /><Text style={styles.wishlistEmptyTitle}>Search failed</Text><Text style={styles.wishlistEmptyCopy}>{searchError}</Text></View> : displayedSearchResults.length ? <View style={styles.searchResultList}>{displayedSearchResults.map(item => <Pressable key={`search-${item.id}`} onPress={() => openProduct(item)} style={styles.searchResultRow}><Image source={item.image} style={styles.searchResultImage} resizeMode="contain" /><View style={styles.searchResultCopy}><Text numberOfLines={2} style={styles.searchResultTitle}>{item.name}</Text><Text style={styles.searchResultPrice}>{item.price}</Text></View><Ionicons name="chevron-forward" size={20} color={palette.blue} /></Pressable>)}{searchHasNextPage ? <Pressable disabled={searchLoadingMore} onPress={loadMoreSearchResults} style={[styles.searchLoadMore, searchLoadingMore && styles.searchLoadMoreDisabled]}>{searchLoadingMore ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.searchLoadMoreText}>Load more</Text>}</Pressable> : null}</View> : <View style={styles.wishlistEmpty}><Ionicons name="search-outline" size={52} color={palette.blue} /><Text style={styles.wishlistEmptyTitle}>No matching products</Text><Text style={styles.wishlistEmptyCopy}>Try another stock filter or keyword.</Text></View>}
    </ScrollView>
    <Modal visible={searchFilterVisible} transparent animationType="slide" onRequestClose={() => setSearchFilterVisible(false)}><Pressable style={styles.searchFilterBackdrop} onPress={() => setSearchFilterVisible(false)}><Pressable style={styles.searchFilterSheet} onPress={() => {}}><View style={styles.searchFilterHeader}><Text style={styles.searchFilterTitle}>Filters</Text><Pressable onPress={() => setSearchFilterVisible(false)}><Ionicons name="close" size={26} color={palette.heading} /></Pressable></View><View style={styles.searchFilterBody}><View style={styles.searchFilterPanel}><Text style={styles.searchFilterSection}>Brand</Text><ScrollView nestedScrollEnabled style={styles.searchFilterOptions} contentContainerStyle={styles.searchFilterOptionsContent} showsVerticalScrollIndicator>{searchBrandOptions.map(option => <Pressable key={`brand-${option}`} onPress={() => toggleSearchFilter(option, 'brand')} style={styles.searchFilterOption}><View style={[styles.searchCheckbox, searchBrands.has(option) && styles.searchCheckboxActive]}>{searchBrands.has(option) ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}</View><Text style={styles.searchFilterOptionText}>{option}</Text></Pressable>)}{!searchBrandOptions.length ? <Text style={styles.searchFilterEmpty}>No brand information available.</Text> : null}</ScrollView></View><View style={styles.searchFilterDivider} /><View style={styles.searchFilterPanel}><Text style={styles.searchFilterSection}>Shipping (Vendor)</Text><ScrollView nestedScrollEnabled style={styles.searchFilterOptions} contentContainerStyle={styles.searchFilterOptionsContent} showsVerticalScrollIndicator>{searchVendorOptions.map(option => <Pressable key={`vendor-${option}`} onPress={() => toggleSearchFilter(option, 'vendor')} style={styles.searchFilterOption}><View style={[styles.searchCheckbox, searchVendors.has(option) && styles.searchCheckboxActive]}>{searchVendors.has(option) ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}</View><Text style={styles.searchFilterOptionText}>{option}</Text></Pressable>)}{!searchVendorOptions.length ? <Text style={styles.searchFilterEmpty}>No shipping information available.</Text> : null}</ScrollView></View></View><View style={styles.searchFilterActions}><Pressable onPress={() => { setSearchBrands(new Set()); setSearchVendors(new Set()); }} style={styles.searchClearButton}><Text style={styles.searchClearText}>Clear all</Text></Pressable><Pressable onPress={() => setSearchFilterVisible(false)} style={styles.searchApplyButton}><Text style={styles.searchApplyText}>Show {displayedSearchResults.length} products</Text></Pressable></View></Pressable></Pressable></Modal>
    </Animated.View>
  </SafeAreaView>;

  if (screen === 'profile') return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}>
    <StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} />
    <Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}>
    <View style={styles.profileHeader}>
      <Pressable onPress={() => navigateBack('home')} hitSlop={10}><Ionicons name="arrow-back" size={24} color={palette.white} /></Pressable>
      <View style={styles.profileHeaderCopy}><Text style={styles.profileHeaderTitle}>My Profile</Text><Text style={styles.profileHeaderSubtitle}>Account, support and policies</Text></View>
      <View style={styles.profileHeaderAccount}><Ionicons name="person-circle" size={46} color={palette.white} /></View>
    </View>
    <Animated.View style={[styles.profileEntrance, { opacity: profileEntranceOpacity }]}>
      <ProfilePage customer={customerAuth.customer} onLogout={() => { void customerAuth.logout(); setInitialLoginSkipped(false); setCheckoutLoginRequired(false); setScreen('home'); }} />
    </Animated.View>
    </Animated.View>
  </SafeAreaView>;

  return (
    <SafeAreaView style={[styles.safeArea, (screen === 'home' || screen === 'categories' || screen === 'wishlist' || screen === 'offers' || screen === 'orders') && styles.homeSafeArea]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} />
      <Animated.View style={[styles.app, activeFooterTab === 'home' && styles.homeEntranceBackground, { width: contentWidth, opacity: Animated.multiply(storefrontEntranceProgress, backRevealOpacity), transform: [{ translateX: backRevealTranslateX }] }]}>
        {collapseBrowseChrome ? <Animated.View style={[styles.homeCollapsibleHeader, { height: homeHeaderHeight, opacity: homeHeaderOpacity }]}>
          <View style={[styles.deliveryHeader, screen === 'home' && styles.homeHeroSurface]}>
          <View style={styles.deliveryBrandBlock}>
            <Image source={require('./images/blumaple-header-white.png')} style={styles.deliveryLogo} resizeMode="contain" />
            <Pressable onPress={openPincodeModal} style={styles.addAddressButton}><Ionicons name="location-outline" size={21} color={palette.white} /><Text style={[styles.addAddressText, styles.homeHeaderText]}>{deliveryPincode ? `Deliver to ${deliveryPincode}` : 'Deliver to'}</Text></Pressable>
          </View>
          <View style={styles.deliveryActions}>
            <View>
              <Pressable onPress={() => customerAuth.isLoggedIn ? openProfile() : setInitialLoginSkipped(false)}><Ionicons name="person-circle" size={46} color={palette.white} /></Pressable>
            </View>
          </View>
          </View>
          {(screen === 'home' || screen === 'categories' || screen === 'wishlist' || screen === 'offers' || screen === 'orders' || screen === 'profile') ? <View style={[styles.transportLane, styles.homeHeroSurface]} pointerEvents="none"><View style={styles.orbitLine} /><Animated.View style={[styles.orbitLine, styles.redTrack, { opacity: flightPhaseOpacity }]} /><Animated.View style={[styles.orbitLine, styles.blueTrack, { opacity: truckPhaseOpacity }]} /><Animated.View style={[styles.transportTrail, styles.flightTrail, { width: contentWidth, opacity: flightPhaseOpacity, transform: [{ translateX: flightTrailOffset }, { scaleX: flightTrailScale }] }]} /><Animated.View style={[styles.transportTrail, styles.truckTrail, { width: contentWidth, opacity: truckPhaseOpacity, transform: [{ translateX: truckTrailOffset }, { scaleX: truckTrailScale }] }]} /><Animated.View style={[styles.transportFlight, { opacity: flightPhaseOpacity, transform: [{ translateX: flightTranslateX }] }]}><Ionicons name="airplane" size={38} color={palette.blue} /></Animated.View><Animated.View style={[styles.transportTruck, { opacity: truckPhaseOpacity, transform: [{ translateX: truckTranslateX }] }]}><MaterialCommunityIcons name="truck-fast-outline" size={42} color={palette.red} /></Animated.View></View> : null}
        </Animated.View> : <View style={styles.deliveryHeader}>
          <View style={styles.deliveryBrandBlock}>
            <Image source={require('./images/blumaple-header-white.png')} style={styles.deliveryLogo} resizeMode="contain" />
            <Pressable onPress={openPincodeModal} style={styles.addAddressButton}><Ionicons name="location-outline" size={21} color={palette.blue} /><Text style={styles.addAddressText}>{deliveryPincode ? `Deliver to ${deliveryPincode}` : 'Deliver to'}</Text></Pressable>
          </View>
          <View style={styles.deliveryActions}><Pressable onPress={() => customerAuth.isLoggedIn ? openProfile() : setInitialLoginSkipped(false)}><Ionicons name="person-circle" size={46} color={palette.ink} /></Pressable></View>
        </View>}

        {screen === 'home' && <Animated.View style={[styles.staticSearchZone, styles.homeHeroSurface, { opacity: homeSearchEntrance, transform: [{ translateY: homeSearchTranslateY }] }]}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={palette.ink} />
            <View style={styles.searchInputWrap}>
              {!searchQuery ? <Animated.Text pointerEvents="none" style={[styles.searchAnimatedPlaceholder, { opacity: searchPlaceholderOpacity, transform: [{ translateY: searchPlaceholderY }] }]}>{SEARCH_PLACEHOLDERS[searchPlaceholderIndex]}</Animated.Text> : null}
              <TextInput value={searchQuery} onChangeText={setSearchQuery} onFocus={() => setKeyboardVisible(true)} onBlur={() => setKeyboardVisible(false)} onSubmitEditing={submitSearch} returnKeyType="search" style={styles.searchInput} />
            </View>
          </View>
        </Animated.View>}

        <Animated.ScrollView
          key={screen}
          style={{ backgroundColor: activeFooterTab === 'home' ? '#0A254A' : palette.white }}
          showsVerticalScrollIndicator={false}
          bounces
          alwaysBounceVertical
          decelerationRate="normal"
          overScrollMode="auto"
          contentContainerStyle={[styles.content, collapseBrowseChrome && styles.browseContent]}
          onLayout={event => { browseViewportHeightRef.current = event.nativeEvent.layout.height; }}
          onContentSizeChange={(_, height) => {
            browseContentHeightRef.current = height;
            if (browseChromeCollapsedRef.current && height <= browseViewportHeightRef.current + 130) setBrowseChromeVisibility(false);
          }}
          onScroll={collapseBrowseChrome ? event => {
            const offsetY = Math.max(0, event.nativeEvent.contentOffset.y);
            const previousOffsetY = lastBrowseScrollYRef.current;
            const movement = offsetY - previousOffsetY;
            lastBrowseScrollYRef.current = offsetY;
            const hasStableScrollRange = browseContentHeightRef.current > browseViewportHeightRef.current + 130;
            if (!browseChromeCollapsedRef.current && offsetY > 24 && hasStableScrollRange) setBrowseChromeVisibility(true);
            else if (browseChromeCollapsedRef.current && offsetY < 8) setBrowseChromeVisibility(false);
            if (offsetY <= 4 || movement < -1) setBrowseFooterVisibility(false);
            else if (offsetY > 24 && movement > 1) setBrowseFooterVisibility(true);
          } : undefined}
          scrollEventThrottle={16}
        >
          {screen === 'home' ? <>
          <Animated.View style={{ opacity: homeCarouselEntrance, transform: [{ translateY: homeCarouselTranslateY }] }}>
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
            contentOffset={{ x: carouselStep * (carouselSlideCount + (carouselSlideCount > 1 ? 1 : 0)), y: 0 }}
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
          </Animated.View>
          <Animated.View style={[styles.homeProductSections, { opacity: homeCategoryEntrance, transform: [{ translateY: homeCategoryTranslateY }] }]}>
          <SectionTitle>Shop by Category</SectionTitle>
          <View style={styles.shopCategoryGrid}>
            {shopCategories.map(({ id, label, image, collection, group }) => <Pressable key={id} style={styles.shopCategoryItem} onPress={() => {
              if (collection && group) {
                openCategoryCollection(group, collection, 'home');
              }
            }}>
              <View style={styles.shopCategoryImageBlock}><View style={styles.shopCategoryImageClip}><CollectionArtwork source={image} /></View></View>
              <Text numberOfLines={2} style={styles.shopCategoryLabel}>{label}</Text>
            </Pressable>)}
          </View>
          </Animated.View>
          <Animated.View style={[styles.homeProductSections, { opacity: homeTrendingEntrance, transform: [{ translateY: homeTrendingTranslateY }] }]}>
          <SectionTitle>Trending</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingProductRow}>
            {categoryProducts.map(item => <ProductCard key={`explore-${activeHomeMenu.label}-${item.id}`} item={item} width={trendingCardWidth} favorite={favorites.has(item.id)} collectionLayout onFavorite={() => toggleFavorite(item)} onAdd={() => addToCart(item)} onOpen={() => openProduct(item)} />)}
          </ScrollView>
          </Animated.View>
          <Animated.View style={[styles.homeProductSections, { opacity: homeBestSellingEntrance, transform: [{ translateY: homeBestSellingTranslateY }] }]}>
          <SectionTitle>Best Selling</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingProductRow}>
            {categoryProducts.map(item => <ProductCard key={`grid-${activeHomeMenu.label}-${item.id}`} item={item} width={trendingCardWidth} favorite={favorites.has(item.id)} collectionLayout onFavorite={() => toggleFavorite(item)} onAdd={() => addToCart(item)} onOpen={() => openProduct(item)} />)}
          </ScrollView>
          </Animated.View>

          </> : screen === 'orders' ? <View style={styles.ordersPage}>
            <View style={styles.ordersHeadingBlock}>
              <Text style={styles.ordersHeading}>Order History</Text>
            </View>
            <View style={styles.orderList}>
              {historyOrders.map(order => {
                const trackable = isTrackableOrder(order);
                const returnEligible = isReturnEligibleOrder(order);
                return <Pressable key={order.id} onPress={() => openHistoryOrder(order)} style={styles.orderRow}>
                <Image source={order.products[0]?.image ?? require('./assets/figma/product-headphones.png')} style={styles.orderImage} resizeMode="contain" />
                <View style={styles.orderMain}>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Text style={styles.orderDate}>{order.date}</Text>
                  <Text numberOfLines={2} style={styles.orderProducts}>{order.products.map(product => product.name).join(', ')}</Text>
                  <View style={styles.orderCardMeta}><Text style={styles.orderItemCount}>{order.products.length} {order.products.length === 1 ? 'item' : 'items'}</Text><Text numberOfLines={1} style={styles.orderAmount}>{order.amount}</Text></View>
                  <View style={[styles.orderStatusBadge, styles.orderCardStatusBadge, styles[`orderStatus${order.status}` as keyof typeof styles]]}><Text style={styles.orderStatusText}>{order.status}</Text></View>
                </View>
                {trackable ? <Pressable onPress={event => { event.stopPropagation(); openHistoryOrderAction(order, 'tracking'); }} style={[styles.orderSideAction, styles.orderSideTrack]}><Ionicons name="navigate-outline" size={24} color="#FFFFFF" /><Text style={styles.orderSideActionText}>Track</Text></Pressable> : returnEligible ? <Pressable onPress={event => { event.stopPropagation(); openHistoryOrderAction(order, 'return'); }} style={[styles.orderSideAction, styles.orderSideReturn]}><Ionicons name="return-down-back-outline" size={24} color="#FFFFFF" /><Text style={styles.orderSideActionText}>Return</Text></Pressable> : null}
              </Pressable>})}
            </View>
          </View> : screen === 'offers' ? <View style={styles.offersPage}>
            <View style={styles.offersHeadingBlock}>
              <Text style={styles.offersHeading}>Offers &amp; Discounts</Text>
              <Text style={styles.offersSubtitle}>Explore special collections selected for you</Text>
            </View>
            <View style={styles.offersGrid}>
              {offerCollections.map(offer => <Pressable key={`offer-${offer.id}`} onPress={() => {
                if (offer.category) openCategoryCollection(offer.category, offer.category.items[0] ?? offer.category, 'offers');
                else openProduct(offer.product);
              }} style={styles.offerCard}>
                <Image source={offer.image} style={styles.offerCardImage} resizeMode="cover" />
                <View style={styles.offerCardShade} />
                <View style={styles.offerCardCopy}><Text numberOfLines={2} style={styles.offerCardTitle}>{offer.title}</Text><Text style={styles.offerCardAction}>SHOP NOW</Text></View>
              </Pressable>)}
            </View>
          </View> : screen === 'wishlist' ? <>
            <View style={styles.wishlistHeadingBlock}>
              <Text style={styles.wishlistHeading}>My Wishlist</Text>
              <Text style={styles.wishlistCount}>{wishlistProducts.length} {wishlistProducts.length === 1 ? 'product' : 'products'}</Text>
            </View>
            {wishlistProducts.length ? <View style={styles.wishlistGrid}>
              {wishlistProducts.map(item => <WishlistCard key={`wishlist-${item.id}`} item={item} width={wishlistCardWidth} onOpen={() => openProduct(item)} onRemove={() => toggleFavorite(item)} onAdd={() => addToCart(item)} />)}
            </View> : <View style={styles.wishlistEmpty}>
              <Ionicons name="heart-outline" size={52} color={palette.blue} />
              <Text style={styles.wishlistEmptyTitle}>Your wishlist is empty</Text>
              <Text style={styles.wishlistEmptyCopy}>Tap the heart on a product to save it here.</Text>
              <Pressable onPress={() => setScreen('home')} style={styles.wishlistShopButton}><Text style={styles.wishlistShopButtonText}>Continue shopping</Text></Pressable>
            </View>}
          </> : screen === 'categories' ? <CategoriesPage
            menuItems={filteredShopifyMenuItems}
            previews={shopifyCollectionPreviews}
            onSelectCollection={(category, collection) => {
              openCategoryCollection(category, collection, 'categories');
            }}
          /> : null}
        </Animated.ScrollView>
        {screen === 'home' && keyboardVisible && searchQuery.trim() ? <View style={styles.searchSuggestions}>{searchLoading && !searchMatches.length ? <View style={styles.searchSuggestionLoading}><RotatingSearchIcon /></View> : searchError ? <Text style={styles.searchNoSuggestions}>{searchError}</Text> : searchMatches.slice(0, 2).map(product => <Pressable key={`suggestion-${product.id}`} onPress={() => { setSearchQuery(''); Keyboard.dismiss(); openProduct(product); }} style={styles.searchSuggestion}><Image source={product.image} style={styles.searchSuggestionImage} resizeMode="contain" /><View style={styles.searchSuggestionCopy}><Text numberOfLines={1} style={styles.searchSuggestionName}>{product.name}</Text><Text style={styles.searchSuggestionPrice}>{product.price}</Text></View><Ionicons name="chevron-forward" size={18} color={palette.blue} /></Pressable>)}{!searchLoading && !searchError && !searchMatches.length ? <Text style={styles.searchNoSuggestions}>No products match this title or SKU</Text> : null}</View> : null}
        <Animated.View style={[styles.floatingFooter, collapseBrowseChrome && { opacity: homeFooterOpacity, transform: [{ translateY: homeFooterTranslateY }] }]}> 
          <Pressable onPress={() => openFooterPage('home')} style={[styles.footerTab, activeFooterTab === 'home' && styles.footerTabSelected]}>
            <Ionicons name={activeFooterTab === 'home' ? 'home' : 'home-outline'} size={25} color={activeFooterTab === 'home' ? palette.blue : palette.muted} />
            <Text style={[styles.footerTabText, activeFooterTab === 'home' && styles.footerTabActive]}>Home</Text>
          </Pressable>
          <Pressable onPress={() => openFooterPage('categories')} style={[styles.footerTab, activeFooterTab === 'categories' && styles.footerTabSelected]}>
            <Ionicons name={activeFooterTab === 'categories' ? 'grid' : 'grid-outline'} size={25} color={activeFooterTab === 'categories' ? palette.blue : palette.muted} />
            <Text style={[styles.footerTabText, activeFooterTab === 'categories' && styles.footerTabActive]}>Categories</Text>
          </Pressable>
          <Pressable onPress={() => openFooterPage('orders')} style={[styles.footerTab, activeFooterTab === 'orders' && styles.footerTabSelected]}>
            <Ionicons name={activeFooterTab === 'orders' ? 'bag-handle' : 'bag-handle-outline'} size={25} color={activeFooterTab === 'orders' ? palette.blue : '#555'} />
            <Text style={[styles.footerTabText, activeFooterTab === 'orders' && styles.footerTabActive]}>Orders</Text>
          </Pressable>
          <Pressable onPress={() => openFooterPage('wishlist')} style={[styles.footerTab, activeFooterTab === 'wishlist' && styles.footerTabSelected]}>
            <Ionicons name={activeFooterTab === 'wishlist' ? 'heart' : 'heart-outline'} size={25} color={activeFooterTab === 'wishlist' ? palette.blue : '#555'} />
            <Text style={[styles.footerTabText, activeFooterTab === 'wishlist' && styles.footerTabActive]}>Wishlist</Text>
          </Pressable>
          <Pressable onPress={openOffers} style={[styles.footerTab, styles.offersFooterTab, activeFooterTab === 'offers' && styles.footerTabSelected]}>
            <View style={styles.offersFooterBadge}><Image source={footerDiscountTag} style={styles.offersFooterImage} resizeMode="contain" /></View>
          </Pressable>
        </Animated.View>
      </Animated.View>
      <Modal visible={pincodeModalVisible} transparent animationType="none" onRequestClose={closePincodeModal}>
        <Animated.View style={[styles.modalBackdrop, { opacity: pincodeModalProgress }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closePincodeModal} />
          <Animated.View style={{ transform: [{ translateY: pincodeModalTranslateY }, { scale: pincodeModalScale }] }}><Pressable style={styles.pincodeModal} onPress={() => {}}>
            <Text style={styles.pincodeTitle}>Check delivery availability</Text>
            <Text style={styles.pincodeCopy}>Enter your pincode to see whether delivery is available in your area.</Text>
            <TextInput value={pincode} onChangeText={setPincode} keyboardType="number-pad" maxLength={6} placeholder="Enter 6 digit pincode" placeholderTextColor="#8D8D8D" style={styles.pincodeInput} />
            <Pressable onPress={() => { setDeliveryPincode(pincode); closePincodeModal(); }} style={styles.pincodeCheck}><Text style={styles.pincodeCheckText}>Check</Text></Pressable>
          </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>
      <Modal visible={Boolean(selectedHistoryOrder)} transparent animationType="slide" onRequestClose={closeHistoryOrder}>
        <View style={styles.orderModalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeHistoryOrder} />
          <View style={styles.orderDetailsSheet}>
            <View style={styles.orderDetailsHeader}><Text style={styles.orderDetailsTitle}>Order details</Text><Pressable onPress={closeHistoryOrder}><Ionicons name="close" size={25} color={palette.heading} /></Pressable></View>
            <ScrollView ref={orderDetailsScrollRef} showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled" bounces alwaysBounceVertical decelerationRate="normal" scrollEventThrottle={16} overScrollMode="auto" contentContainerStyle={styles.orderDetailsContent}>
            <View style={styles.orderKeyValueBlock}>
              <View style={styles.orderKeyValueRow}><Text style={styles.orderDetailKey}>Order ID</Text><Text style={styles.orderDetailValue}>{selectedHistoryOrder?.id}</Text></View>
              <View style={styles.orderKeyValueRow}><Text style={styles.orderDetailKey}>Order date</Text><Text style={styles.orderDetailValue}>{selectedHistoryOrder?.date}</Text></View>
              <View style={styles.orderKeyValueRow}><Text style={styles.orderDetailKey}>Number of items</Text><Text style={styles.orderDetailValue}>{selectedHistoryOrder?.products.length}</Text></View>
              <View style={styles.orderKeyValueRow}><Text style={styles.orderDetailKey}>Order amount</Text><Text style={styles.orderDetailValue}>{selectedHistoryOrder?.amount}</Text></View>
              <View style={styles.orderKeyValueRow}><Text style={styles.orderDetailKey}>Payment method</Text><Text style={styles.orderDetailValue}>Online payment</Text></View>
            </View>
            <Text style={styles.orderDetailSectionTitle}>Products</Text>
            {selectedHistoryOrder?.products.map(product => <Pressable key={`order-detail-${product.id}`} onPress={() => { closeHistoryOrder(); openProduct(product); }} style={styles.orderDetailProduct}>
              <Image source={product.image} style={styles.orderDetailImage} resizeMode="contain" />
              <View style={styles.orderDetailCopy}><Text numberOfLines={2} style={styles.orderDetailName}>{product.name}</Text><Text style={styles.orderDetailPrice}>{product.price}</Text></View>
              <Ionicons name="chevron-forward" size={19} color={palette.muted} />
            </Pressable>)}
            <View style={styles.orderShippingBlock}><View style={styles.orderShippingHeading}><Ionicons name="location-outline" size={19} color={palette.blue} /><Text style={styles.orderShippingTitle}>Shipping address</Text></View><Text style={styles.orderShippingAddress}>{selectedHistoryOrder?.shippingAddress}</Text></View>
            <View style={styles.orderStatusSection}><Text style={styles.orderDetailKey}>Order status</Text><View style={[styles.orderStatusBadge, selectedHistoryOrder && styles[`orderStatus${selectedHistoryOrder.status}` as keyof typeof styles]]}><Text style={styles.orderStatusText}>{selectedHistoryOrder?.status}</Text></View></View>
            {orderDetailLoading ? <View style={styles.orderActionLoading}><ActivityIndicator size="small" color={palette.blue} /><Text style={styles.orderActionLoadingText}>Loading order information…</Text></View> : null}
            {orderDetailMode === 'tracking' ? <View style={styles.trackingPanel}><Text style={styles.orderDetailSectionTitle}>Tracking progress</Text>{['Order confirmed', 'Packed and ready', 'Shipped', 'In transit', 'Delivered'].map((stage, index) => { const active = selectedHistoryOrder?.status === 'Shipped' ? index <= 2 : index <= 1; return <View key={stage} style={styles.trackingStage}><View style={styles.trackingRail}><View style={[styles.trackingDot, active && styles.trackingDotActive]}>{active ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}</View>{index < 4 ? <View style={[styles.trackingLine, active && styles.trackingLineActive]} /> : null}</View><Text style={[styles.trackingStageText, active && styles.trackingStageTextActive]}>{stage}</Text></View>; })}</View> : null}
            {orderDetailMode === 'return' ? <View style={styles.returnPanel}>
              <Text style={styles.orderDetailSectionTitle}>Return request</Text>
              <Text style={styles.returnFieldLabel}>Return policy</Text>
              <Pressable onPress={() => setReturnPolicyOpen(value => !value)} style={styles.returnPolicySelect}><Text style={styles.returnPolicyValue}>7-day return policy</Text><Ionicons name={returnPolicyOpen ? 'chevron-up' : 'chevron-down'} size={19} color={palette.ink} /></Pressable>
              {returnPolicyOpen ? <View style={styles.returnPolicyCopy}><Text style={styles.returnPolicyText}>Eligible items can be returned within seven days of delivery. Products must include their original packaging and accessories.</Text></View> : null}
              <Text style={styles.returnFieldLabel}>Reason for return</Text>
              <TextInput value={returnReason} onChangeText={setReturnReason} multiline textAlignVertical="top" placeholder="Tell us why you want to return this order" placeholderTextColor="#8B929D" style={styles.returnReasonInput} />
              <Text style={styles.returnFieldLabel}>Product pictures</Text>
              <Pressable onPress={pickReturnPictures} style={styles.returnUploadButton}><Ionicons name="images-outline" size={20} color={palette.blue} /><Text style={styles.returnUploadText}>Upload pictures</Text></Pressable>
              {returnImages.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.returnImageRow}>{returnImages.map((uri, index) => <View key={`${uri}-${index}`}><Image source={{ uri }} style={styles.returnImage} /><Pressable onPress={() => setReturnImages(current => current.filter((_, imageIndex) => imageIndex !== index))} style={styles.returnImageRemove}><Ionicons name="close" size={13} color="#FFFFFF" /></Pressable></View>)}</ScrollView> : null}
              <Pressable disabled={!returnReason.trim()} onPress={() => { Alert.alert('Return requested', 'Your return request has been submitted.'); closeHistoryOrder(); }} style={[styles.returnSubmitButton, !returnReason.trim() && styles.returnSubmitDisabled]}><Text style={styles.returnSubmitText}>Submit return request</Text></Pressable>
            </View> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {cartPopupVisible ? <CartPopup item={cartPreview} count={cartCount} onOpen={openCart} containerStyle={{ paddingBottom: floatingCartBottom }} /> : null}
      <HelpFab cartBottom={floatingCartBottom} />
      {collapseBrowseChrome ? <View pointerEvents="none" style={[styles.bottomSafeFill, { height: insets.bottom }]} /> : null}
      {openingAnimationVisible ? <View pointerEvents="none" style={styles.openingAnimationOverlay}>
        <View style={styles.openingSequenceGroup}>
          <View style={styles.openingRoute}>
            <Animated.View style={[styles.openingSequenceVehicle, { opacity: openingFlightOpacity, transform: [{ translateX: openingFlightTranslateX }] }]}><Ionicons name="airplane" size={42} color={palette.blue} /></Animated.View>
            <Animated.View style={[styles.openingSequenceVehicle, { opacity: openingTruckOpacity, transform: [{ translateX: openingTruckTranslateX }] }]}><MaterialCommunityIcons name="truck-fast-outline" size={42} color={palette.red} /></Animated.View>
            <View style={styles.openingBox}>
              <Animated.View style={[styles.openingCartonIcon, { opacity: openingClosedBoxOpacity }]}><MaterialCommunityIcons name="package-variant-closed" size={42} color="#B97435" /></Animated.View>
              <Animated.View style={[styles.openingCartonIcon, { opacity: openingOpenBoxOpacity, transform: [{ translateY: openingBoxLift }] }]}><MaterialCommunityIcons name="package-variant" size={42} color="#B97435" /></Animated.View>
            </View>
          </View>
          <Text style={styles.openingAnimationMessage}>All the way from the USA to your doorstep.</Text>
        </View>
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
  backRevealPage: { flex: 1 },
  homeEntranceBackground: { backgroundColor: '#0A254A' },
  loginEntrance: { flex: 1 },
  openingAnimationOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, overflow: 'hidden', alignItems: 'center', backgroundColor: '#0A254A' },
  openingSequenceGroup: { position: 'absolute', top: '50%', left: 0, right: 0, marginTop: -87, height: 134, alignItems: 'center', justifyContent: 'center' },
  openingRoute: { width: 260, height: 70, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  openingSequenceVehicle: { position: 'absolute' },
  openingBox: { position: 'absolute', width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  openingAnimationMessage: { marginTop: 12, paddingHorizontal: 24, color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, fontStyle: 'italic', textAlign: 'center' },
  openingVehicle: { position: 'absolute' },
  homeCollapsibleHeader: { overflow: 'hidden', backgroundColor: '#0A254A' },
  profileEntrance: { flex: 1, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  profileHeader: { height: 82, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0A254A', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#294565' },
  profileHeaderCopy: { flex: 1, marginHorizontal: 14 },
  profileHeaderTitle: { color: palette.white, fontFamily: 'Inter_400Regular', fontSize: 18, fontWeight: '900' },
  profileHeaderSubtitle: { marginTop: 3, color: '#B9D6FF', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '700' },
  profileHeaderAccount: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
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
  addAddressText: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '500', fontStyle: 'italic', textDecorationLine: 'underline' },
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
  carouselFade: { minHeight: 307, marginTop: 18, marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: 'transparent' },
  carouselLoading: { height: 307, marginHorizontal: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A254A' },
  carouselLoadingText: { color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '600' },
  cartonLoader: { width: 66, height: 58, alignItems: 'center', justifyContent: 'flex-end' },
  openingCarton: { width: 46, height: 46 },
  openingCartonIcon: { position: 'absolute', left: 0, top: 0 },
  zigzagPartition: { height: 14, marginHorizontal: 0, flexDirection: 'row', overflow: 'hidden', backgroundColor: homeChrome },
  bottomSafeFill: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 25, backgroundColor: '#F5F5F5' },
  zigzagTooth: { width: 16, height: 16, marginHorizontal: 1, marginTop: 6, backgroundColor: palette.white, transform: [{ rotate: '45deg' }] },
  staticSearchZone: { paddingTop: 0, paddingBottom: 8, overflow: 'visible', backgroundColor: homeChrome, zIndex: 100, elevation: 20 },
  searchBox: { height: 50, marginHorizontal: 16, borderWidth: 1, borderColor: '#AEB7C3', borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: palette.white },
  searchInputWrap: { flex: 1, height: '100%', justifyContent: 'center', overflow: 'hidden' },
  searchAnimatedPlaceholder: { position: 'absolute', left: 0, color: '#9B9B9B', fontFamily: 'Inter_400Regular', fontSize: 12 },
  searchInput: { flex: 1, padding: 0, fontFamily: 'Inter_400Regular', fontSize: 12, color: palette.ink },
  searchSuggestions: { position: 'absolute', left: 28, right: 28, top: 174, overflow: 'hidden', zIndex: 500, borderWidth: 1, borderColor: '#D5DBE3', borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 50 },
  searchSuggestionLoading: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  searchSuggestion: { minHeight: 62, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3E7EC' },
  searchSuggestionImage: { width: 46, height: 46, borderRadius: 7, backgroundColor: '#F7F8FA' },
  searchSuggestionCopy: { flex: 1, marginHorizontal: 10 },
  searchSuggestionName: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  searchSuggestionPrice: { marginTop: 3, color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '900' },
  searchNoSuggestions: { padding: 16, color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center' },
  searchResultsHeader: { height: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A254A', borderBottomWidth: 1, borderBottomColor: '#294565' },
  searchResultsHeaderCopy: { flex: 1, marginHorizontal: 14 },
  searchResultsHeaderTitle: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 18, fontWeight: '900' },
  searchResultsHeaderSubtitle: { marginTop: 3, color: '#B9D6FF', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '700' },
  searchResultsPage: { flex: 1, backgroundColor: '#FFFFFF' },
  searchResultsContent: { paddingBottom: 28 },
  searchControls: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  searchControl: { flex: 1, height: 42, minWidth: 0, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#D5DBE3', borderRadius: 10, backgroundColor: '#FFFFFF' },
  searchControlActive: { borderColor: palette.blue, backgroundColor: palette.blue },
  searchControlText: { flexShrink: 1, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '800' },
  searchControlTextActive: { color: '#FFFFFF' },
  searchFilterBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  searchFilterSheet: { height: '76%', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF' },
  searchFilterHeader: { height: 62, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E2E6EB' },
  searchFilterTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '900' },
  searchFilterBody: { flex: 1, minHeight: 0, paddingHorizontal: 18, paddingVertical: 10 },
  searchFilterPanel: { flex: 1, minHeight: 0 },
  searchFilterOptions: { flex: 1 },
  searchFilterOptionsContent: { paddingBottom: 8 },
  searchFilterSection: { marginBottom: 7, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '900' },
  searchFilterOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchCheckbox: { width: 22, height: 22, borderWidth: 1.5, borderColor: '#9BA5B2', borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  searchCheckboxActive: { borderColor: palette.blue, backgroundColor: palette.blue },
  searchFilterOptionText: { flex: 1, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '700' },
  searchFilterEmpty: { marginBottom: 8, color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 12 },
  searchFilterDivider: { height: 1, marginVertical: 10, backgroundColor: '#CBD3DC' },
  searchFilterActions: { height: 70, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#E2E6EB' },
  searchClearButton: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.blue, borderRadius: 9, backgroundColor: '#FFFFFF' },
  searchClearText: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  searchApplyButton: { flex: 1.5, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.blue },
  searchApplyText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  searchResultList: { paddingHorizontal: 14, paddingBottom: 24 },
  searchResultRow: { minHeight: 94, paddingVertical: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E8EC', backgroundColor: '#FFFFFF' },
  searchResultImage: { width: 72, height: 72, borderRadius: 9, backgroundColor: '#F7F8FA' },
  searchResultCopy: { flex: 1, marginHorizontal: 12 },
  searchResultTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  searchResultPrice: { marginTop: 6, color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '900' },
  searchLoadMore: { width: 150, height: 44, marginTop: 20, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.blue },
  searchLoadMoreDisabled: { opacity: 0.6 },
  searchLoadMoreText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
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
  homeProductSections: { paddingHorizontal: 12, backgroundColor: palette.white },
  shopCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, rowGap: 14 },
  shopCategoryItem: { width: '25%', paddingHorizontal: 5, alignItems: 'center' },
  shopCategoryImageBlock: { width: '100%', aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 5, elevation: 3 },
  shopCategoryImageClip: { width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  shopCategoryImage: { width: '100%', height: '100%', borderRadius: 12, transform: [{ scale: 1.24 }] },
  collectionArtwork: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  collectionArtworkHidden: { position: 'absolute', opacity: 0.01 },
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
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  dotActive: { width: 4, backgroundColor: palette.blue },
  sectionTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 19, fontWeight: '800', marginTop: 22, marginBottom: 12 },
  productCard: { marginBottom: 15 },
  collectionProductCard: { marginBottom: 0 },
  collectionProductVisual: { width: '100%', aspectRatio: 0.92, borderWidth: 1, borderColor: '#E7E7E7', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  collectionProductImage: { position: 'absolute', width: '94%', height: '94%' },
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
  notifyIconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  notifyTick: { position: 'absolute', top: -6, right: -8, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2E8B36' },
  notifyToast: { position: 'absolute', right: 0, bottom: '100%', minWidth: 122, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: '#1A1C1D', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 5 },
  notifyToastText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '700' },
  collectionProductName: { minHeight: 34, marginTop: 25, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  collectionPriceRow: { height: 46, marginTop: 3, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', alignItems: 'baseline', columnGap: 4, rowGap: 2, overflow: 'hidden' },
  collectionPrice: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '900' },
  collectionSalePrice: { color: '#D83434' },
  collectionOldPrice: { flexShrink: 1, color: '#666666', fontFamily: 'Inter_400Regular', fontSize: 10, textDecorationLine: 'line-through' },
  productRow: { gap: 5 },
  productVisual: { height: 109, borderRadius: 6, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, justifyContent: 'center', alignItems: 'center' },
  productImage: { position: 'absolute', width: '80%', height: '88%' },
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
  ordersPage: { width: '100%', paddingBottom: 16, backgroundColor: '#F6F7F9' },
  ordersHeadingBlock: { paddingHorizontal: 14, paddingTop: 20, paddingBottom: 15 },
  ordersHeading: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 22, fontWeight: '900' },
  orderList: { paddingHorizontal: 12, gap: 11 },
  orderRow: { minHeight: 116, padding: 10, borderWidth: 1, borderColor: '#E1E5EA', borderRadius: 13, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 2 },
  orderImage: { width: 68, height: 78, borderRadius: 9, backgroundColor: '#F7F8FA' },
  orderMain: { flex: 1, alignSelf: 'stretch', marginLeft: 10, paddingVertical: 3, paddingRight: 5 },
  orderId: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  orderDate: { marginTop: 3, color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '600' },
  orderProducts: { marginTop: 7, color: '#4D5562', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  orderCardMeta: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  orderItemCount: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 9, fontWeight: '800' },
  orderAmount: { flexShrink: 1, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '900' },
  orderStatusBadge: { maxWidth: 78, minHeight: 24, paddingHorizontal: 7, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  orderCardStatusBadge: { marginTop: 5, alignSelf: 'flex-start' },
  orderStatusDelivered: { backgroundColor: '#DDF4E2' },
  orderStatusShipped: { backgroundColor: '#E2ECFF' },
  orderStatusProcessing: { backgroundColor: '#FFF0C9' },
  orderStatusCancelled: { backgroundColor: '#FCE0DF' },
  orderStatusReturned: { backgroundColor: '#EEE4F8' },
  orderStatusText: { color: '#394150', fontFamily: 'Inter_400Regular', fontSize: 9, fontWeight: '900' },
  orderSideAction: { width: 68, height: 78, marginLeft: 9, borderRadius: 9, alignItems: 'center', justifyContent: 'center', gap: 6, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 4, elevation: 3 },
  orderSideTrack: { backgroundColor: '#2E8B36' },
  orderSideReturn: { backgroundColor: '#D83434' },
  orderSideActionText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  orderModalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  orderDetailsSheet: { height: '86%', paddingHorizontal: 18, paddingTop: 18, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF' },
  orderDetailsHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  orderDetailsTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 20, fontWeight: '900' },
  orderDetailsContent: { paddingTop: 15, paddingBottom: 30 },
  orderKeyValueBlock: { borderWidth: 1, borderColor: '#E1E5EA', borderRadius: 10, overflow: 'hidden' },
  orderKeyValueRow: { minHeight: 46, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E1E5EA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 15 },
  orderDetailKey: { color: '#667085', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '700' },
  orderDetailValue: { flex: 1, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900', textAlign: 'right' },
  orderDetailSectionTitle: { marginTop: 18, marginBottom: 7, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '900' },
  orderDetailsId: { marginTop: 3, color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  orderDetailsMeta: { marginTop: 16, marginBottom: 5, padding: 11, borderRadius: 9, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F3F5F8' },
  orderDetailsMetaText: { color: '#536071', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '700' },
  orderDetailProduct: { minHeight: 72, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#ECEEF1', flexDirection: 'row', alignItems: 'center' },
  orderDetailImage: { width: 55, height: 55, borderRadius: 8, backgroundColor: '#F7F8FA' },
  orderDetailCopy: { flex: 1, marginLeft: 10, paddingRight: 8 },
  orderDetailName: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 17, fontWeight: '800' },
  orderDetailPrice: { marginTop: 4, color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  orderDetailsTotal: { marginTop: 15, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#DDE1E6', flexDirection: 'row', justifyContent: 'space-between' },
  orderDetailsTotalLabel: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '800' },
  orderDetailsTotalValue: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 17, fontWeight: '900' },
  orderShippingBlock: { marginTop: 16, padding: 13, borderRadius: 10, backgroundColor: '#F3F5F8' },
  orderShippingHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderShippingTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '900' },
  orderShippingAddress: { marginTop: 8, color: '#536071', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  orderStatusSection: { minHeight: 58, marginTop: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E1E5EA', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderActionLoading: { height: 52, marginTop: 14, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#F2F5FA' },
  orderActionLoadingText: { color: '#536071', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  trackingPanel: { marginTop: 18, padding: 14, borderRadius: 12, backgroundColor: '#F5F8F6' },
  trackingStage: { minHeight: 58, flexDirection: 'row' },
  trackingRail: { width: 28, alignItems: 'center' },
  trackingDot: { width: 22, height: 22, borderWidth: 2, borderColor: '#B8C0CA', borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  trackingDotActive: { borderColor: '#2E8B36', backgroundColor: '#2E8B36' },
  trackingLine: { width: 2, flex: 1, backgroundColor: '#CFD5DC' },
  trackingLineActive: { backgroundColor: '#2E8B36' },
  trackingStageText: { marginLeft: 10, paddingTop: 2, color: '#7B8490', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '700' },
  trackingStageTextActive: { color: palette.heading, fontWeight: '900' },
  returnPanel: { marginTop: 18, padding: 14, borderRadius: 12, backgroundColor: '#FAFAFB' },
  returnFieldLabel: { marginTop: 12, marginBottom: 6, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  returnPolicySelect: { height: 46, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D7DBE1', borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' },
  returnPolicyValue: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '700' },
  returnPolicyCopy: { marginTop: 5, padding: 10, borderRadius: 8, backgroundColor: '#EEF3FF' },
  returnPolicyText: { color: '#536071', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  returnReasonInput: { minHeight: 110, padding: 12, borderWidth: 1, borderColor: '#D7DBE1', borderRadius: 9, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 13, backgroundColor: '#FFFFFF' },
  returnUploadButton: { height: 46, borderWidth: 1, borderStyle: 'dashed', borderColor: palette.blue, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#F7F9FF' },
  returnUploadText: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  returnImageRow: { gap: 9, paddingTop: 10 },
  returnImage: { width: 68, height: 68, borderRadius: 8 },
  returnImageRemove: { position: 'absolute', right: -5, top: -5, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.red },
  returnSubmitButton: { height: 46, marginTop: 16, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D83434' },
  returnSubmitDisabled: { opacity: 0.42 },
  returnSubmitText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  offersPage: { width: '100%', paddingBottom: 12, backgroundColor: '#FFFFFF' },
  offersHeadingBlock: { paddingHorizontal: 14, paddingTop: 20, paddingBottom: 15 },
  offersHeading: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 22, fontWeight: '900' },
  offersSubtitle: { marginTop: 5, color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  offersGrid: { paddingHorizontal: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  offerCard: { width: '48.3%', aspectRatio: 0.8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E8ECF2', shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 6, elevation: 4 },
  offerCardImage: { width: '100%', height: '100%' },
  offerCardShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.16)' },
  offerCardCopy: { position: 'absolute', left: 11, right: 9, bottom: 12 },
  offerCardTitle: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 19, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  offerCardAction: { marginTop: 5, color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  wishlistHeadingBlock: { paddingHorizontal: 12, paddingTop: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  wishlistHeading: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 22, fontWeight: '900' },
  wishlistCount: { color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '700' },
  wishlistGrid: { paddingHorizontal: 12, paddingBottom: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  wishlistCard: { padding: 9, borderWidth: 1, borderColor: '#E3E7EC', borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 5, elevation: 3 },
  wishlistProductLink: { flex: 1 },
  wishlistImageFrame: { width: '100%', aspectRatio: 1, padding: 8, overflow: 'hidden', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  wishlistDiscountBadge: { position: 'absolute', top: 7, left: 7, minHeight: 23, paddingHorizontal: 7, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D83434' },
  wishlistDiscountBadgeText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 9, fontWeight: '900' },
  wishlistImage: { width: '100%', height: '100%' },
  wishlistTitle: { minHeight: 38, marginTop: 9, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  wishlistPriceRow: { width: '100%', minHeight: 20, marginTop: 5, overflow: 'hidden', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'baseline', columnGap: 3 },
  wishlistPrice: { flexShrink: 1, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  wishlistOldPrice: { flexShrink: 1, color: '#777777', fontFamily: 'Inter_400Regular', fontSize: 8, textDecorationLine: 'line-through' },
  wishlistDiscount: { flexShrink: 1, color: palette.green, fontFamily: 'Inter_400Regular', fontSize: 9, fontWeight: '800' },
  wishlistAddButton: { height: 38, marginTop: 9, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: palette.blue },
  wishlistNotifyButton: { backgroundColor: '#B98725' },
  wishlistAddText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  wishlistRemoveButton: { height: 35, marginTop: 7, borderWidth: 1, borderColor: '#F0B9B7', borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#FFF6F5' },
  wishlistRemoveText: { color: palette.red, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  wishlistEmpty: { minHeight: 400, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  wishlistEmptyTitle: { marginTop: 13, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '900' },
  wishlistEmptyCopy: { marginTop: 6, color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  wishlistShopButton: { height: 42, marginTop: 18, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  wishlistShopButtonText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
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
  floatingFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, height: 70, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderTopWidth: 1, borderColor: '#D5DBE3' },
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
  helpMainClose: { backgroundColor: '#E53935' },
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
  cartCheckoutBar: { height: 70, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D5DBE3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F5F5' },
  cartTotalBlock: { flex: 1 },
  cartItemCount: { color: '#697386', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '700' },
  cartTotalText: { marginTop: 2, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 17, fontWeight: '900' },
  cartCheckoutButton: { height: 46, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  cartCheckoutText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '900' },
  footerTab: { flex: 1, alignSelf: 'stretch', borderTopWidth: 3, borderTopColor: 'transparent', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#F5F5F5' },
  footerTabSelected: { borderTopColor: palette.blue, backgroundColor: '#F5F5F5' },
  footerTabText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#555', fontWeight: '500' },
  footerTabActive: { color: palette.blue, fontWeight: '700' },
  offersFooterTab: { paddingHorizontal: 3 },
  offersFooterBadge: { alignSelf: 'stretch', height: 60, alignItems: 'center', justifyContent: 'center' },
  offersFooterImage: { width: 42, height: 42, shadowColor: '#9D1E1E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.24, shadowRadius: 4, elevation: 4 },
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
  reviewSection: { marginHorizontal: 14, marginTop: 18, padding: 14, borderWidth: 1, borderColor: '#DFE4EA', borderRadius: 12, backgroundColor: '#FFFFFF' },
  reviewHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewHeading: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 18, fontWeight: '900' },
  reviewSummary: { marginTop: 4, color: '#667085', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '700' },
  reviewPrompt: { marginTop: 18, marginBottom: 8, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  reviewStars: { flexDirection: 'row', gap: 8, marginBottom: 13 },
  reviewInput: { minHeight: 96, padding: 11, borderWidth: 1, borderColor: '#D7DCE3', borderRadius: 9, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 13, backgroundColor: '#FAFBFC' },
  reviewSubmit: { height: 42, marginTop: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  reviewSubmitText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  reviewListHeading: { marginTop: 22, marginBottom: 3, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '900' },
  productReviewCard: { paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DFE4EA' },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reviewName: { flex: 1, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  reviewCardRating: { color: '#F2A900', fontFamily: 'Inter_400Regular', fontSize: 12, letterSpacing: 1 },
  reviewBody: { marginTop: 7, color: '#596575', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  similarTitle: { marginHorizontal: 14, marginTop: 24, fontFamily: 'Inter_400Regular', fontSize: 20, fontWeight: '900' },
  similarSubtitle: { marginHorizontal: 14, marginTop: 4, color: '#667085', fontFamily: 'Inter_400Regular', fontSize: 12 },
  detailRecommendations: { gap: 12, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 0 },
  buyBar: { height: 70, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F5F5', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D5DBE3' },
  buyBarPrice: { marginTop: 2, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '900' },
  buyBarTax: { marginTop: 2, color: '#667085', fontFamily: 'Inter_400Regular', fontSize: 10 },
  addLarge: { width: '56%', height: 46, borderRadius: 10, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
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
