/**
 * Accordion Component
 *
 * Expandable/collapsible sections with animation.
 */

import { useState, useRef, useEffect, ReactNode, KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
}

interface AccordionProps {
  /** Array of accordion items */
  items: AccordionItem[];
  /** Allow multiple items to be open at once */
  allowMultiple?: boolean;
  /** Additional className */
  className?: string;
}

export function Accordion({ items, allowMultiple = false, className = '' }: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    items.forEach(item => {
      if (item.defaultOpen) {
        initial.add(item.id);
      }
    });
    return initial;
  });

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);

      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
      }

      return newSet;
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleItem(id);
    }
  };

  return (
    <div className={`accordion divide-y divide-terminal-border ${className}`}>
      {items.map(item => (
        <AccordionItemComponent
          key={item.id}
          item={item}
          isOpen={openItems.has(item.id)}
          onToggle={() => toggleItem(item.id)}
          onKeyDown={(e) => handleKeyDown(e, item.id)}
        />
      ))}
    </div>
  );
}

interface AccordionItemComponentProps {
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
}

function AccordionItemComponent({ item, isOpen, onToggle, onKeyDown }: AccordionItemComponentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div className="accordion-item">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-terminal-bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-terminal-orange focus:ring-inset"
        onClick={onToggle}
        onKeyDown={onKeyDown}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${item.id}`}
      >
        <div className="flex items-center gap-3">
          {item.icon && (
            <span className="text-terminal-orange">{item.icon}</span>
          )}
          <span className="font-medium text-white">{item.title}</span>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      <div
        id={`accordion-content-${item.id}`}
        ref={contentRef}
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ height: height !== undefined ? `${height}px` : 'auto' }}
        aria-hidden={!isOpen}
      >
        <div className="p-4 pt-0 text-gray-300">
          {item.content}
        </div>
      </div>
    </div>
  );
}

/**
 * SimpleAccordion - Single expandable section
 */
interface SimpleAccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function SimpleAccordion({
  title,
  children,
  defaultOpen = false,
  icon,
  className = '',
}: SimpleAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={`border border-terminal-border rounded-lg overflow-hidden ${className}`}>
      <button
        className="w-full flex items-center justify-between p-4 text-left bg-terminal-bg-secondary hover:bg-terminal-bg-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-terminal-orange focus:ring-inset"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="text-terminal-orange">{icon}</span>
          )}
          <span className="font-medium text-white">{title}</span>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ height: height !== undefined ? `${height}px` : 'auto' }}
        aria-hidden={!isOpen}
      >
        <div className="p-4 border-t border-terminal-border">
          {children}
        </div>
      </div>
    </div>
  );
}
