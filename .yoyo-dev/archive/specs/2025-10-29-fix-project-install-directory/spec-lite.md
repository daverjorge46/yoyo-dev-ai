# Spec Summary (Lite)

Fix Yoyo Dev installation scripts (`project.sh` and `yoyo-update.sh`) to correctly use `.yoyo-dev/` (hidden directory with dot prefix) for project installations instead of `yoyo-dev/` (visible directory), ensuring consistency with documentation and standard dotfile conventions. The base installation at `~/yoyo-dev/` (visible, no dot) remains unchanged and serves as the source for project installations.
