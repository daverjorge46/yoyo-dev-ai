# Yoyo AI CLI User Guide

This guide covers the usage of the Yoyo AI command-line interface.

## Installation

### Global Installation (Recommended)

```bash
npm install -g @yoyo-ai/cli
```

After installation, you can use the `yoyo-ai` command globally:

```bash
yoyo-ai --help
```

### Local Installation

For project-specific usage:

```bash
npm install @yoyo-ai/cli
npx yoyo-ai --help
```

### Using with Yoyo Dev

If you have Yoyo Dev installed, the `yoyo` command automatically uses the TypeScript CLI when available:

```bash
# Install in a project
~/.yoyo-dev/setup/project.sh --claude-code

# Launch (auto-detects TypeScript CLI)
yoyo
```

## Quick Start

### Interactive Mode

Launch the interactive terminal UI:

```bash
yoyo-ai
```

This opens a React/Ink-powered terminal interface with:
- Status bar showing model, memory, and connection status
- Input area for typing messages and commands
- Output area with markdown rendering
- Command palette for quick actions

### Headless Mode

For scripting and CI/CD:

```bash
yoyo-ai --headless -p "Your prompt here"
```

## Command-Line Options

| Option | Short | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help information |
| `--version` | `-v` | Show version number |
| `--model <name>` | `-m` | Specify AI model to use |
| `--new` | | Start a new conversation |
| `--continue` | | Continue the last conversation |
| `--prompt <text>` | `-p` | Prompt for headless mode |
| `--headless` | | Run in non-interactive mode |
| `--output <format>` | `-o` | Output format: text, json, stream-json |
| `--verbose` | | Enable verbose output |

### Examples

```bash
# Start new conversation with specific model
yoyo-ai --new --model claude-3-opus

# Continue last conversation
yoyo-ai --continue

# Headless with JSON output
yoyo-ai --headless -p "Explain async/await" --output json

# Verbose mode for debugging
yoyo-ai --verbose
```

## Interactive Commands

Within the interactive UI, use slash commands:

| Command | Description |
|---------|-------------|
| `/help` | Show available commands and keyboard shortcuts |
| `/yoyo-status` | Display current model, mode, and memory status |
| `/config` | View or modify settings |
| `/config show` | Show all current settings |
| `/config get <key>` | Get a specific setting value |
| `/config set <key> <value>` | Set a configuration value |
| `/config model <name>` | Switch to a different model |
| `/clear` | Clear conversation history (preserves memory) |

### Command Examples

```
/help
/yoyo-status
/config show
/config model gpt-4
/clear
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Exit the application |
| `Ctrl+D` | Exit (alternative) |
| `Ctrl+L` | Clear screen |
| `Up/Down` | Navigate command history |
| `Enter` | Submit message/command |
| `Shift+Enter` | New line (multi-line input) |

## Output Formats

### Text (Default)

Plain text output, suitable for terminal display:

```bash
yoyo-ai --headless -p "Hello" --output text
# Output: Processing: "Hello"...
```

### JSON

Structured JSON output for parsing:

```bash
yoyo-ai --headless -p "Hello" --output json
```

```json
{
  "success": true,
  "model": "claude-3-sonnet",
  "prompt": "Hello",
  "response": "...",
  "memory": {
    "enabled": true,
    "blocks": ["project", "user"]
  },
  "exitCode": 0
}
```

### Stream JSON

Newline-delimited JSON for streaming:

```bash
yoyo-ai --headless -p "Hello" --output stream-json
```

```json
{"type":"start","model":"claude-3-sonnet","timestamp":"..."}
{"type":"memory","blocks":["project","user"]}
{"type":"text","content":"..."}
{"type":"end","success":true,"exitCode":0}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Configuration error |

## Configuration

Configuration is loaded from multiple sources in order of priority:

1. **CLI arguments** (highest priority)
2. **Environment variables** (`YOYO_*`)
3. **Project config** (`.yoyo-dev/memory/config.yml`)
4. **Global config** (`~/.yoyo-dev/memory/config.yml`)
5. **Default values** (lowest priority)

### Environment Variables

| Variable | Description |
|----------|-------------|
| `YOYO_MODEL` | Default AI model |
| `YOYO_MEMORY` | Enable/disable memory (`true`/`false`) |
| `YOYO_DEBUG` | Enable debug mode |

### Configuration File

Example `.yoyo-dev/memory/config.yml`:

```yaml
defaultModel: claude-3-sonnet
memory:
  enabled: true
  globalPath: ~/.yoyo-dev
ui:
  colors: true
  animations: true
debug:
  enabled: false
```

## Memory System

The CLI integrates with Yoyo AI's memory system:

- **Project Memory** (`.yoyo-dev/memory/memory.db`): Project-specific context
- **Global Memory** (`~/.yoyo-dev/memory/memory.db`): User preferences and patterns

Memory is automatically loaded in interactive mode and optionally in headless mode.

### Memory Commands

```bash
# Initialize memory for a project
yoyo-ai
> /init

# Update specific memory
yoyo-ai
> /remember Always use TypeScript for this project

# Clear session (preserves memory)
yoyo-ai
> /clear
```

## Troubleshooting

### Command Not Found

If `yoyo-ai` is not found after global installation:

```bash
# Check npm global bin directory is in PATH
npm config get prefix
# Add to PATH if needed: export PATH="$PATH:$(npm config get prefix)/bin"
```

### Memory Initialization Failed

If memory fails to initialize:

1. Check write permissions for `.yoyo-dev/memory/` directory
2. Ensure SQLite is available on your system
3. Try running with `--verbose` for detailed errors

### Interactive Mode Not Working

If the terminal UI doesn't render correctly:

1. Use a terminal with Unicode support
2. Ensure terminal is at least 80 columns wide
3. Try resizing the terminal window

## Version

Current version: 4.0.0-alpha.1

Check version:

```bash
yoyo-ai --version
```
