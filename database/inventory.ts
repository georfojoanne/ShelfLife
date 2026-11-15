import { getDatabase } from './database';

import type { InventoryInput, InventoryItem } from '@/types/inventory';

export async function listInventoryItems() {
  const database = await getDatabase();
  return database.getAllAsync<InventoryItem>(
    'SELECT * FROM inventory ORDER BY expirationDate ASC, name COLLATE NOCASE ASC'
  );
}

export async function getInventoryItem(id: number) {
  const database = await getDatabase();
  return database.getFirstAsync<InventoryItem>('SELECT * FROM inventory WHERE id = ?', id);
}

export async function createInventoryItem(input: InventoryInput) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `INSERT INTO inventory
      (name, quantity, unit, category, purchaseDate, expirationDate, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.name,
    input.quantity,
    input.unit,
    input.category,
    input.purchaseDate,
    input.expirationDate,
    input.notes,
    now,
    now
  );
  return result.lastInsertRowId;
}

export async function updateInventoryItem(id: number, input: InventoryInput) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE inventory
     SET name = ?, quantity = ?, unit = ?, category = ?, purchaseDate = ?, expirationDate = ?, notes = ?, updatedAt = ?
     WHERE id = ?`,
    input.name,
    input.quantity,
    input.unit,
    input.category,
    input.purchaseDate,
    input.expirationDate,
    input.notes,
    new Date().toISOString(),
    id
  );
}

export async function deleteInventoryItem(id: number) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM inventory WHERE id = ?', id);
}
