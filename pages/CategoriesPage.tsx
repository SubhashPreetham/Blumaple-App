import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ShopifyCollectionPreview, ShopifyMenuItem } from '../src/shopify';

type Props = {
  menuItems: ShopifyMenuItem[];
  previews: Record<string, ShopifyCollectionPreview>;
  onSelectCollection: (category: ShopifyMenuItem, collection: ShopifyMenuItem) => void;
};

function CollectionImage({ imageUrl, loaded }: { imageUrl?: string; loaded: boolean }) {
  const [imageReady, setImageReady] = useState(false);
  useEffect(() => {
    let active = true;
    setImageReady(false);
    if (imageUrl) Image.prefetch(imageUrl).then(() => { if (active) setImageReady(true); }).catch(() => undefined);
    return () => { active = false; };
  }, [imageUrl]);

  if (!loaded || !imageUrl) return <CartonLoader />;
  return <View style={s.artwork}>
    {!imageReady ? <CartonLoader /> : null}
    <Image source={{ uri: imageUrl }} style={[s.image, !imageReady && s.imageHidden]} resizeMode="contain" onLoad={() => setImageReady(true)} onError={() => setImageReady(false)} />
  </View>;
}

function CartonLoader() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }), Animated.delay(260),
      Animated.timing(progress, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }), Animated.delay(220),
    ]));
    animation.start();
    return () => animation.stop();
  }, [progress]);
  const closed = progress.interpolate({ inputRange: [0, .42, .58, 1], outputRange: [1, 1, 0, 0] });
  const open = progress.interpolate({ inputRange: [0, .42, .58, 1], outputRange: [0, 0, 1, 1] });
  const lift = progress.interpolate({ inputRange: [0, 1], outputRange: [2, -4] });
  return <View accessibilityLabel="Loading collection image" style={s.loaderBox}><Animated.View style={[s.loaderIcon, { opacity: closed }]}><MaterialCommunityIcons name="package-variant-closed" size={26} color="#B97435" /></Animated.View><Animated.View style={[s.loaderIcon, { opacity: open, transform: [{ translateY: lift }] }]}><MaterialCommunityIcons name="package-variant" size={26} color="#B97435" /></Animated.View></View>;
}

export function CategoriesPage({ menuItems, previews, onSelectCollection }: Props) {
  const categories = menuItems.flatMap(menu => menu.items);

  return <View style={s.page}>
    {categories.map(category => {
      const collections = category.items.length ? category.items : [category];
      return <View key={category.id} style={s.categorySection}>
        <Text style={s.categoryTitle}>{category.title.trim()}</Text>
        <View style={s.collectionGrid}>
          {collections.map(collection => {
            const preview = collection.resource ? previews[collection.resource.id] : undefined;
            const imageUrl = preview?.image?.url;
            return <Pressable key={collection.id} onPress={() => onSelectCollection(category, collection)} style={s.collectionItem}>
              <View style={s.imageBlock}>
                <View style={s.imageClip}><CollectionImage imageUrl={imageUrl} loaded={Boolean(preview)} /></View>
              </View>
              <Text numberOfLines={2} style={s.collectionLabel}>{collection.title.trim()}</Text>
            </Pressable>;
          })}
        </View>
      </View>;
    })}
  </View>;
}

const s = StyleSheet.create({
  page: { paddingTop: 18, paddingHorizontal: 12, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  categorySection: { marginBottom: 28 },
  categoryTitle: { marginBottom: 11, color: '#1A1C1D', fontFamily: 'Inter_400Regular', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  collectionGrid: { marginHorizontal: -5, flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  collectionItem: { width: '33.333%', paddingHorizontal: 5, alignItems: 'center' },
  imageBlock: { width: '100%', aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 5, elevation: 3 },
  imageClip: { width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  image: { width: '100%', height: '100%', transform: [{ scale: 1.24 }] },
  artwork: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  imageHidden: { position: 'absolute', opacity: 0.01 },
  loaderBox: { width: 26, height: 26 }, loaderIcon: { position: 'absolute', left: 0, top: 0 },
  collectionLabel: { minHeight: 34, marginTop: 7, color: '#1A1C1D', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center' },
});
