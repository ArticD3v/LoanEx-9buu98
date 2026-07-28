import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../../constants/theme';
import { APP_CONFIG } from '../../constants/config';
import { Order, EMIInstallment } from '../../types';

export default function EMIScreen() {
  const { user } = useAuth();
  const { userOrders } = useOrders();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const emiOrders = useMemo(() => {
    const all = userOrders(user?.id ?? '');
    return all.filter(o => o.paymentMethod === 'emi' && o.emiDetails);
  }, [user, userOrders]);

  const totalMonthlyDue = emiOrders
    .filter(o => o.emiDetails?.emiStatus === 'approved')
    .reduce((s, o) => s + (o.emiDetails?.regularEMIAmount ?? 0), 0);

  const nextDue = emiOrders
    .filter(o => o.emiDetails?.emiStatus === 'approved' && o.emiDetails?.nextDueDate)
    .sort((a, b) => new Date(a.emiDetails!.nextDueDate).getTime() - new Date(b.emiDetails!.nextDueDate).getTime())[0];

  if (emiOrders.length === 0) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}><Text style={s.headerTitle}>My EMI Plans</Text></View>
        <View style={s.emptyState}>
          <View style={s.emptyIcon}><MaterialIcons name="account-balance" size={40} color={Colors.primary} /></View>
          <Text style={s.emptyTitle}>No Active EMI Plans</Text>
          <Text style={s.emptySub}>Your EMI orders will appear here once placed.</Text>
          <Pressable style={s.shopBtn} onPress={() => router.replace('/(tabs)' as any)}>
            <Text style={s.shopBtnTxt}>Browse Products on EMI</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}><Text style={s.headerTitle}>My EMI Plans</Text></View>

      {/* Summary Card */}
      <View style={s.summaryCard}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Active EMIs</Text>
          <Text style={s.summaryVal}>{emiOrders.filter(o => o.emiDetails?.emiStatus === 'approved').length}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Monthly Due</Text>
          <Text style={[s.summaryVal, { color: Colors.primary }]}>₹{totalMonthlyDue.toLocaleString('en-IN')}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Next Due</Text>
          <Text style={[s.summaryVal, { fontSize: Fonts.md }]}>
            {nextDue ? new Date(nextDue.emiDetails!.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
          </Text>
        </View>
      </View>

      <FlatList
        data={emiOrders}
        keyExtractor={o => o.id}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: o }) => <EMIOrderCard order={o} expanded={expandedId === o.id} onToggle={() => setExpandedId(expandedId === o.id ? null : o.id)} />}
      />
    </View>
  );
}

function EMIOrderCard({ order, expanded, onToggle }: { order: Order; expanded: boolean; onToggle: () => void }) {
  const e = order.emiDetails!;
  const progress = e.tenure > 0 ? e.paidInstallments / e.futureEMICount : 0;

  const statusColor = {
    approved: Colors.success, pending_approval: Colors.warning,
    rejected: Colors.error, completed: Colors.success,
  }[e.emiStatus] ?? Colors.textTertiary;

  const statusBg = {
    approved: Colors.successLight, pending_approval: Colors.warningLight,
    rejected: Colors.errorLight, completed: Colors.successLight,
  }[e.emiStatus] ?? Colors.surfaceAlt;

  const statusLabel = {
    approved: 'Active', pending_approval: 'Awaiting Approval',
    rejected: 'Rejected', completed: 'Fully Paid',
  }[e.emiStatus] ?? e.emiStatus;

  const futureEMICount = (e as any).futureEMICount ?? e.tenure ?? e.months ?? 1;

  return (
    <View style={c.card}>
      {/* Product Row */}
      <View style={c.top}>
        <Image source={{ uri: order.items[0]?.image }} style={c.img} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Text style={c.productName} numberOfLines={1}>{order.items[0]?.productName}</Text>
          <Text style={c.orderId}>{order.id}</Text>
          <View style={[c.statusBadge, { backgroundColor: statusBg }]}>
            <View style={[c.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[c.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={c.emiAmtBox}>
          <Text style={c.emiAmtLabel}>Monthly</Text>
          <Text style={c.emiAmt}>₹{(e.regularEMIAmount ?? e.monthlyAmount).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Progress */}
      {(e.emiStatus === 'approved' || e.emiStatus === 'completed') && (
        <>
          <View style={c.progressBar}>
            <View style={[c.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <View style={c.progressRow}>
            <Text style={c.progressTxt}>{e.paidInstallments}/{futureEMICount} installments paid</Text>
            {e.nextDueDate && e.emiStatus === 'approved' && (
              <Text style={c.nextDue}>Next: {new Date(e.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            )}
          </View>
        </>
      )}

      {/* Summary Row */}
      <View style={c.summRow}>
        <View style={c.summItem}>
          <Text style={c.summLabel}>Down Paid</Text>
          <Text style={c.summVal}>₹{e.downPaymentAmount.toLocaleString('en-IN')}</Text>
        </View>
        <View style={c.summItem}>
          <Text style={c.summLabel}>Balance EMI</Text>
          <Text style={c.summVal}>₹{e.balanceForEMI.toLocaleString('en-IN')}</Text>
        </View>
        <View style={c.summItem}>
          <Text style={c.summLabel}>Total Payable</Text>
          <Text style={c.summVal}>₹{e.totalPayable.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Schedule toggle */}
      {e.schedule && e.schedule.length > 0 && (
        <>
          <Pressable style={c.scheduleToggle} onPress={onToggle}>
            <MaterialIcons name="calendar-month" size={16} color={Colors.primary} />
            <Text style={c.scheduleTxt}>View Payment Schedule</Text>
            <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={18} color={Colors.primary} />
          </Pressable>
          {expanded && (
            <View style={c.scheduleList}>
              {e.schedule.map(inst => (
                <View key={inst.installmentNumber} style={[c.instRow, inst.status === 'paid' && c.instPaid]}>
                  <View style={[c.instBall, { backgroundColor: inst.status === 'paid' ? Colors.success : inst.status === 'overdue' ? Colors.error : Colors.border }]}>
                    {inst.status === 'paid'
                      ? <MaterialIcons name="check" size={10} color="#fff" />
                      : <Text style={{ color: '#fff', fontSize: 9, fontWeight: Fonts.bold }}>{inst.installmentNumber}</Text>}
                  </View>
                  <Text style={c.instDate}>{new Date(inst.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[c.instAmt, inst.status === 'paid' && { color: Colors.success }]}>₹{inst.amount.toLocaleString('en-IN')}</Text>
                  <View style={[c.instStatus, {
                    backgroundColor: inst.status === 'paid' ? Colors.successLight : inst.status === 'overdue' ? Colors.errorLight : Colors.surfaceAlt,
                  }]}>
                    <Text style={[c.instStatusTxt, {
                      color: inst.status === 'paid' ? Colors.success : inst.status === 'overdue' ? Colors.error : Colors.textTertiary,
                    }]}>{inst.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: Fonts.xxl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  summaryCard: { flexDirection: 'row', backgroundColor: Colors.primary, marginHorizontal: Spacing.lg, marginTop: Spacing.lg, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.md as object },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: Fonts.xs, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  summaryVal: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: '#fff' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xxxl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  emptySub: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center' },
  shopBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.xl },
  shopBtnTxt: { color: '#fff', fontWeight: Fonts.semiBold, fontSize: Fonts.md },
});

const c = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.sm as object },
  top: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.lg, gap: Spacing.md },
  img: { width: 58, height: 58, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  productName: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary, marginBottom: 2 },
  orderId: { fontSize: Fonts.xs, color: Colors.textTertiary, marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: Fonts.xs, fontWeight: Fonts.semiBold },
  emiAmtBox: { alignItems: 'flex-end' },
  emiAmtLabel: { fontSize: Fonts.xs, color: Colors.textTertiary },
  emiAmt: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.primary },
  progressBar: { height: 6, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.lg, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 4, paddingBottom: Spacing.sm },
  progressTxt: { fontSize: Fonts.xs, color: Colors.textTertiary },
  nextDue: { fontSize: Fonts.xs, color: Colors.primary, fontWeight: Fonts.semiBold },
  summRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.borderLight },
  summItem: { flex: 1, alignItems: 'center', padding: Spacing.md },
  summLabel: { fontSize: Fonts.xs, color: Colors.textTertiary, marginBottom: 2 },
  summVal: { fontSize: Fonts.sm, fontWeight: Fonts.bold, color: Colors.textPrimary },
  scheduleToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.primaryLight },
  scheduleTxt: { flex: 1, fontSize: Fonts.sm, fontWeight: Fonts.medium, color: Colors.primary },
  scheduleList: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  instRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  instPaid: { backgroundColor: Colors.surfaceAlt },
  instBall: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  instDate: { fontSize: Fonts.sm, color: Colors.textSecondary },
  instAmt: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  instStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  instStatusTxt: { fontSize: 10, fontWeight: Fonts.semiBold, textTransform: 'capitalize' },
});
