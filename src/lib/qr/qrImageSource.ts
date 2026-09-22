/** Outcome of an image-pick attempt — kept as a discriminated union rather
 * than a nullable URI so the UI can tell "user cancelled" (silent) apart
 * from "permission denied" (show a hint) instead of collapsing both to the
 * same empty result. */
export type PickImageResult = { status: 'picked'; uri: string } | { status: 'cancelled' } | { status: 'permission_denied' };

/**
 * Abstraction over "pick an image, then decode any QR code within it" so the
 * screen-level logic below can be exercised against a fake source in tests,
 * without touching the native image-picker/camera bindings.
 */
export interface QrImageSource {
  /** Opens the photo library picker. */
  pickFromLibrary(): Promise<PickImageResult>;
  /** Opens the camera to take a fresh photo. */
  pickFromCamera(): Promise<PickImageResult>;
  /** Decodes every QR code found in the image at `uri`. Empty array means the
   * image was readable but contained no QR code. */
  scanUrl(uri: string): Promise<string[]>;
}

/**
 * Live implementation backed by `expo-image-picker` (gallery/camera capture)
 * and `expo-camera`'s static `scanFromURLAsync` (QR decoding from a still
 * image, as opposed to the live `CameraView` scanner used on {@link
 * ScanScreen}). Modules are imported lazily so importing this file never
 * touches native code at load time.
 */
export function createExpoQrImageSource(): QrImageSource {
  return {
    async pickFromLibrary() {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return { status: 'permission_denied' };
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled || result.assets.length === 0) return { status: 'cancelled' };
      return { status: 'picked', uri: result.assets[0].uri };
    },
    async pickFromCamera() {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { status: 'permission_denied' };
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled || result.assets.length === 0) return { status: 'cancelled' };
      return { status: 'picked', uri: result.assets[0].uri };
    },
    async scanUrl(uri: string) {
      const { scanFromURLAsync } = await import('expo-camera');
      const results = await scanFromURLAsync(uri, ['qr']);
      return results.map((r) => r.data);
    },
  };
}
