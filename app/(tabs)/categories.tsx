import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../../constants/theme';
import { CATEGORIES } from '../../constants/config';
import { getProductsByCategory } from '../../services/productService';

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Browse by category</Text>
      </View>
      <FlatList
        data={CATEGORIES}
        keyExtractor={i => i.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: Spacing.md }}
        renderItem={({ item }) => {
          const count = getProductsByCategory(item.id).length;
          return (
            <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
              <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                <MaterialIcons name={item.icon as any} size={36} color={item.color} />
              </View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.count}>{count} products</Text>
              <View style={[styles.arrowBtn, { backgroundColor: item.bg }]}>
                <MaterialIcons name="arrow-forward" size={16} color={item.color} />
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  title: { fontSize: Fonts.xxl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Fonts.sm, color: Colors.textSecondary, marginTop: 4 },
  grid: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, minHeight: 160, ...Shadow.sm },
  iconBox: { width: 64, height: 64, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  name: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: 4 },
  count: { fontSize: Fonts.sm, color: Colors.textSecondary },
  arrowBtn: { position: 'absolute', bottom: Spacing.lg, right: Spacing.lg, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
