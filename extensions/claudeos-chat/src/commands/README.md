# Command Registry

The Command Registry is a centralized system for managing slash commands in the ClaudeOS Chat extension.

## Overview

The `CommandRegistry` class provides:
- Command registration with validation
- Command execution with argument validation
- Autocomplete/fuzzy search
- Alias support
- Category filtering

## Usage

### Basic Registration

```typescript
import { commandRegistry, SlashCommand, CommandContext } from './commands';

const myCommand: SlashCommand = {
  name: 'hello',
  description: 'Say hello to someone',
  category: 'general',
  aliases: ['hi', 'greet'],
  arguments: [
    {
      name: 'name',
      description: 'Name to greet',
      type: 'string',
      required: true,
    },
  ],
  examples: [
    '/hello Alice',
    '/hi Bob',
  ],
};

commandRegistry.register(myCommand, async (context: CommandContext) => {
  console.log(`Hello, ${context.args.name}!`);
});
```

### Execution

```typescript
await commandRegistry.execute('hello', {
  sessionId: 'session-123',
  args: { name: 'Alice' },
  rawInput: '/hello Alice',
});
```

### Autocomplete

```typescript
// Get commands matching a query
const results = commandRegistry.autocomplete('mem', 25);
// Returns commands like: /remember, /recall, etc.
```

### Filtering

```typescript
// Get all memory-related commands
const memoryCommands = commandRegistry.getCommands({
  category: 'memory'
});

// Search commands
const searchResults = commandRegistry.getCommands({
  search: 'schedule'
});
```

## Command Name Rules

- Must be lowercase
- Alphanumeric and hyphens only
- Cannot start or end with a hyphen
- Examples: `remember`, `schedule-task`, `compress-context`

## Argument Types

- `string` - Text value
- `number` - Numeric value
- `boolean` - True/false
- `choice` - Select from predefined options

## Autocomplete Priority

The autocomplete system ranks results by:
1. Exact match on command name
2. Prefix match on command name
3. Prefix match on alias
4. Substring match on command name
5. Substring match on description

## Built-in Commands (US-007)

The following commands should be implemented:
- `/compress` - Compress chat context
- `/schedule` - Schedule a task/job
- `/remember` - Store in Mem0 memory
- `/recall` - Search Mem0 memory
- `/think` - Toggle thinking mode

## Module Integration

Modules can register commands via the module API:

```typescript
export function activate(context: ExtensionContext) {
  commandRegistry.register({
    name: 'my-module-command',
    description: 'Command from my module',
    category: 'utility',
  }, async (ctx) => {
    // Command implementation
  });
}
```

## Error Handling

The registry throws two types of errors:
- `CommandValidationError` - Invalid command definition or arguments
- `CommandExecutionError` - Runtime errors during command execution
