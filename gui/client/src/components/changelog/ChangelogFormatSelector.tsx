/**
 * ChangelogFormatSelector Component
 *
 * Dropdown selector for choosing changelog output format.
 * Supports Keep a Changelog, Conventional Commits, and Plain text formats.
 */

import { FileText } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type ChangelogFormat = 'keepachangelog' | 'conventional' | 'plain';

interface FormatOption {
  value: ChangelogFormat;
  label: string;
  description: string;
}

interface ChangelogFormatSelectorProps {
  value: ChangelogFormat;
  onChange: (format: ChangelogFormat) => void;
  disabled?: boolean;
  showDescription?: boolean;
  className?: string;
}

// =============================================================================
// Format Options
// =============================================================================

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: 'keepachangelog',
    label: 'Keep a Changelog',
    description: 'Follows keepachangelog.com format with semantic versioning sections',
  },
  {
    value: 'conventional',
    label: 'Conventional Commits',
    description: 'Git-style commit format with type prefixes (feat:, fix:, etc.)',
  },
  {
    value: 'plain',
    label: 'Plain Text',
    description: 'Simple bullet-point list without special formatting',
  },
];

// =============================================================================
// Component
// =============================================================================

export function ChangelogFormatSelector({
  value,
  onChange,
  disabled = false,
  showDescription = false,
  className = '',
}: ChangelogFormatSelectorProps) {
  const selectedOption = FORMAT_OPTIONS.find((opt) => opt.value === value);

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor="changelog-format"
        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <FileText className="h-4 w-4" />
        Format
      </label>

      <select
        id="changelog-format"
        value={value}
        onChange={(e) => onChange(e.target.value as ChangelogFormat)}
        disabled={disabled}
        className="
          w-full px-3 py-2
          border border-gray-300 dark:border-gray-600
          rounded-lg
          bg-white dark:bg-gray-700
          text-gray-900 dark:text-white
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
        aria-describedby={showDescription ? 'format-description' : undefined}
      >
        {FORMAT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {showDescription && selectedOption && (
        <p
          id="format-description"
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          {selectedOption.description}
        </p>
      )}
    </div>
  );
}

export { FORMAT_OPTIONS };
