import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useOrders } from '../hooks/useOrders';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';
import { calculateEMI, generateSchedule } from '../services/emiService';
import { EMICalcResult } from '../types';

const showAlert = (title: string, msg: string, onOk?: () => void) => {
  if (Platform.OS === 'web') { window.alert(`${title}\n${msg}`); onOk?.(); }
  else Alert.alert(title, msg, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
};

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const { addOrder } = useOrders();

  const [address, setAddress] = useState(user?.address ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [loading, setLoading] = useState(false);

  // Find EMI item (if any) — take first one with selectedTenure
  const emiItem = cartItems.find(ci => ci.selectedTenure && ci.product.emiAvailable);
  const emiCalc = useMemo<EMICalcResult | null>(() => {
    if (!emiItem) return null;
    const p = emiItem.product;
    return calculateEMI({
      sellingPrice: p.price, downPayment: p.downPayment, downPaymentType: p.downPaymentType,
      firstPaymentRule: p.firstPaymentRule, serviceCharge: p.serviceCharge,
      deliveryCharge: p.deliveryCharge, tenure: emiItem.selectedTenure!,
    });
  }, [emiItem]);

  const subtotal = cartItems.reduce((s, ci) => s + ci.product.price * ci.quantity, 0);
  const isEMIOrder = !!emiCalc;

  const handlePlaceOrder = async () => {
    if (!address.trim()) { showAlert('Address Required', 'Please enter your delivery address.'); return; }
    if (cartItems.length === 0) { showAlert('Empty Cart', 'No items in cart.'); return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const items = cartItems.map(ci => ({
      productId: ci.product.id, productName: ci.product.name,
      image: ci.product.image, quantity: ci.quantity, price: ci.product.price,
    }));

    const schedule = emiCalc ? generateSchedule(emiCalc) : [];

    // Pick first dealer as snapshot (in production, admin selects)
    const firstDealer = emiItem?.product.dealers[0];
    const dealerSnapshot = firstDealer ? {
      dealerCode: firstDealer.dealerCode, dealerName: firstDealer.dealerName,
      dealerAddress: firstDealer.dealerAddress, dealerMobile: firstDealer.dealerMobile,
      purchasePrice: firstDealer.purchasePrice,
      grossMargin: emiItem!.product.price - firstDealer.purchasePrice,
    } : undefined;

    const emiDetails = emiCalc ? {
      tenure: emiCalc.tenure, firstPaymentRule: emiItem!.product.firstPaymentRule,
      downPaymentAmount: emiCalc.downPaymentAmount, serviceCharge: emiItem!.product.serviceCharge,
      deliveryCharge: emiItem!.product.deliveryCharge, totalPayable: emiCalc.totalPayable,
      balanceForEMI: emiCalc.balanceForEMI, regularEMIAmount: emiCalc.regularEMIAmount,
      finalEMIAmount: emiCalc.finalEMIAmount, months: emiCalc.tenure,
      monthlyAmount: emiCalc.regularEMIAmount, totalAmount: emiCalc.totalPayable,
      interestRate: 0, emiStatus: 'pending_approval' as const,
      paidInstallments: 0, futureEMICount: emiCalc.futureEMICount,
      nextDueDate: emiCalc.firstDueDate.toISOString().split('T')[0],
      schedule,
    } : undefined;

    addOrder({
      userId: user?.id ?? 'guest', items,
      subtotal, total: isEMIOrder ? emiCalc!.totalPayable : subtotal,
      status: 'pending', paymentMethod: isEMIOrder ? 'emi' : 'cod',
      emiDetails, dealerSnapshot,
      address: address.trim(), phone: user?.phone ?? '',
    });

    clearCart();
    setLoading(false);
    showAlert('Order Placed!', isEMIOrder
      ? `Down payment of ₹${emiCalc!.downPaymentAmount.toLocaleString('en-IN')} collected. EMI plan is pending approval.`
      : 'Your order has been placed successfully!',
      () => router.replace('/(tabs)' as any)
    );
  };

  if (cartItems.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, paddingTop: insets.top }}>
        <MaterialIcons name="shopping-cart" size={64} color={Colors.border} />
        <Text style={{ fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary, marginTop: 16 }}>Cart is Empty</Text>
        <Pressable style={{ marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.xl }} onPress={() => router.replace('/(tabs)' as any)}>
          <Text style={{ color: '#fff', fontWeight: Fonts.bold }}>Browse Products</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

        {/* Order Items */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Order Items ({cartItems.length})</Text>
          {cartItems.map(ci => (
            <View key={ci.product.id} style={s.itemRow}>
              <Image source={{ uri: ci.product.image }} style={s.itemImg} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={s.itemName} numberOfLines={2}>{ci.product.name}</Text>
                <Text style={s.itemQty}>Qty: {ci.quantity}</Text>
                {ci.selectedTenure && <Text style={s.itemEMI}>{ci.selectedTenure}-month EMI plan selected</Text>}
              </View>
              <Text style={s.itemPrice}>₹{(ci.product.price * ci.quantity).toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>

        {/* EMI Plan Summary */}
        {isEMIOrder && emiCalc && emiItem && (
          <View style={s.card}>
            <Text style={s.cardTitle}>EMI Plan Summary</Text>
            <View style={s.emiPlanHeader}>
              <MaterialIcons name="account-balance" size={22} color={Colors.primary} />
              <Text style={s.emiPlanTitle}>{emiCalc.tenure}-Month EMI Plan</Text>
            </View>
            {[
              { label: 'Down Payment (Pay Today)', value: `₹${emiCalc.downPaymentAmount.toLocaleString('en-IN')}`, bold: false, accent: false },
              ...(emiItem.product.serviceCharge > 0 ? [{ label: 'Service Charge', value: `₹${emiItem.product.serviceCharge.toLocaleString('en-IN')}`, bold: false, accent: false }] : []),
              ...(emiItem.product.deliveryCharge > 0 ? [{ label: 'Delivery Charge', value: `₹${emiItem.product.deliveryCharge.toLocaleString('en-IN')}`, bold: false, accent: false }] : []),
              { label: 'Balance for EMI', value: `₹${emiCalc.balanceForEMI.toLocaleString('en-IN')}`, bold: false, accent: true },
              { label: `Monthly EMI (${emiCalc.futureEMICount} installments)`, value: `₹${emiCalc.regularEMIAmount.toLocaleString('en-IN')}/mo`, bold: false, accent: false },
              ...(emiCalc.isRounded ? [{ label: 'Last EMI (adjusted)', value: `₹${emiCalc.finalEMIAmount.toLocaleString('en-IN')}`, bold: false, accent: false }] : []),
              { label: 'Total Payable (All Inclusive)', value: `₹${emiCalc.totalPayable.toLocaleString('en-IN')}`, bold: true, accent: false },
            ].map((r, i) => (
              <View key={i} style={s.summRow}>
                <Text style={[s.summKey, r.bold && s.summKeyBold]}>{r.label}</Text>
                <Text style={[s.summVal, r.accent && { color: Colors.primary, fontSize: Fonts.md }, r.bold && { fontSize: Fonts.xl, fontWeight: Fonts.bold }]}>{r.value}</Text>
              </View>
            ))}
            <View style={s.dueDateBox}>
              <MaterialIcons name="calendar-today" size={14} color={Colors.success} />
              <Text style={s.dueDateTxt}>
                First EMI due on {emiCalc.firstDueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <View style={s.noteBox}>
              <MaterialIcons name="info-outline" size={14} color={Colors.textTertiary} />
              <Text style={s.noteTxt}>EMI plan is subject to approval. You will be notified once approved.</Text>
            </View>
          </View>
        )}

        {/* COD Summary */}
        {!isEMIOrder && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Order Total</Text>
            <View style={s.summRow}>
              <Text style={s.summKey}>Subtotal</Text>
              <Text style={s.summVal}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>
            <View style={s.summRow}>
              <Text style={s.summKey}>Delivery</Text>
              <Text style={[s.summVal, { color: Colors.success }]}>FREE</Text>
            </View>
            <View style={[s.summRow, { borderBottomWidth: 0, paddingTop: 8 }]}>
              <Text style={s.summKeyBold}>Total</Text>
              <Text style={[s.summVal, { fontSize: Fonts.xxl, fontWeight: Fonts.bold }]}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>
            <View style={s.payMethodRow}>
              <MaterialIcons name="money" size={16} color={Colors.success} />
              <Text style={s.payMethodTxt}>Cash on Delivery</Text>
            </View>
          </View>
        )}

        {/* Delivery Address */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Delivery Details</Text>
          <Text style={s.inputLabel}>Full Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor={Colors.textTertiary} />
          <Text style={s.inputLabel}>Delivery Address *</Text>
          <TextInput style={[s.input, s.inputMulti]} value={address} onChangeText={setAddress}
            placeholder="House/Flat No., Street, Area, City, Pincode" placeholderTextColor={Colors.textTertiary}
            multiline numberOfLines={3} textAlignVertical="top" />
          <Text style={s.inputLabel}>Mobile</Text>
          <View style={s.mobileRow}>
            <View style={s.mobilePrefix}><Text style={{ color: Colors.textSecondary, fontWeight: Fonts.medium }}>+91</Text></View>
            <Text style={s.mobileVal}>{user?.phone ?? '—'}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.payToday}>
            {isEMIOrder ? `Pay Today: ₹${emiCalc!.downPaymentAmount.toLocaleString('en-IN')}` : `Total: ₹${subtotal.toLocaleString('en-IN')}`}
          </Text>
          <Text style={s.paySubtext}>{isEMIOrder ? `Then ₹${emiCalc!.regularEMIAmount.toLocaleString('en-IN')}/mo for ${emiCalc!.futureEMICount} months` : 'Cash on Delivery'}</Text>
        </View>
        <Pressable style={[s.placeBtn, loading && s.placeBtnDisabled]} onPress={handlePlaceOrder} disabled={loading}>
          <MaterialIcons name={isEMIOrder ? 'account-balance' : 'shopping-bag'} size={18} color="#fff" />
          <Text style={s.placeBtnTxt}>{loading ? 'Placing...' : isEMIOrder ? 'Buy on EMI' : 'Place Order'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  card: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: Radius.xl, padding: Spacing.xl, ...Shadow.sm as object },
  cardTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.lg },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  itemImg: { width: 56, height: 56, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  itemName: { fontSize: Fonts.sm, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  itemQty: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 2 },
  itemEMI: { fontSize: Fonts.xs, color: Colors.primary, fontWeight: Fonts.medium, marginTop: 2 },
  itemPrice: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  emiPlanHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryLight, padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.md },
  emiPlanTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.primary },
  summRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  summKey: { fontSize: Fonts.sm, color: Colors.textSecondary, flex: 1 },
  summKeyBold: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  summVal: { fontSize: Fonts.sm, fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  dueDateBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, backgroundColor: Colors.successLight, padding: Spacing.md, borderRadius: Radius.md },
  dueDateTxt: { fontSize: Fonts.sm, color: Colors.success, fontWeight: Fonts.medium, flex: 1 },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, backgroundColor: Colors.surfaceAlt, padding: Spacing.md, borderRadius: Radius.md },
  noteTxt: { fontSize: Fonts.xs, color: Colors.textTertiary, flex: 1, lineHeight: 17 },
  payMethodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, backgroundColor: Colors.successLight, padding: Spacing.md, borderRadius: Radius.md },
  payMethodTxt: { fontSize: Fonts.md, color: Colors.success, fontWeight: Fonts.medium },
  inputLabel: { fontSize: Fonts.sm, fontWeight: Fonts.medium, color: Colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.md, color: Colors.textPrimary },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  mobileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md },
  mobilePrefix: { paddingRight: 8, borderRightWidth: 1, borderRightColor: Colors.border },
  mobileVal: { fontSize: Fonts.md, color: Colors.textPrimary, fontWeight: Fonts.medium },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLight, ...Shadow.lg as object },
  payToday: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  paySubtext: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 2 },
  placeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderRadius: Radius.xl },
  placeBtnDisabled: { opacity: 0.6 },
  placeBtnTxt: { color: '#fff', fontSize: Fonts.md, fontWeight: Fonts.bold },
});
