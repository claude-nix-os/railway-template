# ClaudeOS Tasks Extension - Structure Overview

## File Structure
```
claudeos-tasks/
├── package.json              # VS Code extension manifest
├── tsconfig.json             # TypeScript configuration
├── esbuild.js                # Build configuration
├── .vscodeignore             # Files to exclude from packaging
├── .gitignore                # Git ignore rules
├── README.md                 # Extension documentation
├── resources/
│   └── tasks-icon.svg        # Activity bar icon
└── src/
    ├── extension.ts          # Extension entry point
    ├── types.ts              # TypeScript type definitions
    ├── commands/
    │   └── taskCommands.ts   # Command implementations
    ├── services/
    │   └── TaskDataService.ts # Task data persistence service
    └── taskTree/
        ├── TaskTreeProvider.ts # Tree view data provider
        ├── TaskTreeItem.ts     # Individual task tree item
        └── GroupTreeItem.ts    # Task group tree item
```

## Key Components

### Extension Manifest (package.json)
- Contributes to `claudeos-chat-container` view container
- Defines 8 commands: create, edit, delete, complete, uncomplete, setPriority, schedule, refresh
- Configuration options for grouping, sorting, filtering, and defaults
- Context menus for inline and contextual actions

### Type Definitions (types.ts)
- `TaskStatus`: TODO, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED
- `TaskPriority`: LOW, MEDIUM, HIGH, URGENT
- `TaskTarget`: GENERAL, CODE, DOCS, TEST, BUG, FEATURE, REFACTOR, RESEARCH
- `Task` interface with full metadata support
- `TaskGroup` interface for tree grouping
- `ITaskProvider` interface for data operations

### Services
- **TaskDataService**: Handles persistence, CRUD operations, filtering, and change notifications

### Tree View
- **TaskTreeProvider**: Manages tree structure with grouping and sorting
- **TaskTreeItem**: Renders individual tasks with icons, tooltips, and descriptions
- **GroupTreeItem**: Renders task groups

### Commands
- Create task with title, description, priority, and target
- Edit task title and description
- Delete task with confirmation
- Complete/uncomplete tasks
- Set task priority
- Schedule tasks with due dates (quick options + custom)
- Refresh task list

## Features

1. **Flexible Grouping**: Group by priority, status, target, or none
2. **Smart Sorting**: Sort by priority, due date, created date, or name
3. **Rich UI**: Color-coded icons, tooltips with full task details
4. **Persistence**: JSON file storage with configurable path
5. **Context Menus**: Inline and contextual actions based on task state
6. **Due Date Management**: Quick scheduling options + custom dates
7. **Status Tracking**: Complete workflow from TODO to COMPLETED

## Configuration Options

- `claudeos.tasks.dataPath`: Custom task data file path
- `claudeos.tasks.defaultPriority`: Default priority for new tasks
- `claudeos.tasks.showCompletedTasks`: Show/hide completed tasks
- `claudeos.tasks.groupBy`: Grouping strategy (none, priority, status, target)
- `claudeos.tasks.sortBy`: Sorting strategy (priority, dueDate, createdDate, name)
- `claudeos.tasks.autoSchedule`: Auto-suggest scheduling for new tasks

## Integration

This extension integrates with the ClaudeOS ecosystem:
- Uses the `claudeos-chat-container` view container from claudeos-chat extension
- Follows the same patterns as claudeos-sessions for tree views
- Uses consistent styling and icons with other ClaudeOS extensions
- Shares common dependencies (ws, nanoid) with other extensions
