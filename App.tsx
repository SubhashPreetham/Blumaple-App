import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchShopifyProducts, ShopifyProduct } from './src/shopify';
import { CheckoutPage } from './pages/CheckoutPage';
import { AddressPage } from './pages/AddressPage';
import { DashboardPage } from './pages/DashboardPage';
import { ShippingAddress } from './pages/types';

const palette = {
  ink: '#2C2D2E',
  heading: '#1A1C1D',
  blue: '#3F72E5',
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
};

type UploadedCarouselSlide = { id: string; image: string; title: string; collection: string };
type UploadedCarouselData = Record<string, UploadedCarouselSlide[]>;

const categories = [
  ['Audio', require('./assets/figma/category-audio.png')],
  ['Cameras', require('./assets/figma/category-camera.png')],
  ['Computers', require('./assets/figma/category-computers.png')],
  ['Smart Tech', require('./assets/figma/category-smart-tech.png')],
  ['Home', require('./assets/figma/category-home.png')],
  ['Lifestyle', require('./assets/figma/category-lifestyle.png')],
  ['Industry', require('./assets/figma/category-industry.png')],
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
  };
}

function ProductCard({ item, width, favorite, onFavorite, onAdd, onOpen, showFavorite = true }: { item: Product; width: number; favorite: boolean; onFavorite: () => void; onAdd: () => void; onOpen?: () => void; showFavorite?: boolean }) {
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
  const choices = product.images?.length ? product.images.map((image, index) => ({ name: index === 0 ? 'Default' : `View ${index + 1}`, image })) : detailColors;
  const color = choices[colorIndex] ?? choices[0]!;
  const rows = [
    ['Product description', product.description || 'Product details are available from the Shopify store.'],
    ['Ratings and reviews', 'No ratings for this product yet'],
    ['Frequently asked questions', 'Look for product details'],
  ] as const;

  return <View style={[styles.detailPage, { width }]}>
    <View style={styles.detailHeader}>
      <Pressable onPress={onBack} hitSlop={12}><Ionicons name="arrow-back" size={25} color={palette.ink} /></Pressable>
      <View style={styles.detailHeaderActions}>
        <Ionicons name="search-outline" size={27} color={palette.blue} />
        <Ionicons name="share-social-outline" size={27} color={palette.blue} />
        <View><Ionicons name="cart-outline" size={31} color={palette.blue} />{cartCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>}</View>
      </View>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
      <Image source={color.image} style={styles.detailHero} resizeMode="contain" />
      <View style={styles.detailDots}>{choices.map((_, i) => <View key={i} style={[styles.detailDot, i === colorIndex && styles.detailDotActive]} />)}</View>
      <Text style={styles.selectedColor}><Text style={styles.selectedColorBold}>Selected Color: </Text>{color.name}</Text>
      <View style={styles.swatches}>{choices.map((option, index) => <Pressable key={`${option.name}-${index}`} onPress={() => setColorIndex(index)} style={[styles.swatch, index === colorIndex && styles.swatchActive]}><Image source={option.image} style={styles.swatchImage} resizeMode="contain" /></Pressable>)}</View>
      <Text style={styles.detailTitle}>{product.name}</Text>
      <View style={styles.detailPriceRow}><Text style={styles.detailPrice}>{product.price}</Text>{product.oldPrice ? <Text style={styles.detailOldPrice}>{product.oldPrice}</Text> : null}{product.discount ? <Text style={styles.detailDiscount}>{product.discount}</Text> : null}</View>
      <Text style={styles.inclusive}>Inclusive of all offers</Text>
      <View style={styles.offers}>
        <View style={styles.offerTitle}><Ionicons name="pricetag" size={22} color={palette.blue} /><Text style={styles.offerTitleText}>Apply offers to save more</Text><Ionicons name="chevron-forward" size={21} color={palette.ink} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offerRow}>{[0, 1].map(i => <View key={i} style={styles.offerCard}><Text style={styles.offerText}><Text style={{ fontWeight: '700' }}>Bank Offer: </Text>10% instant discount on HDFC Bank cards</Text></View>)}</ScrollView>
      </View>
      <Text style={styles.detailSectionTitle}>Delivery details</Text>
      <View style={styles.deliveryBox}><Ionicons name="location-outline" size={23} /><Text style={styles.pin}>530013</Text><Text style={styles.deliveryLink}>Select delivery location</Text><Ionicons name="chevron-forward" size={18} /></View>
      <View style={styles.deliveryBox}><Ionicons name="cube-outline" size={23} /><Text style={styles.deliveryText}><Text style={{ color: 'green', fontWeight: '800' }}>Free</Text> Delivery by 26 Aug, Wed</Text></View>
      {rows.map(([title, copy]) => { const open = expanded === title; return <Pressable key={title} onPress={() => setExpanded(open ? null : title)} style={styles.accordion}><View style={styles.accordionHeading}><Text style={styles.accordionTitle}>{title}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} /></View><Text style={styles.accordionCopy}>{copy}</Text></Pressable>; })}
      <Text style={styles.similarTitle}>Similar Products</Text>
      <View style={styles.grid}>{products.slice(0, 4).map(item => <ProductCard key={`similar-${item.id}`} item={item} width={(width - 35) / 2} favorite={false} onFavorite={() => {}} onAdd={onAdd} />)}</View>
    </ScrollView>
    <View style={styles.buyBar}><Pressable onPress={onAdd} style={styles.addLarge}><Text style={styles.addLargeText}>Add to cart</Text></Pressable><Pressable onPress={onCheckout} style={styles.buyLarge}><Text numberOfLines={1} style={styles.buyLargeText}>Buy at {product.price}</Text></Pressable></View>
  </View>;
}

function Storefront() {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const contentWidth = Math.min(screenWidth, 440);
  const cardWidth = Math.max(156, (contentWidth - 46) / 2);
  const carouselCardWidth = Math.round((contentWidth - 20) / 2);
  const carouselStep = carouselCardWidth + 12;
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeCategory, setActiveCategory] = useState('Audio');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cartCount, setCartCount] = useState(0);
  const [screen, setScreen] = useState<'home' | 'collection' | 'product' | 'checkout' | 'address'>('home');
  const [shopifyProducts, setShopifyProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [shopifyLoading, setShopifyLoading] = useState(true);
  const [shopifyError, setShopifyError] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [pincodeModalVisible, setPincodeModalVisible] = useState(false);
  const [pincode, setPincode] = useState('');
  const [uploadedCarousels, setUploadedCarousels] = useState<UploadedCarouselData>({});
  const carouselRef = useRef<ScrollView>(null);
  const catalog = shopifyProducts.length ? shopifyProducts : products;
  const recommendations = useMemo(() => catalog.slice(0, 4), [catalog]);
  const activeHomeMenu = homeMenus.find(menu => menu.label === activeCategory) ?? homeMenus[0]!;
  const categoryIndex = Math.max(0, homeMenus.findIndex(menu => menu.label === activeHomeMenu.label));
  const categoryProducts = useMemo(
    () => Array.from({ length: Math.min(5, catalog.length) }, (_, index) => catalog[(categoryIndex + index) % catalog.length]!).filter(Boolean),
    [catalog, categoryIndex],
  );
  const carouselProducts = useMemo(
    () => Array.from({ length: 4 }, (_, index) => categoryProducts[index % categoryProducts.length] ?? products[0]!),
    [categoryProducts],
  );
  const browserCarouselApiUrl = typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.hostname}:3001/api/carousels` : '';
  const carouselApiUrl = process.env.EXPO_PUBLIC_CAROUSEL_API_URL ?? browserCarouselApiUrl;
  const uploadedSlides = uploadedCarousels[activeHomeMenu.label]?.filter(slide => slide.image) ?? [];
  const carouselSlides = useMemo(() => uploadedSlides.length
    ? uploadedSlides.map((slide, index) => ({ id: slide.id, image: { uri: slide.image } as ImageSourcePropType, title: slide.title || `${activeHomeMenu.label} picks`, subtitle: slide.collection ? `Shop ${slide.collection}` : `Trending ${activeHomeMenu.label.toLowerCase()} pick`, product: categoryProducts[index % categoryProducts.length] ?? products[0]! }))
    : carouselProducts.map(item => ({ id: item.id, image: item.image, title: item.name, subtitle: `Trending ${activeHomeMenu.label.toLowerCase()} pick`, product: item })),
  [activeHomeMenu.label, carouselProducts, categoryProducts, uploadedSlides]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => carouselRef.current?.scrollTo({ x: carouselStep * 4, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [activeHomeMenu.label, carouselStep]);

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

  if (screen === 'product' && selectedProduct) {
    return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} /><ProductDetail width={contentWidth} cartCount={cartCount} product={selectedProduct} onBack={() => setScreen('home')} onAdd={() => setCartCount(value => value + 1)} onCheckout={() => { setCartCount(value => Math.max(1, value)); setScreen('checkout'); }} /></SafeAreaView>;
  }

  if (screen === 'checkout' && selectedProduct) return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} /><CheckoutPage product={selectedProduct} quantity={Math.max(1, cartCount)} address={shippingAddress} onBack={() => setScreen('product')} onAddress={() => setScreen('address')} /></SafeAreaView>;

  if (screen === 'address') return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} /><AddressPage onBack={() => setScreen('checkout')} onSave={(address) => { setShippingAddress(address); setScreen('checkout'); }} /></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.safeArea, screen === 'home' && styles.homeSafeArea]}>
      <StatusBar barStyle="dark-content" backgroundColor={screen === 'home' ? '#BED0F7' : '#F5F5F5'} translucent={false} />
      <View style={[styles.app, { width: contentWidth }]}>
        {screen === 'collection' ? <View style={styles.collectionHeader}>
          <Pressable onPress={() => setScreen('home')} hitSlop={10}><Ionicons name="arrow-back" size={19} color={palette.ink} /></Pressable>
          <Text style={styles.collectionHeaderTitle}>AUDIO</Text>
          <View style={styles.collectionHeaderActions}><Ionicons name="search-outline" size={20} color={palette.blue} /><Ionicons name="cart-outline" size={22} color={palette.blue} /></View>
        </View> : <View style={styles.deliveryHeader}>
          <View>
            <Image source={require('./images/blumaple logo.png')} style={styles.deliveryLogo} resizeMode="contain" />
            <Pressable onPress={() => setPincodeModalVisible(true)} style={styles.addAddressButton}><Ionicons name="location-outline" size={16} color={palette.blue} /><Text style={styles.addAddressText}>Check Delivery</Text></Pressable>
          </View>
          <View style={styles.deliveryActions}>
            <View>
              <Pressable onPress={() => selectedProduct && setScreen('checkout')}><Ionicons name="person-circle" size={39} color={palette.ink} /></Pressable>
              {cartCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>}
            </View>
          </View>
        </View>}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {screen === 'home' ? <>
          <View style={styles.carouselHeaderZone}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={28} color={palette.ink} />
            <TextInput placeholder="Search for products, brands and more" placeholderTextColor="#9B9B9B" style={styles.searchInput} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.blinkTabs}>
            {homeMenus.map((menu) => (
              <Pressable key={menu.label} onPress={() => setActiveCategory(menu.label)} style={[styles.blinkTab, activeCategory === menu.label && styles.blinkTabActive]}>
                <Ionicons name={menu.label === 'Audio' ? 'headset-outline' : menu.label === 'Capture' ? 'camera-outline' : menu.label === 'Computers' ? 'laptop-outline' : menu.label === 'Smart Tech' ? 'watch-outline' : menu.label === 'Home' ? 'home-outline' : menu.label === 'Lifestyle' ? 'sparkles-outline' : 'build-outline'} size={27} color={activeCategory === menu.label ? palette.white : palette.ink} />
                <Text style={[styles.blinkTabText, activeCategory === menu.label && styles.blinkTabTextActive]}>{menu.label}</Text>
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
              setActiveBanner(index % 4);
              if (index >= 8) requestAnimationFrame(() => carouselRef.current?.scrollTo({ x: (index - 4) * carouselStep, animated: false }));
              if (index <= 0) requestAnimationFrame(() => carouselRef.current?.scrollTo({ x: (index + 4) * carouselStep, animated: false }));
            }}
            contentContainerStyle={[styles.promoCards, { paddingHorizontal: carouselCardWidth / 2 }]}
          >
            {[...carouselSlides, ...carouselSlides, ...carouselSlides].map((slide, index) => <Pressable key={`${activeHomeMenu.label}-${slide.id}-${index}`} style={[styles.promoCard, { width: carouselCardWidth }]} onPress={() => { setSelectedProduct(slide.product); setScreen('product'); }}>
              <Image source={slide.image} style={styles.promoImage} resizeMode="contain" />
              <View style={styles.promoShade} /><View style={styles.promoCopy}><Text numberOfLines={2} style={styles.promoTitle}>{slide.title}</Text><Text style={styles.promoSubtitle}>{slide.subtitle}</Text><View style={styles.promoArrow}><Ionicons name="chevron-forward" size={18} color={palette.white} /></View></View>
            </Pressable>)}
          </ScrollView>
          <View style={styles.dots}>{[0, 1, 2, 3].map(index => <View key={index} style={[styles.dot, index === activeBanner && styles.dotActive]} />)}</View>
          </View>
          </View>
          <View style={styles.zigzagPartition}>{Array.from({ length: 30 }).map((_, index) => <View key={index} style={styles.zigzagTooth} />)}</View>
          <SectionTitle>Trending in {activeHomeMenu.label}</SectionTitle>
          <View style={styles.trendingRow}>
            {categoryProducts.slice(0, 3).map(item => <Pressable key={`explore-${activeHomeMenu.label}-${item.id}`} style={[styles.exploreCard, styles.trendingCard]} onPress={() => { setSelectedProduct(item); setScreen('product'); }}><Image source={item.image} style={styles.exploreImage} resizeMode="contain" /><Ionicons name="heart" size={16} color={palette.white} style={styles.exploreHeart} /><Text numberOfLines={1} style={styles.exploreName}>{item.name}</Text></Pressable>)}
          </View>
          <Pressable onPress={() => setScreen('collection')} style={styles.seeMoreButton}><Text style={styles.seeMoreText}>See more products</Text><Ionicons name="arrow-forward" size={15} color={palette.blue} /></Pressable>
          <SectionTitle>Best selling {activeHomeMenu.label}</SectionTitle>
          <View style={styles.grid}>{categoryProducts.slice(0, 4).map(item => <ProductCard key={`grid-${activeHomeMenu.label}-${item.id}`} item={item} width={cardWidth} favorite={favorites.has(item.id)} showFavorite={false} onFavorite={() => toggleFavorite(item.id)} onAdd={() => addToCart(item)} onOpen={() => { setSelectedProduct(item); setScreen('product'); }} />)}</View>

          </> : <>
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
            <Ionicons name={screen === 'home' ? 'home' : 'home-outline'} size={18} color={screen === 'home' ? palette.blue : palette.muted} />
            <Text style={[styles.footerTabText, screen === 'home' && styles.footerTabActive]}>Home</Text>
          </Pressable>
          <Pressable onPress={() => setScreen('collection')} style={styles.footerTab}>
            <Ionicons name={screen === 'collection' ? 'grid' : 'grid-outline'} size={18} color={screen === 'collection' ? palette.blue : palette.muted} />
            <Text style={[styles.footerTabText, screen === 'collection' && styles.footerTabActive]}>Categories</Text>
          </Pressable>
          <Pressable onPress={() => selectedProduct && setScreen('checkout')} style={styles.footerTab}>
            <Ionicons name="bag-handle-outline" size={18} color="#555" />
            <Text style={styles.footerTabText}>Orders</Text>
          </Pressable>
          <Pressable style={styles.footerTab}>
            <Ionicons name="heart-outline" size={18} color="#555" />
            <Text style={styles.footerTabText}>Wishlist</Text>
          </Pressable>
          <Pressable style={styles.footerTab}>
            <Ionicons name="person-outline" size={18} color="#555" />
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
    </SafeAreaView>
  );
}

export default function App() {
  const showDashboard = typeof window !== 'undefined' && window.location && new URLSearchParams(window.location.search).has('dashboard');
  return <SafeAreaProvider>{showDashboard ? <DashboardPage /> : <Storefront />}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  homeSafeArea: { backgroundColor: '#BED0F7' },
  app: { flex: 1, alignSelf: 'center', backgroundColor: palette.white },
  deliveryHeader: { minHeight: 82, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#BED0F7' },
  deliveryLogo: { width: 190, height: 40, marginLeft: -24, alignSelf: 'flex-start' },
  addAddressButton: { marginTop: 4, marginLeft: -5, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addAddressText: { color: palette.blue, fontSize: 12, fontWeight: '800' },
  deliveryBrand: { color: palette.heading, fontSize: 18, fontWeight: '800' },
  deliveryTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  deliveryTime: { color: palette.heading, fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -1 },
  deliveryDistance: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, overflow: 'hidden', backgroundColor: '#DCE7FF', color: palette.blue, fontSize: 12, fontWeight: '800' },
  deliveryAddress: { marginTop: 2, color: palette.ink, fontSize: 13, fontWeight: '600' },
  deliveryActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
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
  content: { paddingHorizontal: 10, paddingBottom: 72 },
  carouselHeaderZone: { marginHorizontal: -10, paddingHorizontal: 10, backgroundColor: '#BED0F7' },
  carouselFade: { marginTop: 18, marginHorizontal: -10, paddingHorizontal: 10, backgroundColor: '#BED0F7' },
  zigzagPartition: { height: 14, marginHorizontal: -10, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#BED0F7' },
  bottomSafeFill: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 25, backgroundColor: '#F5F5F5' },
  zigzagTooth: { width: 16, height: 16, marginHorizontal: 1, marginTop: 6, backgroundColor: palette.white, transform: [{ rotate: '45deg' }] },
  searchBox: { height: 52, marginTop: 10, borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.white },
  searchInput: { flex: 1, padding: 0, fontSize: 13, color: palette.ink },
  blinkTabs: { gap: 7, paddingTop: 15, paddingHorizontal: 9, alignItems: 'flex-end', backgroundColor: '#BED0F7' },
  blinkTab: { width: 90, height: 66, borderTopLeftRadius: 27, borderTopRightRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#F5F5F5' },
  blinkTabActive: { width: 108, height: 86, borderTopLeftRadius: 31, borderTopRightRadius: 31, backgroundColor: palette.blue, borderColor: palette.blue, borderBottomWidth: 0, marginBottom: -1 },
  blinkTabText: { marginTop: 5, color: palette.ink, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  blinkTabTextActive: { color: palette.white, fontWeight: '800' },
  promoCards: { gap: 12, paddingBottom: 4 },
  promoCard: { height: 270, borderRadius: 21, overflow: 'hidden', backgroundColor: '#DCE7FF' },
  promoImage: { width: '100%', height: '100%' },
  promoShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000', opacity: 0.18 },
  promoCopy: { position: 'absolute', left: 13, right: 10, bottom: 15 },
  promoTitle: { color: palette.white, fontSize: 17, lineHeight: 20, fontWeight: '900' },
  promoSubtitle: { color: palette.white, fontSize: 11, lineHeight: 14, marginTop: 4, width: 140 },
  promoArrow: { position: 'absolute', right: 1, bottom: 1, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.40)' },
  blinkDivider: { marginTop: 15, marginHorizontal: -10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#EEF3FF' },
  blinkDividerText: { color: palette.blue, fontSize: 12, letterSpacing: 2, fontWeight: '800' },
  exploreRow: { gap: 10, paddingBottom: 10 },
  trendingRow: { flexDirection: 'row', gap: 10 },
  exploreCard: { width: 130, height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border },
  trendingCard: { flex: 1, width: undefined },
  exploreImage: { width: '84%', alignSelf: 'center', height: 112, marginTop: 10, backgroundColor: palette.white },
  exploreHeart: { position: 'absolute', top: 10, right: 10 },
  exploreName: { marginTop: 13, paddingHorizontal: 10, color: palette.heading, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  seeMoreButton: { alignSelf: 'center', height: 35, marginTop: 5, paddingHorizontal: 17, borderWidth: 1, borderColor: palette.blue, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6 },
  seeMoreText: { color: palette.blue, fontSize: 11, fontWeight: '800' },
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
  sectionTitle: { color: palette.heading, fontSize: 15, lineHeight: 19, fontWeight: '800', marginTop: 12, marginBottom: 10 },
  productCard: { marginBottom: 15 },
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
  floatingFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, height: 61, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderTopWidth: 1, borderColor: palette.border },
  footerTab: { flex: 1, height: 57, alignItems: 'center', justifyContent: 'center', gap: 3 },
  footerTabText: { fontSize: 8, color: '#555', fontWeight: '500' },
  footerTabActive: { color: palette.blue, fontWeight: '700' },
  detailPage: { flex: 1, alignSelf: 'center', backgroundColor: palette.white },
  detailHeader: { height: 80, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
  detailHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  detailContent: { paddingBottom: 112 },
  detailHero: { width: '100%', height: 458 },
  detailDots: { height: 34, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3, borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
  detailDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(43,84,123,0.48)' },
  detailDotActive: { backgroundColor: '#CC3438' },
  selectedColor: { marginHorizontal: 16, fontSize: 16, lineHeight: 22 },
  selectedColorBold: { fontWeight: '700' },
  swatches: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, marginTop: 15 },
  swatch: { flex: 1, height: 87, borderWidth: 1, borderColor: palette.border, borderRadius: 6, overflow: 'hidden' },
  swatchActive: { borderColor: palette.blue, borderWidth: 1.5 },
  swatchImage: { width: '100%', height: '100%' },
  detailTitle: { marginHorizontal: 16, marginTop: 17, width: 350, fontSize: 22, lineHeight: 27, fontWeight: '800' },
  detailPriceRow: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  detailPrice: { fontSize: 24, fontWeight: '800' },
  detailOldPrice: { fontSize: 18, color: 'rgba(0,0,0,0.45)', textDecorationLine: 'line-through' },
  detailDiscount: { fontSize: 18, color: palette.green },
  inclusive: { marginHorizontal: 16, fontSize: 14, color: 'rgba(0,0,0,0.7)', marginTop: 5 },
  offers: { marginTop: 22, paddingVertical: 11, backgroundColor: 'rgba(191,228,191,0.31)' },
  offerTitle: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8 },
  offerTitleText: { flex: 1, fontSize: 16, fontWeight: '600' },
  offerRow: { gap: 12, paddingHorizontal: 8, marginTop: 13 },
  offerCard: { width: 201, minHeight: 50, padding: 10, borderRadius: 4, backgroundColor: '#EBF7EB', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2 },
  offerText: { fontSize: 12, lineHeight: 15 },
  detailSectionTitle: { marginHorizontal: 16, marginTop: 17, marginBottom: 9, fontSize: 18, fontWeight: '600' },
  deliveryBox: { height: 45, marginHorizontal: 16, marginBottom: 7, borderRadius: 5, backgroundColor: 'rgba(43,87,126,0.15)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, gap: 10 },
  pin: { fontSize: 13, fontWeight: '800' },
  deliveryLink: { flex: 1, color: '#0088FF', fontSize: 13, fontWeight: '600' },
  deliveryText: { fontSize: 16, fontWeight: '800' },
  accordion: { minHeight: 94, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border, paddingHorizontal: 16, paddingVertical: 17 },
  accordionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionTitle: { fontSize: 18, fontWeight: '600' },
  accordionCopy: { fontSize: 14, color: 'rgba(0,0,0,0.54)', marginTop: 9, lineHeight: 19, paddingRight: 30 },
  similarTitle: { marginHorizontal: 16, marginTop: 28, marginBottom: 16, fontSize: 18, fontWeight: '800' },
  buyBar: { height: 91, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.white, borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
  addLarge: { width: '46%', height: 56, borderRadius: 8, borderWidth: 1, borderColor: palette.blue, alignItems: 'center', justifyContent: 'center' },
  addLargeText: { fontSize: 18, fontWeight: '800' },
  buyLarge: { width: '46%', height: 56, borderRadius: 8, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center' },
  buyLargeText: { color: palette.white, fontSize: 18, fontWeight: '800' },
});
