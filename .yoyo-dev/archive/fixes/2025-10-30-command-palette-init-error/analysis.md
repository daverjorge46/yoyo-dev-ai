# Problem Analysis

> Fix: command-palette-init-error
> Created: 2025-10-30
> Priority: CRITICAL

## Problem Description

The Yoyo Dev TUI crashes on startup with a TypeError when initializing the CommandPalettePanel widget. The error indicates that Widget.__init__() received unexpected keyword arguments (command_suggester and error_detector).

## Reproduction Steps

1. Run `yoyo` command to launch TUI
2. TUI attempts to compose MainDashboard screen
3. MainDashboard.compose() creates CommandPalettePanel with command_suggester and error_detector kwargs
4. CommandPalettePanel.__init__() passes these to super().__init__(**kwargs)
5. Textual Widget base class rejects unknown kwargs with TypeError

**Expected Behavior**: TUI launches successfully and displays main dashboard
**Actual Behavior**: Application crashes during widget composition with TypeError

## Root Cause

The CommandPalettePanel.__init__() method accepts data_manager and event_bus as explicit parameters, but passes all remaining **kwargs to Widget.__init__(). However, MainDashboard is passing command_suggester and error_detector as keyword arguments, which are not recognized by the Textual Widget base class.

The widget signature doesn't match the calling code's expectations.

**Affected Files**:
- `lib/yoyo_tui_v3/widgets/command_palette.py:24-32` - __init__ method doesn't accept command_suggester and error_detector
- `lib/yoyo_tui_v3/screens/main_dashboard.py:165-171` - Caller passes parameters that widget doesn't handle

## Impact Assessment

- **Severity**: CRITICAL
- **Affected Users**: All users attempting to launch Yoyo Dev TUI
- **Affected Functionality**: Complete TUI startup failure
- **Workaround Available**: NO - TUI is completely unusable

## Solution Approach

Add command_suggester and error_detector as explicit parameters to CommandPalettePanel.__init__() and store them as instance attributes. Extract these from **kwargs before passing remaining kwargs to Widget.__init__().

**Implementation Steps**:
1. Write test that reproduces the initialization error
2. Update CommandPalettePanel.__init__() signature to accept command_suggester and error_detector
3. Store these as instance attributes (self.command_suggester, self.error_detector)
4. Ensure only valid Widget kwargs are passed to super().__init__()
5. Verify test passes and TUI launches successfully

**Testing Strategy**:
- Unit test: Verify CommandPalettePanel can be instantiated with all required parameters
- Integration test: Verify MainDashboard.compose() succeeds without TypeError
- Manual test: Launch TUI and verify it displays correctly

**Risk Assessment**:
- **Breaking Changes**: NO - Only fixing widget initialization
- **Performance Impact**: NEUTRAL - No performance changes
- **Side Effects**: None expected - straightforward parameter handling fix
