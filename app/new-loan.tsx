import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Image, View as RNView, Modal } from 'react-native';
import { Text, View, Screen, Card } from '@/components/Themed';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { X, Camera, Wallet, Box, Plus, ChevronDown, BellDot, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { scheduleLoanReminderForUser } from '@/services/notificationService';
import { CURRENCIES, getCurrencySymbol } from '@/constants/Currencies';
import { getOrCreateUserPreferences, sanitizePreferredCurrencies, updateUserPreferences } from '@/services/userPreferences';

const REMINDER_OPTIONS = [
  { label: 'Off', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Custom', value: 'custom' },
] as const;

const DUE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
];

const TRANSACTION_PRESETS = [
  {
    key: 'lent-money',
    title: 'I lent money',
    subtitle: 'Track money someone should return to you.',
    category: 'money' as const,
    type: 'lent' as const,
    accent: '#10B981',
    icon: Wallet,
  },
  {
    key: 'borrowed-money',
    title: 'I borrowed money',
    subtitle: 'Track money you need to pay back.',
    category: 'money' as const,
    type: 'borrowed' as const,
    accent: '#EF4444',
    icon: Wallet,
  },
  {
    key: 'lent-item',
    title: 'I gave an item',
    subtitle: 'Track a personal item you want back.',
    category: 'item' as const,
    type: 'lent' as const,
    accent: '#0F172A',
    icon: Box,
  },
  {
    key: 'borrowed-item',
    title: 'I received an item',
    subtitle: 'Track an item you need to return.',
    category: 'item' as const,
    type: 'borrowed' as const,
    accent: '#6366F1',
    icon: Box,
  },
];

type ReminderFrequency = 'none' | 'daily' | 'weekly' | 'custom' | 'monthly' | 'yearly';

export default function NewLoanScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [category, setCategory] = useState<'money' | 'item'>('money');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'lent' | 'borrowed'>('lent');
  const [contactId, setContactId] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>('none');
  const [reminderInterval, setReminderInterval] = useState('1');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['USD']);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const base64StringRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void fetchContacts();
      void loadCurrencyPreferences();
    }, [user?.id])
  );

  useEffect(() => {
    if (!dueDate) {
      setDueDate(getDateWithOffset(30));
    }
  }, [dueDate]);

  const loadCurrencyPreferences = async () => {
    if (!user?.id) return;

    const { data, error } = await getOrCreateUserPreferences(user.id);
    if (error) {
      console.error('currency preferences load failed:', error.message);
      return;
    }

    const preferred = sanitizePreferredCurrencies(data?.preferred_currencies);
    setAvailableCurrencies(preferred);
    setCurrency((current) => (preferred.includes(current) ? current : preferred[0]));
  };

  const addableCurrencies = CURRENCIES.filter((c) => !availableCurrencies.includes(c.code));

  const openAddCurrencyPicker = () => {
    if (addableCurrencies.length === 0) {
      Alert.alert('Info', 'All available currencies are already enabled.');
      return;
    }
    setCurrencyPickerVisible(true);
  };

  const handleAddCurrency = async (code: string) => {
    const next = sanitizePreferredCurrencies([...availableCurrencies, code]);
    setAvailableCurrencies(next);
    setCurrency(code);
    setCurrencyPickerVisible(false);

    if (!user?.id) return;
    const { error } = await updateUserPreferences(user.id, { preferred_currencies: next });
    if (error) {
      Alert.alert('Error', error.message);
      await loadCurrencyPreferences();
    }
  };

  const fetchContacts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('contacts')
      .select('id, name, target_user_id')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    const newContacts = data || [];

    if (newContacts.length > contacts.length) {
      const addedContact = newContacts.find((nc) => !contacts.some((oc) => oc.id === nc.id));
      if (addedContact || (contacts.length === 0 && newContacts.length === 1)) {
        setContactId(addedContact ? addedContact.id : newContacts[0].id);
      }
    }

    setContacts(newContacts);
  };

  const getDefaultDueDate = () => getDateWithOffset(30);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      base64StringRef.current = result.assets[0].base64 || null;
    }
  };

  const applyPreset = (nextCategory: 'money' | 'item', nextType: 'lent' | 'borrowed') => {
    setCategory(nextCategory);
    setType(nextType);
  };

  const onSave = async () => {
    if (loading) return;

    const parsedAmount = parseFloat(amount);
    const normalizedItemName = itemName.trim();
    const normalizedDueDate = dueDate.trim();
    const effectiveDueDate = normalizedDueDate || getDefaultDueDate();
    const parsedReminderInterval = parseInt(reminderInterval, 10) || 1;

    if (category === 'money' && (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0)) {
      Alert.alert('Error', 'Amount is required for money lending/borrowing.');
      return;
    }
    if (category === 'item' && !normalizedItemName) {
      Alert.alert('Error', 'Item name is required.');
      return;
    }
    if (!contactId) {
      Alert.alert('Error', 'Contact is required.');
      return;
    }
    if (normalizedDueDate && Number.isNaN(new Date(normalizedDueDate).getTime())) {
      Alert.alert('Error', 'Due date must be a valid date (YYYY-MM-DD).');
      return;
    }

    setLoading(true);
    try {
      let evidenceUrl: string | null = null;

      if (image && base64StringRef.current) {
        const fileName = `${user?.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, decode(base64StringRef.current), {
            contentType: 'image/jpeg',
          });

        if (uploadError) throw uploadError;
        evidenceUrl = fileName;
      }

      const selectedContact = contacts.find((c) => c.id === contactId);
      const targetUserId = selectedContact?.target_user_id;
      if (!user?.id) {
        throw new Error('You need to be signed in before saving a transaction.');
      }

      const payload: Record<string, any> = {
        user_id: user.id,
        contact_id: contactId,
        target_user_id: targetUserId || null,
        amount: category === 'money' ? parsedAmount : null,
        currency: category === 'money' ? currency : null,
        category,
        item_name: category === 'item' ? normalizedItemName : null,
        type,
        description: description.trim() || null,
        due_date: effectiveDueDate,
        status: 'active',
        validation_status: targetUserId ? 'pending' : 'none',
        evidence_url: evidenceUrl,
        reminder_frequency: reminderFrequency,
        reminder_interval: parsedReminderInterval,
      };

      let newLoan: any = null;
      let insertError: any = null;
      const maxAttempts = 4;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const { data, error } = await supabase
          .from('loans')
          .insert([payload])
          .select()
          .single();

        if (!error) {
          newLoan = data;
          insertError = null;
          break;
        }

        insertError = error;
        const message = (error.message || '').toLowerCase();

        if (category === 'item' && message.includes('null value in column') && message.includes('amount')) {
          payload.amount = 0;
          continue;
        }
        if (category === 'item' && message.includes('null value in column') && message.includes('currency')) {
          payload.currency = currency || 'USD';
          continue;
        }
        if (message.includes('invalid input value for enum') && message.includes('none')) {
          payload.reminder_frequency = null;
          continue;
        }

        const missingColumnMatch = /column ["']?([a-z0-9_]+)["']? does not exist/i.exec(error.message || '');
        if (missingColumnMatch?.[1]) {
          delete payload[missingColumnMatch[1]];
          continue;
        }

        break;
      }

      if (insertError) throw insertError;
      if (!newLoan?.id) {
        throw new Error('Transaction could not be created. Please try again.');
      }

      if (targetUserId && newLoan) {
        await supabase.from('p2p_requests').insert([
          {
            type: 'loan_validation',
            loan_id: newLoan.id,
            from_user_id: user.id,
            to_user_id: targetUserId,
            message: `New ${category} ${type === 'lent' ? 'lent' : 'borrowed'} transaction recorded with you.`,
            status: 'pending',
          },
        ]);
      }

      if (reminderFrequency !== 'none' && newLoan) {
        await scheduleLoanReminderForUser(user.id, {
          loanId: newLoan.id,
          contactName: selectedContact?.name || 'Someone',
          amount: category === 'money' ? parsedAmount : 0,
          dueDate: effectiveDueDate,
          category,
          direction: type,
          frequency: reminderFrequency,
          interval: parsedReminderInterval,
          currency: category === 'money' ? currency : null,
          itemName: category === 'item' ? normalizedItemName : null,
        });
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('new-loan save failed:', error);
      Alert.alert('Error', error?.message || 'Could not save transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPreset = TRANSACTION_PRESETS.find((preset) => preset.category === category && preset.type === type) || TRANSACTION_PRESETS[0];
  const selectedContact = contacts.find((contact) => contact.id === contactId);
  const dueLabel = dueDate ? formatDueLabel(dueDate) : 'No due date selected';

  return (
    <Screen style={styles.container}>
      <Stack.Screen
        options={{
          title: 'New Transaction',
          headerTransparent: true,
          headerTintColor: '#0F172A',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <X size={24} color="#0F172A" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <Card style={styles.heroCard}>
            <Text style={styles.eyebrow}>Quick record</Text>
            <Text style={styles.heroTitle}>What happened?</Text>
            <Text style={styles.heroText}>Pick the closest action. The form below will only show what matters for that kind of record.</Text>
          </Card>

          <View style={styles.presetGrid}>
            {TRANSACTION_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const active = selectedPreset.key === preset.key;
              return (
                <TouchableOpacity
                  key={preset.key}
                  style={[styles.presetCard, active && styles.presetCardActive]}
                  onPress={() => applyPreset(preset.category, preset.type)}
                >
                  <RNView style={[styles.presetIcon, { backgroundColor: `${preset.accent}18` }]}>
                    <Icon size={20} color={preset.accent} />
                  </RNView>
                  <Text style={styles.presetTitle}>{preset.title}</Text>
                  <Text style={styles.presetSubtitle}>{preset.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Main details</Text>
            <Text style={styles.sectionSubtitle}>{selectedPreset.subtitle}</Text>

            {category === 'money' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>{getCurrencySymbol(currency)}</Text>
                  <TextInput
                    placeholder="0.00"
                    placeholderTextColor="#CBD5E1"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    style={styles.amountInput}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineList}>
                  {availableCurrencies.map((code) => (
                    <TouchableOpacity
                      key={code}
                      onPress={() => setCurrency(code)}
                      style={[styles.smallChip, currency === code && styles.smallChipActive]}
                    >
                      <Text style={[styles.smallChipText, currency === code && styles.smallChipTextActive]}>{code}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.addChip} onPress={openAddCurrencyPicker}>
                    <Plus size={14} color="#475569" />
                    <Text style={styles.addChipText}>Add currency</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Item name</Text>
                <TextInput
                  placeholder={type === 'lent' ? 'What did you give?' : 'What did you receive?'}
                  placeholderTextColor="#94A3B8"
                  value={itemName}
                  onChangeText={setItemName}
                  style={styles.input}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Contact</Text>
                <TouchableOpacity onPress={() => router.push('/new-contact')}>
                  <Text style={styles.linkText}>+ New Contact</Text>
                </TouchableOpacity>
              </View>
              {contacts.length === 0 ? (
                <Card style={styles.emptyInlineCard}>
                  <Text style={styles.emptyInlineText}>Add a contact first so this record has someone attached to it.</Text>
                  <TouchableOpacity style={styles.emptyInlineButton} onPress={() => router.push('/new-contact')}>
                    <Text style={styles.emptyInlineButtonText}>Add contact</Text>
                  </TouchableOpacity>
                </Card>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineList}>
                  {contacts.map((contact) => (
                    <TouchableOpacity
                      key={contact.id}
                      onPress={() => setContactId(contact.id)}
                      style={[styles.contactChip, contactId === contact.id && styles.contactChipActive]}
                    >
                      <Text style={[styles.contactChipText, contactId === contact.id && styles.contactChipTextActive]}>{contact.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Due date</Text>
            <Text style={styles.sectionSubtitle}>{dueLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineList}>
              {DUE_PRESETS.map((preset) => {
                const presetDate = getDateWithOffset(preset.days);
                const active = dueDate === presetDate;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.smallChip, active && styles.smallChipActive]}
                    onPress={() => setDueDate(presetDate)}
                  >
                    <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>{preset.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              value={dueDate}
              onChangeText={setDueDate}
              autoCapitalize="none"
              style={styles.input}
            />
          </Card>

          <TouchableOpacity style={styles.moreToggle} onPress={() => setShowMoreOptions((current) => !current)}>
            <RNView style={styles.moreToggleLeft}>
              <RNView style={styles.moreToggleIcon}>
                <ChevronDown size={18} color="#0F172A" style={showMoreOptions ? styles.rotatedIcon : undefined} />
              </RNView>
              <View>
                <Text style={styles.moreToggleTitle}>More options</Text>
                <Text style={styles.moreToggleText}>Notes, receipt photo, and reminders.</Text>
              </View>
            </RNView>
          </TouchableOpacity>

          {showMoreOptions && (
            <Card style={styles.sectionCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <View style={styles.inlineInputRow}>
                  <RNView style={styles.inlineLeadingIcon}>
                    <FileText size={18} color="#64748B" />
                  </RNView>
                  <TextInput
                    placeholder="Add context you may want later."
                    placeholderTextColor="#94A3B8"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    style={[styles.input, styles.textArea, styles.inputWithIcon]}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Photo evidence</Text>
                <TouchableOpacity style={styles.attachmentCard} onPress={pickImage}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.previewImage} />
                  ) : (
                    <RNView style={styles.attachmentEmpty}>
                      <Camera size={22} color="#94A3B8" />
                      <Text style={styles.attachmentTitle}>Add a receipt or proof</Text>
                      <Text style={styles.attachmentText}>Optional, but useful when you need context later.</Text>
                    </RNView>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Reminder</Text>
                  <BellDot size={16} color="#64748B" />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineList}>
                  {REMINDER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setReminderFrequency(option.value)}
                      style={[styles.smallChip, reminderFrequency === option.value && styles.smallChipActive]}
                    >
                      <Text style={[styles.smallChipText, reminderFrequency === option.value && styles.smallChipTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {reminderFrequency === 'custom' && (
                <View style={styles.inputGroupNoMargin}>
                  <Text style={styles.label}>Remind every X days</Text>
                  <TextInput
                    placeholder="3"
                    placeholderTextColor="#94A3B8"
                    value={reminderInterval}
                    onChangeText={setReminderInterval}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
              )}
            </Card>
          )}

          <Card style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>Ready to save</Text>
            <Text style={styles.summaryText}>
              {selectedPreset.title}
              {selectedContact ? ` with ${selectedContact.name}` : ''}
              {category === 'money' && amount ? ` for ${getCurrencySymbol(currency)}${amount}` : ''}
              {category === 'item' && itemName ? `: ${itemName}` : ''}
            </Text>
          </Card>

          <Modal
            animationType="slide"
            transparent
            visible={currencyPickerVisible}
            onRequestClose={() => setCurrencyPickerVisible(false)}
          >
            <RNView style={styles.currencyModalOverlay}>
              <Card style={styles.currencyModalCard}>
                <Text style={styles.currencyModalTitle}>Add Currency</Text>
                <ScrollView style={styles.currencyModalList}>
                  {addableCurrencies.map((c) => (
                    <TouchableOpacity
                      key={c.code}
                      style={styles.currencyModalItem}
                      onPress={() => {
                        void handleAddCurrency(c.code);
                      }}
                    >
                      <Text style={styles.currencyModalCode}>{c.code}</Text>
                      <Text style={styles.currencyModalName}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.currencyModalClose} onPress={() => setCurrencyPickerVisible(false)}>
                  <Text style={styles.currencyModalCloseText}>Close</Text>
                </TouchableOpacity>
              </Card>
            </RNView>
          </Modal>

          <TouchableOpacity onPress={onSave} disabled={loading} style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
            <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Transaction'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function getDateWithOffset(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDueLabel(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 'Enter a valid due date';
  }

  const diffDays = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays > 1) return `Due in ${diffDays} days`;
  if (diffDays === -1) return 'Was due yesterday';
  return `${Math.abs(diffDays)} days overdue`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 20,
    paddingTop: 116,
    paddingBottom: 48,
    gap: 16,
  },
  heroCard: {
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#64748B',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  heroText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
  },
  presetGrid: {
    gap: 12,
    backgroundColor: 'transparent',
  },
  presetCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetCardActive: {
    borderColor: '#0F172A',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  presetIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  presetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  presetSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
  },
  sectionCard: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 18,
    backgroundColor: 'transparent',
  },
  inputGroupNoMargin: {
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#475569',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    paddingVertical: 12,
  },
  inlineList: {
    gap: 10,
  },
  smallChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  smallChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  smallChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  smallChipTextActive: {
    color: '#FFFFFF',
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  addChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  emptyInlineCard: {
    padding: 18,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  emptyInlineText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 12,
  },
  emptyInlineButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  emptyInlineButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contactChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  contactChipActive: {
    backgroundColor: '#E0E7FF',
    borderColor: '#6366F1',
  },
  contactChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  contactChipTextActive: {
    color: '#3730A3',
  },
  moreToggle: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  moreToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  moreToggleIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  rotatedIcon: {
    transform: [{ rotate: '180deg' }],
  },
  moreToggleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  moreToggleText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  inlineInputRow: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  inlineLeadingIcon: {
    position: 'absolute',
    top: 16,
    left: 14,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  inputWithIcon: {
    paddingLeft: 44,
  },
  attachmentCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  attachmentEmpty: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  attachmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  attachmentText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  summaryCard: {
    padding: 18,
    backgroundColor: '#0F172A',
  },
  summaryEyebrow: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  summaryText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
  },
  currencyModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    padding: 16,
  },
  currencyModalCard: {
    padding: 20,
    maxHeight: '70%',
  },
  currencyModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  currencyModalList: {
    marginBottom: 16,
  },
  currencyModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  currencyModalCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  currencyModalName: {
    fontSize: 14,
    color: '#64748B',
  },
  currencyModalClose: {
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  currencyModalCloseText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  saveButton: {
    marginTop: 4,
    backgroundColor: '#6366F1',
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
