/**
 * Yoyo Dev Spiral Logo
 *
 * ASCII art spiral logo with multiple variants:
 * - Compact: Single-line logo for header
 * - Full: Multi-line logo for splash screens
 * - Animated: Spinning spiral (future enhancement)
 */

import React from 'react';
import { Text } from 'ink';
import { semanticColors } from '../theme/colors.js';

export type LogoVariant = 'compact' | 'full' | 'minimal';

export interface LogoProps {
  variant?: LogoVariant;
  showText?: boolean;
  color?: string;
}

/**
 * Spiral Logo Designs (ASCII Art)
 */
const LOGOS = {
  // Compact single-line spiral (best for header)
  compact: '◉◎○',

  // Minimal single character
  minimal: '◉',

  // Full multi-line spiral
  full: `
    ╭─◉─╮
    │ ◎ │
    ╰─○─╯
  `.trim(),

  // Alternative compact designs
  compact_alt1: '⊚⊙○',  // Double circle to single circle
  compact_alt2: '◉⟲',    // Spiral with circular arrow
  compact_alt3: '◉◠◡',   // Spiral with curves
  compact_alt4: '◉∿∾',   // Spiral with waves
  compact_alt5: '⊛⊚⊙',  // Decreasing circles
};

/**
 * Logo Component
 */
export const Logo: React.FC<LogoProps> = ({
  variant = 'compact',
  showText = true,
  color = semanticColors.primary,
}) => {
  const logoArt = variant === 'full'
    ? LOGOS.full
    : variant === 'minimal'
    ? LOGOS.minimal
    : LOGOS.compact;

  return (
    <>
      <Text bold color={color}>
        {logoArt}
      </Text>
      {showText && variant !== 'full' && (
        <Text bold color={semanticColors.textPrimary}>
          {' '}Yoyo Dev
        </Text>
      )}
      {showText && variant === 'full' && (
        <>
          {'\n'}
          <Text bold color={semanticColors.textPrimary}>
            Yoyo Dev
          </Text>
        </>
      )}
    </>
  );
};

/**
 * Logo variants for different use cases
 */
export const CompactLogo: React.FC = () => (
  <Logo variant="compact" showText={true} />
);

export const MinimalLogo: React.FC = () => (
  <Logo variant="minimal" showText={false} />
);

export const FullLogo: React.FC = () => (
  <Logo variant="full" showText={true} />
);

/**
 * Export all logo designs for reference
 */
export const LOGO_DESIGNS = LOGOS;
