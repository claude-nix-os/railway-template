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
