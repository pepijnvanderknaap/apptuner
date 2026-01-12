interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface NativeModule {
  name: string;
  version: string;
}

// List of known React Native modules that require native code
const KNOWN_NATIVE_MODULES = [
  // Common RN modules
  '@react-native-camera-roll/camera-roll',
  '@react-native-community/async-storage',
  '@react-native-community/blur',
  '@react-native-community/clipboard',
  '@react-native-community/geolocation',
  '@react-native-community/netinfo',
  '@react-native-community/push-notification-ios',
  '@react-native-picker/picker',
  'react-native-background-fetch',
  'react-native-ble-plx',
  'react-native-ble-manager',
  'react-native-camera',
  'react-native-contacts',
  'react-native-device-info',
  'react-native-document-picker',
  'react-native-fast-image',
  'react-native-fs',
  'react-native-gesture-handler',
  'react-native-image-picker',
  'react-native-linear-gradient',
  'react-native-location',
  'react-native-maps',
  'react-native-permissions',
  'react-native-push-notification',
  'react-native-reanimated',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-svg',
  'react-native-vector-icons',
  'react-native-video',
  'react-native-vision-camera',
  'react-native-webview',

  // Firebase
  '@react-native-firebase/app',
  '@react-native-firebase/auth',
  '@react-native-firebase/firestore',
  '@react-native-firebase/messaging',

  // Payment SDKs
  '@stripe/stripe-react-native',
  'react-native-iap',

  // Social/Auth
  '@react-native-google-signin/google-signin',
  'react-native-fbsdk-next',

  // Expo modules (if using bare workflow)
  'expo-camera',
  'expo-file-system',
  'expo-location',
  'expo-media-library',
];

export async function detectNativeModules(packageJson: PackageJson): Promise<NativeModule[]> {
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const nativeModules: NativeModule[] = [];

  for (const [name, version] of Object.entries(allDeps)) {
    // Check if it's a known native module
    if (KNOWN_NATIVE_MODULES.includes(name)) {
      nativeModules.push({ name, version });
    }
    // Also check for packages that start with common native prefixes
    else if (
      name.startsWith('react-native-') &&
      !name.includes('-web') && // Exclude web-only packages
      !['react-native-web'].includes(name)
    ) {
      // Heuristic: if it starts with react-native-, it's likely native
      nativeModules.push({ name, version });
    }
  }

  return nativeModules;
}
