import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useCameraStore } from '../stores/useCameraStore';
import {
  calculateRollDegrees,
  calculateRollDegreesFromAccel,
  calculatePitchDegreesFromAccel,
  isWithinLevelThreshold,
} from '../utils/levelCalculator';

let AccelerometerModule: any = null;
let DeviceMotionModule: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sensors = require('expo-sensors');
  AccelerometerModule = sensors.Accelerometer;
  DeviceMotionModule = sensors.DeviceMotion;
} catch {
  // Fallback for mock/test environments
}

// Module-level cached orientation state
let latestRollDegrees = 0;
let latestPitchDegrees = 0;
let latestIsLevel = true;

export function getLatestOrientation() {
  return {
    rollDegrees: latestRollDegrees,
    pitchDegrees: latestPitchDegrees,
    isLevel: latestIsLevel,
  };
}

export function useDeviceOrientation() {
  const isAppActive = useCameraStore((state) => state.isAppActive);
  const [rollDegrees, setRollDegrees] = useState<number>(latestRollDegrees);
  const [pitchDegrees, setPitchDegrees] = useState<number>(latestPitchDegrees);
  const [isLevel, setIsLevel] = useState<boolean>(latestIsLevel);

  const rollRadShared = useSharedValue<number>(0);
  const isLevelShared = useSharedValue<boolean>(true);

  useEffect(() => {
    if (!isAppActive || Platform.OS === 'web') {
      return;
    }

    let isMounted = true;
    let subscription: { remove: () => void } | null = null;
    let lastStateUpdateTime = 0;
    let smoothedRoll = latestRollDegrees;
    let smoothedPitch = latestPitchDegrees;

    const setupSensors = async () => {
      try {
        // Accelerometer is safe, robust, and supported across 100% of Android devices
        if (AccelerometerModule) {
          const isAccelAvailable = await AccelerometerModule.isAvailableAsync().catch(() => false);
          if (isAccelAvailable && isMounted) {
            AccelerometerModule.setUpdateInterval(80);
            subscription = AccelerometerModule.addListener((data: { x: number; y: number; z: number }) => {
              if (!isMounted || !data) return;

              const rawRoll = calculateRollDegreesFromAccel(data);
              const rawPitch = calculatePitchDegreesFromAccel(data);

              // Low-pass exponential smoothing filter to remove sensor jitter
              smoothedRoll = smoothedRoll * 0.75 + rawRoll * 0.25;
              smoothedPitch = smoothedPitch * 0.75 + rawPitch * 0.25;

              const level = isWithinLevelThreshold(smoothedRoll, 1.0);
              const gammaRad = (smoothedRoll * Math.PI) / 180;

              // Fast UI-thread Reanimated updates for horizon level bar
              rollRadShared.value = -gammaRad;
              isLevelShared.value = level;

              latestRollDegrees = smoothedRoll;
              latestPitchDegrees = smoothedPitch;
              latestIsLevel = level;

              // Slow down balance / tilt badge updates (800ms cadence)
              const now = Date.now();
              if (now - lastStateUpdateTime >= 800) {
                lastStateUpdateTime = now;
                setRollDegrees(Math.round(smoothedRoll));
                setPitchDegrees(Math.round(smoothedPitch));
                setIsLevel(level);
              }
            });
            return;
          }
        }

        // Fallback to DeviceMotion if Accelerometer is not available
        if (DeviceMotionModule) {
          const isMotionAvailable = await DeviceMotionModule.isAvailableAsync().catch(() => false);
          if (isMotionAvailable && isMounted) {
            DeviceMotionModule.setUpdateInterval(80);
            subscription = DeviceMotionModule.addListener((motionData: any) => {
              if (!isMounted || !motionData) return;

              if (motionData.rotation) {
                const rawRoll = calculateRollDegrees(motionData.rotation);
                const rawPitch = motionData.rotation.beta ? (motionData.rotation.beta * 180) / Math.PI : 0;

                smoothedRoll = smoothedRoll * 0.75 + rawRoll * 0.25;
                smoothedPitch = smoothedPitch * 0.75 + rawPitch * 0.25;

                const level = isWithinLevelThreshold(smoothedRoll, 1.0);
                const gammaRad = (smoothedRoll * Math.PI) / 180;

                rollRadShared.value = -gammaRad;
                isLevelShared.value = level;

                latestRollDegrees = smoothedRoll;
                latestPitchDegrees = smoothedPitch;
                latestIsLevel = level;

                const now = Date.now();
                if (now - lastStateUpdateTime >= 800) {
                  lastStateUpdateTime = now;
                  setRollDegrees(Math.round(smoothedRoll));
                  setPitchDegrees(Math.round(smoothedPitch));
                  setIsLevel(level);
                }
              }
            });
          }
        }
      } catch (_err) {
        // Safely ignore hardware sensor access errors
      }
    };

    setupSensors();

    return () => {
      isMounted = false;
      if (subscription) {
        try {
          subscription.remove();
        } catch {}
      }
    };
  }, [isAppActive, rollRadShared, isLevelShared]);

  return {
    rollDegrees,
    pitchDegrees,
    isLevel,
    rollRadShared,
    isLevelShared,
  };
}
