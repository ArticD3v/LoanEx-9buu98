import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Modal, Alert, Platform, Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../../constants/theme';
import { CATEGORIES } from '../../constants/config';
import { addProduct, getProductById, updateProduct } from '../../services/productService';
import { calculateEMI } from '../../services/emiService';
import { DealerSource, ProductPhoto } from '../../types';

const EMPTY_DEALER = { id: '', dealerCode: '', dealerName: '', dealerAddress: '', dealerMobile: '', purchasePrice: 0 };

export default function AddProductScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const existing = editId ? getProductById(editId) : null;

  // Basic Info
  const [name, setName] = useState(existing?.name ?? '');
  const [sku, setSku] = useState(existing?.sku ?? '');
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '1');
  const [price, setPrice] = useState(existing?.price?.toString() ?? '');
  const [originalPrice, setOriginalPrice] = useState(existing?.originalPrice?.toString() ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [status, setStatus] = useState<'active' | 'inactive'>(existing?.status ?? 'active');

  // Photos
  const [photos, setPhotos] = useState<string[]>(existing?.photos.map(p => p.url) ?? ['', '', '', '', '']);

  // Dealers
  const [dealers, setDealers] = useState<DealerSource[]>(existing?.dealers ?? []);
  const [dealerModal, setDealerModal] = useState(false);
  const [editDealer, setEditDealer] = useState<DealerSource>({ ...EMPTY_DEALER });

  // EMI Config
  const [emiAvailable, setEmiAvailable] = useState(existing?.emiAvailable ?? true);
  const [planMode, setPlanMode] = useState<'single' | 'multiple'>(existing?.emiPlanMode ?? 'multiple');
  const [tenureInput, setTenureInput] = useState(existing?.tenureOptions?.join(', ') ?? '7, 10, 12');
  const [downPayment, setDownPayment] = useState(existing?.downPayment?.toString() ?? '30');
  const [dpType, setDpType] = useState<'amount' | 'percentage'>(existing?.downPaymentType ?? 'percentage');
  const [firstPayRule, setFirstPayRule] = useState<'down_payment' | 'emi_1'>(existing?.firstPaymentRule ?? 'down_payment');
  const [serviceCharge, setServiceCharge] = useState(existing?.serviceCharge?.toString() ?? '0');
  const [deliveryCharge, setDeliveryCharge] = useState(existing?.deliveryCharge?.toString() ?? '0');

  const pickPhoto = useCallback(async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8, allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const newPhotos = [...photos];
      newPhotos[index] = result.assets[0].uri;
      setPhotos(newPhotos);
    }
  }, [photos]);

  const parseTenures = (): number[] => {
    try {
      return tenureInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    } catch { return []; }
  };

  const getEMIPreview = () => {
    const tenures = parseTenures();
    if (!tenures.length || !price) return null;
    const t = planMode === 'single' ? [tenures[0]] : tenures;
    return t.map(tenure => {
      const r = calculateEMI({
        sellingPrice: parseFloat(price), downPayment: parseFloat(downPayment || '0'),
        downPaymentType: dpType, firstPaymentRule: firstPayRule,
        serviceCharge: parseFloat(serviceCharge || '0'),
        deliveryCharge: parseFloat(deliveryCharge || '0'), tenure,
      });
      return { tenure, monthly: r.regularEMIAmount, final: r.finalEMIAmount, total: r.totalPayable, dp: r.downPaymentAmount };
    });
  };

  const saveDealer = () => {
    if (!editDealer.dealerCode || !editDealer.dealerName || !editDealer.purchasePrice) {
      Alert.alert('Error', 'Dealer code, name and purchase price are required.');
      return;
    }
    if (editDealer.id) {
      setDealers(prev => prev.map(d => d.id === editDealer.id ? editDealer : d));
    } else {
      setDealers(prev => [...prev, { ...editDealer, id: `d-${Date.now()}` }]);
    }
    setDealerModal(false);
    setEditDealer({ ...EMPTY_DEALER });
  };

  const handleSave = () => {
    if (!name.trim() || !sku.trim() || !price || !brand.trim()) {
      Alert.alert('Validation Error', 'Name, SKU, Brand and Selling Price are required.');
      return;
    }
    const validPhotos = photos.filter(p => p.trim().length > 0);
    if (validPhotos.length < 1) {
      Alert.alert('Photos Required', 'Please add at least 1 product photo.');
      return;
    }
    const tenures = emiAvailable ? parseTenures() : [];
    const cat = CATEGORIES.find(c => c.id === categoryId);
    const photoObjs: ProductPhoto[] = validPhotos.map((url, i) => ({ id: `ph-${i + 1}`, url, order: i + 1, isCover: i === 0 }));

    const productData = {
      name: name.trim(), sku: sku.trim(), brand: brand.trim(),
      categoryId, category: cat?.name ?? 'Electronics',
      price: parseFloat(price), originalPrice: parseFloat(originalPrice || price),
      description: description.trim(), stock: 100, rating: 4.5, reviews: 0,
      status, emiAvailable, emiPlanMode: planMode, tenureOptions: tenures,
      downPayment: parseFloat(downPayment || '0'), downPaymentType: dpType,
      firstPaymentRule: firstPayRule,
      serviceCharge: parseFloat(serviceCharge || '0'),
      deliveryCharge: parseFloat(deliveryCharge || '0'),
      dealers, image: photoObjs[0]?.url ?? '', photos: photoObjs,
    };

    if (editId) {
      updateProduct(editId, productData);
      Alert.alert('Success', 'Product updated successfully!', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      addProduct(productData);
      Alert.alert('Success', 'Product added and published!', [{ text: 'OK', onPress: () => router.back() }]);
    }
  };

  const emiPreview = getEMIPreview();
  const selCat = CATEGORIES.find(c => c.id === categoryId);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textInverse} />
        </Pressable>
        <Text style={s.headerTitle}>{editId ? 'Edit Product' : 'Add Product'}</Text>
        <Pressable style={s.saveHdrBtn} onPress={handleSave}>
          <Text style={s.saveHdrTxt}>Save</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 40 }}>

        {/* SECTION: Basic Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>① Basic Information</Text>
          <Field label="Product Name *" value={name} onChangeText={setName} placeholder="e.g. Samsung LED TV 43 inch" />
          <Field label="Product SKU / Model *" value={sku} onChangeText={setSku} placeholder="e.g. LED-43-001" />
          <Field label="Brand *" value={brand} onChangeText={setBrand} placeholder="e.g. Samsung" />

          <Text style={s.fieldLabel}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {CATEGORIES.map(c => (
              <Pressable key={c.id} style={[s.catChip, categoryId === c.id && s.catChipOn]} onPress={() => setCategoryId(c.id)}>
                <Text style={[s.catChipTxt, categoryId === c.id && s.catChipTxtOn]}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Selling Price (₹) *" value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="MRP / Original Price" value={originalPrice} onChangeText={setOriginalPrice} placeholder="0" keyboardType="numeric" />
            </View>
          </View>
          <Field label="Description" value={description} onChangeText={setDescription} placeholder="Short product details..." multiline />

          <View style={s.toggleRow}>
            <View>
              <Text style={s.fieldLabel}>Status</Text>
              <Text style={{ fontSize: Fonts.xs, color: Colors.textTertiary }}>{status === 'active' ? 'Visible to customers' : 'Hidden from store'}</Text>
            </View>
            <Switch value={status === 'active'} onValueChange={v => setStatus(v ? 'active' : 'inactive')}
              trackColor={{ true: Colors.success }} thumbColor="#fff" />
          </View>
        </View>

        {/* SECTION: Photos */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>② Product Photos (4–5 required)</Text>
          <Text style={s.sectionSub}>First photo is the cover image shown in listings.</Text>
          <View style={s.photosGrid}>
            {photos.map((uri, i) => (
              <Pressable key={i} style={s.photoSlot} onPress={() => pickPhoto(i)}>
                {uri ? (
                  <>
                    <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    {i === 0 && <View style={s.coverTag}><Text style={s.coverTxt}>COVER</Text></View>}
                    <View style={s.editOverlay}><MaterialIcons name="edit" size={16} color="#fff" /></View>
                  </>
                ) : (
                  <View style={s.emptyPhoto}>
                    <MaterialIcons name="add-photo-alternate" size={22} color={Colors.textTertiary} />
                    <Text style={s.emptyPhotoTxt}>{i === 0 ? 'Cover' : `Photo ${i + 1}`}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* SECTION: Dealers */}
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <View>
              <Text style={s.sectionTitle}>③ Dealer Sources</Text>
              <Text style={s.sectionSub}>Selling price is common — purchase price varies per dealer.</Text>
            </View>
            <Pressable style={s.addBtn} onPress={() => { setEditDealer({ ...EMPTY_DEALER }); setDealerModal(true); }}>
              <MaterialIcons name="add" size={16} color="#fff" />
              <Text style={s.addBtnTxt}>Add</Text>
            </Pressable>
          </View>
          {dealers.length === 0 && (
            <View style={s.emptyBox}>
              <MaterialIcons name="store" size={28} color={Colors.border} />
              <Text style={s.emptyTxt}>No dealers added yet. At least one required.</Text>
            </View>
          )}
          {dealers.map(d => {
            const margin = price ? parseFloat(price) - d.purchasePrice : 0;
            return (
              <View key={d.id} style={s.dealerCard}>
                <View style={s.dealerCodeBadge}><Text style={s.dealerCodeTxt}>{d.dealerCode}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dealerName}>{d.dealerName}</Text>
                  <Text style={s.dealerAddr}>{d.dealerAddress}</Text>
                  <Text style={s.dealerMobile}>📞 {d.dealerMobile}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.dealerPrice}>₹{d.purchasePrice.toLocaleString('en-IN')}</Text>
                  {margin > 0 && <Text style={s.dealerMargin}>Margin: ₹{margin.toLocaleString('en-IN')}</Text>}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable onPress={() => { setEditDealer(d); setDealerModal(true); }} style={s.iconBtnSm}>
                      <MaterialIcons name="edit" size={14} color={Colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => setDealers(prev => prev.filter(x => x.id !== d.id))} style={s.iconBtnSm}>
                      <MaterialIcons name="delete" size={14} color={Colors.error} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* SECTION: EMI Setup */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>④ EMI Configuration</Text>
          <View style={s.toggleRow}>
            <Text style={s.fieldLabel}>EMI Available</Text>
            <Switch value={emiAvailable} onValueChange={setEmiAvailable} trackColor={{ true: Colors.primary }} thumbColor="#fff" />
          </View>

          {emiAvailable && (
            <>
              <Text style={s.fieldLabel}>Plan Mode</Text>
              <View style={s.segmented}>
                {(['single', 'multiple'] as const).map(m => (
                  <Pressable key={m} style={[s.segItem, planMode === m && s.segItemOn]} onPress={() => setPlanMode(m)}>
                    <Text style={[s.segTxt, planMode === m && s.segTxtOn]}>{m === 'single' ? 'Single Tenure' : 'Multiple Tenures'}</Text>
                  </Pressable>
                ))}
              </View>

              <Field label={planMode === 'single' ? 'Tenure (months) *' : 'Tenures (comma-separated) *'}
                value={tenureInput} onChangeText={setTenureInput}
                placeholder={planMode === 'single' ? 'e.g. 12' : 'e.g. 7, 10, 12'} keyboardType="numeric" />

              <Text style={s.fieldLabel}>Down Payment</Text>
              <View style={s.row}>
                <View style={{ flex: 2 }}>
                  <TextInput style={s.input} value={downPayment} onChangeText={setDownPayment} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textTertiary} />
                </View>
                <View style={s.segmented}>
                  {(['amount', 'percentage'] as const).map(t => (
                    <Pressable key={t} style={[s.segItem, dpType === t && s.segItemOn]} onPress={() => setDpType(t)}>
                      <Text style={[s.segTxt, dpType === t && s.segTxtOn]}>{t === 'amount' ? '₹ Amount' : '% of Price'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Text style={s.fieldLabel}>First Payment Rule</Text>
              <View style={s.segmented}>
                {([['down_payment', 'Separate Down Payment'], ['emi_1', 'Down = EMI #1']] as const).map(([v, l]) => (
                  <Pressable key={v} style={[s.segItem, firstPayRule === v && s.segItemOn]} onPress={() => setFirstPayRule(v)}>
                    <Text style={[s.segTxt, firstPayRule === v && s.segTxtOn]}>{l}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Field label="Service Charge (₹)" value={serviceCharge} onChangeText={setServiceCharge} placeholder="0" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Delivery Charge (₹)" value={deliveryCharge} onChangeText={setDeliveryCharge} placeholder="0" keyboardType="numeric" />
                </View>
              </View>

              {/* EMI Preview */}
              {emiPreview && emiPreview.length > 0 && (
                <View style={s.previewBox}>
                  <Text style={s.previewTitle}>EMI Preview</Text>
                  {emiPreview.map(p => (
                    <View key={p.tenure} style={s.previewRow}>
                      <Text style={s.previewTenure}>{p.tenure} months</Text>
                      <Text style={s.previewEMI}>₹{p.monthly.toLocaleString('en-IN')}/mo</Text>
                      <Text style={s.previewDP}>DP: ₹{p.dp.toLocaleString('en-IN')}</Text>
                      <Text style={s.previewTotal}>Total: ₹{p.total.toLocaleString('en-IN')}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <Pressable style={s.saveBtn} onPress={handleSave}>
          <MaterialIcons name="check-circle" size={20} color="#fff" />
          <Text style={s.saveBtnTxt}>{editId ? 'Update Product' : 'Save & Publish Product'}</Text>
        </Pressable>
      </ScrollView>

      {/* Dealer Modal */}
      <Modal visible={dealerModal} animationType="slide" transparent onRequestClose={() => setDealerModal(false)}>
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDealerModal(false)} />
          <View style={[s.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={s.modalHdr}>
              <Text style={s.modalTitle}>{editDealer.id ? 'Edit Dealer' : 'Add Dealer'}</Text>
              <Pressable onPress={() => setDealerModal(false)}><MaterialIcons name="close" size={22} color={Colors.textPrimary} /></Pressable>
            </View>
            <ScrollView>
              <Field label="Dealer Name *" value={editDealer.dealerName} onChangeText={v => setEditDealer(d => ({ ...d, dealerName: v }))} placeholder="e.g. Shree Electronics" />
              <Field label="Dealer Code *" value={editDealer.dealerCode} onChangeText={v => setEditDealer(d => ({ ...d, dealerCode: v }))} placeholder="e.g. DL-001" />
              <Field label="Mobile Number" value={editDealer.dealerMobile} onChangeText={v => setEditDealer(d => ({ ...d, dealerMobile: v }))} placeholder="10-digit mobile" keyboardType="phone-pad" />
              <Field label="Address" value={editDealer.dealerAddress} onChangeText={v => setEditDealer(d => ({ ...d, dealerAddress: v }))} placeholder="Full address" multiline />
              <Field label="Purchase Price (₹) *" value={editDealer.purchasePrice ? editDealer.purchasePrice.toString() : ''} onChangeText={v => setEditDealer(d => ({ ...d, purchasePrice: parseFloat(v) || 0 }))} placeholder="0" keyboardType="numeric" />
              {price && editDealer.purchasePrice > 0 && (
                <View style={s.marginBox}>
                  <Text style={s.marginLabel}>Gross Margin</Text>
                  <Text style={s.marginVal}>₹{(parseFloat(price) - editDealer.purchasePrice).toLocaleString('en-IN')}</Text>
                </View>
              )}
              <Pressable style={s.saveBtn} onPress={saveDealer}>
                <Text style={s.saveBtnTxt}>Save Dealer</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary} keyboardType={keyboardType}
        multiline={multiline} numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.adminBg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textInverse },
  saveHdrBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: Radius.full },
  saveHdrTxt: { color: '#fff', fontWeight: Fonts.bold, fontSize: Fonts.sm },
  section: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.md, ...Shadow.sm as object },
  sectionHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: 4 },
  sectionSub: { fontSize: Fonts.xs, color: Colors.textTertiary, marginBottom: Spacing.md },
  fieldLabel: { fontSize: Fonts.sm, fontWeight: Fonts.medium, color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.md, color: Colors.textPrimary },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  catChip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border },
  catChipOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  catChipTxt: { fontSize: Fonts.sm, color: Colors.textSecondary },
  catChipTxtOn: { color: Colors.primary, fontWeight: Fonts.semiBold },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlot: { width: '18%', aspectRatio: 1, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
  coverTag: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(232,93,4,0.85)', alignItems: 'center', paddingVertical: 2 },
  coverTxt: { color: '#fff', fontSize: 8, fontWeight: Fonts.bold },
  editOverlay: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 },
  emptyPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  emptyPhotoTxt: { fontSize: 9, color: Colors.textTertiary, textAlign: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full },
  addBtnTxt: { color: '#fff', fontSize: Fonts.sm, fontWeight: Fonts.semiBold },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 8 },
  emptyTxt: { fontSize: Fonts.sm, color: Colors.textTertiary, textAlign: 'center' },
  dealerCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 8 },
  dealerCodeBadge: { backgroundColor: Colors.adminBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dealerCodeTxt: { color: Colors.primary, fontSize: Fonts.xs, fontWeight: Fonts.bold },
  dealerName: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  dealerAddr: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 2 },
  dealerMobile: { fontSize: Fonts.xs, color: Colors.textSecondary, marginTop: 2 },
  dealerPrice: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.primary },
  dealerMargin: { fontSize: Fonts.xs, color: Colors.success, fontWeight: Fonts.medium },
  iconBtnSm: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden', flex: 1 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, backgroundColor: Colors.surfaceAlt },
  segItemOn: { backgroundColor: Colors.primary },
  segTxt: { fontSize: Fonts.xs, fontWeight: Fonts.medium, color: Colors.textSecondary },
  segTxtOn: { color: '#fff', fontWeight: Fonts.semiBold },
  previewBox: { marginTop: 12, backgroundColor: Colors.adminBg, borderRadius: Radius.lg, padding: 12 },
  previewTitle: { fontSize: Fonts.sm, fontWeight: Fonts.bold, color: Colors.textInverse, marginBottom: 8 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1, borderTopColor: Colors.adminBorder },
  previewTenure: { fontSize: Fonts.xs, fontWeight: Fonts.bold, color: Colors.primary, width: 70 },
  previewEMI: { fontSize: Fonts.xs, color: Colors.textInverse, fontWeight: Fonts.semiBold },
  previewDP: { fontSize: Fonts.xs, color: Colors.textInverse },
  previewTotal: { fontSize: Fonts.xs, color: Colors.textInverse },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, padding: Spacing.lg, borderRadius: Radius.xl, marginTop: Spacing.md },
  saveBtnTxt: { color: '#fff', fontSize: Fonts.lg, fontWeight: Fonts.bold },
  marginBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.successLight, padding: 12, borderRadius: Radius.md, marginBottom: 8 },
  marginLabel: { fontSize: Fonts.md, color: Colors.success, fontWeight: Fonts.semiBold },
  marginVal: { fontSize: Fonts.lg, color: Colors.success, fontWeight: Fonts.bold },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.xl, maxHeight: '85%' },
  modalHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
});
