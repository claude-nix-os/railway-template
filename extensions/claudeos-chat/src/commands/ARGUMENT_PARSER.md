# Argument Parser Documentation

A comprehensive argument parser for slash commands in the claudeos-chat extension.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Advanced Usage](#advanced-usage)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Features

The argument parser provides the following capabilities:

- **Quoted Strings**: Supports both single (`'`) and double (`"`) quotes for multi-word arguments
- **Key-Value Syntax**: Parse `key=value` pairs with automatic type detection
- **Positional Arguments**: Automatically index arguments by position
- **Type Conversion**: Convert string values to boolean, number, or string types
- **Argument Mapping**: Map positional args to named parameters from command definitions
- **Validation**: Validate arguments against command definitions
- **Help Generation**: Generate formatted help text for commands
- **Escaped Quotes**: Handle escaped quotes within strings

## Installation

The argument parser is part of the commands module:

```typescript
import {
  parseCommandInput,
  parseArguments,
  tokenize,
  parseValue,
  mapArgumentsToDefinition,
  validateArguments,
  getCommandHelp,
  SlashCommand
} from './argumentParser';
```

## Quick Start

### 1. Define a Command

```typescript
const searchCommand: SlashCommand = {
  name: 'search',
  description: 'Search for items',
  args: [
    {
      name: 'query',
      type: 'string',
      required: true,
      description: 'Search query'
    },
    {
      name: 'limit',
      type: 'number',
      required: false,
      default: 10,
      description: 'Maximum results'
    }
  ],
  execute: async (args) => {
    console.log(`Searching for: ${args.query}, limit: ${args.limit}`);
  }
};
```

### 2. Parse User Input

```typescript
const input = '/search "hello world" limit=20';
const { command, args: parsedArgs } = parseCommandInput(input);
// command: "search"
// parsedArgs: { 0: "hello world", limit: 20 }
```

### 3. Map and Validate Arguments

```typescript
const mappedArgs = mapArgumentsToDefinition(searchCommand, parsedArgs);
// mappedArgs: { query: "hello world", limit: 20 }

const errors = validateArguments(searchCommand, mappedArgs);
if (errors.length === 0) {
  await searchCommand.execute(mappedArgs);
}
```

## API Reference

### parseCommandInput(input: string): CommandInput

Parses a complete slash command string into command name and arguments.

**Parameters:**
- `input`: The full slash command string (e.g., `/search query limit=10`)

**Returns:**
```typescript
{
  command: string;  // The command name (lowercase, without slash)
  args: ParsedArguments;  // Object mapping argument names/indices to values
}
```

**Examples:**
```typescript
parseCommandInput('/clear')
// { command: 'clear', args: {} }

parseCommandInput('/remember "this is important"')
// { command: 'remember', args: { 0: 'this is important' } }

parseCommandInput('/search query limit=10')
// { command: 'search', args: { 0: 'query', limit: 10 } }
```

---

### parseArguments(argsString: string): ParsedArguments

Parses just the argument portion of a command.

**Parameters:**
- `argsString`: The argument string (e.g., `"query" limit=10`)

**Returns:**
```typescript
{
  [key: string]: string | number | boolean | undefined
}
```

**Examples:**
```typescript
parseArguments('arg1 arg2 arg3')
// { 0: 'arg1', 1: 'arg2', 2: 'arg3' }

parseArguments('key1=value1 key2=value2')
// { key1: 'value1', key2: 'value2' }

parseArguments('enabled=true count=42 name="John Doe"')
// { enabled: true, count: 42, name: 'John Doe' }
```

---

### tokenize(input: string): Token[]

Tokenizes an argument string into individual tokens.

**Parameters:**
- `input`: The string to tokenize

**Returns:**
```typescript
Array<{
  type: 'string' | 'key-value' | 'quoted';
  value: string;
  key?: string;
  raw: string;
}>
```

**Examples:**
```typescript
tokenize('word1 word2 word3')
// [
//   { type: 'string', value: 'word1', raw: 'word1' },
//   { type: 'string', value: 'word2', raw: 'word2' },
//   { type: 'string', value: 'word3', raw: 'word3' }
// ]

tokenize('key=value')
// [{ type: 'key-value', key: 'key', value: 'value', raw: 'key=value' }]

tokenize('"hello world" test')
// [
//   { type: 'string', value: 'hello world', raw: 'hello world' },
//   { type: 'string', value: 'test', raw: 'test' }
// ]
```

---

### parseValue(value: string): string | number | boolean

Converts a string value to the appropriate type.

**Parameters:**
- `value`: The string value to parse

**Returns:**
- `boolean` if value is "true" or "false" (case-insensitive)
- `number` if value matches numeric pattern
- `string` otherwise

**Examples:**
```typescript
parseValue('true')    // true (boolean)
parseValue('false')   // false (boolean)
parseValue('42')      // 42 (number)
parseValue('3.14')    // 3.14 (number)
parseValue('-5')      // -5 (number)
parseValue('hello')   // 'hello' (string)
parseValue('')        // '' (string)
```

---

### mapArgumentsToDefinition(command: SlashCommand, parsedArgs: ParsedArguments): ParsedArguments

Maps positional arguments to named parameters based on command definition.

**Parameters:**
- `command`: The command definition
- `parsedArgs`: The parsed arguments object

**Returns:**
- Object with arguments mapped to definition names

**Throws:**
- Error if required arguments are missing

**Examples:**
```typescript
const command = {
  name: 'search',
  args: [
    { name: 'query', type: 'string', required: true },
    { name: 'limit', type: 'number', required: false, default: 10 }
  ]
};

mapArgumentsToDefinition(command, { 0: 'search term', 1: 5 })
// { query: 'search term', limit: 5 }

mapArgumentsToDefinition(command, { 0: 'search term' })
// { query: 'search term', limit: 10 }

mapArgumentsToDefinition(command, {})
// Error: Missing required argument: query
```

---

### validateArguments(command: SlashCommand, args: ParsedArguments): string[]

Validates arguments against command definition.

**Parameters:**
- `command`: The command definition
- `args`: The arguments to validate

**Returns:**
- Array of error messages (empty if valid)

**Examples:**
```typescript
const command = {
  name: 'test',
  args: [
    { name: 'count', type: 'number', required: true }
  ]
};

validateArguments(command, { count: 42 })
// []

validateArguments(command, {})
// ['Missing required argument: count']

validateArguments(command, { count: 'not a number' })
// ["Argument 'count' must be a number"]
```

---

### getCommandHelp(command: SlashCommand): string

Generates formatted help text for a command.

**Parameters:**
- `command`: The command definition

**Returns:**
- Formatted help string

**Example:**
```typescript
const command = {
  name: 'search',
  description: 'Search for items',
  args: [
    { name: 'query', type: 'string', required: true, description: 'Search query' },
    { name: 'limit', type: 'number', required: false, default: 10, description: 'Result limit' }
  ]
};

getCommandHelp(command)
// /search <query> <limit?>
// Search for items
//
// Arguments:
//   query (string, required) - Search query
//   limit (number, optional) (default: 10) - Result limit
```

## Examples

### Example 1: Simple Command

```typescript
// Define command
const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'Clear the chat',
  execute: async () => {
    console.log('Clearing...');
  }
};

// Parse and execute
const { command, args } = parseCommandInput('/clear');
if (command === 'clear') {
  await clearCommand.execute(args);
}
```

### Example 2: Command with Required Arguments

```typescript
const rememberCommand: SlashCommand = {
  name: 'remember',
  description: 'Remember information',
  args: [
    { name: 'text', type: 'string', required: true },
    { name: 'priority', type: 'number', required: false, default: 1 }
  ],
  execute: async (args) => {
    console.log(`Storing: ${args.text} (priority: ${args.priority})`);
  }
};

// Usage examples:
// /remember "Buy groceries"
// /remember "Call mom" priority=5
```

### Example 3: Command with Multiple Argument Types

```typescript
const searchCommand: SlashCommand = {
  name: 'search',
  description: 'Search with filters',
  args: [
    { name: 'query', type: 'string', required: true },
    { name: 'limit', type: 'number', required: false, default: 10 },
    { name: 'caseSensitive', type: 'boolean', required: false, default: false }
  ],
  execute: async (args) => {
    // TypeScript types:
    // args.query: string
    // args.limit: number
    // args.caseSensitive: boolean
  }
};

// Usage examples:
// /search "error message"
// /search "error" limit=20
// /search "Error" limit=5 caseSensitive=true
```

### Example 4: Complete Command Handler

```typescript
async function handleCommand(input: string): Promise<void> {
  // Parse input
  const { command, args: parsedArgs } = parseCommandInput(input);

  // Get command definition
  const cmd = commands[command];
  if (!cmd) {
    throw new Error(`Unknown command: ${command}`);
  }

  // Map arguments
  const mappedArgs = mapArgumentsToDefinition(cmd, parsedArgs);

  // Validate
  const errors = validateArguments(cmd, mappedArgs);
  if (errors.length > 0) {
    console.error('Validation errors:', errors);
    console.log(getCommandHelp(cmd));
    return;
  }

  // Execute
  await cmd.execute(mappedArgs);
}
```

## Advanced Usage

### Custom Type Conversion

The parser automatically converts values, but you can add custom validation:

```typescript
const command: SlashCommand = {
  name: 'setTimer',
  args: [
    { name: 'duration', type: 'number', required: true }
  ],
  execute: async (args) => {
    const duration = args.duration as number;

    // Custom validation
    if (duration < 1 || duration > 3600) {
      throw new Error('Duration must be between 1 and 3600 seconds');
    }

    // Use the value
    console.log(`Setting timer for ${duration} seconds`);
  }
};
```

### Argument Aliases

You can support argument aliases by preprocessing the parsed arguments:

```typescript
function resolveAliases(args: ParsedArguments): ParsedArguments {
  const result = { ...args };

  // Map aliases
  if (result.q !== undefined) {
    result.query = result.q;
    delete result.q;
  }

  if (result.l !== undefined) {
    result.limit = result.l;
    delete result.l;
  }

  return result;
}

// Usage
const parsedArgs = parseArguments('q=test l=5');
const resolvedArgs = resolveAliases(parsedArgs);
// { query: 'test', limit: 5 }
```

### Variable-Length Arguments

For commands that accept variable numbers of arguments:

```typescript
const addAllCommand: SlashCommand = {
  name: 'addAll',
  description: 'Add multiple numbers',
  execute: async (args: ParsedArguments) => {
    const numbers: number[] = [];

    // Collect all positional arguments
    let i = 0;
    while (args[i] !== undefined) {
      const value = args[i];
      if (typeof value === 'number') {
        numbers.push(value);
      }
      i++;
    }

    const sum = numbers.reduce((a, b) => a + b, 0);
    console.log(`Sum: ${sum}`);
  }
};

// Usage: /addAll 1 2 3 4 5
```

### Context-Aware Commands

Commands can access additional context:

```typescript
interface CommandContext {
  sessionId: string;
  userId: string;
  timestamp: Date;
}

type ContextualCommand = SlashCommand & {
  executeWithContext: (args: ParsedArguments, context: CommandContext) => Promise<void>;
};

const contextCommand: ContextualCommand = {
  name: 'save',
  description: 'Save data',
  args: [
    { name: 'data', type: 'string', required: true }
  ],
  execute: async (args) => {
    // Default execute
  },
  executeWithContext: async (args, context) => {
    console.log(`Saving for user ${context.userId} in session ${context.sessionId}`);
    console.log(`Data: ${args.data}`);
  }
};
```

## Error Handling

### Common Errors

1. **Missing Required Argument**
   ```typescript
   mapArgumentsToDefinition(command, {})
   // Error: Missing required argument: query
   ```

2. **Type Mismatch**
   ```typescript
   validateArguments(command, { count: 'not a number' })
   // ["Argument 'count' must be a number"]
   ```

3. **Unknown Command**
   ```typescript
   const { command } = parseCommandInput('/unknown');
   // command: 'unknown' (needs manual validation)
   ```

### Error Handling Pattern

```typescript
try {
  const { command, args: parsedArgs } = parseCommandInput(input);

  const cmd = commands[command];
  if (!cmd) {
    throw new Error(`Unknown command: ${command}`);
  }

  const mappedArgs = mapArgumentsToDefinition(cmd, parsedArgs);
  const errors = validateArguments(cmd, mappedArgs);

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  await cmd.execute(mappedArgs);

} catch (error) {
  console.error('Command failed:', error.message);
  if (cmd) {
    console.log('Help:', getCommandHelp(cmd));
  }
}
```

## Best Practices

### 1. Always Validate Arguments

```typescript
// ✅ Good
const mappedArgs = mapArgumentsToDefinition(cmd, parsedArgs);
const errors = validateArguments(cmd, mappedArgs);
if (errors.length === 0) {
  await cmd.execute(mappedArgs);
}

// ❌ Bad
await cmd.execute(parsedArgs); // May have wrong argument names/types
```

### 2. Provide Helpful Descriptions

```typescript
// ✅ Good
{
  name: 'limit',
  type: 'number',
  required: false,
  default: 10,
  description: 'Maximum number of results to return (1-100)'
}

// ❌ Bad
{
  name: 'limit',
  type: 'number'
}
```

### 3. Use Default Values

```typescript
// ✅ Good
{
  name: 'timeout',
  type: 'number',
  required: false,
  default: 30,
  description: 'Timeout in seconds'
}

// ❌ Bad
{
  name: 'timeout',
  type: 'number',
  required: true // Forces users to always specify
}
```

### 4. Handle Edge Cases

```typescript
execute: async (args) => {
  const limit = args.limit as number;

  // Validate range
  if (limit < 1 || limit > 100) {
    throw new Error('Limit must be between 1 and 100');
  }

  // Use the value
  console.log(`Using limit: ${limit}`);
}
```

### 5. Provide Examples in Help Text

```typescript
const command: SlashCommand = {
  name: 'search',
  description: 'Search for items\n\nExamples:\n  /search "error message"\n  /search "bug" limit=5',
  // ...
};
```

## Supported Syntax Summary

| Syntax | Example | Parsed Result |
|--------|---------|---------------|
| Positional | `/cmd arg1 arg2` | `{ 0: 'arg1', 1: 'arg2' }` |
| Key-Value | `/cmd key=value` | `{ key: 'value' }` |
| Double Quotes | `/cmd "hello world"` | `{ 0: 'hello world' }` |
| Single Quotes | `/cmd 'hello world'` | `{ 0: 'hello world' }` |
| Escaped Quotes | `/cmd "say \"hi\""` | `{ 0: 'say "hi"' }` |
| Boolean | `/cmd flag=true` | `{ flag: true }` |
| Number | `/cmd count=42` | `{ count: 42 }` |
| Mixed | `/cmd "arg" key=10 flag=true` | `{ 0: 'arg', key: 10, flag: true }` |

## Type Definitions

```typescript
interface SlashCommand {
  name: string;
  description: string;
  args?: ArgumentDefinition[];
  execute: (args: ParsedArguments) => void | Promise<void>;
}

interface ArgumentDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  description?: string;
  default?: string | number | boolean;
}

interface ParsedArguments {
  [key: string]: string | number | boolean | undefined;
}

interface CommandInput {
  command: string;
  args: ParsedArguments;
}

interface Token {
  type: 'string' | 'key-value' | 'quoted';
  value: string;
  key?: string;
  raw: string;
}
```
