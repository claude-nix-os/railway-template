# ClaudeOS Tasks Extension

Task management tree view with priorities and scheduling for ClaudeOS.

## Features

- **Task List Tree View**: Display all tasks in a hierarchical tree view with grouping and sorting
- **Priority Management**: Assign priorities (low, medium, high, urgent) to tasks
- **Task Status**: Track task completion status
- **Task Scheduling**: Schedule tasks with due dates
- **Flexible Grouping**: Group tasks by priority, status, or target
- **Task Management**:
  - Create new tasks
  - Edit existing tasks
  - Mark tasks as complete/incomplete
  - Set task priorities
  - Schedule tasks with due dates
  - Delete tasks
  - Refresh task list

## Usage

The Tasks view appears in the ClaudeOS Chat activity bar. Tasks are displayed with:
- Priority indicators (color-coded icons)
- Status icons showing completion state
- Due date information
- Target/context information
- Context menu actions for task management

## Commands

- `ClaudeOS Tasks: Create Task` - Create a new task
- `ClaudeOS Tasks: Edit Task` - Edit an existing task
- `ClaudeOS Tasks: Delete Task` - Delete a task
- `ClaudeOS Tasks: Complete Task` - Mark a task as complete
- `ClaudeOS Tasks: Mark as Incomplete` - Mark a completed task as incomplete
- `ClaudeOS Tasks: Set Priority` - Change task priority
- `ClaudeOS Tasks: Schedule Task` - Set or update task due date
- `ClaudeOS Tasks: Refresh Tasks` - Refresh the task list

## Configuration

- `claudeos.tasks.dataPath` - Path to the task data file (default: workspace storage)
- `claudeos.tasks.defaultPriority` - Default priority for new tasks (default: medium)
- `claudeos.tasks.showCompletedTasks` - Show completed tasks in the list (default: true)
- `claudeos.tasks.groupBy` - Group tasks by: none, priority, status, or target (default: priority)
- `claudeos.tasks.sortBy` - Sort tasks by: priority, dueDate, createdDate, or name (default: priority)
- `claudeos.tasks.autoSchedule` - Auto-suggest scheduling for new tasks (default: false)

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
