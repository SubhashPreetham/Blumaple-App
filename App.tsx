import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchShopifyCollectionPreviews, fetchShopifyCollectionProductCount, fetchShopifyCollectionProducts, fetchShopifyMainMenu, fetchShopifyProducts, ShopifyCollectionPreview, ShopifyMenuItem, ShopifyProduct } from './src/shopify';
import { CheckoutPage } from './pages/CheckoutPage';
import { AddressPage } from './pages/AddressPage';
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
};

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
    brand: product.brandName?.value || product.vendor,
    vendor: product.vendor,
    sku: variant?.sku ?? '',
  };
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

const detailColors = [
  { name: 'White', image: require('./assets/figma/detail-white.png') },
  { name: 'Black & Gold', image: require('./assets/figma/detail-black-gold.png') },
  { name: 'Black', image: require('./assets/figma/detail-black.png') },
  { name: 'Green', image: require('./assets/figma/detail-green.png') },
];

function ProductDetail({ width, cartCount, product, onBack, onAdd, onCheckout }: { width: number; cartCount: number; product: Product; onBack: () => void; onAdd: () => void; onCheckout: () => void }) {
  const [colorIndex, setColorIndex] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const detailGalleryRef = useRef<ScrollView>(null);
  const choices = product.images?.length ? product.images.map((image, index) => ({ name: index === 0 ? 'Default' : `View ${index + 1}`, image })) : detailColors;
  const availableForSale = product.availableForSale ?? true;
  const rows = [
    ['Key points', product.description ? product.description.split(/[.!?]/).filter(Boolean).slice(0, 3).map(point => `• ${point.trim()}`).join('\n') : `• Premium quality ${product.name}\n• Designed for dependable everyday use\n• Verified product from Blumaple`],
    ['Warranty / Shipping / Returns', '• Free shipping on eligible orders\n• No additional customs duties will be charged\n• 7-day return policy applies to eligible products\n• Tracking details will be shared after dispatch'],
    ['Product description', product.description || 'Product details are available from the Shopify store.'],
    ['Specifications & details', `SKU: ${product.sku || 'Not specified'}\nBrand: ${product.brand || 'Not specified'}\nShipping: ${product.vendor || 'Not specified'}`],
  ] as const;

  return <View style={[styles.detailPage, { width }]}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
      <View style={styles.detailHeroSection}>
        <ScrollView ref={detailGalleryRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false} style={styles.detailGallery} onMomentumScrollEnd={event => setColorIndex(Math.round(event.nativeEvent.contentOffset.x / width))}>
          {choices.map((option, index) => <Image key={`hero-${option.name}-${index}`} source={option.image} style={[styles.detailHero, { width }]} resizeMode="contain" />)}
        </ScrollView>
        <View style={styles.detailOverlayHeader}>
          <Pressable onPress={onBack} style={styles.detailCircleButton}><Ionicons name="chevron-down" size={28} color={palette.ink} /></Pressable>
          <View style={styles.detailOverlayActions}><Pressable style={styles.detailCircleButton}><Ionicons name="heart-outline" size={26} color={palette.ink} /></Pressable><Pressable style={styles.detailCircleButton}><Ionicons name="search-outline" size={25} color={palette.ink} /></Pressable><Pressable style={styles.detailCircleButton}><Ionicons name="share-social-outline" size={25} color={palette.ink} /></Pressable></View>
        </View>
        <View style={styles.detailDots}>{choices.map((_, i) => <View key={i} style={[styles.detailDot, i === colorIndex && styles.detailDotActive]} />)}</View>
      </View>
      {choices.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detailThumbnailScroller} contentContainerStyle={styles.detailThumbnails}>{choices.map((option, index) => <Pressable key={`${option.name}-${index}`} onPress={() => { setColorIndex(index); detailGalleryRef.current?.scrollTo({ x: index * width, animated: true }); }} style={[styles.detailThumbnail, index === colorIndex && styles.detailThumbnailActive]}><Image source={option.image} style={styles.swatchImage} resizeMode="contain" /></Pressable>)}</ScrollView> : null}
      <View style={styles.detailInfoCard}>
        <Text style={styles.detailTitle}>{product.name}</Text>
        <Text style={styles.detailUnit}>1 unit</Text>
        <View style={styles.detailPriceRow}><Text style={styles.detailPrice}>{product.price}</Text>{product.oldPrice ? <Text style={styles.detailOldPrice}>{product.oldPrice}</Text> : null}{product.discount ? <Text style={styles.detailDiscount}>{product.discount}</Text> : null}</View>
        <Text style={styles.inclusive}>Inclusive of all taxes · Free shipping</Text>
      </View>
      <View style={styles.detailInfoCard}><Text style={styles.detailBrand}>{product.brand || 'Blumaple verified brand'}</Text><Text style={styles.detailMuted}>Shipping: {product.vendor || 'Warehouse information unavailable'}</Text></View>
      <View style={styles.detailInfoCard}>
        <View style={styles.detailStockRow}><View style={[styles.stockDot, !availableForSale && styles.stockDotUnavailable]} /><Text style={[styles.stockText, !availableForSale && styles.stockTextUnavailable]}>{availableForSale ? 'In stock' : 'Coming soon'}</Text></View>
        <View style={styles.quantityRow}><Text style={styles.quantityLabel}>Quantity</Text><View style={styles.quantityControl}><Pressable onPress={() => setQuantity(value => Math.max(1, value - 1))}><Text style={styles.quantityButton}>−</Text></Pressable><Text style={styles.quantityValue}>{quantity}</Text><Pressable onPress={() => setQuantity(value => value + 1)}><Text style={styles.quantityButton}>+</Text></Pressable></View></View>
        <Text style={styles.genuineText}>100% GENUINE PRODUCTS GUARANTEED</Text>
        <Text style={styles.deliveryEstimate}>Estimated delivery: 3–7 business days</Text>
        <View style={styles.codBox}><Text style={styles.codText}>Cash on Delivery accepted</Text></View>
        {availableForSale ? <Pressable onPress={onCheckout} style={styles.buyNowButton}><Text style={styles.buyNowButtonText}>BUY IT NOW</Text></Pressable> : null}
      </View>
      {rows.map(([title, copy]) => { const open = expanded === title; return <Pressable key={title} onPress={() => setExpanded(open ? null : title)} style={styles.accordion}><View style={styles.accordionHeading}><Text style={styles.accordionTitle}>{title}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} /></View>{open ? <Text style={styles.accordionCopy}>{copy}</Text> : null}</Pressable>; })}
      <Text style={styles.similarTitle}>You may also like</Text>
      <Text style={styles.similarSubtitle}>Combine your style with these products</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.detailRecommendations}>{products.slice(0, 6).map(item => <ProductCard key={`similar-${item.id}`} item={item} width={150} favorite={false} collectionLayout onFavorite={() => {}} onAdd={onAdd} />)}</ScrollView>
    </ScrollView>
    <View style={styles.buyBar}><View><Text style={styles.buyBarUnit}>1 unit</Text><Text style={styles.buyBarPrice}>{product.price}</Text><Text style={styles.buyBarTax}>Inclusive of all taxes</Text></View><Pressable onPress={availableForSale ? onAdd : () => {}} style={[styles.addLarge, !availableForSale && styles.notifyLarge]}><Text style={styles.addLargeText}>{availableForSale ? 'Add to cart' : 'Notify me'}</Text></Pressable></View>
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
  const [cartCount, setCartCount] = useState(0);
  const [screen, setScreen] = useState<'home' | 'categories' | 'categoryCollection' | 'collection' | 'product' | 'checkout' | 'address'>('home');
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
  const [shopifyLoading, setShopifyLoading] = useState(true);
  const [shopifyError, setShopifyError] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [pincodeModalVisible, setPincodeModalVisible] = useState(false);
  const [pincode, setPincode] = useState('');
  const [uploadedCarousels, setUploadedCarousels] = useState<UploadedCarouselData>({});
  const [openingAnimationVisible, setOpeningAnimationVisible] = useState(true);
  const carouselRef = useRef<ScrollView>(null);
  const transportProgress = useRef(new Animated.Value(0)).current;
  const openingProgress = useRef(new Animated.Value(0)).current;
  const flightTranslateX = transportProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [10, contentWidth + 52, contentWidth + 52],
  });
  const truckTranslateX = transportProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [-52, -52, contentWidth + 52],
  });
  const nextFlightTranslateX = transportProgress.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [10 - (contentWidth + 42) / 3, 10 - (contentWidth + 42) / 3, 10],
  });
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
  const catalog = shopifyProducts.length ? shopifyProducts : products;
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
          return {
            id: collection.id,
            label: collection.title.trim(),
            image: firstProductImage ? { uri: firstProductImage } as ImageSourcePropType : shopCategoryImages[(index + categoryIndex * 2) % shopCategoryImages.length]!,
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
      return { id: item.id, image: product.image, title: item.title.trim(), subtitle: '', product, category: item };
    })
    : uploadedSlides.length
      ? uploadedSlides.map((slide, index) => ({ id: slide.id, image: { uri: slide.image } as ImageSourcePropType, title: slide.title || `${activeHomeMenu.label} picks`, subtitle: slide.collection ? `Shop ${slide.collection}` : `Trending ${activeHomeMenu.label.toLowerCase()} pick`, product: categoryProducts[index % categoryProducts.length] ?? products[0]!, category: undefined }))
      : carouselProducts.map(item => ({ id: item.id, image: item.image, title: item.name, subtitle: `Trending ${activeHomeMenu.label.toLowerCase()} pick`, product: item, category: undefined })),
  [activeHomeMenu.label, activeShopifyMenu, carouselProducts, categoryProducts, shopifyCollectionPreviews, uploadedSlides]);
  const carouselSlideCount = Math.max(1, carouselSlides.length);

  useEffect(() => {
    if (screen !== 'home' && screen !== 'categories') return;
    transportProgress.setValue(0);
    const transportAnimation = Animated.loop(Animated.timing(transportProgress, {
      toValue: 1,
      duration: 8000,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    transportAnimation.start();
    return () => transportAnimation.stop();
  }, [contentWidth, screen, transportProgress]);

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
    const frame = requestAnimationFrame(() => carouselRef.current?.scrollTo({ x: carouselStep * carouselSlideCount, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [activeHomeMenu.label, carouselSlideCount, carouselStep, screen]);

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
    setCartCount(value => value + 1);
    Alert.alert('Added to cart', product.name);
  };

  const renderProduct = (item: Product) => (
    <ProductCard key={item.id} item={item} width={cardWidth} favorite={favorites.has(item.id)} onFavorite={() => toggleFavorite(item.id)} onAdd={() => addToCart(item)} onOpen={() => { setSelectedProduct(item); setScreen('product'); }} />
  );

  if (screen === 'categoryCollection' && selectedCategoryGroup && selectedCollectionItem) return <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
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
      onBack={() => setScreen('home')}
      onSelectCollection={setSelectedCollectionItem}
      onAdd={() => setCartCount(value => value + 1)}
      onOpenProduct={product => { setSelectedProduct(mapShopifyProduct(product)); setScreen('product'); }}
    />
  </SafeAreaView>;

  if (screen === 'product' && selectedProduct) {
    return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} /><ProductDetail width={contentWidth} cartCount={cartCount} product={selectedProduct} onBack={() => setScreen('home')} onAdd={() => setCartCount(value => value + 1)} onCheckout={() => { setCartCount(value => Math.max(1, value)); setScreen('checkout'); }} /></SafeAreaView>;
  }

  if (screen === 'checkout' && selectedProduct) return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} /><CheckoutPage product={selectedProduct} quantity={Math.max(1, cartCount)} address={shippingAddress} onBack={() => setScreen('product')} onAddress={() => setScreen('address')} /></SafeAreaView>;

  if (screen === 'address') return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} /><AddressPage onBack={() => setScreen('checkout')} onSave={(address) => { setShippingAddress(address); setScreen('checkout'); }} /></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.safeArea, screen === 'home' && styles.homeSafeArea]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" translucent={false} />
      <View style={[styles.app, { width: contentWidth }]}>
        {screen === 'collection' ? <View style={styles.collectionHeader}>
          <Pressable onPress={() => setScreen('home')} hitSlop={10}><Ionicons name="arrow-back" size={19} color={palette.ink} /></Pressable>
          <Text style={styles.collectionHeaderTitle}>AUDIO</Text>
          <View style={styles.collectionHeaderActions}><Ionicons name="search-outline" size={20} color={palette.blue} /><Ionicons name="cart-outline" size={22} color={palette.blue} /></View>
        </View> : <View style={styles.deliveryHeader}>
          <Animated.View pointerEvents="none" style={[styles.headerFlight, { transform: [{ translateX: flightTranslateX }] }]}>
            <Ionicons name="airplane" size={38} color={palette.blue} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.headerTruck, { transform: [{ translateX: truckTranslateX }] }]}>
            <MaterialCommunityIcons name="truck-fast-outline" size={42} color={palette.red} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.headerFlight, { transform: [{ translateX: nextFlightTranslateX }] }]}>
            <Ionicons name="airplane" size={38} color={palette.blue} />
          </Animated.View>
          <View style={styles.deliveryBrandBlock}>
            <Image source={require('./images/blumaple logo.png')} style={styles.deliveryLogo} resizeMode="contain" />
            <Pressable onPress={() => setPincodeModalVisible(true)} style={styles.addAddressButton}><Ionicons name="location-outline" size={21} color={palette.blue} /><Text style={styles.addAddressText}>Deliver to..</Text></Pressable>
          </View>
          <View style={styles.deliveryActions}>
            <View>
              <Pressable onPress={() => selectedProduct && setScreen('checkout')}><Ionicons name="person-circle" size={39} color={palette.ink} /></Pressable>
              {cartCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>}
            </View>
          </View>
        </View>}

        {(screen === 'home' || screen === 'categories') && <View style={styles.staticSearchZone}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={palette.ink} />
            <TextInput placeholder="Search for products, brands and more" placeholderTextColor="#9B9B9B" style={styles.searchInput} />
          </View>
        </View>}

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never" contentContainerStyle={styles.content}>
          {screen === 'home' ? <>
          <View style={styles.carouselHeaderZone}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.blinkTabs}>
            {displayHomeMenus.map((menu) => (
              <Pressable key={menu.label} onPress={() => setActiveCategory(menu.label)} style={[styles.blinkTab, activeCategory === menu.label && styles.blinkTabActive]}>
                <Ionicons name={menu.label === 'Audio' ? 'headset-outline' : menu.label === 'Capture' ? 'camera-outline' : menu.label === 'Computers' ? 'laptop-outline' : menu.label === 'Smart Tech' ? 'watch-outline' : menu.label === 'Home' ? 'home-outline' : menu.label === 'Lifestyle' ? 'sparkles-outline' : 'build-outline'} size={29} color={activeCategory === menu.label ? palette.white : palette.ink} />
                <Text style={[styles.blinkTabText, activeCategory === menu.label && styles.blinkTabTextActive]}>{menu.label}</Text>
                {activeCategory === menu.label && <View style={styles.blinkTabIndicator} />}
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.carouselFade}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            ref={carouselRef}
            snapToInterval={carouselStep}
            decelerationRate="normal"
            overScrollMode="never"
            onMomentumScrollEnd={event => {
              const index = Math.round(event.nativeEvent.contentOffset.x / carouselStep);
              setActiveBanner(index % carouselSlideCount);
              if (index >= carouselSlideCount * 2) requestAnimationFrame(() => carouselRef.current?.scrollTo({ x: (index - carouselSlideCount) * carouselStep, animated: false }));
              if (index <= 0) requestAnimationFrame(() => carouselRef.current?.scrollTo({ x: (index + carouselSlideCount) * carouselStep, animated: false }));
            }}
            contentContainerStyle={[styles.promoCards, { paddingHorizontal: carouselCardWidth / 2 }]}
          >
            {[...carouselSlides, ...carouselSlides, ...carouselSlides].map((slide, index) => <Pressable key={`${activeHomeMenu.label}-${slide.id}-${index}`} style={[styles.promoCard, { width: carouselCardWidth }]} onPress={() => {
              if (slide.category) {
                const firstCollection = slide.category.items[0] ?? slide.category;
                setSelectedCategoryGroup(slide.category);
                setSelectedCollectionItem(firstCollection);
                setScreen('categoryCollection');
              } else {
                setSelectedProduct(slide.product);
                setScreen('product');
              }
            }}>
              <View style={styles.promoImageFrame}><Image source={slide.image} style={styles.promoImage} resizeMode="contain" /></View>
              <View style={styles.promoCopy}><Text numberOfLines={2} style={styles.promoTitle}>{slide.title}</Text>{slide.subtitle ? <Text style={styles.promoSubtitle}>{slide.subtitle}</Text> : null}</View>
            </Pressable>)}
          </ScrollView>
          <View style={styles.dots}>{Array.from({ length: carouselSlideCount }).map((_, index) => <View key={index} style={[styles.dot, index === activeBanner && styles.dotActive]} />)}</View>
          </View>
          </View>
          <View style={styles.zigzagPartition}>{Array.from({ length: 30 }).map((_, index) => <View key={index} style={styles.zigzagTooth} />)}</View>
          <View style={styles.homeProductSections}>
          <SectionTitle>Shop by Category</SectionTitle>
          <View style={styles.shopCategoryGrid}>
            {shopCategories.map(({ id, label, image, collection, group }) => <Pressable key={id} style={styles.shopCategoryItem} onPress={() => {
              if (collection && group) {
                setSelectedCategoryGroup(group);
                setSelectedCollectionItem(collection);
                setScreen('categoryCollection');
              } else {
                setScreen('collection');
              }
            }}>
              <View style={styles.shopCategoryImageBlock}><Image source={image} style={styles.shopCategoryImage} resizeMode="contain" /></View>
              <Text numberOfLines={2} style={styles.shopCategoryLabel}>{label}</Text>
            </Pressable>)}
          </View>
          <SectionTitle>Trending</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingProductRow}>
            {categoryProducts.map(item => <ProductCard key={`explore-${activeHomeMenu.label}-${item.id}`} item={item} width={trendingCardWidth} favorite={favorites.has(item.id)} collectionLayout onFavorite={() => toggleFavorite(item.id)} onAdd={() => addToCart(item)} onOpen={() => { setSelectedProduct(item); setScreen('product'); }} />)}
          </ScrollView>
          <SectionTitle>Best Selling</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingProductRow}>
            {categoryProducts.map(item => <ProductCard key={`grid-${activeHomeMenu.label}-${item.id}`} item={item} width={trendingCardWidth} favorite={favorites.has(item.id)} collectionLayout onFavorite={() => toggleFavorite(item.id)} onAdd={() => addToCart(item)} onOpen={() => { setSelectedProduct(item); setScreen('product'); }} />)}
          </ScrollView>
          </View>

          </> : screen === 'categories' ? <CategoriesPage
            menuItems={filteredShopifyMenuItems}
            previews={shopifyCollectionPreviews}
            onSelectCollection={(category, collection) => {
              setSelectedCategoryGroup(category);
              setSelectedCollectionItem(collection);
              setScreen('categoryCollection');
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
              {[...catalog, ...catalog].slice(0, 6).map((item, index) => <ProductCard key={`collection-${item.id}-${index}`} item={item} width={cardWidth} favorite={favorites.has(item.id)} onFavorite={() => toggleFavorite(item.id)} onAdd={() => addToCart(item)} onOpen={() => { setSelectedProduct(item); setScreen('product'); }} />)}
            </View>
          </>}
        </ScrollView>
        <View style={styles.floatingFooter}>
          <Pressable onPress={() => setScreen('home')} style={styles.footerTab}>
            <Ionicons name={screen === 'home' ? 'home' : 'home-outline'} size={25} color={screen === 'home' ? palette.blue : palette.muted} />
            <Text style={[styles.footerTabText, screen === 'home' && styles.footerTabActive]}>Home</Text>
          </Pressable>
          <Pressable onPress={() => setScreen('categories')} style={styles.footerTab}>
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
          <Pressable style={styles.footerTab}>
            <Ionicons name="person-outline" size={25} color="#555" />
            <Text style={styles.footerTabText}>Account</Text>
          </Pressable>
        </View>
      </View>
      <Modal visible={pincodeModalVisible} transparent animationType="fade" onRequestClose={() => setPincodeModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPincodeModalVisible(false)}>
          <Pressable style={styles.pincodeModal} onPress={() => {}}>
            <Text style={styles.pincodeTitle}>Check delivery availability</Text>
            <Text style={styles.pincodeCopy}>Enter your pincode to see whether delivery is available in your area.</Text>
            <TextInput value={pincode} onChangeText={setPincode} keyboardType="number-pad" maxLength={6} placeholder="Enter 6 digit pincode" placeholderTextColor="#8D8D8D" style={styles.pincodeInput} />
            <Pressable onPress={() => setPincodeModalVisible(false)} style={styles.pincodeCheck}><Text style={styles.pincodeCheckText}>Check</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      {screen === 'home' ? <View pointerEvents="none" style={[styles.bottomSafeFill, { height: insets.bottom }]} /> : null}
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
  const showDashboard = typeof window !== 'undefined' && window.location && new URLSearchParams(window.location.search).has('dashboard');
  return <SafeAreaProvider>{showDashboard ? <DashboardPage /> : <Storefront />}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  homeSafeArea: { backgroundColor: '#F5F5F5' },
  app: { flex: 1, alignSelf: 'center', backgroundColor: palette.white },
  openingAnimationOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, overflow: 'hidden', backgroundColor: '#F5F5F5' },
  openingAnimationMessage: { position: 'absolute', left: 24, right: 24, top: '45%', zIndex: 2, color: palette.heading, fontSize: 23, lineHeight: 31, fontWeight: '800', textAlign: 'center' },
  openingVehicle: { position: 'absolute' },
  deliveryHeader: { minHeight: 82, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F5F5' },
  headerFlight: { position: 'absolute', left: 0, top: 9, opacity: 0.5 },
  headerTruck: { position: 'absolute', left: 0, bottom: -7, opacity: 0.5 },
  deliveryBrandBlock: { zIndex: 1, marginLeft: 10 },
  deliveryLogo: { width: 190, height: 40, marginLeft: -24, alignSelf: 'flex-start' },
  addAddressButton: { marginTop: 4, marginLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 2 },
  addAddressText: { color: palette.blue, fontSize: 15, fontWeight: '800' },
  deliveryBrand: { color: palette.heading, fontSize: 18, fontWeight: '800' },
  deliveryTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  deliveryTime: { color: palette.heading, fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -1 },
  deliveryDistance: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, overflow: 'hidden', backgroundColor: '#DCE7FF', color: palette.blue, fontSize: 12, fontWeight: '800' },
  deliveryAddress: { marginTop: 2, color: palette.ink, fontSize: 13, fontWeight: '600' },
  deliveryActions: { zIndex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  wallet: { width: 47, height: 47, borderRadius: 24, backgroundColor: palette.white, justifyContent: 'center', alignItems: 'center' },
  walletText: { marginTop: -2, color: palette.ink, fontSize: 10, fontWeight: '800' },
  modalBackdrop: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.42)' },
  pincodeModal: { borderRadius: 16, padding: 22, backgroundColor: palette.white },
  pincodeTitle: { color: palette.heading, fontSize: 19, fontWeight: '800' },
  pincodeCopy: { marginTop: 8, color: palette.ink, fontSize: 13, lineHeight: 19 },
  pincodeInput: { height: 49, marginTop: 20, borderWidth: 1, borderColor: palette.border, borderRadius: 8, paddingHorizontal: 14, color: palette.ink, fontSize: 15, fontWeight: '600' },
  pincodeCheck: { height: 48, marginTop: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.blue },
  pincodeCheckText: { color: palette.white, fontSize: 15, fontWeight: '800' },
  header: { height: 63, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
  brand: { fontSize: 17, fontWeight: '600', color: palette.blue },
  addressLine: { marginTop: 1 },
  addressTitle: { fontSize: 7, lineHeight: 9, fontWeight: '700', color: palette.ink },
  addressSubtitle: { fontSize: 6, lineHeight: 8, color: palette.ink },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  badge: { position: 'absolute', right: -7, top: -7, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: palette.white, fontSize: 10, fontWeight: '700' },
  content: { paddingHorizontal: 0, paddingBottom: 72 },
  carouselHeaderZone: { marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: '#F5F5F5' },
  carouselFade: { marginTop: 18, marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: '#F5F5F5' },
  zigzagPartition: { height: 14, marginHorizontal: 0, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#F5F5F5' },
  bottomSafeFill: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 25, backgroundColor: '#F5F5F5' },
  zigzagTooth: { width: 16, height: 16, marginHorizontal: 1, marginTop: 6, backgroundColor: palette.white, transform: [{ rotate: '45deg' }] },
  staticSearchZone: { paddingVertical: 10, backgroundColor: '#F5F5F5' },
  searchBox: { height: 50, marginHorizontal: 16, borderWidth: 1, borderColor: palette.border, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: palette.white },
  searchInput: { flex: 1, padding: 0, fontSize: 12, color: palette.ink },
  blinkTabs: { gap: 12, paddingTop: 12, paddingHorizontal: 10, alignItems: 'flex-start', backgroundColor: '#F5F5F5' },
  blinkTab: { width: 78, height: 72, borderRadius: 10, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 7, backgroundColor: 'transparent' },
  blinkTabActive: { backgroundColor: palette.blue },
  blinkTabIndicator: { position: 'absolute', left: 10, right: 10, bottom: 0, height: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: palette.white },
  blinkTabText: { marginTop: 6, color: palette.ink, fontSize: 11, lineHeight: 14, fontWeight: '500', textAlign: 'center' },
  blinkTabTextActive: { color: palette.white, fontWeight: '800' },
  promoCards: { gap: 12, paddingVertical: 8 },
  promoCard: { height: 270, borderRadius: 21, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 7, elevation: 4 },
  promoImageFrame: { ...StyleSheet.absoluteFillObject, borderRadius: 21, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  promoImage: { width: '100%', height: '100%', transform: [{ scale: 1.28 }] },
  promoCopy: { position: 'absolute', left: 13, right: 10, bottom: 15 },
  promoTitle: { color: '#1A1C1D', fontSize: 17, lineHeight: 20, fontWeight: '900' },
  promoSubtitle: { color: '#1A1C1D', fontSize: 11, lineHeight: 14, marginTop: 4, width: 140 },
  blinkDivider: { marginTop: 15, marginHorizontal: 0, paddingVertical: 12, alignItems: 'center', backgroundColor: '#EEF3FF' },
  blinkDividerText: { color: palette.blue, fontSize: 12, letterSpacing: 2, fontWeight: '800' },
  exploreRow: { gap: 10, paddingBottom: 10 },
  trendingProductRow: { gap: 12, paddingHorizontal: 2, paddingBottom: 5 },
  homeProductSections: { paddingHorizontal: 12 },
  shopCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, rowGap: 14 },
  shopCategoryItem: { width: '25%', paddingHorizontal: 5, alignItems: 'center' },
  shopCategoryImageBlock: { width: '100%', aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 5, elevation: 3 },
  shopCategoryImage: { width: '86%', height: '86%' },
  shopCategoryLabel: { minHeight: 30, marginTop: 7, color: palette.heading, fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center' },
  exploreCard: { width: 130, height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border },
  trendingCard: { flex: 1, width: undefined },
  exploreImage: { width: '84%', alignSelf: 'center', height: 112, marginTop: 10, backgroundColor: palette.white },
  exploreHeart: { position: 'absolute', top: 10, right: 10 },
  exploreName: { marginTop: 13, paddingHorizontal: 10, color: palette.heading, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  shopifyStatus: { minHeight: 42, marginTop: 12, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  shopifyConnected: { backgroundColor: '#E9F7EE' },
  shopifyError: { backgroundColor: '#FCEDED' },
  shopifyStatusText: { flex: 1, fontSize: 12, lineHeight: 16, color: palette.ink },
  categoryRow: { gap: 9, paddingTop: 16, paddingBottom: 14 },
  category: { width: 48, alignItems: 'center' },
  categoryImage: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#B7CAD8' },
  categoryActive: { borderWidth: 2, borderColor: palette.blue },
  categoryLabel: { fontSize: 8, lineHeight: 11, fontWeight: '600', marginTop: 4, color: palette.ink, textAlign: 'center' },
  categoryLabelActive: { color: palette.blue },
  banner: { height: 116, borderRadius: 9, marginRight: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)' },
  dots: { height: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#B33C52' },
  dotActive: { width: 4, backgroundColor: palette.blue },
  sectionTitle: { color: palette.heading, fontSize: 15, lineHeight: 19, fontWeight: '800', marginTop: 22, marginBottom: 12 },
  productCard: { marginBottom: 15 },
  collectionProductCard: { marginBottom: 0 },
  collectionProductVisual: { width: '100%', aspectRatio: 0.92, borderWidth: 1, borderColor: '#E7E7E7', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  collectionProductImage: { width: '94%', height: '94%' },
  collectionUnavailable: { opacity: 0.45 },
  collectionDiscountBadge: { position: 'absolute', top: 0, left: 0, minWidth: 38, height: 22, paddingHorizontal: 6, borderTopLeftRadius: 9, borderBottomRightRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D83434' },
  collectionDiscountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  collectionComingSoon: { position: 'absolute', top: 0, left: 0, height: 24, paddingHorizontal: 8, borderTopLeftRadius: 9, borderBottomRightRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B98725' },
  collectionComingSoonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  collectionHeart: { position: 'absolute', top: 7, right: 7 },
  collectionImageAction: { position: 'absolute', right: 0, bottom: -19, minWidth: 62, height: 38, paddingHorizontal: 10, borderWidth: 1.5, borderColor: palette.blue, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  collectionImageActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  collectionNotifyAction: { borderColor: '#2E8B36', backgroundColor: '#FFFFFF' },
  collectionNotifyText: { color: '#2E8B36' },
  collectionProductName: { minHeight: 34, marginTop: 25, color: palette.ink, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  collectionPriceRow: { height: 46, marginTop: 3, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', alignItems: 'baseline', columnGap: 4, rowGap: 2, overflow: 'hidden' },
  collectionPrice: { color: palette.heading, fontSize: 16, fontWeight: '900' },
  collectionSalePrice: { color: '#D83434' },
  collectionOldPrice: { flexShrink: 1, color: '#666666', fontSize: 10, textDecorationLine: 'line-through' },
  productRow: { gap: 5 },
  productVisual: { height: 109, borderRadius: 6, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, justifyContent: 'center', alignItems: 'center' },
  productImage: { width: '80%', height: '88%' },
  heart: { position: 'absolute', right: 6, top: 5 },
  productName: { marginTop: 7, fontSize: 11, lineHeight: 14, fontWeight: '800', color: palette.ink },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  price: { fontSize: 14, lineHeight: 17, fontWeight: '800' },
  oldPrice: { fontSize: 10, color: 'rgba(0,0,0,0.45)', textDecorationLine: 'line-through' },
  discount: { fontSize: 10, color: palette.green },
  cartButton: { width: '88%', alignSelf: 'center', height: 30, borderRadius: 15, borderWidth: 1, borderColor: palette.blue, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  cartButtonText: { color: palette.ink, fontSize: 10, fontWeight: '800' },
  pressed: { opacity: 0.6 },
  logoStrip: { flexDirection: 'row', gap: 8, marginVertical: 2, overflow: 'hidden' },
  logoTile: { width: 84, height: 43, borderRadius: 5, backgroundColor: '#E1E7ED', alignItems: 'center', justifyContent: 'center' },
  logoTilePink: { backgroundColor: '#EFDCDD' },
  logoText: { fontSize: 16, fontWeight: '900', color: '#303236' },
  reviewCard: { width: 188, height: 84, marginRight: 10, borderRadius: 4, padding: 8, flexDirection: 'row', backgroundColor: '#E8DEE4' },
  reviewCopy: { flex: 1 },
  reviewQuote: { width: 110, fontSize: 9, lineHeight: 12, color: palette.ink },
  stars: { color: '#2B547B', fontSize: 10, letterSpacing: 1, marginTop: 3 },
  reviewer: { fontSize: 8, fontWeight: '800', marginTop: 2 },
  reviewImage: { width: 56, height: 65, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' },
  collectionHeading: { marginTop: 24, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  collectionTitle: { fontSize: 22, fontWeight: '800', color: palette.ink },
  collectionCount: { fontSize: 13, color: palette.muted },
  collectionHeader: { height: 47, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
  collectionHeaderTitle: { marginLeft: 12, fontSize: 10, fontWeight: '800', color: palette.blue },
  collectionHeaderActions: { marginLeft: 'auto', flexDirection: 'row', gap: 18, alignItems: 'center' },
  audioHubHeading: { marginTop: 15 },
  audioHubTitle: { fontSize: 16, lineHeight: 20, fontWeight: '800', color: palette.heading },
  audioHubLink: { marginTop: 1, color: palette.blue, fontSize: 8, fontWeight: '700' },
  collectionCategoryRow: { paddingTop: 13, paddingBottom: 11, gap: 9 },
  collectionCategory: { width: 49, alignItems: 'center' },
  collectionCategoryImage: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#E7EDF1' },
  collectionCategoryLabel: { marginTop: 4, fontSize: 7, lineHeight: 9, fontWeight: '700', textAlign: 'center', color: palette.ink },
  collectionBanner: { width: '100%', height: 97, borderRadius: 6 },
  collectionDots: { height: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 2 },
  collectionDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#C94D5A' },
  collectionDotActive: { width: 5, height: 3, borderRadius: 2, backgroundColor: palette.blue },
  collectionBrandRow: { flexDirection: 'row', gap: 9, marginBottom: 11 },
  collectionBrand: { flex: 1, height: 37, borderRadius: 5, borderWidth: 1, borderColor: '#D7D7D7', alignItems: 'center', justifyContent: 'center' },
  collectionBrandText: { fontSize: 15, fontWeight: '500', color: '#111' },
  jbl: { color: '#E52C22', fontWeight: '900' },
  floatingFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, height: 70, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderTopWidth: 1, borderColor: palette.border },
  footerTab: { flex: 1, height: 66, alignItems: 'center', justifyContent: 'center', gap: 4 },
  footerTabText: { fontSize: 10, color: '#555', fontWeight: '500' },
  footerTabActive: { color: palette.blue, fontWeight: '700' },
  detailPage: { flex: 1, alignSelf: 'center', backgroundColor: '#F4F5FA' },
  detailContent: { paddingBottom: 112 },
  detailHeroSection: { height: 310, backgroundColor: '#FFFFFF' },
  detailGallery: { width: '100%', backgroundColor: '#FFFFFF' },
  detailHero: { width: '100%', height: '100%' },
  detailOverlayHeader: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailOverlayActions: { flexDirection: 'row', gap: 9 },
  detailCircleButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  detailDots: { position: 'absolute', left: 0, right: 0, bottom: 10, height: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  detailDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(43,84,123,0.48)' },
  detailDotActive: { backgroundColor: '#CC3438' },
  detailThumbnailScroller: { width: '100%', flexGrow: 0, backgroundColor: '#FFFFFF' },
  detailThumbnails: { minWidth: '100%', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  detailThumbnail: { width: 54, height: 54, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 9, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  detailThumbnailActive: { borderWidth: 2, borderColor: palette.blue },
  swatchImage: { width: '100%', height: '100%' },
  detailInfoCard: { marginHorizontal: 12, marginTop: 8, padding: 13, borderRadius: 14, backgroundColor: '#FFFFFF' },
  detailTitle: { color: palette.heading, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  detailUnit: { marginTop: 5, color: palette.ink, fontSize: 12, fontWeight: '700' },
  detailPriceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 7, marginTop: 7 },
  detailPrice: { fontSize: 22, fontWeight: '900' },
  detailOldPrice: { fontSize: 14, color: 'rgba(0,0,0,0.45)', textDecorationLine: 'line-through' },
  detailDiscount: { fontSize: 14, color: '#D83434', fontWeight: '800' },
  inclusive: { color: '#536071', fontSize: 12, marginTop: 5 },
  detailBrand: { color: palette.heading, fontSize: 16, fontWeight: '900' },
  detailMuted: { marginTop: 4, color: '#667085', fontSize: 12 },
  detailStockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#2E8B36' },
  stockDotUnavailable: { backgroundColor: '#B98725' },
  stockText: { color: '#2E8B36', fontSize: 13, fontWeight: '800' },
  stockTextUnavailable: { color: '#B98725' },
  quantityRow: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quantityLabel: { color: palette.heading, fontSize: 14, fontWeight: '800' },
  quantityControl: { width: 116, height: 40, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  quantityButton: { paddingHorizontal: 10, color: palette.ink, fontSize: 22 },
  quantityValue: { color: palette.heading, fontSize: 14, fontWeight: '800' },
  genuineText: { marginTop: 18, color: '#268767', fontSize: 11, letterSpacing: 1.2, fontWeight: '900' },
  deliveryEstimate: { marginTop: 14, color: palette.heading, fontSize: 15, fontWeight: '900' },
  codBox: { height: 48, marginTop: 12, borderWidth: 1.5, borderColor: '#2E8B36', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  codText: { color: '#22812E', fontSize: 14, fontWeight: '900' },
  buyNowButton: { height: 48, marginTop: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2D2E' },
  buyNowButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  accordion: { minHeight: 62, marginHorizontal: 12, marginTop: 10, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 18, backgroundColor: '#FFFFFF' },
  accordionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionTitle: { fontSize: 15, fontWeight: '800' },
  accordionCopy: { fontSize: 13, color: '#4D5562', marginTop: 12, lineHeight: 20 },
  similarTitle: { marginHorizontal: 14, marginTop: 24, fontSize: 20, fontWeight: '900' },
  similarSubtitle: { marginHorizontal: 14, marginTop: 4, color: '#667085', fontSize: 12 },
  detailRecommendations: { gap: 12, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 18 },
  buyBar: { minHeight: 94, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.white, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E5E5E5' },
  buyBarUnit: { color: '#4D5562', fontSize: 11, fontWeight: '700' },
  buyBarPrice: { marginTop: 2, color: palette.heading, fontSize: 19, fontWeight: '900' },
  buyBarTax: { marginTop: 2, color: '#667085', fontSize: 10 },
  addLarge: { width: '56%', height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  notifyLarge: { backgroundColor: '#2E8B36' },
  addLargeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
