/**
 * AppTuner SDK 2.0 — Authoritative library manifest
 * This is the single source of truth for what is available in the AppTuner runtime.
 */

export const SDK_VERSION = '2.0';
export const RN_VERSION = '0.81.6';
export const REACT_VERSION = '19.1.4';

export interface SdkLibrary {
  name: string;
  version: string;
  category: string;
  description: string;
  importExample: string;
  usageExample: string;
  notes?: string;
  relatedLibraries?: string[];
}

export const SDK_LIBRARIES: SdkLibrary[] = [

  // ─── NAVIGATION ────────────────────────────────────────────────────────────
  {
    name: '@react-navigation/native',
    version: '^7.1.9',
    category: 'Navigation',
    description: 'Core navigation container. Required wrapper for all react-navigation setups.',
    importExample: `import { NavigationContainer } from '@react-navigation/native';`,
    usageExample: `import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}`,
    relatedLibraries: ['@react-navigation/native-stack', '@react-navigation/bottom-tabs'],
  },
  {
    name: '@react-navigation/native-stack',
    version: '^7.3.2',
    category: 'Navigation',
    description: 'Native stack navigator — best performance, uses native navigation primitives.',
    importExample: `import { createNativeStackNavigator } from '@react-navigation/native-stack';`,
    usageExample: `const Stack = createNativeStackNavigator();

function MyStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#fff' } }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Detail" component={DetailScreen} options={{ title: 'Details' }} />
    </Stack.Navigator>
  );
}`,
    relatedLibraries: ['@react-navigation/native'],
  },
  {
    name: '@react-navigation/bottom-tabs',
    version: '^7.3.0',
    category: 'Navigation',
    description: 'Bottom tab bar navigator — standard iOS/Android tab UI.',
    importExample: `import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';`,
    usageExample: `const Tab = createBottomTabNavigator();

function MyTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}`,
    relatedLibraries: ['@react-navigation/native'],
  },
  {
    name: 'react-native-screens',
    version: '^4.10.0',
    category: 'Navigation',
    description: 'Native screen containers — required dependency for react-navigation.',
    importExample: `import { enableScreens } from 'react-native-screens';`,
    usageExample: `// Usually not needed directly — react-navigation handles it automatically.`,
    notes: 'Pre-installed. Do not add to package.json.',
  },
  {
    name: 'react-native-safe-area-context',
    version: '^5.4.0',
    category: 'Navigation',
    description: 'Safe area insets — handles notches, home indicators, status bars.',
    importExample: `import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';`,
    usageExample: `import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        {/* content safe from notches */}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}`,
  },
  {
    name: 'react-native-gesture-handler',
    version: '^2.24.0',
    category: 'Navigation',
    description: 'Native gesture recognition — required by react-navigation, also usable for swipes.',
    importExample: `import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';`,
    usageExample: `import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* rest of your app */}
    </GestureHandlerRootView>
  );
}`,
    notes: 'Wrap root in GestureHandlerRootView. react-navigation does this automatically.',
  },

  // ─── STORAGE ───────────────────────────────────────────────────────────────
  {
    name: '@react-native-async-storage/async-storage',
    version: '^3.0.1',
    category: 'Storage',
    description: 'Persistent key-value storage. v3 API — Promise-based.',
    importExample: `import AsyncStorage from '@react-native-async-storage/async-storage';`,
    usageExample: `await AsyncStorage.setItem('user', JSON.stringify({ name: 'Alice' }));
const raw = await AsyncStorage.getItem('user');
const user = raw ? JSON.parse(raw) : null;
await AsyncStorage.removeItem('user');`,
    notes: 'v3 API — use Promises. Do not use v1/v2 callback-style.',
  },
  {
    name: 'expo-secure-store',
    version: '^14.2.3',
    category: 'Storage',
    description: 'Encrypted key-value storage backed by iOS Keychain / Android Keystore.',
    importExample: `import * as SecureStore from 'expo-secure-store';`,
    usageExample: `import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('token', 'my-secret-jwt');
const token = await SecureStore.getItemAsync('token');
await SecureStore.deleteItemAsync('token');`,
    notes: 'Use for sensitive data: tokens, passwords. Not for large objects — use AsyncStorage for those.',
  },
  {
    name: 'expo-sqlite',
    version: '^15.2.10',
    category: 'Storage',
    description: 'SQLite database for structured local data.',
    importExample: `import * as SQLite from 'expo-sqlite';`,
    usageExample: `import * as SQLite from 'expo-sqlite';

const db = await SQLite.openDatabaseAsync('myapp.db');

await db.execAsync(\`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);
\`);

await db.runAsync('INSERT INTO users (name, email) VALUES (?, ?)', ['Alice', 'alice@example.com']);

const users = await db.getAllAsync('SELECT * FROM users');
console.log(users);`,
  },
  {
    name: 'expo-file-system',
    version: '^18.1.9',
    category: 'Storage',
    description: 'Read/write files on device storage. Download files, manage directories.',
    importExample: `import * as FileSystem from 'expo-file-system';`,
    usageExample: `import * as FileSystem from 'expo-file-system';

// Write a file
const fileUri = FileSystem.documentDirectory + 'data.json';
await FileSystem.writeAsStringAsync(fileUri, JSON.stringify({ hello: 'world' }));

// Read a file
const content = await FileSystem.readAsStringAsync(fileUri);

// Download a file
const downloadResult = await FileSystem.downloadAsync(
  'https://example.com/image.jpg',
  FileSystem.documentDirectory + 'image.jpg'
);`,
  },

  // ─── CAMERA ────────────────────────────────────────────────────────────────
  {
    name: 'react-native-vision-camera',
    version: '^4.7.0',
    category: 'Camera',
    description: 'High-performance camera. Supports photos, video, QR scanning.',
    importExample: `import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';`,
    usageExample: `import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

export default function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  if (!hasPermission) return <Button onPress={requestPermission} title="Grant Permission" />;
  if (!device) return <Text>No camera</Text>;

  return <Camera style={{ flex: 1 }} device={device} isActive photo />;
}`,
    notes: 'Use v4 API. useCameraDevice not useCameraDevices.',
  },
  {
    name: 'expo-camera',
    version: '^16.1.6',
    category: 'Camera',
    description: 'Simpler camera component for basic photo/video capture.',
    importExample: `import { CameraView, useCameraPermissions } from 'expo-camera';`,
    usageExample: `import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission?.granted) {
    return <Button onPress={requestPermission} title="Grant Camera Access" />;
  }

  return (
    <CameraView style={{ flex: 1 }} facing="back" />
  );
}`,
    notes: 'Simpler API than vision-camera. Use vision-camera for advanced use cases (frame processors, QR).',
  },

  // ─── MEDIA ─────────────────────────────────────────────────────────────────
  {
    name: 'react-native-image-picker',
    version: '^7.2.3',
    category: 'Media',
    description: 'Pick images and videos from photo library or camera.',
    importExample: `import { launchImageLibrary, launchCamera } from 'react-native-image-picker';`,
    usageExample: `import { launchImageLibrary } from 'react-native-image-picker';

function pickImage() {
  launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
    if (response.didCancel || response.errorCode) return;
    const uri = response.assets?.[0]?.uri;
    console.log(uri);
  });
}`,
  },
  {
    name: 'expo-image',
    version: '^2.3.1',
    category: 'Media',
    description: 'Optimized Image component with caching, blurhash placeholders, and better performance than built-in Image.',
    importExample: `import { Image } from 'expo-image';`,
    usageExample: `import { Image } from 'expo-image';

<Image
  source="https://example.com/photo.jpg"
  placeholder={{ blurhash: 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4' }}
  contentFit="cover"
  style={{ width: 200, height: 200 }}
/>`,
    notes: 'Prefer over built-in Image for remote images. Supports blurhash/thumbhash placeholders.',
  },
  {
    name: 'expo-media-library',
    version: '^17.1.6',
    category: 'Media',
    description: 'Access device photo library — read photos, save images, browse albums.',
    importExample: `import * as MediaLibrary from 'expo-media-library';`,
    usageExample: `import * as MediaLibrary from 'expo-media-library';

// Request permission
const { status } = await MediaLibrary.requestPermissionsAsync();

// Save image to photo library
await MediaLibrary.saveToLibraryAsync(imageUri);

// Get recent photos
const { assets } = await MediaLibrary.getAssetsAsync({
  mediaType: 'photo',
  first: 20,
  sortBy: 'creationTime',
});`,
  },
  {
    name: 'expo-av',
    version: '^15.1.4',
    category: 'Media',
    description: 'Audio and video playback.',
    importExample: `import { Audio, Video } from 'expo-av';`,
    usageExample: `import { Audio } from 'expo-av';

// Play audio
const { sound } = await Audio.Sound.createAsync(
  { uri: 'https://example.com/sound.mp3' }
);
await sound.playAsync();
await sound.unloadAsync(); // clean up

// Video
import { Video } from 'expo-av';
<Video
  source={{ uri: 'https://example.com/video.mp4' }}
  style={{ width: 320, height: 200 }}
  useNativeControls
  resizeMode="contain"
/>`,
  },

  // ─── MAPS & LOCATION ───────────────────────────────────────────────────────
  {
    name: 'react-native-maps',
    version: '^1.20.1',
    category: 'Maps',
    description: 'Native map component. Apple Maps on iOS — no API key needed.',
    importExample: `import MapView, { Marker, Callout, Polyline } from 'react-native-maps';`,
    usageExample: `import MapView, { Marker } from 'react-native-maps';

<MapView
  style={{ flex: 1 }}
  initialRegion={{
    latitude: 52.3676, longitude: 4.9041,
    latitudeDelta: 0.0922, longitudeDelta: 0.0421,
  }}
>
  <Marker coordinate={{ latitude: 52.3676, longitude: 4.9041 }} title="Amsterdam" />
</MapView>`,
    notes: 'Apple Maps on iOS, no API key. Google Maps requires extra setup not included.',
  },
  {
    name: 'expo-location',
    version: '^18.1.5',
    category: 'Location',
    description: 'GPS location services — current position, watching position, geocoding.',
    importExample: `import * as Location from 'expo-location';`,
    usageExample: `import * as Location from 'expo-location';

// Request permission and get location
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') return;

const location = await Location.getCurrentPositionAsync({});
console.log(location.coords.latitude, location.coords.longitude);

// Watch position
const subscription = await Location.watchPositionAsync(
  { accuracy: Location.Accuracy.High, timeInterval: 5000 },
  (loc) => console.log(loc.coords)
);
subscription.remove(); // cleanup`,
  },
  {
    name: 'react-native-geolocation-service',
    version: '^5.3.1',
    category: 'Location',
    description: 'Alternative GPS library. More reliable on some Android devices than expo-location.',
    importExample: `import Geolocation from 'react-native-geolocation-service';`,
    usageExample: `import Geolocation from 'react-native-geolocation-service';

Geolocation.getCurrentPosition(
  (position) => console.log(position.coords),
  (error) => console.error(error),
  { enableHighAccuracy: true, timeout: 15000 }
);`,
    notes: 'Use expo-location for most cases. This is available as an alternative.',
  },

  // ─── GRAPHICS & UI ─────────────────────────────────────────────────────────
  {
    name: 'react-native-svg',
    version: '^15.11.2',
    category: 'Graphics',
    description: 'SVG support — render SVG icons, charts, and illustrations.',
    importExample: `import Svg, { Circle, Rect, Path, Text as SvgText, G } from 'react-native-svg';`,
    usageExample: `import Svg, { Circle, Path } from 'react-native-svg';

<Svg width="100" height="100" viewBox="0 0 100 100">
  <Circle cx="50" cy="50" r="40" fill="#007AFF" />
  <Path d="M 30 50 L 50 70 L 70 30" stroke="white" strokeWidth="4" fill="none" />
</Svg>`,
  },
  {
    name: 'expo-linear-gradient',
    version: '^14.1.5',
    category: 'Graphics',
    description: 'Linear gradient backgrounds and overlays.',
    importExample: `import { LinearGradient } from 'expo-linear-gradient';`,
    usageExample: `import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={['#4c669f', '#3b5998', '#192f6a']}
  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
>
  <Text style={{ color: 'white', fontSize: 24 }}>Gradient Background</Text>
</LinearGradient>`,
  },
  {
    name: 'expo-blur',
    version: '^14.1.4',
    category: 'Graphics',
    description: 'Blur view — frosted glass effect for overlays and backgrounds.',
    importExample: `import { BlurView } from 'expo-blur';`,
    usageExample: `import { BlurView } from 'expo-blur';

<BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill}>
  <Text>Content over blurred background</Text>
</BlurView>`,
    notes: 'tint options: "light", "dark", "default". Works as an overlay over content.',
  },

  // ─── ANIMATION ─────────────────────────────────────────────────────────────
  {
    name: 'react-native-reanimated',
    version: '^3.17.5',
    category: 'Animation',
    description: 'High-performance animations on the UI thread. 60fps smooth animations.',
    importExample: `import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';`,
    usageExample: `import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Pressable } from 'react-native';

export function AnimatedButton() {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.95); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      <Animated.View style={[styles.button, animatedStyle]}>
        <Text>Press me</Text>
      </Animated.View>
    </Pressable>
  );
}`,
    notes: 'Reanimated babel plugin is pre-configured in AppTuner. No babel.config.js changes needed.',
  },

  // ─── WEB ───────────────────────────────────────────────────────────────────
  {
    name: 'react-native-webview',
    version: '^13.13.5',
    category: 'Web',
    description: 'Embedded web browser view — render HTML, web apps, or external URLs inside your app.',
    importExample: `import { WebView } from 'react-native-webview';`,
    usageExample: `import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: 'https://example.com' }}
  style={{ flex: 1 }}
  onLoad={() => console.log('loaded')}
/>

// Or inline HTML
<WebView
  source={{ html: '<h1>Hello World</h1>' }}
  style={{ flex: 1 }}
/>`,
  },
  {
    name: 'expo-web-browser',
    version: '^14.1.6',
    category: 'Web',
    description: 'Open URLs in an in-app browser (SFSafariViewController on iOS). Better than Linking.openURL.',
    importExample: `import * as WebBrowser from 'expo-web-browser';`,
    usageExample: `import * as WebBrowser from 'expo-web-browser';

// Open URL in in-app browser
await WebBrowser.openBrowserAsync('https://example.com');

// Open for auth (OAuth flow)
const result = await WebBrowser.openAuthSessionAsync(
  'https://auth.example.com/login',
  'myapp://callback'
);`,
  },

  // ─── AUTHENTICATION ────────────────────────────────────────────────────────
  {
    name: 'expo-auth-session',
    version: '^55.0.6',
    category: 'Authentication',
    description: 'OAuth 2.0 authentication flows — Google, GitHub, Apple, any OAuth provider.',
    importExample: `import * as AuthSession from 'expo-auth-session';`,
    usageExample: `import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const [request, response, promptAsync] = AuthSession.useAuthRequest(
  {
    clientId: 'your-client-id',
    scopes: ['openid', 'profile'],
    redirectUri: AuthSession.makeRedirectUri(),
  },
  { authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' }
);

// In your component:
<Button disabled={!request} onPress={() => promptAsync()} title="Sign In with Google" />`,
    notes: 'JS-only — no native registration needed. Works with any OAuth 2.0 provider.',
  },
  {
    name: 'expo-local-authentication',
    version: '^55.0.8',
    category: 'Authentication',
    description: 'Biometric authentication — Face ID, Touch ID, fingerprint.',
    importExample: `import * as LocalAuthentication from 'expo-local-authentication';`,
    usageExample: `import * as LocalAuthentication from 'expo-local-authentication';

const isAvailable = await LocalAuthentication.hasHardwareAsync();
const isEnrolled = await LocalAuthentication.isEnrolledAsync();

if (isAvailable && isEnrolled) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to continue',
    fallbackLabel: 'Use passcode',
  });
  if (result.success) console.log('Authenticated!');
}`,
  },

  // ─── DEVICE & SYSTEM ───────────────────────────────────────────────────────
  {
    name: 'expo-haptics',
    version: '^55.0.8',
    category: 'Device',
    description: 'Haptic feedback — vibration patterns for user interactions.',
    importExample: `import * as Haptics from 'expo-haptics';`,
    usageExample: `import * as Haptics from 'expo-haptics';

// Light tap — use on button presses
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium — for selections
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Heavy — for confirmations
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Success/Error/Warning notifications
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);`,
  },
  {
    name: 'expo-clipboard',
    version: '^55.0.8',
    category: 'Device',
    description: 'Read and write the device clipboard.',
    importExample: `import * as Clipboard from 'expo-clipboard';`,
    usageExample: `import * as Clipboard from 'expo-clipboard';

// Copy to clipboard
await Clipboard.setStringAsync('Hello, clipboard!');

// Read from clipboard
const text = await Clipboard.getStringAsync();
console.log(text);`,
  },
  {
    name: 'expo-constants',
    version: '^55.0.7',
    category: 'Device',
    description: 'App and device constants — app version, device name, status bar height.',
    importExample: `import Constants from 'expo-constants';`,
    usageExample: `import Constants from 'expo-constants';

console.log(Constants.expoConfig?.version);     // App version
console.log(Constants.statusBarHeight);          // Status bar height in pixels
console.log(Constants.deviceName);               // Device name`,
  },
  {
    name: 'expo-device',
    version: '^55.0.9',
    category: 'Device',
    description: 'Device hardware info — device type, manufacturer, model, OS version.',
    importExample: `import * as Device from 'expo-device';`,
    usageExample: `import * as Device from 'expo-device';

console.log(Device.deviceName);          // "iPhone 15 Pro"
console.log(Device.osVersion);           // "18.0"
console.log(Device.modelName);           // "iPhone 15 Pro"
console.log(Device.deviceType);          // Device.DeviceType.PHONE
console.log(Device.isDevice);            // false on simulator`,
  },
  {
    name: 'expo-network',
    version: '^55.0.8',
    category: 'Device',
    description: 'Network connectivity state — WiFi, cellular, offline detection.',
    importExample: `import * as Network from 'expo-network';`,
    usageExample: `import * as Network from 'expo-network';

const networkState = await Network.getNetworkStateAsync();
console.log(networkState.isConnected);   // true/false
console.log(networkState.type);          // Network.NetworkStateType.WIFI
console.log(networkState.isInternetReachable); // true/false`,
  },
  {
    name: 'expo-screen-orientation',
    version: '^55.0.8',
    category: 'Device',
    description: 'Lock or detect screen orientation — portrait, landscape, or free rotation.',
    importExample: `import * as ScreenOrientation from 'expo-screen-orientation';`,
    usageExample: `import * as ScreenOrientation from 'expo-screen-orientation';

// Lock to portrait
await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

// Lock to landscape
await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

// Unlock (allow rotation)
await ScreenOrientation.unlockAsync();

// Get current orientation
const orientation = await ScreenOrientation.getOrientationAsync();`,
  },
  {
    name: 'expo-font',
    version: '^13.3.1',
    category: 'Device',
    description: 'Load custom fonts from assets or Google Fonts.',
    importExample: `import * as Font from 'expo-font';`,
    usageExample: `import * as Font from 'expo-font';
import { useFonts } from 'expo-font';

// Option 1: useFonts hook
const [loaded] = useFonts({
  'Roboto-Bold': require('./assets/fonts/Roboto-Bold.ttf'),
});
if (!loaded) return null;

// Option 2: load async
await Font.loadAsync({
  'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
});`,
  },
  {
    name: 'expo-linking',
    version: '^55.0.7',
    category: 'Device',
    description: 'Deep linking — open URLs, handle incoming deep links, open other apps.',
    importExample: `import * as Linking from 'expo-linking';`,
    usageExample: `import * as Linking from 'expo-linking';

// Open a URL / another app
await Linking.openURL('https://example.com');
await Linking.openURL('tel:+31612345678');
await Linking.openURL('mailto:hello@example.com');

// Listen for incoming deep links
const subscription = Linking.addEventListener('url', ({ url }) => {
  console.log('Opened via:', url);
});
subscription.remove(); // cleanup`,
  },
  {
    name: 'expo-status-bar',
    version: '^55.0.4',
    category: 'Device',
    description: 'Control status bar style — light/dark text, hidden, background color.',
    importExample: `import { StatusBar } from 'expo-status-bar';`,
    usageExample: `import { StatusBar } from 'expo-status-bar';

// In your component:
<StatusBar style="light" />   // White text — for dark backgrounds
<StatusBar style="dark" />    // Black text — for light backgrounds
<StatusBar hidden />           // Hide status bar`,
  },

  // ─── SENSORS ───────────────────────────────────────────────────────────────
  {
    name: 'expo-sensors',
    version: '^55.0.8',
    category: 'Sensors',
    description: 'Device motion sensors — accelerometer, gyroscope, magnetometer, barometer, pedometer.',
    importExample: `import { Accelerometer, Gyroscope, Magnetometer, Barometer, Pedometer } from 'expo-sensors';`,
    usageExample: `import { Accelerometer } from 'expo-sensors';

// Subscribe to accelerometer
Accelerometer.setUpdateInterval(100); // ms
const subscription = Accelerometer.addListener(({ x, y, z }) => {
  console.log('Acceleration:', x, y, z);
});
subscription.remove(); // cleanup

// Pedometer (step counting)
import { Pedometer } from 'expo-sensors';
const isAvailable = await Pedometer.isAvailableAsync();
if (isAvailable) {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  const { steps } = await Pedometer.getStepCountAsync(start, new Date());
  console.log('Steps today:', steps);
}`,
  },

  // ─── CONTACTS & COMMUNICATION ──────────────────────────────────────────────
  {
    name: 'expo-contacts',
    version: '^55.0.8',
    category: 'Contacts',
    description: 'Access device contacts — read names, phone numbers, emails.',
    importExample: `import * as Contacts from 'expo-contacts';`,
    usageExample: `import * as Contacts from 'expo-contacts';

const { status } = await Contacts.requestPermissionsAsync();
if (status !== 'granted') return;

const { data } = await Contacts.getContactsAsync({
  fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
});

data.forEach(contact => {
  console.log(contact.name, contact.phoneNumbers?.[0]?.number);
});`,
  },
  {
    name: 'expo-speech',
    version: '^55.0.8',
    category: 'Accessibility',
    description: 'Text-to-speech — speak text aloud using the device voice.',
    importExample: `import * as Speech from 'expo-speech';`,
    usageExample: `import * as Speech from 'expo-speech';

// Speak text
Speech.speak('Hello! Welcome to AppTuner.', {
  language: 'en-US',
  pitch: 1.0,
  rate: 0.9,
});

// Stop speaking
Speech.stop();

// Check if speaking
const isSpeaking = await Speech.isSpeakingAsync();`,
  },

  // ─── UTILITIES ─────────────────────────────────────────────────────────────
  {
    name: 'expo-sharing',
    version: '^13.1.5',
    category: 'Utilities',
    description: 'Native share sheet — share files, images, or URLs with other apps.',
    importExample: `import * as Sharing from 'expo-sharing';`,
    usageExample: `import * as Sharing from 'expo-sharing';

// Share a file (must be a local URI)
if (await Sharing.isAvailableAsync()) {
  await Sharing.shareAsync(localFileUri, {
    mimeType: 'image/jpeg',
    dialogTitle: 'Share Image',
  });
}`,
    notes: 'Requires a local file URI. Download remote files first with expo-file-system.',
  },
  {
    name: 'expo-crypto',
    version: '^55.0.8',
    category: 'Utilities',
    description: 'Cryptographic functions — SHA hashing, UUID generation, random bytes.',
    importExample: `import * as Crypto from 'expo-crypto';`,
    usageExample: `import * as Crypto from 'expo-crypto';

// Generate SHA-256 hash
const hash = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  'my string to hash'
);

// Generate a UUID
const uuid = Crypto.randomUUID();`,
  },
  {
    name: 'expo-store-review',
    version: '^55.0.8',
    category: 'Utilities',
    description: 'Request App Store / Play Store review from users.',
    importExample: `import * as StoreReview from 'expo-store-review';`,
    usageExample: `import * as StoreReview from 'expo-store-review';

// Check if review dialog is available (not always shown by OS)
if (await StoreReview.hasAction()) {
  await StoreReview.requestReview();
}`,
    notes: 'iOS/Android rate-limits how often this shows. Do not call on every app launch.',
  },

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  {
    name: '@notifee/react-native',
    version: '^9.1.8',
    category: 'Notifications',
    description: 'Local and remote push notifications. More powerful than expo-notifications.',
    importExample: `import notifee, { AndroidImportance } from '@notifee/react-native';`,
    usageExample: `import notifee from '@notifee/react-native';

async function showNotification() {
  await notifee.requestPermission();

  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
  });

  await notifee.displayNotification({
    title: 'Hello!',
    body: 'This is a local notification.',
    android: { channelId },
  });
}`,
  },
];

export const EXPLICITLY_EXCLUDED = [
  { name: '@react-native-firebase/app', reason: 'Use Firebase Web SDK (import from "firebase/app") instead — native Firebase is not compiled in' },
  { name: '@react-native-firebase/*', reason: 'Native Firebase modules not in AppTuner SDK. Use Firebase Web SDK.' },
  { name: 'react-native-ble-plx', reason: 'Bluetooth not in AppTuner SDK' },
  { name: 'react-native-iap', reason: 'In-app purchases not in AppTuner SDK' },
  { name: 'react-native-nfc-manager', reason: 'NFC not in AppTuner SDK' },
  { name: 'react-native-camera', reason: 'Deprecated — use react-native-vision-camera or expo-camera (both pre-installed)' },
  { name: 'expo-print', reason: 'Not in AppTuner SDK — niche use case' },
  { name: 'expo-mail-composer', reason: 'Not in AppTuner SDK — use Linking.openURL("mailto:...") instead' },
  { name: 'expo-notifications', reason: 'Not in AppTuner SDK — use @notifee/react-native instead (pre-installed, more powerful)' },
];

export const PROJECT_STRUCTURE = `# AppTuner Project Structure

Every AppTuner app MUST follow this structure.

## Required: index.js entry point

\`\`\`javascript
// index.js (project root) — REQUIRED
import { AppRegistry } from 'react-native';
import App from './App';

// CRITICAL: AppTuner reads global.App to render your component
global.App = App;

AppRegistry.registerComponent('YourAppName', () => App);
\`\`\`

Do NOT use \`registerRootComponent()\` from Expo. Use \`AppRegistry.registerComponent\` directly.

## package.json

\`\`\`json
{
  "name": "my-apptuner-app",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "react": "19.1.4",
    "react-native": "0.81.6"
  }
}
\`\`\`

**Important:**
- SDK libraries (@react-navigation, expo-camera, react-native-maps, etc.) do NOT need to be in package.json — they are pre-installed in the AppTuner runtime
- React version MUST be 19.1.4 (matches AppTuner runtime exactly)

## Run for preview

\`\`\`bash
npx apptuner start
\`\`\`

Scan the QR code with AppTuner Mobile app. Changes hot-reload instantly over the internet.

## metro.config.js (recommended)

\`\`\`javascript
const { getDefaultConfig } = require('@react-native/metro-config');
module.exports = getDefaultConfig(__dirname);
\`\`\`
`;

export function formatSdkManifest(): string {
  const categories = [...new Set(SDK_LIBRARIES.map(l => l.category))];

  let out = `# AppTuner SDK ${SDK_VERSION} — Available Libraries\n\n`;
  out += `React Native: ${RN_VERSION} | React: ${REACT_VERSION}\n\n`;
  out += `These libraries are pre-installed in the AppTuner runtime. Apps do NOT need to bundle them.\n\n`;

  for (const cat of categories) {
    const libs = SDK_LIBRARIES.filter(l => l.category === cat);
    out += `## ${cat}\n`;
    for (const lib of libs) {
      out += `- **${lib.name}** \`${lib.version}\` — ${lib.description}\n`;
    }
    out += '\n';
  }

  out += `## NOT Available (explicitly excluded)\n`;
  for (const ex of EXPLICITLY_EXCLUDED) {
    out += `- **${ex.name}** — ${ex.reason}\n`;
  }

  out += `\n---\n${PROJECT_STRUCTURE}`;
  return out;
}

export function formatLibraryDoc(lib: SdkLibrary): string {
  let out = `# ${lib.name} \`${lib.version}\`\n\n`;
  out += `**Category:** ${lib.category}\n\n`;
  out += `${lib.description}\n\n`;
  if (lib.notes) out += `> **Note:** ${lib.notes}\n\n`;
  out += `## Import\n\n\`\`\`typescript\n${lib.importExample}\n\`\`\`\n\n`;
  out += `## Usage Example\n\n\`\`\`typescript\n${lib.usageExample}\n\`\`\`\n`;
  if (lib.relatedLibraries?.length) {
    out += `\n## Related Libraries\n${lib.relatedLibraries.map(r => `- ${r}`).join('\n')}\n`;
  }
  return out;
}
