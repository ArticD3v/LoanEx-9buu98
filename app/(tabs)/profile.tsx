import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../../constants/theme';

const MENU = [
  { icon: 'receipt-long', label: 'My Orders', route: '/orders' },
  { icon: 'account-balance', label: 'My EMIs', route: null },
  { icon: 'location-on', label: 'Delivery Addresses', route: null },
  { icon: 'payment', label: 'Payment Methods', route: null },
  { icon: 'notifications', label: 'Notifications', route: null },
  { icon: 'help-outline', label: 'Help & Support', route: null },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function handleLogout() {
    await logout();
    router.replace('/auth/login');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>Profile</Text></View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.userCard}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text></View>
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user?.name || 'User'}</Text>
            <Text style={styles.phone}>+91 {user?.phone}</Text>
            {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          </View>
          <Pressable style={styles.editBtn}><MaterialIcons name="edit" size={18} color={Colors.primary} /></Pressable>
        </View>
        <View style={styles.menuCard}>
          {MENU.map((item, idx) => (
            <React.Fragment key={item.label}>
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: Colors.surfaceAlt }]}
                onPress={() => item.route && router.push(item.route as any)}
              >
                <View style={styles.menuIcon}><MaterialIcons name={item.icon as any} size={20} color={Colors.primary} /></View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <MaterialIcons name="chevron-right" size={20} color={Colors.textTertiary} />
              </Pressable>
              {idx < MENU.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={Colors.error} />
          <Text style={styles.logoutTxt}>Log Out</Text>
        </Pressable>
        <Text style={styles.version}>ShopEMI v1.0.0 · Made with love in India</Text>
        <View style={{ height: Spacing.huge }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  title: { fontSize: Fonts.xxl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.lg, gap: Spacing.lg, ...Shadow.sm },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: Fonts.xxl, fontWeight: Fonts.bold, color: '#fff' },
  userInfo: { flex: 1 },
  name: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: 3 },
  phone: { fontSize: Fonts.md, color: Colors.textSecondary },
  email: { fontSize: Fonts.sm, color: Colors.textTertiary, marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  menuCard: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, borderRadius: Radius.xl, marginBottom: Spacing.lg, ...Shadow.sm, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  menuIcon: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: Fonts.md, color: Colors.textPrimary, fontWeight: Fonts.medium },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: Spacing.lg + 36 + Spacing.md },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.errorLight, marginHorizontal: Spacing.lg, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg },
  logoutTxt: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.error },
  version: { textAlign: 'center', fontSize: Fonts.xs, color: Colors.textTertiary, marginBottom: Spacing.lg },
});
