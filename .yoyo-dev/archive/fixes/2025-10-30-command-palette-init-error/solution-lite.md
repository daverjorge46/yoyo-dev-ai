# Fix Summary (Lite)

**Problem**: CommandPalettePanel.__init__() rejects command_suggester and error_detector kwargs passed by MainDashboard

**Root Cause**: Widget signature doesn't accept parameters that calling code provides, causing TypeError when passed to Widget base class

**Solution**: Add command_suggester and error_detector as explicit parameters to __init__() signature

**Files to Modify**:
- lib/yoyo_tui_v3/widgets/command_palette.py - Update __init__ signature and store new parameters
