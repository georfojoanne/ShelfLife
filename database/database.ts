import * as SQLite from 'expo-sqlite';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('shelflife.db')
      .then(async (database) => {
        await database.execAsync(`
          PRAGMA foreign_keys = ON;
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            name TEXT NOT NULL,
            quantity REAL NOT NULL CHECK (quantity > 0),
            unit TEXT NOT NULL,
            category TEXT NOT NULL,
            purchaseDate TEXT NOT NULL,
            expirationDate TEXT NOT NULL,
            notes TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            CHECK (expirationDate >= purchaseDate)
          );
          CREATE INDEX IF NOT EXISTS inventory_expiration_date_idx ON inventory (expirationDate);
          CREATE INDEX IF NOT EXISTS inventory_category_idx ON inventory (category);
          CREATE TABLE IF NOT EXISTS notification_reminders (
            itemId INTEGER PRIMARY KEY NOT NULL,
            notificationId TEXT NOT NULL,
            scheduledFor TEXT NOT NULL,
            FOREIGN KEY (itemId) REFERENCES inventory (id) ON DELETE CASCADE
          );
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          );
        `);
        return database;
      })
      .catch((error) => {
        databasePromise = null;
        throw error;
      });
  }

  return databasePromise;
}

export const initializeDatabase = getDatabase;
