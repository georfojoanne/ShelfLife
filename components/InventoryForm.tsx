import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon, AppTextInput, ErrorState, FilterChip, LoadingState, PrimaryButton } from '@/components/ShelfLifeUI';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ControlSizes, Radii, Spacing, Typography } from '@/constants/Theme';
import { createInventoryItem, deleteInventoryItem, getInventoryItem, updateInventoryItem } from '@/database/inventory';
import { removeReminderForItem, syncReminderForItem } from '@/notifications/service';
import type { InventoryInput } from '@/types/inventory';
import { addDays, dateKeyToDate, formatDate, getTodayDateKey } from '@/utils/dates';

const categories = ['Produce', 'Dairy', 'Pantry', 'Other'];
const units = ['pcs', 'pack', 'kg', 'g', 'L', 'ml'];
type DateField = 'purchaseDate' | 'expirationDate';
type FormState = Omit<InventoryInput, 'quantity'> & { quantity: string };
type FormErrors = Partial<Record<keyof FormState | 'form', string>>;
type ThemeColors = typeof Colors.light;

export function InventoryForm({ itemId }: { itemId: number | null }) {
  const colors = Colors[useColorScheme()];
  const router = useRouter();
  const today = getTodayDateKey();
  const [form, setForm] = useState<FormState>({
    name: '', quantity: '', unit: 'pcs', category: 'Produce', purchaseDate: today, expirationDate: addDays(today, 7), notes: '',
  });
  const [picker, setPicker] = useState<DateField | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(Boolean(itemId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    getInventoryItem(itemId).then((item) => {
      if (item) {
        setForm({ ...item, quantity: String(item.quantity), notes: item.notes ?? '' });
      } else {
        setErrors({ form: 'This item could not be found.' });
      }
    }).catch(() => setErrors({ form: 'We could not load this item.' })).finally(() => setLoading(false));
  }, [itemId]);

  const setValue = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Enter an item name.';
    const quantity = Number(form.quantity);
    if (!form.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) nextErrors.quantity = 'Quantity must be greater than zero.';
    if (!form.unit) nextErrors.unit = 'Choose a unit.';
    if (!form.category) nextErrors.category = 'Choose a category.';
    if (!form.purchaseDate) nextErrors.purchaseDate = 'Choose a purchase date.';
    if (!form.expirationDate) nextErrors.expirationDate = 'Choose an expiration date.';
    if (form.purchaseDate && form.expirationDate && form.expirationDate < form.purchaseDate) nextErrors.expirationDate = 'Expiration cannot be earlier than purchase.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    const input: InventoryInput = {
      name: form.name.trim(), quantity: Number(form.quantity), unit: form.unit, category: form.category,
      purchaseDate: form.purchaseDate, expirationDate: form.expirationDate, notes: (form.notes ?? '').trim() || null,
    };
    try {
      const savedId = itemId ?? await createInventoryItem(input);
      if (itemId) await updateInventoryItem(itemId, input);
      const savedItem = await getInventoryItem(savedId);
      if (savedItem) {
        try { await syncReminderForItem(savedItem); } catch { /* Scheduling failure must not undo a successful inventory save. */ }
      }
      router.replace('/(tabs)/two');
    } catch {
      setErrors({ form: 'We could not save this item. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!itemId) return;
    Alert.alert('Delete item?', 'This item will be removed from your inventory.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { try { await removeReminderForItem(itemId); } catch { /* The inventory delete remains authoritative. */ } await deleteInventoryItem(itemId); router.replace('/(tabs)/two'); }
        catch { setErrors({ form: 'We could not delete this item. Please try again.' }); }
      } },
    ]);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setPicker(null);
    if (event.type === 'set' && selectedDate && picker) setValue(picker, getTodayDateKey(selectedDate));
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><LoadingState label="Loading item" /></View>;

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" accessibilityHint="Returns to inventory" onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <AppIcon name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} color={colors.text} size={22} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>{itemId ? 'Edit item' : 'Add item'}</Text>
          <View style={styles.backButton} />
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>{itemId ? 'Update the details for this item.' : 'Track an item before it gets forgotten.'}</Text>

        {errors.form ? <ErrorState message={errors.form} /> : null}

        <FormSection title="Item Information" colors={colors}>
          <AppTextInput
            label="Item name *"
            value={form.name}
            onChangeText={(value) => setValue('name', value)}
            placeholder="e.g. Spinach"
            hint="Use a name you will recognize later."
            error={errors.name}
            returnKeyType="next"
          />
        </FormSection>

        <FormSection title="Quantity and Category" colors={colors}>
          <AppTextInput
            label="Quantity *"
            value={form.quantity}
            onChangeText={(value) => setValue('quantity', value.replace(',', '.'))}
            placeholder="e.g. 2"
            hint="Enter a number greater than zero."
            error={errors.quantity}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <ChoiceField label="Unit *" options={units} value={form.unit} onChange={(value) => setValue('unit', value)} colors={colors} error={errors.unit} />
          <ChoiceField label="Category *" options={categories} value={form.category} onChange={(value) => setValue('category', value)} colors={colors} error={errors.category} />
        </FormSection>

        <FormSection title="Dates" description="Dates are saved consistently for accurate expiration tracking." colors={colors}>
          <DateFieldButton label="Purchase date *" value={form.purchaseDate} onPress={() => setPicker('purchaseDate')} colors={colors} error={errors.purchaseDate} />
          <DateFieldButton label="Expiration date *" value={form.expirationDate} onPress={() => setPicker('expirationDate')} colors={colors} error={errors.expirationDate} />
        </FormSection>

        {picker ? <DateTimePicker value={dateKeyToDate(form[picker])} mode="date" display="calendar" onChange={handleDateChange} /> : null}

        <FormSection title="Notes" description="Optional details such as where you stored the item." colors={colors}>
          <AppTextInput
            label="Notes (optional)"
            value={form.notes ?? ''}
            onChangeText={(value) => setValue('notes', value)}
            placeholder="Add a note"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.notes}
          />
        </FormSection>

        <PrimaryButton label={itemId ? 'Save changes' : 'Save item'} onPress={save} loading={saving} loadingLabel="Saving item" disabled={loading} accessibilityHint="Saves this item to your inventory" />
        {itemId ? <Pressable accessibilityRole="button" accessibilityLabel="Delete item" accessibilityHint="Permanently removes this item after confirmation" accessibilityState={{ disabled: saving }} disabled={saving} onPress={remove} style={styles.deleteButton}><Text style={[styles.deleteText, { color: colors.danger }]}>Delete item</Text></Pressable> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormSection({ title, description, colors, children }: { title: string; description?: string; colors: ThemeColors; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>{description ? <Text style={[styles.sectionDescription, { color: colors.mutedText }]}>{description}</Text> : null}{children}</View>;
}

function ChoiceField({ label, options, value, onChange, colors, error }: { label: string; options: string[]; value: string; onChange: (value: string) => void; colors: ThemeColors; error?: string }) {
  return <View style={styles.field}><Text style={[styles.label, { color: colors.text }]}>{label}</Text><View style={styles.choices}>{options.map((option) => <FilterChip key={option} label={option} selected={option === value} onPress={() => onChange(option)} accessibilityHint={`Select ${option} as the ${label.replace(' *', '').toLowerCase()}`} />)}</View>{error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}</View>;
}

function DateFieldButton({ label, value, onPress, colors, error }: { label: string; value: string; onPress: () => void; colors: ThemeColors; error?: string }) {
  return <View style={styles.field}><Text style={[styles.label, { color: colors.text }]}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${formatDate(value)}`} accessibilityHint="Opens the date picker" onPress={onPress} style={({ pressed }) => [styles.input, styles.dateButton, { borderColor: error ? colors.danger : colors.border, backgroundColor: colors.card, opacity: pressed ? 0.75 : 1 }]}><Text style={[styles.dateText, { color: colors.text }]}>{formatDate(value)}</Text><AppIcon name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }} color={colors.tint} size={19} /></Pressable>{error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  content: { padding: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: ControlSizes.minTouchTarget, height: ControlSizes.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.title },
  subtitle: { ...Typography.body, textAlign: 'center', marginBottom: Spacing.xl },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.section, marginBottom: Spacing.xs },
  sectionDescription: { ...Typography.caption, marginBottom: Spacing.md },
  field: { marginBottom: Spacing.md },
  label: { ...Typography.label, marginBottom: Spacing.xs },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  input: { minHeight: ControlSizes.inputHeight, borderWidth: 1, borderRadius: Radii.lg, paddingHorizontal: Spacing.md },
  dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  dateText: { ...Typography.body },
  error: { ...Typography.caption, marginTop: Spacing.xxs },
  notes: { minHeight: 104, paddingTop: Spacing.md },
  deleteButton: { minHeight: ControlSizes.minTouchTarget, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
  deleteText: { ...Typography.bodyStrong },
});
