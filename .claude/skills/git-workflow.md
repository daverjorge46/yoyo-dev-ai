# Git Workflow Expert

Master **git workflow** with commits, branches, PRs, and GitHub workflows using conventional commit standards.

**Keywords:** git, commit, branch, merge, rebase, pull request, pr, gh cli, conventional commits, git hook, conflict, push, amend

## When to use this skill

Use this skill when:
- Creating well-structured commits with clear messages
- Managing branches and merge conflicts
- Writing pull request descriptions
- Setting up git hooks or automation
- Need help with git commands or workflows
- Implementing conventional commit standards
- Using GitHub CLI (gh) for PR creation
- Troubleshooting git issues or history problems

## What I'll help with

- **Commit Messages**: Conventional commits, clear descriptions, scope
- **Branch Strategy**: Feature branches, main/develop, release branches
- **Pull Requests**: PR templates, descriptions, review process
- **Git Commands**: Rebase, cherry-pick, stash, reset, bisect
- **Conflict Resolution**: Merge conflicts, strategy selection
- **Git Hooks**: Pre-commit, commit-msg, pre-push hooks
- **GitHub CLI**: PR creation, issue management, releases
- **History Management**: Clean history, squashing, amending

## Key Expertise

- Conventional Commits format
- Semantic versioning
- Git workflow patterns (GitFlow, GitHub Flow)
- Interactive rebase
- Git bisect for bug hunting
- GitHub Actions integration
- Safe git operations
- Commit message best practices

## Conventional Commits Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc
- `refactor`: Code restructuring without behavior change
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance, dependencies, config

**Scopes:**
- `setup`: Installation/setup scripts
- `tui`: TUI application
- `ui`: User interface
- `core`: Core functionality
- `docs`: Documentation
- `deps`: Dependencies

## Examples

**Good commit message:**
```
fix(setup): detect and auto-recover from broken venv shebangs

Fixes issue where yoyo-update fails when virtual environment has broken
shebang paths. This typically occurs when venv is moved or installation
paths change.

Changes:
- Added validate_venv_shebang() function
- Auto-recovery backs up and recreates broken venvs
- Enhanced user messaging

Fixes: .yoyo-dev/fixes/2025-11-05-venv-broken-shebang

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**PR creation with gh:**
```bash
gh pr create \
  --title "feat(tui): add command palette for quick navigation" \
  --body "$(cat <<'EOF'
## Summary
Added command palette (Ctrl+P) for quick navigation between screens.

## Changes
- New CommandPalette widget with fuzzy search
- Keyboard shortcut binding (Ctrl+P)
- Search across specs, tasks, and history

## Test Plan
- [x] Command palette opens with Ctrl+P
- [x] Fuzzy search works correctly
- [x] Navigation to selected item works

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Safe commit amend:**
```bash
# Check authorship before amending
git log -1 --format='%an %ae'

# Only amend if it's your commit and not pushed
if [[ $(git status) == *"Your branch is ahead"* ]]; then
    git commit --amend --no-edit
fi
```
