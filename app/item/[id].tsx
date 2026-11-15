import { useLocalSearchParams } from 'expo-router';

import { InventoryForm } from '@/components/InventoryForm';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  return <InventoryForm itemId={Number.isFinite(itemId) ? itemId : null} />;
}
