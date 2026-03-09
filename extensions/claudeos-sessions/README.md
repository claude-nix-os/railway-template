# ClaudeOS Sessions Extension

Session list tree view with live status indicators for ClaudeOS.

## Features

- **Session List Tree View**: Display all chat sessions in a hierarchical tree view
- **Live Status Indicators**: Visual indicators showing session status (active, idle, archived)
- **Session Management**:
  - Open sessions in the chat panel
  - Rename sessions
  - Archive/restore sessions
  - Delete sessions
  - Refresh session list

## Usage

The Sessions view appears in the ClaudeOS Chat activity bar. Sessions are displayed with:
- Status icons indicating their current state
- Last modified timestamp
- Context menu actions for management

## Commands

- `ClaudeOS Sessions: Open Session` - Open a session in the chat panel
- `ClaudeOS Sessions: Rename Session` - Rename a session
- `ClaudeOS Sessions: Archive Session` - Archive a session
- `ClaudeOS Sessions: Restore Session` - Restore an archived session
- `ClaudeOS Sessions: Delete Session` - Permanently delete a session
- `ClaudeOS Sessions: Refresh Sessions` - Refresh the session list

## Requirements

- VS Code 1.85.0 or higher
- ClaudeOS Chat extension

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Package extension
npm run package
```

## License

MIT
