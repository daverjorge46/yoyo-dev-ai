/**
 * Version Management
 *
 * Utilities for CLI version information.
 */

// Version is sourced from package.json
export const VERSION = '4.0.0-alpha.1';

/**
 * Get formatted version string.
 */
export function getVersionString(): string {
  return `yoyo-ai v${VERSION}`;
}

/**
 * Get version info object.
 */
export function getVersionInfo(): {
  version: string;
  name: string;
  description: string;
} {
  return {
    version: VERSION,
    name: 'yoyo-ai',
    description: 'Memory-first AI development framework CLI',
  };
}

/**
 * Print version and exit.
 */
export function printVersion(): void {
  console.log(getVersionString());
}
