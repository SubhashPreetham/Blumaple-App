import React, { useEffect, useState } from 'react';
import { Image, ImageStyle, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const menus = ['Audio', 'Capture', 'Computers', 'Smart Tech', 'Home', 'Lifestyle', 'Industry'] as const;
type Menu = typeof menus[number];
type CarouselItem = { id: string; image: string; title: string; collection: string };
type CarouselData = Record<Menu, CarouselItem[]>;

const newItem = (): CarouselItem => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, image: '', title: '', collection: '' });
const blankItems = () => [newItem(), newItem(), newItem()];
const emptyData = (): CarouselData => ({ Audio: blankItems(), Capture: blankItems(), Computers: blankItems(), 'Smart Tech': blankItems(), Home: blankItems(), Lifestyle: blankItems(), Industry: blankItems() });
const carouselApiUrl = typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.hostname}:3001/api/carousels` : '';

function loadData(): CarouselData {
  if (typeof window === 'undefined') return emptyData();
  try {
    const saved = window.localStorage.getItem('blumaple-carousel-content');
    if (!saved) return emptyData();
    const parsed = JSON.parse(saved) as Partial<CarouselData>;
    return menus.reduce((result, menu) => ({ ...result, [menu]: parsed[menu]?.length ? parsed[menu] : blankItems() }), {} as CarouselData);
  } catch { return emptyData(); }
}

export function DashboardPage() {
  const [selectedMenu, setSelectedMenu] = useState<Menu>('Audio');
  const [content, setContent] = useState<CarouselData>(loadData);
  const [apiReady, setApiReady] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const slides = content[selectedMenu];

  useEffect(() => {
    fetch(carouselApiUrl).then(response => response.ok ? response.json() : Promise.reject()).then(data => setContent(current => menus.reduce((next, menu) => ({ ...next, [menu]: data[menu]?.length ? data[menu] : blankItems() }), current))).catch(() => undefined).finally(() => setApiReady(true));
  }, []);

  const updateSlide = (id: string, changes: Partial<CarouselItem>) => setContent(current => ({ ...current, [selectedMenu]: current[selectedMenu].map(slide => slide.id === id ? { ...slide, ...changes } : slide) }));
  const addSlide = () => setContent(current => ({ ...current, [selectedMenu]: [...current[selectedMenu], newItem()] }));
  const removeSlide = (id: string) => setContent(current => ({ ...current, [selectedMenu]: current[selectedMenu].filter(slide => slide.id !== id) }));
  const saveChanges = () => {
    if (!apiReady) return;
    setSaveState('saving');
    fetch(carouselApiUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) })
      .then(response => { if (!response.ok) throw new Error('Save failed'); setSaveState('saved'); })
      .catch(() => setSaveState('error'));
  };
  const uploadImage = (id: string, event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateSlide(id, { image: String(reader.result) });
    reader.readAsDataURL(file);
    input.value = '';
  };

  return <View style={s.page}>
    <View style={s.header}><View><Text style={s.eyebrow}>BLUMAPLE ADMIN</Text><Text style={s.title}>Carousel dashboard</Text><Text style={s.subtitle}>Build and organise each menu carousel.</Text></View><View style={s.status}><View style={s.statusDot}/><Text style={s.statusText}>Local browser mode</Text></View></View>
    <ScrollView contentContainerStyle={s.body} bounces alwaysBounceVertical decelerationRate="normal" scrollEventThrottle={16} overScrollMode="auto">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.menuRow}>{menus.map(menu => <Pressable key={menu} onPress={() => setSelectedMenu(menu)} style={[s.menuButton, selectedMenu === menu && s.menuButtonActive]}><Text style={[s.menuText, selectedMenu === menu && s.menuTextActive]}>{menu}</Text></Pressable>)}</ScrollView>
      <View style={s.panelHeader}><View><Text style={s.panelTitle}>{selectedMenu} carousel</Text><Text style={s.panelCopy}>Add as many carousel slides as you need. Each slide can be linked to a collection later.</Text></View><Text style={s.count}>{slides.length} slides</Text></View>
      <View style={s.slideList}>{slides.map((slide, index) => <View key={slide.id} style={s.slideCard}>
        <Text style={s.slideNumber}>SLIDE {index + 1}</Text>
        <View style={s.uploadTile}>{slide.image ? <Image source={{ uri: slide.image }} style={s.uploadPreview as ImageStyle} resizeMode="cover" /> : <><Ionicons name="image-outline" size={29} color="#3F72E5" /><Text style={s.uploadPrompt}>Upload image</Text></>}{React.createElement('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', onChange: (event: Event) => uploadImage(slide.id, event), style: s.fileInput as never })}</View>
        <View style={s.details}><Text style={s.label}>Carousel title</Text><TextInput value={slide.title} onChangeText={title => updateSlide(slide.id, { title })} placeholder="e.g. Discover studio-quality audio" placeholderTextColor="#8D8D8D" style={s.input}/><Text style={s.label}>Collection</Text>{React.createElement('select', { value: slide.collection, onChange: (event: Event) => updateSlide(slide.id, { collection: (event.target as HTMLSelectElement).value }), style: s.select as never }, React.createElement('option', { value: '' }, 'Select collection'), ...menus.map(menu => React.createElement('option', { key: menu, value: menu }, menu)))}<Pressable onPress={() => removeSlide(slide.id)} style={s.remove}><Ionicons name="trash-outline" size={16} color="#3F72E5"/><Text style={s.removeText}>Remove slide</Text></Pressable></View>
      </View>)}</View>
      <View style={s.actions}><Pressable onPress={addSlide} style={s.addButton}><Ionicons name="add" size={21} color="#3F72E5"/><Text style={s.addOutlineText}>Add slide</Text></Pressable><Pressable onPress={saveChanges} disabled={!apiReady || saveState === 'saving'} style={[s.saveButton, (!apiReady || saveState === 'saving') && s.saveButtonDisabled]}><Ionicons name="save-outline" size={19} color="#FFFFFF"/><Text style={s.addText}>{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save changes'}</Text></Pressable></View>
      {saveState === 'error' ? <Text style={s.error}>Could not save. Ensure the Carousel API server is running.</Text> : null}
      <Text style={s.note}>Changes are saved locally in this browser. Connecting collections to the live app can be added when the backend is ready.</Text>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:'#F5F5F5'},header:{minHeight:124,paddingHorizontal:40,paddingVertical:24,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#FFFFFF',borderBottomWidth:1,borderColor:'#F5F5F5'},eyebrow:{color:'#3F72E5',fontFamily: 'Inter_400Regular', fontSize:12,fontWeight:'800',letterSpacing:1.2},title:{marginTop:4,color:'#1A1C1D',fontFamily: 'Inter_400Regular', fontSize:28,fontWeight:'800'},subtitle:{marginTop:4,color:'#2C2D2E',fontFamily: 'Inter_400Regular', fontSize:14},status:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:8,borderRadius:20,backgroundColor:'#F5F5F5'},statusDot:{width:8,height:8,borderRadius:4,backgroundColor:'#3F72E5'},statusText:{color:'#2C2D2E',fontFamily: 'Inter_400Regular', fontSize:12,fontWeight:'700'},body:{width:'100%',maxWidth:1060,alignSelf:'center',padding:32,paddingBottom:80},menuRow:{gap:10,paddingBottom:28},menuButton:{paddingHorizontal:17,paddingVertical:10,borderRadius:8,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#F5F5F5'},menuButtonActive:{backgroundColor:'#3F72E5',borderColor:'#3F72E5'},menuText:{color:'#2C2D2E',fontFamily: 'Inter_400Regular', fontSize:14,fontWeight:'700'},menuTextActive:{color:'#FFFFFF'},panelHeader:{marginBottom:18,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},panelTitle:{color:'#1A1C1D',fontFamily: 'Inter_400Regular', fontSize:22,fontWeight:'800'},panelCopy:{marginTop:5,maxWidth:650,color:'#2C2D2E',fontFamily: 'Inter_400Regular', fontSize:14,lineHeight:20},count:{color:'#3F72E5',fontFamily: 'Inter_400Regular', fontSize:13,fontWeight:'800'},slideList:{gap:14},slideCard:{minHeight:190,padding:18,borderRadius:14,flexDirection:'row',alignItems:'center',gap:22,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#F5F5F5'},slideNumber:{position:'absolute',left:18,top:12,color:'#3F72E5',fontFamily: 'Inter_400Regular', fontSize:10,letterSpacing:1,fontWeight:'800'},uploadTile:{width:142,height:142,marginTop:10,overflow:'hidden',borderRadius:10,justifyContent:'center',alignItems:'center',backgroundColor:'#F5F5F5',borderWidth:1,borderStyle:'dashed',borderColor:'#3F72E5'},uploadPreview:{width:'100%',height:'100%'},uploadPrompt:{marginTop:7,color:'#3F72E5',fontFamily: 'Inter_400Regular', fontSize:12,fontWeight:'800'},fileInput:{position:'absolute',inset:0,opacity:0,width:'100%',height:'100%',cursor:'pointer'},details:{flex:1,minWidth:200,paddingTop:8},label:{marginBottom:6,color:'#1A1C1D',fontFamily: 'Inter_400Regular', fontSize:12,fontWeight:'800'},input:{height:43,marginBottom:13,paddingHorizontal:12,borderWidth:1,borderColor:'#F5F5F5',borderRadius:7,color:'#2C2D2E',fontFamily: 'Inter_400Regular', fontSize:14},select:{width:'100%',height:43,marginBottom:13,padding:12,borderWidth:1,borderColor:'#F5F5F5',borderRadius:7,color:'#2C2D2E',backgroundColor:'#FFFFFF',fontFamily: 'Inter_400Regular', fontSize:14},remove:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5},removeText:{color:'#3F72E5',fontFamily: 'Inter_400Regular', fontSize:12,fontWeight:'800'},actions:{flexDirection:'row',alignItems:'center',gap:12,marginTop:20},addButton:{height:46,paddingHorizontal:17,borderRadius:8,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#3F72E5'},saveButton:{height:46,paddingHorizontal:17,borderRadius:8,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#3F72E5'},saveButtonDisabled:{opacity:0.55},addText:{color:'#FFFFFF',fontFamily: 'Inter_400Regular', fontSize:14,fontWeight:'800'},addOutlineText:{color:'#3F72E5',fontFamily: 'Inter_400Regular', fontSize:14,fontWeight:'800'},note:{marginTop:16,color:'#2C2D2E',fontFamily: 'Inter_400Regular', fontSize:12,lineHeight:17},error:{marginTop:10,color:'#B42318',fontFamily: 'Inter_400Regular', fontSize:12,fontWeight:'700'},
});
