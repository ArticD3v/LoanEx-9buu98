import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_PRODUCTS } from '../../modules/products/data/mockData';
import { MOCK_ORDERS } from '../../orders/data/mockData';
import { MOCK_CUSTOMERS } from '../../customers/data/mockData';
import { MOCK_EMI_APPLICATIONS } from '../../emi/data/mockData';
import { useTheme } from '../../theme/useTheme';
import { radius, shadow, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SectionHeader } from './SectionHeader';

export type SearchResultType = 'product' | 'order' | 'customer' | 'emi';

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  icon: string;
}

interface GlobalSearchResultsProps {
  query: string;
  onSelect: (item: SearchResultItem) => void;
}

function matches(query: string, ...fields: (string | number | undefined)[]) {
  const q = query.toLowerCase();
  return fields.some((field) => String(field ?? '').toLowerCase().includes(q));
}

export function buildGlobalSearchResults(query: string): SearchResultItem[] {
  const q = query.trim();
  if (!q) return [];

  const products: SearchResultItem[] = MOCK_PRODUCTS.filter((p) =>
    matches(q, p.name, p.sku, p.brand, p.category),
  ).map((p) => ({
    id: p.id,
    type: 'product',
    title: p.name,
    subtitle: `${p.sku} · ${p.brand}`,
    icon: 'cube-outline',
  }));

  const orders: SearchResultItem[] = MOCK_ORDERS.filter((o) =>
    matches(q, o.id, o.customerName, o.customerMobile, o.productName),
  ).map((o) => ({
    id: o.id,
    type: 'order',
    title: o.id,
    subtitle: `${o.customerName} · ${o.productName}`,
    icon: 'receipt-outline',
  }));

  const customers: SearchResultItem[] = MOCK_CUSTOMERS.filter((c) =>
    matches(q, c.name, c.mobile, c.id, c.city),
  ).map((c) => ({
    id: c.id,
    type: 'customer',
    title: c.name,
    subtitle: `${c.id} · ${c.mobile}`,
    icon: 'person-outline',
  }));

  const emiApps: SearchResultItem[] = MOCK_EMI_APPLICATIONS.filter((e) =>
    matches(q, e.id, e.customerName, e.mobile, e.selectedProduct),
  ).map((e) => ({
    id: e.id,
    type: 'emi',
    title: e.id,
    subtitle: `${e.customerName} · ${e.selectedProduct}`,
    icon: 'card-outline',
  }));

  return [...products, ...orders, ...customers, ...emiApps];
}

const TYPE_LABELS: Record<SearchResultType, string> = {
  product: 'Products',
  order: 'Orders',
  customer: 'Customers',
  emi: 'EMI Applications',
};

export function GlobalSearchResults({ query, onSelect }: GlobalSearchResultsProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const results = useMemo(() => buildGlobalSearchResults(query), [query]);

  const grouped = useMemo(() => {
    const order: SearchResultType[] = ['product', 'order', 'customer', 'emi'];
    return order
      .map((type) => ({
        type,
        items: results.filter((r) => r.type === type),
      }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  if (!query.trim()) return null;

  if (results.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIllustration}>
          <Ionicons name="search-outline" size={40} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No Results Found</Text>
        <Text style={styles.emptyDesc}>
          Try searching by name, ID, mobile, SKU, or product.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.resultCount}>
        {results.length} result{results.length === 1 ? '' : 's'}
      </Text>

      {grouped.map((group) => (
        <View key={group.type} style={styles.section}>
          <SectionHeader title={TYPE_LABELS[group.type]} />
          <View style={styles.groupCard}>
            {group.items.map((item, index) => (
              <TouchableOpacity
                key={`${item.type}-${item.id}`}
                style={[
                  styles.resultRow,
                  index === group.items.length - 1 && styles.resultRowLast,
                ]}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.resultIcon}>
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.resultSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.xxl,
    },
    resultCount: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    section: {
      marginBottom: spacing.lg,
    },
    groupCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...shadow.sm,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      gap: spacing.md,
    },
    resultRowLast: {
      borderBottomWidth: 0,
    },
    resultIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultContent: {
      flex: 1,
    },
    resultTitle: {
      ...typography.label,
      color: colors.textHeading,
      marginBottom: 2,
    },
    resultSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
      paddingHorizontal: spacing.xxl,
    },
    emptyIllustration: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    emptyDesc: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
