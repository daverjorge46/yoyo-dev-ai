/**
 * Roadmap Page
 *
 * Interactive timeline visualization of the development roadmap
 * with zoom controls, phase filtering, and links to specs/fixes.
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Map,
  CheckCircle,
  Circle,
  Clock,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Filter,
  ExternalLink,
  Target,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface RoadmapItem {
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

interface RoadmapSection {
  title: string;
  items: RoadmapItem[];
}

interface RoadmapPhase {
  id: string;
  number: number;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  statusText: string;
  goal: string;
  sections: RoadmapSection[];
  itemCount: number;
  completedCount: number;
  progress: number;
}

interface RoadmapData {
  title: string;
  overview: string;
  phases: RoadmapPhase[];
  totalItems: number;
  completedItems: number;
  overallProgress: number;
}

type FilterType = 'all' | 'completed' | 'in_progress' | 'pending';

// =============================================================================
// API
// =============================================================================

async function fetchRoadmap(): Promise<RoadmapData> {
  const res = await fetch('/api/roadmap');
  if (!res.ok) throw new Error('Failed to fetch roadmap');
  return res.json();
}

// =============================================================================
// Sub-Components
// =============================================================================

function EffortBadge({ effort }: { effort: RoadmapItem['effort'] }) {
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

function PhaseStatusBadge({ status }: { status: RoadmapPhase['status'] }) {
  const config = {
    completed: {
      icon: CheckCircle,
      text: 'Completed',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    in_progress: {
      icon: Clock,
      text: 'In Progress',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    pending: {
      icon: Circle,
      text: 'Pending',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    },
  };

  const { icon: Icon, text, className } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {text}
    </span>
  );
}

function ProgressRing({ progress, size = 40 }: { progress: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-indigo-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
          {progress}%
        </span>
      </div>
    </div>
  );
}

function RoadmapItemCard({
  item,
  zoom,
}: {
  item: RoadmapItem;
  zoom: number;
}) {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (item.linkedSpec) {
      navigate(`/specs?id=${item.linkedSpec}`);
    } else if (item.linkedFix) {
      navigate(`/fixes?id=${item.linkedFix}`);
    }
  };

  const isClickable = item.linkedSpec || item.linkedFix;
  const scale = zoom / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
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
        <div className="flex-shrink-0 mt-0.5">
          {item.completed ? (
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
                item.completed
                  ? 'text-gray-500 dark:text-gray-400 line-through'
                  : 'text-gray-800 dark:text-gray-200'
              }`}
            >
              {item.number}. {item.title}
            </span>
            <EffortBadge effort={item.effort} />
            {isClickable && (
              <ExternalLink className="h-3 w-3 text-indigo-500" />
            )}
          </div>
          {item.description && zoom >= 75 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && item.subItems && item.subItems.length > 0 && (
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
              {item.subItems.slice(0, 5).map((sub, i) => (
                <li key={i} className="text-xs text-gray-500 dark:text-gray-400">
                  • {sub}
                </li>
              ))}
              {item.subItems.length > 5 && (
                <li className="text-xs text-gray-400">
                  +{item.subItems.length - 5} more
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PhaseCard({
  phase,
  zoom,
  defaultExpanded,
}: {
  phase: RoadmapPhase;
  zoom: number;
  defaultExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const borderColor =
    phase.status === 'completed'
      ? 'border-l-green-500'
      : phase.status === 'in_progress'
      ? 'border-l-blue-500'
      : 'border-l-gray-300 dark:border-l-gray-600';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 ${borderColor} overflow-hidden`}
    >
      {/* Phase Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ProgressRing progress={phase.progress} />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Phase {phase.number}: {phase.title}
              </h3>
              <PhaseStatusBadge status={phase.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {phase.goal || `${phase.completedCount}/${phase.itemCount} items completed`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {phase.completedCount}/{phase.itemCount}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Phase Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {phase.sections.map((section) => (
                <div key={section.title}>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
                    {section.title}
                  </h4>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <RoadmapItemCard key={item.id} item={item} zoom={zoom} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TimelineControls({
  zoom,
  onZoomChange,
  filter,
  onFilterChange,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onZoomChange(Math.max(25, zoom - 25))}
          disabled={zoom <= 25}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-center">
          {zoom}%
        </span>
        <button
          onClick={() => onZoomChange(Math.min(150, zoom + 25))}
          disabled={zoom >= 150}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as FilterType)}
          className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Phases</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="pending">Pending</option>
        </select>
      </div>
    </div>
  );
}

function OverallProgress({ data }: { data: RoadmapData }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-500" />
          <h3 className="font-medium text-gray-900 dark:text-white">
            Overall Progress
          </h3>
        </div>
        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          {data.overallProgress}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${data.overallProgress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="bg-indigo-600 h-2.5 rounded-full"
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
        <span>{data.completedItems} completed</span>
        <span>{data.totalItems - data.completedItems} remaining</span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function Roadmap() {
  const [zoom, setZoom] = useState(100);
  const [filter, setFilter] = useState<FilterType>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['roadmap'],
    queryFn: fetchRoadmap,
  });

  const filteredPhases = useMemo(() => {
    if (!data?.phases) return [];
    if (filter === 'all') return data.phases;
    return data.phases.filter((phase) => phase.status === filter);
  }, [data?.phases, filter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <Map className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          Roadmap not found. Create one at{' '}
          <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
            .yoyo-dev/product/roadmap.md
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.title || 'Development Roadmap'}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {data.phases.length} phases • {data.totalItems} total items
          </p>
        </div>
        <TimelineControls
          zoom={zoom}
          onZoomChange={setZoom}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {/* Overall Progress */}
      <OverallProgress data={data} />

      {/* Overview */}
      {data.overview && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Overview
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
            {data.overview}
          </p>
        </div>
      )}

      {/* Phase Timeline */}
      <div className="space-y-4">
        {filteredPhases.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No phases match the selected filter.
            </p>
          </div>
        ) : (
          filteredPhases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              zoom={zoom}
              defaultExpanded={phase.status === 'in_progress'}
            />
          ))
        )}
      </div>
    </div>
  );
}
