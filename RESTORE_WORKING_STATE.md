# Quick Reference: Restore Working Hot Reload State

## Working State Preserved

✅ **Commit:** `44bf97d` - "Fix consecutive Metro hot reload crashes - WORKING STATE"
✅ **Tag:** `working-consecutive-hot-reload`
✅ **Date:** 2026-02-09
✅ **Status:** Triple consecutive Metro hot reload working (111111→222222→333333)

## How to Restore This State

### Option 1: Checkout the tagged version (recommended)

```bash
# View the tag
git show working-consecutive-hot-reload

# Create a new branch from this state
git checkout -b restore-hot-reload working-consecutive-hot-reload

# Or restore to main (be careful!)
git checkout main
git reset --hard working-consecutive-hot-reload
```

### Option 2: Restore specific files only

```bash
# Restore just the key files without changing your branch
git checkout working-consecutive-hot-reload -- test-app/metro-bundle.js
git checkout working-consecutive-hot-reload -- test-app/App.tsx
git checkout working-consecutive-hot-reload -- mobile/src/services/executor.ts
```

### Option 3: View the changes

```bash
# See what was changed in this commit
git show 44bf97d

# See the diff for a specific file
git show 44bf97d:test-app/metro-bundle.js
```

## Verify It's Working

After restoring, test with:

1. Start all services: `npm run start:all`
2. Connect mobile device
3. Edit `test-app/App.tsx` and change the counter value
4. Click "Send Test Bundle" (or wait for auto-send)
5. Verify the app updates on your phone
6. Repeat 2-3 times to confirm consecutive updates work

Expected result: All updates load successfully without NativeEventEmitter crashes

## Key Fix Details

**Two critical changes:**

1. **Removed Image wrapping code** (metro-bundle.js lines 452-454)
   - Previously tried to access `this.ReactNative.Image`
   - This triggered module load BEFORE our patch could work
   - Now simply skipped

2. **Pure mock NativeEventEmitter** (metro-bundle.js lines 424-437)
   - Does NOT call original constructor for null modules
   - Creates mock methods directly on `this`
   - Bypasses invariant check completely

See [CONSECUTIVE_HOT_RELOAD_FIX.md](CONSECUTIVE_HOT_RELOAD_FIX.md) for comprehensive documentation.

## Quick Test Sequence

```bash
# Change counter in test-app/App.tsx to verify:
# First: 111111
# Second: 222222
# Third: 333333

# Each should load successfully without crashes
```

## If It's Still Broken

1. Read [CONSECUTIVE_HOT_RELOAD_FIX.md](CONSECUTIVE_HOT_RELOAD_FIX.md) - explains what NOT to do
2. Check that metro-bundle.js lines 452-454 skip Image wrapping
3. Check that metro-bundle.js lines 424-437 use pure mock pattern
4. Check that executor.ts extracts App from `__r(0)` not global
5. Make sure you didn't re-introduce Image property access

## Contact / Support

If you need help restoring this state or understanding why it works, refer to the comprehensive documentation in CONSECUTIVE_HOT_RELOAD_FIX.md
