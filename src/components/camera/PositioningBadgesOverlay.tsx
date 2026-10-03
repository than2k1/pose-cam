import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraStore } from '../../stores/useCameraStore';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { evaluateCameraPositioning } from '../../utils/positioningEngine';

export const PositioningBadgesOverlay: React.FC = () => {
  const isFrozen = useCameraStore((state) => state.isFrozen);
  const visionResult = useCameraStore((state) => state.visionResult);
  const selectedFraming = useCameraStore((state) => state.selectedFraming);
  const insets = useSafeAreaInsets();
  const { pitchDegrees } = useDeviceOrientation();

  const evaluation = useMemo(() => {
    if (!isFrozen || !visionResult) return null;
    return evaluateCameraPositioning(visionResult, selectedFraming, pitchDegrees);
  }, [isFrozen, visionResult, selectedFraming, pitchDegrees]);

  if (!isFrozen || !visionResult || !evaluation) {
    return null;
  }

  const { distance, heightAndTilt } = evaluation;

  const isDistanceGood = distance.directive === 'optimal';
  const isHeightGood = heightAndTilt.heightDirective === 'optimal';
  const isTiltGood = heightAndTilt.tiltDirective === 'level';

  const topOffset = Math.max(insets.top + 10, 54) + 48;

  return (
    <View style={[styles.overlayContainer, { top: topOffset }]} pointerEvents="box-none">
      <View style={styles.badgeStack}>
        {/* Distance Badge Chip */}
        <View style={[styles.badgeChip, styles.distanceChip, isDistanceGood && styles.optimalChip]}>
          <Text style={styles.badgeIcon}>📐</Text>
          <Text style={[styles.badgeText, isDistanceGood ? styles.greenText : styles.cyanText]}>
            {distance.badgeText}
          </Text>
        </View>

        {/* Height Badge Chip */}
        <View style={[styles.badgeChip, isHeightGood ? styles.optimalChip : styles.warningChip]}>
          <Text style={styles.badgeIcon}>↕️</Text>
          <Text style={[styles.badgeText, isHeightGood ? styles.greenText : styles.amberText]}>
            {heightAndTilt.heightBadgeText}
          </Text>
        </View>

        {/* Tilt Badge Chip */}
        <View style={[styles.badgeChip, isTiltGood ? styles.optimalChip : styles.warningChip]}>
          <Text style={styles.badgeIcon}>🔄</Text>
          <Text style={[styles.badgeText, isTiltGood ? styles.greenText : styles.amberText]}>
            {heightAndTilt.tiltBadgeText}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 25,
    alignItems: 'center',
  },
  badgeStack: {
    alignItems: 'center',
    gap: 6,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  distanceChip: {
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  warningChip: {
    borderColor: 'rgba(255, 159, 10, 0.4)',
  },
  optimalChip: {
    borderColor: 'rgba(48, 209, 88, 0.4)',
  },
  badgeIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cyanText: {
    color: '#00E5FF',
  },
  amberText: {
    color: '#FF9F0A',
  },
  greenText: {
    color: '#30D158',
  },
});
