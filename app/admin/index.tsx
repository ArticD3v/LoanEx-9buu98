import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, Alert, TextInput, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../../constants/theme';
import { APP_CONFIG } from '../../constants/config';
import { getAllProducts, deleteProduct, updateProduct } from '../../services/productService';
import { getAllOrders, updateOrderStatus, updateEMIStatus, getEMIOrders } from '../../services/orderService';
import { Product, Order } from '../../types';

const TABS = ['Dashboard', 'Products', 'Orders', 'EMIs', 'Reports'] as const;
type Tab = typeof TABS[number];

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
  const [products, setProducts] = useState(() => getAllProducts());
  const [orders, setOrders] = useState(() => getAllOrders());

  const stats = useMemo(() => {
    const allOrds = getAllOrders();
    const emiOrds = getEMIOrders();
    return {
      totalOrders: allOrds.length,
      revenue: allOrds.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
      pendingEMIs: emiOrds.filter(o => o.emiDetails?.emiStatus === 'pending_approval').length,
      activeEMIs: emiOrds.filter(o => o.emiDetails?.emiStatus === 'approved').length,
      totalProducts: getAllProducts().length,
      activeProducts: getAllProducts().filter(p => p.status === 'active').length,
    };
  }, []);

  const refreshData = () => {
    setProducts(getAllProducts());
    setOrders(getAllOrders());
  };

  const handleDeleteProduct = (id: string, name: string) => {
    Alert.alert('Delete Product', `Remove "${name}" from the store?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteProduct(id); refreshData(); } },
    ]);
  };

  const handleToggleStatus = (p: Product) => {
    updateProduct(p.id, { status: p.status === 'active' ? 'inactive' : 'active' });
    refreshData();
  };

  const handleOrderStatus = (id: string, status: Order['status']) => {
    updateOrderStatus(id, status);
    setOrders(getAllOrders());
  };

  const handleEMIAction = (orderId: string, action: 'approved' | 'rejected') => {
    updateEMIStatus(orderId, action);
    setOrders(getAllOrders());
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Admin Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}><Text style={s.logoTxt}>A</Text></View>
          <View>
            <Text style={s.headerTitle}>Admin Panel</Text>
            <Text style={s.headerSub}>{APP_CONFIG.name}</Text>
          </View>
        </View>
        <Pressable style={s.addProductBtn} onPress={() => router.push('/admin/add-product' as any)}>
          <MaterialIcons name="add" size={18} color="#fff" />
          <Text style={s.addProductTxt}>Add Product</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'Dashboard' && <DashboardTab stats={stats} orders={orders} />}
        {activeTab === 'Products' && (
          <ProductsTab products={products} onDelete={handleDeleteProduct}
            onToggleStatus={handleToggleStatus} onEdit={id => router.push(`/admin/add-product?id=${id}` as any)}
            onRefresh={refreshData} onAdd={() => router.push('/admin/add-product' as any)} />
        )}
        {activeTab === 'Orders' && <OrdersTab orders={orders} onUpdateStatus={handleOrderStatus} />}
        {activeTab === 'EMIs' && <EMIsTab orders={orders} onAction={handleEMIAction} />}
        {activeTab === 'Reports' && <ReportsTab stats={stats} orders={orders} products={products} />}
      </View>

      {/* Bottom Tab Bar */}
      <View style={[s.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        {TABS.map(tab => {
          const icons: Record<Tab, string> = { Dashboard: 'dashboard', Products: 'inventory-2', Orders: 'receipt-long', EMIs: 'account-balance', Reports: 'bar-chart' };
          const active = activeTab === tab;
          return (
            <Pressable key={tab} style={s.tabItem} onPress={() => setActiveTab(tab)}>
              <MaterialIcons name={icons[tab] as any} size={22} color={active ? Colors.primary : Colors.textTertiary} />
              <Text style={[s.tabLabel, active && s.tabLabelOn]}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({ stats, orders }: { stats: any; orders: Order[] }) {
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const cards = [
    { label: 'Total Products', val: stats.totalProducts, icon: 'inventory-2', color: '#3B82F6' },
    { label: 'Active Orders', val: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length, icon: 'receipt-long', color: Colors.primary },
    { label: 'Active EMIs', val: orders.filter(o => o.emiDetails?.emiStatus === 'approved').length, icon: 'account-balance', color: Colors.success },
    { label: 'Pending Approval', val: stats.pendingEMIs, icon: 'hourglass-empty', color: Colors.warning },
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
      <View style={d.revenueCard}>
        <Text style={d.revLabel}>Total Revenue</Text>
        <Text style={d.revVal}>₹{revenue.toLocaleString('en-IN')}</Text>
        <Text style={d.revSub}>{orders.filter(o => o.status !== 'cancelled').length} successful orders</Text>
      </View>
      <View style={d.statsGrid}>
        {cards.map(c => (
          <View key={c.label} style={d.statCard}>
            <View style={[d.statIcon, { backgroundColor: c.color + '20' }]}>
              <MaterialIcons name={c.icon as any} size={20} color={c.color} />
            </View>
            <Text style={d.statVal}>{c.val}</Text>
            <Text style={d.statLabel}>{c.label}</Text>
          </View>
        ))}
      </View>
      <Text style={d.sectionTitle}>Recent Orders</Text>
      {orders.slice(0, 5).map(o => (
        <View key={o.id} style={d.orderRow}>
          <View style={{ flex: 1 }}>
            <Text style={d.ordId}>{o.id}</Text>
            <Text style={d.ordSub}>{o.items.length} item(s) · {o.paymentMethod.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={d.ordTotal}>₹{o.total.toLocaleString('en-IN')}</Text>
            <View style={[d.statusBadge, { backgroundColor: o.status === 'delivered' ? Colors.successLight : o.status === 'cancelled' ? Colors.errorLight : Colors.warningLight }]}>
              <Text style={[d.statusTxt, { color: o.status === 'delivered' ? Colors.success : o.status === 'cancelled' ? Colors.error : '#B45309' }]}>{o.status}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Products Tab ────────────────────────────────────────────────────────────
function ProductsTab({ products, onDelete, onToggleStatus, onEdit, onRefresh, onAdd }: {
  products: Product[]; onDelete: (id: string, name: string) => void;
  onToggleStatus: (p: Product) => void; onEdit: (id: string) => void;
  onRefresh: () => void; onAdd: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <FlatList data={products} keyExtractor={p => p.id}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item: p }) => (
          <View style={pr.card}>
            <Image source={{ uri: p.image }} style={pr.img} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={pr.name} numberOfLines={1}>{p.name}</Text>
                <View style={[pr.badge, { backgroundColor: p.status === 'active' ? Colors.successLight : Colors.errorLight }]}>
                  <Text style={[pr.badgeTxt, { color: p.status === 'active' ? Colors.success : Colors.error }]}>{p.status}</Text>
                </View>
              </View>
              <Text style={pr.sku}>{p.sku}</Text>
              <Text style={pr.price}>₹{p.price.toLocaleString('en-IN')}</Text>
              <Text style={pr.dealers}>{p.dealers.length} dealer{p.dealers.length !== 1 ? 's' : ''} · {p.tenureOptions.length ? p.tenureOptions.join(', ') + ' mo EMI' : 'No EMI'}</Text>
            </View>
            <View style={pr.actions}>
              <Pressable style={pr.actionBtn} onPress={() => onEdit(p.id)}>
                <MaterialIcons name="edit" size={16} color={Colors.primary} />
              </Pressable>
              <Pressable style={pr.actionBtn} onPress={() => onToggleStatus(p)}>
                <MaterialIcons name={p.status === 'active' ? 'visibility-off' : 'visibility'} size={16} color={Colors.warning} />
              </Pressable>
              <Pressable style={pr.actionBtn} onPress={() => onDelete(p.id, p.name)}>
                <MaterialIcons name="delete" size={16} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        )}
      />
      <Pressable style={pr.fab} onPress={onAdd}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

// ─── Orders Tab ──────────────────────────────────────────────────────────────
function OrdersTab({ orders, onUpdateStatus }: { orders: Order[]; onUpdateStatus: (id: string, s: Order['status']) => void }) {
  const statuses: Order['status'][] = ['pending', 'confirmed', 'shipped', 'delivered'];
  return (
    <FlatList data={orders} keyExtractor={o => o.id}
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      renderItem={({ item: o }) => (
        <View style={or.card}>
          <View style={or.top}>
            <Text style={or.id}>{o.id}</Text>
            <Text style={or.phone}>+91 {o.phone}</Text>
            <Text style={or.date}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</Text>
          </View>
          <Text style={or.items}>{o.items.map(i => i.productName).join(', ')}</Text>
          <View style={or.bottom}>
            <Text style={or.total}>₹{o.total.toLocaleString('en-IN')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
              {statuses.map(st => (
                <Pressable key={st} style={[or.stBtn, o.status === st && or.stBtnOn]} onPress={() => onUpdateStatus(o.id, st)}>
                  <Text style={[or.stTxt, o.status === st && or.stTxtOn]}>{st}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    />
  );
}

// ─── EMIs Tab ────────────────────────────────────────────────────────────────
function EMIsTab({ orders, onAction }: { orders: Order[]; onAction: (id: string, a: 'approved' | 'rejected') => void }) {
  const emiOrders = orders.filter(o => o.paymentMethod === 'emi');
  return (
    <FlatList data={emiOrders} keyExtractor={o => o.id}
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      renderItem={({ item: o }) => {
        const e = o.emiDetails!;
        const isPending = e.emiStatus === 'pending_approval';
        return (
          <View style={em.card}>
            <View style={em.top}>
              <Text style={em.id}>{o.id}</Text>
              <View style={[em.badge, { backgroundColor: e.emiStatus === 'approved' ? Colors.successLight : e.emiStatus === 'rejected' ? Colors.errorLight : Colors.warningLight }]}>
                <Text style={[em.badgeTxt, { color: e.emiStatus === 'approved' ? Colors.success : e.emiStatus === 'rejected' ? Colors.error : '#B45309' }]}>{e.emiStatus.replace('_', ' ')}</Text>
              </View>
            </View>
            <Text style={em.product}>{o.items[0]?.productName}</Text>
            <Text style={em.phone}>+91 {o.phone}</Text>
            <View style={em.emiRow}>
              <View style={em.emiStat}>
                <Text style={em.emiLabel}>Down Payment</Text>
                <Text style={em.emiVal}>₹{e.downPaymentAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={em.emiStat}>
                <Text style={em.emiLabel}>Monthly EMI</Text>
                <Text style={em.emiVal}>₹{e.regularEMIAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={em.emiStat}>
                <Text style={em.emiLabel}>Tenure</Text>
                <Text style={em.emiVal}>{e.tenure} months</Text>
              </View>
            </View>
            {o.dealerSnapshot && (
              <View style={em.dealerRow}>
                <MaterialIcons name="store" size={13} color={Colors.textTertiary} />
                <Text style={em.dealerTxt}>{o.dealerSnapshot.dealerName} ({o.dealerSnapshot.dealerCode})</Text>
                <Text style={em.marginTxt}>Margin: ₹{o.dealerSnapshot.grossMargin.toLocaleString('en-IN')}</Text>
              </View>
            )}
            {isPending && (
              <View style={em.actions}>
                <Pressable style={em.approveBtn} onPress={() => onAction(o.id, 'approved')}>
                  <MaterialIcons name="check-circle" size={16} color="#fff" />
                  <Text style={em.approveTxt}>Approve EMI</Text>
                </Pressable>
                <Pressable style={em.rejectBtn} onPress={() => onAction(o.id, 'rejected')}>
                  <MaterialIcons name="cancel" size={16} color={Colors.error} />
                  <Text style={em.rejectTxt}>Reject</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

// ─── Reports Tab ─────────────────────────────────────────────────────────────
function ReportsTab({ stats, orders, products }: { stats: any; orders: Order[]; products: Product[] }) {
  const delivered = orders.filter(o => o.status === 'delivered');
  const emiOrders = orders.filter(o => o.paymentMethod === 'emi');
  const codOrders = orders.filter(o => o.paymentMethod === 'cod');
  const totalRevenue = delivered.reduce((s, o) => s + o.total, 0);
  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
      {[
        { title: 'Sales Summary', rows: [
          { k: 'Total Orders', v: orders.length.toString() }, { k: 'Delivered', v: delivered.length.toString() },
          { k: 'Pending/Active', v: orders.filter(o => !['delivered','cancelled'].includes(o.status)).length.toString() },
          { k: 'Total Revenue', v: `₹${totalRevenue.toLocaleString('en-IN')}` },
        ]},
        { title: 'EMI Report', rows: [
          { k: 'Total EMI Orders', v: emiOrders.length.toString() },
          { k: 'Approved', v: emiOrders.filter(o => o.emiDetails?.emiStatus === 'approved').length.toString() },
          { k: 'Pending Approval', v: emiOrders.filter(o => o.emiDetails?.emiStatus === 'pending_approval').length.toString() },
          { k: 'Completed', v: emiOrders.filter(o => o.emiDetails?.emiStatus === 'completed').length.toString() },
        ]},
        { title: 'Inventory', rows: [
          { k: 'Total Products', v: products.length.toString() },
          { k: 'Active', v: products.filter(p => p.status === 'active').length.toString() },
          { k: 'With EMI', v: products.filter(p => p.emiAvailable).length.toString() },
          { k: 'Total Dealers', v: products.reduce((s, p) => s + p.dealers.length, 0).toString() },
        ]},
        { title: 'Payment Mode', rows: [
          { k: 'EMI Orders', v: emiOrders.length.toString() },
          { k: 'Cash on Delivery', v: codOrders.length.toString() },
        ]},
      ].map(section => (
        <View key={section.title} style={rp.card}>
          <Text style={rp.cardTitle}>{section.title}</Text>
          {section.rows.map(r => (
            <View key={r.k} style={rp.row}>
              <Text style={rp.key}>{r.k}</Text>
              <Text style={rp.val}>{r.v}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.adminBg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logoBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoTxt: { color: '#fff', fontSize: Fonts.xl, fontWeight: Fonts.bold },
  headerTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textInverse },
  headerSub: { fontSize: Fonts.xs, color: 'rgba(255,255,255,0.5)' },
  addProductBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full },
  addProductTxt: { color: '#fff', fontSize: Fonts.sm, fontWeight: Fonts.bold },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.adminCard, borderTopWidth: 1, borderTopColor: Colors.adminBorder, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 9, color: Colors.textTertiary },
  tabLabelOn: { color: Colors.primary },
});

const d = StyleSheet.create({
  revenueCard: { backgroundColor: Colors.adminBg, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center' },
  revLabel: { fontSize: Fonts.sm, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  revVal: { fontSize: 36, fontWeight: Fonts.extraBold, color: '#fff' },
  revSub: { fontSize: Fonts.xs, color: Colors.primary, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '47.5%', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: 4, ...Shadow.sm as object },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statVal: { fontSize: 24, fontWeight: Fonts.extraBold, color: Colors.textPrimary },
  statLabel: { fontSize: Fonts.xs, color: Colors.textTertiary },
  sectionTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadow.sm as object },
  ordId: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  ordSub: { fontSize: Fonts.xs, color: Colors.textTertiary },
  ordTotal: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary, textAlign: 'right' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-end', marginTop: 4 },
  statusTxt: { fontSize: Fonts.xs, fontWeight: Fonts.semiBold, textTransform: 'capitalize' },
});

const pr = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm as object },
  img: { width: 60, height: 60, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  name: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary, flex: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  badgeTxt: { fontSize: 9, fontWeight: Fonts.bold, textTransform: 'uppercase' },
  sku: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 2 },
  price: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary, marginTop: 2 },
  dealers: { fontSize: Fonts.xs, color: Colors.textSecondary, marginTop: 2 },
  actions: { gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 16, right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.lg as object },
});

const or = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm as object },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  id: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  phone: { fontSize: Fonts.xs, color: Colors.textTertiary },
  date: { fontSize: Fonts.xs, color: Colors.textTertiary, marginLeft: 'auto' },
  items: { fontSize: Fonts.sm, color: Colors.textSecondary, marginBottom: 8 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  total: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  stBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  stBtnOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stTxt: { fontSize: 10, fontWeight: Fonts.medium, color: Colors.textSecondary, textTransform: 'capitalize' },
  stTxtOn: { color: '#fff', fontWeight: Fonts.bold },
});

const em = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm as object },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  id: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeTxt: { fontSize: Fonts.xs, fontWeight: Fonts.semiBold, textTransform: 'capitalize' },
  product: { fontSize: Fonts.md, color: Colors.textPrimary, fontWeight: Fonts.medium, marginBottom: 2 },
  phone: { fontSize: Fonts.sm, color: Colors.textTertiary, marginBottom: 8 },
  emiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 8 },
  emiStat: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  emiLabel: { fontSize: Fonts.xs, color: Colors.textTertiary, marginBottom: 2 },
  emiVal: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
  dealerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceAlt, padding: Spacing.sm, borderRadius: Radius.md, marginBottom: 8 },
  dealerTxt: { fontSize: Fonts.xs, color: Colors.textSecondary, flex: 1 },
  marginTxt: { fontSize: Fonts.xs, color: Colors.success, fontWeight: Fonts.semiBold },
  actions: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.success, padding: 10, borderRadius: Radius.lg },
  approveTxt: { color: '#fff', fontWeight: Fonts.semiBold, fontSize: Fonts.sm },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: Colors.error, paddingHorizontal: Spacing.lg, padding: 10, borderRadius: Radius.lg },
  rejectTxt: { color: Colors.error, fontWeight: Fonts.semiBold, fontSize: Fonts.sm },
});

const rp = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, ...Shadow.sm as object },
  cardTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  key: { fontSize: Fonts.md, color: Colors.textSecondary },
  val: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary },
});
