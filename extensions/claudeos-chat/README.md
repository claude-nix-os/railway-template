# ClaudeOS Chat Extension

A VS Code extension that provides the Agent Chat panel for ClaudeOS. This extension replicates Claude Code Desktop's chat interface with expandable thought chains and tool calls.

## Features

- **Agent Chat Panel**: Interactive chat interface in the VS Code sidebar
- **Real-time Communication**: WebSocket connection to the ClaudeOS kernel server for live session updates
- **Expandable Thought Chains**: View and expand/collapse chain-of-thought reasoning
- **Tool Call Inspection**: Inspect tool calls and their results
- **Editor Integration**: Open chat panel as a full editor tab
- **Notification Badges**: Visual indicators when user input is required

## Usage

1. Click the ClaudeOS Chat icon in the Activity Bar to open the chat panel
2. Start a new Claude Code session from the chat interface
3. Messages stream in real-time via WebSocket
4. Click on thought chains to expand/collapse details
5. Use "Open Chat in Editor" command to view chat in a full editor tab

## Commands

- `ClaudeOS: Open Chat in Editor` - Opens the chat panel in the editor area
- `ClaudeOS: New Chat Session` - Starts a new Claude Code session
- `ClaudeOS: Clear Chat History` - Clears the current chat history

## Slash Commands

The chat interface supports slash commands for quick actions:

- `/compress` - Compress the current conversation context
- `/schedule <task> <time>` - Schedule a task or reminder
- `/task` - Create a task with optional scheduling
  - Arguments:
    - `title` (required) - The task title
    - `description` (optional) - Task description
    - `priority` (optional) - Priority level: low, medium, high, or urgent (default: medium)
    - `doAt` (optional) - When to do the task using natural language
  - Natural language time expressions:
    - "in 5 minutes", "in 2 hours", "in 3 days"
    - "tomorrow at 9am", "tomorrow at 3pm"
    - "next Monday", "next Friday at 2pm"
    - "today at 5pm"
  - Examples:
    - `/task title="Review PR #123" priority=high`
    - `/task title="Daily standup" doAt="tomorrow at 9am"`
    - `/task title="Fix bug in login" description="Users can't login with SSO" priority=urgent doAt="in 30 minutes"`
    - `/task title="Weekly team meeting" doAt="next Monday at 10am"`
- `/remember <text>` - Save information to long-term memory
- `/recall <query> [limit]` - Search through memories
- `/think` - Toggle chain-of-thought thinking mode
- `/help` - Show available commands
- `/clear` - Clear current session
- `/new` - Create new session

## Requirements

- VS Code 1.60.0 or higher
- ClaudeOS kernel server running with WebSocket support

## Extension Settings

This extension contributes the following settings:

- `claudeos.chat.wsUrl`: WebSocket URL for the ClaudeOS kernel server (default: `ws://localhost:3000/ws`)
- `claudeos.chat.autoConnect`: Automatically connect to WebSocket on extension activation (default: true)

## Development

This extension is part of the ClaudeOS v4 project. For development instructions, see the main ClaudeOS repository.

## License

MIT
