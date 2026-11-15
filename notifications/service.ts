import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { deleteReminderRecord, getReminderRecord, getRemindersEnabled, listReminderRecords, saveReminderRecord, setRemindersEnabled } from '@/database/notifications';
import { listInventoryItems } from '@/database/inventory';
import type { InventoryItem } from '@/types/inventory';
import { dateKeyToDate, getExpirationStatus, getTodayDateKey } from '@/utils/dates';

export const EXPIRATION_CHANNEL_ID = 'expiration-reminders';
const EXPIRATION_REMINDER_KIND = 'shelflife-expiration-reminder';
let expirationChannelPromise: Promise<void> | null = null;

function logNotificationError(operation: string, error: unknown) {
  const details = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error), stack: undefined };
  console.error(`[ShelfLife notifications] ${operation} failed`, details, error);
}

function logNotificationWarning(operation: string, error: unknown) {
  const details = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error), stack: undefined };
  console.warn(`[ShelfLife notifications] ${operation} warning`, details, error);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function configureNotificationsAsync() {
  if (Platform.OS !== 'android') return;
  if (!expirationChannelPromise) {
    expirationChannelPromise = Notifications.setNotificationChannelAsync(EXPIRATION_CHANNEL_ID, {
      name: 'Expiration Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    }).then(() => undefined).catch((error) => {
      expirationChannelPromise = null;
      logNotificationError('create Android expiration-reminders channel', error);
      throw error;
    });
  }
  await expirationChannelPromise;
}

export async function getReminderPermissionStatus() {
  return (await readReminderPermission()).status;
}

async function readReminderPermission() {
  try {
    return await Notifications.getPermissionsAsync();
  } catch (error) {
    logNotificationError('read notification permission', error);
    throw error;
  }
}

export async function enableExpirationReminders() {
  await configureNotificationsAsync();
  const existing = await readReminderPermission();
  let permission = existing;
  if (existing.status !== 'granted') {
    try {
      permission = await Notifications.requestPermissionsAsync();
    } catch (error) {
      logNotificationError('request notification permission', error);
      throw error;
    }
  }

  if (permission.status !== 'granted') {
    try { await setRemindersEnabled(false); } catch (error) { logNotificationError('persist disabled preference after denied permission', error); throw error; }
    return { enabled: false, status: permission.status, canAskAgain: permission.canAskAgain };
  }

  try { await setRemindersEnabled(true); } catch (error) { logNotificationError('persist enabled preference', error); throw error; }
  try {
    await reconcileExpirationReminders();
  } catch (error) {
    logNotificationError('reconcile reminders while enabling', error);
    try { await disableExpirationReminders(); } catch (rollbackError) { logNotificationError('roll back failed enable', rollbackError); }
    throw error;
  }
  return { enabled: true, status: permission.status, canAskAgain: permission.canAskAgain };
}

export async function disableExpirationReminders() {
  await setRemindersEnabled(false);
  const records = await listReminderRecords();
  await Promise.all(records.map(async (record) => {
    try { await Notifications.cancelScheduledNotificationAsync(record.notificationId); } catch (error) { logNotificationWarning(`cancel reminder ${record.itemId}`, error); }
    await deleteReminderRecord(record.itemId);
  }));
}

export async function openNotificationSettings() {
  await Linking.openSettings();
}

function reminderDateForItem(item: InventoryItem) {
  if (getExpirationStatus(item.expirationDate) === 'expired' || item.expirationDate <= getTodayDateKey()) return null;
  const expiration = dateKeyToDate(item.expirationDate);
  expiration.setDate(expiration.getDate() - 1);
  expiration.setHours(9, 0, 0, 0);
  return expiration;
}

async function scheduleReminder(item: InventoryItem, reminderDate: Date) {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Food expiration reminder',
      body: `Your ${item.name} expires tomorrow. Check your inventory!`,
      data: { kind: EXPIRATION_REMINDER_KIND, itemId: item.id },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
      channelId: EXPIRATION_CHANNEL_ID,
    },
  });
  await saveReminderRecord({ itemId: item.id, notificationId, scheduledFor: reminderDate.toISOString() });
}

export async function reconcileExpirationReminders() {
  if (!(await getRemindersEnabled())) return;
  await configureNotificationsAsync();
  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;

  const [items, records, scheduled] = await Promise.all([
    listInventoryItems(),
    listReminderRecords(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const scheduledIds = new Set(scheduled.map((notification) => notification.identifier));
  const recordsByItem = new Map(records.map((record) => [record.itemId, record]));

  for (const record of records) {
    const item = itemById.get(record.itemId);
    const reminderDate = item ? reminderDateForItem(item) : null;
    const shouldKeep = reminderDate && reminderDate.getTime() > Date.now() && record.scheduledFor === reminderDate.toISOString() && scheduledIds.has(record.notificationId);
    if (!shouldKeep) {
      try { await Notifications.cancelScheduledNotificationAsync(record.notificationId); } catch (error) { logNotificationWarning(`cancel stale reminder ${record.itemId}`, error); }
      await deleteReminderRecord(record.itemId);
    }
  }

  for (const notification of scheduled) {
    if (notification.content.data?.kind === EXPIRATION_REMINDER_KIND && !records.some((record) => record.notificationId === notification.identifier)) {
      try { await Notifications.cancelScheduledNotificationAsync(notification.identifier); } catch (error) { logNotificationWarning('cancel orphan ShelfLife reminder', error); }
    }
  }

  for (const item of items) {
    const reminderDate = reminderDateForItem(item);
    const existing = recordsByItem.get(item.id);
    if (reminderDate && reminderDate.getTime() > Date.now() && (!existing || existing.scheduledFor !== reminderDate.toISOString() || !scheduledIds.has(existing.notificationId))) {
      if (existing) {
        try { await Notifications.cancelScheduledNotificationAsync(existing.notificationId); } catch (error) { logNotificationWarning(`cancel outdated reminder ${item.id}`, error); }
        await deleteReminderRecord(item.id);
      }
      try { await scheduleReminder(item, reminderDate); } catch (error) { logNotificationError(`schedule expiration reminder for item ${item.id}`, error); }
    }
  }
}

export async function syncReminderForItem(item: InventoryItem) {
  if (!(await getRemindersEnabled()) || (await getReminderPermissionStatus()) !== 'granted') return;
  const record = await getReminderRecord(item.id);
  if (record) {
    try { await Notifications.cancelScheduledNotificationAsync(record.notificationId); } catch (error) { logNotificationWarning(`cancel edited reminder ${item.id}`, error); }
    await deleteReminderRecord(item.id);
  }
  const reminderDate = reminderDateForItem(item);
  if (reminderDate && reminderDate.getTime() > Date.now()) {
    try { await scheduleReminder(item, reminderDate); } catch (error) { logNotificationError(`schedule edited reminder for item ${item.id}`, error); }
  }
}

export async function removeReminderForItem(itemId: number) {
  const record = await getReminderRecord(itemId);
  if (!record) return;
  try { await Notifications.cancelScheduledNotificationAsync(record.notificationId); } catch (error) { logNotificationWarning(`cancel deleted reminder ${itemId}`, error); }
  await deleteReminderRecord(itemId);
}

export async function sendTestNotification() {
  await configureNotificationsAsync();
  if ((await getReminderPermissionStatus()) !== 'granted') {
    throw new Error('Notification permission is not granted. Enable notifications in Android settings first.');
  }
  await Notifications.scheduleNotificationAsync({
    content: { title: 'ShelfLife reminders are on', body: 'This is a test expiration reminder.', data: { kind: 'shelflife-test' }, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
}
