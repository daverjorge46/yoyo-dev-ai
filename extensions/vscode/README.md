# Yoyo Dev VS Code Extension

AI-assisted development workflow framework for systematic planning, specification, and execution with Claude Code and Cursor.

## Features

- **Task Management**: View and track tasks with interactive checkboxes
- **Roadmap Visualization**: See project phases and features
- **Workflow Commands**: Execute all 16 Yoyo Dev workflows from Command Palette
- **Git Integration**: Track branch and repository status
- **Real-time Updates**: Auto-refresh views when files change

## Requirements

- VS Code 1.85.0 or higher
- Yoyo Dev base installation (`~/.yoyo-dev/`)
- Claude Code CLI (optional, for workflow execution)

## Extension Settings

This extension contributes the following settings:

* `yoyoDev.autoRefresh`: Enable auto-refresh of views on file changes (default: true)
* `yoyoDev.debounceDelay`: Delay in ms for file watcher debouncing (default: 500)

## Known Issues

None yet - this is an early release!

## Release Notes

### 0.1.0

Initial MVP release:
- Task tree view
- Roadmap tree view
- Git info view
- Command palette integration (16 workflows)
- File watching with auto-refresh

## Contributing

Issues and PRs welcome at https://github.com/yoyo-dev/yoyo-dev

## License

MIT
