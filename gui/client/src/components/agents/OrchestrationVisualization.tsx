/**
 * OrchestrationVisualization Component
 *
 * Displays the multi-agent orchestration system with Mermaid diagram and routing table.
 */

import { useQuery } from '@tanstack/react-query';
import { GitBranch, RefreshCw } from 'lucide-react';
import { MermaidDiagram } from '../common/MermaidDiagram';
import { SimpleAccordion } from '../common/Accordion';

interface IntentRoute {
  intent: string;
  agent: string;
  confidence: number;
  mode: string;
  description: string;
}

interface OrchestrationFlowResponse {
  mermaid: string;
  routes: IntentRoute[];
}

interface OrchestrationVisualizationProps {
  /** Additional className */
  className?: string;
  /** Whether to show as collapsed by default */
  defaultOpen?: boolean;
}

export function OrchestrationVisualization({
  className = '',
  defaultOpen = true,
}: OrchestrationVisualizationProps) {
  const { data, isLoading, error, refetch } = useQuery<OrchestrationFlowResponse>({
    queryKey: ['orchestration-flow'],
    queryFn: async () => {
      const res = await fetch('/api/orchestration/flow');
      if (!res.ok) throw new Error('Failed to fetch orchestration data');
      return res.json();
    },
  });

  // Mode badge color
  const getModeColor = (mode: string): string => {
    switch (mode) {
      case 'background': return 'bg-green-500/20 text-green-400';
      case 'blocking': return 'bg-blue-500/20 text-blue-400';
      case 'auto-delegate': return 'bg-purple-500/20 text-purple-400';
      case 'escalation': return 'bg-red-500/20 text-red-400';
      case 'delegation': return 'bg-yellow-500/20 text-yellow-400';
      case 'primary': return 'bg-terminal-orange/20 text-terminal-orange';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          Failed to load orchestration data. Please try again.
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 text-terminal-orange animate-spin" />
        </div>
      )}

      {/* Content */}
      {data && (
        <>
          {/* Mermaid Diagram */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Agent Routing Flow</h4>
            <MermaidDiagram
              definition={data.mermaid}
              caption="How user intents are classified and routed to specialized agents"
            />
          </div>

          {/* Routing Table */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Routing Rules</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-terminal-border">
                    <th className="text-left py-2 px-3 text-gray-400 font-medium">Intent</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-medium">Agent</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-medium">Confidence</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-medium">Mode</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-medium hidden md:table-cell">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.routes.map((route) => (
                    <tr key={route.intent} className="border-b border-terminal-border/50 hover:bg-terminal-bg-tertiary">
                      <td className="py-2 px-3">
                        <code className="text-terminal-cyan">{route.intent}</code>
                      </td>
                      <td className="py-2 px-3">
                        {route.agent === '-' ? (
                          <span className="text-gray-500">Direct</span>
                        ) : (
                          <span className="text-white">{route.agent}</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {route.confidence > 0 ? (
                          <span className="text-terminal-orange">{(route.confidence * 100).toFixed(0)}%</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getModeColor(route.mode)}`}>
                          {route.mode}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-400 hidden md:table-cell">
                        {route.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Modes:</strong></p>
            <div className="flex flex-wrap gap-3">
              <span><span className={`px-1.5 py-0.5 rounded ${getModeColor('background')}`}>background</span> - Runs in parallel</span>
              <span><span className={`px-1.5 py-0.5 rounded ${getModeColor('blocking')}`}>blocking</span> - Waits for completion</span>
              <span><span className={`px-1.5 py-0.5 rounded ${getModeColor('auto-delegate')}`}>auto-delegate</span> - Automatic handoff</span>
              <span><span className={`px-1.5 py-0.5 rounded ${getModeColor('escalation')}`}>escalation</span> - Failure recovery</span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <SimpleAccordion
      title="Orchestration System"
      icon={<GitBranch className="h-5 w-5" />}
      defaultOpen={defaultOpen}
      className={className}
    >
      {content}
    </SimpleAccordion>
  );
}
