import {
  radiansToDegrees,
  normalizeAngle,
  calculateRollDegrees,
  isWithinLevelThreshold,
  calculateRollDegreesFromAccel,
  calculatePitchDegreesFromAccel,
} from '../levelCalculator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertCloseTo(actual: number, expected: number, precision: number = 2, message?: string) {
  const diff = Math.abs(actual - expected);
  const tolerance = Math.pow(10, -precision);
  assert(diff <= tolerance, message || `Expected ${actual} to be close to ${expected}`);
}

export function runLevelCalculatorTests() {
  // Test radiansToDegrees
  assert(radiansToDegrees(0) === 0, '0 rad = 0 deg');
  assertCloseTo(radiansToDegrees(Math.PI), 180, 4, 'PI rad = 180 deg');
  assertCloseTo(radiansToDegrees(Math.PI / 2), 90, 4, 'PI/2 rad = 90 deg');

  // Test normalizeAngle
  assert(normalizeAngle(0) === 0, 'normalize 0');
  assert(normalizeAngle(45) === 45, 'normalize 45');
  assert(normalizeAngle(-45) === -45, 'normalize -45');
  assert(normalizeAngle(180) === 180, 'normalize 180');
  assert(normalizeAngle(-180) === -180, 'normalize -180');
  assert(normalizeAngle(270) === -90, 'normalize 270');
  assert(normalizeAngle(360) === 0, 'normalize 360');
  assert(normalizeAngle(-270) === 90, 'normalize -270');

  // Test calculateRollDegrees
  assert(calculateRollDegrees(null) === 0, 'null rotation');
  assert(calculateRollDegrees(undefined) === 0, 'undefined rotation');
  assert(calculateRollDegrees({}) === 0, 'empty rotation');
  assertCloseTo(calculateRollDegrees({ gamma: 0.0872665 }), 5, 1, 'gamma 0.087 rad');
  assertCloseTo(calculateRollDegrees({ gamma: -0.0174533 }), -1, 1, 'gamma -0.017 rad');

  // Test calculateRollDegreesFromAccel
  assert(calculateRollDegreesFromAccel(null) === 0, 'null accel');
  assert(calculateRollDegreesFromAccel(undefined) === 0, 'undefined accel');
  assert(calculateRollDegreesFromAccel({ x: 0, y: -1, z: 0 }) === 0, 'upright portrait is 0 roll');
  assertCloseTo(calculateRollDegreesFromAccel({ x: 1, y: 0, z: 0 }), 90, 1, 'tilted 90 deg right');
  assertCloseTo(calculateRollDegreesFromAccel({ x: -1, y: 0, z: 0 }), -90, 1, 'tilted 90 deg left');

  // Test calculatePitchDegreesFromAccel
  assert(calculatePitchDegreesFromAccel(null) === 0, 'null pitch accel');
  assert(calculatePitchDegreesFromAccel(undefined) === 0, 'undefined pitch accel');
  assert(calculatePitchDegreesFromAccel({ x: 0, y: -1, z: 0 }) === 0, 'upright portrait is 0 pitch');
  assertCloseTo(calculatePitchDegreesFromAccel({ x: 0, y: 0, z: 1 }), 90, 1, 'pointing straight up is +90 pitch');
  assertCloseTo(calculatePitchDegreesFromAccel({ x: 0, y: 0, z: -1 }), -90, 1, 'pointing straight down is -90 pitch');

  // Test isWithinLevelThreshold
  assert(isWithinLevelThreshold(0, 1.0) === true, 'level 0 deg');
  assert(isWithinLevelThreshold(0.5, 1.0) === true, 'level 0.5 deg');
  assert(isWithinLevelThreshold(-0.8, 1.0) === true, 'level -0.8 deg');
  assert(isWithinLevelThreshold(1.0, 1.0) === true, 'level 1.0 deg');
  assert(isWithinLevelThreshold(-1.0, 1.0) === true, 'level -1.0 deg');
  assert(isWithinLevelThreshold(1.1, 1.0) === false, 'tilted 1.1 deg');
  assert(isWithinLevelThreshold(-1.2, 1.0) === false, 'tilted -1.2 deg');
  assert(isWithinLevelThreshold(15, 1.0) === false, 'tilted 15 deg');

  console.log('All levelCalculator unit tests passed successfully!');
}

// Auto-run if executed directly
runLevelCalculatorTests();
