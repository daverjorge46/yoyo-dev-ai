/**
 * Tool Access Control
 *
 * Runtime tool permission checking with wildcard and negation support.
 * Prevents unauthorized tool access by subagents.
 */

/**
 * Parsed tool access configuration
 */
export interface ParsedToolAccess {
  /** Allow all tools (*) */
  allowAll: boolean;

  /** Explicitly allowed tools */
  allowed: string[];

  /** Explicitly denied tools (negations) */
  denied: string[];

  /** Allowed wildcard patterns (e.g., mcp__playwright__*) */
  allowedPatterns: string[];

  /** Denied wildcard patterns */
  deniedPatterns: string[];
}

/**
 * Tool access denial reason
 */
export interface AccessDenial {
  tool: string;
  reason: "not_in_allowlist" | "explicitly_denied" | "pattern_denied";
  details: string;
}

/**
 * Parse tool access list into structured format
 *
 * @param tools - Tool access list (supports wildcards and negations)
 * @returns Parsed access configuration
 *
 * @example
 * parseToolList(["*", "!Bash", "!Write"])
 * // { allowAll: true, denied: ["Bash", "Write"], ... }
 *
 * parseToolList(["Read", "Write", "Grep"])
 * // { allowAll: false, allowed: ["Read", "Write", "Grep"], ... }
 *
 * parseToolList(["mcp__playwright__*", "!mcp__playwright__browser_close"])
 * // { allowedPatterns: ["mcp__playwright__*"], deniedPatterns: [...], ... }
 */
export function parseToolList(tools: string[]): ParsedToolAccess {
  const config: ParsedToolAccess = {
    allowAll: false,
    allowed: [],
    denied: [],
    allowedPatterns: [],
    deniedPatterns: [],
  };

  for (const tool of tools) {
    // Check for negation
    const isNegation = tool.startsWith("!");
    const toolName = isNegation ? tool.substring(1) : tool;

    // Wildcard "*" means allow all
    if (toolName === "*") {
      if (isNegation) {
        throw new Error('Invalid tool config: "!*" (cannot deny all tools)');
      }
      config.allowAll = true;
      continue;
    }

    // Check for wildcard pattern
    const hasWildcard = toolName.includes("*");

    if (isNegation) {
      if (hasWildcard) {
        config.deniedPatterns.push(toolName);
      } else {
        config.denied.push(toolName);
      }
    } else {
      if (hasWildcard) {
        config.allowedPatterns.push(toolName);
      } else {
        config.allowed.push(toolName);
      }
    }
  }

  return config;
}

/**
 * Check if a tool is allowed based on access configuration
 *
 * @param tool - Tool name to check
 * @param accessConfig - Parsed access configuration
 * @returns True if tool is allowed, false otherwise
 *
 * @example
 * const config = parseToolList(["*", "!Bash"])
 * isToolAllowed("Read", config)  // true
 * isToolAllowed("Bash", config)  // false
 */
export function isToolAllowed(
  tool: string,
  accessConfig: ParsedToolAccess
): boolean {
  // 1. Check explicit denials first (highest priority)
  if (accessConfig.denied.includes(tool)) {
    return false;
  }

  // 2. Check denied patterns
  for (const pattern of accessConfig.deniedPatterns) {
    if (matchesPattern(tool, pattern)) {
      return false;
    }
  }

  // 3. If allow all (*), tool is allowed (unless denied above)
  if (accessConfig.allowAll) {
    return true;
  }

  // 4. Check explicit allowlist
  if (accessConfig.allowed.includes(tool)) {
    return true;
  }

  // 5. Check allowed patterns
  for (const pattern of accessConfig.allowedPatterns) {
    if (matchesPattern(tool, pattern)) {
      return true;
    }
  }

  // 6. Not in allowlist - deny by default
  return false;
}

/**
 * Check tool access with detailed reason if denied
 *
 * @param tool - Tool name to check
 * @param accessConfig - Parsed access configuration
 * @returns null if allowed, AccessDenial if denied
 */
export function checkToolAccess(
  tool: string,
  accessConfig: ParsedToolAccess
): AccessDenial | null {
  // 1. Check explicit denials
  if (accessConfig.denied.includes(tool)) {
    return {
      tool,
      reason: "explicitly_denied",
      details: `Tool '${tool}' is explicitly denied in agent configuration`,
    };
  }

  // 2. Check denied patterns
  for (const pattern of accessConfig.deniedPatterns) {
    if (matchesPattern(tool, pattern)) {
      return {
        tool,
        reason: "pattern_denied",
        details: `Tool '${tool}' matches denied pattern '${pattern}'`,
      };
    }
  }

  // 3. If allow all, tool is allowed
  if (accessConfig.allowAll) {
    return null;
  }

  // 4. Check explicit allowlist
  if (accessConfig.allowed.includes(tool)) {
    return null;
  }

  // 5. Check allowed patterns
  for (const pattern of accessConfig.allowedPatterns) {
    if (matchesPattern(tool, pattern)) {
      return null;
    }
  }

  // 6. Not in allowlist
  return {
    tool,
    reason: "not_in_allowlist",
    details: `Tool '${tool}' is not in agent's allowed tool list`,
  };
}

/**
 * Filter available tools based on access configuration
 *
 * @param availableTools - List of all available tools
 * @param accessConfig - Parsed access configuration
 * @returns Filtered list of allowed tools
 *
 * @example
 * const available = ["Read", "Write", "Bash", "Grep"]
 * const config = parseToolList(["*", "!Bash"])
 * filterTools(available, config)  // ["Read", "Write", "Grep"]
 */
export function filterTools(
  availableTools: string[],
  accessConfig: ParsedToolAccess
): string[] {
  return availableTools.filter((tool) => isToolAllowed(tool, accessConfig));
}

/**
 * Match tool name against wildcard pattern
 *
 * @param toolName - Tool name to match
 * @param pattern - Wildcard pattern (e.g., "mcp__*", "mcp__playwright__*")
 * @returns True if matches, false otherwise
 *
 * @example
 * matchesPattern("mcp__playwright__browser_click", "mcp__playwright__*")  // true
 * matchesPattern("mcp__playwright__browser_click", "mcp__*")  // true
 * matchesPattern("Read", "mcp__*")  // false
 */
export function matchesPattern(toolName: string, pattern: string): boolean {
  // Convert glob pattern to regex
  // * matches any characters
  const regexPattern = pattern
    .replace(/\*/g, ".*") // * -> .*
    .replace(/\?/g, "."); // ? -> . (optional, for single char wildcard)

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(toolName);
}

/**
 * Validate tool access configuration
 *
 * @param tools - Tool access list
 * @returns Array of validation errors (empty if valid)
 */
export function validateToolAccess(tools: string[]): string[] {
  const errors: string[] = [];

  if (tools.length === 0) {
    errors.push("Tool access list cannot be empty");
    return errors;
  }

  const hasWildcard = tools.includes("*");
  const positiveTools = tools.filter((t) => !t.startsWith("!"));
  const negations = tools.filter((t) => t.startsWith("!"));

  // Check for "*" negation (invalid)
  if (tools.includes("!*")) {
    errors.push('Invalid tool config: "!*" (cannot deny all tools)');
  }

  // Wildcard with positive tools is redundant
  if (hasWildcard && positiveTools.length > 1) {
    errors.push(
      'Wildcard "*" makes other positive tool grants redundant - use negations instead'
    );
  }

  // Negations without wildcard are useless
  if (!hasWildcard && negations.length > 0 && positiveTools.length === 0) {
    errors.push(
      "Tool negations (!) are only effective with wildcard (*) access or other positive grants"
    );
  }

  // Check for duplicate tools
  const toolSet = new Set(tools);
  if (toolSet.size !== tools.length) {
    errors.push("Duplicate tools in access list");
  }

  // Check for conflicting grants (tool both allowed and denied)
  const deniedTools = negations.map((t) => t.substring(1));
  for (const denied of deniedTools) {
    if (positiveTools.includes(denied)) {
      errors.push(
        `Tool '${denied}' is both granted and negated - conflicting access`
      );
    }
  }

  return errors;
}

/**
 * Create detailed access denied error message
 *
 * @param tool - Tool that was denied
 * @param denial - Access denial details
 * @param agentName - Name of agent attempting access
 * @returns Formatted error message
 */
export function createAccessDeniedError(
  tool: string,
  denial: AccessDenial,
  agentName: string
): string {
  const messages = {
    not_in_allowlist: `Agent '${agentName}' attempted to use tool '${tool}' which is not in its allowed tool list.`,
    explicitly_denied: `Agent '${agentName}' attempted to use tool '${tool}' which is explicitly denied (!${tool}).`,
    pattern_denied: `Agent '${agentName}' attempted to use tool '${tool}' which matches a denied pattern.`,
  };

  return `${messages[denial.reason]}\n\nDetails: ${denial.details}`;
}

/**
 * Get list of tools an agent can actually use
 * (for displaying in help/debug output)
 *
 * @param allTools - All available tools in the system
 * @param agentTools - Agent's tool configuration
 * @returns List of tool names the agent can use
 */
export function getEffectiveTools(
  allTools: string[],
  agentTools: string[]
): string[] {
  const accessConfig = parseToolList(agentTools);
  return filterTools(allTools, accessConfig);
}
