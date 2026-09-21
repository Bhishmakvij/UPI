import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RecipientMethod } from '../lib/db/types';

/** A fully-resolved payee, in the one shape every downstream screen consumes
 * regardless of which of the three input methods (QR / contact / phone / UPI
 * ID) produced it. */
export interface ResolvedRecipientParams {
  method: RecipientMethod;
  originalInput: string;
  upiId: string;
  name?: string;
  phone?: string;
  isContact: boolean;
  contactId?: string;
  /** Amount pre-filled from a QR's `am` param, if any — still editable, and
   * still subject to the >₹2000 splitting rule regardless of its source. */
  prefilledAmount?: number;
  /** Transaction note from a QR, if any. */
  qrNote?: string;
  /** Currency from a QR, if any — surfaced so AmountEntry can warn when it isn't INR. */
  currency?: string;
}

/** The four bottom-tab destinations, nested inside the root stack's `Main` screen. */
export type MainTabParamList = {
  Pay: undefined;
  Scan: undefined;
  History: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  /** `prefilledAmount` carries the Home screen's "Quick Send" amount through
   * recipient resolution so it lands pre-filled on AmountEntry. */
  RecipientInput: { prefilledAmount?: number } | undefined;
  AmountEntry: { recipient: ResolvedRecipientParams };
  ConfirmSplits: { recipient: ResolvedRecipientParams; amount: number };
  PaymentProgress: { recipient: ResolvedRecipientParams; amount: number };
  Result: { transactionId: string };
  HistoryDetail: { transactionId: string };
};

/** Screen props for a tab nested under `Main`, composed so `navigation.navigate`
 * accepts both sibling tab names and root-stack screen names (e.g. the Pay
 * tab pushing `RecipientInput`, which lives one level up in the root stack). */
export type TabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
