# Hot Reload Debug Log

## Problem
Second bundle doesn't update the phone - Metro's module cache returns old component

## Attempts

### Attempt 1: Delete module 0 from cache (FAILED - caused disconnects)
**Location:** executor.ts, before __r(0) call
**Code:**
```typescript
const metroRequire = (global as any).__r;
if (metroRequire.c && typeof metroRequire.c === 'object') {
  if (metroRequire.c[0]) {
    delete metroRequire.c[0];
  }
}
```
**Result:** Phone briefly disconnected when sending bundle
**Status:** REVERTED

### Attempt 2: Remove __r(0) call from bundle wrapper (PARTIAL SUCCESS)
**Location:** test-app/metro-bundle.js line 371-384
**Change:** Commented out the bundle wrapper's __r(0) call
**Reason:** Bundle wrapper was caching result before executor called __r(0)
**Result:** First bundle loads fine, second bundle still shows old component
**Status:** KEPT (prevents double __r(0) calls)

### Attempt 3: Clear entire Metro cache Map (FAILED - CAUSES DISCONNECT)
**Location:** executor.ts line 490-496
**Code:**
```typescript
const metroRequire = (global as any).__r;
if (metroRequire.c) {
  metroRequire.c.clear();
}
```
**Difference from Attempt 1:** Clears entire Map instead of deleting specific key
**Result:** Phone disconnected (shows "waiting for device" on desktop)
**Status:** REVERTED - cache clearing causes disconnects

## NEW DISCOVERY
User saw 333 after rescan when code says 444. This means **Metro BUNDLER is caching old code**, not just runtime cache. The bundle itself contains old code.

## Current State
- First bundle: Works ✅
- Second bundle: Fails (shows old component) ❌
- Phone stays connected ✅
- Auto-reload: Unknown status

### Attempt 4: Restart Metro server to clear bundler cache (FAILED)
**Action:** Killed metro-server.cjs process to force fresh start
**Reason:** Metro bundler is serving cached 333 code even though App.tsx has 444
**Result:** Metro server didn't auto-restart, caused "failed to bundle project" error
**Status:** FAILED - need to restart entire start:all script

**CRITICAL DISCOVERY:** Metro's `resetCache: true` in metro-bundle.js line 20 is supposed to prevent caching, but it's not working. Need to investigate why.

### Attempt 5: Full Metro restart (PARTIALLY SUCCESSFUL)
**Action:** Killed all processes and restarted with `npm run start:all`
**Result:** First bundle (444) works! Second bundle (555) still fails - shows 444
**Status:** Confirms Metro BUNDLER is not the problem - it's the RUNTIME cache

**CRITICAL DISCOVERY #2:** Metro-bundle.js patching code calls `_g.__c(moduleId)` to clear cache (line 138-143), but this function is NEVER DEFINED! The cache clearing mechanism is broken.

### Attempt 6: Add missing __c cache clearing function (TESTING)
**Location:** metro-bundle.js line 227-235 (after __APPTUNER_GLOBAL definition)
**Code:**
```javascript
globalObj.__APPTUNER_GLOBAL.__c = function(moduleId) {
  const metroRequire = globalObj.__r;
  if (metroRequire && metroRequire.c) {
    metroRequire.c.delete(moduleId);
  }
};
```
**Reason:** Patched `__d` code calls `_g.__c(moduleId)` but this function was never defined
**Status:** TESTING - user needs to click "Send Metro Bundle" for 666 test

### Attempt 7: Fix __c access using Function('return this')() (FAILED)
**Location:** metro-bundle.js line 122-149 (patched __d code)
**Problem:** __c function is defined but never called - Metro's `global` parameter shadows the real global
**Root Cause:** Metro wraps bundles in `(function(global) {...})` which hides `__APPTUNER_GLOBAL`
**Change:** Use `Function('return this')()` to get TRUE global, bypassing Metro's shadowing
**Code:**
```javascript
const _trueGlobal = Function('return this')();
const _g = _trueGlobal.__APPTUNER_GLOBAL || _trueGlobal;
```
**Result:** 666→888 FAILED (still shows 666), no logs from patched code
**Status:** FAILED - patching approach not working, regex might not be matching

### Attempt 8: Delete ONLY module 0 from cache (FAILED)
**Location:** executor.ts line 491-496 (before __r(0) call)
**Strategy:** Abandon __d patching, clear cache in executor instead
**Difference from Attempt 1:** Use .delete(0) instead of deleting from array
**Difference from Attempt 3:** Delete ONLY module 0, not entire cache
**Code:**
```typescript
const metroRequire = (global as any).__r;
if (metroRequire.c && typeof metroRequire.c.delete === 'function') {
  metroRequire.c.delete(0);
}
```
**Result:** 666→999 FAILED (still shows 666)
**Status:** FAILED - deleting from Map doesn't work

### Attempt 9: Reset isInitialized flag for module 0 (FAILED - CAUSES DISCONNECT)
**Location:** executor.ts line 491-502 (before __r(0) call)
**Strategy:** Reset isInitialized flag instead of deleting entry
**How Metro cache works:** Map with {factory, isInitialized, publicModule}
**Change:** Set module0.isInitialized = false instead of deleting
**Code:**
```typescript
const module0 = metroRequire.c.get(0);
if (module0) {
  module0.isInitialized = false;
}
```
**Result:** Phone DISCONNECTED (desktop shows "waiting for mobile device")
**Status:** FAILED - resetting isInitialized also causes disconnects

## CRITICAL PATTERN DISCOVERED
**ALL attempts to manipulate Metro's cache from executor cause disconnects:**
- Attempt 1: `delete metroRequire.c[0]` → DISCONNECT
- Attempt 3: `metroRequire.c.clear()` → DISCONNECT
- Attempt 8: `metroRequire.c.delete(0)` → DISCONNECT
- Attempt 9: `module0.isInitialized = false` → DISCONNECT

**Conclusion:** We CANNOT touch Metro's cache from the executor. Must use __d patching approach.

### Attempt 10: Fix global access in __d patching (FAILED)
**Location:** metro-bundle.js line 130-133 (patched __d code)
**Problem:** Function('return this')() returns undefined in strict mode
**Root Cause:** React Native uses strict mode, so Function constructor doesn't work
**Change:** Use same reliable global access pattern as bundle wrapper
**Result:** 2222→3333 FAILED (still shows 2222), NO [HotReload] logs at all
**Status:** FAILED - __d is never called for module 0 in second bundle!

**CRITICAL DISCOVERY #3:** Module 0 is NOT redefined via `__d` in the second bundle! It already exists in the modules Map from the first bundle, so `__d(0, ...)` is never called. All __d patching attempts were trying to intercept something that doesn't happen!

### Attempt 11: Clear module 0 cache in bundle wrapper (FAILED)
**Location:** metro-bundle.js line 387-400 (after bundle executes, before executor)
**Strategy:** Abandon __d patching entirely, clear cache in bundle wrapper instead
**Difference from Attempt 9:** Runs in BUNDLE WRAPPER context, not executor context
**Timing:** After Metro bundle defines modules, before executor calls __r(0)
**Code:**
```javascript
const mod0 = __r.c.get(0);
if (mod0 && mod0.isInitialized) {
  mod0.isInitialized = false;
}
```
**Result:** 2222→4444 FAILED (still shows 2222), code never executed (no logs)
**Root Cause:** Used `__r` instead of `globalObj.__r` - variable not in scope
**Status:** FAILED - __r is not a local variable, it's globalObj.__r

### Attempt 12: Fix globalObj.__r reference (FAILED - METRO CACHE)
**Location:** metro-bundle.js line 387-410 (after bundle executes, before executor)
**Strategy:** Same as Attempt 11 but fix variable reference
**Change:** Use `globalObj.__r` instead of plain `__r`
**Result:** 2222→5555 FAILED - Metro served 2222 even though App.tsx had 5555
**Root Cause:** Metro's internal cache persists across bundle() calls, ignoring resetCache: true
**Status:** FAILED - discovered Metro bundler cache is the root problem

**CRITICAL DISCOVERY #4:** Metro's `resetCache: true` in loadConfig doesn't actually clear the cache for programmatic runBuild() calls. The bundler caches transformed modules and serves old code (2222) even though source files have new code (5555). This is THE root cause of hot reload failure!

### Attempt 13: Manually clear Metro cache directories (FAILED - WRONG ROOT CAUSE)
**Location:** metro-bundle.js line 9-31 (before Metro.loadConfig)
**Strategy:** Manually delete .metro and temp cache directories before bundling
**Result:** 2222→6666 FAILED - Metro served 2222, cache clearing didn't help
**Root Cause:** Bundle sizes were changing (117KB → 118KB → 119KB) proving Metro WAS re-bundling fresh code. The problem is NOT Metro's bundler cache!
**Status:** FAILED - discovered the real issue is runtime cache, not bundler cache

**CRITICAL DISCOVERY #5:** Metro bundle sizes changed with each request, proving Metro IS generating fresh bundles. The issue is NOT the bundler cache - it's that the runtime cache on the phone never gets cleared!

### Attempt 14: Move cache clearing BEFORE bundle execution (TESTING)
**Location:** metro-bundle.js line 407-430 (before `code +`)
**Strategy:** Execute cache clearing BEFORE Metro bundle runs, not after
**Discovery:** Bundle wrapper logs showed execution stops after Metro bundle code executes
**Evidence:** `[Metro Bundle] Cache clearing function __c installed` appears, but `[Metro Bundle] Bundle executed, __r available: true` never appears in bundles 2-4
**Root Cause:** Metro bundle code has return/throw that prevents wrapper from continuing
**Change:** Moved cache clearing from AFTER `code +` to BEFORE `code +`
**Code:**
```javascript
// Clear module 0 cache BEFORE executing bundle
if (typeof globalObj.__r === 'function' && globalObj.__r.c && globalObj.__r.c.get) {
  const mod0 = globalObj.__r.c.get(0);
  if (mod0 && mod0.isInitialized) {
    mod0.isInitialized = false;
    console.log('[Bundle] ✅ Module 0 cache cleared!');
  }
}
// Then execute Metro bundle
code +
```
**Why this should work:** Clears cache before Metro bundle executes, avoiding any return statements in Metro bundle
**Status:** PARTIAL - code runs BEFORE bundle but still failed (8888→9999 showed 8888)

### Attempt 15: Fix cache access to use originalRequire.c (SUCCESS! 🎉)
**Location:** metro-bundle.js line 368 (cache clearing code)
**Problem:** Line 384 overwrites `globalObj.__r` with a wrapper function that doesn't have `.c` property
**Root Cause:** Cache clearing code at line 407 tried to access `globalObj.__r.c` but got undefined because `globalObj.__r` is now the wrapper, not the original Metro require
**Discovery:** Line 379 stores `const originalRequire = globalObj.__r` BEFORE we overwrite it
**Solution:** Change cache clearing code to use `originalRequire.c` instead of `globalObj.__r.c`
**Code:**
```javascript
// Line 368: Use originalRequire.c because we overwrote globalObj.__r with a wrapper
if (originalRequire && originalRequire.c && originalRequire.c.get) {
  const mod0 = originalRequire.c.get(0);
```
**Result:** 8888→9999 SUCCESS! Phone updated from 8888 to 9999! ✅
**Status:** ✅ **HOT RELOAD FIXED!** Cache clearing now works correctly!

## SOLUTION SUMMARY

**The Fix:**
Metro-bundle.js lines 365-384 wrap Metro's `__r` function to intercept Image imports. Line 379 stores the original:
```javascript
const originalRequire = globalObj.__r;
globalObj.__r = function(moduleId) { /* wrapper */ };
```

Cache clearing code MUST use `originalRequire.c` to access Metro's cache Map, NOT `globalObj.__r.c` (which is undefined because the wrapper doesn't have `.c`).

**Why It Works:**
1. Bundle wrapper stores `originalRequire` before replacing `globalObj.__r`
2. Cache clearing code runs BEFORE Metro bundle executes (lines 365-384)
3. Accesses `originalRequire.c.get(0)` to check module 0's cache state
4. Sets `mod0.isInitialized = false` to force re-execution
5. Metro bundle executes and calls `__r(0)` which re-initializes the component

**Result:**
- First bundle (8888): Loads fresh ✅
- Second bundle (9999): Cache cleared, updates to 9999 ✅
- Hot reload: **WORKING!** 🎉

## Next Steps
1. ✅ Hot reload working for manual bundle clicks
2. Test auto-reload (file watcher triggers automatic updates)
3. Test with more complex changes (not just counter values)
4. Consider optimizing to only clear changed modules (not always module 0)
