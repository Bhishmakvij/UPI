/**
 * Single source of truth for every user-facing string in the app. Every
 * validator, launcher, and screen references these constants rather than
 * inlining copy, so wording stays centralized and consistent — including the
 * "try another method" fallback menus, which are built from the same catalog.
 */

export const QR_ERRORS = {
  aimAtValidQr: 'Please aim at a valid UPI QR code',
  notUpiQr: "This QR code doesn't appear to be for UPI. Try entering manually.",
  cameraPermissionNeeded: 'Camera permission needed to scan QR codes',
  scanTimeoutPrompt: "Can't scan? Enter manually instead",
} as const;

export const RECIPIENT_INPUT_ERRORS = {
  upiEmpty: 'Please enter UPI ID',
  upiMissingAt: 'UPI ID must contain @ (e.g., name@bank)',
  upiBadFormat: 'Use format: name@bank',
  upiInvalidChars: 'Invalid characters. Use letters, numbers, dots',
  upiUnknownBank: 'Unknown bank. Continue anyway?',
  phoneEmpty: 'Please enter phone number',
  phoneTooShort: 'Phone must be 10 digits',
  phoneNonNumeric: 'Only numbers allowed',
  genericInvalid: 'Invalid input. Enter name, phone, or UPI',
} as const;

export const AMOUNT_ERRORS = {
  empty: 'Please enter a positive amount',
  zero: 'Amount must be greater than 0',
  negative: 'Amount cannot be negative',
  decimal: 'Enter whole rupees only',
  nonNumeric: 'Only numbers allowed',
  overLimit: 'Max amount: 999,999 rupees',
} as const;

export const CONTACT_ERRORS = {
  permissionDeniedHint: 'You can enable this in Settings',
  noContactsAvailable: 'No contacts available. Enter manually',
  noPhoneNumber: 'This contact has no phone number',
  noUpiAvailable: 'UPI ID not available for this contact',
  multipleMatches: 'Multiple matches found - please select one',
  contactGone: 'Contact no longer available',
  selectWhichNumber: 'Select which number to use',
  noContactsFound: (query: string) => `No contacts named '${query}'. Enter manually?`,
  loadFailed: "Couldn't load your contacts. You can still enter a phone number or UPI ID.",
} as const;

export const PAYMENT_ERRORS = {
  noUpiApp: "The UPI payment app isn't installed. Install one to continue.",
  cannotOpenPaymentApp: 'Cannot open payment app. Install a UPI app to continue.',
  cancelled: 'Payment cancelled. Retry?',
  failedGeneric: 'Something went wrong. Please try again.',
  insufficientBalance: "Your account doesn't have enough balance for this payment.",
  recipientInvalid: "The recipient's UPI account may not exist or is inactive.",
  paymentInProgress: 'Payment in progress. Please wait…',
  iosTimeout: 'Payment timeout. Try again?',
} as const;

export const NETWORK_ERRORS = {
  offline: 'No internet connection. Check your network.',
  connectionLost: 'Connection lost. Retry?',
} as const;

export const STATUS_UNCLEAR = {
  /** Short label stored against the split itself. */
  shortLabel: 'Payment status unclear',
  /** Longer explanation shown in the unclear-status prompt/detail view. */
  message: "We're not sure if the payment went through. Check your transaction history or contact the recipient.",
} as const;
