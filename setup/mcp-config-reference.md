# MCP Configuration Reference

Quick reference guide for the MCP configuration template.

## File Location

- **Template:** `~/.yoyo-dev/setup/mcp-config-template.yml`
- **Actual Config:** `~/.yoyo-dev/config.yml` (or project-specific)

## Configuration Structure

```
mcp:
├── Global Settings
│   ├── enabled (master switch)
│   ├── default_profile (dev/staging/prod)
│   ├── startup (lazy/eager, timeout, retries)
│   ├── health_check (monitoring settings)
│   ├── protocol (transport, timeout, retries)
│   ├── resources (memory/CPU limits)
│   └── metrics (tracking, retention)
│
├── Environment Profiles
│   ├── dev (all 6 MCPs)
│   ├── staging (context7, playwright, containerization)
│   └── prod (containerization only)
│
└── MCP Servers (6 total)
    ├── context7 (context management)
    ├── memory (pattern storage)
    ├── playwright (browser testing)
    ├── chrome-devtools (profiling)
    ├── shadcn (component scaffolding)
    └── containerization (Docker generation)
```

## Environment Profiles

### Dev Profile (Default)
**Enabled MCPs:** All 6 (context7, memory, playwright, chrome-devtools, shadcn, containerization)

**Use Case:** Full development experience with all capabilities

**Settings:**
- Log level: debug
- Resource limits: disabled
- Auto-restart: enabled

### Staging Profile
**Enabled MCPs:** 3 (context7, playwright, containerization)

**Use Case:** Testing and validation before production

**Settings:**
- Log level: info
- Resource limits: enabled
- Auto-restart: enabled

### Prod Profile
**Enabled MCPs:** 1 (containerization only)

**Use Case:** Deployment-only, minimal overhead

**Settings:**
- Log level: warn
- Resource limits: enforced
- Auto-restart: disabled (safety)

## Switching Profiles

```bash
# Set environment variable
export YOYO_ENV=staging

# Or set in config.yml
default_profile: staging
```

## MCP Server Summary

### 1. Context7
**Purpose:** Enhanced context management with relevance scoring

**Key Settings:**
- `max_contexts`: Maximum context chunks to load (default: 10)
- `min_relevance`: Minimum relevance score 0.0-1.0 (default: 0.6)
- `index_update`: auto | manual | interval (default: auto)
- `track_tokens`: Enable token usage tracking (default: true)

**Token Reduction Target:** 30%+

### 2. Memory
**Purpose:** Persistent pattern storage across sessions

**Key Settings:**
- `sync_pattern_library`: Sync with .yoyo-dev/patterns/ (default: true)
- `auto_store`: Auto-store patterns after task completion (default: true)
- `cross_project`: Share patterns across all projects (default: false)
- `encrypt_storage`: Encrypt patterns at rest (default: false)

**Privacy:** Local-only storage

### 3. Playwright
**Purpose:** Browser automation and E2E testing

**Key Settings:**
- `browsers`: [chromium, firefox, webkit] (default: all 3)
- `test_generation`: auto | manual (default: auto)
- `headless`: true | false (default: true)
- `visual_regression`: Enable visual regression testing (default: false)
- `parallel`: Parallel test execution (default: true)

**Browsers:** Chromium, Firefox, WebKit

### 4. Chrome DevTools
**Purpose:** Performance profiling and debugging

**Key Settings:**
- `performance.enabled`: Enable profiling (default: true)
- `performance.metrics`: [FCP, LCP, TTI, TBT, CLS]
- `lighthouse.enabled`: Run Lighthouse audits (default: true)
- `network.enabled`: Network monitoring (default: true)
- `console.fail_on_errors`: Fail on console errors (default: false)

**Performance Budgets:**
- FCP: 1800ms, LCP: 2500ms, TTI: 3800ms, TBT: 300ms, CLS: 0.1

### 5. Shadcn
**Purpose:** Component library integration and scaffolding

**Key Settings:**
- `design_system.apply_tokens`: Apply design tokens (default: true)
- `generation.all_variants`: Generate all variants (default: true)
- `generation.all_states`: Generate all states (default: true)
- `pattern_library.auto_add`: Add to pattern library (default: true)

**Design System:** Integrates with Yoyo Dev design tokens

### 6. Containerization
**Purpose:** Docker deployment automation

**Key Settings:**
- `auto_detect`: Auto-detect project type (default: true)
- `dockerfile.multi_stage`: Multi-stage builds (default: true)
- `dockerfile.base_image_strategy`: official | alpine | distroless (default: alpine)
- `security.non_root_user`: Run as non-root (default: true)
- `docker_compose.generate`: Generate docker-compose.yml (default: true)

**Security:** Vulnerability scanning with Trivy

## Global Settings

### Startup
- `mode: lazy` - Start MCPs on first use (recommended)
- `mode: eager` - Start all MCPs on launch
- `timeout: 10` - Startup timeout in seconds
- `max_retries: 3` - Retry attempts on failure

### Health Check
- `enabled: true` - Enable periodic health checks
- `interval: 30` - Check interval in seconds
- `auto_restart: true` - Auto-restart unhealthy MCPs
- `max_restarts: 3` - Max restarts before giving up

### Protocol
- `transport: stdio` - Communication transport (stdio | http)
- `timeout: 5` - Request timeout in seconds
- `max_retries: 2` - Retry attempts on failure
- `backoff: exponential` - Retry backoff strategy

### Resources
- `max_memory_mb: 512` - Memory limit per MCP (0 = no limit)
- `max_cpu_percent: 50` - CPU limit per MCP (0 = no limit)
- `enforce_limits: true` - Kill MCPs exceeding limits

### Metrics
- `enabled: true` - Enable usage tracking
- `retention_days: 30` - Keep metrics for 30 days
- `session_summary: true` - Show summary on exit
- `slow_threshold_ms: 3000` - Flag slow MCPs

## Commands

```bash
# Install MCPs
yoyo --install-mcps

# Check MCP status
yoyo --mcp-status

# View metrics report
yoyo --mcp-report

# Start/stop individual MCPs (via mcp-manager.sh)
start_mcp context7
stop_mcp playwright
stop_all_mcps
```

## File Paths

All paths relative to project root or `~/.yoyo-dev`:

- **MCP servers:** `.yoyo-dev/mcp/servers/`
- **Logs:** `.yoyo-dev/mcp/logs/`
- **Metrics:** `.yoyo-dev/mcp/metrics/`
- **Context7 index:** `.yoyo-dev/mcp/context7-index/`
- **Memory storage:** `.yoyo-dev/mcp/memory/`
- **Playwright tests:** `.yoyo-dev/tests/e2e/`
- **DevTools output:** `.yoyo-dev/devtools/`

## Common Configuration Patterns

### Minimal Setup (Production)
```yaml
mcp:
  enabled: true
  default_profile: prod

  profiles:
    prod:
      enabled_mcps:
        - containerization
```

### Development Setup (All Features)
```yaml
mcp:
  enabled: true
  default_profile: dev

  profiles:
    dev:
      enabled_mcps:
        - context7
        - memory
        - playwright
        - chrome-devtools
        - shadcn
        - containerization
```

### Testing-Focused Setup
```yaml
mcp:
  enabled: true
  default_profile: staging

  profiles:
    staging:
      enabled_mcps:
        - playwright
        - chrome-devtools
```

### Disable All MCPs
```yaml
mcp:
  enabled: false
```

## Troubleshooting

### Configuration Errors
- **Invalid YAML:** Use `yamllint config.yml` to validate syntax
- **Missing fields:** Compare with template (`mcp-config-template.yml`)
- **Profile not found:** Check `default_profile` matches defined profiles

### Installation Issues
- **Logs:** Check `.yoyo-dev/mcp/install.log`
- **Prerequisites:** Ensure Node.js v18+, npm v9+
- **Permissions:** Ensure write access to `.yoyo-dev/mcp/`

### Runtime Errors
- **MCP logs:** Check `.yoyo-dev/mcp/logs/*.log`
- **Health status:** Run `yoyo --mcp-status`
- **Metrics:** Run `yoyo --mcp-report` for performance issues

## Documentation

- **Full Guide:** `~/.yoyo-dev/.yoyo-dev/docs/MCP-GUIDE.md`
- **Troubleshooting:** `~/.yoyo-dev/.yoyo-dev/docs/MCP-TROUBLESHOOTING.md`
- **Template:** `~/.yoyo-dev/setup/mcp-config-template.yml`

## Design Decisions

### Why Lazy Startup?
Reduces resource usage by only starting MCPs when needed. Most workflows don't use all 6 MCPs simultaneously.

### Why 3 Environment Profiles?
- **Dev:** Full features for development
- **Staging:** Essential MCPs for testing
- **Prod:** Minimal MCPs for deployment stability

### Why stdio Transport?
Simpler than HTTP, no port conflicts, better for local CLI usage.

### Why 5-Second Timeout?
Balance between responsiveness and allowing slow operations (Context7 indexing, Playwright browser launch).

### Why 30-Day Metrics Retention?
Long enough for trend analysis, short enough to avoid storage bloat.

## Next Steps

1. Copy template sections to `config.yml`
2. Customize for your project
3. Run `yoyo --install-mcps`
4. Verify with `yoyo --mcp-status`
5. Read full guide in `MCP-GUIDE.md`
