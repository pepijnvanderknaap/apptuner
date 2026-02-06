/**
 * Safe invariant that doesn't crash on NativeEventEmitter errors
 */

function safeInvariant(condition, format, ...args) {
  if (!condition) {
    // Suppress NativeEventEmitter errors specifically
    if (format && (
      format.includes('NativeEventEmitter') ||
      format.includes('non-null argument') ||
      format.includes('nativeModule')
    )) {
      console.warn('[Safe Invariant] Suppressed:', format);
      return;
    }

    // For other invariants, throw the error
    let error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      let argIndex = 0;
      error = new Error(
        format.replace(/%s/g, () => String(args[argIndex++]))
      );
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1;
    throw error;
  }
}

module.exports = safeInvariant;
