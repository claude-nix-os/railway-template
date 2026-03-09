# /task Slash Command Implementation

## Summary

Successfully added a `/task` slash command to the claudeos-chat extension that creates tasks from the chat interface.

## Files Modified

1. **extensions/claudeos-chat/src/commands/builtinCommands.ts**
   - Added `parseNaturalTime()` function for parsing natural language time expressions
   - Added `taskHandler()` command handler
   - Added `taskCommand` command definition
   - Registered the task command in `BUILTIN_COMMANDS` array
   - Updated `helpHandler()` to include the new command

2. **extensions/claudeos-chat/README.md**
   - Added documentation for slash commands
   - Documented the `/task` command with examples and usage

## Implementation Details

### Natural Language Time Parsing

The `parseNaturalTime()` function supports:
- Relative times: "in 5 minutes", "in 2 hours", "in 3 days"
- Tomorrow with optional time: "tomorrow", "tomorrow at 9am", "tomorrow at 3pm"
- Next weekday: "next Monday", "next Friday at 2pm"
- Today with time: "today at 5pm"
- ISO 8601 timestamps and standard date formats

### Task Command Handler

The `taskHandler()`:
1. Validates required `title` argument
2. Accepts optional `description`, `priority`, and `doAt` arguments
3. Maps "urgent" priority to "high" (API only supports low/medium/high)
4. Parses natural language time expressions using `parseNaturalTime()`
5. Makes HTTP POST request to `/api/tasks` endpoint
6. Shows success message with task ID and scheduled time
7. Associates task with current chat session ID

### API Integration

The command integrates with the existing `/api/tasks` endpoint:
- Endpoint: `POST /api/tasks`
- Request body: `{ title, description, priority, dueDate, sessionId, status }`
- Response: Task object with generated ID

## Examples

```
/task title="Review PR #123" priority=high
/task title="Daily standup" doAt="tomorrow at 9am"
/task title="Fix bug in login" description="Users can't login with SSO" priority=urgent doAt="in 30 minutes"
/task title="Weekly team meeting" doAt="next Monday at 10am"
```

## Future Enhancements

- Trigger claudeos-tasks extension to refresh its tree view after task creation
- Add support for more natural language time expressions
- Add task editing/deletion commands
- Add task listing command
