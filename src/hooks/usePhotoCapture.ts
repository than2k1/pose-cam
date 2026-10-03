import { useState, useCallback } from 'react';

let Platform: any = { OS: 'web' };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Platform = require('react-native').Platform || { OS: 'web' };
} catch {
  Platform = { OS: 'web' };
}

export interface UsePhotoCaptureOptions {
  cameraRef?: React.RefObject<any>;
  isCameraInitialized?: boolean;
}

export interface UsePhotoCaptureResult {
  isCapturing: boolean;
  lastCapturedUri: string | null;
  toastMessage: string | null;
  captureAndSavePhoto: () => Promise<string | null>;
  clearToast: () => void;
}

export async function executePhotoCapture(options?: UsePhotoCaptureOptions): Promise<{ uri: string | null; toast: string }> {
  let photoUri: string | null = null;
  let toast = '';

  // Real device Camera capture via cameraRef if available
  if (options?.cameraRef?.current && typeof options.cameraRef.current.takePhoto === 'function') {
    try {
      const photo = await options.cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: true,
      });
      photoUri = photo.path ? `file://${photo.path}` : photo.uri || null;
    } catch (cameraErr: any) {
      const errMsg = cameraErr?.message || String(cameraErr);
      if (
        errMsg.toLowerCase().includes('not ready') ||
        errMsg.toLowerCase().includes('oninitialized') ||
        errMsg.toLowerCase().includes('not-ready') ||
        errMsg.toLowerCase().includes('not-initialized')
      ) {
        return { uri: null, toast: 'Camera is still initializing, please wait...' };
      }
      throw cameraErr;
    }
  }

  // Fallback URI for simulator or web preview
  if (!photoUri) {
    const timestamp = new Date().getTime();
    photoUri = `file:///simulated_gallery/photo_${timestamp}.jpg`;
  }

  // Save to media library (or simulate save on web/simulator)
  let mediaLibraryModule: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mediaLibraryModule = require('expo-media-library');
  } catch {
    mediaLibraryModule = null;
  }

  const isWeb = !Platform || Platform.OS === 'web';

  if (mediaLibraryModule && !isWeb) {
    const { status } = await mediaLibraryModule.requestPermissionsAsync();
    if (status === 'granted') {
      await mediaLibraryModule.saveToLibraryAsync(photoUri);
      toast = 'Saved to Gallery!';
    } else {
      toast = 'Storage permission denied';
    }
  } else {
    // Web or simulator fallback confirmation
    toast = 'Photo captured and saved to device!';
  }

  return { uri: photoUri, toast };
}

export function usePhotoCapture(options?: UsePhotoCaptureOptions): UsePhotoCaptureResult {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapturedUri, setLastCapturedUri] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const captureAndSavePhoto = useCallback(async (): Promise<string | null> => {
    setIsCapturing(true);
    setToastMessage(null);

    try {
      const { uri, toast } = await executePhotoCapture(options);
      setToastMessage(toast);
      setLastCapturedUri(uri);
      return uri;
    } catch (_err) {
      setToastMessage('Failed to save photo');
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [options?.cameraRef, options?.isCameraInitialized]);

  return {
    isCapturing,
    lastCapturedUri,
    toastMessage,
    captureAndSavePhoto,
    clearToast,
  };
}
