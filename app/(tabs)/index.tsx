import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../../constants/theme';
import { CATEGORIES } from '../../constants/config';
import { ProductCard } from '../../components/feature/ProductCard';
import { useAuth } from '../../hooks/useAuth';
import { getFeaturedProducts, getDeals } from '../../services/productService';

const W = Dimensions.get('window').width;
const BANNERS = [
  { id: '1', title: 'Biggest Electronics Sale', sub: 'Up to 40% off premium gadgets', badge: '0% EMI Available', uri: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80' },
  { id: '2', title: 'Fashion Forward', sub: 'New arrivals, fresh styles this season', badge: 'Flat 30% off', uri: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80' },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'User'} 👋</Text>
          <Text style={styles.subGreet}>What are you shopping for today?</Text>
        </View>
        <Pressable style={styles.notifBtn}>
          <MaterialIcons name="notifications-none" size={24} color={Colors.textPrimary} />
          <View style={styles.notifDot} />
        </Pressable>
      </View>

      {/* Search bar — tappable, navigates to /search */}
      <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
        <MaterialIcons name="search" size={20} color={Colors.textTertiary} />
        <Text style={styles.searchPlaceholder}>Search phones, TVs, fashion...</Text>
        <MaterialIcons name="tune" size={18} color={Colors.textTertiary} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner carousel */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height: 195 }}>
          {BANNERS.map(b => (
            <View key={b.id} style={[styles.banner, { width: W }]}>
              <Image source={{ uri: b.uri }} style={styles.bannerImg} contentFit="cover" transition={300} />
              <View style={styles.bannerOverlay} />
              <View style={styles.bannerContent}>
                <View style={styles.bannerBadge}><Text style={styles.bannerBadgeTxt}>{b.badge}</Text></View>
                <Text style={styles.bannerTitle}>{b.title}</Text>
                <Text style={styles.bannerSub}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* EMI strip */}
        <View style={styles.emiStrip}>
          <MaterialIcons name="account-balance" size={15} color={Colors.success} />
          <Text style={styles.emiStripTxt}>Easy EMI from 0% interest · No paperwork required</Text>
          <MaterialIcons name="chevron-right" size={15} color={Colors.success} />
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHdr}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <Pressable onPress={() => router.push('/(tabs)/categories')}><Text style={styles.seeAll}>See all</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
            {CATEGORIES.map(cat => (
              <Pressable key={cat.id} style={styles.catChip} onPress={() => router.push(`/search?category=${cat.id}`)}>
                <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                  <MaterialIcons name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <Text style={styles.catLabel}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* EMI Deals */}
        <View style={styles.section}>
          <View style={styles.sectionHdr}>
            <Text style={styles.sectionTitle}>📱 EMI Deals</Text>
            <Pressable onPress={() => router.push('/search?emiOnly=true')}>
              <View style={styles.emiBadgeSmall}><Text style={styles.emiBadgeTxt}>0% interest</Text></View>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}>
            {getFeaturedProducts().map(p => <ProductCard key={p.id} product={p} />)}
          </ScrollView>
        </View>

        {/* Deal of the Day */}
        <View style={styles.section}>
          <View style={styles.sectionHdr}>
            <Text style={styles.sectionTitle}>🔥 Deal of the Day</Text>
            <Pressable onPress={() => router.push('/search?sort=discount')}><Text style={styles.seeAll}>View all</Text></Pressable>
          </View>
          {getDeals().slice(0, 3).map(p => <ProductCard key={p.id} product={p} horizontal />)}
        </View>

        <View style={{ height: Spacing.huge }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  greeting: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  subGreet: { fontSize: Fonts.sm, color: Colors.textSecondary, marginTop: 2 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error, borderWidth: 1.5, borderColor: Colors.background },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.full, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm, ...Shadow.sm },
  searchPlaceholder: { flex: 1, fontSize: Fonts.md, color: Colors.textTertiary },
  banner: { height: 195, position: 'relative' },
  bannerImg: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  bannerContent: { position: 'absolute', left: Spacing.xl, right: Spacing.xl, bottom: Spacing.xl },
  bannerBadge: { backgroundColor: Colors.primary, alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full, marginBottom: 6 },
  bannerBadgeTxt: { color: '#fff', fontSize: Fonts.xs, fontWeight: Fonts.semiBold },
  bannerTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: '#fff', marginBottom: 4 },
  bannerSub: { fontSize: Fonts.sm, color: 'rgba(255,255,255,0.8)' },
  emiStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successLight, paddingHorizontal: Spacing.lg, paddingVertical: 10, marginHorizontal: Spacing.lg, borderRadius: Radius.md, marginVertical: Spacing.md, gap: Spacing.xs },
  emiStripTxt: { flex: 1, fontSize: Fonts.sm, color: Colors.success, fontWeight: Fonts.medium },
  section: { marginBottom: Spacing.xl },
  sectionHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  seeAll: { fontSize: Fonts.sm, color: Colors.primary, fontWeight: Fonts.medium },
  emiBadgeSmall: { backgroundColor: Colors.successLight, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  emiBadgeTxt: { fontSize: Fonts.xs, color: Colors.success, fontWeight: Fonts.semiBold },
  catChip: { alignItems: 'center', gap: Spacing.xs },
  catIcon: { width: 58, height: 58, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: Fonts.xs, color: Colors.textSecondary, fontWeight: Fonts.medium, textAlign: 'center', maxWidth: 58 },
});
