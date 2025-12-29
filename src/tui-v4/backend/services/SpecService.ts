/**
 * Spec Service
 *
 * Parses spec.md and spec-lite.md files.
 * TODO: Full implementation with frontmatter parsing
 */

import type { Spec } from '../state-manager.js';

export class SpecService {
  async getActiveSpec(): Promise<Spec | null> {
    // TODO: Detect active spec from current directory or recent specs
    return null;
  }

  async getAllSpecs(): Promise<Spec[]> {
    // TODO: Scan .yoyo-dev/specs/ directory
    return [];
  }
}

export const specService = new SpecService();
