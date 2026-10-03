export {};
/* eslint-disable @typescript-eslint/no-var-requires */
const { executePhotoCapture } = require('../usePhotoCapture');

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPhotoCaptureUnitTests() {
  console.log('Running executePhotoCapture unit tests...');

  // Test 1: Fallback / simulator capture execution
  {
    const result = await executePhotoCapture();
    assert(result.uri !== null, 'executePhotoCapture should return a photo URI');
    if (result.uri) {
      assert(result.uri.includes('file:///'), 'URI should contain file:/// scheme');
    }
    assert(typeof result.toast === 'string', 'toast message should be a string');
  }

  // Test 2: Custom cameraRef invocation mock
  {
    const state = { takePhotoCalled: false };
    const mockCameraRef = {
      current: {
        takePhoto: async () => {
          state.takePhotoCalled = true;
          return { path: '/tmp/test_photo.jpg' };
        },
      },
    };

    const result = await executePhotoCapture({ cameraRef: mockCameraRef as any });

    assert(state.takePhotoCalled === true, 'takePhoto on cameraRef should be called when cameraRef is active');
    assert(result.uri === 'file:///tmp/test_photo.jpg', 'Returned URI should match cameraRef photo path');
  }

  // Test 3: Native camera error fallback handling
  {
    const mockCameraRef = {
      current: {
        takePhoto: async () => {
          throw new Error('Camera not ready');
        },
      },
    };

    const result = await executePhotoCapture({
      cameraRef: mockCameraRef as any,
    });

    assert(result.uri === null, 'URI should be null when uninitialized');
    assert(result.toast.includes('initializing'), 'Toast should indicate initializing state');
  }

  // Test 4: Native vision-camera uninitialized exception handling
  {
    const mockCameraRef = {
      current: {
        takePhoto: async () => {
          throw new Error('[camera/not-initialized] The camera is not ready yet! Wait for the onInitialized() callback!');
        },
      },
    };

    const result = await executePhotoCapture({
      cameraRef: mockCameraRef as any,
      isCameraInitialized: true,
    });

    assert(result.uri === null, 'URI should be null on caught initialization error');
    assert(result.toast.includes('initializing'), 'Toast should indicate initializing state');
  }

  console.log('executePhotoCapture unit tests passed successfully!');
}

runPhotoCaptureUnitTests().catch((err: any) => {
  console.error('Test failed:', err);
  process.exit(1);
});
