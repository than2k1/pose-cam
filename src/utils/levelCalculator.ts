export interface MotionRotation {
  alpha?: number;
  beta?: number;
  gamma?: number;
}

/**
 * Converts radians to degrees.
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Normalizes an angle in degrees to the [-180, 180] degree range.
 */
export function normalizeAngle(degrees: number): number {
  let angle = degrees % 360;
  if (angle > 180) {
    angle -= 360;
  } else if (angle < -180) {
    angle += 360;
  }
  return angle;
}

/**
 * Calculates roll angle in degrees from sensor motion rotation data.
 * Gamma represents the roll angle (left/right tilt) in radians.
 */
export function calculateRollDegrees(rotation?: MotionRotation | null): number {
  if (!rotation || typeof rotation.gamma !== 'number' || isNaN(rotation.gamma)) {
    return 0;
  }
  return normalizeAngle(radiansToDegrees(rotation.gamma));
}

/**
 * Determines whether the device roll angle is within the specified level threshold (default +/-1.0 degree).
 */
export function isWithinLevelThreshold(rollDegrees: number, thresholdDegrees: number = 1.0): boolean {
  const normalized = normalizeAngle(rollDegrees);
  return Math.abs(normalized) <= thresholdDegrees;
}

export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculates roll angle in degrees from raw accelerometer data.
 * When phone is held upright in portrait, gravity is along -y.
 */
export function calculateRollDegreesFromAccel(data?: AccelerometerData | null): number {
  if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') {
    return 0;
  }
  const rollRad = Math.atan2(data.x, -data.y);
  return normalizeAngle(radiansToDegrees(rollRad));
}

/**
 * Calculates pitch angle in degrees from raw accelerometer data.
 * Tilting forward (pointing down) is negative, tilting back (pointing up) is positive.
 */
export function calculatePitchDegreesFromAccel(data?: AccelerometerData | null): number {
  if (!data || typeof data.z !== 'number') {
    return 0;
  }
  const x = data.x || 0;
  const y = data.y || 0;
  const z = data.z || 0;
  const pitchRad = Math.atan2(z, Math.sqrt(x * x + y * y));
  return normalizeAngle(radiansToDegrees(pitchRad));
}

