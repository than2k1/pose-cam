import { Platform } from 'react-native';

export function useSafeCameraPermission() {
  if (Platform.OS === 'web') {
    return {
      hasPermission: true,
      requestPermission: async () => true,
    };
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useCameraPermission } = require('react-native-vision-camera');
    return useCameraPermission();
  } catch {
    return {
      hasPermission: true,
      requestPermission: async () => true,
    };
  }
}

export function useSafeCameraDevice(position: 'back' | 'front') {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useCameraDevice } = require('react-native-vision-camera');
    return useCameraDevice(position);
  } catch {
    return null;
  }
}

export function useSafeCameraFormat(device: any, filters?: any[]) {
  if (Platform.OS === 'web' || !device) {
    return undefined;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useCameraFormat } = require('react-native-vision-camera');
    return useCameraFormat(device, filters || [{ photoResolution: 'max' }, { videoResolution: 'max' }]);
  } catch {
    return undefined;
  }
}
