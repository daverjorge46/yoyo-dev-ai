import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

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

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
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

function SuccessRateBadge({ rate }: { rate: number }) {
  const percent = Math.round(rate * 100);
  const colorClass =
    percent >= 80
      ? 'badge-success'
      : percent >= 50
      ? 'badge-warning'
      : 'badge-error';

  return <span className={`badge ${colorClass}`}>{percent}%</span>;
}

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
          <h3 className="font-medium text-gray-900 dark:text-white">
            {skill.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
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
          <span>{skill.triggers.length} triggers</span>
        )}
      </div>
    </button>
  );
}

function SkillDetailView({ skillId }: { skillId: string }) {
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

      {/* Content preview */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content
        </h3>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-64 overflow-auto">
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
            {skill.content.slice(0, 2000)}
            {skill.content.length > 2000 && '...'}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function Skills() {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: fetchSkills,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['skills-stats'],
    queryFn: fetchStats,
  });

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
          <StatCard label="Total Skills" value={stats.totalSkills} />
          <StatCard label="Total Usage" value={stats.totalUsage} />
          <StatCard
            label="Avg Success Rate"
            value={`${Math.round(stats.averageSuccessRate * 100)}%`}
          />
          <StatCard
            label="Active Skills"
            value={stats.topSkills.filter((s) => s.totalUsage > 0).length}
            subtext="With usage"
          />
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Skills list */}
          <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-auto">
            {skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onSelect={() => setSelectedSkill(skill.id)}
                selected={selectedSkill === skill.id}
              />
            ))}
          </div>

          {/* Detail view */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-6">
              {selectedSkill ? (
                <SkillDetailView skillId={selectedSkill} />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Select a skill to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
