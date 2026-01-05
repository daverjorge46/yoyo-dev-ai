# Ralph Status Skill

Show real-time execution progress for Ralph/task execution.

## Trigger

When the user invokes `/ralph-status` or asks about current execution status, Ralph progress, or what task is currently running.

## Implementation

Execute the progress tracker script to display status:

```bash
# Set project root if not already set
export YOYO_PROJECT_ROOT="${YOYO_PROJECT_ROOT:-$(pwd)}"

# Find the yoyo-dev installation
YOYO_DEV_ROOT=""
if [[ -f "$HOME/yoyo-dev/setup/progress-tracker.sh" ]]; then
    YOYO_DEV_ROOT="$HOME/yoyo-dev"
elif [[ -f "$HOME/PROJECTS/yoyo-dev/setup/progress-tracker.sh" ]]; then
    YOYO_DEV_ROOT="$HOME/PROJECTS/yoyo-dev"
fi

if [[ -n "$YOYO_DEV_ROOT" ]]; then
    "$YOYO_DEV_ROOT/setup/progress-tracker.sh" status
else
    echo "Progress tracker not found"
fi
```

If `--json` flag is provided, use `json` instead of `status`.

## Output

Display the formatted status showing:
- Running/Idle state
- Current spec or fix name
- Current phase
- Elapsed time
- Progress bar with task counts
- Current task and subtask descriptions
- Last update timestamp

## Fallback

If no execution-progress.json exists, check for:
1. Recent spec state.json files in `.yoyo-dev/specs/`
2. Recent fix state.json files in `.yoyo-dev/fixes/`
3. Ralph circuit breaker state if available
