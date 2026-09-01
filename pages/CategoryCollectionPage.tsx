import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShopifyCollectionPreview, ShopifyMenuItem, ShopifyProduct } from '../src/shopify';

type Props = {
  category: ShopifyMenuItem;
  selectedCollection: ShopifyMenuItem;
  previews: Record<string, ShopifyCollectionPreview>;
  products: ShopifyProduct[];
  loading: boolean;
  totalProducts: number | null;
  loadingMore: boolean;
  hasNextPage: boolean;
  onBack: () => void;
  onSelectCollection: (collection: ShopifyMenuItem) => void;
  onLoadMore: () => void;
  onAdd: () => void;
  onOpenProduct: (product: ShopifyProduct) => void;
};

type SortMode = 'Recommended' | 'Price: Low' | 'Price: High' | 'Name';
const sortOptions: Array<{ label: string; value: SortMode }> = [
  { label: 'Recommended', value: 'Recommended' },
  { label: 'High', value: 'Price: High' },
  { label: 'Low', value: 'Price: Low' },
  { label: 'Name', value: 'Name' },
];

export function CategoryCollectionPage({ category, selectedCollection, previews, products, loading, totalProducts, loadingMore, hasNextPage, onBack, onSelectCollection, onLoadMore, onAdd, onOpenProduct }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('Recommended');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedShipping, setSelectedShipping] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedBrands(new Set());
    setSelectedShipping(new Set());
  }, [selectedCollection.id]);

  const brands = useMemo(() => [...new Set(products.map(product => product.brandName?.value.trim() ?? '').filter(Boolean))].sort(), [products]);
  const shippingOptions = useMemo(() => [...new Set(products.map(product => product.vendor.trim()).filter(Boolean))].sort(), [products]);
  const activeFilterCount = selectedBrands.size + selectedShipping.size;
  const selectedSortLabel = sortOptions.find(option => option.value === sortMode)?.label ?? 'Recommended';

  const visibleProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const brand = product.brandName?.value.trim() ?? '';
      if (selectedBrands.size && !selectedBrands.has(brand)) return false;
      if (selectedShipping.size && !selectedShipping.has(product.vendor.trim())) return false;
      return true;
    });
    if (sortMode === 'Price: Low') filtered.sort((a, b) => Number(a.variants.nodes[0]?.price.amount ?? 0) - Number(b.variants.nodes[0]?.price.amount ?? 0));
    if (sortMode === 'Price: High') filtered.sort((a, b) => Number(b.variants.nodes[0]?.price.amount ?? 0) - Number(a.variants.nodes[0]?.price.amount ?? 0));
    if (sortMode === 'Name') filtered.sort((a, b) => a.title.localeCompare(b.title));
    return filtered;
  }, [products, selectedBrands, selectedShipping, sortMode]);

  const toggleBrand = (brand: string) => setSelectedBrands(current => {
    const next = new Set(current);
    next.has(brand) ? next.delete(brand) : next.add(brand);
    return next;
  });
  const toggleShipping = (shipping: string) => setSelectedShipping(current => {
    const next = new Set(current);
    next.has(shipping) ? next.delete(shipping) : next.add(shipping);
    return next;
  });
  const clearFilters = () => { setSelectedBrands(new Set()); setSelectedShipping(new Set()); };
  const collections = category.items.length ? category.items : [category];

  return <View style={s.page}>
    <View style={s.header}>
      <Pressable onPress={onBack} style={s.headerButton}><Ionicons name="arrow-back" size={25} color="#1A1C1D" /></Pressable>
      <View style={s.headerCopy}><Text numberOfLines={1} style={s.headerTitle}>{category.title.trim()}</Text><Text style={s.headerSubtitle}>Shop from verified collections</Text></View>
      <Pressable style={s.headerButton}><Ionicons name="search-outline" size={25} color="#1A1C1D" /></Pressable>
    </View>

    <View style={s.content}>
      <ScrollView showsVerticalScrollIndicator={false} style={s.collectionRail} contentContainerStyle={s.collectionRailContent}>
        {collections.map(collection => {
          const active = collection.id === selectedCollection.id;
          const preview = collection.resource ? previews[collection.resource.id] : undefined;
          const imageUrl = preview?.products.nodes[0]?.images.nodes[0]?.url;
          return <Pressable key={collection.id} onPress={() => onSelectCollection(collection)} style={[s.collectionRailItem, active && s.collectionRailItemActive]}>
            <View style={[s.collectionImageBlock, active && s.collectionImageBlockActive]}>
              {imageUrl ? <Image source={{ uri: imageUrl }} style={s.collectionImage} resizeMode="contain" /> : <Ionicons name="image-outline" size={25} color="#8D9AAF" />}
            </View>
            <Text numberOfLines={3} style={[s.collectionName, active && s.collectionNameActive]}>{collection.title.trim()}</Text>
          </Pressable>;
        })}
      </ScrollView>

      <View style={s.productsPanel}>
        <View style={s.controls}>
          <Pressable onPress={() => setFilterVisible(true)} style={[s.control, activeFilterCount > 0 && s.controlActive]}><Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? '#FFFFFF' : '#2C2D2E'} /><Text style={[s.controlText, activeFilterCount > 0 && s.controlTextActive]}>Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}</Text><Ionicons name="chevron-down" size={15} color={activeFilterCount > 0 ? '#FFFFFF' : '#2C2D2E'} /></Pressable>
          <Pressable onPress={() => setSortVisible(true)} style={s.control}><Ionicons name="swap-vertical" size={18} color="#2C2D2E" /><Text numberOfLines={1} style={s.controlText}>Sort ({selectedSortLabel})</Text><Ionicons name="chevron-down" size={15} color="#2C2D2E" /></Pressable>
        </View>
        <View style={s.selectedHeading}><Text style={s.selectedTitle}>{selectedCollection.title.trim()}</Text><Text style={s.resultCount}>{totalProducts ?? products.length} products</Text></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.productScroll}>
          {loading ? <ActivityIndicator size="large" color="#3F72E5" style={s.loader} /> : <View style={s.productGrid}>
            {visibleProducts.map(product => {
              const variant = product.variants.nodes[0];
              const imageUrl = product.images.nodes[0]?.url;
              const price = Number(variant?.price.amount ?? 0);
              const compareAtPrice = Number(variant?.compareAtPrice?.amount ?? 0);
              const hasDiscount = compareAtPrice > price && price > 0;
              const discountPercent = hasDiscount ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;
              const availableForSale = variant?.availableForSale ?? false;
              return <View key={product.id} style={s.productCard}>
                <Pressable onPress={() => onOpenProduct(product)} style={s.productImageBlock}>
                  {imageUrl ? <Image source={{ uri: imageUrl }} style={[s.productImage, !availableForSale && s.unavailableImage]} resizeMode="contain" /> : <Ionicons name="image-outline" size={32} color="#8D9AAF" />}
                  {!availableForSale ? <View style={s.comingSoonBadge}><Text style={s.comingSoonBadgeText}>Coming soon</Text></View> : hasDiscount ? <View style={s.discountBadge}><Text style={s.discountBadgeText}>-{discountPercent}%</Text></View> : null}
                  <Ionicons name="heart-outline" size={20} color="#3F72E5" style={s.heart} />
                  <Pressable onPress={availableForSale ? onAdd : () => {}} style={[s.imageActionButton, !availableForSale && s.notifyButton]}><Text style={[s.imageActionText, !availableForSale && s.notifyButtonText]}>{availableForSale ? 'ADD' : 'NOTIFY'}</Text></Pressable>
                </Pressable>
                <Text numberOfLines={2} style={[s.productName, !availableForSale && s.unavailableDetails]}>{product.title}</Text>
                <View style={[s.priceRow, !availableForSale && s.unavailableDetails]}>
                  <Text style={[s.price, hasDiscount && s.discountedPrice]}>{variant ? `₹${price.toLocaleString('en-IN')}` : 'Unavailable'}</Text>
                  {hasDiscount ? <Text numberOfLines={1} style={s.comparePrice}>₹{compareAtPrice.toLocaleString('en-IN')}</Text> : null}
                </View>
              </View>;
            })}
            {!visibleProducts.length ? <Text style={s.empty}>No products match this filter.</Text> : null}
          </View>}
          {!loading && hasNextPage ? <Pressable disabled={loadingMore} onPress={onLoadMore} style={[s.loadMoreButton, loadingMore && s.loadMoreButtonDisabled]}>
            {loadingMore ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={s.loadMoreButtonText}>Load more</Text>}
          </Pressable> : null}
        </ScrollView>
      </View>
    </View>
    <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
      <Pressable style={s.filterBackdrop} onPress={() => setFilterVisible(false)}>
        <Pressable style={s.filterSheet} onPress={() => {}}>
          <View style={s.filterHeader}><Text style={s.filterTitle}>Filters</Text><Pressable onPress={() => setFilterVisible(false)}><Ionicons name="close" size={26} color="#1A1C1D" /></Pressable></View>
          <View style={s.filterBody}>
            <Text style={s.filterSectionTitle}>Brand</Text>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={s.brandOptions} contentContainerStyle={s.filterOptionsContent}>
              {brands.map(brand => <Pressable key={brand} onPress={() => toggleBrand(brand)} style={s.filterOption}>
                <View style={[s.checkbox, selectedBrands.has(brand) && s.checkboxSelected]}>{selectedBrands.has(brand) ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}</View>
                <Text style={s.filterOptionText}>{brand}</Text>
              </Pressable>)}
              {!brands.length ? <Text style={s.noOptions}>No brand information available.</Text> : null}
            </ScrollView>
            <View style={s.filterDivider} />
            <Text style={s.filterSectionTitle}>Shipping</Text>
            {shippingOptions.map(option => <Pressable key={option} onPress={() => toggleShipping(option)} style={s.filterOption}>
              <View style={[s.checkbox, selectedShipping.has(option) && s.checkboxSelected]}>{selectedShipping.has(option) ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}</View>
              <Text style={s.filterOptionText}>{option}</Text>
            </Pressable>)}
            {!shippingOptions.length ? <Text style={s.noOptions}>No shipping information available.</Text> : null}
          </View>
          <View style={s.filterActions}><Pressable onPress={clearFilters} style={s.clearButton}><Text style={s.clearButtonText}>Clear all</Text></Pressable><Pressable onPress={() => setFilterVisible(false)} style={s.applyButton}><Text style={s.applyButtonText}>Show {visibleProducts.length} products</Text></Pressable></View>
        </Pressable>
      </Pressable>
    </Modal>
    <Modal visible={sortVisible} transparent animationType="slide" onRequestClose={() => setSortVisible(false)}>
      <Pressable style={s.filterBackdrop} onPress={() => setSortVisible(false)}>
        <Pressable style={s.sortSheet} onPress={() => {}}>
          <View style={s.filterHeader}><Text style={s.filterTitle}>Sort</Text><Pressable onPress={() => setSortVisible(false)}><Ionicons name="close" size={26} color="#1A1C1D" /></Pressable></View>
          <View style={s.sortOptions}>
            {sortOptions.map(option => {
              const selected = sortMode === option.value;
              return <Pressable key={option.value} onPress={() => { setSortMode(option.value); setSortVisible(false); }} style={[s.sortOption, selected && s.sortOptionSelected]}>
                <Text style={[s.sortOptionText, selected && s.sortOptionTextSelected]}>{option.label}</Text>
                <View style={[s.radio, selected && s.radioSelected]}>{selected ? <View style={s.radioDot} /> : null}</View>
              </Pressable>;
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { height: 76, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#F5F5F5' },
  headerButton: { width: 46, height: 46, borderWidth: 1, borderColor: '#E4E4E4', borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#1A1C1D', fontSize: 18, fontWeight: '900' },
  headerSubtitle: { marginTop: 3, color: '#287F7A', fontSize: 11, fontWeight: '700' },
  content: { flex: 1, flexDirection: 'row' },
  collectionRail: { width: 92, flexGrow: 0, backgroundColor: '#F5F5F5', borderRightWidth: 1, borderColor: '#E5E5E5' },
  collectionRailContent: { paddingVertical: 10, paddingBottom: 30 },
  collectionRailItem: { minHeight: 108, marginHorizontal: 3, paddingHorizontal: 4, paddingVertical: 7, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', borderRadius: 10 },
  collectionRailItemActive: { borderColor: '#285FCB', backgroundColor: '#3F72E5' },
  collectionImageBlock: { width: 62, height: 62, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 4, elevation: 3 },
  collectionImageBlockActive: { backgroundColor: '#FFFFFF' },
  collectionImage: { width: '88%', height: '88%' },
  collectionName: { marginTop: 6, color: '#555555', fontSize: 10, lineHeight: 13, textAlign: 'center', fontWeight: '600' },
  collectionNameActive: { color: '#FFFFFF', fontWeight: '900' },
  productsPanel: { flex: 1, backgroundColor: '#FFFFFF' },
  controls: { flexDirection: 'row', gap: 7, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 5 },
  control: { flex: 1, minWidth: 0, height: 42, paddingHorizontal: 8, borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FFFFFF' },
  controlActive: { borderColor: '#3F72E5', backgroundColor: '#3F72E5' },
  controlText: { flexShrink: 1, color: '#2C2D2E', fontSize: 11, fontWeight: '700' },
  controlTextActive: { color: '#FFFFFF' },
  selectedHeading: { paddingHorizontal: 12, paddingTop: 0, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  selectedTitle: { color: '#1A1C1D', fontSize: 16, lineHeight: 20, fontWeight: '900' },
  resultCount: { marginTop: 1, color: '#777777', fontSize: 9, lineHeight: 12, fontWeight: '600' },
  productScroll: { paddingTop: 12, paddingHorizontal: 10, paddingBottom: 30 },
  loader: { marginTop: 60 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  productCard: { width: '48%' },
  productImageBlock: { width: '100%', aspectRatio: 0.92, borderWidth: 1, borderColor: '#E7E7E7', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  productImage: { width: '94%', height: '94%' },
  unavailableImage: { opacity: 0.42 },
  unavailableDetails: { opacity: 0.48 },
  discountBadge: { position: 'absolute', top: 0, left: 0, minWidth: 38, height: 22, paddingHorizontal: 6, borderTopLeftRadius: 9, borderBottomRightRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D83434' },
  discountBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  comingSoonBadge: { position: 'absolute', top: 0, left: 0, height: 24, paddingHorizontal: 8, borderTopLeftRadius: 9, borderBottomRightRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B98725' },
  comingSoonBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  imageActionButton: { position: 'absolute', right: 0, bottom: -19, minWidth: 62, height: 38, paddingHorizontal: 10, borderWidth: 1.5, borderColor: '#3F72E5', borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3F72E5' },
  imageActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  notifyButton: { borderColor: '#2E8B36', backgroundColor: '#FFFFFF' },
  notifyButtonText: { color: '#2E8B36' },
  heart: { position: 'absolute', top: 7, right: 7 },
  productName: { minHeight: 34, marginTop: 25, color: '#2C2D2E', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  priceRow: { height: 46, marginTop: 3, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', alignItems: 'baseline', columnGap: 4, rowGap: 2, overflow: 'hidden' },
  price: { color: '#1A1C1D', fontSize: 16, fontWeight: '900' },
  discountedPrice: { color: '#D83434' },
  comparePrice: { flexShrink: 1, color: '#666666', fontSize: 10, textDecorationLine: 'line-through' },
  empty: { width: '100%', marginTop: 50, color: '#777777', textAlign: 'center' },
  loadMoreButton: { alignSelf: 'center', minWidth: 140, height: 44, marginTop: 24, paddingHorizontal: 24, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3F72E5' },
  loadMoreButtonDisabled: { opacity: 0.65 },
  loadMoreButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  filterBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  filterSheet: { maxHeight: '82%', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF' },
  filterHeader: { height: 62, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#EEEEEE' },
  filterTitle: { color: '#1A1C1D', fontSize: 21, fontWeight: '900' },
  filterBody: { flexShrink: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 18 },
  brandOptions: { maxHeight: 250, flexGrow: 0 },
  filterOptionsContent: { paddingRight: 6 },
  filterSectionTitle: { marginBottom: 12, color: '#1A1C1D', fontSize: 18, fontWeight: '800' },
  filterOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 13 },
  checkbox: { width: 25, height: 25, borderWidth: 1.5, borderColor: '#777777', borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  checkboxSelected: { borderColor: '#3F72E5', backgroundColor: '#3F72E5' },
  filterOptionText: { flex: 1, color: '#2C2D2E', fontSize: 16, lineHeight: 21 },
  noOptions: { marginBottom: 10, color: '#777777', fontSize: 13 },
  filterDivider: { height: 1, marginVertical: 20, backgroundColor: '#EEEEEE' },
  filterActions: { padding: 14, flexDirection: 'row', gap: 10, borderTopWidth: 1, borderColor: '#EEEEEE', backgroundColor: '#FFFFFF' },
  clearButton: { width: 105, height: 48, borderWidth: 1.5, borderColor: '#3F72E5', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  clearButtonText: { color: '#3F72E5', fontSize: 14, fontWeight: '800' },
  applyButton: { flex: 1, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3F72E5' },
  applyButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  sortSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF' },
  sortOptions: { paddingHorizontal: 20, paddingVertical: 14 },
  sortOption: { minHeight: 54, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sortOptionSelected: { backgroundColor: '#EEF3FF' },
  sortOptionText: { color: '#2C2D2E', fontSize: 16, fontWeight: '700' },
  sortOptionTextSelected: { color: '#3F72E5', fontWeight: '900' },
  radio: { width: 22, height: 22, borderWidth: 2, borderColor: '#777777', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#3F72E5' },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#3F72E5' },
});
