# Fix Summary (Lite)

**Problem**: yoyo-update fails because venv pip has broken shebang pointing to non-existent python interpreter

**Root Cause**: Virtual environment created with hardcoded paths to old location (~/.yoyo-dev/) but venv now at ~/yoyo-dev/

**Solution**: Add shebang validation to detect broken venvs and automatically recreate them before use

**Files to Modify**:
- setup/yoyo-update.sh - Add validate_venv_shebang() function and broken venv detection
