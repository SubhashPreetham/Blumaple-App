import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NotificationToastProvider, useNotificationToast } from './src/NotificationToast';
import {
  Alert,
  ActivityIndicator,
  Animated,
  AppState,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
  Keyboard,
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
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchShopifyCollectionFilters, fetchShopifyCollectionPreviews, fetchShopifyCollectionProducts, fetchShopifyMainMenu, fetchShopifyProducts, searchShopifyProducts, ShopifyCollectionPreview, ShopifyMenuItem, ShopifyProduct, ShopifyProductFilter } from './src/shopify';
import { CheckoutPage } from './pages/CheckoutPage';
import { AddressPage } from './pages/AddressPage';
import { OrderResultPage } from './pages/OrderResultPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryCollectionPage } from './pages/CategoryCollectionPage';
import { DashboardPage } from './pages/DashboardPage';
import { SkippableLoginPage } from './pages/SkippableLoginPage';
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

const SEARCH_PLACEHOLDERS = ['Wireless headphones', 'Bluetooth speakers', 'Smart watches', 'Digital cameras', 'Mobile cases', 'Gaming keyboards', 'Computer monitors', 'USB accessories', 'System components'];
const CAROUSEL_INTERVAL_MS = 3000;
const CHECKOUT_ADDRESS_KEY = 'blumaple.checkout.address.v1';

const BOTTOM_NAV_HEIGHT = 70;
const FLOATING_CART_GAP = 12;
const FLOATING_CART_HEIGHT = 58;
const FLOATING_CONTROL_GAP = 12;
const WISHLIST_ACTIVE_COLOR = '#E53935';
const homeChrome = '#D3DDEA';
const footerDiscountTag = require('./assets/ui/offers.png');
const OFFER_DEAL_THEMES = [
  { colors: ['#162C63', '#3269C9'] as const, discount: 'UP TO 40% OFF', caption: 'Fresh picks, better prices' },
  { colors: ['#A3264D', '#E85D68'] as const, discount: 'SAVE 30%', caption: 'Member deal' },
  { colors: ['#6A3BA3', '#A166D4'] as const, discount: 'UP TO 35% OFF', caption: 'Limited-time drop' },
  { colors: ['#0D786E', '#22A895'] as const, discount: 'SAVE 25%', caption: 'Only this week' },
  { colors: ['#B05217', '#EA9142'] as const, discount: 'UP TO 50% OFF', caption: 'Big value picks' },
  { colors: ['#244B87', '#5B91D7'] as const, discount: 'SAVE 20%', caption: 'Handpicked for you' },
  { colors: ['#7D324E', '#C95F7F'] as const, discount: 'UP TO 30% OFF', caption: 'Trending now' },
  { colors: ['#386B36', '#71A850'] as const, discount: 'SAVE 15%', caption: 'Everyday essentials' },
];

type Product = {
  id: string;
  variantId?: string;
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

type ProductTransitionOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CartItem = { product: Product; quantity: number };
type HistoryOrder = { id: string; date: string; products: Product[]; amount: string; status: 'Delivered' | 'Shipped' | 'Processing' | 'Cancelled' | 'Returned'; deliveredAt?: string; shippingAddress: string };
type OrderOutcome = { success: boolean; orderId?: string; items: CartItem[]; paymentMethod: 'online' | 'cod'; total: number; tax: number; codFee: number };
type ReturnScreen = 'home' | 'categories' | 'categoryCollection' | 'wishlist' | 'offers' | 'orders' | 'search' | 'discoverySearch' | 'homeProducts' | 'product' | 'cart';

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

type HomeHeroTheme = {
  colors: readonly [string, string, string, string, string];
  locations: readonly [number, number, number, number, number];
};

const HOME_HERO_THEMES: Record<string, HomeHeroTheme> = {
  Audio: { colors: ['#071D3D', '#0C3159', '#1E5A86', '#72A8C8', '#DCEAF3'], locations: [0, 0.24, 0.49, 0.75, 1] },
  Capture: { colors: ['#301712', '#592A20', '#8C503A', '#C58A68', '#F0D9C8'], locations: [0, 0.24, 0.49, 0.75, 1] },
  Computers: { colors: ['#11182B', '#1E2F52', '#345A82', '#7796B2', '#D9E5EE'], locations: [0, 0.24, 0.49, 0.75, 1] },
  'Smart Tech': { colors: ['#151537', '#27235D', '#435A91', '#7E9FC1', '#DCE8F1'], locations: [0, 0.24, 0.49, 0.75, 1] },
  Home: { colors: ['#183227', '#2D5143', '#5D806D', '#9DB8A4', '#E3ECE4'], locations: [0, 0.24, 0.49, 0.75, 1] },
  Lifestyle: { colors: ['#32172F', '#5A2D59', '#875B82', '#B793AF', '#EADDE8'], locations: [0, 0.24, 0.49, 0.75, 1] },
  Industry: { colors: ['#282016', '#51412B', '#7A6746', '#AD9871', '#E8E0D0'], locations: [0, 0.24, 0.49, 0.75, 1] },
};

function getHomeHeroTheme(category: string): HomeHeroTheme {
  if (HOME_HERO_THEMES[category]) return HOME_HERO_THEMES[category]!;
  const normalized = category.toLowerCase();
  if (normalized.includes('camera') || normalized.includes('capture')) return HOME_HERO_THEMES.Capture!;
  if (normalized.includes('computer')) return HOME_HERO_THEMES.Computers!;
  if (normalized.includes('smart') || normalized.includes('watch')) return HOME_HERO_THEMES['Smart Tech']!;
  if (normalized.includes('home')) return HOME_HERO_THEMES.Home!;
  if (normalized.includes('life')) return HOME_HERO_THEMES.Lifestyle!;
  if (normalized.includes('industr')) return HOME_HERO_THEMES.Industry!;
  return HOME_HERO_THEMES.Audio!;
}

function HomeHeroBackground({ category }: { category: string }) {
  const incomingTheme = getHomeHeroTheme(category);
  const [outgoingTheme, setOutgoingTheme] = useState(incomingTheme);
  const [activeTheme, setActiveTheme] = useState(incomingTheme);
  const activeThemeRef = useRef(incomingTheme);
  const transition = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const nextTheme = getHomeHeroTheme(category);
    setOutgoingTheme(activeThemeRef.current);
    setActiveTheme(nextTheme);
    activeThemeRef.current = nextTheme;
    transition.stopAnimation();
    transition.setValue(0);
    const animation = Animated.timing(transition, { toValue: 1, duration: 480, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [category, transition]);

  return <View pointerEvents="none" style={styles.homeChromeGradient}>
    <LinearGradient colors={outgoingTheme.colors} locations={outgoingTheme.locations} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: transition }]}><LinearGradient colors={activeTheme.colors} locations={activeTheme.locations} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} /></Animated.View>
  </View>;
}

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
    variantId: variant?.id,
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
  const toast = useNotificationToast();
  const [notified, setNotified] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const notify = () => {
    if (timer.current) clearTimeout(timer.current);
    if (notified) {
      toast.hide();
      setNotified(false);
      setShowMessage(false);
      timer.current = null;
      return;
    }
    setNotified(true);
    toast.show();
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
  </>;
}

function ProductCard({ item, width, favorite, quantity = 0, onFavorite, onAdd, onChangeQuantity, onOpen, showFavorite = true, collectionLayout = false, recommendationLayout = false, compactLayout = false }: { item: Product; width: number; favorite: boolean; quantity?: number; onFavorite: () => void; onAdd: () => void; onChangeQuantity?: (change: number) => void; onOpen?: (origin?: ProductTransitionOrigin) => void; showFavorite?: boolean; collectionLayout?: boolean; recommendationLayout?: boolean; compactLayout?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const notifyConfirmation = useNotifyConfirmation();
  const visualRef = useRef<View>(null);
  useEffect(() => setImageFailed(false), [item.image]);
  const openFromCard = () => {
    if (!onOpen) return;
    visualRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      if (measuredWidth && measuredHeight) onOpen({ x, y, width: measuredWidth, height: measuredHeight });
      else onOpen();
    });
  };
  if (collectionLayout) {
    const availableForSale = item.availableForSale ?? true;
    return <View style={[styles.collectionProductCard, recommendationLayout && styles.detailRecommendationCard, { width }]}> 
      <Pressable ref={visualRef} onPress={openFromCard} style={[styles.collectionProductVisual, recommendationLayout && styles.detailRecommendationVisual]}>
        {imageFailed ? <Ionicons name="image-outline" size={34} color="#A7B0BC" /> : <Image source={item.image} style={[styles.collectionProductImage, !availableForSale && styles.collectionUnavailable]} resizeMode="contain" onError={() => setImageFailed(true)} />}
        {availableForSale && item.discount ? <View style={styles.collectionDiscountBadge}><Text numberOfLines={1} style={styles.collectionDiscountText}>{item.discount}</Text></View> : null}
        {!availableForSale ? <View style={styles.collectionComingSoon}><Text style={styles.collectionComingSoonText}>Coming soon</Text></View> : null}
        {showFavorite ? <Pressable hitSlop={10} onPress={onFavorite} style={styles.collectionHeart}><Ionicons name={favorite ? 'heart' : 'heart-outline'} size={19} color={favorite ? WISHLIST_ACTIVE_COLOR : palette.ink} /></Pressable> : null}
      </Pressable>
      <View style={[styles.collectionUnitRow, recommendationLayout && styles.detailRecommendationUnitRow, compactLayout && styles.collectionPageCompactUnitRow]}>{availableForSale && quantity > 0 ? <View style={[styles.collectionImageAction, styles.collectionQuantityAction, recommendationLayout && styles.detailRecommendationAction, compactLayout && styles.collectionPageCompactAction]}><Pressable hitSlop={8} onPress={() => onChangeQuantity?.(-1)} style={styles.cardQuantityTap}><Ionicons name="remove" size={13} color="#FFFFFF" /></Pressable><Text style={styles.cardQuantityText}>{quantity}</Text><Pressable hitSlop={8} onPress={() => onChangeQuantity?.(1)} style={styles.cardQuantityTap}><Ionicons name="add" size={13} color="#FFFFFF" /></Pressable></View> : <Pressable onPress={availableForSale ? onAdd : notifyConfirmation.notify} style={({ pressed }) => [styles.collectionImageAction, recommendationLayout && styles.detailRecommendationAction, compactLayout && styles.collectionPageCompactAction, !availableForSale && styles.collectionNotifyAction, !availableForSale && notifyConfirmation.notified && styles.collectionNotifiedAction, pressed && styles.pressed]}>{availableForSale ? <Text style={styles.collectionImageActionText}>ADD</Text> : <NotifyConfirmation notified={notifyConfirmation.notified} showMessage={notifyConfirmation.showMessage} color="#2E8B36" />}</Pressable>}</View>
      <View style={[styles.collectionPriceRow, recommendationLayout && styles.detailRecommendationPriceRow, compactLayout && styles.collectionPageCompactPriceRow, !availableForSale && styles.collectionUnavailable]}><Text style={[styles.collectionPrice, recommendationLayout && styles.detailRecommendationPrice, compactLayout && styles.collectionPageCompactPrice]}>{item.price}</Text>{item.oldPrice ? <Text numberOfLines={1} style={[styles.collectionOldPrice, recommendationLayout && styles.detailRecommendationOldPrice]}>{item.oldPrice}</Text> : null}</View>
      <Text numberOfLines={recommendationLayout || compactLayout ? 2 : 3} style={[styles.collectionProductName, recommendationLayout && styles.detailRecommendationName, compactLayout && styles.collectionPageCompactName, !availableForSale && styles.collectionUnavailable]}>{item.name}</Text>
    </View>
  }
  return (
    <View style={[styles.productCard, { width }]}>
      <Pressable ref={visualRef} onPress={openFromCard} style={styles.productVisual}>
        {imageFailed ? <Ionicons name="image-outline" size={30} color="#A7B0BC" /> : <Image source={item.image} style={styles.productImage} resizeMode="contain" onError={() => setImageFailed(true)} />}
        {item.discount ? <View style={styles.productDiscountBadge}><Text numberOfLines={1} style={styles.collectionDiscountText}>{item.discount}</Text></View> : null}
        {showFavorite ? <Pressable accessibilityRole="button" accessibilityLabel={`Favorite ${item.name}`} hitSlop={10} onPress={onFavorite} style={styles.heart}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={25} color={favorite ? WISHLIST_ACTIVE_COLOR : palette.blue} />
        </Pressable> : null}
      </Pressable>
      <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{item.price}</Text>
        <Text style={styles.oldPrice}>{item.oldPrice}</Text>
      </View>
      {quantity > 0 ? <View style={[styles.cartButton, styles.productCardQuantityButton]}><Pressable hitSlop={8} onPress={() => onChangeQuantity?.(-1)} style={styles.cardQuantityTap}><Ionicons name="remove" size={16} color="#FFFFFF" /></Pressable><Text style={styles.cardQuantityText}>{quantity}</Text><Pressable hitSlop={8} onPress={() => onChangeQuantity?.(1)} style={styles.cardQuantityTap}><Ionicons name="add" size={16} color="#FFFFFF" /></Pressable></View> : <Pressable accessibilityRole="button" onPress={onAdd} style={({ pressed }) => [styles.cartButton, pressed && styles.pressed]}><Text style={styles.cartButtonText}>Add to cart</Text></Pressable>}
    </View>
  );
}

function SectionTitle({ children }: React.PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function HomeSectionHeader({ title, action = 'View all', showAction = true }: { title: string; action?: string; showAction?: boolean }) {
  return <View style={[styles.homeSectionHeader, !showAction && styles.homeSectionHeaderFull]}><Text numberOfLines={1} ellipsizeMode="clip" style={[styles.homeSectionTitle, !showAction && styles.homeSectionTitleFull]}>{title}</Text>{showAction ? <View style={styles.homeSectionAction}><Text style={styles.homeSectionActionText}>{action}</Text><Ionicons name="chevron-forward" size={14} color={palette.blue} /></View> : null}</View>;
}

function HomeProductListingPage({ title, products, favoriteIds, cartItems, cartCount, onBack, onFavorite, onAdd, onChangeCartQuantity, onOpen, onOpenSearch, onOpenCart, onOpenWishlist }: { title: string; products: Product[]; favoriteIds: Set<string>; cartItems: CartItem[]; cartCount: number; onBack: () => void; onFavorite: (product: Product) => void; onAdd: (product: Product) => void; onChangeCartQuantity: (productId: string, change: number) => void; onOpen: (product: Product, origin?: ProductTransitionOrigin) => void; onOpenSearch: () => void; onOpenCart: () => void; onOpenWishlist: () => void }) {
  const [sort, setSort] = useState<'Recommended' | 'Price: Low' | 'Price: High' | 'Name'>('Recommended');
  const [filter, setFilter] = useState<'All' | 'In stock' | 'On offer'>('All');
  const [panel, setPanel] = useState<'sort' | 'filter' | null>(null);
  const cardWidth = Math.max(96, (Math.min(Dimensions.get('window').width, 440) - 48) / 3);
  const visibleProducts = useMemo(() => {
    const result = products.filter(product => filter === 'All' || (filter === 'In stock' ? product.availableForSale !== false : Boolean(product.oldPrice)));
    if (sort === 'Price: Low') result.sort((a, b) => (a.unitPrice ?? 0) - (b.unitPrice ?? 0));
    if (sort === 'Price: High') result.sort((a, b) => (b.unitPrice ?? 0) - (a.unitPrice ?? 0));
    if (sort === 'Name') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [filter, products, sort]);
  const options = panel === 'sort' ? ['Recommended', 'Price: Low', 'Price: High', 'Name'] as const : ['All', 'In stock', 'On offer'] as const;
  const selectedOption = panel === 'sort' ? sort : filter;

  return <View style={styles.homeListingPage}>
    <View style={styles.homeListingHeader}><Pressable onPress={onBack} hitSlop={10} style={styles.homeListingBack}><Ionicons name="arrow-back" size={24} color={palette.white} /></Pressable><View style={styles.homeListingHeaderCopyBlock}><Text style={styles.homeListingHeaderTitle}>{title}</Text><Text style={styles.homeListingHeaderCopy}>{visibleProducts.length} products</Text></View><View style={styles.homeListingHeaderActions}><Pressable accessibilityRole="button" accessibilityLabel="Open search" onPress={onOpenSearch} style={styles.homeListingHeaderAction}><Ionicons name="search-outline" size={24} color={palette.white} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Open wishlist, ${favoriteIds.size} products`} onPress={onOpenWishlist} style={styles.homeListingHeaderAction}><Ionicons name={favoriteIds.size ? 'heart' : 'heart-outline'} size={23} color={palette.white} />{favoriteIds.size ? <View style={styles.homeListingBadge}><Text style={styles.homeListingBadgeText}>{favoriteIds.size > 99 ? '99+' : favoriteIds.size}</Text></View> : null}</Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Open cart, ${cartCount} items`} onPress={onOpenCart} style={styles.homeListingHeaderAction}><Ionicons name="bag-handle-outline" size={23} color={palette.white} />{cartCount ? <View style={styles.homeListingBadge}><Text style={styles.homeListingBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View> : null}</Pressable></View></View>
    <View style={styles.homeListingBody}>
      {visibleProducts.length ? <ScrollView showsVerticalScrollIndicator={false} bounces alwaysBounceVertical decelerationRate="normal" scrollEventThrottle={16} contentContainerStyle={styles.homeListingProductScroll}><View style={styles.homeListingProductGrid}>{visibleProducts.map(product => <ProductCard key={`${title}-${product.id}`} item={product} width={cardWidth} favorite={favoriteIds.has(product.id)} quantity={cartItems.find(item => item.product.id === product.id)?.quantity ?? 0} collectionLayout onFavorite={() => onFavorite(product)} onAdd={() => onAdd(product)} onChangeQuantity={change => onChangeCartQuantity(product.id, change)} onOpen={origin => onOpen(product, origin)} />)}</View></ScrollView> : <View style={styles.homeListingEmpty}><Ionicons name="cube-outline" size={45} color={palette.blue} /><Text style={styles.homeListingEmptyText}>No products match this filter.</Text></View>}
    </View>
    <View style={styles.homeListingBottomBar}><Pressable onPress={() => setPanel('filter')} style={styles.homeListingControl}><Ionicons name="options-outline" size={20} color={palette.heading} /><Text style={styles.homeListingControlText}>Filters{filter !== 'All' ? ` · ${filter}` : ''}</Text></Pressable><View style={styles.homeListingControlDivider} /><Pressable onPress={() => setPanel('sort')} style={styles.homeListingControl}><Ionicons name="swap-vertical" size={20} color={palette.heading} /><Text style={styles.homeListingControlText}>Sort{sort !== 'Recommended' ? ` · ${sort}` : ''}</Text></Pressable></View>
    <Modal visible={panel !== null} transparent animationType="slide" onRequestClose={() => setPanel(null)}><Pressable style={styles.homeListingModalBackdrop} onPress={() => setPanel(null)}><Pressable style={styles.homeListingSheet} onPress={() => {}}><View style={styles.homeListingSheetHeader}><Text style={styles.homeListingSheetTitle}>{panel === 'sort' ? 'Sort products' : 'Filter products'}</Text><Pressable onPress={() => setPanel(null)}><Ionicons name="close" size={25} color={palette.heading} /></Pressable></View>{options.map(option => <Pressable key={option} onPress={() => { if (panel === 'sort') setSort(option as typeof sort); else setFilter(option as typeof filter); setPanel(null); }} style={styles.homeListingOption}><Text style={[styles.homeListingOptionText, selectedOption === option && styles.homeListingOptionTextActive]}>{option}</Text><Ionicons name={selectedOption === option ? 'radio-button-on' : 'radio-button-off'} size={21} color={selectedOption === option ? palette.blue : palette.muted} /></Pressable>)}</Pressable></Pressable></Modal>
  </View>;
}

const TOP_SEARCHES = ['Headphones', 'Smart Watches', 'Cameras', 'Storage', 'Speakers', 'Mobile Cases'];

function ProductDiscoverySearchPage({ products, favoriteIds, cartItems, initialQuery, onBack, onSearch, onFavorite, onAdd, onChangeCartQuantity, onOpen }: { products: Product[]; favoriteIds: Set<string>; cartItems: CartItem[]; initialQuery?: string; onBack: () => void; onSearch: (query: string) => void; onFavorite: (product: Product) => void; onAdd: (product: Product) => void; onChangeCartQuantity: (productId: string, change: number) => void; onOpen: (product: Product, origin?: ProductTransitionOrigin) => void }) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const cardWidth = Math.max(96, (Math.min(Dimensions.get('window').width, 440) - 48) / 3);
  const typedQuery = query.trim().toLowerCase();
  const matchingProducts = useMemo(() => typedQuery ? products.filter(product => `${product.name} ${product.brand ?? ''} ${product.searchKeywords ?? ''}`.toLowerCase().includes(typedQuery)).slice(0, 9) : [], [products, typedQuery]);
  const matchingTerms = useMemo(() => typedQuery ? [...new Set([...TOP_SEARCHES, ...products.map(product => product.brand ?? ''), ...products.map(product => product.name)].map(term => term.trim()).filter(term => term.toLowerCase().startsWith(typedQuery)))].slice(0, 5) : [], [products, typedQuery]);
  const submit = (value = query) => {
    const search = value.trim();
    if (search) onSearch(search);
  };
  return <View style={styles.discoverySearchPage}>
    <View style={styles.discoverySearchHeader}><Pressable onPress={onBack} hitSlop={10} style={styles.discoverySearchBack}><Ionicons name="arrow-back" size={25} color={palette.heading} /></Pressable><Ionicons name="search-outline" size={20} color={palette.muted} /><TextInput autoFocus value={query} onChangeText={setQuery} onSubmitEditing={() => submit()} placeholder="Search products here" placeholderTextColor="#8A8F98" returnKeyType="search" style={styles.discoverySearchInput} />{query ? <Pressable onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={19} color={palette.muted} /></Pressable> : null}<Pressable onPress={() => submit()} hitSlop={8} style={styles.discoverySearchSubmit}><Ionicons name="arrow-forward" size={20} color={palette.white} /></Pressable></View>
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.discoverySearchContent}>
      {typedQuery ? <>{(matchingProducts.length || matchingTerms.length) ? <View style={styles.discoveryLiveSuggestionList}>{(matchingProducts.length ? matchingProducts.slice(0, 5).map(product => <Pressable key={`suggest-${product.id}`} onPress={() => setQuery(product.name)} style={styles.discoveryLiveSuggestion}><Image source={product.image} style={styles.discoveryLiveSuggestionImage} resizeMode="contain" /><Text numberOfLines={1} style={styles.discoveryLiveSuggestionText}>{product.name}</Text><Ionicons name="arrow-up-outline" size={16} color={palette.blue} /></Pressable>) : matchingTerms.map(term => <Pressable key={term} onPress={() => setQuery(term)} style={styles.discoveryLiveSuggestion}><Ionicons name="search-outline" size={18} color={palette.muted} /><Text numberOfLines={1} style={styles.discoveryLiveSuggestionText}>{term}</Text><Ionicons name="arrow-up-outline" size={16} color={palette.blue} /></Pressable>))}</View> : <Text style={styles.discoverySearchEmpty}>No suggestions yet. Keep typing to search the catalogue.</Text>}{matchingProducts.length ? <><Text style={styles.discoveryLiveResultsTitle}>Showing results for “{query.trim()}”</Text><View style={styles.discoveryProductGrid}>{matchingProducts.slice(0, 6).map(product => <ProductCard key={`live-${product.id}`} item={product} width={cardWidth} favorite={favoriteIds.has(product.id)} quantity={cartItems.find(item => item.product.id === product.id)?.quantity ?? 0} collectionLayout compactLayout onFavorite={() => onFavorite(product)} onAdd={() => onAdd(product)} onChangeQuantity={change => onChangeCartQuantity(product.id, change)} onOpen={origin => onOpen(product, origin)} />)}</View><Pressable onPress={() => submit()} style={styles.discoveryViewAll}><Text style={styles.discoveryViewAllText}>See all results</Text><Ionicons name="arrow-forward" size={17} color={palette.blue} /></Pressable></> : null}</> : <><Text style={styles.discoverySearchTitle}>Top Searches</Text><View style={styles.discoverySearchChips}>{TOP_SEARCHES.map(term => <Pressable key={term} onPress={() => submit(term)} style={({ pressed }) => [styles.discoverySearchChip, pressed && styles.pressed]}><Ionicons name="trending-up" size={17} color={palette.white} /><Text style={styles.discoverySearchChipText}>{term}</Text></Pressable>)}</View><Text style={[styles.discoverySearchTitle, styles.discoveryLovedTitle]}>People love these</Text><View style={styles.discoveryProductGrid}>{products.slice(0, 6).map(product => <ProductCard key={`discovery-${product.id}`} item={product} width={cardWidth} favorite={favoriteIds.has(product.id)} quantity={cartItems.find(item => item.product.id === product.id)?.quantity ?? 0} collectionLayout compactLayout onFavorite={() => onFavorite(product)} onAdd={() => onAdd(product)} onChangeQuantity={change => onChangeCartQuantity(product.id, change)} onOpen={origin => onOpen(product, origin)} />)}</View></>}
    </ScrollView>
  </View>;
}

function CarouselProgressIndicators({ count, activeIndex, fill }: { count: number; activeIndex: number; fill: Animated.Value }) {
  return <View style={styles.carouselProgressRow}>{Array.from({ length: count }).map((_, index) => index === activeIndex ? <View key={index} style={styles.carouselProgressTrack}><Animated.View style={[styles.carouselProgressFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} /></View> : <View key={index} style={styles.carouselProgressDot} />)}</View>;
}

function formatPromoTitle(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return title;
  const splitAt = Math.ceil(words.length / 2);
  return `${words.slice(0, splitAt).join(' ')}\n${words.slice(splitAt).join(' ')}`;
}

function SearchDiscoveryLoader({ size = 24 }: { size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.timing(pulse, {
      toValue: 1,
      duration: 1050,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1.42] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.44, 0.12, 0] });
  return <View style={{ width: size + 18, height: size + 18, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Searching">
    <Animated.View style={{ position: 'absolute', width: size + 16, height: size + 16, borderRadius: (size + 16) / 2, borderWidth: 1.5, borderColor: '#5C8DC9', opacity: ringOpacity, transform: [{ scale: ringScale }] }} />
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2FC' }}><Ionicons name="sparkles" size={Math.max(16, size * 0.58)} color={palette.blue} /></View>
  </View>;
}

function SkeletonLoader({ size = 46, style }: { size?: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0.42)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.9, duration: 680, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.42, duration: 680, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <View style={[styles.skeletonLoader, { width: size, height: size }, style]} accessibilityLabel="Loading collections"><Animated.View style={[styles.skeletonLoaderBlock, { opacity }]} /></View>;
}

function HomeLoadingScreen() {
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.homeLoadingSafeArea}>
    <StatusBar barStyle="light-content" backgroundColor="#0A254A" />
    <View style={styles.homeLoadingHeader}>
      <View style={styles.homeLoadingHeaderCopy}><SkeletonLoader size={18} /><View style={styles.homeLoadingHeaderLines}><SkeletonLoader size={1} style={styles.homeLoadingShortLine} /><View style={{ marginTop: 7 }}><SkeletonLoader size={1} style={styles.homeLoadingLongLine} /></View></View></View>
      <SkeletonLoader size={38} />
    </View>
    <View style={styles.homeLoadingBody}>
      <SkeletonLoader size={1} style={styles.homeLoadingSearch} />
      <View style={styles.homeLoadingHero}><SkeletonLoader size={1} style={styles.homeLoadingHeroFill} /></View>
      <View style={styles.homeLoadingSection}><SkeletonLoader size={1} style={styles.homeLoadingTitleLine} /><View style={styles.homeLoadingCards}>{[0, 1, 2, 3].map(item => <View key={item}><SkeletonLoader size={70} /><View style={{ marginTop: 9 }}><SkeletonLoader size={1} style={styles.homeLoadingCardLine} /></View></View>)}</View></View>
      <View style={styles.homeLoadingSection}><SkeletonLoader size={1} style={styles.homeLoadingTitleLine} /><View style={styles.homeLoadingCards}>{[0, 1, 2, 3].map(item => <View key={item}><SkeletonLoader size={76} /><View style={{ marginTop: 9 }}><SkeletonLoader size={1} style={styles.homeLoadingCardLine} /></View></View>)}</View></View>
    </View>
  </SafeAreaView>;
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

  if (!source) return <SkeletonLoader size={28} />;
  return <View style={styles.collectionArtwork}>
    {!loaded ? <SkeletonLoader size={28} /> : null}
    <Image source={source} style={[styles.shopCategoryImage, !loaded && styles.collectionArtworkHidden]} resizeMode="contain" onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />
  </View>;
}

function ProductDetail({ width, topInset, cartCount, cartQuantity, cartItems, product, recommendations, favoriteIds, onBack, onSearch, onAdd, onChangeCartQuantity, onCheckout, onOpenProduct, onFavorite }: { width: number; topInset: number; cartCount: number; cartQuantity: number; cartItems: CartItem[]; product: Product; recommendations: Product[]; favoriteIds: Set<string>; onBack: () => void; onSearch: () => void; onAdd: (product: Product) => void; onChangeCartQuantity: (productId: string, change: number) => void; onCheckout: () => void; onOpenProduct: (product: Product, origin?: ProductTransitionOrigin) => void; onFavorite: (product: Product) => void }) {
  const notifyConfirmation = useNotifyConfirmation();
  const [colorIndex, setColorIndex] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const detailScrollY = useRef(new Animated.Value(0)).current;
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState<Array<{ id: string; name: string; rating: number; text: string }>>([]);
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
  const floatingTotal = Number.isFinite(unitPrice) ? money(String(unitPrice), product.currencyCode ?? 'INR') : product.price;
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
  const stickyHeaderOpacity = detailScrollY.interpolate({ inputRange: [165, 225], outputRange: [0, 1], extrapolate: 'clamp' });
  const headerCircleOpacity = detailScrollY.interpolate({ inputRange: [145, 210], outputRange: [1, 0], extrapolate: 'clamp' });

  return <View style={[styles.detailPage, { width }]}>
    <Animated.ScrollView showsVerticalScrollIndicator={false} bounces alwaysBounceVertical decelerationRate="normal" scrollEventThrottle={16} overScrollMode="auto" contentContainerStyle={styles.detailContent} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: detailScrollY } } }], { useNativeDriver: true })}>
      <View style={[styles.detailHeroSection, { height: topInset + width + 42 }]}>
        <ScrollView ref={detailGalleryRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces alwaysBounceHorizontal directionalLockEnabled decelerationRate="normal" scrollEventThrottle={16} style={styles.detailGallery} onMomentumScrollEnd={event => setColorIndex(Math.round(event.nativeEvent.contentOffset.x / width))}>
          {choices.map((option, index) => <View key={`hero-${option.name}-${index}`} style={[styles.detailHeroCard, { width: width - 24, height: width - 24, marginHorizontal: 12, marginTop: topInset + 42 }]}><Image source={option.image} style={styles.detailHero} resizeMode="contain" /></View>)}
        </ScrollView>
        <View style={styles.detailDots}>{choices.map((_, i) => <View key={i} style={[styles.detailDot, i === colorIndex && styles.detailDotActive]} />)}</View>
      </View>
      <LinearGradient pointerEvents="none" colors={['#FFFFFF', '#F4F5FA']} style={styles.detailImageFade} />
      <View style={styles.detailInfoCard}>
        <Text style={styles.detailTitle}>{product.name}</Text>
        <View style={styles.detailPriceRow}><Text style={styles.detailPrice}>{product.price}</Text>{product.oldPrice ? <Text style={styles.detailOldPrice}>{product.oldPrice}</Text> : null}{detailDiscountLabel ? <Text style={styles.detailDiscount}>{detailDiscountLabel}</Text> : null}</View>
        <Text style={styles.inclusive}>Inclusive of all taxes · Free shipping</Text>
        <Text style={styles.detailBrandLine}>Brand: <Text style={styles.detailBrandValue}>{product.brand || 'Not specified'}</Text> | {product.vendor || 'Warehouse not specified'}</Text>
      </View>
      <View style={styles.detailInfoCard}>
        <View style={styles.detailStockRow}><View style={[styles.stockDot, !availableForSale && styles.stockDotUnavailable]} /><Text style={[styles.stockText, !availableForSale && styles.stockTextUnavailable]}>{availableForSale ? 'In stock' : 'Coming soon'}</Text></View>
        <Text style={styles.deliveryEstimate}>Estimated Delivery: <Text style={styles.deliveryEstimateValue}>{deliveryRange}</Text></Text>
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
        <View style={styles.reviewHeadingRow}><View><Text style={styles.reviewHeading}>Ratings &amp; Reviews</Text><Text style={styles.reviewSummary}>{reviews.length ? `${reviewAverage.toFixed(1)} ★ · ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}</Text></View><Ionicons name="chatbox-ellipses-outline" size={25} color={palette.blue} /></View>
        <Text style={styles.reviewPrompt}>Rate this product</Text>
        <View style={styles.reviewStars}>{[1, 2, 3, 4, 5].map(star => <Pressable key={star} onPress={() => setReviewRating(star)} hitSlop={5}><Ionicons name={star <= reviewRating ? 'star' : 'star-outline'} size={28} color="#F2A900" /></Pressable>)}</View>
        <TextInput value={reviewText} onChangeText={setReviewText} multiline textAlignVertical="top" placeholder="Write your review" placeholderTextColor="#8B929D" style={styles.reviewInput} />
        <Pressable onPress={submitReview} style={styles.reviewSubmit}><Text style={styles.reviewSubmitText}>Submit review</Text></Pressable>
      </View>
      <View style={styles.detailRecommendationsSection}>
        <Text style={styles.similarTitle}>You may also like</Text>
        <Text style={styles.similarSubtitle}>More picks selected for you</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces alwaysBounceHorizontal directionalLockEnabled decelerationRate="normal" scrollEventThrottle={16} contentContainerStyle={styles.detailRecommendations}>{recommendations.filter(item => item.id !== product.id).slice(0, 12).map(item => <ProductCard key={`similar-${item.id}`} item={item} width={150} favorite={favoriteIds.has(item.id)} quantity={cartItems.find(cartItem => cartItem.product.id === item.id)?.quantity ?? 0} collectionLayout onFavorite={() => onFavorite(item)} onAdd={() => onAdd(item)} onChangeQuantity={change => onChangeCartQuantity(item.id, change)} onOpen={origin => onOpenProduct(item, origin)} />)}</ScrollView>
      </View>
    </Animated.ScrollView>
    <View style={[styles.detailUnifiedHeader, { height: 62 + topInset, paddingTop: topInset + 10 }]}><Animated.View pointerEvents="none" style={[styles.detailUnifiedHeaderBackground, { opacity: stickyHeaderOpacity }]} /><Pressable onPress={onBack} style={styles.detailCircleButton}><Animated.View pointerEvents="none" style={[styles.detailCircleButtonBackground, { opacity: headerCircleOpacity }]} /><Ionicons name="chevron-down" size={22} color={palette.ink} /></Pressable><Animated.Text numberOfLines={1} style={[styles.detailStickyTitle, { opacity: stickyHeaderOpacity }]}>{product.name}</Animated.Text><View style={styles.detailOverlayActions}><Pressable onPress={() => onFavorite(product)} style={styles.detailCircleButton}><Animated.View pointerEvents="none" style={[styles.detailCircleButtonBackground, { opacity: headerCircleOpacity }]} /><Ionicons name={favoriteIds.has(product.id) ? 'heart' : 'heart-outline'} size={20} color={favoriteIds.has(product.id) ? WISHLIST_ACTIVE_COLOR : palette.ink} /></Pressable><Pressable onPress={onSearch} style={styles.detailCircleButton}><Animated.View pointerEvents="none" style={[styles.detailCircleButtonBackground, { opacity: headerCircleOpacity }]} /><Ionicons name="search-outline" size={21} color={palette.ink} /></Pressable><Pressable onPress={() => setShareVisible(true)} style={styles.detailCircleButton}><Animated.View pointerEvents="none" style={[styles.detailCircleButtonBackground, { opacity: headerCircleOpacity }]} /><Ionicons name="paper-plane-outline" size={20} color={palette.ink} /></Pressable></View></View>
    <View style={styles.buyBarContainer}><LinearGradient pointerEvents="none" colors={['rgba(7,17,31,0)', 'rgba(7,17,31,0.15)']} style={styles.buyBarShadow} /><View style={styles.buyBar}><View style={styles.buyBarSummary}><Text style={styles.buyBarPrice}>{floatingTotal}</Text>{product.oldPrice ? <Text numberOfLines={1} style={styles.buyBarOldPrice}>{product.oldPrice}</Text> : null}<Text style={styles.buyBarTax}>Inclusive of all taxes</Text></View>{availableForSale && cartQuantity > 0 ? <View style={styles.detailCartQuantity}><Pressable accessibilityLabel="Decrease quantity" hitSlop={8} onPress={() => onChangeCartQuantity(product.id, -1)} style={styles.detailCartQuantityAction}><Ionicons name="remove" size={22} color="#FFFFFF" /></Pressable><Text style={styles.detailCartQuantityValue}>{cartQuantity}</Text><Pressable accessibilityLabel="Increase quantity" hitSlop={8} onPress={() => onChangeCartQuantity(product.id, 1)} style={styles.detailCartQuantityAction}><Ionicons name="add" size={22} color="#FFFFFF" /></Pressable></View> : <Pressable onPress={availableForSale ? () => onAdd(product) : notifyConfirmation.notify} style={[styles.addLarge, !availableForSale && styles.notifyLarge]}>{availableForSale ? <Text style={styles.addLargeText}>Add to cart</Text> : <NotifyConfirmation notified={notifyConfirmation.notified} showMessage={notifyConfirmation.showMessage} color="#FFFFFF" />}</Pressable>}</View></View>
    <Modal visible={shareVisible} transparent animationType="slide" onRequestClose={() => setShareVisible(false)}>
      <Pressable style={styles.shareBackdrop} onPress={() => setShareVisible(false)}><Pressable style={styles.shareSheet} onPress={() => {}}>
        <View style={styles.shareSheetHeader}><Text style={styles.shareSheetTitle}>Share product</Text><Pressable onPress={() => setShareVisible(false)}><Ionicons name="close" size={23} color={palette.ink} /></Pressable></View>
        <View style={styles.shareActions}><Pressable onPress={() => shareTo('whatsapp')} style={styles.shareAction}><View style={[styles.shareIcon, styles.whatsappIcon]}><Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" /></View><Text style={styles.shareActionText}>WhatsApp</Text></Pressable><Pressable onPress={() => shareTo('mail')} style={styles.shareAction}><View style={[styles.shareIcon, styles.mailIcon]}><Ionicons name="mail" size={22} color="#FFFFFF" /></View><Text style={styles.shareActionText}>Mail</Text></Pressable><Pressable onPress={() => shareTo('instagram')} style={styles.shareAction}><View style={[styles.shareIcon, styles.instagramIcon]}><Ionicons name="logo-instagram" size={23} color="#FFFFFF" /></View><Text style={styles.shareActionText}>Instagram</Text></Pressable><Pressable onPress={() => shareTo('facebook')} style={styles.shareAction}><View style={[styles.shareIcon, styles.facebookIcon]}><Ionicons name="logo-facebook" size={23} color="#FFFFFF" /></View><Text style={styles.shareActionText}>Facebook</Text></Pressable></View>
        <Pressable onPress={copyProductLink} style={styles.copyLinkButton}><Ionicons name="copy-outline" size={20} color={palette.blue} /><Text style={styles.copyLinkText}>Copy link</Text></Pressable>
      </Pressable></Pressable>
    </Modal>
  </View>;
}

function CartPopup({ visible, item, items, count, onOpen, containerStyle, footerProgress }: { visible: boolean; item: Product | null; items: CartItem[]; count: number; onOpen: () => void; containerStyle?: any; footerProgress?: Animated.Value }) {
  const [mounted, setMounted] = useState(visible);
  const [displayCount, setDisplayCount] = useState(count);
  const [displayProducts, setDisplayProducts] = useState<Product[]>(() => items.slice(-2).reverse().map(entry => entry.product));
  const progress = useRef(new Animated.Value(0)).current;
  const imageProgress = useRef(new Animated.Value(1)).current;
  const popupWidth = useRef(new Animated.Value(items.length > 1 ? 184 : 158)).current;
  useEffect(() => {
    progress.stopAnimation();
    if (visible) {
      setDisplayCount(count);
      setDisplayProducts(items.slice(-2).reverse().map(entry => entry.product));
      setMounted(true);
      requestAnimationFrame(() => Animated.spring(progress, { toValue: 1, damping: 18, stiffness: 210, mass: 0.8, useNativeDriver: true }).start());
      return;
    }
    Animated.timing(progress, { toValue: 0, duration: 190, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished) setMounted(false); });
  }, [count, progress, visible]);
  useEffect(() => {
    if (!visible || !item) return;
    imageProgress.setValue(0);
    Animated.spring(imageProgress, { toValue: 1, damping: 17, stiffness: 230, mass: 0.7, useNativeDriver: true }).start();
  }, [imageProgress, item?.id, visible]);
  useEffect(() => {
    Animated.spring(popupWidth, {
      toValue: items.length > 1 ? 184 : 158,
      damping: 22,
      stiffness: 190,
      mass: 0.75,
      useNativeDriver: false,
    }).start();
  }, [items.length, popupWidth]);
  if (!mounted) return null;
  return <Animated.View pointerEvents={visible ? 'box-none' : 'none'} style={[styles.cartPopupLayer, containerStyle, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { translateY: footerProgress ? footerProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 70] }) : 0 }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}><Animated.View style={{ width: popupWidth }}><Pressable onPress={onOpen} style={styles.cartPopup}>
    <Animated.View style={[styles.cartPopupImages, { opacity: imageProgress, transform: [{ translateX: imageProgress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>{displayProducts.map((product, index) => <Image key={product.id} source={product.image} style={[styles.cartPopupImage, index > 0 && styles.cartPopupImageOverlap]} resizeMode="contain" />)}</Animated.View>
    <View style={styles.cartPopupCopy}><Text style={styles.cartPopupTitle}>View cart</Text><Text style={styles.cartPopupCount}>{displayCount} {displayCount === 1 ? 'item' : 'items'}</Text></View>
    <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
  </Pressable></Animated.View></Animated.View>;
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

function HelpFab({ product, cartBottom = 0, visible = false }: { product?: Product | null; cartBottom?: number; visible?: boolean }) {
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
  const helpIconVisible = visible;

  if (!helpIconVisible) return null;

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

function CartPage({ items, recentlyViewed, wishlistProducts, favoriteIds, onBack, onSearch, onChangeQuantity, onCheckout, onAddAddress = onCheckout, onOpenProduct, onAdd, onSeeAll, onOpenWishlist, onToggleFavorite }: { items: CartItem[]; recentlyViewed: Product[]; wishlistProducts: Product[]; favoriteIds: Set<string>; onBack: () => void; onSearch: () => void; onAddAddress?: () => void; onChangeQuantity: (productId: string, change: number) => void; onCheckout: () => void; onOpenProduct: (product: Product, origin?: ProductTransitionOrigin) => void; onAdd: (product: Product) => void; onSeeAll: () => void; onOpenWishlist: () => void; onToggleFavorite: (product: Product) => void }) {
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = items.reduce((total, { product, quantity }) => total + (product.unitPrice ?? (Number(product.price.replace(/[^0-9.]/g, '')) || 0)) * quantity, 0);
  const cartTotalText = money(String(cartTotal), items[0]?.product.currencyCode ?? 'INR');
  const cartOriginalTotal = items.reduce((total, { product, quantity }) => total + (Number((product.oldPrice || product.price).replace(/[^0-9.]/g, '')) || product.unitPrice || 0) * quantity, 0);
  const cartSavings = Math.max(0, cartOriginalTotal - cartTotal);
  const cartOriginalTotalText = money(String(cartOriginalTotal), items[0]?.product.currencyCode ?? 'INR');
  const cartSavingsText = money(String(cartSavings), items[0]?.product.currencyCode ?? 'INR');
  const suggestionCardWidth = Math.max(92, (Math.min(Dimensions.get('window').width, 440) - 58) / 3);
  return <View style={styles.cartPage}>
    <View style={styles.cartPageHeader}><Pressable onPress={onBack} hitSlop={10} style={styles.cartBackButton}><Ionicons name="arrow-back" size={20} color={palette.heading} /></Pressable><Text style={styles.cartPageTitle}>My Cart</Text><View style={styles.cartHeaderActions}><Pressable accessibilityLabel="Search products" onPress={onSearch} style={styles.cartHeaderSearch}><Ionicons name="search-outline" size={20} color={palette.heading} /></Pressable><Pressable accessibilityLabel="Share cart" onPress={() => Share.share({ title: 'My Blumaple cart', message: `My Blumaple cart has ${itemCount} ${itemCount === 1 ? 'item' : 'items'}. Shop at https://blumaple.com` })} style={styles.cartHeaderShare}><Ionicons name="paper-plane-outline" size={16} color={palette.heading} /><Text style={styles.cartHeaderShareText}>Share</Text></Pressable></View></View>
    {items.length ? <ScrollView contentContainerStyle={styles.cartList} showsVerticalScrollIndicator={false} bounces alwaysBounceVertical decelerationRate="normal" scrollEventThrottle={16} overScrollMode="auto"><View style={styles.cartItemsBlock}><View style={styles.cartDeliveryHeading}><View style={styles.cartDeliveryIcon}><Ionicons name="bag-check-outline" size={22} color="#2E8B36" /></View><View style={styles.cartDeliveryCopyBlock}><Text style={styles.cartItemsHeading}>Your items</Text><Text style={styles.cartDeliveryCopy}>{itemCount} {itemCount === 1 ? 'item' : 'items'} ready for checkout</Text></View><View style={styles.cartShippingHighlight}><Text style={styles.cartShippingHighlightText}>FREE SHIPPING</Text></View></View>{items.map(({ product, quantity }, index) => <View key={product.id} style={[styles.cartListItem, styles.cartBlockItem, index > 0 && styles.cartBlockItemDivider]}>
      <Image source={product.image} style={styles.cartListImage} resizeMode="contain" />
      <View style={styles.cartListCopy}><Text numberOfLines={2} style={styles.cartListName}>{product.name}</Text>{product.brand || product.vendor ? <Text numberOfLines={1} style={styles.cartListMeta}>{product.brand || product.vendor}</Text> : null}<Pressable onPress={() => onToggleFavorite(product)} hitSlop={6}><Text style={styles.cartMoveWishlist}>{favoriteIds.has(product.id) ? 'Saved to wishlist' : 'Move to wishlist'}</Text></Pressable></View>
      <View style={styles.cartListActions}><View style={styles.cartQuantityControl}><Pressable hitSlop={8} onPress={() => onChangeQuantity(product.id, -1)}><Text style={styles.cartQuantityButton}>−</Text></Pressable><Text style={styles.cartQuantityValue}>{quantity}</Text><Pressable hitSlop={8} onPress={() => onChangeQuantity(product.id, 1)}><Text style={styles.cartQuantityButton}>+</Text></Pressable></View></View>
      <View style={styles.cartLinePriceRow}>{product.oldPrice ? <Text numberOfLines={1} style={styles.cartLineOldPrice}>{product.oldPrice}</Text> : null}<Text numberOfLines={1} style={styles.cartLineTotal}>{product.unitPrice ? money(String(product.unitPrice * quantity), product.currencyCode ?? 'INR') : product.price}</Text></View>
    </View>)}</View><View style={[styles.cartOrderDetails, styles.cartContentBlock]}><Text style={styles.cartOrderDetailsTitle}>Order details</Text><View style={styles.cartOrderRow}><Text style={styles.cartOrderLabel}>Items MRP</Text><Text style={styles.cartOrderValue}>{cartOriginalTotalText}</Text></View><View style={styles.cartOrderRow}><Text style={styles.cartOrderLabel}>Product discount</Text><Text style={styles.cartOrderDiscount}>− {cartSavingsText}</Text></View><View style={styles.cartOrderRow}><Text style={styles.cartOrderLabel}>Shipping</Text><Text style={styles.cartOrderFree}>FREE</Text></View>{cartSavings > 0 ? <View style={styles.cartSavingsHighlight}><Ionicons name="sparkles-outline" size={16} color="#238636" /><Text style={styles.cartSavingsHighlightText}>You saved {cartSavingsText} on this order</Text></View> : null}<View style={styles.cartOrderDivider} /><View style={styles.cartOrderRow}><Text style={styles.cartOrderLabel}>Total amount</Text><Text style={styles.cartOrderTotalValue}>{cartTotalText}</Text></View></View><View style={[styles.cartPoliciesBlock, styles.cartContentBlock]}><Text style={styles.cartOrderDetailsTitle}>Cancellation & returns</Text><View style={styles.cartPolicyRow}><View style={styles.cartPolicyIcon}><Ionicons name="close-circle-outline" size={20} color={palette.blue} /></View><View style={styles.cartPolicyCopy}><Text style={styles.cartPolicyTitle}>Cancellation policy</Text><Text style={styles.cartPolicyDescription}>You can cancel your order before it is shipped.</Text></View></View><View style={styles.cartPolicyDivider} /><View style={styles.cartPolicyRow}><View style={styles.cartPolicyIcon}><Ionicons name="return-down-back-outline" size={20} color={palette.blue} /></View><View style={styles.cartPolicyCopy}><Text style={styles.cartPolicyTitle}>Returns policy</Text><Text style={styles.cartPolicyDescription}>Eligible items can be returned within 7 days of delivery. Product conditions may apply.</Text></View></View></View>{recentlyViewed.length ? <View style={[styles.cartSuggestions, styles.cartContentBlock]}><Text style={styles.cartSuggestionsTitle}>You might also like</Text><View style={styles.cartSuggestionGrid}>{recentlyViewed.slice(0, 9).map(product => <ProductCard key={`cart-suggestion-${product.id}`} item={product} width={suggestionCardWidth} favorite={favoriteIds.has(product.id)} quantity={items.find(item => item.product.id === product.id)?.quantity ?? 0} collectionLayout compactLayout onFavorite={() => onToggleFavorite(product)} onAdd={() => onAdd(product)} onChangeQuantity={change => onChangeQuantity(product.id, change)} onOpen={origin => onOpenProduct(product, origin)} />)}</View><Pressable onPress={onSeeAll} style={({ pressed }) => [styles.homeViewAllButton, styles.cartSeeAllButton, pressed && styles.pressed]}><View style={styles.homeViewAllThumbs}>{recentlyViewed.slice(0, 3).map((product, index) => <Image key={`cart-see-all-${product.id}`} source={product.image} style={[styles.homeViewAllThumb, index > 0 && styles.homeViewAllThumbOverlap]} resizeMode="contain" />)}</View><Text style={styles.homeViewAllText}>See all products</Text><Ionicons name="chevron-forward" size={16} color={palette.blue} /></Pressable></View> : null}{wishlistProducts.length ? <View style={[styles.cartWishlistBlock, styles.cartContentBlock]}><View style={styles.cartBlockHeader}><Text style={[styles.cartSuggestionsTitle, styles.cartBlockHeaderTitle]}>Your Wishlist</Text><Pressable onPress={onOpenWishlist} hitSlop={8}><Text style={styles.cartWishlistViewAll}>View all</Text></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cartWishlistRow}>{wishlistProducts.slice(0, 8).map(product => <ProductCard key={`cart-wishlist-${product.id}`} item={product} width={140} favorite quantity={items.find(item => item.product.id === product.id)?.quantity ?? 0} collectionLayout compactLayout onFavorite={() => onToggleFavorite(product)} onAdd={() => onAdd(product)} onChangeQuantity={change => onChangeQuantity(product.id, change)} onOpen={origin => onOpenProduct(product, origin)} />)}</ScrollView></View> : null}</ScrollView> : <View style={styles.emptyCart}><Ionicons name="bag-handle-outline" size={44} color={palette.blue} /><Text style={styles.emptyCartTitle}>Your cart is empty</Text><Text style={styles.emptyCartCopy}>Add products to see them here.</Text></View>}
    {items.length ? <View style={styles.cartCheckoutBar}><View style={styles.cartTotalBlock}><Text style={styles.cartItemCount}>{itemCount} {itemCount === 1 ? 'item' : 'items'} in cart</Text><Text style={styles.cartTotalText}>Total: {cartTotalText}</Text></View><Pressable onPress={onCheckout} style={styles.cartCheckoutButton}><Text style={styles.cartCheckoutText}>Place Order</Text></Pressable></View> : null}
    <Modal visible={addressSheetVisible} transparent animationType="slide" onRequestClose={() => setAddressSheetVisible(false)}><Pressable style={styles.cartAddressBackdrop} onPress={() => setAddressSheetVisible(false)}><Pressable style={styles.cartAddressSheet} onPress={() => {}}><View style={styles.cartAddressHandle} /><View style={styles.cartAddressSheetHeader}><View><Text style={styles.cartAddressSheetTitle}>Add delivery location</Text><Text style={styles.cartAddressSheetSubtitle}>Choose how you would like to add your address</Text></View><Pressable onPress={() => setAddressSheetVisible(false)} style={styles.cartAddressClose}><Ionicons name="close" size={20} color={palette.heading} /></Pressable></View><Pressable onPress={() => { setAddressSheetVisible(false); onAddAddress(); }} style={styles.cartAddressOption}><View style={[styles.cartAddressOptionIcon, styles.cartAddressOptionIconPrimary]}><Ionicons name="add" size={24} color="#FFFFFF" /></View><View style={styles.cartAddressOptionCopy}><Text style={styles.cartAddressOptionTitle}>Add new address</Text><Text style={styles.cartAddressOptionSubtitle}>Enter your delivery details manually</Text></View><Ionicons name="chevron-forward" size={20} color="#8A94A3" /></Pressable><Pressable onPress={() => Alert.alert('Location access', 'Location-based address detection will be available soon. You can add an address manually for now.')} style={styles.cartAddressOption}><View style={styles.cartAddressOptionIcon}><Ionicons name="navigate-outline" size={22} color={palette.blue} /></View><View style={styles.cartAddressOptionCopy}><Text style={styles.cartAddressOptionTitle}>Use current location</Text><Text style={styles.cartAddressOptionSubtitle}>Allow location access to find your address</Text></View><Ionicons name="chevron-forward" size={20} color="#8A94A3" /></Pressable><Pressable onPress={() => { setAddressSheetVisible(false); onAddAddress(); }} style={styles.cartAddressOption}><View style={styles.cartAddressOptionIcon}><Ionicons name="keypad-outline" size={22} color={palette.blue} /></View><View style={styles.cartAddressOptionCopy}><Text style={styles.cartAddressOptionTitle}>Enter pincode</Text><Text style={styles.cartAddressOptionSubtitle}>Check delivery availability in your area</Text></View><Ionicons name="chevron-forward" size={20} color="#8A94A3" /></Pressable><View style={styles.cartNoSavedAddress}><Ionicons name="home-outline" size={21} color="#8A94A3" /><View><Text style={styles.cartNoSavedTitle}>No saved addresses yet</Text><Text style={styles.cartNoSavedCopy}>Your saved addresses will appear here.</Text></View></View></Pressable></Pressable></Modal>
  </View>;
}

function Storefront() {
  const customerAuth = useShopifyCustomerAuth();
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void customerAuth.refreshCustomer(); });
    return () => subscription.remove();
  }, [customerAuth.refreshCustomer]);
  const insets = useSafeAreaInsets();
  const floatingCartBottom = BOTTOM_NAV_HEIGHT + FLOATING_CART_GAP + insets.bottom;
  const screenWidth = Dimensions.get('window').width;
  const contentWidth = Math.min(screenWidth, 440);
  const cardWidth = Math.max(156, (contentWidth - 46) / 2);
  const wishlistCardWidth = (contentWidth - 36) / 2;
  const trendingCardWidth = Math.max(118, (contentWidth - 54) / 2.65);
  const carouselCardWidth = contentWidth;
  const carouselStep = carouselCardWidth;
  const [activeBanner, setActiveBanner] = useState(0);
  const [carouselCycle, setCarouselCycle] = useState(0);
  const [activeCategory, setActiveCategory] = useState('Audio');
  const homeMenuRef = useRef<ScrollView>(null);
  const homeScrollRef = useRef<ScrollView>(null);
  const homeScrollOffsetRef = useRef(0);
  const pendingHomeScrollOffsetRef = useRef(0);
  const shouldRestoreHomeScrollRef = useRef(false);
  const homeMenuViewportWidthRef = useRef(0);
  const homeMenuContentWidthRef = useRef(0);
  const [homeProductListing, setHomeProductListing] = useState<'trending' | 'bestSelling'>('trending');
  const [discoverySearchReturnScreen, setDiscoverySearchReturnScreen] = useState<ReturnScreen>('home');
  const [discoverySearchInitialQuery, setDiscoverySearchInitialQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteProducts, setFavoriteProducts] = useState<Record<string, Product>>({});
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartPopupVisible, setCartPopupVisible] = useState(false);
  const [cartPreview, setCartPreview] = useState<Product | null>(null);
  const [productReturnScreen, setProductReturnScreen] = useState<ReturnScreen>('home');
  const [productHistory, setProductHistory] = useState<Product[]>([]);
  const [cartReturnScreen, setCartReturnScreen] = useState<ReturnScreen>('home');
  const [profileReturnScreen, setProfileReturnScreen] = useState<ReturnScreen>('home');
  const profileBackActionRef = useRef<() => void>(() => {});
  const [categoryCollectionReturnScreen, setCategoryCollectionReturnScreen] = useState<'home' | 'categories' | 'offers'>('home');
  const [screen, setScreen] = useState<'home' | 'categories' | 'categoryCollection' | 'wishlist' | 'offers' | 'orders' | 'profile' | 'search' | 'discoverySearch' | 'homeProducts' | 'product' | 'cart' | 'checkout' | 'address' | 'orderSuccess' | 'orderFailure'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPlaceholderIndex, setSearchPlaceholderIndex] = useState(0);
  const searchPlaceholderY = useRef(new Animated.Value(0)).current;
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
  const [collectionBrands, setCollectionBrands] = useState<string[]>([]);
  const [collectionVendors, setCollectionVendors] = useState<string[]>([]);
  const [collectionActiveFilters, setCollectionActiveFilters] = useState<ShopifyProductFilter[]>([]);
  const [collectionFilterLoading, setCollectionFilterLoading] = useState(false);
  const [collectionPageLoading, setCollectionPageLoading] = useState(false);
  const [collectionPageLoadingMore, setCollectionPageLoadingMore] = useState(false);
  const [collectionPageHasNext, setCollectionPageHasNext] = useState(false);
  const [collectionPageCursor, setCollectionPageCursor] = useState<string | null>(null);
  const [collectionPageTotal, setCollectionPageTotal] = useState<number | null>(null);
  const [collectionScrollOffset, setCollectionScrollOffset] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productOverlayVisible, setProductOverlayVisible] = useState(false);
  const [productTransitionOrigin, setProductTransitionOrigin] = useState<ProductTransitionOrigin | null>(null);
  const [sharedProductTransitionVisible, setSharedProductTransitionVisible] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [productPageRecommendations, setProductPageRecommendations] = useState<Product[]>([]);
  const [shopifyLoading, setShopifyLoading] = useState(true);
  const [shopifyError, setShopifyError] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [shippingAddressRestored, setShippingAddressRestored] = useState(false);
  const secureCustomerId = customerAuth.customer?.id.replace(/[^A-Za-z0-9._-]/g, '_');
  const checkoutAddressKey = secureCustomerId ? `${CHECKOUT_ADDRESS_KEY}.${secureCustomerId}` : `${CHECKOUT_ADDRESS_KEY}.guest`;
  const [checkoutInitialStage, setCheckoutInitialStage] = useState<2 | 3>(2);
  const [orderOutcome, setOrderOutcome] = useState<OrderOutcome | null>(null);
  const [pincodeModalVisible, setPincodeModalVisible] = useState(false);
  const [pincode, setPincode] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [uploadedCarousels, setUploadedCarousels] = useState<UploadedCarouselData>({});
  const [openingAnimationVisible, setOpeningAnimationVisible] = useState(false);
  const [initialLoginSkipped, setInitialLoginSkipped] = useState(false);
  const [homeStartupSkeletonVisible, setHomeStartupSkeletonVisible] = useState(false);
  const [directToLogin, setDirectToLogin] = useState(false);
  const [checkoutLoginRequired, setCheckoutLoginRequired] = useState(false);
  const [footerPageTransitioning, setFooterPageTransitioning] = useState(false);
  const [activeFooterTab, setActiveFooterTab] = useState<'home' | 'categories' | 'orders' | 'wishlist' | 'offers'>('home');
  const carouselRef = useRef<ScrollView>(null);
  const carouselPositionRef = useRef(0);
  const carouselProgress = useRef(new Animated.Value(0)).current;
  const orderDetailsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setShippingAddressRestored(false);
    setShippingAddress(null);
    SecureStore.getItemAsync(checkoutAddressKey).catch(() => null).then(value => {
      if (value) {
        try { setShippingAddress(JSON.parse(value) as ShippingAddress); } catch { void SecureStore.deleteItemAsync(checkoutAddressKey).catch(() => {}); }
      }
    }).finally(() => setShippingAddressRestored(true));
  }, [checkoutAddressKey]);

  useEffect(() => {
    if (!shippingAddressRestored || !shippingAddress) return;
    void SecureStore.setItemAsync(checkoutAddressKey, JSON.stringify(shippingAddress)).catch(() => {});
  }, [checkoutAddressKey, shippingAddress, shippingAddressRestored]);

  useEffect(() => {
    if (!shippingAddressRestored || shippingAddress || !customerAuth.customer) return;
    const customer = customerAuth.customer;
    const address = customer.defaultAddress ?? customer.addresses?.nodes?.[0];
    if (!address?.address1 || !address.city || !address.zip) return;
    const firstName = address.firstName || customer.firstName || '';
    const lastName = address.lastName || customer.lastName || '';
    const phone = (address.phoneNumber || customer.phoneNumber?.phoneNumber || '').replace(/\D/g, '').slice(-10);
    setShippingAddress({ firstName, lastName: lastName || undefined, name: `${firstName} ${lastName}`.trim() || customer.displayName, email: customer.emailAddress?.emailAddress || undefined, phone, company: address.company || undefined, address1: address.address1, address2: address.address2 || undefined, line: `${address.address1}${address.address2 ? `, ${address.address2}` : ''}${address.company ? `, ${address.company}` : ''}`, city: address.city, state: address.zoneCode || '', country: 'India', countryCode: address.territoryCode || 'IN', pincode: address.zip, billingSameAsShipping: true });
  }, [customerAuth.customer, shippingAddress, shippingAddressRestored]);
  const productRecommendationRequestRef = useRef(0);

  useEffect(() => {
    const rotatePlaceholder = () => {
      Animated.timing(searchPlaceholderY, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (!finished) return;
        setSearchPlaceholderIndex(current => (current + 1) % SEARCH_PLACEHOLDERS.length);
        requestAnimationFrame(() => searchPlaceholderY.setValue(0));
      });
    };
    const interval = setInterval(rotatePlaceholder, 3500);
    return () => {
      clearInterval(interval);
      searchPlaceholderY.stopAnimation();
    };
  }, [searchPlaceholderY]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home') return false;
      if (screen === 'orderSuccess') { setScreen('home'); return true; }
      if (screen === 'orderFailure') { setScreen('checkout'); return true; }
      if (screen === 'address' || screen === 'checkout') { setScreen('cart'); return true; }
      if (screen === 'cart') { setCartPopupVisible(cartItems.length > 0); setScreen(cartReturnScreen); return true; }
      if (screen === 'product') { returnFromProduct(); return true; }
      if (screen === 'categoryCollection') { setScreen(categoryCollectionReturnScreen); return true; }
      if (screen === 'wishlist') { setScreen('home'); return true; }
      if (screen === 'search') { setScreen('home'); return true; }
      if (screen === 'discoverySearch') { setScreen(discoverySearchReturnScreen); return true; }
      if (screen === 'homeProducts') { setScreen('home'); return true; }
      if (screen === 'offers') { setScreen('home'); return true; }
      if (screen === 'orders') { setScreen('home'); return true; }
      if (screen === 'profile') { profileBackActionRef.current(); return true; }
      if (screen === 'categories') { setScreen('home'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [cartItems, cartReturnScreen, categoryCollectionReturnScreen, discoverySearchReturnScreen, productHistory, productReturnScreen, profileReturnScreen, screen]);

  useEffect(() => {
    if (screen === 'home' || screen === 'categories' || screen === 'orders' || screen === 'wishlist' || screen === 'offers') {
      setActiveFooterTab(screen);
    }
  }, [screen]);
  const browseChromeCollapsedRef = useRef(false);
  const browseFooterCollapsedRef = useRef(false);
  const lastBrowseScrollYRef = useRef(0);
  const footerScrollDirectionRef = useRef({ direction: 0, distance: 0 });
  const browseContentHeightRef = useRef(0);
  const browseViewportHeightRef = useRef(0);
  const browseChromeProgress = useRef(new Animated.Value(0)).current;
  const browseFooterProgress = useRef(new Animated.Value(0)).current;
  // Orders and Wishlist use the same stable header as Explore and Offers.
  const collapseBrowseChrome = false;
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
  // Shared native-feeling transition for every pushed screen. Footer tabs keep
  // their own stable layout, while detail flows enter with a short slide/fade.
  const pageTransitionProgress = useRef(new Animated.Value(1)).current;
  const nextPageTransitionDirectionRef = useRef<1 | -1>(1);
  const skipNextPageTransitionRef = useRef(false);
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
  const isFooterScreen = screen === 'home' || screen === 'categories' || screen === 'orders' || screen === 'wishlist' || screen === 'offers';
  const isCollectionScreen = screen === 'categoryCollection';
  const backRevealOpacity = pageTransitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const backRevealTranslateX = pageTransitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0],
  });
  const collectionRevealTranslateY = pageTransitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0],
  });
  // The product page itself is the shared surface. Keeping it as one layer
  // avoids the distracting miniature-card overlay during the handoff.
  const hasSharedProductOrigin = false;
  const productRevealOpacity = pageTransitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [hasSharedProductOrigin ? 0 : 0, 1],
  });
  const productRevealScale = pageTransitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1],
  });
  const productRevealTranslateY = pageTransitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0],
  });
  const sharedOrigin = productTransitionOrigin ?? { x: 12, y: insets.top + 42, width: contentWidth - 24, height: contentWidth - 24 };
  const sharedTargetSize = contentWidth - 24;
  const sharedProductTranslateX = pageTransitionProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 12 - sharedOrigin.x] });
  const sharedProductTranslateY = pageTransitionProgress.interpolate({ inputRange: [0, 1], outputRange: [0, insets.top + 42 - sharedOrigin.y] });
  const sharedProductScaleX = pageTransitionProgress.interpolate({ inputRange: [0, 1], outputRange: [1, sharedTargetSize / Math.max(sharedOrigin.width, 1)] });
  const sharedProductScaleY = pageTransitionProgress.interpolate({ inputRange: [0, 1], outputRange: [1, sharedTargetSize / Math.max(sharedOrigin.height, 1)] });
  const sharedProductOpacity = pageTransitionProgress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [1, 1, 0] });
  const homeHeaderHeight = browseChromeProgress.interpolate({ inputRange: [0, 1], outputRange: [74, 0] });
  const homeHeaderOpacity = browseChromeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const homeFooterTranslateY = browseFooterProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 74] });
  const homeFooterOpacity = browseFooterProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  useEffect(() => {
    if (skipNextPageTransitionRef.current) {
      skipNextPageTransitionRef.current = false;
      pageTransitionProgress.stopAnimation();
      pageTransitionProgress.setValue(1);
      return;
    }

    // All routes use the same restrained crossfade; no slide or scale motion.
    nextPageTransitionDirectionRef.current = 1;
    pageTransitionProgress.stopAnimation();
    pageTransitionProgress.setValue(0);
    const productTransition = screen === 'product';
    const animation = Animated.timing(pageTransitionProgress, {
      toValue: 1,
      duration: productTransition ? 320 : 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    // Give the transformed first frame one paint before animating. This avoids
    // the visible jump while the heavy product view mounts.
    const animationFrame = requestAnimationFrame(() => animation.start(({ finished }) => {
      if (finished && productTransition) setSharedProductTransitionVisible(false);
    }));

    return () => {
      cancelAnimationFrame(animationFrame);
      animation.stop();
    };
  }, [isFooterScreen, pageTransitionProgress, screen]);

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
    browseFooterProgress.stopAnimation();
    Animated.timing(browseFooterProgress, {
      toValue: collapsed ? 1 : 0,
      duration: collapsed ? 330 : 280,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  const catalog = shopifyProducts;
  const cartCount = useMemo(() => cartItems.reduce((total, item) => total + item.quantity, 0), [cartItems]);
  const recommendations = useMemo(() => catalog.slice(0, 4), [catalog]);
  const wishlistProducts = useMemo(() => Object.values(favoriteProducts), [favoriteProducts]);
  const localSearchMatches = useMemo(() => {
    const keywords = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return keywords.length ? shopifyProducts.filter(product => keywords.every(keyword => {
      const singular = keyword.replace(/ies$/, 'y').replace(/ches$/, 'ch').replace(/es$/, '').replace(/s$/, '');
      const searchable = `${product.name} ${product.brand ?? ''} ${product.vendor ?? ''} ${product.sku ?? ''} ${product.searchKeywords ?? ''}`.toLowerCase();
      return searchable.includes(keyword) || (singular.length > 2 && searchable.includes(singular));
    })) : [];
  }, [searchQuery, shopifyProducts]);
  const searchMatches = remoteSearchProducts.length ? remoteSearchProducts : localSearchMatches;
  const displayedSearchResults = useMemo(() => {
    const filtered = searchMatches.filter(product => (!searchBrands.size || searchBrands.has(product.brand?.trim() ?? '')) && (!searchVendors.size || searchVendors.has(product.vendor?.trim() ?? '')));
    if (searchSort === 'Price: Low') filtered.sort((a, b) => (a.unitPrice ?? 0) - (b.unitPrice ?? 0));
    if (searchSort === 'Price: High') filtered.sort((a, b) => (b.unitPrice ?? 0) - (a.unitPrice ?? 0));
    if (searchSort === 'Name') filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [searchBrands, searchMatches, searchSort, searchVendors]);
  const searchBrandOptions = useMemo(() => [...new Set(searchMatches.map(product => product.brand?.trim() ?? '').filter(Boolean))].sort(), [searchMatches]);
  const searchVendorOptions = useMemo(() => [...new Set(searchMatches.map(product => product.vendor?.trim() ?? '').filter(Boolean))].sort(), [searchMatches]);
  const searchFilterCount = searchBrands.size + searchVendors.size;
  const toggleSearchFilter = (value: string, type: 'brand' | 'vendor') => {
    const setter = type === 'brand' ? setSearchBrands : setSearchVendors;
    setter(current => { const next = new Set(current); next.has(value) ? next.delete(value) : next.add(value); return next; });
  };
  const runSearch = (searchTerm: string) => {
    const query = searchTerm.trim();
    if (!query) return;
    setSearchQuery(query);
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
  const submitSearch = () => runSearch(searchQuery);

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
  const activeHomeHeroTheme = getHomeHeroTheme(activeHomeMenu.label);
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
  const bestSellingHomeProducts = useMemo(() => [...categoryProducts].sort((a, b) => {
    const discountDifference = Number(b.discount.replace(/[^0-9]/g, '')) - Number(a.discount.replace(/[^0-9]/g, ''));
    return discountDifference || (b.unitPrice ?? 0) - (a.unitPrice ?? 0);
  }), [categoryProducts]);
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
  const offerDeals = offerCollections.map((offer, index) => ({ ...offer, ...OFFER_DEAL_THEMES[index % OFFER_DEAL_THEMES.length]! }));
  const historyOrders = useMemo<HistoryOrder[]>(() => (customerAuth.customer?.orders?.nodes || []).map(order => {
    const financialStatus = order.financialStatus?.toUpperCase();
    const fulfillmentStatus = order.fulfillmentStatus?.toUpperCase();
    const status: HistoryOrder['status'] = financialStatus === 'VOIDED' ? 'Cancelled' : financialStatus === 'REFUNDED' || financialStatus === 'PARTIALLY_REFUNDED' ? 'Returned' : fulfillmentStatus === 'FULFILLED' || fulfillmentStatus === 'IN_PROGRESS' ? 'Shipped' : 'Processing';
    const products: Product[] = order.lineItems.nodes.map((lineItem, index) => {
      const variant = lineItem.variant;
      const product = variant?.product;
      const price = variant?.price;
      const imageUrl = variant?.image?.url || product?.featuredImage?.url;
      return { id: product?.id || variant?.id || `${order.id}-${index}`, variantId: variant?.id, name: product?.title || lineItem.title, price: price ? money(price.amount, price.currencyCode) : '', oldPrice: '', discount: '', image: imageUrl ? { uri: imageUrl } : require('./assets/figma/product-headphones.png'), vendor: product?.vendor || '', brand: product?.vendor || '', sku: variant?.sku || undefined, unitPrice: price ? Number(price.amount) : undefined, currencyCode: price?.currencyCode, handle: product?.handle };
    });
    const addressLines = order.shippingAddress?.formatted || [];
    return { id: order.name, date: new Date(order.processedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), products, amount: money(order.totalPrice.amount, order.totalPrice.currencyCode), status, shippingAddress: [...addressLines, order.shippingAddress?.phone].filter(Boolean).join(' · ') };
  }), [customerAuth.customer?.orders?.nodes]);
  const displayedHistoryOrders = useMemo<HistoryOrder[]>(() => {
    if (historyOrders.length >= 4) return historyOrders;
    const fallbackProduct: Product = { id: 'example-order-product', name: 'Blumaple selection', price: '₹1,299', oldPrice: '', discount: '', image: require('./assets/figma/product-headphones.png'), brand: 'Blumaple' };
    const sampleProducts = catalog.length ? catalog : [fallbackProduct];
    const examples: HistoryOrder[] = [
      { id: '#BMP-10482', date: '10 Oct 2026', products: [sampleProducts[0]!], amount: sampleProducts[0]!.price, status: 'Delivered', deliveredAt: '12 Oct 2026', shippingAddress: 'Swaroopa · Hyderabad, Telangana · 500081' },
      { id: '#BMP-10471', date: '08 Oct 2026', products: [sampleProducts[1] ?? sampleProducts[0]!], amount: (sampleProducts[1] ?? sampleProducts[0]!).price, status: 'Shipped', shippingAddress: 'Swaroopa · Hyderabad, Telangana · 500081' },
      { id: '#BMP-10459', date: '06 Oct 2026', products: [sampleProducts[2] ?? sampleProducts[0]!], amount: (sampleProducts[2] ?? sampleProducts[0]!).price, status: 'Processing', shippingAddress: 'Swaroopa · Hyderabad, Telangana · 500081' },
      { id: '#BMP-10421', date: '01 Oct 2026', products: [sampleProducts[3] ?? sampleProducts[0]!], amount: (sampleProducts[3] ?? sampleProducts[0]!).price, status: 'Cancelled', shippingAddress: 'Swaroopa · Hyderabad, Telangana · 500081' },
    ];
    return [...historyOrders, ...examples].slice(0, 4);
  }, [catalog, historyOrders]);

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
    footerScrollDirectionRef.current = { direction: 0, distance: 0 };
    browseChromeProgress.stopAnimation();
    browseFooterProgress.stopAnimation();
    browseChromeProgress.setValue(0);
    browseFooterProgress.setValue(0);
  }, [browseChromeProgress, browseFooterProgress, collapseBrowseChrome, screen]);

  useEffect(() => {
    if (screen === 'home' && !keyboardVisible) setSearchQuery('');
  }, [keyboardVisible, screen]);

  useEffect(() => {
    if (!openingAnimationVisible) return;
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
  }, [contentWidth, openingAnimationVisible, openingFlightProgress, openingProgress, openingTruckProgress]);

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
    if (!homeStartupSkeletonVisible) return;
    const timer = setTimeout(() => setHomeStartupSkeletonVisible(false), 900);
    return () => clearTimeout(timer);
  }, [homeStartupSkeletonVisible]);

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
    carouselProgress.stopAnimation();
    carouselProgress.setValue(0);
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
    const progressAnimation = Animated.timing(carouselProgress, { toValue: 1, duration: CAROUSEL_INTERVAL_MS, easing: Easing.linear, useNativeDriver: false });
    progressAnimation.start(({ finished }) => { if (finished) advanceCarousel(); });
    return () => progressAnimation.stop();
  }, [activeBanner, carouselCycle, carouselProgress, carouselSlideCount, carouselStep, checkoutLoginRequired, customerAuth.isLoggedIn, customerAuth.loading, footerPageTransitioning, initialLoginSkipped, openingAnimationVisible, screen]);

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
    setCollectionScrollOffset(0);
    setCollectionPageProducts([]);
    setCollectionBrands([]);
    setCollectionVendors([]);
    setCollectionActiveFilters([]);
    setCollectionFilterLoading(true);
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
    fetchShopifyCollectionFilters(collectionId)
      .then(metadata => {
        if (cancelled) return;
        setCollectionBrands(metadata.brands);
        setCollectionVendors(metadata.vendors);
        setCollectionPageTotal(metadata.total);
      })
      .catch(() => { if (!cancelled) { setCollectionBrands([]); setCollectionVendors([]); } })
      .finally(() => { if (!cancelled) setCollectionFilterLoading(false); });
    return () => { cancelled = true; };
  }, [screen, selectedCollectionItem]);

  const loadMoreCollectionProducts = () => {
    const collectionId = selectedCollectionItem?.resource?.id;
    if (!collectionId || !collectionPageHasNext || !collectionPageCursor || collectionPageLoadingMore) return;
    setCollectionPageLoadingMore(true);
    fetchShopifyCollectionProducts(collectionId, 30, collectionPageCursor, collectionActiveFilters)
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

  const applyCollectionFilters = (brands: string[], vendors: string[]) => {
    const collectionId = selectedCollectionItem?.resource?.id;
    if (!collectionId) return;
    const filters: ShopifyProductFilter[] = [
      ...brands.map(value => ({ productMetafield: { namespace: 'custom', key: 'brand_name', value } })),
      ...vendors.map(productVendor => ({ productVendor })),
    ];
    setCollectionActiveFilters(filters);
    setCollectionPageLoading(true);
    setCollectionPageProducts([]);
    setCollectionPageHasNext(false);
    setCollectionPageCursor(null);
    fetchShopifyCollectionProducts(collectionId, 30, null, filters)
      .then(page => {
        setCollectionPageProducts(page.products);
        setCollectionPageHasNext(page.hasNextPage);
        setCollectionPageCursor(page.endCursor);
      })
      .catch(() => setCollectionPageProducts([]))
      .finally(() => setCollectionPageLoading(false));
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
        ? [...current.filter(item => item.product.id !== product.id), { ...existing, quantity: existing.quantity + 1 }]
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
    setCartReturnScreen(screen === 'product' || screen === 'categoryCollection' || screen === 'categories' || screen === 'wishlist' || screen === 'offers' || screen === 'orders' || screen === 'discoverySearch' || screen === 'homeProducts' ? screen : 'home');
    setScreen('cart');
  };

  const navigateBack = (target: typeof screen) => {
    if (target === 'home') suppressHomeEntranceRef.current = true;
    nextPageTransitionDirectionRef.current = -1;
    setScreen(target);
  };

  const returnFromCart = () => {
    setCartPopupVisible(cartItems.length > 0);
    navigateBack(cartReturnScreen);
  };

  const returnFromProduct = () => {
    // Use the platform modal animation for catalogue-to-product navigation.
    // The source catalogue stays mounted, so it is already at the exact scroll
    // position the customer left when the modal dismisses.
    if (productOverlayVisible) {
      setProductOverlayVisible(false);
      setProductTransitionOrigin(null);
      return;
    }

    // Keep the detail page mounted while it collapses back down. Switching the
    // route only after this finishes prevents the usual abrupt screen swap.
    pageTransitionProgress.stopAnimation();
    if (productTransitionOrigin) setSharedProductTransitionVisible(true);
    Animated.timing(pageTransitionProgress, {
      toValue: 0,
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setSharedProductTransitionVisible(false);
      const previousProduct = productHistory[productHistory.length - 1];
      if (previousProduct) {
        setProductHistory(current => current.slice(0, -1));
        setProductTransitionOrigin(null);
        setSelectedProduct(previousProduct);
        return;
      }
      setProductTransitionOrigin(null);
      if (productReturnScreen === 'home') {
        shouldRestoreHomeScrollRef.current = true;
      }
      skipNextPageTransitionRef.current = true;
      navigateBack(productReturnScreen);
    });
  };

  const openProduct = (product: Product, preferredCollectionId?: string, transitionOrigin?: ProductTransitionOrigin) => {
    const recommendationRequest = ++productRecommendationRequestRef.current;
    if (screen === 'home') pendingHomeScrollOffsetRef.current = homeScrollOffsetRef.current;
    // The measured origin is retained in the callbacks for future navigation
    // upgrades, but no floating duplicate is rendered during this transition.
    void transitionOrigin;
    setProductTransitionOrigin(null);
    setSharedProductTransitionVisible(false);
    setRecentlyViewed(current => [product, ...current.filter(item => item.id !== product.id)].slice(0, 10));
    if ((screen === 'product' || productOverlayVisible) && selectedProduct) {
      setProductHistory(current => [...current, selectedProduct]);
    } else {
      setProductHistory([]);
      setProductReturnScreen(screen === 'categoryCollection' || screen === 'categories' || screen === 'wishlist' || screen === 'offers' || screen === 'orders' || screen === 'search' || screen === 'discoverySearch' || screen === 'homeProducts' || screen === 'cart' ? screen : 'home');
    }
    setSelectedProduct(product);
    const canPresentOverSource = screen === 'home' || screen === 'categoryCollection' || screen === 'categories' || screen === 'offers' || screen === 'orders' || screen === 'wishlist';
    if (canPresentOverSource) setProductOverlayVisible(true);
    else setScreen('product');
    const immediateRecommendations = [...shopifyProducts, ...categoryProducts, ...recentlyViewed].filter((item, index, items) => item.id !== product.id && items.findIndex(candidate => candidate.id === item.id) === index).slice(0, 12);
    const collectionId = preferredCollectionId ?? product.collectionIds?.[0];
    if (!collectionId) {
      setProductPageRecommendations(immediateRecommendations);
      return;
    }
    setProductPageRecommendations(immediateRecommendations);
    fetchShopifyCollectionProducts(collectionId, 250)
      .then(page => {
        if (productRecommendationRequestRef.current === recommendationRequest) {
          const collectionRecommendations = page.products.map(mapShopifyProduct).filter(item => item.id !== product.id);
          setProductPageRecommendations(collectionRecommendations.length ? collectionRecommendations : immediateRecommendations);
        }
      })
      .catch(() => {
        if (productRecommendationRequestRef.current === recommendationRequest) setProductPageRecommendations(immediateRecommendations);
      });
  };

  const openCategoryCollection = (category: ShopifyMenuItem, collection: ShopifyMenuItem, origin: 'home' | 'categories' | 'offers') => {
    // Clear stale results before this screen becomes visible. The fetch effect
    // then fills it with this collection's actual products.
    setCollectionPageProducts([]);
    setCollectionBrands([]);
    setCollectionVendors([]);
    setCollectionActiveFilters([]);
    setCollectionFilterLoading(true);
    setCollectionPageTotal(null);
    setCollectionPageLoading(true);
    setSelectedCategoryGroup(category);
    setSelectedCollectionItem(collection);
    setCategoryCollectionReturnScreen(origin);
    setScreen('categoryCollection');
  };

  const openFooterPage = (target: 'home' | 'categories' | 'orders' | 'wishlist' | 'offers') => {
    if (screen === target || footerPageTransitioning) return;
    browseChromeProgress.stopAnimation();
    browseFooterProgress.stopAnimation();
    browseChromeCollapsedRef.current = false;
    browseFooterCollapsedRef.current = false;
    lastBrowseScrollYRef.current = 0;
    browseContentHeightRef.current = 0;
    browseViewportHeightRef.current = 0;
    browseChromeProgress.setValue(0);
    browseFooterProgress.setValue(0);
    setFooterPageTransitioning(true);
    setActiveFooterTab(target);
    setScreen(target);
    requestAnimationFrame(() => setFooterPageTransitioning(false));
  };

  const openDiscoverySearch = (origin: ReturnScreen = 'home', initialQuery = '') => {
    setDiscoverySearchReturnScreen(origin);
    setDiscoverySearchInitialQuery(initialQuery);
    setScreen('discoverySearch');
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
    setProfileReturnScreen(screen === 'categories' || screen === 'wishlist' || screen === 'offers' || screen === 'orders' ? screen : 'home');
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

  const completeCheckout = async (paymentMethod: 'online' | 'cod', discountCode?: string, outcome: 'success' | 'failure' = 'success') => {
    if (!shippingAddress || !selectedProduct) return;
    const checkoutItems = cartItems.length ? cartItems : [{ product: selectedProduct, quantity: Math.max(1, cartCount) }];
    const subtotal = checkoutItems.reduce((total, item) => total + (Number(item.product.price.replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0) * item.quantity, 0);
    const discount = discountCode?.trim().toUpperCase() === 'WELCOME10' ? subtotal * 0.1 : 0;
    const codFee = paymentMethod === 'cod' ? 200 : 0;
    const outcomeBase = { items: checkoutItems, paymentMethod, total: subtotal - discount + codFee, tax: subtotal * 0.18, codFee } as const;
    if (outcome === 'failure') {
      setOrderOutcome({ ...outcomeBase, success: false });
      setScreen('orderFailure');
      return;
    }
    try {
      const checkoutReference = Date.now().toString().slice(-8);
      setOrderOutcome({ ...outcomeBase, success: true, orderId: `BMP-${checkoutReference}` });
      setScreen('orderSuccess');
    } catch {
      setOrderOutcome({ ...outcomeBase, success: false });
      setScreen('orderFailure');
    }
  };

  const renderProduct = (item: Product) => (
    <ProductCard key={item.id} item={item} width={cardWidth} favorite={favorites.has(item.id)} quantity={cartItems.find(cartItem => cartItem.product.id === item.id)?.quantity ?? 0} onFavorite={() => toggleFavorite(item)} onAdd={() => addToCart(item)} onChangeQuantity={change => changeCartQuantity(item.id, change)} onOpen={origin => openProduct(item, undefined, origin)} />
  );

  const productOverlay = productOverlayVisible && selectedProduct ? <Modal visible transparent={false} animationType="fade" statusBarTranslucent onRequestClose={returnFromProduct}>
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]}>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: '#FFFFFF' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ProductDetail key={selectedProduct.id} width={contentWidth} topInset={insets.top} cartCount={cartCount} cartQuantity={cartItems.find(item => item.product.id === selectedProduct.id)?.quantity ?? 0} cartItems={cartItems} product={selectedProduct} recommendations={productPageRecommendations} favoriteIds={favorites} onBack={returnFromProduct} onSearch={() => { setProductOverlayVisible(false); openDiscoverySearch('product'); }} onAdd={addToCart} onChangeCartQuantity={changeCartQuantity} onCheckout={() => { setCartItems(current => current.length ? current : [{ product: selectedProduct, quantity: 1 }]); setCheckoutInitialStage(2); setProductOverlayVisible(false); if (customerAuth.isLoggedIn) setScreen('address'); else setCheckoutLoginRequired(true); }} onOpenProduct={(product, origin) => openProduct(product, undefined, origin)} onFavorite={toggleFavorite} />
        <CartPopup visible={cartPopupVisible && cartCount > 0} item={cartPreview} items={cartItems} count={cartCount} onOpen={() => { setProductOverlayVisible(false); openCart(); }} containerStyle={{ paddingBottom: floatingCartBottom }} />
        <HelpFab visible product={selectedProduct} cartBottom={floatingCartBottom} />
      </SafeAreaView>
    </View>
  </Modal> : null;

  if (!openingAnimationVisible && !customerAuth.loading && !customerAuth.isLoggedIn && !initialLoginSkipped && !checkoutLoginRequired) {
    return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: '#071A33' }]}><StatusBar barStyle="light-content" backgroundColor="transparent" translucent /><Animated.View style={[styles.loginEntrance, { opacity: loginEntranceOpacity, transform: [{ translateY: loginEntranceTranslateY }] }]}><SkippableLoginPage loading={customerAuth.loading} error={customerAuth.error} onLogin={customerAuth.login} onGoogleLogin={customerAuth.loginWithGoogle} directToLogin={directToLogin} onSkip={() => { setDirectToLogin(false); setHomeStartupSkeletonVisible(true); setInitialLoginSkipped(true); }} /></Animated.View></SafeAreaView>;
  }

  if (initialLoginSkipped && (homeStartupSkeletonVisible || shopifyLoading) && !openingAnimationVisible && !checkoutLoginRequired) return <HomeLoadingScreen />;

  if (checkoutLoginRequired && !customerAuth.isLoggedIn) {
    return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: '#071A33' }]}><StatusBar barStyle="light-content" backgroundColor="transparent" translucent /><View style={styles.loginEntrance}><SkippableLoginPage loading={customerAuth.loading} error={customerAuth.error} onLogin={customerAuth.login} onGoogleLogin={customerAuth.loginWithGoogle} directToLogin onSkip={() => { setCheckoutLoginRequired(false); setScreen('cart'); }} /></View></SafeAreaView>;
  }

  if (screen === 'categoryCollection' && selectedCategoryGroup && selectedCollectionItem) return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}>
    <StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} />
    <Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }, { translateY: collectionRevealTranslateY }] }]}>
    <CategoryCollectionPage
      category={selectedCategoryGroup}
      selectedCollection={selectedCollectionItem}
      previews={shopifyCollectionPreviews}
      products={collectionPageProducts}
      brands={collectionBrands}
      shippingOptions={collectionVendors}
      filterDataLoading={collectionFilterLoading}
      loading={collectionPageLoading}
      totalProducts={collectionPageTotal}
      loadingMore={collectionPageLoadingMore}
      hasNextPage={collectionPageHasNext}
      favoriteIds={favorites}
      cartQuantities={Object.fromEntries(cartItems.map(item => [item.product.id, item.quantity]))}
      cartCount={cartCount}
      onOpenSearch={() => openDiscoverySearch('categoryCollection')}
      onOpenWishlist={() => openFooterPage('wishlist')}
      onOpenCart={openCart}
      onLoadMore={loadMoreCollectionProducts}
      onApplyFilters={applyCollectionFilters}
      onBack={() => navigateBack(categoryCollectionReturnScreen)}
      onSelectCollection={collection => {
        setCollectionPageProducts([]);
        setCollectionBrands([]);
        setCollectionVendors([]);
        setCollectionActiveFilters([]);
        setCollectionFilterLoading(true);
        setCollectionPageTotal(null);
        setCollectionPageLoading(true);
        setCollectionScrollOffset(0);
        setSelectedCollectionItem(collection);
      }}
      onAdd={product => addToCart(mapShopifyProduct(product))}
      onChangeQuantity={(product, change) => changeCartQuantity(mapShopifyProduct(product).id, change)}
      onToggleFavorite={product => toggleFavorite(mapShopifyProduct(product))}
      onOpenProduct={(product, origin) => openProduct(mapShopifyProduct(product), selectedCollectionItem.resource?.id, origin)}
      initialScrollOffset={collectionScrollOffset}
      onScrollOffsetChange={setCollectionScrollOffset}
      onScrollRestored={() => {}}
    />
    <HelpFab visible cartBottom={floatingCartBottom} />
    <CartPopup visible={cartPopupVisible && cartCount > 0} item={cartPreview} items={cartItems} count={cartCount} onOpen={openCart} containerStyle={[styles.collectionCartPopupLayer, { paddingBottom: floatingCartBottom }]} />
    </Animated.View>
    {productOverlay}
  </SafeAreaView>;

  if (screen === 'homeProducts') {
    const listingProducts = homeProductListing === 'trending' ? categoryProducts : bestSellingHomeProducts;
    return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}><HomeProductListingPage title={homeProductListing === 'trending' ? 'Trending' : 'Best Selling'} products={listingProducts} favoriteIds={favorites} cartItems={cartItems} cartCount={cartCount} onBack={() => navigateBack('home')} onFavorite={toggleFavorite} onAdd={addToCart} onChangeCartQuantity={changeCartQuantity} onOpen={(product, origin) => openProduct(product, undefined, origin)} onOpenSearch={() => openDiscoverySearch('homeProducts')} onOpenCart={openCart} onOpenWishlist={() => openFooterPage('wishlist')} /><CartPopup visible={cartPopupVisible && cartCount > 0} item={cartPreview} items={cartItems} count={cartCount} onOpen={openCart} containerStyle={{ paddingBottom: floatingCartBottom }} /></Animated.View></SafeAreaView>;
  }

  if (screen === 'discoverySearch') return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#FFFFFF' }]}><StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} /><Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}><ProductDiscoverySearchPage products={bestSellingHomeProducts.length ? bestSellingHomeProducts : shopifyProducts} favoriteIds={favorites} cartItems={cartItems} initialQuery={discoverySearchInitialQuery} onBack={() => navigateBack(discoverySearchReturnScreen)} onSearch={runSearch} onFavorite={toggleFavorite} onAdd={addToCart} onChangeCartQuantity={changeCartQuantity} onOpen={(product, origin) => openProduct(product, undefined, origin)} /><CartPopup visible={cartPopupVisible && cartCount > 0} item={cartPreview} items={cartItems} count={cartCount} onOpen={openCart} containerStyle={{ paddingBottom: floatingCartBottom }} /></Animated.View></SafeAreaView>;

  if (screen === 'product' && selectedProduct) {
    const recommendations = productPageRecommendations;
    return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: '#FFFFFF' }]}><StatusBar barStyle="dark-content" backgroundColor="transparent" translucent /><Animated.View style={[styles.backRevealPage, { opacity: productRevealOpacity, transform: [{ translateY: productRevealTranslateY }, { scale: productRevealScale }] }]}><ProductDetail key={selectedProduct.id} width={contentWidth} topInset={insets.top} cartCount={cartCount} cartQuantity={cartItems.find(item => item.product.id === selectedProduct.id)?.quantity ?? 0} cartItems={cartItems} product={selectedProduct} recommendations={recommendations} favoriteIds={favorites} onBack={returnFromProduct} onSearch={() => openDiscoverySearch('product')} onAdd={addToCart} onChangeCartQuantity={changeCartQuantity} onCheckout={() => { setCartItems(current => current.length ? current : [{ product: selectedProduct, quantity: 1 }]); setCheckoutInitialStage(2); if (customerAuth.isLoggedIn) setScreen('address'); else setCheckoutLoginRequired(true); }} onOpenProduct={(product, origin) => openProduct(product, undefined, origin)} onFavorite={toggleFavorite} /><CartPopup visible={cartPopupVisible && cartCount > 0} item={cartPreview} items={cartItems} count={cartCount} onOpen={openCart} containerStyle={{ paddingBottom: floatingCartBottom }} /><HelpFab visible product={selectedProduct} cartBottom={floatingCartBottom} /></Animated.View></SafeAreaView>;
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
    return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#FFFFFF' }]}><StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} /><Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}><CartPage items={cartItems} recentlyViewed={cartSuggestions} wishlistProducts={wishlistProducts} favoriteIds={favorites} onBack={returnFromCart} onSearch={() => openDiscoverySearch('cart')} onChangeQuantity={changeCartQuantity} onCheckout={() => { if (cartItems[0]) { setSelectedProduct(cartItems[0].product); setCheckoutInitialStage(2); if (customerAuth.isLoggedIn) setScreen('address'); else setCheckoutLoginRequired(true); } }} onOpenProduct={(product, origin) => openProduct(product, undefined, origin)} onAdd={addToCart} onSeeAll={() => { setHomeProductListing('bestSelling'); setScreen('homeProducts'); }} onOpenWishlist={() => openFooterPage('wishlist')} onToggleFavorite={toggleFavorite} /></Animated.View></SafeAreaView>;
  }

  if ((screen === 'orderSuccess' || screen === 'orderFailure') && orderOutcome) return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}><OrderResultPage success={orderOutcome.success} orderId={orderOutcome.orderId} items={orderOutcome.items} address={shippingAddress} paymentMethod={orderOutcome.paymentMethod} total={orderOutcome.total} tax={orderOutcome.tax} codFee={orderOutcome.codFee} onHome={() => setScreen('home')} onRetry={() => setScreen('checkout')} /></Animated.View></SafeAreaView>;

  if (screen === 'checkout' && selectedProduct) return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}><CheckoutPage product={selectedProduct} quantity={Math.max(1, cartCount)} items={cartItems.length ? cartItems : [{ product: selectedProduct, quantity: Math.max(1, cartCount) }]} address={shippingAddress} initialStage={checkoutInitialStage} onBack={() => navigateBack('cart')} onAddress={() => setScreen('address')} onShopifyCheckout={completeCheckout} /></Animated.View></SafeAreaView>;

  if (screen === 'address') return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}><StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} /><Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}><AddressPage initialAddress={shippingAddress} onBack={() => navigateBack('cart')} onSave={(address, stage) => { setShippingAddress(address); setCheckoutInitialStage(stage); setScreen('checkout'); }} /></Animated.View></SafeAreaView>;

  if (screen === 'search') return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A254A' }]}>
    <StatusBar barStyle="light-content" backgroundColor="#0A254A" translucent={false} />
    <Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}>
    <View style={styles.searchResultsHeader}><Pressable onPress={() => navigateBack('home')} hitSlop={10}><Ionicons name="arrow-back" size={24} color="#FFFFFF" /></Pressable><View style={styles.searchResultsHeaderCopy}><Text style={styles.searchResultsHeaderTitle}>Search Results</Text><Text style={styles.searchResultsHeaderSubtitle}>Results for “{submittedSearch}”</Text></View><View style={{ width: 24 }} /></View>
    <ScrollView style={styles.searchResultsPage} contentContainerStyle={styles.searchResultsContent} showsVerticalScrollIndicator={false} bounces alwaysBounceVertical decelerationRate="normal" scrollEventThrottle={16} overScrollMode="auto">
      <View style={styles.wishlistHeadingBlock}><Text style={styles.wishlistHeading}>Search Results</Text><Text style={styles.wishlistCount}>{displayedSearchResults.length} products</Text></View>
      <View style={styles.searchInlineControls}><Pressable onPress={() => setSearchFilterVisible(true)} style={[styles.searchControl, searchFilterCount > 0 && styles.searchControlActive]}><Ionicons name="options-outline" size={18} color={searchFilterCount ? '#FFFFFF' : palette.ink} /><Text numberOfLines={1} style={[styles.searchControlText, searchFilterCount > 0 && styles.searchControlTextActive]}>Filters{searchFilterCount ? ` (${searchFilterCount})` : ''}</Text><Ionicons name="chevron-down" size={15} color={searchFilterCount ? '#FFFFFF' : palette.ink} /></Pressable><Pressable onPress={() => setSearchSort(current => current === 'Recommended' ? 'Price: Low' : current === 'Price: Low' ? 'Price: High' : current === 'Price: High' ? 'Name' : 'Recommended')} style={styles.searchControl}><Ionicons name="swap-vertical" size={18} color={palette.ink} /><Text numberOfLines={1} style={styles.searchControlText}>Sort: {searchSort}</Text><Ionicons name="chevron-down" size={15} color={palette.ink} /></Pressable></View>
      {searchLoading ? <View style={styles.wishlistEmpty}><SearchDiscoveryLoader size={34} /></View> : searchError ? <View style={styles.wishlistEmpty}><Ionicons name="cloud-offline-outline" size={52} color={palette.red} /><Text style={styles.wishlistEmptyTitle}>Search failed</Text><Text style={styles.wishlistEmptyCopy}>{searchError}</Text></View> : displayedSearchResults.length ? <><View style={styles.searchResultList}>{displayedSearchResults.map(item => <Pressable key={`search-${item.id}`} onPress={() => openProduct(item)} style={styles.searchResultRow}><Image source={item.image} style={styles.searchResultImage} resizeMode="contain" /><View style={styles.searchResultCopy}><Text numberOfLines={2} style={styles.searchResultTitle}>{item.name}</Text><Text style={styles.searchResultPrice}>{item.price}</Text></View><Ionicons name="chevron-forward" size={24} color={palette.blue} /></Pressable>)}</View>{searchHasNextPage ? <Pressable disabled={searchLoadingMore} onPress={loadMoreSearchResults} style={[styles.searchLoadMore, searchLoadingMore && styles.searchLoadMoreDisabled]}>{searchLoadingMore ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.searchLoadMoreText}>Load more</Text>}</Pressable> : null}</> : <View style={styles.wishlistEmpty}><Ionicons name="search-outline" size={52} color={palette.blue} /><Text style={styles.wishlistEmptyTitle}>No matching products</Text><Text style={styles.wishlistEmptyCopy}>Try another stock filter or keyword.</Text></View>}
    </ScrollView>
    <Modal visible={searchFilterVisible} transparent animationType="slide" onRequestClose={() => setSearchFilterVisible(false)}><Pressable style={styles.searchFilterBackdrop} onPress={() => setSearchFilterVisible(false)}><Pressable style={styles.searchFilterSheet} onPress={() => {}}><View style={styles.searchFilterHeader}><Text style={styles.searchFilterTitle}>Filters</Text><Pressable onPress={() => setSearchFilterVisible(false)}><Ionicons name="close" size={26} color={palette.heading} /></Pressable></View><View style={styles.searchFilterBody}><View style={styles.searchFilterPanel}><Text style={styles.searchFilterSection}>Brand</Text><ScrollView nestedScrollEnabled style={styles.searchFilterOptions} contentContainerStyle={styles.searchFilterOptionsContent} showsVerticalScrollIndicator>{searchBrandOptions.map(option => <Pressable key={`brand-${option}`} onPress={() => toggleSearchFilter(option, 'brand')} style={styles.searchFilterOption}><View style={[styles.searchCheckbox, searchBrands.has(option) && styles.searchCheckboxActive]}>{searchBrands.has(option) ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}</View><Text style={styles.searchFilterOptionText}>{option}</Text></Pressable>)}{!searchBrandOptions.length ? <Text style={styles.searchFilterEmpty}>No brand information available.</Text> : null}</ScrollView></View><View style={styles.searchFilterDivider} /><View style={styles.searchFilterPanel}><Text style={styles.searchFilterSection}>Shipping (Vendor)</Text><ScrollView nestedScrollEnabled style={styles.searchFilterOptions} contentContainerStyle={styles.searchFilterOptionsContent} showsVerticalScrollIndicator>{searchVendorOptions.map(option => <Pressable key={`vendor-${option}`} onPress={() => toggleSearchFilter(option, 'vendor')} style={styles.searchFilterOption}><View style={[styles.searchCheckbox, searchVendors.has(option) && styles.searchCheckboxActive]}>{searchVendors.has(option) ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}</View><Text style={styles.searchFilterOptionText}>{option}</Text></Pressable>)}{!searchVendorOptions.length ? <Text style={styles.searchFilterEmpty}>No shipping information available.</Text> : null}</ScrollView></View></View><View style={styles.searchFilterActions}><Pressable onPress={() => { setSearchBrands(new Set()); setSearchVendors(new Set()); }} style={styles.searchClearButton}><Text style={styles.searchClearText}>Clear all</Text></Pressable><Pressable onPress={() => setSearchFilterVisible(false)} style={styles.searchApplyButton}><Text style={styles.searchApplyText}>Show {displayedSearchResults.length} products</Text></Pressable></View></Pressable></Pressable></Modal>
    </Animated.View>
  </SafeAreaView>;

  if (screen === 'profile') return <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F4F7FD' }]}>
    <StatusBar barStyle="dark-content" backgroundColor="#F4F7FD" translucent={false} />
    <Animated.View style={[styles.backRevealPage, { opacity: backRevealOpacity, transform: [{ translateX: backRevealTranslateX }] }]}>
    <View style={styles.profileHeader}>
      <Pressable onPress={() => profileBackActionRef.current()} hitSlop={10}><Ionicons name="arrow-back" size={24} color={palette.heading} /></Pressable>
      <View style={styles.profileHeaderCopy}><Text style={styles.profileHeaderTitle}>My Profile</Text><Text style={styles.profileHeaderSubtitle}>Account, support and policies</Text></View>
    </View>
    <Animated.View style={[styles.profileEntrance, { opacity: profileEntranceOpacity }]}>
      <ProfilePage customer={customerAuth.customer} onBack={() => navigateBack(profileReturnScreen)} setMainBackAction={action => { profileBackActionRef.current = action; }} onLogout={() => { void customerAuth.logout(); setInitialLoginSkipped(false); setCheckoutLoginRequired(false); setScreen('home'); }} />
    </Animated.View>
    </Animated.View>
  </SafeAreaView>;

  return (
    <SafeAreaView style={[styles.safeArea, (screen === 'home' || screen === 'categories' || screen === 'wishlist' || screen === 'offers' || screen === 'orders') && styles.homeSafeArea, screen === 'home' && { backgroundColor: activeHomeHeroTheme.colors[0] }]}>
      <StatusBar barStyle="light-content" backgroundColor={screen === 'home' ? activeHomeHeroTheme.colors[0] : '#0A254A'} translucent={false} />
      <Animated.View style={[styles.app, activeFooterTab === 'home' && styles.homeEntranceBackground, { width: contentWidth, opacity: Animated.multiply(storefrontEntranceProgress, backRevealOpacity), transform: [{ translateX: backRevealTranslateX }] }]}>
        {screen === 'home' ? <HomeHeroBackground category={activeHomeMenu.label} /> : null}
        {collapseBrowseChrome ? <Animated.View style={[styles.homeCollapsibleHeader, { height: homeHeaderHeight, opacity: homeHeaderOpacity }]}>
          <View style={styles.deliveryHeader}>
          <View style={styles.deliveryBrandBlock}>
            <Image source={require('./images/blumaple-header-white.png')} style={styles.deliveryLogo} resizeMode="contain" />
            <Pressable onPress={openPincodeModal} style={styles.addAddressButton}><Ionicons name="location-outline" size={21} color={palette.white} /><Text style={[styles.addAddressText, styles.homeHeaderText]}>{deliveryPincode ? `Deliver to ${deliveryPincode}` : 'Deliver to'}</Text></Pressable>
          </View>
          <View style={styles.deliveryActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Open search" hitSlop={8} onPress={() => openDiscoverySearch(screen as ReturnScreen)} style={styles.headerActionButton}><Ionicons name="search-outline" size={25} color={palette.white} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open cart${cartCount ? `, ${cartCount} items` : ''}`} hitSlop={10} onPress={openCart} style={styles.headerCartButton}>
              <Ionicons name="cart-outline" size={26} color={palette.white} />
              {cartCount > 0 ? <View style={styles.headerCartBadge}><Text style={styles.headerCartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open account" hitSlop={8} onPress={() => customerAuth.isLoggedIn ? openProfile() : (setDirectToLogin(true), setInitialLoginSkipped(false))} style={styles.headerActionButton}><Ionicons name={customerAuth.isLoggedIn ? 'person-circle' : 'person-circle-outline'} size={27} color={palette.white} /></Pressable>
          </View>
          </View>
        </Animated.View> : <View style={[styles.deliveryHeader, screen === 'home' && styles.homeChromeTransparent]}>
          <View style={styles.deliveryBrandBlock}>
            <Image source={require('./images/blumaple-header-white.png')} style={[styles.deliveryLogo, styles.homeDeliveryLogo]} resizeMode="contain" />
            <Pressable onPress={openPincodeModal} style={styles.addAddressButton}><Ionicons name="location-outline" size={21} color={palette.blue} /><Text style={styles.addAddressText}>{deliveryPincode ? `Deliver to ${deliveryPincode}` : 'Deliver to'}</Text></Pressable>
          </View>
          <View style={styles.deliveryActions}>{screen === 'categories' || screen === 'offers' || screen === 'orders' || screen === 'wishlist' ? <Pressable accessibilityRole="button" accessibilityLabel="Open search" hitSlop={8} onPress={() => openDiscoverySearch(screen)} style={styles.headerActionButton}><Ionicons name="search-outline" size={25} color={palette.white} /></Pressable> : null}<Pressable accessibilityRole="button" accessibilityLabel={`Open cart${cartCount ? `, ${cartCount} items` : ''}`} hitSlop={10} onPress={openCart} style={styles.headerCartButton}><Ionicons name="cart-outline" size={26} color={palette.white} />{cartCount > 0 ? <View style={styles.headerCartBadge}><Text style={styles.headerCartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View> : null}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open account" hitSlop={8} onPress={() => customerAuth.isLoggedIn ? openProfile() : (setDirectToLogin(true), setInitialLoginSkipped(false))} style={styles.headerActionButton}><Ionicons name={customerAuth.isLoggedIn ? 'person-circle' : 'person-circle-outline'} size={27} color={palette.white} /></Pressable></View>
        </View>}

        {screen === 'home' ? <View style={styles.homeSearchZone}><Pressable accessibilityRole="search" accessibilityLabel="Search products" onPress={() => openDiscoverySearch('home')} style={styles.homeSearchButton}><Ionicons name="search-outline" size={23} color={palette.ink} /><View style={styles.homeSearchTextClip}><Animated.View style={[styles.homeSearchTextStack, { transform: [{ translateY: searchPlaceholderY.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) }] }]}><Text numberOfLines={1} style={styles.homeSearchButtonText}>Search &quot;{SEARCH_PLACEHOLDERS[searchPlaceholderIndex]}&quot;</Text><Text numberOfLines={1} style={styles.homeSearchButtonText}>Search &quot;{SEARCH_PLACEHOLDERS[(searchPlaceholderIndex + 1) % SEARCH_PLACEHOLDERS.length]}&quot;</Text></Animated.View></View></Pressable></View> : null}

        {screen === 'home' ? <View style={styles.homePinnedMenu} onLayout={event => { homeMenuViewportWidthRef.current = event.nativeEvent.layout.width; }}><ScrollView ref={homeMenuRef} horizontal showsHorizontalScrollIndicator={false} directionalLockEnabled nestedScrollEnabled decelerationRate="fast" snapToInterval={82} snapToAlignment="start" disableIntervalMomentum scrollEventThrottle={16} onContentSizeChange={width => { homeMenuContentWidthRef.current = width; }} contentContainerStyle={styles.blinkTabs}>
          {displayHomeMenus.map((menu, index) => {
            const active = activeCategory === menu.label;
            const icon = menu.label === 'Audio' ? (active ? 'headset' : 'headset-outline') : menu.label === 'Capture' ? (active ? 'camera' : 'camera-outline') : menu.label === 'Computers' ? (active ? 'laptop' : 'laptop-outline') : menu.label === 'Smart Tech' ? (active ? 'watch' : 'watch-outline') : menu.label === 'Home' ? (active ? 'home' : 'home-outline') : menu.label === 'Lifestyle' ? (active ? 'sparkles' : 'sparkles-outline') : (active ? 'build' : 'build-outline');
            return <Pressable key={menu.label} onPress={() => {
              setActiveCategory(menu.label);
              const viewportWidth = homeMenuViewportWidthRef.current;
              const maximumOffset = Math.max(0, homeMenuContentWidthRef.current - viewportWidth);
              const centeredOffset = index * 82 + 40 - viewportWidth / 2;
              homeMenuRef.current?.scrollTo({ x: Math.max(0, Math.min(centeredOffset, maximumOffset)), animated: true });
            }} style={[styles.blinkTab, index < displayHomeMenus.length - 1 && styles.blinkTabPartition, active && styles.blinkTabActive]}>
              <View style={styles.blinkTabIconWrap}><Ionicons name={icon} size={25} color="#FFFFFF" /></View>
              <Text style={[styles.blinkTabText, active && styles.blinkTabTextActive]}>{menu.label}</Text>
              {active ? <View style={styles.blinkTabIndicator} /> : null}
            </Pressable>;
          })}
        </ScrollView></View> : null}

        <Animated.ScrollView
          ref={homeScrollRef}
          contentOffset={screen === 'home' && shouldRestoreHomeScrollRef.current ? { x: 0, y: pendingHomeScrollOffsetRef.current } : undefined}
          key={screen}
          style={{ backgroundColor: screen === 'home' ? 'transparent' : palette.white }}
          showsVerticalScrollIndicator={false}
          bounces
          alwaysBounceVertical
          decelerationRate="normal"
          overScrollMode="auto"
          contentContainerStyle={[styles.content, collapseBrowseChrome && styles.browseContent]}
          onLayout={event => { browseViewportHeightRef.current = event.nativeEvent.layout.height; }}
          onContentSizeChange={(_, height) => {
            browseContentHeightRef.current = height;
            if (screen === 'home' && shouldRestoreHomeScrollRef.current) {
              shouldRestoreHomeScrollRef.current = false;
            }
            if (browseChromeCollapsedRef.current && height <= browseViewportHeightRef.current + 130) setBrowseChromeVisibility(false);
          }}
          onScroll={collapseBrowseChrome ? event => {
            if (footerPageTransitioning) return;
            const offsetY = Math.max(0, event.nativeEvent.contentOffset.y);
            if (screen === 'home') homeScrollOffsetRef.current = offsetY;
            const previousOffsetY = lastBrowseScrollYRef.current;
            const movement = offsetY - previousOffsetY;
            lastBrowseScrollYRef.current = offsetY;
            const hasStableScrollRange = browseContentHeightRef.current > browseViewportHeightRef.current + 130;
            if (collapseBrowseChrome) {
              if (!browseChromeCollapsedRef.current && offsetY > 24 && hasStableScrollRange) setBrowseChromeVisibility(true);
              else if (browseChromeCollapsedRef.current && offsetY < 8) setBrowseChromeVisibility(false);
            }
            const direction = movement > 0 ? 1 : movement < 0 ? -1 : 0;
            if (offsetY <= 4) {
              footerScrollDirectionRef.current = { direction: 0, distance: 0 };
              setBrowseFooterVisibility(false);
            } else if (direction) {
              const tracker = footerScrollDirectionRef.current;
              footerScrollDirectionRef.current = direction === tracker.direction
                ? { direction, distance: tracker.distance + Math.abs(movement) }
                : { direction, distance: Math.abs(movement) };
              if (footerScrollDirectionRef.current.distance >= 18) {
                setBrowseFooterVisibility(direction > 0);
                footerScrollDirectionRef.current.distance = 0;
              }
            }
          } : undefined}
          scrollEventThrottle={16}
        >
          {screen === 'home' ? <>
          <Animated.View style={{ opacity: homeCarouselEntrance, transform: [{ translateY: homeCarouselTranslateY }] }}>
          <View style={styles.carouselHeaderZone}>
          <View style={styles.carouselFade}>
          {carouselSlides.length ? <><ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            ref={carouselRef}
            contentOffset={{ x: carouselStep * (carouselSlideCount + (carouselSlideCount > 1 ? 1 : 0)), y: 0 }}
            snapToInterval={carouselStep}
            decelerationRate="fast"
            snapToAlignment="start"
            disableIntervalMomentum
            overScrollMode="never"
            onScrollBeginDrag={() => {
              carouselProgress.stopAnimation();
              carouselProgress.setValue(0);
            }}
            onMomentumScrollEnd={event => {
              const index = Math.round(event.nativeEvent.contentOffset.x / carouselStep);
              setActiveBanner(index % carouselSlideCount);
              setCarouselCycle(current => current + 1);
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
            contentContainerStyle={styles.promoCards}
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
              <View style={styles.promoCopy}><Text numberOfLines={slide.title.trim().split(/\s+/).filter(Boolean).length === 1 ? 1 : 2} adjustsFontSizeToFit minimumFontScale={0.66} style={[styles.promoTitle, slide.title.trim().split(/\s+/).filter(Boolean).length === 1 && styles.promoTitleSingle]}>{formatPromoTitle(slide.title)}</Text></View>
            </Pressable>)}
          </ScrollView>
          <CarouselProgressIndicators count={carouselSlideCount} activeIndex={activeBanner} fill={carouselProgress} /></> : null}
          </View>
          </View>
          </Animated.View>
          <Animated.View style={[styles.homeProductSections, { opacity: homeCategoryEntrance, transform: [{ translateY: homeCategoryTranslateY }] }]}>
          <HomeSectionHeader title="Shop by Category" showAction={false} />
          <View style={styles.shopCategoryGrid}>
            {shopCategories.map(({ id, label, image, collection, group }, index) => <Pressable key={id} style={[styles.shopCategoryItem, index % 3 !== 2 && styles.shopCategoryItemSpacing]} onPress={() => {
              if (collection && group) {
                openCategoryCollection(group, collection, 'home');
              }
            }}>
              <View style={styles.shopCategoryImageBlock}><View style={styles.shopCategoryImageClip}><CollectionArtwork source={image} /></View></View>
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.76} style={styles.shopCategoryLabel}>{label}</Text>
            </Pressable>)}
          </View>
          </Animated.View>
          <Animated.View style={[styles.homeProductSections, { opacity: homeTrendingEntrance, transform: [{ translateY: homeTrendingTranslateY }] }]}>
          <HomeSectionHeader title="Trending" showAction={false} />
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} directionalLockEnabled bounces alwaysBounceHorizontal decelerationRate="normal" scrollEventThrottle={16} overScrollMode="never" contentContainerStyle={styles.homeProductHorizontalRow}>
            {categoryProducts.slice(0, 9).map(item => <ProductCard key={`explore-${activeHomeMenu.label}-${item.id}`} item={item} width={trendingCardWidth} favorite={favorites.has(item.id)} quantity={cartItems.find(cartItem => cartItem.product.id === item.id)?.quantity ?? 0} collectionLayout onFavorite={() => toggleFavorite(item)} onAdd={() => addToCart(item)} onChangeQuantity={change => changeCartQuantity(item.id, change)} onOpen={origin => openProduct(item, undefined, origin)} />)}
          </ScrollView>
          {categoryProducts.length > 2 ? <Pressable onPress={() => { setHomeProductListing('trending'); setScreen('homeProducts'); }} style={({ pressed }) => [styles.homeViewAllButton, pressed && styles.pressed]}><View style={styles.homeViewAllThumbs}>{categoryProducts.slice(0, 3).map((item, index) => <Image key={item.id} source={item.image} style={[styles.homeViewAllThumb, index > 0 && styles.homeViewAllThumbOverlap]} resizeMode="contain" />)}</View><Text style={styles.homeViewAllText}>See all products</Text><Ionicons name="chevron-forward" size={16} color={palette.blue} /></Pressable> : null}
          </Animated.View>
          <Animated.View style={[styles.homeProductSections, { opacity: homeBestSellingEntrance, transform: [{ translateY: homeBestSellingTranslateY }] }]}>
          <HomeSectionHeader title="Best Selling" showAction={false} />
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} directionalLockEnabled bounces alwaysBounceHorizontal decelerationRate="normal" scrollEventThrottle={16} overScrollMode="never" contentContainerStyle={styles.homeProductHorizontalRow}>
            {bestSellingHomeProducts.slice(0, 9).map(item => <ProductCard key={`grid-${activeHomeMenu.label}-${item.id}`} item={item} width={trendingCardWidth} favorite={favorites.has(item.id)} quantity={cartItems.find(cartItem => cartItem.product.id === item.id)?.quantity ?? 0} collectionLayout onFavorite={() => toggleFavorite(item)} onAdd={() => addToCart(item)} onChangeQuantity={change => changeCartQuantity(item.id, change)} onOpen={origin => openProduct(item, undefined, origin)} />)}
          </ScrollView>
          {bestSellingHomeProducts.length > 2 ? <Pressable onPress={() => { setHomeProductListing('bestSelling'); setScreen('homeProducts'); }} style={({ pressed }) => [styles.homeViewAllButton, pressed && styles.pressed]}><View style={styles.homeViewAllThumbs}>{bestSellingHomeProducts.slice(0, 3).map((item, index) => <Image key={item.id} source={item.image} style={[styles.homeViewAllThumb, index > 0 && styles.homeViewAllThumbOverlap]} resizeMode="contain" />)}</View><Text style={styles.homeViewAllText}>See all products</Text><Ionicons name="chevron-forward" size={16} color={palette.blue} /></Pressable> : null}
          </Animated.View>
          {recentlyViewed.length ? <View style={styles.homeProductSections}>
          <HomeSectionHeader title="Recently Viewed" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.homeProductHorizontalRow}>
            {recentlyViewed.map(item => <ProductCard key={`recent-${item.id}`} item={item} width={trendingCardWidth} favorite={favorites.has(item.id)} quantity={cartItems.find(cartItem => cartItem.product.id === item.id)?.quantity ?? 0} collectionLayout onFavorite={() => toggleFavorite(item)} onAdd={() => addToCart(item)} onChangeQuantity={change => changeCartQuantity(item.id, change)} onOpen={origin => openProduct(item, undefined, origin)} />)}
          </ScrollView>
          </View> : null}

          </> : screen === 'orders' ? <View style={styles.ordersPage}>
            <View style={styles.ordersHeadingBlock}>
              <Text style={styles.ordersHeading}>Order History</Text>
            </View>
            <View style={styles.orderList}>
              {displayedHistoryOrders.length ? displayedHistoryOrders.map(order => {
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
              </Pressable>}) : <View style={styles.wishlistEmpty}><Ionicons name="receipt-outline" size={52} color={palette.blue} /><Text style={styles.wishlistEmptyTitle}>No orders yet</Text><Text style={styles.wishlistEmptyCopy}>Orders placed with this account will appear here.</Text><Pressable onPress={() => setScreen('home')} style={styles.wishlistShopButton}><Text style={styles.wishlistShopButtonText}>Start shopping</Text></Pressable></View>}
            </View>
          </View> : screen === 'offers' ? <View style={styles.offersPage}>
            <View style={styles.offersHeadingBlock}>
              <Text style={styles.offersHeading}>Offers &amp; Discounts</Text>
              <Text style={styles.offersSubtitle}>Explore special collections selected for you</Text>
            </View>
            <View style={styles.offersGrid}>
              {offerDeals.map((offer, index) => <Pressable key={`offer-${offer.id}`} onPress={() => {
                if (offer.category) openCategoryCollection(offer.category, offer.category.items[0] ?? offer.category, 'offers');
                else openProduct(offer.product);
              }} style={[styles.offerCard, index === 0 && styles.offerCardFeatured]}>
                <LinearGradient colors={offer.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.offerCardGradient}>
                  <View style={styles.offerDealTop}><Text style={styles.offerDiscount}>{offer.discount}</Text><Ionicons name="arrow-forward" size={16} color="#FFFFFF" /></View>
                  <View style={[styles.offerCardCopy, index === 0 && styles.offerCardFeaturedCopy]}><Text style={styles.offerCardCaption}>{offer.caption}</Text><Text numberOfLines={2} style={styles.offerCardTitle}>{offer.title}</Text><View style={styles.offerCardAction}><Text style={styles.offerCardActionText}>SHOP NOW</Text><Ionicons name="arrow-forward" size={12} color="#172A43" /></View></View>
                  <Image source={offer.image} style={[styles.offerCardImage, index === 0 && styles.offerCardFeaturedImage]} resizeMode="contain" />
                </LinearGradient>
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
        {screen === 'home' && keyboardVisible && searchQuery.trim() ? <View style={styles.searchSuggestions}>{searchLoading && !searchMatches.length ? <View style={styles.searchSuggestionLoading}><SearchDiscoveryLoader /></View> : searchError ? <Text style={styles.searchNoSuggestions}>{searchError}</Text> : searchMatches.slice(0, 2).map(product => <Pressable key={`suggestion-${product.id}`} onPress={() => { setSearchQuery(''); Keyboard.dismiss(); openProduct(product); }} style={styles.searchSuggestion}><Image source={product.image} style={styles.searchSuggestionImage} resizeMode="contain" /><View style={styles.searchSuggestionCopy}><Text numberOfLines={1} style={styles.searchSuggestionName}>{product.name}</Text><Text style={styles.searchSuggestionPrice}>{product.price}</Text></View><Ionicons name="chevron-forward" size={18} color={palette.blue} /></Pressable>)}{!searchLoading && !searchError && !searchMatches.length ? <Text style={styles.searchNoSuggestions}>No products match this title or SKU</Text> : null}</View> : null}
      <View style={styles.floatingFooter}>
          <Pressable onPress={() => openFooterPage('home')} style={[styles.footerTab, activeFooterTab === 'home' && styles.footerTabSelected]}>
            <Ionicons name={activeFooterTab === 'home' ? 'home' : 'home-outline'} size={25} color={activeFooterTab === 'home' ? palette.blue : palette.muted} />
            <Text style={[styles.footerTabText, activeFooterTab === 'home' && styles.footerTabActive]}>Home</Text>
          </Pressable>
          <Pressable onPress={() => openFooterPage('categories')} style={[styles.footerTab, activeFooterTab === 'categories' && styles.footerTabSelected]}>
            <Ionicons name={activeFooterTab === 'categories' ? 'grid' : 'grid-outline'} size={25} color={activeFooterTab === 'categories' ? palette.blue : palette.muted} />
            <Text style={[styles.footerTabText, activeFooterTab === 'categories' && styles.footerTabActive]}>Explore</Text>
          </Pressable>
          <Pressable onPress={() => openFooterPage('orders')} style={[styles.footerTab, activeFooterTab === 'orders' && styles.footerTabSelected]}>
            <Ionicons name={activeFooterTab === 'orders' ? 'bag-handle' : 'bag-handle-outline'} size={25} color={activeFooterTab === 'orders' ? palette.blue : '#555'} />
            <Text style={[styles.footerTabText, activeFooterTab === 'orders' && styles.footerTabActive]}>Orders</Text>
          </Pressable>
          <Pressable onPress={() => openFooterPage('wishlist')} style={[styles.footerTab, activeFooterTab === 'wishlist' && styles.footerTabSelected]}>
            <Ionicons name={activeFooterTab === 'wishlist' ? 'heart' : 'heart-outline'} size={25} color={activeFooterTab === 'wishlist' ? palette.blue : '#555'} />
            <Text style={[styles.footerTabText, activeFooterTab === 'wishlist' && styles.footerTabActive]}>Wishlist</Text>
          </Pressable>
          <Pressable onPress={openOffers} style={[styles.footerTab, activeFooterTab === 'offers' && styles.footerTabSelected]}>
            <Ionicons name={activeFooterTab === 'offers' ? 'pricetag' : 'pricetag-outline'} size={25} color={activeFooterTab === 'offers' ? palette.blue : palette.muted} />
            <Text style={[styles.footerTabText, activeFooterTab === 'offers' && styles.footerTabActive]}>Offers</Text>
          </Pressable>
        </View>
      </Animated.View>
      {productOverlay}
      <Modal visible={pincodeModalVisible} transparent animationType="none" onRequestClose={closePincodeModal}>
        <Animated.View style={[styles.modalBackdrop, { opacity: pincodeModalProgress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closePincodeModal} />
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
          <Pressable style={StyleSheet.absoluteFill} onPress={closeHistoryOrder} />
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
      <CartPopup visible={cartPopupVisible && cartCount > 0} item={cartPreview} items={cartItems} count={cartCount} onOpen={openCart} containerStyle={{ paddingBottom: floatingCartBottom }} />
      <HelpFab visible={isFooterScreen && !openingAnimationVisible && !customerAuth.loading && (customerAuth.isLoggedIn || initialLoginSkipped) && !footerPageTransitioning} cartBottom={floatingCartBottom} />
      <View pointerEvents="none" style={[styles.bottomSafeFill, styles.bottomSafeFillWhite, { height: Math.max(insets.bottom, 2) }]} />
      {openingAnimationVisible ? <View pointerEvents="none" style={styles.openingAnimationOverlay}>
        <View style={styles.openingSequenceGroup}>
          <View style={styles.openingRoute}>
            <Animated.View style={[styles.openingSequenceVehicle, { opacity: openingFlightOpacity, transform: [{ translateX: openingFlightTranslateX }] }]}><Ionicons name="airplane" size={42} color={palette.blue} /></Animated.View>
            <Animated.View style={[styles.openingSequenceVehicle, { opacity: openingTruckOpacity, transform: [{ translateX: openingTruckTranslateX }] }]}><MaterialCommunityIcons name="truck-fast-outline" size={42} color={palette.red} /></Animated.View>
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
  return <SafeAreaProvider><NotificationToastProvider>{showDashboard ? <DashboardPage /> : <Storefront />}</NotificationToastProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  homeLoadingSafeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  homeLoadingHeader: { height: 128, paddingHorizontal: 18, paddingTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0A254A' },
  homeLoadingHeaderCopy: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  homeLoadingHeaderLines: { gap: 0 },
  homeLoadingShortLine: { width: 88, height: 10, borderRadius: 5, backgroundColor: '#557293' },
  homeLoadingLongLine: { width: 138, height: 8, borderRadius: 4, backgroundColor: '#3F5E80' },
  homeLoadingBody: { flex: 1, paddingTop: 14, backgroundColor: '#FFFFFF' },
  homeLoadingSearch: { height: 52, marginHorizontal: 16, borderRadius: 15, backgroundColor: '#E6EDF5' },
  homeLoadingHero: { height: 184, marginTop: 18, marginHorizontal: 16, overflow: 'hidden', borderRadius: 18 },
  homeLoadingHeroFill: { width: '100%', height: '100%', borderRadius: 18, backgroundColor: '#DCE7F2' },
  homeLoadingSection: { marginTop: 26, paddingHorizontal: 16 },
  homeLoadingTitleLine: { width: 144, height: 18, borderRadius: 6, backgroundColor: '#DCE5F0' },
  homeLoadingCards: { marginTop: 15, flexDirection: 'row', justifyContent: 'space-between' },
  homeLoadingCardLine: { width: 58, height: 10, borderRadius: 5, backgroundColor: '#E1E8F0' },
  homeSafeArea: { backgroundColor: '#0A254A' },
  homeHeroSurface: { position: 'relative', overflow: 'hidden', backgroundColor: '#0A254A' },
  homeContentSurface: { position: 'relative', backgroundColor: '#FFFFFF' },
  app: { flex: 1, alignSelf: 'center', backgroundColor: palette.white },
  homeChromeGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 460, zIndex: 0 },
  homeChromeTransparent: { backgroundColor: 'transparent' },
  backRevealPage: { flex: 1 },
  sharedProductElement: { position: 'absolute', zIndex: 100, elevation: 100, overflow: 'hidden', borderRadius: 14, backgroundColor: '#FFFFFF' },
  sharedProductElementImage: { width: '100%', height: '100%' },
  homeEntranceBackground: { backgroundColor: '#FFFFFF' },
  loginEntrance: { flex: 1 },
  openingAnimationOverlay: { ...StyleSheet.absoluteFill, zIndex: 100, overflow: 'hidden', alignItems: 'center', backgroundColor: '#0A254A' },
  openingSequenceGroup: { position: 'absolute', top: '50%', left: 0, right: 0, marginTop: -87, height: 134, alignItems: 'center', justifyContent: 'center' },
  openingRoute: { width: 260, height: 70, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  openingSequenceVehicle: { position: 'absolute' },
  openingAnimationMessage: { marginTop: 12, paddingHorizontal: 24, color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, fontStyle: 'italic', textAlign: 'center' },
  openingVehicle: { position: 'absolute' },
  homeCollapsibleHeader: { overflow: 'hidden', backgroundColor: '#0A254A' },
  profileEntrance: { flex: 1, overflow: 'hidden', backgroundColor: '#F4F7FD' },
  profileHeader: { height: 72, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F4F7FD' },
  profileHeaderCopy: { flex: 1, marginHorizontal: 14 },
  profileHeaderTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 20, fontWeight: '900' },
  profileHeaderSubtitle: { display: 'none' },
  profileHeaderAccount: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  deliveryHeader: { height: 74, paddingHorizontal: 16, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0A254A' },
  transportLane: { height: 34, overflow: 'hidden', position: 'relative', backgroundColor: homeChrome },
  orbitLine: { position: 'absolute', left: 0, right: 0, top: 16, height: 4, borderRadius: 2, backgroundColor: '#C9D2DF' },
  redTrack: { backgroundColor: palette.red },
  blueTrack: { backgroundColor: palette.blue },
  transportTrail: { position: 'absolute', left: 0, top: 16, height: 4, borderRadius: 2 },
  flightTrail: { backgroundColor: palette.blue },
  truckTrail: { backgroundColor: palette.red },
  transportFlight: { position: 'absolute', left: 0, top: -1 },
  transportTruck: { position: 'absolute', left: 0, top: -3 },
  deliveryBrandBlock: { zIndex: 1, flex: 1, alignSelf: 'stretch', justifyContent: 'center', position: 'relative' },
  deliveryLogo: { width: 158, height: 42, marginLeft: -12, alignSelf: 'flex-start' },
  homeDeliveryLogo: { width: 184, height: 50 },
  addAddressButton: { display: 'none', position: 'absolute', left: -2, bottom: -20, minWidth: 150, flexDirection: 'row', alignItems: 'center', gap: 5 },
  addAddressText: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '600', fontStyle: 'italic', textDecorationLine: 'underline' },
  homeHeaderText: { color: palette.white },
  deliveryBrand: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 18, fontWeight: '800' },
  deliveryTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  deliveryTime: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -1 },
  deliveryDistance: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, overflow: 'hidden', backgroundColor: '#DCE7FF', color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  deliveryAddress: { marginTop: 2, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '600' },
  deliveryActions: { zIndex: 1, flexDirection: 'row', gap: 6, alignItems: 'center' },
  headerActionButton: { position: 'relative', width: 36, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCartButton: { position: 'relative', width: 36, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCartBadge: { position: 'absolute', top: 2, right: 1, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.red, borderWidth: 1.5, borderColor: '#0A254A' },
  headerCartBadgeText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 8, fontWeight: '900' },
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
  browseContent: { paddingBottom: 78, backgroundColor: palette.white },
  carouselHeaderZone: { marginHorizontal: 0, paddingHorizontal: 0, paddingBottom: 0, backgroundColor: 'transparent' },
  carouselFade: { marginTop: 8, marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: 'transparent' },
  carouselLoading: { height: 218, marginHorizontal: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#12345B' },
  carouselLoadingText: { color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '600' },
  skeletonLoader: { alignItems: 'center', justifyContent: 'center' },
  skeletonLoaderBlock: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#DCE5F0' },
  zigzagPartition: { height: 24, marginTop: -8, marginHorizontal: 0, flexDirection: 'row', overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: palette.white },
  bottomSafeFill: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 25, backgroundColor: '#FFFFFF' },
  bottomSafeFillWhite: { backgroundColor: '#FFFFFF' },
  zigzagTooth: { display: 'none' },
  staticSearchZone: { paddingTop: 2, paddingBottom: 10, overflow: 'visible', backgroundColor: homeChrome, zIndex: 100, elevation: 20 },
  searchBox: { height: 52, marginHorizontal: 16, borderWidth: 0, borderRadius: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.white, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 },
  searchInputWrap: { flex: 1, height: '100%', justifyContent: 'center', overflow: 'hidden' },
  searchAnimatedPlaceholder: { position: 'absolute', left: 0, color: '#9B9B9B', fontFamily: 'Inter_400Regular', fontSize: 12 },
  searchInput: { flex: 1, padding: 0, fontFamily: 'Inter_400Regular', fontSize: 12, color: palette.ink },
  searchSuggestions: { position: 'absolute', left: 28, right: 28, top: 174, overflow: 'hidden', zIndex: 500, borderWidth: 1, borderColor: '#D5DBE3', borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 50 },
  searchSuggestionLoading: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  searchSuggestion: { minHeight: 62, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3E7EC' },
  searchSuggestionImage: { width: 46, height: 46, borderRadius: 7, backgroundColor: '#F7F8FA' },
  searchSuggestionCopy: { flex: 1, marginHorizontal: 10 },
  searchSuggestionName: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  searchSuggestionPrice: { marginTop: 3, color: palette.red, fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '900' },
  searchNoSuggestions: { padding: 16, color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center' },
  searchResultsHeader: { height: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A254A', borderBottomWidth: 1, borderBottomColor: '#294565' },
  searchResultsHeaderCopy: { flex: 1, marginHorizontal: 14 },
  searchResultsHeaderTitle: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 18, fontWeight: '900' },
  searchResultsHeaderSubtitle: { marginTop: 3, color: '#B9D6FF', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '700' },
  searchResultsPage: { flex: 1, backgroundColor: '#FFFFFF' },
  searchResultsContent: { paddingBottom: 28 },
  searchInlineControls: { paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', gap: 8, backgroundColor: '#FFFFFF' },
  searchControls: { minHeight: 64, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#DDE2E8', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 7, elevation: 10 },
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
  searchResultGrid: { paddingHorizontal: 12, paddingBottom: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  searchResultRow: { minHeight: 104, paddingVertical: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E8EC', backgroundColor: '#FFFFFF' },
  searchResultImage: { width: 78, height: 78, borderRadius: 9, backgroundColor: '#FFFFFF' },
  searchResultCopy: { flex: 1, marginHorizontal: 12 },
  searchResultTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 20, fontWeight: '800' },
  searchResultPrice: { marginTop: 5, color: palette.red, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  searchLoadMore: { width: 150, height: 44, marginTop: 20, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.blue },
  searchLoadMoreDisabled: { opacity: 0.6 },
  searchLoadMoreText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  homePinnedMenu: { position: 'relative', flexShrink: 0, borderBottomWidth: 0, backgroundColor: 'transparent', zIndex: 15 },
  homeSearchZone: { position: 'relative', paddingHorizontal: 15, paddingTop: 3, paddingBottom: 7, backgroundColor: 'transparent', zIndex: 15 },
  homeSearchButton: { height: 50, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 6, elevation: 3 },
  homeSearchTextClip: { flex: 1, height: 24, overflow: 'hidden' },
  homeSearchTextStack: { height: 48 },
  homeSearchButtonText: { height: 24, lineHeight: 24, color: '#697586', fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '600' },
  blinkTabs: { gap: 2, paddingTop: 11, paddingHorizontal: 0, alignItems: 'center', backgroundColor: 'transparent' },
  blinkTab: { position: 'relative', width: 80, height: 65, paddingHorizontal: 3, paddingTop: 7, paddingBottom: 10, gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  blinkTabIconWrap: { position: 'relative', width: 32, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  blinkTabGradient: { ...StyleSheet.absoluteFill, borderRadius: 13 },
  blinkTabPartition: { borderRightWidth: 0 },
  blinkTabActive: { backgroundColor: 'transparent' },
  blinkTabIndicator: { position: 'absolute', left: 12, right: 12, bottom: -1, height: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#D83434' },
  blinkTabText: { width: '100%', color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 12, fontWeight: '700', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  blinkTabTextActive: { color: '#FFFFFF', fontWeight: '900' },
  promoCards: { paddingVertical: 0 },
  promoCard: { height: 176, overflow: 'hidden', backgroundColor: 'transparent' },
  promoImageFrame: { position: 'absolute', top: 8, right: 4, bottom: 8, width: '42%', alignItems: 'center', justifyContent: 'center' },
  promoImage: { width: '100%', height: '100%' },
  promoCopy: { position: 'absolute', zIndex: 2, elevation: 2, top: 20, bottom: 20, left: 18, width: '54%', justifyContent: 'center', alignItems: 'flex-start' },
  promoTitle: { width: '100%', color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 23, lineHeight: 28, fontWeight: '900', letterSpacing: -0.45, textShadowColor: 'rgba(0,0,0,0.62)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  promoTitleSingle: { fontSize: 25, lineHeight: 29, letterSpacing: -0.7 },
  blinkDivider: { marginTop: 15, marginHorizontal: 0, paddingVertical: 12, alignItems: 'center', backgroundColor: '#EEF3FF' },
  blinkDividerText: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 12, letterSpacing: 2, fontWeight: '800' },
  exploreRow: { gap: 10, paddingBottom: 10 },
  homeProductHorizontalRow: { gap: 12, paddingBottom: 12 },
  homeViewAllButton: { height: 54, marginTop: 4, marginBottom: 12, paddingHorizontal: 16, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F2F6FC' },
  homeViewAllThumbs: { width: 54, height: 30, flexDirection: 'row', alignItems: 'center' },
  homeViewAllThumb: { width: 28, height: 28, borderWidth: 1, borderColor: '#FFFFFF', borderRadius: 14, backgroundColor: '#FFFFFF' },
  homeViewAllThumbOverlap: { marginLeft: -15 },
  homeViewAllText: { color: '#314866', fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '800' },
  homeListingPage: { flex: 1, backgroundColor: palette.white },
  homeListingHeader: { height: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0A254A' },
  homeListingBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  homeListingHeaderCopyBlock: { flex: 1, minWidth: 0 },
  homeListingHeaderTitle: { color: palette.white, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '900' },
  homeListingHeaderCopy: { marginTop: 2, color: '#B9D6FF', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '600' },
  homeListingHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  homeListingHeaderAction: { position: 'relative', width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  homeListingBadge: { position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.red },
  homeListingBadgeText: { color: palette.white, fontFamily: 'Inter_400Regular', fontSize: 9, fontWeight: '900' },
  homeListingBody: { flex: 1, paddingTop: 16, backgroundColor: palette.white },
  homeListingProductScroll: { paddingHorizontal: 16, paddingBottom: 24 },
  homeListingProductGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 18, columnGap: 8 },
  homeListingEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  homeListingEmptyText: { color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '600' },
  homeListingBottomBar: { minHeight: 64, paddingHorizontal: 10, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E1E4E8', backgroundColor: palette.white, shadowColor: '#000000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 10 },
  homeListingControl: { flex: 1, minHeight: 50, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  homeListingControlText: { flexShrink: 1, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  homeListingControlDivider: { width: 1, height: 30, backgroundColor: '#D9DDE2' },
  homeListingModalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  homeListingSheet: { paddingBottom: 24, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: palette.white },
  homeListingSheetHeader: { height: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#ECEEF1' },
  homeListingSheetTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 20, fontWeight: '900' },
  homeListingOption: { minHeight: 54, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeListingOptionText: { color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '600' },
  homeListingOptionTextActive: { color: palette.blue, fontWeight: '900' },
  discoverySearchPage: { flex: 1, backgroundColor: palette.white },
  discoverySearchHeader: { height: 48, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D9DDE3', backgroundColor: palette.white },
  discoverySearchBack: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  discoverySearchInput: { flex: 1, minWidth: 0, height: 44, paddingVertical: 0, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '600' },
  discoverySearchSubmit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  discoverySearchContent: { paddingHorizontal: 16, paddingTop: 26, paddingBottom: 30 },
  discoverySearchTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 22, lineHeight: 28, fontWeight: '900' },
  discoverySearchChips: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  discoverySearchChip: { minHeight: 42, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 7, backgroundColor: '#0A254A' },
  discoverySearchChipText: { color: palette.white, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '800' },
  discoveryLiveSuggestionList: { overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: '#EDF0F4', backgroundColor: '#FFFFFF' },
  discoveryLiveSuggestion: { minHeight: 52, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 12 },
  discoveryLiveSuggestionImage: { width: 35, height: 35, borderRadius: 7, backgroundColor: '#F6F7F9' },
  discoveryLiveSuggestionText: { flex: 1, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '700' },
  discoveryLiveResultsTitle: { marginTop: 22, marginBottom: 15, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 17, fontWeight: '900' },
  discoverySearchEmpty: { marginTop: 25, color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
  discoveryViewAll: { minHeight: 44, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  discoveryViewAllText: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900' },
  discoveryLovedTitle: { marginTop: 34, marginBottom: 16 },
  discoveryProductGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 18, columnGap: 8 },
  homeProductSections: { paddingHorizontal: 16, paddingBottom: 8, backgroundColor: palette.white },
  homeSectionHeader: { minHeight: 62, paddingTop: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeSectionHeaderFull: { justifyContent: 'flex-start' },
  homeSectionTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 20, lineHeight: 25, fontWeight: '900', letterSpacing: -0.25 },
  homeSectionTitleFull: { width: '100%', flexShrink: 0 },
  homeSectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  homeSectionActionText: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '700' },
  shopCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 11 },
  shopCategoryItem: { position: 'relative', width: '30.5%', height: 136, paddingHorizontal: 4, paddingTop: 5, paddingBottom: 5, overflow: 'hidden', borderWidth: 1, borderColor: '#E8EDF4', borderRadius: 12, alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 2 },
  shopCategoryItemSpacing: { marginRight: '4.25%' },
  shopCategoryImageBlock: { width: 92, height: 90, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  shopCategoryImageClip: { width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  shopCategoryImage: { width: '100%', height: '100%', borderRadius: 11, transform: [{ scale: 1.42 }] },
  collectionArtwork: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  collectionArtworkHidden: { position: 'absolute', opacity: 0.01 },
  shopCategoryLabel: { width: '100%', minHeight: 26, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 13, fontWeight: '900', textAlign: 'center', textAlignVertical: 'center' },
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
  carouselProgressRow: { height: 22, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  carouselProgressTrack: { width: 18, height: 4, overflow: 'hidden', borderRadius: 2, backgroundColor: '#D3DDED' },
  carouselProgressFill: { height: '100%', borderRadius: 2, backgroundColor: '#E84A57' },
  carouselProgressDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#778BA8' },
  sectionTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 19, fontWeight: '800', marginTop: 22, marginBottom: 12 },
  productCard: { marginBottom: 15 },
  collectionProductCard: { marginBottom: 4, backgroundColor: '#FFFFFF' },
  detailRecommendationCard: { marginBottom: 0, backgroundColor: 'transparent' },
  collectionProductVisual: { width: '100%', aspectRatio: 0.88, overflow: 'hidden', borderWidth: 1.25, borderColor: '#C9D3E1', borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  detailRecommendationVisual: { aspectRatio: 0.88, borderWidth: 0, borderRadius: 9, backgroundColor: '#FFFFFF' },
  collectionProductImage: { position: 'absolute', left: '5%', bottom: 4, width: '90%', height: '82%' },
  collectionUnavailable: { opacity: 0.45 },
  collectionDiscountBadge: { position: 'absolute', top: 0, left: 0, minWidth: 38, height: 22, paddingHorizontal: 6, borderTopLeftRadius: 9, borderBottomRightRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D83434' },
  collectionDiscountText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '900' },
  collectionComingSoon: { position: 'absolute', top: 0, left: 0, height: 24, paddingHorizontal: 8, borderTopLeftRadius: 9, borderBottomRightRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B98725' },
  collectionComingSoonText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '900' },
  collectionHeart: { position: 'absolute', right: 4, top: 4, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  collectionUnitRow: { position: 'relative', zIndex: 4, height: 26, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', backgroundColor: 'transparent' },
  detailRecommendationUnitRow: { height: 0 },
  collectionPageCompactUnitRow: { height: 0 },
  collectionImageAction: { position: 'absolute', top: -18, right: 0, minWidth: 58, height: 40, paddingHorizontal: 10, borderWidth: 1.5, borderColor: palette.blue, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue, shadowColor: '#0A254A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 4, elevation: 4 },
  detailRecommendationAction: { top: -40, right: 0, minWidth: 54, height: 36, borderRadius: 8 },
  collectionPageCompactAction: { top: -36, minWidth: 56, height: 36 },
  collectionQuantityAction: { width: 58, minWidth: 58, paddingHorizontal: 2, flexDirection: 'row', justifyContent: 'space-between' },
  cardQuantityTap: { minWidth: 17, height: '100%', alignItems: 'center', justifyContent: 'center' },
  cardQuantityText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  collectionImageActionText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  collectionNotifyAction: { minWidth: 68, borderColor: '#2E8B36', backgroundColor: '#FFFFFF', shadowColor: '#1F6D2C' },
  collectionNotifiedAction: { minWidth: 40, width: 40, paddingHorizontal: 0, borderRadius: 9 },
  collectionNotifyText: { color: '#2E8B36' },
  notifyIconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  notifyTick: { position: 'absolute', top: -6, right: -8, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2E8B36' },
  notifyToast: { position: 'absolute', right: 0, bottom: '100%', minWidth: 122, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: '#1A1C1D', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 5 },
  notifyToastText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '700' },
  collectionProductName: { minHeight: 44, marginTop: 0, color: palette.ink, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  detailRecommendationName: { minHeight: 32, marginTop: 1, fontSize: 11, lineHeight: 16 },
  collectionPageCompactName: { minHeight: 32, marginTop: 0, fontSize: 13, lineHeight: 18 },
  collectionPriceRow: { minHeight: 20, marginTop: 0, flexDirection: 'row', alignItems: 'baseline', columnGap: 4, overflow: 'hidden' },
  detailRecommendationPriceRow: { minHeight: 18, marginTop: 4 },
  collectionPageCompactPriceRow: { minHeight: 20, marginTop: 0 },
  collectionPageCompactPrice: { fontSize: 14 },
  detailRecommendationPrice: { fontSize: 13 },
  collectionPrice: { color: palette.red, fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '800' },
  collectionSalePrice: { color: palette.heading },
  collectionOldPrice: { flexShrink: 1, color: '#666666', fontFamily: 'Inter_400Regular', fontSize: 10, textDecorationLine: 'line-through' },
  detailRecommendationOldPrice: { fontSize: 9 },
  collectionDiscountLine: { color: palette.red, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, fontWeight: '800' },
  productRow: { gap: 5 },
  productVisual: { height: 109, overflow: 'hidden', borderRadius: 6, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, justifyContent: 'center', alignItems: 'center' },
  productDiscountBadge: { position: 'absolute', top: 0, left: 0, maxWidth: '72%', minWidth: 38, height: 21, paddingHorizontal: 6, borderBottomRightRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D83434' },
  productImage: { position: 'absolute', width: '80%', height: '88%' },
  heart: { position: 'absolute', right: 6, top: 5 },
  productName: { marginTop: 5, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 14, fontWeight: '800', color: palette.ink },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  price: { color: palette.red, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 15, fontWeight: '800' },
  oldPrice: { fontFamily: 'Inter_400Regular', fontSize: 10, color: 'rgba(0,0,0,0.45)', textDecorationLine: 'line-through' },
  discount: { fontFamily: 'Inter_400Regular', fontSize: 10, color: palette.red },
  cartButton: { width: '88%', alignSelf: 'center', height: 30, borderRadius: 15, borderWidth: 1, borderColor: palette.blue, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  productCardQuantityButton: { paddingHorizontal: 5, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: palette.blue },
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
  offersPage: { width: '100%', paddingBottom: 18, backgroundColor: '#F6F8FC' },
  offersHeadingBlock: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  offersHeading: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 22, fontWeight: '900' },
  offersSubtitle: { marginTop: 5, color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  offersGrid: { paddingHorizontal: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 13 },
  offerCard: { width: '48.2%', height: 194, borderRadius: 18, overflow: 'hidden', backgroundColor: '#E8ECF2', shadowColor: '#152A45', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 4 },
  offerCardFeatured: { width: '100%', height: 205 },
  offerCardGradient: { flex: 1, overflow: 'hidden', padding: 14 },
  offerDealTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offerDiscount: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, overflow: 'hidden', color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.19)', fontFamily: 'Inter_400Regular', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  offerCardImage: { position: 'absolute', right: -5, bottom: 10, width: '43%', height: '47%', opacity: 0.96 },
  offerCardFeaturedImage: { right: 2, bottom: 5, width: '46%', height: '82%' },
  offerCardCopy: { position: 'absolute', left: 14, bottom: 14, width: '52%' },
  offerCardFeaturedCopy: { width: '50%', bottom: 18 },
  offerCardCaption: { marginBottom: 3, color: 'rgba(255,255,255,0.82)', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '700' },
  offerCardTitle: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 20, fontWeight: '900' },
  offerCardAction: { alignSelf: 'flex-start', height: 28, marginTop: 9, paddingHorizontal: 9, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF' },
  offerCardActionText: { color: '#172A43', fontFamily: 'Inter_400Regular', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
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
  wishlistPrice: { flexShrink: 1, color: palette.red, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '900' },
  wishlistOldPrice: { flexShrink: 1, color: '#777777', fontFamily: 'Inter_400Regular', fontSize: 8, textDecorationLine: 'line-through' },
  wishlistDiscount: { flexShrink: 1, color: palette.red, fontFamily: 'Inter_400Regular', fontSize: 9, fontWeight: '800' },
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
  floatingFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, height: 70, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#D5DBE3' },
  cartPopupLayer: { ...StyleSheet.absoluteFill, zIndex: 50, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 82 },
  collectionCartPopupLayer: {},
  cartPopup: { width: '100%', height: 52, paddingHorizontal: 7, borderRadius: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(63,114,229,0.9)', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 7, elevation: 7 },
  cartPopupImages: { minWidth: 40, flexDirection: 'row', alignItems: 'center' },
  cartPopupImage: { width: 38, height: 38, borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)', borderRadius: 19, backgroundColor: '#FFFFFF' },
  cartPopupImageOverlap: { marginLeft: -12 },
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
  cartPage: { flex: 1, backgroundColor: '#F6F7FA' },
  cartPageHeader: { height: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E4E7EC' },
  cartBackButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E3E6EA', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  cartPageTitle: { flex: 1, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 18, fontWeight: '700' },
  cartHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cartHeaderSearch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E3E6EA', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  cartHeaderShare: { height: 36, paddingHorizontal: 10, borderRadius: 18, borderWidth: 1, borderColor: '#E3E6EA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#FFFFFF' },
  cartHeaderShareText: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '700' },
  cartList: { padding: 12, gap: 12, paddingBottom: 16 },
  cartItemsBlock: { overflow: 'hidden', borderWidth: 1, borderColor: '#E2E7EE', borderRadius: 16, backgroundColor: '#FFFFFF', shadowColor: '#18304D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cartDeliveryHeading: { minHeight: 68, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#E9EDF2', backgroundColor: '#FAFCFF' },
  cartDeliveryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F8F2' },
  cartDeliveryCopyBlock: { flex: 1, minWidth: 0 },
  cartItemsHeading: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '900' },
  cartShippingHighlight: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#EAF7ED' },
  cartShippingHighlightText: { color: '#238636', fontFamily: 'Inter_400Regular', fontSize: 10, fontWeight: '800', letterSpacing: 0.25 },
  cartDeliveryCopy: { marginTop: 3, color: palette.muted, fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '600' },
  cartListItem: { minHeight: 116, padding: 10, flexDirection: 'row', position: 'relative', backgroundColor: '#FFFFFF' },
  cartBlockItem: {},
  cartBlockItemDivider: { borderTopWidth: 1, borderTopColor: '#E9EDF2' },
  cartListImage: { width: 76, height: 98, borderWidth: 1, borderColor: '#D8E0EA', borderRadius: 8, backgroundColor: '#FFFFFF' },
  cartListCopy: { flex: 1, marginLeft: 10, paddingVertical: 2 },
  cartListName: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  cartListMeta: { marginTop: 4, color: '#697386', fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '600' },
  cartMoveWishlist: { marginTop: 5, color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 11, fontWeight: '700' },
  cartListActions: { width: 82, alignItems: 'flex-end', paddingVertical: 2 },
  cartQuantityControl: { width: 74, height: 32, borderRadius: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2E8B36' },
  cartQuantityButton: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 18, lineHeight: 21, fontWeight: '600' },
  cartQuantityValue: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '800' },
  cartLinePriceRow: { position: 'absolute', right: 9, bottom: 9, flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  cartLineOldPrice: { maxWidth: 70, color: '#7A8088', fontFamily: 'Inter_400Regular', fontSize: 10, textDecorationLine: 'line-through' },
  cartLineTotal: { color: palette.red, fontFamily: 'Inter_400Regular', fontSize: 17, lineHeight: 21, fontWeight: '800' },
  cartSuggestions: { marginTop: 8 },
  cartContentBlock: { padding: 12, borderWidth: 1, borderColor: '#E7EAF0', borderRadius: 16, backgroundColor: '#FFFFFF' },
  cartSuggestionsTitle: { marginBottom: 10, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '800' },
  cartSuggestionGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  cartSeeAllButton: { marginTop: 18, marginHorizontal: 0 },
  cartWishlistBlock: { marginTop: 0 },
  cartBlockHeader: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartBlockHeaderTitle: { marginBottom: 0 },
  cartWishlistViewAll: { color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  cartWishlistRow: { gap: 12, paddingRight: 4 },
  cartOrderDetails: { marginTop: 0 },
  cartOrderDetailsTitle: { marginBottom: 14, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 17, fontWeight: '800' },
  cartOrderRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartOrderLabel: { color: '#667085', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '600' },
  cartOrderValue: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '700' },
  cartOrderDiscount: { color: '#238636', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '700' },
  cartOrderFree: { color: '#238636', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  cartSavingsHighlight: { minHeight: 38, marginTop: 9, paddingHorizontal: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#EAF7ED' },
  cartSavingsHighlightText: { flex: 1, color: '#238636', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '700' },
  cartOrderDivider: { height: 1, marginVertical: 8, backgroundColor: '#E8EBEF' },
  cartOrderTotalLabel: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '700' },
  cartOrderTotalValue: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '800' },
  cartPoliciesBlock: { marginTop: 0 },
  cartPolicyRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center' },
  cartPolicyIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF3FF' },
  cartPolicyCopy: { flex: 1, marginLeft: 11 },
  cartPolicyTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '700' },
  cartPolicyDescription: { marginTop: 3, color: '#697386', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  cartPolicyDivider: { height: 1, marginLeft: 49, backgroundColor: '#ECEFF3' },
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
  cartCheckoutBar: { height: 70, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', shadowColor: '#172033', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 12 },
  cartAddressBar: { minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F7FB', zIndex: 2 },
  cartFooterTopShadow: { position: 'absolute', left: 0, right: 0, top: -6, height: 6 },
  cartAddressIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF3FF' },
  cartAddressCopy: { flex: 1, marginLeft: 10 },
  cartAddressTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '700' },
  cartAddressSubtitle: { marginTop: 2, color: '#7B8490', fontFamily: 'Inter_400Regular', fontSize: 10 },
  cartAddressAction: { marginRight: 2, color: palette.blue, fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '800' },
  cartAddressBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,18,30,0.48)' },
  cartAddressSheet: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#F7F8FB' },
  cartAddressHandle: { width: 38, height: 4, marginBottom: 15, borderRadius: 2, alignSelf: 'center', backgroundColor: '#C7CDD5' },
  cartAddressSheetHeader: { marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cartAddressSheetTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '800' },
  cartAddressSheetSubtitle: { marginTop: 4, color: '#697386', fontFamily: 'Inter_400Regular', fontSize: 11 },
  cartAddressClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  cartAddressOption: { minHeight: 72, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#EEF0F3', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' },
  cartAddressOptionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF3FF' },
  cartAddressOptionIconPrimary: { backgroundColor: palette.blue },
  cartAddressOptionCopy: { flex: 1, marginHorizontal: 11 },
  cartAddressOptionTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '700' },
  cartAddressOptionSubtitle: { marginTop: 3, color: '#7B8490', fontFamily: 'Inter_400Regular', fontSize: 10 },
  cartNoSavedAddress: { minHeight: 72, marginTop: 14, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#FFFFFF' },
  cartNoSavedTitle: { color: '#667085', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '700' },
  cartNoSavedCopy: { marginTop: 2, color: '#98A0AD', fontFamily: 'Inter_400Regular', fontSize: 10 },
  cartTotalBlock: { flex: 1 },
  cartItemCount: { color: '#697386', fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '700' },
  cartTotalText: { marginTop: 2, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 17, fontWeight: '800' },
  cartCheckoutButton: { width: '58%', height: 50, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.red },
  cartCheckoutText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 17, fontWeight: '800' },
  footerTab: { flex: 1, alignSelf: 'stretch', borderTopWidth: 3, borderTopColor: 'transparent', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FFFFFF' },
  footerTabSelected: { borderTopColor: palette.blue, backgroundColor: '#FFFFFF' },
  footerTabText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#555', fontWeight: '500' },
  footerTabActive: { color: palette.blue, fontWeight: '700' },
  offersFooterTab: { paddingHorizontal: 3 },
  offersFooterBadge: { alignSelf: 'stretch', height: 60, alignItems: 'center', justifyContent: 'center' },
  offersFooterImage: { width: 42, height: 42, shadowColor: '#075EAD', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 4, elevation: 4 },
  detailPage: { flex: 1, alignSelf: 'center', backgroundColor: '#F4F5FA' },
  detailContent: { paddingBottom: 18 },
  detailHeroSection: { height: 360, backgroundColor: '#FFFFFF' },
  detailGallery: { width: '100%', backgroundColor: '#FFFFFF' },
  detailHeroCard: { position: 'relative', overflow: 'hidden', borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  detailHero: { width: '100%', height: '100%', borderRadius: 24 },
  detailUnifiedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailUnifiedHeaderBackground: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#FFFFFF' },
  detailOverlayActions: { flexDirection: 'row', gap: 6 },
  detailCircleButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  detailCircleButtonBackground: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.95)', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  detailStickyTitle: { flex: 1, minWidth: 0, marginHorizontal: 2, color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '800' },
  detailDots: { position: 'absolute', left: 14, right: 14, bottom: 3, height: 10, flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailDot: { flex: 1, height: 2, backgroundColor: '#D9DCE2' },
  detailDotActive: { backgroundColor: palette.red },
  detailThumbnailScroller: { width: '100%', flexGrow: 0, backgroundColor: '#FFFFFF' },
  detailThumbnails: { minWidth: '100%', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  detailThumbnail: { width: 54, height: 54, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 9, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  detailThumbnailActive: { borderWidth: 2, borderColor: palette.blue },
  swatchImage: { width: '100%', height: '100%' },
  detailImageFade: { width: '100%', height: 16 },
  detailInfoCard: { marginHorizontal: 12, marginTop: 0, padding: 13, borderRadius: 14, backgroundColor: '#FFFFFF' },
  detailTitle: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 17, lineHeight: 23, fontWeight: '700' },
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
  paymentTrustBox: { height: 48, marginTop: 12, paddingHorizontal: 10, borderWidth: 0, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' },
  paymentLogoSlot: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  paymentLogoImage: { width: 72, height: 44 },
  detailHelpCard: { minHeight: 84, marginHorizontal: 12, marginTop: 10, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: '#D7E4F2', borderRadius: 15, backgroundColor: '#F7FAFE' },
  detailHelpIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A254A' },
  detailHelpCopy: { flex: 1, minWidth: 0 },
  detailHelpTitle: { color: '#223750', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, fontWeight: '900' },
  detailHelpSubtitle: { marginTop: 3, color: '#718197', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, fontWeight: '600' },
  detailHelpAction: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E9E58' },
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
  detailRecommendationsSection: { marginTop: 24, paddingTop: 22, paddingBottom: 22, backgroundColor: '#FFFFFF' },
  similarTitle: { marginHorizontal: 16, fontFamily: 'Inter_400Regular', fontSize: 20, fontWeight: '900' },
  similarSubtitle: { marginHorizontal: 16, marginTop: 4, color: '#667085', fontFamily: 'Inter_400Regular', fontSize: 12 },
  detailRecommendations: { gap: 12, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 2 },
  buyBarContainer: { position: 'relative', zIndex: 30, height: 70, backgroundColor: '#FFFFFF' },
  buyBarShadow: { position: 'absolute', left: 0, right: 0, top: -8, height: 8 },
  buyBar: { height: 70, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', shadowColor: '#07111F', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.19, shadowRadius: 6, elevation: 9 },
  buyBarSummary: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6 },
  buyBarPrice: { color: palette.heading, fontFamily: 'Inter_400Regular', fontSize: 19, fontWeight: '900' },
  buyBarOldPrice: { flexShrink: 1, color: '#667085', fontFamily: 'Inter_400Regular', fontSize: 10, textDecorationLine: 'line-through' },
  buyBarTax: { width: '100%', marginTop: 1, color: '#667085', fontFamily: 'Inter_400Regular', fontSize: 10 },
  addLarge: { width: '34%', height: 48, borderRadius: 10, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  detailCartQuantity: { width: '34%', height: 48, borderRadius: 10, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E84A57' },
  detailCartQuantityAction: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  detailCartQuantityValue: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 18, fontWeight: '900' },
  footerBuyNow: { flex: 1, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2D2E' },
  footerBuyNowDisabled: { opacity: 0.45 },
  footerBuyNowText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
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
