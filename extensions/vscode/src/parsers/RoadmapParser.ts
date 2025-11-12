import { Logger } from '../utils/Logger';

export interface RoadmapPhase {
  name: string;
  features: string[];
  completed: boolean;
}

/**
 * Parser for roadmap.md files
 */
export class RoadmapParser {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Parse roadmap.md content
   */
  public parse(content: string): RoadmapPhase[] {
    const lines = content.split('\n');
    const phases: RoadmapPhase[] = [];
    let currentPhase: RoadmapPhase | null = null;

    for (const line of lines) {
      // Phase header: ## Phase N: Name
      if (line.startsWith('## Phase')) {
        const match = line.match(/## Phase \d+:\s*(.+)/);
        if (match) {
          currentPhase = {
            name: match[1].trim(),
            features: [],
            completed: line.includes('✅') || line.includes('(Completed)'),
          };
          phases.push(currentPhase);
        }
      }
      // Feature item: - Feature name
      else if (line.trim().startsWith('- ') && currentPhase) {
        const feature = line.trim().substring(2).trim();
        // Skip empty lines and metadata lines (like **Timeline**)
        if (feature && !feature.startsWith('**')) {
          currentPhase.features.push(feature);
        }
      }
    }

    this.logger.debug(`Parsed ${phases.length} roadmap phases`);
    return phases;
  }

  /**
   * Get roadmap stats
   */
  public getRoadmapStats(phases: RoadmapPhase[]): {
    completedPhases: number;
    totalPhases: number;
    totalFeatures: number;
  } {
    const completedPhases = phases.filter((p) => p.completed).length;
    const totalPhases = phases.length;
    const totalFeatures = phases.reduce((sum, p) => sum + p.features.length, 0);

    return { completedPhases, totalPhases, totalFeatures };
  }
}
