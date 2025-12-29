/**
 * RoadmapFeature Component
 *
 * Displays a single feature/item within a roadmap phase.
 * Shows completion status, effort badge, and links to specs.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, ExternalLink } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface RoadmapFeatureItem {
  id: string;
  number: number;
  title: string;
  completed: boolean;
  effort: 'XS' | 'S' | 'M' | 'L' | 'XL' | null;
  description?: string;
  subItems?: string[];
  linkedSpec?: string;
  linkedFix?: string;
}

export interface RoadmapFeatureProps {
  /** Feature item data */
  feature: RoadmapFeatureItem;
  /** Zoom level (25-150) */
  zoom: number;
}

// =============================================================================
// Sub-Components
// =============================================================================

function EffortBadge({ effort }: { effort: RoadmapFeatureItem['effort'] }) {
  if (!effort) return null;

  const colors: Record<string, string> = {
    XS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    S: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    M: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    L: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    XL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colors[effort]}`}>
      {effort}
    </span>
  );
}

// =============================================================================
// Component
// =============================================================================

export function RoadmapFeature({ feature, zoom }: RoadmapFeatureProps) {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (feature.linkedSpec) {
      navigate(`/specs?id=${feature.linkedSpec}`);
    } else if (feature.linkedFix) {
      navigate(`/fixes?id=${feature.linkedFix}`);
    }
  };

  const isClickable = feature.linkedSpec || feature.linkedFix;
  const scale = zoom / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      data-testid={`roadmap-feature-${feature.id}`}
      role="listitem"
    >
      <div
        onClick={isClickable ? handleClick : undefined}
        className={`flex items-start gap-2 p-2 rounded transition-all ${
          isClickable
            ? 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
            : ''
        }`}
        style={{ fontSize: `${scale * 0.875}rem` }}
      >
        {/* Checkbox */}
        <div className="flex-shrink-0 mt-0.5" data-completed={feature.completed}>
          {feature.completed ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-medium ${
                feature.completed
                  ? 'text-gray-500 dark:text-gray-400 line-through'
                  : 'text-gray-800 dark:text-gray-200'
              }`}
            >
              {feature.number}. {feature.title}
            </span>
            <EffortBadge effort={feature.effort} />
            {isClickable && (
              <ExternalLink
                className="h-3 w-3 text-indigo-500"
                data-testid="spec-link-icon"
              />
            )}
          </div>
          {feature.description && zoom >= 75 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {feature.description}
            </p>
          )}
        </div>
      </div>

      {/* Tooltip for sub-items */}
      <AnimatePresence>
        {showTooltip && feature.subItems && feature.subItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-10 left-6 top-full mt-1 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-xs"
          >
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sub-tasks:
            </p>
            <ul className="space-y-0.5">
              {feature.subItems.slice(0, 5).map((sub, i) => (
                <li key={i} className="text-xs text-gray-500 dark:text-gray-400">
                  - {sub}
                </li>
              ))}
              {feature.subItems.length > 5 && (
                <li className="text-xs text-gray-400">
                  +{feature.subItems.length - 5} more
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
