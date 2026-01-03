# Ralph Status

Show the current status of Ralph autonomous execution.

## Usage

```bash
/ralph-status
```

## Description

Displays information about the current or most recent Ralph execution:

- **Loop Count**: Current iteration number
- **API Usage**: Calls made vs. limit
- **Progress**: Task completion percentage
- **Circuit Breaker**: Current state (open/closed)
- **Time Elapsed**: Duration of current execution

## Implementation

When invoked, check for Ralph status information:

1. Check if Ralph is currently running
2. Read `.yoyo-dev/ralph/logs/` for recent execution data
3. Parse Ralph's status output if available
4. Display formatted status

## Output Format

```
╭──────────────────────────────────────────────────────────────────╮
│                     RALPH STATUS                                  │
╰──────────────────────────────────────────────────────────────────╯

  Status:         Running / Idle / Completed
  Loop:           12 / ∞
  API Usage:      45 / 100 (45%)
  Progress:       80% (4/5 tasks)
  Time Elapsed:   00:23:45
  Circuit:        Closed (healthy)

  Last Activity:
  [12:34:56] Completed task 3.1 - Add authentication
  [12:35:12] Starting task 3.2 - Implement JWT tokens

  Exit Conditions:
  ✓ All tasks complete
  ✗ Tests passing (23/25)
  ✗ No TypeScript errors
```

## Behavior

- If Ralph is not running, show status of last execution
- If no Ralph executions exist, show "No Ralph history"
- Show warning if circuit breaker is open

## Related Commands

- `/ralph-stop` - Stop current Ralph execution
- `/ralph-config` - View/edit Ralph configuration
