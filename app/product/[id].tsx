import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../../constants/theme';
import { getProductById } from '../../services/productService';
import { calculateAllTenures } from '../../services/emiService';
import { useCart } from '../../hooks/useCart';

const W = Dimensions.get('window').width;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addItem, totalItems } = useCart();
  const [activePhoto, setActivePhoto] = useState(0);
  const [selectedTenure, setSelectedTenure] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const product = useMemo(() => getProductById(id ?? ''), [id]);
  const plans = useMemo(() => {
    if (!product?.emiAvailable || !product.tenureOptions.length) return [];
    return calculateAllTenures(product.price, product.downPayment, product.downPaymentType,
      product.firstPaymentRule, product.serviceCharge, product.deliveryCharge, product.tenureOptions);
  }, [product]);

  const activePlan = useMemo(() =>
    plans.find(p => p.tenure === selectedTenure) ?? plans[0] ?? null, [selectedTenure, plans]);

  if (!product) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <MaterialIcons name="error-outline" size={56} color={Colors.border} />
      <Text style={{ color: Colors.textSecondary, marginTop: 12, fontSize: Fonts.lg }}>Product not found</Text>
      <Pressable style={{ marginTop: 16, padding: 12 }} onPress={() => router.back()}>
        <Text style={{ color: Colors.primary, fontWeight: Fonts.semiBold }}>Go Back</Text>
      </Pressable>
    </View>
  );

  const disc = Math.round((1 - product.price / product.originalPrice) * 100);
  const photos = [...product.photos].sort((a, b) => a.order - b.order);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{product.name}</Text>
        <Pressable style={s.iconBtn} onPress={() => router.push('/(tabs)/cart' as any)}>
          <MaterialIcons name="shopping-cart" size={22} color={Colors.textPrimary} />
          {totalItems > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{totalItems}</Text></View>}
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        {/* Photo Gallery */}
        <View style={s.gallery}>
          <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / W))}>
            {photos.map(ph => (
              <View key={ph.id} style={{ width: W, height: 300 }}>
                <Image source={{ uri: ph.url }} style={{ flex: 1 }} contentFit="cover" transition={200} />
              </View>
            ))}
          </ScrollView>
          {disc > 0 && <View style={s.discBadge}><Text style={s.discTxt}>{disc}% OFF</Text></View>}
          <View style={s.dots}>{photos.map((_, i) => <View key={i} style={[s.dot, i === activePhoto && s.dotOn]} />)}</View>
        </View>

        {/* Thumbnails */}
        <View style={s.thumbRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm }}>
            {photos.map((ph, i) => (
              <Pressable key={ph.id} style={[s.thumb, i === activePhoto && s.thumbOn]}
                onPress={() => { setActivePhoto(i); scrollRef.current?.scrollTo({ x: W * i, animated: true }); }}>
                <Image source={{ uri: ph.url }} style={{ flex: 1 }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Product Info */}
        <View style={s.card}>
          <Text style={s.brandCat}>{product.brand} · {product.category}</Text>
          <Text style={s.pName}>{product.name}</Text>
          <Text style={s.sku}>SKU: {product.sku}</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>₹{product.price.toLocaleString('en-IN')}</Text>
            {disc > 0 && <Text style={s.origPrice}>₹{product.originalPrice.toLocaleString('en-IN')}</Text>}
            {product.emiAvailable && (
              <View style={s.emiBadge}>
                <MaterialIcons name="check-circle" size={12} color={Colors.success} />
                <Text style={s.emiTxt}>EMI Available</Text>
              </View>
            )}
          </View>
          <View style={s.ratingRow}>
            <View style={s.ratingBox}>
              <MaterialIcons name="star" size={12} color="#fff" />
              <Text style={s.ratingN}>{product.rating}</Text>
            </View>
            <Text style={s.reviews}>{product.reviews.toLocaleString('en-IN')} reviews</Text>
            <Text style={[s.stockTxt, { color: product.stock > 10 ? Colors.success : Colors.warning }]}>
              {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `Only ${product.stock} left!` : 'Out of Stock'}
            </Text>
          </View>
        </View>

        {/* EMI Plan Selector */}
        {product.emiAvailable && plans.length > 0 && (
          <View style={s.card}>
            <Text style={s.secTitle}>Choose EMI Plan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.md, paddingBottom: Spacing.sm }}>
              {plans.map(plan => {
                const sel = plan.tenure === (selectedTenure ?? plans[0]?.tenure);
                return (
                  <Pressable key={plan.tenure} style={[s.planCard, sel && s.planSel]}
                    onPress={() => setSelectedTenure(plan.tenure)}>
                    <Text style={[s.planNum, sel && { color: Colors.primary }]}>{plan.tenure}</Text>
                    <Text style={[s.planMo, sel && { color: Colors.primary }]}>Months</Text>
                    <View style={[s.planDiv, sel && { backgroundColor: Colors.primary + '30' }]} />
                    <Text style={[s.planEMI, sel && { color: Colors.primary }]}>
                      ₹{plan.regularEMIAmount.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[s.planPer, sel && { color: Colors.primary }]}>/month</Text>
                    {plan.isRounded && <Text style={[s.planLast, sel && { color: Colors.primaryDark }]}>Last ₹{plan.finalEMIAmount.toLocaleString('en-IN')}</Text>}
                    <View style={[s.selDot, sel && s.selDotOn]}>
                      {sel && <MaterialIcons name="check" size={11} color="#fff" />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {activePlan && (
              <View style={s.dueDateRow}>
                <MaterialIcons name="calendar-today" size={13} color={Colors.textTertiary} />
                <Text style={s.dueDateTxt}>
                  First EMI due {activePlan.firstDueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            )}

            {/* Payment Summary */}
            {activePlan && (
              <View style={s.sumBox}>
                <Text style={s.sumTitle}>Payment Summary</Text>
                {[
                  { label: 'Down Payment (Today to Pay)', val: `₹${activePlan.downPaymentAmount.toLocaleString('en-IN')}`, hi: false, bold: false },
                  ...(product.serviceCharge > 0 ? [{ label: 'Service Charge', val: `₹${product.serviceCharge.toLocaleString('en-IN')}`, hi: false, bold: false }] : []),
                  ...(product.deliveryCharge > 0 ? [{ label: 'Delivery Charge', val: `₹${product.deliveryCharge.toLocaleString('en-IN')}`, hi: false, bold: false }] : []),
                  { label: '─', val: '', hi: false, bold: false },
                  { label: 'Balance for EMI', val: `₹${activePlan.balanceForEMI.toLocaleString('en-IN')}`, hi: true, bold: false },
                  { label: 'Total Payable (All Inclusive)', val: `₹${activePlan.totalPayable.toLocaleString('en-IN')}`, hi: false, bold: true },
                ].map((r, i) => r.label === '─'
                  ? <View key={i} style={{ height: 1, backgroundColor: Colors.borderLight, marginVertical: 4 }} />
                  : (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text style={{ fontSize: Fonts.sm, color: r.bold ? Colors.textPrimary : Colors.textSecondary, fontWeight: r.bold ? Fonts.semiBold : Fonts.regular, flex: 1 }}>{r.label}</Text>
                      <Text style={{ fontSize: r.hi ? Fonts.md : r.bold ? Fonts.lg : Fonts.sm, fontWeight: r.bold ? Fonts.bold : Fonts.semiBold, color: r.hi ? Colors.primary : Colors.textPrimary }}>{r.val}</Text>
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* Description */}
        <View style={s.card}>
          <Text style={s.secTitle}>Description</Text>
          <Text style={{ fontSize: Fonts.md, color: Colors.textSecondary, lineHeight: 22 }}>{product.description}</Text>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        {product.emiAvailable && activePlan ? (
          <>
            <Pressable style={s.cartBtn} onPress={() => addItem(product, 1)}>
              <MaterialIcons name="shopping-cart" size={18} color={Colors.primary} />
              <Text style={s.cartBtnTxt}>Add to Cart</Text>
            </Pressable>
            <Pressable style={s.emiBtn} onPress={() => { addItem(product, 1, activePlan.tenure); router.push('/checkout'); }}>
              <MaterialIcons name="account-balance" size={18} color="#fff" />
              <View>
                <Text style={s.emiBtnTxt}>Buy on EMI</Text>
                <Text style={s.emiBtnSub}>₹{activePlan.downPaymentAmount.toLocaleString('en-IN')} today</Text>
              </View>
            </Pressable>
          </>
        ) : (
          <Pressable style={[s.emiBtn, { flex: 1 }]} onPress={() => { addItem(product, 1); router.push('/(tabs)/cart' as any); }}>
            <MaterialIcons name="shopping-cart" size={18} color="#fff" />
            <Text style={s.emiBtnTxt}>Add to Cart</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  badge: { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: Fonts.bold },
  gallery: { height: 300, backgroundColor: Colors.surfaceAlt, position: 'relative' },
  discBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: Colors.error, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, zIndex: 10 },
  discTxt: { color: '#fff', fontSize: Fonts.xs, fontWeight: Fonts.bold },
  dots: { position: 'absolute', bottom: 10, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotOn: { backgroundColor: '#fff', width: 18 },
  thumbRow: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  thumb: { width: 62, height: 62, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 2, borderColor: Colors.borderLight },
  thumbOn: { borderColor: Colors.primary },
  card: { backgroundColor: Colors.surface, padding: Spacing.xl, marginBottom: 6 },
  brandCat: { fontSize: Fonts.xs, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: Fonts.medium },
  pName: { fontSize: 22, fontWeight: Fonts.bold, color: Colors.textPrimary, lineHeight: 28, marginTop: 4 },
  sku: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 3 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, flexWrap: 'wrap' },
  price: { fontSize: 28, fontWeight: Fonts.bold, color: Colors.textPrimary },
  origPrice: { fontSize: Fonts.lg, color: Colors.textTertiary, textDecorationLine: 'line-through' },
  emiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  emiTxt: { fontSize: Fonts.xs, color: Colors.success, fontWeight: Fonts.semiBold },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.success, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  ratingN: { color: '#fff', fontSize: Fonts.sm, fontWeight: Fonts.bold },
  reviews: { fontSize: Fonts.sm, color: Colors.textSecondary },
  stockTxt: { fontSize: Fonts.sm, fontWeight: Fonts.medium, marginLeft: 'auto' },
  secTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  planCard: { width: 135, backgroundColor: Colors.surfaceAlt, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: Colors.borderLight },
  planSel: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  planNum: { fontSize: 30, fontWeight: Fonts.extraBold, color: Colors.textPrimary },
  planMo: { fontSize: Fonts.xs, color: Colors.textTertiary, marginBottom: 8 },
  planDiv: { width: '100%', height: 1, backgroundColor: Colors.borderLight, marginBottom: 8 },
  planEMI: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  planPer: { fontSize: Fonts.xs, color: Colors.textTertiary },
  planLast: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 3 },
  selDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  selDotOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: Colors.surfaceAlt, padding: 10, borderRadius: 8 },
  dueDateTxt: { fontSize: Fonts.xs, color: Colors.textTertiary, flex: 1 },
  sumBox: { marginTop: 14, backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 14 },
  sumTitle: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary, marginBottom: 8 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, flexDirection: 'row', gap: 10, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLight, ...Shadow.lg as object },
  cartBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2, borderColor: Colors.primary, borderRadius: 14, padding: 14 },
  cartBtnTxt: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.primary },
  emiBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, padding: 14 },
  emiBtnTxt: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: '#fff' },
  emiBtnSub: { fontSize: Fonts.xs, color: 'rgba(255,255,255,0.8)' },
});
