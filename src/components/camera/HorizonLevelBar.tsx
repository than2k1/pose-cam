import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useCameraStore } from '../../stores/useCameraStore';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';

export const HorizonLevelBar: React.FC = () => {
  const showHorizonBar = useCameraStore((state) => state.showHorizonBar);
  const { rollRadShared, isLevelShared } = useDeviceOrientation();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rollRadShared.value}rad` }],
      backgroundColor: isLevelShared.value ? '#30D158' : 'rgba(255, 255, 255, 0.8)',
    };
  });

  const animatedCenterDotStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: isLevelShared.value ? '#30D158' : 'rgba(255, 255, 255, 0.9)',
    };
  });

  if (!showHorizonBar) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      {/* Center Reticle Dot */}
      <Animated.View style={[styles.centerDot, animatedCenterDotStyle]} />

      {/* Rotating 2D Horizon Level Line */}
      <Animated.View style={[styles.levelLine, animatedStyle]}>
        <Animated.View style={[styles.endTick, styles.leftTick, animatedStyle]} />
        <Animated.View style={[styles.endTick, styles.rightTick, animatedStyle]} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
  },
  levelLine: {
    width: 180,
    height: 2,
    borderRadius: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endTick: {
    position: 'absolute',
    width: 2,
    height: 8,
  },
  leftTick: {
    left: 0,
  },
  rightTick: {
    right: 0,
  },
});
