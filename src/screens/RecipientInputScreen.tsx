import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, ResolvedRecipientParams } from '../navigation/types';
import { useRepos } from '../navigation/RepoProvider';
import { detectInputType } from '../lib/recipient/detectInputType';
import {
  createExpoContactsDataSource,
  searchContactsByName,
  findContactByPhone,
  type ContactPermissionStatus,
} from '../lib/recipient/contactsService';
import { ContactUpiLinks } from '../lib/recipient/contactUpiLinks';
import { RecentRecipientsService } from '../lib/recipient/recentRecipients';
import type { Contact, ContactSearchMatch, RecentRecipient } from '../lib/recipient/recipientTypes';
import { phoneToUpi } from '../lib/upi/phoneToUpi';
import { CONTACT_ERRORS } from '../lib/errorMessages';
import { ContactMatchList } from '../components/ContactMatchList';
import { RecentRecipients } from '../components/RecentRecipients';
import { ErrorBanner } from '../components/ErrorBanner';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipientInput'>;

const NAME_SEARCH_DEBOUNCE_MS = 150;

/**
 * The unified recipient input: one text field that auto-detects whether the
 * user is typing a contact name, a phone number, or a UPI ID, backed by
 * on-device contact search. This replaces what would otherwise be three
 * separate screens — see the project plan for the full rationale.
 */
export function RecipientInputScreen({ navigation }: Props) {
  const { recentContactsRepo, contactLinksRepo } = useRepos();
  const recentService = useMemo(() => new RecentRecipientsService(recentContactsRepo), [recentContactsRepo]);
  const contactLinks = useMemo(() => new ContactUpiLinks(contactLinksRepo), [contactLinksRepo]);

  const [text, setText] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<ContactPermissionStatus | 'loading'>('loading');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [matches, setMatches] = useState<ContactSearchMatch[]>([]);
  const [preview, setPreview] = useState<ResolvedRecipientParams | null>(null);
  const [recent, setRecent] = useState<RecentRecipient[]>([]);

  // Contact permission is requested contextually, the first time this screen
  // opens — not eagerly at app launch — and denial never blocks the screen:
  // phone/UPI entry keep working with an empty contacts list.
  useEffect(() => {
    (async () => {
      const dataSource = createExpoContactsDataSource();
      const status = await dataSource.requestPermission();
      setPermissionStatus(status);
      if (status === 'granted') {
        try {
          setContacts(await dataSource.getAllContacts());
        } catch {
          setContacts([]);
        }
      }
    })();
  }, []);

  useEffect(() => {
    recentService.list(10).then(setRecent);
  }, [recentService]);

  const analysis = useMemo(() => detectInputType(text), [text]);

  // Debounced live contact-name search.
  useEffect(() => {
    if (analysis.type !== 'contact_name') {
      setMatches([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      setMatches(searchContactsByName(analysis.query, contacts));
    }, NAME_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [analysis, contacts]);

  // Resolves a live preview for phone/UPI-shaped input (contact-name matches
  // are resolved on tap instead, from the list above).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (analysis.type === 'phone') {
        const contact = findContactByPhone(analysis.digits, contacts);
        const contactKey = contact?.id ?? analysis.digits;
        const learnedUpi = await contactLinks.resolve(contactKey);
        if (cancelled) return;
        setPreview({
          method: 'phone_entry',
          originalInput: text,
          upiId: learnedUpi ?? analysis.upiId,
          name: contact?.name,
          phone: analysis.digits,
          isContact: Boolean(contact),
          contactId: contact?.id,
        });
      } else if (analysis.type === 'upi_id') {
        const contactKey = await contactLinks.findContactKeyForUpi(analysis.upiId);
        const contact = contactKey ? contacts.find((c) => c.id === contactKey) : undefined;
        if (cancelled) return;
        setPreview({
          method: 'upi_entry',
          originalInput: text,
          upiId: analysis.upiId,
          name: contact?.name,
          phone: contact?.phoneNumbers[0]?.number,
          isContact: Boolean(contact),
          contactId: contact?.id,
        });
      } else {
        setPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysis, contacts, contactLinks, text]);

  const proceed = useCallback(
    async (recipient: ResolvedRecipientParams) => {
      await recentService.recordUse({ name: recipient.name, phone: recipient.phone, upiId: recipient.upiId });
      if (recipient.contactId) {
        await contactLinks.learn(recipient.contactId, recipient.upiId);
      }
      navigation.navigate('AmountEntry', { recipient });
    },
    [navigation, recentService, contactLinks]
  );

  const selectContact = useCallback(
    async (match: ContactSearchMatch) => {
      const contact = match.contact;
      const phone = contact.phoneNumbers[0]?.number;
      if (!phone) {
        Alert.alert(CONTACT_ERRORS.noPhoneNumber, undefined, [
          { text: 'OK' },
        ]);
        return;
      }
      const learned = await contactLinks.resolve(contact.id);
      const converted = phoneToUpi(phone);
      const upiId = learned ?? (converted.ok ? converted.upiId : undefined);
      if (!upiId) {
        Alert.alert(CONTACT_ERRORS.noUpiAvailable);
        return;
      }
      await proceed({
        method: 'contact_search',
        originalInput: contact.name,
        upiId,
        name: contact.name,
        phone: converted.ok ? converted.digits : undefined,
        isContact: true,
        contactId: contact.id,
      });
    },
    [contactLinks, proceed]
  );

  const selectRecent = useCallback(
    (recipient: RecentRecipient) => {
      proceed({
        method: 'contact_search',
        originalInput: recipient.name ?? recipient.upiId,
        upiId: recipient.upiId,
        name: recipient.name,
        phone: recipient.phone,
        isContact: Boolean(recipient.name),
      });
    },
    [proceed]
  );

  const placeholder = useMemo(() => {
    switch (analysis.type) {
      case 'contact_name':
        return 'Search contacts…';
      case 'phone':
      case 'partial':
        return 'Enter phone number…';
      case 'upi_id':
      case 'invalid':
        return 'Enter UPI ID…';
      default:
        return 'Type name, phone, or UPI ID…';
    }
  }, [analysis.type]);

  const inlineError = analysis.type === 'invalid' ? analysis.reason : null;
  const showNoMatches = analysis.type === 'contact_name' && matches.length === 0 && text.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Text style={styles.label}>Enter Recipient</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ErrorBanner message={inlineError ?? ''} />

        {showNoMatches ? (
          <Text style={styles.hint}>{CONTACT_ERRORS.noContactsFound(text.trim())}</Text>
        ) : null}
        {permissionStatus === 'denied' ? (
          <Text style={styles.hint}>{CONTACT_ERRORS.permissionDeniedHint}</Text>
        ) : null}

        {matches.length > 0 ? (
          <ContactMatchList matches={matches} onSelect={selectContact} />
        ) : preview ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>✓ Sending to: {preview.name ?? preview.upiId}</Text>
            <Text style={styles.previewDetail}>
              {preview.method === 'phone_entry'
                ? `Method: Phone Number (${preview.phone})\nWill use: ${preview.upiId}`
                : `Method: UPI ID\nRecipient: ${preview.name ? preview.name : 'Direct to UPI'}`}
            </Text>
            <TouchableOpacity style={styles.continueButton} onPress={() => proceed(preview)}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <RecentRecipients recipients={recent} onSelect={selectRecent} onClear={() => recentService.clear().then(() => setRecent([]))} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  flex: { flex: 1 },
  label: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: { color: '#888', fontSize: 13, marginTop: 8 },
  previewCard: { marginTop: 16, backgroundColor: '#F0F7F0', borderRadius: 10, padding: 14 },
  previewTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  previewDetail: { fontSize: 14, color: '#444' },
  continueButton: { marginTop: 12, backgroundColor: '#1A73E8', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  continueButtonText: { color: '#fff', fontWeight: '700' },
});
