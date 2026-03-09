# Argument Parser - Quick Start Guide

A 5-minute guide to using the argument parser for slash commands.

## Basic Usage

### 1. Import the Functions

```typescript
import {
  parseCommandInput,
  mapArgumentsToDefinition,
  validateArguments,
  SlashCommand
} from './commands';
```

### 2. Define Your Command

```typescript
const myCommand: SlashCommand = {
  name: 'remember',
  description: 'Remember important information',
  args: [
    {
      name: 'text',
      type: 'string',
      required: true,
      description: 'Text to remember'
    },
    {
      name: 'priority',
      type: 'number',
      required: false,
      default: 1,
      description: 'Priority (1-5)'
    }
  ],
  execute: async (args) => {
    console.log(`Remembering: ${args.text}, priority: ${args.priority}`);
  }
};
```

### 3. Parse and Execute

```typescript
async function handleCommand(input: string) {
  // Parse
  const { command, args: parsedArgs } = parseCommandInput(input);

  // Get command
  const cmd = commands[command];
  if (!cmd) return;

  // Map positional args to named args
  const mappedArgs = mapArgumentsToDefinition(cmd, parsedArgs);

  // Validate
  const errors = validateArguments(cmd, mappedArgs);
  if (errors.length > 0) {
    console.error(errors);
    return;
  }

  // Execute
  await cmd.execute(mappedArgs);
}
```

### 4. Use It

```typescript
await handleCommand('/remember "Buy groceries"');
// Output: Remembering: Buy groceries, priority: 1

await handleCommand('/remember "Call mom" priority=5');
// Output: Remembering: Call mom, priority: 5
```

## Supported Syntax

| Input | Result |
|-------|--------|
| `/cmd arg` | Positional argument |
| `/cmd "multi word"` | Quoted string |
| `/cmd key=value` | Named argument |
| `/cmd key=10` | Auto-converts to number |
| `/cmd flag=true` | Auto-converts to boolean |
| `/cmd "arg1" key=10 flag=true` | Mixed syntax |

## Argument Types

```typescript
args: [
  { name: 'text', type: 'string', required: true },
  { name: 'count', type: 'number', required: false, default: 10 },
  { name: 'enabled', type: 'boolean', required: false, default: false }
]
```

## Complete Example

```typescript
import {
  parseCommandInput,
  mapArgumentsToDefinition,
  validateArguments,
  getCommandHelp,
  SlashCommand
} from './commands';

// Define commands
const commands: Record<string, SlashCommand> = {
  search: {
    name: 'search',
    description: 'Search chat history',
    args: [
      { name: 'query', type: 'string', required: true },
      { name: 'limit', type: 'number', required: false, default: 10 }
    ],
    execute: async (args) => {
      console.log(`Searching: ${args.query}, limit: ${args.limit}`);
    }
  },

  clear: {
    name: 'clear',
    description: 'Clear chat',
    execute: async () => {
      console.log('Clearing...');
    }
  }
};

// Execute function
async function execute(input: string) {
  try {
    const { command, args: parsedArgs } = parseCommandInput(input);

    const cmd = commands[command];
    if (!cmd) {
      throw new Error(`Unknown: ${command}`);
    }

    const mappedArgs = mapArgumentsToDefinition(cmd, parsedArgs);
    const errors = validateArguments(cmd, mappedArgs);

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    await cmd.execute(mappedArgs);
  } catch (error) {
    console.error(error.message);
  }
}

// Use it
execute('/search "hello" limit=5');
execute('/clear');
```

## Next Steps

- Read [ARGUMENT_PARSER.md](./ARGUMENT_PARSER.md) for full documentation
- See [argumentParser.example.ts](./argumentParser.example.ts) for more examples
- Check [argumentParser.test.ts](./argumentParser.test.ts) for test cases

## Common Patterns

### Pattern 1: Command Registry

```typescript
class CommandExecutor {
  private commands = new Map<string, SlashCommand>();

  register(cmd: SlashCommand) {
    this.commands.set(cmd.name, cmd);
  }

  async execute(input: string) {
    const { command, args } = parseCommandInput(input);
    const cmd = this.commands.get(command);
    if (cmd) {
      const mapped = mapArgumentsToDefinition(cmd, args);
      await cmd.execute(mapped);
    }
  }
}
```

### Pattern 2: With Context

```typescript
interface Context {
  sessionId: string;
  userId: string;
}

async function executeWithContext(input: string, context: Context) {
  const { command, args } = parseCommandInput(input);
  const cmd = commands[command];

  if (cmd) {
    const mapped = mapArgumentsToDefinition(cmd, args);
    // Add context to args
    await cmd.execute({ ...mapped, ...context });
  }
}
```

### Pattern 3: Error Handling

```typescript
async function safeExecute(input: string) {
  try {
    const { command, args } = parseCommandInput(input);
    const cmd = commands[command];

    if (!cmd) {
      return { success: false, error: 'Unknown command' };
    }

    const mapped = mapArgumentsToDefinition(cmd, args);
    const errors = validateArguments(cmd, mapped);

    if (errors.length > 0) {
      return { success: false, error: errors.join(', ') };
    }

    await cmd.execute(mapped);
    return { success: true };

  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Key Functions

| Function | Purpose |
|----------|---------|
| `parseCommandInput(input)` | Parse full command string |
| `parseArguments(args)` | Parse just the arguments |
| `tokenize(input)` | Split into tokens |
| `parseValue(value)` | Convert string to type |
| `mapArgumentsToDefinition(cmd, args)` | Map positional to named |
| `validateArguments(cmd, args)` | Validate against definition |
| `getCommandHelp(cmd)` | Generate help text |

That's it! You're ready to use the argument parser.
