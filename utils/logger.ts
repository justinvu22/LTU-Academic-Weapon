/**
 * Custom logger utility that can be disabled in production
 * and provide better formatting and control over logging
 */

const isProduction = process.env.NODE_ENV === 'production';
const isClient = typeof window !== 'undefined';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Configuration for the logger
 */
interface LoggerConfig {
  enabledInProduction: boolean;
  minLevel: LogLevel;
  enableTimestamps: boolean;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  enabledInProduction: false, // Disable logging in production by default
  minLevel: 'info',           // Minimum log level to display
  enableTimestamps: true,     // Include timestamps in log messages
};

// Current configuration
let config: LoggerConfig = { ...defaultConfig };

/**
 * Get log level priority
 */
const getLevelPriority = (level: LogLevel): number => {
  switch (level) {
    case 'debug': return 0;
    case 'info': return 1;
    case 'warn': return 2;
    case 'error': return 3;
    default: return 1;
  }
};

/**
 * Check if logging is enabled based on environment and config
 */
const isLoggingEnabled = (level: LogLevel): boolean => {
  if (isProduction && !config.enabledInProduction) return false;
  return getLevelPriority(level) >= getLevelPriority(config.minLevel);
};

/**
 * Format log message with optional timestamp
 */
const formatMessage = (level: LogLevel, message: string): string => {
  if (!config.enableTimestamps) return message;
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

/**
 * Logger implementation
 */
const logger = {
  /**
   * Configure the logger
   */
  configure: (newConfig: Partial<LoggerConfig>): void => {
    config = { ...config, ...newConfig };
  },

  /**
   * Log information message
   */
  info: (...args: any[]): void => {
    if (!isLoggingEnabled('info')) return;
    if (isClient) {
      console.info(...args);
    } else {
      console.info(formatMessage('info', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')));
    }
  },

  /**
   * Log warning message
   */
  warn: (...args: any[]): void => {
    if (!isLoggingEnabled('warn')) return;
    if (isClient) {
      console.warn(...args);
    } else {
      console.warn(formatMessage('warn', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')));
    }
  },

  /**
   * Log error message
   */
  error: (...args: any[]): void => {
    if (!isLoggingEnabled('error')) return;
    if (isClient) {
      console.error(...args);
    } else {
      console.error(formatMessage('error', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')));
    }
  },

  /**
   * Log debug message
   */
  debug: (...args: any[]): void => {
    if (!isLoggingEnabled('debug')) return;
    if (isClient) {
      console.debug(...args);
    } else {
      console.debug(formatMessage('debug', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')));
    }
  },
};

export default logger; 