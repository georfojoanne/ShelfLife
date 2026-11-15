import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Theme';
import { EmptyState, ErrorState, FilterChip, LoadingState, PrimaryButton } from '@/components/ShelfLifeUI';
import { InventoryItemCard } from '@/components/InventoryItemCard';
import { useColorScheme } from '@/components/useColorScheme';
import { listInventoryItems } from '@/database/inventory';
import type { InventoryItem } from '@/types/inventory';

const addIcon = { ios: 'plus', android: 'add', web: 'add' } as const;
const categories = ['All items', 'Produce', 'Dairy', 'Pantry', 'Other'];
type SortBy = 'expiration' | 'name';

export default function InventoryScreen() {
  const colors = Colors[useColorScheme()];
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All items');
  const [sortBy, setSortBy] = useState<SortBy>('expiration');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try { setItems(await listInventoryItems()); setError(null); } catch { setError('We could not load your inventory. Please try again.'); } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !normalizedSearch || item.name.toLowerCase().includes(normalizedSearch);
      const matchesCategory = category === 'All items' || item.category === category;
      return matchesSearch && matchesCategory;
    }).sort((first, second) => sortBy === 'name'
      ? first.name.localeCompare(second.name, undefined, { sensitivity: 'base' })
      : first.expirationDate.localeCompare(second.expirationDate) || first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
  }, [category, items, search, sortBy]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}><Text style={[styles.title, { color: colors.text }]}>Inventory</Text><Text style={[styles.description, { color: colors.mutedText }]}>Everything in your pantry, at a glance.</Text></View>
            <PrimaryButton label="Add item" icon={addIcon} accessibilityHint="Opens the add item form" onPress={() => router.push('/item/new')} />
          </View>

          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} tintColor={colors.mutedText} size={19} />
            <TextInput accessibilityLabel="Search inventory by item name" accessibilityHint="Type an item name to filter the inventory" placeholder="Search your inventory" placeholderTextColor={colors.mutedText} value={search} onChangeText={setSearch} style={[styles.searchInput, { color: colors.text }]} returnKeyType="search" />
            {search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear inventory search" onPress={() => setSearch('')} hitSlop={8} style={styles.clearButton}><Text style={[styles.clearText, { color: colors.mutedText }]}>×</Text></Pressable> : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map((item) => <FilterChip key={item} label={item} selected={item === category} accessibilityHint="Filters inventory by category" onPress={() => setCategory(item)} />)}
          </ScrollView>

          <View style={styles.sortRow}>
            <Text style={[styles.sortLabel, { color: colors.mutedText }]}>Sort by</Text>
            <View style={styles.sortOptions}>
              <FilterChip label="Expiration" selected={sortBy === 'expiration'} accessibilityHint="Sorts items by soonest expiration" onPress={() => setSortBy('expiration')} />
              <FilterChip label="Name" selected={sortBy === 'name'} accessibilityHint="Sorts items alphabetically" onPress={() => setSortBy('name')} />
            </View>
          </View>

          {loading ? <LoadingState label="Loading inventory" /> : error ? <ErrorState message={error} onRetry={loadItems} /> : null}
        </>}
        ListEmptyComponent={!loading && !error ? <EmptyState icon={{ ios: 'archivebox.fill', android: 'inventory_2', web: 'inventory_2' }} title={items.length ? 'No matching items' : 'Your inventory is empty'} description={items.length ? 'Try a different search or category.' : 'Add food items to keep track of what you have and when it should be used.'} /> : undefined}
        renderItem={({ item }) => <InventoryItemCard item={item} onPress={() => router.push({ pathname: '/item/[id]', params: { id: String(item.id) } })} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl, flexGrow: 1 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  headingCopy: { flex: 1, paddingRight: Spacing.sm },
  title: { ...Typography.display, letterSpacing: -0.5, marginBottom: Spacing.xxs },
  description: { ...Typography.body },
  searchBar: { minHeight: 51, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, marginBottom: Spacing.sm },
  searchInput: { flex: 1, ...Typography.body, marginLeft: Spacing.xs, paddingVertical: 0 },
  clearButton: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 26, lineHeight: 28, fontWeight: '300' },
  chips: { gap: Spacing.xs, paddingBottom: Spacing.sm },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  sortLabel: { ...Typography.caption, fontWeight: '700' },
  sortOptions: { flexDirection: 'row', gap: Spacing.xs },
});
