import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Text, AppState, AppStateStatus, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraStore } from '../../stores/useCameraStore';
import { getNumericZoom, clampZoom } from '../../utils/lensCalculator';
import { analyzeKeyframe } from '../../utils/visionInferencingEngine';
import { useLensGuidance } from '../../hooks/useLensGuidance';
import { usePhotoCapture } from '../../hooks/usePhotoCapture';
import { HorizonLevelBar } from './HorizonLevelBar';
import { ModeSwitcher } from './ModeSwitcher';
import { VectorPoseOverlay } from './VectorPoseOverlay';
import { FramingSelector } from './FramingSelector';
import { PoseCarousel } from './PoseCarousel';
import { LensPresetChips } from './LensPresetChips';
import { ShutterButton } from './ShutterButton';
import { CaptureShutterButton } from './CaptureShutterButton';
import { AnalyzingIndicator } from './AnalyzingIndicator';
import { DirectorCueOverlay } from './DirectorCueOverlay';
import { PositioningBadgesOverlay } from './PositioningBadgesOverlay';
import { ExposureAlertOverlay } from './ExposureAlertOverlay';
import { CompositionGridOverlay } from './CompositionGridOverlay';
import { CompositionGuidanceOverlay } from './CompositionGuidanceOverlay';
import { GridModeToggle } from './GridModeToggle';
import { useSafeCameraDevice, useSafeCameraFormat } from '../../utils/cameraHooks';

// Dynamic load Camera component for native platforms only
let CameraComponent: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CameraComponent = require('react-native-vision-camera').Camera;
  } catch {
    CameraComponent = null;
  }
}

const CAMERA_FORMAT_FILTERS = [
  { photoResolution: 'max' as const },
  { videoResolution: 'max' as const },
];

export const CameraViewfinder: React.FC = () => {
  const cameraRef = useRef<any>(null);
  const device = useSafeCameraDevice('back');
  const format = useSafeCameraFormat(device, CAMERA_FORMAT_FILTERS);
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const mode = useCameraStore((state) => state.mode);
  const isAppActive = useCameraStore((state) => state.isAppActive);
  const setIsAppActive = useCameraStore((state) => state.setIsAppActive);
  const activeLens = useCameraStore((state) => state.activeLens);
  const isFrozen = useCameraStore((state) => state.isFrozen);
  const setVisionResult = useCameraStore((state) => state.setVisionResult);
  const setIsAnalyzing = useCameraStore((state) => state.setIsAnalyzing);
  const insets = useSafeAreaInsets();
  const { onViewportLayout } = useLensGuidance();

  const isCameraActive = isAppActive && !isFrozen;

  const onCameraInitialized = useCallback(() => {
    setIsCameraInitialized(true);
  }, []);

  const onCameraError = useCallback((error: any) => {
    console.warn('Camera runtime error:', error);
  }, []);

  const { isCapturing, toastMessage, captureAndSavePhoto, clearToast } = usePhotoCapture({
    cameraRef,
    isCameraInitialized,
  });

  // Auto-dismiss toast notification
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        clearToast();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  // Monitor AppState to pause camera when backgrounded (AD-2, Thermal stability)
  useEffect(() => {
    // Initial sync on mount
    setIsAppActive(AppState.currentState === 'active');

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const active = nextAppState === 'active';
      setIsAppActive(active);
    });

    return () => {
      subscription.remove();
    };
  }, [setIsAppActive]);

  // Trigger keyframe local AI inferencing upon viewfinder freeze
  useEffect(() => {
    let isCancelled = false;

    if (isFrozen) {
      setIsAnalyzing(true);
      try {
        analyzeKeyframe()
          .then((outcome) => {
            // Verify effect has not been cleaned up and store is still in frozen state
            if (!isCancelled && useCameraStore.getState().isFrozen) {
              setVisionResult(outcome.result, outcome.latencyMs);
              setIsAnalyzing(false);
            }
          })
          .catch(() => {
            if (!isCancelled && useCameraStore.getState().isFrozen) {
              setIsAnalyzing(false);
            }
          });
      } catch (_err) {
        if (!isCancelled && useCameraStore.getState().isFrozen) {
          setIsAnalyzing(false);
        }
      }
    } else {
      setIsAnalyzing(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [isFrozen, setIsAnalyzing, setVisionResult]);

  // Dynamic safe area positioning with fallbacks
  const topOffset = Math.max(insets.top + 10, 54);
  const bottomOffset = Math.max(insets.bottom + 16, 40);

  const targetZoom = getNumericZoom(activeLens);
  const zoomValue = device ? clampZoom(targetZoom, device.minZoom, device.maxZoom) : targetZoom;

  return (
    <View style={styles.container} onLayout={onViewportLayout}>
      {device && CameraComponent ? (
        <CameraComponent
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          isActive={isCameraActive}
          zoom={zoomValue}
          enableFpsGraph={false}
          lowLightBoost={device?.supportsLowLightBoost ?? false}
          photo={true}
          video={false}
          onInitialized={onCameraInitialized}
          onError={onCameraError}
        />
      ) : (
        <View style={styles.simulatorPreviewCanvas}>
          <View style={[styles.simulatorBadge, isFrozen && styles.simulatorBadgeFrozen]}>
            <Text style={[styles.simulatorBadgeText, isFrozen && styles.simulatorBadgeTextFrozen]}>
              {isFrozen ? 'KEYFRAME FROZEN (KEYFRAME AI PAUSE)' : `SIMULATOR PREVIEW (${activeLens} • ${targetZoom}x)`}
            </Text>
          </View>
        </View>
      )}

      {/* Analyzing HUD & Keyframe Unfreeze Tap Listener */}
      <AnalyzingIndicator />

      {/* COCO-17 Vector Pose Overlay Layer */}
      <VectorPoseOverlay />

      {/* Directional Distance & Height/Tilt Badges Overlay */}
      <PositioningBadgesOverlay />

      {/* Director Cues & Pose Alignment Feedback Overlay */}
      <DirectorCueOverlay />

      {/* Exposure Alerts & 1-Tap Lens Recommendation Overlay */}
      <ExposureAlertOverlay />

      {/* Scene Mode Composition Grid & Guidance Overlay */}
      <CompositionGridOverlay />

      {/* Composition Guidance HUD Overlay (Story 5.3) */}
      <CompositionGuidanceOverlay />

      {/* Toast Banner for Photo Capture Notifications — sits just above PositioningBadges */}
      {toastMessage && (
        <View style={[styles.toastBanner, { top: topOffset + 44 }]} pointerEvents="none">
          <Text style={styles.toastBannerText}>{toastMessage}</Text>
        </View>
      )}

      {/* Top HUD Overlay - Mode Switcher */}
      <View style={[styles.topHudContainer, { top: topOffset }]} pointerEvents="box-none">
        <ModeSwitcher />
      </View>

      {/* Center HUD Overlay - Horizon Leveling Bar */}
      <HorizonLevelBar />

      {/* Bottom HUD Overlay - Framing Selector, Pose Carousel, Grid Toggle, Lens Preset Chips & Shutter Controls */}
      <View style={[styles.bottomHudContainer, { bottom: bottomOffset }]} pointerEvents="box-none">
        {mode === 'person' && (
          <View style={styles.personHudLayer}>
            <FramingSelector />
            <PoseCarousel />
          </View>
        )}
        {mode === 'scene' && <GridModeToggle />}
        <LensPresetChips />

        {/* Dual Shutter Control Row */}
        <View style={styles.shutterRow}>
          <View style={styles.secondaryShutterSlot}>
            <ShutterButton />
          </View>
          <View style={styles.primaryShutterSlot}>
            <CaptureShutterButton
              isCapturing={isCapturing}
              onPress={captureAndSavePhoto}
            />
          </View>
          <View style={styles.secondaryShutterSlot} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topHudContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
  },
  bottomHudContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
  },
  personHudLayer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  simulatorPreviewCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#121214',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulatorBadge: {
    backgroundColor: 'rgba(255, 214, 10, 0.2)',
    borderColor: '#FFD60A',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  simulatorBadgeFrozen: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    borderColor: '#00E5FF',
  },
  simulatorBadgeText: {
    color: '#FFD60A',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  simulatorBadgeTextFrozen: {
    color: '#00E5FF',
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
    marginTop: 16,
  },
  primaryShutterSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
  },
  secondaryShutterSlot: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastBanner: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderColor: '#30D158',
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 50,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  toastBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
