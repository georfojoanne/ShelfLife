export type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  purchaseDate: string;
  expirationDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryInput = Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>;
