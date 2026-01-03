/**
 * Help Page
 *
 * Displays documentation with hierarchical sections, search, and deep linking.
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Rocket,
  Download,
  Terminal,
  GitBranch,
  Bot,
  Zap,
  Database,
  Sparkles,
  Layout,
  Search,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import type { HelpSection, HelpArticle, HelpSearchResult, HelpSearchResponse, HelpSectionsResponse } from '../../../shared/types/help';
import { MermaidDiagram } from '../components/common/MermaidDiagram';
import { CommandBlock } from '../components/common/CommandBlock';
import { SearchInput } from '../components/common/SearchInput';
import { SimpleAccordion } from '../components/common/Accordion';
import { MarkdownPreview } from '../components/MarkdownPreview';

// =============================================================================
// Icon Mapping
// =============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  Download,
  Terminal,
  GitBranch,
  Bot,
  Zap,
  Database,
  Sparkles,
  Layout,
};

function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[iconName] || BookOpen;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchHelpSections(): Promise<HelpSectionsResponse> {
  const res = await fetch('/api/help/sections');
  if (!res.ok) throw new Error('Failed to fetch help sections');
  return res.json();
}

async function searchHelp(query: string): Promise<HelpSearchResponse> {
  if (!query || query.length < 2) {
    return { query: '', results: [], totalMatches: 0 };
  }
  const res = await fetch(`/api/help/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search help');
  return res.json();
}

// =============================================================================
// Table of Contents Component
// =============================================================================

interface TocProps {
  sections: HelpSection[];
  activeSection: string;
  onNavigate: (sectionId: string, articleId?: string) => void;
}

function TableOfContents({ sections, activeSection, onNavigate }: TocProps) {
  return (
    <nav className="space-y-1">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Contents
      </h3>
      {sections.map((section) => {
        const Icon = getIcon(section.icon);
        const isActive = activeSection === section.id;

        return (
          <div key={section.id} className="space-y-1">
            <button
              onClick={() => onNavigate(section.id)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
                ${isActive
                  ? 'bg-terminal-orange/20 text-terminal-orange font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-terminal-bg-tertiary'
                }
              `}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{section.title}</span>
            </button>
            {isActive && section.articles.length > 0 && (
              <div className="ml-6 space-y-1 border-l border-terminal-border pl-3">
                {section.articles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => onNavigate(section.id, article.id)}
                    className="w-full text-left text-xs text-gray-500 hover:text-white py-1 truncate"
                  >
                    {article.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// =============================================================================
// Search Results Component
// =============================================================================

interface SearchResultsProps {
  results: HelpSearchResult[];
  query: string;
  onSelect: (sectionId: string, articleId: string) => void;
  onClear: () => void;
}

function SearchResults({ results, query, onSelect, onClear }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <Search className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">No results found for "{query}"</p>
        <button
          onClick={onClear}
          className="mt-4 text-terminal-orange hover:underline"
        >
          Clear search
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-gray-400">
          {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
        </h3>
        <button
          onClick={onClear}
          className="text-sm text-terminal-orange hover:underline"
        >
          Clear search
        </button>
      </div>
      <div className="space-y-3">
        {results.map((result, idx) => (
          <button
            key={`${result.sectionId}-${result.articleId}-${idx}`}
            onClick={() => onSelect(result.sectionId, result.articleId)}
            className="w-full text-left p-4 rounded-lg bg-terminal-bg-secondary border border-terminal-border hover:border-terminal-orange/50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded bg-terminal-bg-tertiary text-gray-400">
                {result.sectionTitle}
              </span>
              <ChevronRight className="h-3 w-3 text-gray-500" />
              <span className="text-sm font-medium text-white">
                {result.articleTitle}
              </span>
            </div>
            <p className="text-sm text-gray-400 line-clamp-2">
              {result.excerpt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Article Renderer Component
// =============================================================================

interface ArticleRendererProps {
  article: HelpArticle;
}

function ArticleRenderer({ article }: ArticleRendererProps) {
  switch (article.type) {
    case 'command':
      return (
        <div id={article.id} className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">{article.title}</h4>
          <CommandBlock command={article.content} />
        </div>
      );

    case 'diagram':
      return (
        <div id={article.id} className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">{article.title}</h4>
          <MermaidDiagram definition={article.content} />
        </div>
      );

    case 'code':
      return (
        <div id={article.id} className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">{article.title}</h4>
          <pre className="bg-terminal-bg-tertiary rounded-lg p-4 overflow-x-auto">
            <code className="text-sm text-gray-300">{article.content}</code>
          </pre>
        </div>
      );

    case 'text':
    default:
      return (
        <div id={article.id} className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">{article.title}</h4>
          <div className="prose prose-sm prose-invert max-w-none">
            <MarkdownPreview content={article.content} />
          </div>
        </div>
      );
  }
}

// =============================================================================
// Section Renderer Component
// =============================================================================

interface SectionRendererProps {
  section: HelpSection;
  isExpanded: boolean;
}

function SectionRenderer({ section, isExpanded }: SectionRendererProps) {
  const Icon = getIcon(section.icon);

  return (
    <div id={section.id} className="scroll-mt-6">
      <SimpleAccordion
        title={section.title}
        icon={<Icon className="h-5 w-5" />}
        defaultOpen={isExpanded}
        className="bg-terminal-bg-secondary"
      >
        <div className="space-y-6">
          {section.articles.map((article) => (
            <ArticleRenderer key={article.id} article={article} />
          ))}
        </div>
      </SimpleAccordion>
    </div>
  );
}

// =============================================================================
// Help Page Component
// =============================================================================

export default function Help() {
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeSection, setActiveSection] = useState('getting-started');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));

  // Fetch help sections
  const { data: helpData, isLoading, error } = useQuery({
    queryKey: ['help-sections'],
    queryFn: fetchHelpSections,
  });

  // Search query
  const { data: searchResults } = useQuery({
    queryKey: ['help-search', debouncedQuery],
    queryFn: () => searchHelp(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  // Handle debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle URL hash for deep linking
  useEffect(() => {
    const hash = location.hash.slice(1); // Remove '#'
    if (hash && helpData?.sections) {
      // Check if it's a section or article ID
      const section = helpData.sections.find((s) => s.id === hash);
      if (section) {
        setActiveSection(hash);
        setExpandedSections((prev) => new Set([...prev, hash]));
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Check if it's an article ID
        for (const s of helpData.sections) {
          const article = s.articles.find((a) => a.id === hash);
          if (article) {
            setActiveSection(s.id);
            setExpandedSections((prev) => new Set([...prev, s.id]));
            setTimeout(() => {
              document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            break;
          }
        }
      }
    }
  }, [location.hash, helpData]);

  // Navigation handler
  const handleNavigate = (sectionId: string, articleId?: string) => {
    const targetId = articleId || sectionId;
    navigate(`/help#${targetId}`);
    setActiveSection(sectionId);
    setExpandedSections((prev) => new Set([...prev, sectionId]));

    setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Search result selection
  const handleSearchSelect = (sectionId: string, articleId: string) => {
    setSearchQuery('');
    setDebouncedQuery('');
    handleNavigate(sectionId, articleId);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
  };

  // Scroll spy effect
  useEffect(() => {
    if (!contentRef.current || !helpData?.sections) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            // Check if this is a section ID
            if (helpData.sections.some((s) => s.id === sectionId)) {
              setActiveSection(sectionId);
            }
          }
        }
      },
      { rootMargin: '-100px 0px -80% 0px' }
    );

    // Observe all section elements
    for (const section of helpData.sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [helpData]);

  // Stats
  const stats = useMemo(() => {
    if (!helpData) return null;
    return {
      sections: helpData.sections.length,
      articles: helpData.sections.reduce((acc, s) => acc + s.articles.length, 0),
      commands: helpData.commandCount,
    };
  }, [helpData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-terminal-orange animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
        Failed to load help content. Please try again.
      </div>
    );
  }

  const sections = helpData?.sections || [];
  const isSearching = debouncedQuery.length >= 2;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Sidebar TOC - Desktop only */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-6 space-y-6">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-terminal-bg-secondary rounded-lg">
                <p className="text-lg font-bold text-white">{stats.sections}</p>
                <p className="text-xs text-gray-500">Sections</p>
              </div>
              <div className="p-2 bg-terminal-bg-secondary rounded-lg">
                <p className="text-lg font-bold text-white">{stats.articles}</p>
                <p className="text-xs text-gray-500">Articles</p>
              </div>
              <div className="p-2 bg-terminal-bg-secondary rounded-lg">
                <p className="text-lg font-bold text-white">{stats.commands}</p>
                <p className="text-xs text-gray-500">Commands</p>
              </div>
            </div>
          )}

          {/* Table of Contents */}
          <div className="bg-terminal-bg-secondary rounded-lg p-4 border border-terminal-border max-h-[calc(100vh-280px)] overflow-y-auto">
            <TableOfContents
              sections={sections}
              activeSection={activeSection}
              onNavigate={handleNavigate}
            />
          </div>

          {/* External Links */}
          <div className="space-y-2">
            <a
              href="https://github.com/yourusername/yoyo-dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              GitHub Repository
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Help & Documentation
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Yoyo Dev framework reference guide
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search documentation..."
          />
        </div>

        {/* Mobile TOC Button */}
        <details className="lg:hidden mb-6 bg-terminal-bg-secondary rounded-lg border border-terminal-border">
          <summary className="px-4 py-3 cursor-pointer text-gray-300 hover:text-white">
            <span className="ml-2">Table of Contents</span>
          </summary>
          <div className="px-4 pb-4">
            <TableOfContents
              sections={sections}
              activeSection={activeSection}
              onNavigate={handleNavigate}
            />
          </div>
        </details>

        {/* Content Area */}
        <div ref={contentRef} className="space-y-6">
          {isSearching ? (
            <SearchResults
              results={searchResults?.results || []}
              query={debouncedQuery}
              onSelect={handleSearchSelect}
              onClear={handleClearSearch}
            />
          ) : (
            sections.map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                isExpanded={expandedSections.has(section.id)}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
