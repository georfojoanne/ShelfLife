import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { AppIcon, SuccessState, type IconName } from '@/components/ShelfLifeUI';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ControlSizes, Radii, Spacing, Typography } from '@/constants/Theme';
import { getRemindersEnabled } from '@/database/notifications';
import { disableExpirationReminders, enableExpirationReminders, getReminderPermissionStatus, openNotificationSettings, sendTestNotification } from '@/notifications/service';

type SettingRowProps = { icon: IconName; title: string; description: string; onPress?: () => void; hint?: string };
type FeedbackTone = 'success' | 'info' | 'error';

export default function SettingsScreen() {
  const colors = Colors[useColorScheme()];
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState('undetermined');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<FeedbackTone>('info');

  const showMessage = (nextMessage: string, tone: FeedbackTone) => {
    setMessage(nextMessage);
    setMessageTone(tone);
  };

  const loadNotificationStatus = useCallback(async () => {
    try {
      setPermission(await getReminderPermissionStatus());
      setEnabled(await getRemindersEnabled());
    } catch (error) {
      const details = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error), stack: undefined };
      console.error('[ShelfLife Settings] load notification settings failed', details, error);
      showMessage('Notification settings are unavailable right now.', 'error');
    }
  }, []);

  useFocusEffect(useCallback(() => { loadNotificationStatus(); }, [loadNotificationStatus]));

  const toggleReminders = async (nextValue: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      if (nextValue) {
        const result = await enableExpirationReminders();
        setPermission(result.status);
        setEnabled(result.enabled);
        if (!result.enabled) showMessage(result.canAskAgain ? 'Notification permission was not granted. Try enabling reminders again.' : 'Notifications are blocked. Open device settings to allow ShelfLife reminders.', 'info');
        else showMessage('Expiration reminders are on.', 'success');
      } else {
        await disableExpirationReminders();
        setEnabled(false);
        showMessage('Expiration reminders are off.', 'info');
      }
    } catch (error) {
      const details = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error), stack: undefined };
      console.error('[ShelfLife Settings] expiration reminder toggle failed', details, error);
      showMessage('We could not update reminders. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const testNotification = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await sendTestNotification();
      showMessage('Test notification scheduled. It should appear shortly.', 'success');
    } catch (error) {
      const details = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error), stack: undefined };
      console.error('[ShelfLife Settings] test notification failed', details, error);
      showMessage('The test notification could not be scheduled. Check notification permissions.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const permissionGranted = permission === 'granted';
  const permissionLabel = permissionGranted ? 'Permission allowed' : permission === 'denied' ? 'Permission blocked' : 'Permission not requested';
  const notificationDescription = enabled && permissionGranted
    ? 'On · Reminders arrive at 9:00 AM the day before expiration.'
    : permission === 'denied'
      ? 'Permission denied · Open device settings to allow reminders.'
      : 'Off · Get a reminder one day before food expires.';

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      <Text style={[styles.description, { color: colors.mutedText }]}>Make ShelfLife work your way.</Text>

      <SettingsSection title="Notifications">
        <View style={styles.notificationRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}>
            <AppIcon name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }} color={colors.tint} size={20} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Expiration reminders</Text>
            <Text style={[styles.rowDescription, { color: colors.mutedText }]}>{notificationDescription}</Text>
          </View>
          <Switch
            accessibilityLabel="Expiration reminders"
            accessibilityHint="Turns daily expiration reminders on or off"
            accessibilityState={{ checked: enabled, disabled: busy }}
            value={enabled}
            onValueChange={toggleReminders}
            disabled={busy}
            trackColor={{ false: colors.border, true: colors.tint }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={[styles.permissionRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.permissionLabel, { color: colors.mutedText }]}>Notification access</Text>
          <Text style={[styles.permissionValue, { color: permissionGranted ? colors.success : permission === 'denied' ? colors.danger : colors.warning }]}>{permissionLabel}</Text>
        </View>
        <Text style={[styles.scheduleHint, { color: colors.mutedText }]}>ShelfLife schedules one local reminder at 9:00 AM on the day before an item expires.</Text>
        {permission === 'denied' ? <Pressable accessibilityRole="button" accessibilityLabel="Open device notification settings" accessibilityHint="Opens Android settings so notifications can be allowed" onPress={openNotificationSettings} style={styles.settingsLink}><Text style={[styles.linkText, { color: colors.tint }]}>Open device notification settings</Text><SymbolView name={{ ios: 'arrow.up.right', android: 'open_in_new', web: 'open_in_new' }} tintColor={colors.tint} size={16} /></Pressable> : null}
        {enabled && permissionGranted ? <Pressable accessibilityRole="button" accessibilityLabel="Send test notification" accessibilityHint="Schedules a local test notification" accessibilityState={{ disabled: busy, busy }} onPress={testNotification} disabled={busy} style={({ pressed }) => [styles.testButton, { borderColor: colors.border, opacity: busy ? 0.55 : pressed ? 0.7 : 1 }]}>{busy ? <ActivityIndicator color={colors.tint} size="small" /> : null}<Text style={[styles.testText, { color: colors.tint }]}>{busy ? 'Scheduling…' : 'Send test notification'}</Text></Pressable> : null}
        {message ? <Feedback message={message} tone={messageTone} colors={colors} /> : null}
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingRow icon={{ ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' }} title="Appearance" description="Follow your device theme" hint="Appearance follows the light or dark theme selected on your device." onPress={() => {}} last />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingRow icon={{ ios: 'info.circle.fill', android: 'info', web: 'info' }} title="About ShelfLife" description="Version 1.0.0" hint="Opens information about ShelfLife." onPress={() => {}} />
        <SettingRow icon={{ ios: 'questionmark.circle.fill', android: 'help', web: 'help' }} title="Help & feedback" description="Have a question or suggestion?" hint="Opens help and feedback." onPress={() => {}} last />
      </SettingsSection>

      <Text style={[styles.footer, { color: colors.mutedText }]}>ShelfLife • Fresh food, less waste</Text>
    </ScrollView>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = Colors[useColorScheme()];
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.mutedText }]}>{title.toUpperCase()}</Text><View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View></View>;
}

function SettingRow({ icon, title, description, onPress, hint, last }: SettingRowProps & { last?: boolean }) {
  const colors = Colors[useColorScheme()];
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={hint} accessibilityState={{ disabled: !onPress }} onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }, !last && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
    <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}><SymbolView name={icon} tintColor={colors.tint} size={20} /></View>
    <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.rowDescription, { color: colors.mutedText }]}>{description}</Text></View>
    <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} tintColor={colors.mutedText} size={17} />
  </Pressable>;
}

function Feedback({ message, tone, colors }: { message: string; tone: FeedbackTone; colors: typeof Colors.light }) {
  if (tone === 'success') return <SuccessState message={message} />;
  const icon: IconName = tone === 'error' ? { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' } : { ios: 'info.circle.fill', android: 'info', web: 'info' };
  const iconColor = tone === 'error' ? colors.danger : colors.warning;
  return <View accessible accessibilityLabel={message} style={[styles.feedback, { backgroundColor: colors.accent }]}><AppIcon name={icon} color={iconColor} size={18} /><Text style={[styles.feedbackText, { color: colors.text }]}>{message}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  title: { ...Typography.display, marginBottom: Spacing.xxs },
  description: { ...Typography.body, marginBottom: Spacing.xxl },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { ...Typography.eyebrow, marginBottom: Spacing.xs, marginLeft: Spacing.xs },
  sectionCard: { borderRadius: Radii.xl, borderWidth: 1, overflow: 'hidden' },
  notificationRow: { minHeight: 96, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center' },
  row: { minHeight: 76, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  rowCopy: { flex: 1, paddingRight: Spacing.xs },
  rowTitle: { ...Typography.bodyStrong, marginBottom: Spacing.xxs },
  rowDescription: { ...Typography.caption },
  permissionRow: { minHeight: 44, paddingHorizontal: Spacing.md, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  permissionLabel: { ...Typography.caption },
  permissionValue: { ...Typography.caption, fontWeight: '800' },
  scheduleHint: { ...Typography.caption, paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, paddingBottom: Spacing.sm },
  settingsLink: { minHeight: ControlSizes.minTouchTarget, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  linkText: { ...Typography.caption, fontWeight: '800' },
  testButton: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, minHeight: ControlSizes.minTouchTarget, borderWidth: 1, borderRadius: Radii.md, flexDirection: 'row', gap: Spacing.xs, alignItems: 'center', justifyContent: 'center' },
  testText: { ...Typography.caption, fontWeight: '800' },
  feedback: { minHeight: ControlSizes.minTouchTarget, marginHorizontal: Spacing.md, marginBottom: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: Radii.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  feedbackText: { ...Typography.caption, flex: 1 },
  footer: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.xs },
});
