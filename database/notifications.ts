import { getDatabase } from './database';

export type ReminderRecord = {
  itemId: number;
  notificationId: string;
  scheduledFor: string;
};

const REMINDERS_ENABLED_KEY = 'expirationRemindersEnabled';

export async function getRemindersEnabled() {
  const database = await getDatabase();
  const setting = await database.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', REMINDERS_ENABLED_KEY);
  return setting?.value === 'true';
}

export async function setRemindersEnabled(enabled: boolean) {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    REMINDERS_ENABLED_KEY,
    String(enabled)
  );
}

export async function listReminderRecords() {
  const database = await getDatabase();
  return database.getAllAsync<ReminderRecord>('SELECT itemId, notificationId, scheduledFor FROM notification_reminders');
}

export async function getReminderRecord(itemId: number) {
  const database = await getDatabase();
  return database.getFirstAsync<ReminderRecord>('SELECT itemId, notificationId, scheduledFor FROM notification_reminders WHERE itemId = ?', itemId);
}

export async function saveReminderRecord(record: ReminderRecord) {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO notification_reminders (itemId, notificationId, scheduledFor) VALUES (?, ?, ?)
     ON CONFLICT(itemId) DO UPDATE SET notificationId = excluded.notificationId, scheduledFor = excluded.scheduledFor`,
    record.itemId,
    record.notificationId,
    record.scheduledFor
  );
}

export async function deleteReminderRecord(itemId: number) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM notification_reminders WHERE itemId = ?', itemId);
}

export async function clearReminderRecords() {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM notification_reminders');
}
