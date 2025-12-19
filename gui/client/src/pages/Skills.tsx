import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SkillSummary {
  id: string;
  name: string;
  tags: string[];
  triggers: string[];
  successRate: number;
  usageCount: number;
}

interface SkillStats {
  skillId: string;
  name: string;
  totalUsage: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  lastUsed: string | null;
}

interface AggregateStats {
  totalSkills: number;
  totalUsage: number;
  averageSuccessRate: number;
  topSkills: SkillStats[];
  recentSkills: SkillStats[];
}

interface SkillsResponse {
  skills: SkillSummary[];
  count: number;
  hasDatabase: boolean;
}

interface StatsResponse {
  initialized: boolean;
  stats: AggregateStats | null;
  message?: string;
}

interface SkillDetail {
  id: string;
  name: string;
  tags: string[];
  triggers: string[];
  content: string;
  stats: SkillStats | null;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchSkills(): Promise<SkillsResponse> {
  const res = await fetch('/api/skills');
  if (!res.ok) throw new Error('Failed to fetch skills');
  return res.json();
}

async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch('/api/skills/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

async function fetchSkillDetail(id: string): Promise<SkillDetail> {
  const res = await fetch(`/api/skills/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to fetch skill');
  return res.json();
}

// =============================================================================
// Stat Card Component
// =============================================================================

function StatCard({
  label,
  value,
  subtext,
  icon,
  color = 'indigo',
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: JSX.Element;
  color?: 'indigo' | 'green' | 'blue' | 'purple';
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        {value}
      </p>
      {subtext && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {subtext}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Success Rate Badge Component
// =============================================================================

function SuccessRateBadge({ rate }: { rate: number }) {
  const percent = Math.round(rate * 100);
  const colorClass =
    percent >= 80
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : percent >= 50
      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${colorClass}`}>
      {percent}%
    </span>
  );
}

// =============================================================================
// Usage Chart Component (Pure CSS Bar Chart)
// =============================================================================

function UsageChart({ skills }: { skills: SkillStats[] }) {
  const maxUsage = useMemo(() => {
    return Math.max(...skills.map((s) => s.totalUsage), 1);
  }, [skills]);

  if (skills.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        No usage data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {skills.map((skill) => {
        const widthPercent = (skill.totalUsage / maxUsage) * 100;
        const successPercent = skill.successRate * 100;

        return (
          <div key={skill.skillId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                {skill.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">
                  {skill.totalUsage} uses
                </span>
                <SuccessRateBadge rate={skill.successRate} />
              </div>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 relative"
                style={{
                  width: `${widthPercent}%`,
                  background: `linear-gradient(90deg,
                    rgb(34, 197, 94) ${successPercent}%,
                    rgb(239, 68, 68) ${successPercent}%)`,
                }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Success</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>Failure</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Recent Activity Component
// =============================================================================

function RecentActivity({ skills }: { skills: SkillStats[] }) {
  if (skills.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-4">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {skills.map((skill) => (
        <div
          key={skill.skillId}
          className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {skill.name}
            </span>
            {skill.lastUsed && (
              <span className="text-xs text-gray-400 ml-2">
                {new Date(skill.lastUsed).toLocaleDateString()}
              </span>
            )}
          </div>
          <SuccessRateBadge rate={skill.successRate} />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Skill Card Component
// =============================================================================

function SkillCard({
  skill,
  onSelect,
  selected,
}: {
  skill: SkillSummary;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {skill.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
            {skill.id}
          </p>
        </div>
        <SuccessRateBadge rate={skill.successRate} />
      </div>

      {skill.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
            >
              {tag}
            </span>
          ))}
          {skill.tags.length > 3 && (
            <span className="text-xs text-gray-400">
              +{skill.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{skill.usageCount} uses</span>
        {skill.triggers.length > 0 && (
          <span>{skill.triggers.length} trigger{skill.triggers.length !== 1 ? 's' : ''}</span>
        )}
      </div>
    </button>
  );
}

// =============================================================================
// Skill Detail View Component
// =============================================================================

function SkillDetailView({ skillId }: { skillId: string }) {
  const [showFullContent, setShowFullContent] = useState(false);

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skill', skillId],
    queryFn: () => fetchSkillDetail(skillId),
    enabled: !!skillId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        Skill not found
      </div>
    );
  }

  // Extract content without frontmatter for display
  const contentWithoutFrontmatter = skill.content.replace(/^---[\s\S]*?---\n*/, '');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {skill.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            {skill.id}
          </p>
        </div>
        {skill.stats && <SuccessRateBadge rate={skill.stats.successRate} />}
      </div>

      {/* Tags */}
      {skill.tags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Triggers */}
      {skill.triggers.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Triggers
          </h3>
          <div className="space-y-1">
            {skill.triggers.map((trigger, idx) => (
              <div
                key={idx}
                className="text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded"
              >
                {trigger}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {skill.stats && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Usage Statistics
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {skill.stats.totalUsage}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total Uses
              </p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {skill.stats.successCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Successes
              </p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/30 rounded">
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {skill.stats.failureCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Failures
              </p>
            </div>
          </div>
          {skill.stats.lastUsed && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Last used: {new Date(skill.stats.lastUsed).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Content
          </h3>
          {contentWithoutFrontmatter.length > 500 && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {showFullContent ? 'Show less' : 'Show full content'}
            </button>
          )}
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 overflow-auto max-h-96">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {showFullContent
                ? contentWithoutFrontmatter
                : contentWithoutFrontmatter.slice(0, 500) + (contentWithoutFrontmatter.length > 500 ? '...' : '')
              }
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Skills Page Component
// =============================================================================

export default function Skills() {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: fetchSkills,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['skills-stats'],
    queryFn: fetchStats,
  });

  // Get unique tags for filter
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    skillsData?.skills.forEach((s) => s.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [skillsData]);

  // Filter skills
  const filteredSkills = useMemo(() => {
    if (!skillsData) return [];

    return skillsData.skills.filter((skill) => {
      const matchesSearch = searchQuery === '' ||
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag = !tagFilter || skill.tags.includes(tagFilter);

      return matchesSearch && matchesTag;
    });
  }, [skillsData, searchQuery, tagFilter]);

  if (skillsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const skills = skillsData?.skills ?? [];
  const stats = statsData?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Skills
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Learned patterns and capabilities
        </p>
      </div>

      {/* Stats overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Skills"
            value={stats.totalSkills}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            color="indigo"
          />
          <StatCard
            label="Total Usage"
            value={stats.totalUsage}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            color="blue"
          />
          <StatCard
            label="Avg Success Rate"
            value={`${Math.round(stats.averageSuccessRate * 100)}%`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          />
          <StatCard
            label="Active Skills"
            value={stats.topSkills.filter((s) => s.totalUsage > 0).length}
            subtext="With usage"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            }
            color="purple"
          />
        </div>
      )}

      {/* Analytics Dashboard */}
      {stats && stats.topSkills.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Skills by Usage
            </h3>
            <UsageChart skills={stats.topSkills} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h3>
            <RecentActivity skills={stats.recentSkills} />
          </div>
        </div>
      )}

      {skills.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Skills Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Skills are learned automatically as you work. Complete tasks to
            start building your skill library.
          </p>
        </div>
      ) : (
        <>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            {allTags.length > 0 && (
              <select
                value={tagFilter || ''}
                onChange={(e) => setTagFilter(e.target.value || null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Skills list */}
            <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-auto">
              {filteredSkills.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No skills match your search
                </div>
              ) : (
                filteredSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onSelect={() => setSelectedSkill(skill.id)}
                    selected={selectedSkill === skill.id}
                  />
                ))
              )}
            </div>

            {/* Detail view */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-6">
                {selectedSkill ? (
                  <SkillDetailView skillId={selectedSkill} />
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <svg className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Select a skill to view details
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
