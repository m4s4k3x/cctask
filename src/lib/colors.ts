import { Colors } from "../types/config.ts";

export const colors: Colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  blue: "\x1b[0;34m",
  yellow: "\x1b[0;33m",
  reset: "\x1b[0m",
};

export function error(message: string): void {
  console.error(`${colors.red}エラー: ${message}${colors.reset}`);
}

export function success(message: string): void {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

export function info(message: string): void {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

export function warn(message: string): void {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}