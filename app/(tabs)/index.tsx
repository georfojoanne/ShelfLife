import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Theme';
import { AppIcon, EmptyState, ErrorState, LoadingState, PrimaryButton, SectionTitle, Surface, type IconName } from '@/components/ShelfLifeUI';
import { InventoryItemCard } from '@/components/InventoryItemCard';
import { useColorScheme } from '@/components/useColorScheme';
import { listInventoryItems } from '@/database/inventory';
import type { InventoryItem } from '@/types/inventory';
import { getExpirationStatus } from '@/utils/dates';

const addIcon = { ios: 'plus', android: 'add', web: 'add' } as const;
const pantryIcon = { ios: 'basket.fill', android: 'shopping_basket', web: 'shopping_basket' } as const;

export default function HomeScreen() {
  const colors = Colors[useColorScheme()];
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listInventoryItems());
      setError(null);
    } catch {
      setError('We could not load your pantry. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  const expiringSoon = items.filter((item) => getExpirationStatus(item.expirationDate) === 'expiring-soon');
  const expired = items.filter((item) => getExpirationStatus(item.expirationDate) === 'expired');

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.tint }]}>YOUR HOME PANTRY</Text>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to ShelfLife</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>Keep your kitchen fresh and organized.</Text>
        </View>
        <View style={[styles.logoMark, { backgroundColor: colors.accent }]}><AppIcon name={pantryIcon} color={colors.tint} size={25} /></View>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard label="Total items" value={items.length} color={colors.tint} icon={{ ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' }} />
        <SummaryCard label="Expiring soon" value={expiringSoon.length} color={colors.warning} icon={{ ios: 'clock.fill', android: 'schedule', web: 'schedule' }} />
        <SummaryCard label="Expired" value={expired.length} color={colors.danger} icon={{ ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' }} />
      </View>

      {loading ? <LoadingState label="Loading pantry" /> : error ? <ErrorState message={error} onRetry={loadItems} /> : (
        <View style={styles.section}>
          <SectionTitle title="Expiring soon" action={expiringSoon.length ? 'See all' : undefined} onAction={() => router.push('/(tabs)/two')} />
          {expiringSoon.length ? expiringSoon.slice(0, 3).map((item) => <InventoryItemCard key={item.id} item={item} onPress={() => router.push({ pathname: '/item/[id]', params: { id: String(item.id) } })} />) : (
            <EmptyState icon={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} title={items.length ? "You're all caught up" : 'Your pantry is ready'} description={items.length ? 'Nothing needs your attention in the next few days.' : 'Add your first item to start tracking freshness.'} />
          )}
        </View>
      )}

      <Surface style={styles.quickAction}>
        <View style={[styles.quickIcon, { backgroundColor: colors.accent }]}><AppIcon name={addIcon} color={colors.tint} size={24} /></View>
        <View style={styles.quickCopy}><Text style={[styles.quickTitle, { color: colors.text }]}>Add an item</Text><Text style={[styles.quickDescription, { color: colors.mutedText }]}>Start building your digital pantry.</Text></View>
        <PrimaryButton label="Add item" icon={addIcon} accessibilityHint="Opens the add item form" onPress={() => router.push('/item/new')} />
      </Surface>
    </ScrollView>
  );
}

function SummaryCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: IconName }) {
  const colors = Colors[useColorScheme()];
  return <Surface style={styles.summaryCard}><AppIcon name={icon} color={color} size={19} /><Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text><Text numberOfLines={2} style={[styles.summaryLabel, { color: colors.mutedText }]}>{label}</Text></Surface>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  headerCopy: { flex: 1, paddingRight: Spacing.sm },
  eyebrow: { ...Typography.eyebrow, marginBottom: Spacing.xs },
  title: { ...Typography.display, letterSpacing: -0.5, marginBottom: Spacing.xxs },
  subtitle: { ...Typography.body },
  logoMark: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryGrid: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.xl },
  summaryCard: { flex: 1, minHeight: 118, padding: Spacing.sm },
  summaryValue: { fontSize: 25, lineHeight: 30, fontWeight: '800', marginTop: Spacing.sm, marginBottom: Spacing.xxs },
  summaryLabel: { ...Typography.caption, fontWeight: '600' },
  section: { marginBottom: Spacing.md },
  quickAction: { padding: Spacing.sm, flexDirection: 'row', alignItems: 'center' },
  quickIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  quickCopy: { flex: 1, marginHorizontal: Spacing.sm },
  quickTitle: { ...Typography.bodyStrong, marginBottom: Spacing.xxs },
  quickDescription: { ...Typography.caption },
});
