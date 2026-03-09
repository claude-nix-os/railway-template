# ClaudeOS Tasks - Quick Start Guide

## Installation & Build

```bash
# Navigate to the extension directory
cd extensions/claudeos-tasks

# Install dependencies
npm install

# Build the extension
npm run compile

# Or watch for changes during development
npm run watch
```

## Development Setup

1. Open the `extensions/claudeos-tasks` folder in VS Code
2. Press `F5` to launch Extension Development Host
3. The extension will be loaded in the development instance
4. Look for the "Tasks" view in the ClaudeOS Chat activity bar

## Testing the Extension

### Create a Task
1. Click the `+` icon in the Tasks view title bar
2. Enter task title (required)
3. Enter description (optional)
4. Select priority (Urgent, High, Medium, Low)
5. Select target/type (Code, Docs, Test, Bug, Feature, etc.)

### Manage Tasks
- **Complete**: Click the checkmark icon on incomplete tasks
- **Edit**: Click on a task or right-click → "Edit Task"
- **Delete**: Right-click → "Delete Task"
- **Set Priority**: Right-click → "Set Priority"
- **Schedule**: Right-click → "Schedule Task"

### Configure Grouping/Sorting
1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "claudeos.tasks"
3. Configure:
   - `Group By`: none, priority, status, or target
   - `Sort By`: priority, dueDate, createdDate, or name
   - `Show Completed Tasks`: true/false
   - `Default Priority`: low, medium, high, or urgent

## Extension API

### Commands
- `claudeos.createTask` - Create a new task
- `claudeos.editTask` - Edit an existing task
- `claudeos.deleteTask` - Delete a task
- `claudeos.completeTask` - Mark task as complete
- `claudeos.uncompleteTask` - Mark task as incomplete
- `claudeos.setPriority` - Set task priority
- `claudeos.scheduleTask` - Schedule task with due date
- `claudeos.refreshTasks` - Refresh the task list

### Task Data Structure
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  target: TaskTarget;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  tags?: string[];
  assignee?: string;
  metadata?: object;
}
```

## File Locations

### Task Data Storage
By default, tasks are stored in:
- **With workspace**: `.vscode/claudeos-tasks/tasks.json`
- **Without workspace**: VS Code global storage

You can customize the storage location via:
```json
{
  "claudeos.tasks.dataPath": "/path/to/custom/tasks.json"
}
```

## Integration with ClaudeOS

This extension integrates with the ClaudeOS ecosystem:
- **View Container**: Appears in the `claudeos-chat-container` alongside Sessions and Memory
- **Shared Dependencies**: Uses common packages (ws, nanoid)
- **Consistent Patterns**: Follows the same TreeView patterns as other ClaudeOS extensions

## Troubleshooting

### Extension not loading
- Check that `claudeos-chat` extension is installed (provides the view container)
- Verify the extension is built: `dist/extension.js` should exist
- Check the Output panel → "Log (Extension Host)" for errors

### Tasks not persisting
- Check the storage path in settings
- Verify write permissions for the data file location
- Look for file I/O errors in the Debug Console

### Tree view not updating
- Click the refresh icon in the view title bar
- Check that `onDidChangeTreeData` events are firing
- Verify the TaskDataService is notifying listeners

## Next Steps

1. **Add WebSocket Integration**: Connect to ClaudeOS kernel for real-time task updates
2. **Subtasks**: Implement hierarchical task relationships using `parentId`
3. **Tags**: Add tag-based filtering and grouping
4. **Search**: Implement full-text search across tasks
5. **Export**: Add export functionality (JSON, CSV, Markdown)
6. **Kanban View**: Create a webview-based kanban board
7. **Time Tracking**: Add time tracking and effort estimation features

## Architecture Notes

### Service Layer
- `TaskDataService`: Handles all CRUD operations and persistence
- Uses JSON file storage with configurable path
- Implements `ITaskProvider` interface for potential backend swapping

### Tree View Layer
- `TaskTreeProvider`: Implements VS Code TreeDataProvider
- `TaskTreeItem`: Renders individual tasks with context-aware icons
- `GroupTreeItem`: Renders task groups with counts

### Command Layer
- All commands registered in `registerTaskCommands()`
- Interactive prompts for user input
- Automatic tree refresh after mutations

### Type System
- Comprehensive TypeScript types in `types.ts`
- Enums for status, priority, and target
- Interfaces for Task, TaskGroup, and provider contracts
