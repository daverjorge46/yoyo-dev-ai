# Fix Tasks Checklist

> Fix: command-palette-init-error
> Created: 2025-10-30

## Task 1: Write Test for CommandPalettePanel Initialization

- [x] Create test file `tests/test_tui/test_command_palette_init.py`
- [x] Write test that instantiates CommandPalettePanel with all required parameters (data_manager, event_bus, command_suggester, error_detector)
- [x] Test should currently fail with TypeError about unexpected keyword arguments
- [x] Verify test fails consistently

## Task 2: Fix CommandPalettePanel.__init__() Signature

- [x] Update `lib/yoyo_tui_v3/widgets/command_palette.py:24-32` to accept command_suggester and error_detector parameters
- [x] Add command_suggester and error_detector as explicit parameters in __init__() signature
- [x] Store command_suggester as self.command_suggester instance attribute
- [x] Store error_detector as self.error_detector instance attribute
- [x] Ensure only valid Widget kwargs (like id, classes) are passed to super().__init__()
- [x] Verify the test from Task 1 now passes

## Task 3: Verify TUI Launch and Integration

- [x] Run `python -m pytest tests/test_tui/test_command_palette_init.py -v` to verify unit test passes
- [x] Manually test TUI launch with `yoyo` command to verify no initialization errors
- [x] Verify MainDashboard.compose() completes without TypeError
- [x] Verify CommandPalettePanel displays correctly in TUI
- [x] Check that no other widgets are affected by the change

## Task 4: Verification and Cleanup

- [x] Run full test suite to ensure no regressions
- [x] Manual testing of TUI functionality (navigation, display, commands)
- [x] Verify fix resolves original issue completely
- [x] Update state.json with execution completion
