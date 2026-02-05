/**
 * Console Interceptor
 * Intercepts console methods and sends logs to relay server
 */

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  args: any[];
  timestamp: number;
}

type LogCallback = (entry: LogEntry) => void;

export class ConsoleInterceptor {
  private callback: LogCallback | null = null;
  private isIntercepting = false;
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };

  constructor() {
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };
  }

  /**
   * Start intercepting console methods
   */
  start(callback: LogCallback): void {
    if (this.isIntercepting) {
      return;
    }

    this.callback = callback;
    this.isIntercepting = true;

    // Intercept each console method
    this.interceptMethod('log');
    this.interceptMethod('info');
    this.interceptMethod('warn');
    this.interceptMethod('error');
    this.interceptMethod('debug');
  }

  /**
   * Stop intercepting console methods
   */
  stop(): void {
    if (!this.isIntercepting) {
      return;
    }

    // Restore original console methods
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;

    this.callback = null;
    this.isIntercepting = false;
  }

  /**
   * Intercept a specific console method
   */
  private interceptMethod(level: LogLevel): void {
    const originalMethod = this.originalConsole[level];

    (console as any)[level] = (...args: any[]) => {
      // Call original method first (so logs still appear in native console)
      originalMethod(...args);

      // Send to callback if active
      if (this.callback && this.isIntercepting) {
        try {
          this.callback({
            level,
            args,
            timestamp: Date.now(),
          });
        } catch (error) {
          // Use original console to avoid infinite loop
          originalMethod('ConsoleInterceptor error:', error);
        }
      }
    };
  }

  /**
   * Manually log an entry (useful for custom logging)
   */
  logEntry(level: LogLevel, ...args: any[]): void {
    if (this.callback && this.isIntercepting) {
      this.callback({
        level,
        args,
        timestamp: Date.now(),
      });
    }
  }
}
