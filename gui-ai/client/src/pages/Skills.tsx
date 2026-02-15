import { useState } from 'react';
import {
  Sparkles,
  Search,
  Package,
  CheckCircle2,
  XCircle,
  Terminal,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useGatewayQuery } from '../hooks/useGatewayRPC';
import { useGatewayTick } from '../hooks/useGatewayEvent';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import type { SkillsStatusResponse, SkillsBinsResponse, Skill } from '../lib/gateway-types';

function SkillCard({ skill }: { skill: Skill }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="hover" className="p-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${skill.enabled ? 'bg-emerald-500/10' : 'bg-terminal-elevated'}`}>
          <Package className={`w-5 h-5 ${skill.enabled ? 'text-emerald-400' : 'text-terminal-text-muted'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-terminal-text truncate">{skill.name}</h3>
            <Badge variant={skill.enabled ? 'success' : 'default'}>
              {skill.enabled ? (
                <><CheckCircle2 className="w-3 h-3" /> Enabled</>
              ) : (
                <><XCircle className="w-3 h-3" /> Disabled</>
              )}
            </Badge>
            {skill.version && (
              <Badge variant="muted">v{skill.version}</Badge>
            )}
          </div>

          {skill.description && (
            <p className="text-sm text-terminal-text-secondary mb-2">{skill.description}</p>
          )}

          {/* Commands */}
          {skill.commands && skill.commands.length > 0 && (
            <div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-terminal-text-muted hover:text-terminal-text transition-colors"
              >
                <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                <Terminal className="w-3 h-3" />
                {skill.commands.length} command{skill.commands.length !== 1 ? 's' : ''}
              </button>

              {expanded && (
                <div className="mt-2 space-y-1">
                  {skill.commands.map((cmd) => (
                    <div
                      key={cmd}
                      className="px-2 py-1 bg-terminal-elevated rounded text-xs font-mono text-terminal-text-secondary"
                    >
                      {cmd}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Skills() {
  const [search, setSearch] = useState('');
  const { isConnected } = useGatewayStatus();

  const {
    data: skillsData,
    isLoading: loadingStatus,
    refetch: refetchStatus,
  } = useGatewayQuery<SkillsStatusResponse>('skills.status', undefined, {
    staleTime: 30_000,
  });

  const {
    data: binsData,
    isLoading: loadingBins,
    refetch: refetchBins,
  } = useGatewayQuery<SkillsBinsResponse>('skills.bins', undefined, {
    staleTime: 60_000,
  });

  useGatewayTick(() => {
    refetchStatus();
  });

  const isLoading = loadingStatus || loadingBins;

  // Merge status and bins data
  const statusSkills = skillsData?.skills || [];
  const binSkills = binsData?.bins || [];

  // Build combined skill list: use status as primary, add bins not in status
  const skillMap = new Map<string, Skill>();
  for (const s of statusSkills) skillMap.set(s.name, s);
  for (const b of binSkills) {
    if (!skillMap.has(b.name)) {
      skillMap.set(b.name, { ...b, enabled: false });
    } else {
      // Merge bin data into status data
      const existing = skillMap.get(b.name)!;
      skillMap.set(b.name, { ...b, ...existing });
    }
  }

  const allSkills = Array.from(skillMap.values());

  // Filter by search
  const filtered = search
    ? allSkills.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.description && s.description.toLowerCase().includes(search.toLowerCase())),
      )
    : allSkills;

  const enabledCount = allSkills.filter((s) => s.enabled).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-terminal-text flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-purple-400" />
              Skills
            </h1>
            <p className="text-sm text-terminal-text-secondary mt-1">
              Installed skill packages and capabilities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-terminal-text-secondary">
              <span className="text-emerald-400 font-medium">{enabledCount}</span>
              <span className="text-terminal-text-muted"> / {allSkills.length} enabled</span>
            </div>
            <Button
              icon={<RefreshCw className="w-4 h-4" />}
              variant="secondary"
              onClick={() => {
                refetchStatus();
                refetchBins();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Gateway disconnected warning */}
      {!isConnected && (
        <Card className="p-4 mb-6 border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-medium text-terminal-text">Gateway disconnected</h3>
              <p className="text-sm text-terminal-text-secondary">
                Connect to the YoyoClaw gateway to view skills.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      {allSkills.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-text-muted" />
            <input
              type="text"
              placeholder="Search skills by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-terminal-elevated border border-terminal-border rounded-lg text-sm text-terminal-text placeholder-terminal-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      )}

      {/* Skills list */}
      {filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered
            .sort((a, b) => {
              // Enabled first, then alphabetical
              if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((skill) => (
              <SkillCard key={skill.name} skill={skill} />
            ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Sparkles className="w-16 h-16 mx-auto text-terminal-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-terminal-text mb-2">
            {search ? 'No skills match your search' : 'No skills installed'}
          </h3>
          <p className="text-sm text-terminal-text-secondary max-w-md mx-auto">
            {search
              ? 'Try a different search term.'
              : isConnected
                ? 'No skills are installed in YoyoClaw.'
                : 'Connect to the gateway to view skills.'}
          </p>
        </Card>
      )}
    </div>
  );
}
