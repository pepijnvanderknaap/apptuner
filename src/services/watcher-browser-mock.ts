/**
 * Browser mock for chokidar
 * File watching doesn't work in the browser, so this is a no-op implementation
 */

export default {
  watch: () => ({
    on: () => {},
    close: () => Promise.resolve(),
  }),
};
