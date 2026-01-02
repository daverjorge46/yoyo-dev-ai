# Tasks Checklist

> Spec: integrated-claude-tui-split-view
> Created: 2025-11-05

## Parent Task 1: Terminal Control Foundation

- [x] Write tests for TerminalController escape sequences
- [x] Implement TerminalController class with ANSI/VT100 escape sequences
- [x] Add alternate screen buffer management (enter/exit)
- [x] Implement cursor control methods (move, hide, show)
- [x] Add screen clearing functionality
- [x] Implement color setting methods (bright_cyan, dim_white, reset)
- [x] Add border drawing method with box-drawing characters
- [x] Test TerminalController on multiple Linux terminal emulators (GNOME Terminal, Konsole, Alacritty)
- [x] Verify all tests pass for TerminalController

## Parent Task 2: Pane Management System

- [x] Write tests for PaneBounds dataclass
- [x] Write tests for Pane class (pty creation, I/O, lifecycle)
- [x] Implement PaneBounds dataclass (x, y, width, height)
- [x] Implement Pane class with pty.fork() integration
- [x] Add Pane.start() method to spawn process in pseudo-terminal
- [x] Implement Pane._set_pty_size() using fcntl and termios
- [x] Add Pane.write() for sending input to pane process
- [x] Add Pane.read() for non-blocking output reading
- [x] Implement Pane.is_alive() to check process status
- [x] Add Pane.resize() to update pty window size
- [x] Implement Pane.terminate() for clean process shutdown
- [x] Verify all tests pass for Pane management

## Parent Task 3: Layout Management

- [x] Write tests for LayoutManager split calculations
- [x] Write tests for minimum terminal size validation
- [x] Write tests for resize operations
- [x] Implement LayoutManager class
- [x] Add calculate_split() method with ratio-based calculations
- [x] Implement minimum size validation (120x30 requirement)
- [x] Add resize_pane() method for dynamic split adjustment
- [x] Handle edge cases (terminal too small, invalid ratios)
- [x] Verify all tests pass for LayoutManager

## Parent Task 4: Focus Management

- [x] Write tests for FocusManager pane tracking
- [x] Write tests for focus toggle functionality
- [x] Write tests for visual indicator rendering
- [x] Implement FocusManager class
- [x] Add set_active() method to mark active pane
- [x] Implement get_active() to retrieve current active pane
- [x] Add toggle() method to switch between panes
- [x] Implement render_indicators() for border styling
- [x] Verify all tests pass for FocusManager

## Parent Task 5: Split View Orchestration

- [x] Write tests for SplitViewManager initialization
- [x] Write tests for Claude Code detection
- [x] Write tests for pane creation and lifecycle
- [x] Write tests for main event loop and input routing
- [x] Write tests for keyboard shortcut handling
- [x] Implement SplitViewConfig dataclass (enabled, ratio, active_pane, border_style, shortcuts, claude)
- [x] Implement SplitViewManager class
- [x] Add _detect_claude() using shutil.which('claude')
- [x] Implement _launch_fallback() for Claude not found scenario
- [x] Add _show_claude_not_found_message() with formatted error display
- [x] Implement _create_panes() to spawn Claude and TUI panes
- [x] Add _main_loop() with select() for non-blocking I/O
- [x] Implement _is_shortcut() to detect Ctrl+B sequences
- [x] Add _handle_shortcut() for focus switching and resizing
- [x] Implement _handle_resize() signal handler for SIGWINCH
- [x] Add _render_pane_output() to display pane output in correct area
- [x] Implement _render_borders() with active/inactive styling
- [x] Add _rerender_all() for full screen refresh
- [x] Implement _cleanup() for graceful shutdown
- [x] Verify all tests pass for SplitViewManager

## Parent Task 6: Layout Persistence

- [x] Write tests for config schema validation
- [x] Write tests for save/load functionality
- [x] Write tests for config migration from old format
- [x] Extend .yoyo-dev/config.yml schema with split_view section
- [x] Implement LayoutPersistence class
- [x] Add load_config() to read split view settings from config.yml
- [x] Implement save_config() to persist layout changes
- [x] Add schema validation for split_view configuration
- [x] Handle missing or corrupted config gracefully (use defaults)
- [x] Verify all tests pass for LayoutPersistence

## Parent Task 7: CLI Integration

- [x] Write tests for command-line argument parsing
- [x] Write tests for --no-split flag
- [x] Write tests for --split-ratio override
- [x] Write tests for --focus flag
- [x] Update bin/yoyo entry point to support split view
- [x] Add argument parser for split view flags (--no-split, --split-ratio, --focus)
- [x] Implement conditional logic: split view vs TUI-only mode
- [x] Add config override from command-line arguments
- [x] Ensure backward compatibility (TUI-only mode still works)
- [x] Update main.py to integrate with SplitViewManager
- [x] Verify all tests pass for CLI integration

## Parent Task 8: Error Handling & Edge Cases

- [x] Write tests for terminal too small error
- [x] Write tests for Claude Code not found fallback
- [x] Write tests for pane crash scenarios
- [x] Write tests for rapid terminal resize (debouncing)
- [x] Write tests for config corruption handling
- [x] Implement terminal size validation with clear error message
- [x] Add pane health monitoring in main loop
- [x] Implement error display in pane areas for crashes
- [x] Add resize event debouncing (100ms)
- [x] Handle config validation errors gracefully
- [x] Add logging for debugging split view issues
- [x] Verify all tests pass for error handling

## Parent Task 9: Visual Polish & UX

- [x] Write tests for border rendering with colors
- [x] Write tests for active pane indicator updates
- [x] Write tests for Claude fallback message display
- [x] Implement active pane border styling (bright cyan)
- [x] Implement inactive pane border styling (dim white)
- [x] Add title bars for panes (optional, if space permits)
- [x] Create formatted Claude not found message with installation link
- [x] Add keyboard shortcut hints (in-app help or README)
- [x] Ensure smooth visual transitions on focus change
- [x] Test visual appearance on different terminal color schemes
- [x] Verify all tests pass for visual components

## Parent Task 10: Integration Testing

- [x] Write integration test for full split view launch
- [x] Write integration test for Claude Code detection and fallback
- [x] Write integration test for TUI reactivity (file watcher)
- [x] Write integration test for independent pane exit
- [x] Write integration test for layout persistence across sessions
- [x] Write integration test for keyboard shortcuts (focus, resize)
- [x] Write integration test for terminal resize handling
- [x] Test on GNOME Terminal
- [x] Test on Konsole
- [x] Test on Alacritty
- [x] Test on Kitty
- [x] Test on Terminator
- [x] Verify all integration tests pass

## Parent Task 11: Documentation

- [x] Update README.md with split view section
- [x] Add screenshot or ASCII art demo of split view layout
- [x] Document keyboard shortcuts (Ctrl+B patterns)
- [x] Add troubleshooting section for common issues
- [x] Update CLAUDE.md with split view configuration
- [x] Document command-line flags (--no-split, --split-ratio, --focus)
- [x] Create user guide for split view feature
- [x] Add configuration reference for split_view section in config.yml
- [x] Document Linux-only support and future platform plans
- [x] Add installation instructions for Claude Code (with link)

## Parent Task 12: Performance Optimization & Final Polish

- [x] Profile split view launch time (target: < 3 seconds)
- [x] Measure input latency (target: < 50ms)
- [x] Measure output rendering latency (target: < 100ms)
- [x] Optimize select() timeout for best responsiveness/CPU balance
- [x] Implement scroll buffer limiting (10,000 lines per pane)
- [x] Add memory usage monitoring
- [x] Test CPU usage in idle and active states
- [x] Verify launch time target achieved
- [x] Verify latency targets achieved
- [x] Run full test suite and ensure all tests pass
- [x] Create demo video or GIF showcasing split view
- [x] Final code review and cleanup
