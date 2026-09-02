import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShopifyCollectionPreview, ShopifyMenuItem } from '../src/shopify';

type Props = {
  menuItems: ShopifyMenuItem[];
  previews: Record<string, ShopifyCollectionPreview>;
  onSelectCollection: (category: ShopifyMenuItem, collection: ShopifyMenuItem) => void;
};

function CollectionImage({ imageUrl, loaded }: { imageUrl?: string; loaded: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);

  if (!loaded) return <ActivityIndicator size="small" color="#3F72E5" />;
  if (!imageUrl || failed) return <Ionicons name="image-outline" size={30} color="#8D9AAF" />;
  return <Image source={{ uri: imageUrl }} style={s.image} resizeMode="contain" onError={() => setFailed(true)} />;
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
              const imageUrl = preview?.image?.url ?? preview?.products.nodes[0]?.images.nodes[0]?.url;
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
  categoryTitle: { marginBottom: 11, color: '#1A1C1D', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  collectionGrid: { marginHorizontal: -5, flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  collectionItem: { width: '25%', paddingHorizontal: 5, alignItems: 'center' },
  imageBlock: { width: '100%', aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 5, elevation: 3 },
  imageClip: { width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  image: { width: '100%', height: '100%', transform: [{ scale: 1.24 }] },
  collectionLabel: { minHeight: 34, marginTop: 7, color: '#1A1C1D', fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center' },
});
