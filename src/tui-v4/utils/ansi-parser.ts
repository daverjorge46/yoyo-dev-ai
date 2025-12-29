/**
 * ANSI Escape Code Parser
 *
 * Utilities for handling ANSI escape codes in terminal output:
 * - Strip ANSI codes for plain text
 * - Preserve color codes for styled rendering
 * - Parse and convert to Ink-compatible styles
 */

/**
 * Strip all ANSI escape codes from text
 */
export function stripAnsi(text: string): string {
  // Remove all ANSI escape sequences
  // Pattern matches: ESC [ ... m (color/style codes)
  //                  ESC [ ... (other control sequences)
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Check if text contains ANSI codes
 */
export function hasAnsi(text: string): boolean {
  return /\x1b\[[0-9;]*[a-zA-Z]/.test(text);
}

/**
 * Extract ANSI color information
 */
export interface AnsiStyle {
  foreground?: string;
  background?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

const ANSI_COLOR_MAP: Record<number, string> = {
  30: 'black',
  31: 'red',
  32: 'green',
  33: 'yellow',
  34: 'blue',
  35: 'magenta',
  36: 'cyan',
  37: 'white',
  90: 'gray',
  91: 'redBright',
  92: 'greenBright',
  93: 'yellowBright',
  94: 'blueBright',
  95: 'magentaBright',
  96: 'cyanBright',
  97: 'whiteBright',
};

/**
 * Parse ANSI codes and extract style information
 */
export function parseAnsiStyles(text: string): Array<{ text: string; style: AnsiStyle }> {
  const result: Array<{ text: string; style: AnsiStyle }> = [];
  let currentStyle: AnsiStyle = {};
  let currentText = '';

  const regex = /(\x1b\[[0-9;]*m)|([^\x1b]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      // ANSI escape code
      if (currentText) {
        result.push({ text: currentText, style: { ...currentStyle } });
        currentText = '';
      }

      const codes = match[1].slice(2, -1).split(';').map(Number);

      for (const code of codes) {
        if (code === 0) {
          // Reset
          currentStyle = {};
        } else if (code === 1) {
          currentStyle.bold = true;
        } else if (code === 2) {
          currentStyle.dim = true;
        } else if (code === 3) {
          currentStyle.italic = true;
        } else if (code === 4) {
          currentStyle.underline = true;
        } else if (code >= 30 && code <= 37) {
          currentStyle.foreground = ANSI_COLOR_MAP[code];
        } else if (code >= 90 && code <= 97) {
          currentStyle.foreground = ANSI_COLOR_MAP[code];
        } else if (code >= 40 && code <= 47) {
          currentStyle.background = ANSI_COLOR_MAP[code - 10];
        }
      }
    } else if (match[2]) {
      // Regular text
      currentText += match[2];
    }
  }

  if (currentText) {
    result.push({ text: currentText, style: { ...currentStyle } });
  }

  return result;
}

/**
 * Convert ANSI styled text to plain text segments for Ink rendering
 */
export function ansiToInkProps(text: string): string {
  // For now, just strip ANSI codes
  // Future: Could return array of {text, props} for styled rendering
  return stripAnsi(text);
}
