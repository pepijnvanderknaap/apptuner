# Consecutive Metro Hot Reload Fix - Working State

**Status:** ✅ WORKING - Triple consecutive Metro bundles successfully tested (111111 → 222222 → 333333)

**Date:** 2026-02-09

## Problem Summary

Consecutive Metro bundle hot reloads were failing with the error:
```
Invariant Violation: `new NativeEventEmitter()` requires a non-null argument
```

**Pattern:**
- First Metro bundle: ✅ Works
- Second Metro bundle: ❌ Crashes with NativeEventEmitter error
- Simple bundles (non-Metro): ✅ Always work

## Root Cause

The crash occurred in two places:

1. **Image Wrapping Code** (Primary cause - FIXED)
   - Location: `test-app/metro-bundle.js` lines 424-492 (now removed)
   - The code accessed `this.ReactNative.Image` to create a wrapped Image component
   - Accessing the `.Image` property triggered React Native to internally load the Image module
   - The Image module creates a NativeEventEmitter with null argument
   - This happened BEFORE our pure mock patch could intercept it
   - **Solution:** Completely removed Image wrapping code (lines 452-454 now just skip it)

2. **NativeEventEmitter Invariant Check** (Secondary issue)
   - React Native's NativeEventEmitter constructor has an invariant that rejects null/undefined modules
   - We cannot prevent the invariant check from running if we call the original constructor
   - **Solution:** Pure mock pattern that NEVER calls the original constructor for null modules

## The Fix

### 1. Pure Mock NativeEventEmitter (CRITICAL)

**File:** `test-app/metro-bundle.js` lines 424-437

```javascript
const SafeNativeEventEmitterConstructor = function(nativeModule) {
  if (!nativeModule) {
    console.warn('[Bundle] NativeEventEmitter created with null module, returning pure mock (NOT calling original)');
    // Return pure mock WITHOUT calling original constructor (which has invariant check)
    this.addListener = function() { return { remove: function() {} }; };
    this.removeListener = function() {};
    this.removeAllListeners = function() {};
    this.emit = function() {};
    this.listenerCount = function() { return 0; };
    return this; // KEY: Don't call original constructor - just return mock
  }
  // For real native modules, call original constructor
  return OriginalNativeEventEmitter.call(this, nativeModule);
};
```

**Why this works:**
- When `nativeModule` is null/undefined, we create mock methods directly on `this`
- We return `this` WITHOUT calling the original constructor
- This completely bypasses the invariant check
- The mock is sufficient for modules that don't actually use native events

### 2. Remove Image Wrapping Code (CRITICAL)

**File:** `test-app/metro-bundle.js` lines 452-454

```javascript
// SKIP: Image wrapping removed - accessing this.ReactNative.Image triggers
// NativeEventEmitter crash before patch can help. Will revisit later.
console.log('[Bundle] ⚠️ Skipping Image wrapping to avoid NativeEventEmitter crash');
```

**Previous code (lines 424-492 - REMOVED):**
- Created WrappedImage component
- Accessed `this.ReactNative.Image` to get original Image
- Set up Metro require interceptor
- This code was the PRIMARY source of crashes

**Why removal works:**
- Accessing `this.ReactNative.Image` immediately loads the Image module
- Image module internally creates NativeEventEmitter before our patch applies
- By not accessing Image at all, we avoid triggering the crash
- Images can be handled differently later (if needed)

### 3. Global App Extraction (Already working)

**File:** `mobile/src/services/executor.ts` lines 88-113

```typescript
if ((global as any).__r) {
  try {
    // Call Metro's require to get module 0 (entry point)
    const module0Exports = (global as any).__r(0);

    // Get the default export (the App component)
    const AppComponent = module0Exports?.default || module0Exports;

    if (AppComponent) {
      // Force set it on the real global object
      (global as any).App = AppComponent;
      console.log('[Executor] ✅ Successfully set global.App from module system');
    }
  } catch (moduleError) {
    console.error('[Executor] ❌ ERROR extracting App from module system:', moduleError);
    throw moduleError;
  }
}
```

This ensures consecutive bundles properly replace the App component.

## Testing Results

**Test sequence:**
1. 111111 (Metro bundle) → ✅ SUCCESS
2. 222222 (Metro bundle) → ✅ SUCCESS (consecutive!)
3. 333333 (Metro bundle) → ✅ SUCCESS (triple consecutive!)

**Previous failed attempts:**
- 77777 (Metro) ✅ → 88888 (Simple) ✅ → 99999 (Metro) ❌ CRASHED
- The crash always occurred on the second consecutive Metro bundle

## Key Files Modified

1. **test-app/metro-bundle.js**
   - Lines 424-437: Pure mock NativeEventEmitter constructor
   - Lines 452-454: Removed Image wrapping code (was lines 424-492)
   - Lines 445-450: Patch applied immediately to both `this.ReactNative` and `globalObj.ReactNative`

2. **test-app/App.tsx**
   - Test counter values: 111111 → 222222 → 333333
   - No Image imports (commented out lines 5-8)

3. **mobile/src/services/executor.ts**
   - Lines 70-74: Delete old global.App before executing new bundle
   - Lines 88-113: Extract App from Metro module system using `__r(0)`

## What NOT To Do

❌ **DO NOT** access `this.ReactNative.Image` in the wrapper before bundle execution
❌ **DO NOT** call the original NativeEventEmitter constructor for null modules
❌ **DO NOT** try to patch NativeEventEmitter AFTER accessing Image
❌ **DO NOT** rely on `__d` hijacking alone - it doesn't catch all cases

## What TO Do

✅ **DO** patch NativeEventEmitter BEFORE accessing any React Native properties
✅ **DO** use pure mock pattern (no original constructor call) for null modules
✅ **DO** avoid accessing React Native modules until absolutely necessary
✅ **DO** extract App from Metro's `__r(0)` instead of relying on `global.App`

## Known Limitations

1. **No Image asset support currently**
   - Image wrapping code was removed to fix crashes
   - Images using require('./assets/logo.png') won't resolve properly
   - This can be revisited later with a different approach

2. **__d hijacking doesn't work**
   - Lines 304-354 in metro-bundle.js attempt to hijack `__d`
   - It installs successfully but never catches react-native module
   - Can be removed to reduce noise in logs
   - Not needed since pure mock fix works

## Future Improvements

1. **Clean up debug logging**
   - Remove verbose __d hijack logs (lines 304-354)
   - Remove module counting logs
   - Keep only essential logs

2. **Enable auto-send**
   - Detect file changes and automatically send bundles
   - Currently requires manual "Send Test Bundle" button click

3. **Re-implement Image support**
   - Find a way to handle images without accessing `this.ReactNative.Image` early
   - Maybe patch Image module directly via __d if we can make it work
   - Or use a different asset resolution strategy

4. **Test with real projects**
   - Currently only tested with test-app
   - Need to verify with production React Native apps
   - Test with various React Native versions

## Commit This State

To preserve this working state, create a git commit:

```bash
git add test-app/metro-bundle.js test-app/App.tsx mobile/src/services/executor.ts
git commit -m "Fix consecutive Metro hot reload crashes

- Remove Image wrapping code that triggered NativeEventEmitter crash
- Implement pure mock NativeEventEmitter pattern (no original constructor call)
- Successfully tested triple consecutive Metro bundles (111111→222222→333333)
- See CONSECUTIVE_HOT_RELOAD_FIX.md for detailed documentation"
```

## How to Restore This State

If you break this in the future:

1. **Check git log for this commit:**
   ```bash
   git log --all --grep="consecutive Metro hot reload"
   ```

2. **Create a new branch from this commit:**
   ```bash
   git checkout -b restore-working-hot-reload <commit-hash>
   ```

3. **Or cherry-pick specific file versions:**
   ```bash
   git checkout <commit-hash> -- test-app/metro-bundle.js
   ```

4. **Or read this documentation file** to understand what was working

## Contact / Notes

- This fix was developed through extensive debugging and testing
- The key insight was that accessing React Native properties triggers module loading
- Pure mock pattern is essential - cannot call original constructor
- Triple consecutive test (111111→222222→333333) proves stability
