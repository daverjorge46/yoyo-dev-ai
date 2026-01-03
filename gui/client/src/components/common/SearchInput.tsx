/**
 * SearchInput Component
 *
 * Debounced search input with clear button.
 */

import { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  /** Current search value */
  value?: string;
  /** Callback when value changes (debounced) */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Additional className */
  className?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Callback for instant (non-debounced) changes */
  onInstantChange?: (value: string) => void;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className = '',
  autoFocus = false,
  onInstantChange,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(controlledValue || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setLocalValue(controlledValue);
    }
  }, [controlledValue]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced onChange
  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onInstantChange?.(newValue);
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onInstantChange?.('');
    onChange('');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search icon */}
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 bg-terminal-bg-secondary border border-terminal-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-terminal-orange focus:border-transparent transition-all"
        aria-label="Search"
      />

      {/* Clear button */}
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-terminal-bg-tertiary text-gray-500 hover:text-white transition-colors"
          title="Clear search"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * SearchInputWithResults - Search input with dropdown results
 */
interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
}

interface SearchInputWithResultsProps extends Omit<SearchInputProps, 'onChange'> {
  results: SearchResult[];
  onSearch: (query: string) => void;
  onSelect: (result: SearchResult) => void;
  isLoading?: boolean;
}

export function SearchInputWithResults({
  results,
  onSearch,
  onSelect,
  isLoading = false,
  ...inputProps
}: SearchInputWithResultsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          onSelect(results[selectedIndex]);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleChange = (value: string) => {
    onSearch(value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <SearchInput
        {...inputProps}
        onChange={handleChange}
        onInstantChange={() => setIsOpen(true)}
      />

      {/* Results dropdown */}
      {isOpen && (results.length > 0 || isLoading) && (
        <div className="absolute z-50 w-full mt-1 bg-terminal-bg-secondary border border-terminal-border rounded-lg shadow-lg max-h-64 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              Searching...
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={result.id}
                className={`w-full text-left px-4 py-2 hover:bg-terminal-bg-tertiary transition-colors ${
                  index === selectedIndex ? 'bg-terminal-bg-tertiary' : ''
                }`}
                onClick={() => {
                  onSelect(result);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="text-white font-medium">{result.title}</div>
                {result.subtitle && (
                  <div className="text-sm text-gray-500 truncate">{result.subtitle}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
