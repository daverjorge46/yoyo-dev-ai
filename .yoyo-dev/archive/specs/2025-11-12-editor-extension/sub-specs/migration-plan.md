# Migration Plan: TUI to Extension

## Overview

This document outlines the migration strategy for transitioning Yoyo Dev from the Textual TUI dashboard to the VS Code/Cursor extension while maintaining backward compatibility and minimizing disruption to existing users.

## Migration Philosophy

**Principle**: **Coexistence, not replacement**

- TUI continues to work for existing users (terminal environments, SSH, preference)
- Extension is opt-in via VS Code Marketplace
- Both can run simultaneously without conflict
- Natural migration as users discover extension benefits
- Deprecation only after 90%+ extension adoption

## Timeline

### Phase 1: Extension MVP (Weeks 1-4)
**Goal**: Basic feature parity with TUI dashboard

**Deliverables**:
- Task tree view (read-only)
- Roadmap tree view (read-only)
- Status bar items
- Command palette integration (all 16 commands)
- File watcher with auto-refresh
- Basic documentation

**TUI Status**: Fully supported, no changes

### Phase 2: Extension Feature Complete (Weeks 5-8)
**Goal**: Exceed TUI capabilities with GUI-native features

**Deliverables**:
- Spec webview with rich markdown
- Terminal integration for Claude CLI
- Git info view
- Context menus
- Interactive task actions
- Settings panel
- User documentation and tutorials

**TUI Status**: Fully supported, mark as "legacy" in docs

### Phase 3: Extension Enhancement (Weeks 9-12)
**Goal**: Advanced features not possible in TUI

**Deliverables**:
- Real-time CLI output streaming
- CodeLens task annotations
- Keyboard shortcuts
- Workflow progress indicators
- In-editor notifications
- Performance optimizations

**TUI Status**: Bug fixes only, no new features

### Phase 4: TUI Deprecation (3-6 months after Phase 3)
**Goal**: Retire TUI after extension proven and adopted

**Criteria for deprecation**:
- 90%+ of active users on extension (telemetry)
- Zero critical bugs in extension
- All TUI features replicated in extension
- Migration guide complete and tested
- Community feedback positive

**TUI Status**: Deprecated, docs archived, code removed in v2.0

## User Segments

### Segment 1: New Users (Recommended Path)
**Profile**: Installing Yoyo Dev for first time

**Migration**: Direct to extension
1. Install extension from VS Code Marketplace
2. Run setup via command palette
3. Never install TUI

**Support**: Extension-only documentation

### Segment 2: Existing TUI Users (Gradual Migration)
**Profile**: Currently using TUI, comfortable with terminal

**Migration**: Opt-in discovery
1. Continue using TUI as normal
2. See extension announcement in changelog/update notification
3. Install extension at own pace
4. Test extension alongside TUI
5. Switch when confident

**Support**: Parallel documentation for both

### Segment 3: SSH/Remote Users (TUI Forever)
**Profile**: Working in SSH, containers, or terminal-only environments

**Migration**: None - stay on TUI
1. TUI continues to work
2. Extension not applicable to environment
3. Consider cloud IDE options (Code-server, Gitpod) if GUI needed

**Support**: TUI documentation maintained longer

### Segment 4: CI/CD Automation (TUI Forever)
**Profile**: Using Yoyo Dev in automated pipelines

**Migration**: None - stay on TUI
1. Scripts continue using CLI commands
2. No GUI available in CI
3. Extension not relevant

**Support**: CLI documentation always maintained

## Feature Parity Matrix

| Feature | TUI | Extension Phase 1 | Extension Phase 2 | Extension Phase 3 |
|---------|-----|-------------------|-------------------|-------------------|
| View tasks | ✅ | ✅ | ✅ | ✅ |
| View roadmap | ✅ | ✅ | ✅ | ✅ |
| Current spec status | ✅ | ✅ | ✅ | ✅ |
| Execute commands | ✅ | ✅ | ✅ | ✅ |
| Real-time file watch | ✅ | ✅ | ✅ | ✅ |
| Git info | ✅ | ❌ | ✅ | ✅ |
| Interactive dashboard | ✅ | ⚠️ (limited) | ✅ | ✅ |
| Keyboard shortcuts | ✅ | ❌ | ❌ | ✅ |
| Rich markdown rendering | ❌ | ❌ | ✅ | ✅ |
| Context menus | ❌ | ❌ | ✅ | ✅ |
| In-editor annotations | ❌ | ❌ | ❌ | ✅ |
| Real-time CLI output | ✅ | ⚠️ (terminal) | ⚠️ (terminal) | ✅ |
| Split view mode | ✅ | ❌ | ❌ | ❌ |

Legend:
- ✅ Full support
- ⚠️ Partial support
- ❌ Not supported

## Communication Strategy

### Announcement Channels

**Week 1 (Extension Alpha)**:
- GitHub Discussions post
- Update CHANGELOG.md with "🚀 VS Code Extension (Alpha)"
- Add notice to TUI dashboard startup screen

**Week 4 (Extension Beta)**:
- Blog post: "Introducing Yoyo Dev Extension"
- Reddit/HN post if community active
- Update README.md with extension installation as primary option

**Week 8 (Extension GA)**:
- GitHub Release with video demo
- Twitter/social announcement
- Update all documentation to prioritize extension
- Add "Try the Extension" banner to TUI

**Month 3 (TUI Deprecation Notice)**:
- Deprecation announcement in changelog
- Warning message in TUI on startup
- Email to known users (if mailing list exists)

**Month 6 (TUI Removal)**:
- Final notice: "TUI removed in v2.0"
- Archive TUI docs to separate branch
- Remove TUI code from main

### Messaging Templates

**Alpha Announcement**:
```
🚀 VS Code Extension (Alpha)

We're building a native VS Code extension to replace the TUI dashboard!

Try it: [VS Code Marketplace Link]

Features:
- Task tree view with real-time updates
- Roadmap visualization
- Command palette integration
- All your favorite workflows

Still experimental. TUI remains fully supported.

Feedback: [GitHub Discussions Link]
```

**Beta Announcement**:
```
🎉 VS Code Extension (Beta)

The Yoyo Dev extension is ready for everyday use!

New in beta:
- Rich spec viewer with markdown rendering
- Git status integration
- Context menus for quick actions
- Settings panel

Install now: [Marketplace Link]
Install count: XXX
Rating: ⭐⭐⭐⭐⭐

TUI still works, but we recommend trying the extension.
```

**TUI Deprecation**:
```
⚠️ TUI Deprecation Notice

The Textual TUI dashboard will be removed in v2.0 (planned: [DATE]).

Migration: Install the VS Code extension
- 90% of users have already migrated
- All features available in extension
- Better UX with native editor integration

Need help? [Migration Guide Link]

Special cases:
- SSH/remote users: TUI will remain as separate package
- CI/CD: Use CLI commands directly (no GUI needed)
```

## Migration Guide (User-Facing)

### Quick Start (New Users)

```bash
# 1. Install extension from VS Code Marketplace
# Search "Yoyo Dev" and click Install

# 2. Open your project in VS Code
code /path/to/project

# 3. Run setup command
# Cmd+Shift+P → "Yoyo Dev: Plan Product"

# Done! Views appear in sidebar
```

### Migration (Existing TUI Users)

```bash
# Current setup (TUI)
yoyo  # Opens split view (Claude + TUI)

# New setup (Extension)
# 1. Install extension in VS Code
# 2. Open project
# 3. Extension auto-detects .yoyo-dev/ directory
# 4. Views populate automatically

# You can keep using both:
yoyo              # TUI in terminal
VS Code sidebar   # Extension in editor

# Over time, use extension more:
- Tasks → Click in sidebar (vs terminal)
- Specs → Rich viewer (vs markdown in terminal)
- Commands → Command palette (vs /command in TUI)
```

### Side-by-Side Comparison

| Task | TUI Method | Extension Method |
|------|------------|------------------|
| View tasks | Launch `yoyo`, navigate to Tasks panel | Open sidebar, scroll task tree |
| Execute workflow | Type `/execute-tasks` in Claude | Cmd+Shift+P → "Execute Tasks" |
| Check progress | View TUI progress bar | Check status bar + task checkboxes |
| View spec | Open spec.md in terminal editor | Click spec name → webview opens |
| Mark task done | Edit tasks.md manually | Right-click task → "Mark Complete" |
| Check git status | View TUI Git Info panel | Sidebar Git Info panel |

**Winner**: Extension for most tasks (integrated, fewer steps, GUI-friendly)

**TUI still better for**: Terminal-only environments, scripts, automation

## Breaking Changes

### None in Phase 1-3

**Commitment**: Zero breaking changes during migration

- All file formats remain identical (.yoyo-dev/ structure)
- All CLI commands continue working
- All agents and workflows unchanged
- Config.yml format unchanged
- TUI continues functioning

### Possible in Phase 4 (TUI Removal)

**Only if community agrees**:
- Remove `lib/yoyo_tui_v3/` directory (12K lines)
- Remove `yoyo` launcher script for split view
- Remove Textual dependencies from requirements.txt
- Archive TUI documentation to separate branch

**Not removed**:
- CLI commands (remain for CI/CD and scripts)
- File structure (.yoyo-dev/ permanent)
- Core workflows and agents
- Standards and instructions

## Compatibility Matrix

| Yoyo Dev Version | TUI | Extension | Both |
|------------------|-----|-----------|------|
| v1.5.x (current) | ✅ | ❌ | ❌ |
| v1.6.0 (Extension Alpha) | ✅ | ⚠️ (alpha) | ✅ |
| v1.7.0 (Extension Beta) | ✅ | ⚠️ (beta) | ✅ |
| v1.8.0 (Extension GA) | ✅ (deprecated) | ✅ | ✅ |
| v1.9.0 (TUI final) | ✅ (deprecated) | ✅ | ✅ |
| v2.0.0 (TUI removed) | ❌ | ✅ | ❌ |

## Rollback Plan

### If Extension Fails

**Scenarios**:
- Critical bugs not fixable in reasonable time
- Poor user adoption (<50% after 6 months)
- Technical limitations discovered (VS Code API constraints)
- Community backlash

**Rollback Actions**:
1. Keep TUI as primary interface
2. Extension becomes "experimental" indefinitely
3. Continue TUI development
4. Re-evaluate in 12 months

**Commitment**: TUI will not be removed if extension doesn't work

### If Migration Stalls

**Scenarios**:
- Users resist migration (love TUI)
- Extension missing critical TUI features
- Performance issues in large projects

**Adaptation**:
1. Maintain both indefinitely
2. TUI gets bug fixes only
3. Extension gets new features
4. Let users choose permanently

## Success Metrics

### Phase 1 Success Criteria
- Extension installs: > 100
- No critical bugs after 2 weeks beta
- Basic features working (tasks, roadmap, commands)
- Positive initial feedback

### Phase 2 Success Criteria
- Extension installs: > 500
- User retention: > 80% after 30 days
- Feature parity with TUI: 100%
- Average rating: > 4.0 stars

### Phase 3 Success Criteria
- Extension installs: > 1000
- Active users: > 70% of total users
- TUI usage declining (telemetry)
- Extension usage growing weekly

### Phase 4 Success Criteria (TUI Removal)
- Extension installs: > 90% of user base
- Zero critical bugs in extension
- All TUI features replicated
- Community consensus to remove TUI

## Risk Mitigation

### Risk 1: Poor User Adoption
**Mitigation**:
- Make extension significantly better than TUI (rich UI, fewer clicks)
- Provide clear migration guide with video
- Offer 1:1 support for early adopters
- Collect feedback continuously

### Risk 2: VS Code Lock-In
**Mitigation**:
- Cursor is fully compatible (no lock-in)
- CLI commands still work (editor-agnostic)
- File structure remains portable
- Can build JetBrains extension later if needed

### Risk 3: Extension Complexity
**Mitigation**:
- Keep extension simple (view/control layer only)
- Don't reimplement workflows in TypeScript
- Leverage VS Code native components
- Avoid over-engineering

### Risk 4: TUI Users Left Behind
**Mitigation**:
- Maintain TUI for SSH/remote/CI users
- Provide clear documentation for TUI-only setup
- Consider separate TUI package if needed
- Never force migration

## Code Cleanup Plan

### Phase 1-3: Keep Everything
- TUI code remains in `lib/yoyo_tui_v3/`
- Extension code in separate repo initially
- Both tested and maintained

### Phase 4: Remove TUI (If Approved)

**Files to remove**:
```bash
lib/yoyo_tui_v3/           # 12K lines
bin/yoyo                   # Launcher script
docs/tui/                  # TUI-specific docs
tests/tui/                 # TUI tests
```

**Files to keep**:
```bash
.yoyo-dev/                 # All workflows, agents, standards
.claude/                   # All command definitions
setup/                     # Installation scripts (update for extension)
docs/                      # General docs (update references)
```

**Archive location**:
- Branch: `archive/tui-final`
- Tag: `v1.9.0-tui-final`
- README: "TUI code archived. Use extension or older version."

### Code Changes Required

**setup/project.sh**:
```bash
# Before (v1.5.x)
yoyo-dev/setup/project.sh --claude-code

# After (v1.6.0+)
yoyo-dev/setup/project.sh --claude-code --extension

# Installs extension instead of TUI
```

**README.md**:
```markdown
<!-- Before -->
## Installation
yoyo-dev/setup/install.sh

## Usage
yoyo  # Launches split view

<!-- After -->
## Installation
Install from VS Code Marketplace: [Link]

## Usage
Open VS Code → Sidebar → Yoyo Dev
```

## Support Plan

### Phase 1-3: Dual Support
- TUI: Full support (bugs and features)
- Extension: Full support (bugs and features)
- Documentation: Maintained for both

### Phase 4: Extension Only
- TUI: Archived, no support
- Extension: Full support
- Documentation: Extension only

### Long-Term: Extension + CLI
- Extension: GUI users in VS Code/Cursor
- CLI: Automation, CI/CD, scripts
- No TUI dashboard

## FAQ for Migrating Users

**Q: Do I have to migrate?**
A: No, TUI continues working through v1.9.x. Extension is optional until v2.0.

**Q: Can I use both?**
A: Yes! They work side-by-side without conflicts.

**Q: Will my .yoyo-dev files change?**
A: No, file structure remains identical. Both read same files.

**Q: What if I prefer terminals?**
A: TUI will remain available for terminal-only environments. Consider it for SSH/remote.

**Q: What if I'm using Cursor, not VS Code?**
A: Extension works identically in Cursor (same VS Code API).

**Q: Will CLI commands still work?**
A: Yes, all CLI commands (`claude /create-new`, etc.) work forever.

**Q: What happens to my workflows and agents?**
A: Zero changes. All workflows, agents, standards remain identical.

**Q: What if the extension has bugs?**
A: Report on GitHub. Meanwhile, use TUI as fallback.

**Q: What about JetBrains IDEs?**
A: Not planned initially. If demand exists, community can build it.

**Q: When is TUI removed?**
A: Not before v2.0, and only if 90%+ users migrate successfully.

## Telemetry (Optional)

**If implemented** (privacy-respecting, opt-in):

Track:
- Extension installs (marketplace)
- Active extension users (weekly)
- Active TUI users (weekly)
- Command usage frequency
- Error rates

Don't track:
- Code content
- File names
- Personal info
- Workspace details

Purpose:
- Measure migration progress
- Identify bugs early
- Decide TUI deprecation timing

## Conclusion

This migration prioritizes user choice and backward compatibility. The extension must prove itself superior before TUI is retired. If extension succeeds, it provides better UX for 90%+ of users. If it fails, TUI remains as fallback.

Success = Extension adoption > 90% AND community satisfaction high AND zero regrets from TUI users.
