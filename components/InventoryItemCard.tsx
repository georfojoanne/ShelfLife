import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { AppIcon, StatusBadge, Surface } from '@/components/ShelfLifeUI';
import { Typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import type { InventoryItem } from '@/types/inventory';
import { formatDate, getExpirationStatus } from '@/utils/dates';

const arrowIcon = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as const;

export function InventoryItemCard({ item, onPress }: { item: InventoryItem; onPress: () => void }) {
  const colors = Colors[useColorScheme()];
  const status = getExpirationStatus(item.expirationDate);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}, ${item.category}, expires ${formatDate(item.expirationDate)}`} accessibilityHint="Opens item details for editing" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Surface style={styles.card}>
        <View style={styles.copy}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.quantity, { color: colors.text }]}>{item.quantity} {item.unit}</Text>
            <Text style={[styles.category, { color: colors.mutedText }]}>{item.category}</Text>
          </View>
          <View style={styles.dateRow}>
            <AppIcon name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }} color={colors.mutedText} size={14} />
            <Text style={[styles.date, { color: colors.mutedText }]}>Expires {formatDate(item.expirationDate)}</Text>
          </View>
        </View>
        <View style={styles.trailing}>
          <StatusBadge status={status} />
          <View accessibilityElementsHidden><AppIcon name={arrowIcon} color={colors.mutedText} size={17} /></View>
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 110, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, paddingRight: 10 },
  name: { ...Typography.bodyStrong, fontSize: 16, marginBottom: 7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  quantity: { ...Typography.caption, fontWeight: '700' },
  category: { ...Typography.caption },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  date: { ...Typography.caption },
  trailing: { alignItems: 'flex-end', gap: 14 },
});
