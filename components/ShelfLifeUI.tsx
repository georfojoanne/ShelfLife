import { SymbolView } from 'expo-symbols';
import type { ComponentProps, PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { ControlSizes, Radii, Shadows, Spacing, Typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';

export type IconName = ComponentProps<typeof SymbolView>['name'];

export function AppIcon({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  return <SymbolView name={name} tintColor={color} size={size} />;
}

export function Surface({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const colors = Colors[useColorScheme()];

  return <View style={[styles.surface, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function PrimaryButton({ label, icon, onPress, disabled = false, loading = false, loadingLabel, accessibilityHint }: {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  accessibilityHint?: string;
}) {
  const colors = Colors[useColorScheme()];
  const unavailable = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.tint, opacity: unavailable ? 0.55 : pressed ? 0.82 : 1 }]}> 
      {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : icon ? <AppIcon name={icon} color="#FFFFFF" size={19} /> : null}
      <Text style={styles.primaryButtonText}>{loading ? loadingLabel ?? `${label}…` : label}</Text>
    </Pressable>
  );
}

export function AppTextInput({ label, error, hint, accessibilityHint, style, ...props }: TextInputProps & { label?: string; error?: string; hint?: string }) {
  const colors = Colors[useColorScheme()];
  const message = error ?? hint;

  return (
    <View style={styles.inputGroup}>
      {label ? <Text style={[styles.inputLabel, { color: colors.text }]}>{label}</Text> : null}
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        style={[styles.input, { backgroundColor: colors.card, borderColor: error ? colors.danger : colors.border, color: colors.text }, style]}
        placeholderTextColor={props.placeholderTextColor ?? colors.mutedText}
      />
      {message ? <Text style={[styles.inputMessage, { color: error ? colors.danger : colors.mutedText }]}>{message}</Text> : null}
    </View>
  );
}

export function FilterChip({ label, selected = false, onPress, accessibilityHint }: { label: string; selected?: boolean; onPress: () => void; accessibilityHint?: string }) {
  const colors = Colors[useColorScheme()];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.filterChip, { backgroundColor: selected ? colors.tint : colors.card, borderColor: selected ? colors.tint : colors.border, opacity: pressed ? 0.72 : 1 }]}>
      <Text style={[styles.filterChipText, { color: selected ? '#FFFFFF' : colors.mutedText }]}>{label}</Text>
    </Pressable>
  );
}

export type StatusBadgeStatus = 'fresh' | 'expiring-soon' | 'expired';

export function StatusBadge({ status, label }: { status: StatusBadgeStatus; label?: string }) {
  const colors = Colors[useColorScheme()];
  const statusColor = status === 'expired' ? colors.danger : status === 'expiring-soon' ? colors.warning : colors.success;
  const statusLabel = label ?? (status === 'expired' ? 'Expired' : status === 'expiring-soon' ? 'Expiring soon' : 'Fresh');
  const icon: IconName = status === 'expired'
    ? { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' }
    : status === 'expiring-soon'
      ? { ios: 'clock.fill', android: 'schedule', web: 'schedule' }
      : { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' };

  return (
    <View accessible accessibilityLabel={`Status: ${statusLabel}`} style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
      <AppIcon name={icon} color={statusColor} size={14} />
      <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
    </View>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  const colors = Colors[useColorScheme()];
  return <View accessible accessibilityLabel={label} style={styles.feedbackState}><ActivityIndicator color={colors.tint} /><Text style={[styles.feedbackText, { color: colors.mutedText }]}>{label}…</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const colors = Colors[useColorScheme()];
  return <Surface style={styles.feedbackCard}><Text style={[styles.feedbackText, { color: colors.danger }]}>{message}</Text>{onRetry ? <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={onRetry}><Text style={[styles.feedbackAction, { color: colors.tint }]}>Try again</Text></Pressable> : null}</Surface>;
}

export function SuccessState({ message }: { message: string }) {
  const colors = Colors[useColorScheme()];
  return <View accessible accessibilityLabel={message} style={[styles.successState, { backgroundColor: colors.accent }]}><AppIcon name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} color={colors.success} size={18} /><Text style={[styles.feedbackText, { color: colors.success }]}>{message}</Text></View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = Colors[useColorScheme()];

  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action ? <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} hitSlop={8} disabled={!onAction}><Text style={[styles.sectionAction, { color: colors.tint }]}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description: string; icon: IconName }) {
  const colors = Colors[useColorScheme()];

  return (
    <Surface style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
        <AppIcon name={icon} color={colors.tint} size={28} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.mutedText }]}>{description}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderWidth: 1,
    borderRadius: Radii.xl,
    ...Shadows.card,
  },
  primaryButton: {
    minHeight: ControlSizes.buttonHeight,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    ...Typography.bodyStrong,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.section,
  },
  sectionAction: {
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    ...Typography.bodyStrong,
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 7,
  },
  emptyDescription: {
    ...Typography.body,
    textAlign: 'center',
  },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { ...Typography.label, marginBottom: Spacing.xs },
  input: { minHeight: ControlSizes.inputHeight, borderWidth: 1, borderRadius: Radii.lg, paddingHorizontal: Spacing.md, fontSize: Typography.body.fontSize },
  inputMessage: { ...Typography.caption, marginTop: Spacing.xxs },
  filterChip: { minHeight: ControlSizes.minTouchTarget, borderWidth: 1, borderRadius: Radii.pill, paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  filterChipText: { ...Typography.caption, fontWeight: '700' },
  statusBadge: { minHeight: 28, borderRadius: Radii.pill, paddingHorizontal: Spacing.xs, flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  statusBadgeText: { ...Typography.caption, fontWeight: '800' },
  feedbackState: { minHeight: ControlSizes.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  feedbackCard: { padding: Spacing.md, gap: Spacing.xs },
  feedbackText: { ...Typography.caption },
  feedbackAction: { ...Typography.caption, fontWeight: '800' },
  successState: { minHeight: ControlSizes.minTouchTarget, borderRadius: Radii.md, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
});
