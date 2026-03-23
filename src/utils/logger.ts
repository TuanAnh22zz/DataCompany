export class Logger {
    static info(message: string, ...args: any[]) {
      console.log(`ℹ[INFO] ${message}`, ...args);
    }
  
    static success(message: string, ...args: any[]) {
      console.log(`[SUCCESS] ${message}`, ...args);
    }
  
    static error(message: string, ...args: any[]) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  
    static warn(message: string, ...args: any[]) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  
    static debug(message: string, ...args: any[]) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] ${message}`, ...args);
      }
    }
  }