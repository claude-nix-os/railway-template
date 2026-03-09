/**
 * Example usage of the argument parser
 *
 * This file demonstrates how to use the argument parser functions
 * to handle slash commands with various argument types.
 */

import {
  parseCommandInput,
  parseArguments,
  tokenize,
  parseValue,
  mapArgumentsToDefinition,
  validateArguments,
  getCommandHelp,
  SlashCommand,
  ParsedArguments
} from './argumentParser';

/* ------------------------------------------------------------------ */
/*  Example Command Definitions                                       */
/* ------------------------------------------------------------------ */

/**
 * Example 1: Simple command with no arguments
 */
const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'Clear the chat history',
  execute: async () => {
    console.log('Clearing chat history...');
  }
};

/**
 * Example 2: Command with required string argument
 */
const rememberCommand: SlashCommand = {
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
      description: 'Priority level (1-5)'
    }
  ],
  execute: async (args: ParsedArguments) => {
    console.log(`Remembering: ${args.text} (priority: ${args.priority})`);
  }
};

/**
 * Example 3: Command with multiple argument types
 */
const searchCommand: SlashCommand = {
  name: 'search',
  description: 'Search through chat history',
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
      description: 'Maximum number of results'
    },
    {
      name: 'caseSensitive',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable case-sensitive search'
    }
  ],
  execute: async (args: ParsedArguments) => {
    console.log('Searching with:', args);
  }
};

/**
 * Example 4: Command with all numeric arguments
 */
const addCommand: SlashCommand = {
  name: 'add',
  description: 'Add two numbers',
  args: [
    {
      name: 'a',
      type: 'number',
      required: true,
      description: 'First number'
    },
    {
      name: 'b',
      type: 'number',
      required: true,
      description: 'Second number'
    }
  ],
  execute: async (args: ParsedArguments) => {
    const sum = (args.a as number) + (args.b as number);
    console.log(`${args.a} + ${args.b} = ${sum}`);
  }
};

/* ------------------------------------------------------------------ */
/*  Command Registry                                                  */
/* ------------------------------------------------------------------ */

const commands: Record<string, SlashCommand> = {
  clear: clearCommand,
  remember: rememberCommand,
  search: searchCommand,
  add: addCommand
};

/* ------------------------------------------------------------------ */
/*  Command Executor                                                  */
/* ------------------------------------------------------------------ */

/**
 * Execute a command from user input
 */
async function executeCommand(input: string): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Input:', input);
  console.log('='.repeat(60));

  try {
    // Step 1: Parse the command input
    const { command, args: parsedArgs } = parseCommandInput(input);
    console.log('Command:', command);
    console.log('Parsed Args:', parsedArgs);

    // Step 2: Find the command definition
    const cmd = commands[command];
    if (!cmd) {
      console.error(`❌ Unknown command: ${command}`);
      console.log('\nAvailable commands:');
      Object.keys(commands).forEach(name => {
        console.log(`  /${name}`);
      });
      return;
    }

    // Step 3: Map arguments to definition
    const mappedArgs = mapArgumentsToDefinition(cmd, parsedArgs);
    console.log('Mapped Args:', mappedArgs);

    // Step 4: Validate arguments
    const errors = validateArguments(cmd, mappedArgs);
    if (errors.length > 0) {
      console.error('❌ Validation errors:');
      errors.forEach(error => console.error(`  - ${error}`));
      console.log('\nHelp:');
      console.log(getCommandHelp(cmd));
      return;
    }

    // Step 5: Execute command
    console.log('\n✓ Executing command...');
    await cmd.execute(mappedArgs);

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

/* ------------------------------------------------------------------ */
/*  Examples                                                          */
/* ------------------------------------------------------------------ */

/**
 * Run all examples
 */
async function runExamples(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         Argument Parser Examples                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Example 1: Simple command without arguments
  await executeCommand('/clear');

  // Example 2: Command with positional arguments
  await executeCommand('/remember "Buy groceries"');

  // Example 3: Command with positional and named arguments
  await executeCommand('/remember "Call mom" priority=5');

  // Example 4: Command with quoted strings
  await executeCommand('/search "error message"');

  // Example 5: Command with key-value pairs
  await executeCommand('/search query limit=20 caseSensitive=true');

  // Example 6: Command with mixed syntax
  await executeCommand('/search "hello world" limit=5 caseSensitive=false');

  // Example 7: Numeric arguments
  await executeCommand('/add 5 10');

  // Example 8: Named numeric arguments
  await executeCommand('/add a=15 b=25');

  // Example 9: Single quotes
  await executeCommand("/remember 'Important note'");

  // Example 10: Error - missing required argument
  await executeCommand('/search');

  // Example 11: Error - unknown command
  await executeCommand('/unknown');

  // Example 12: Command without slash
  await executeCommand('clear');

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         Individual Parser Function Examples             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  demonstrateTokenize();
  demonstrateParseValue();
  demonstrateGetCommandHelp();
}

/* ------------------------------------------------------------------ */
/*  Individual Function Demonstrations                                */
/* ------------------------------------------------------------------ */

/**
 * Demonstrate tokenize function
 */
function demonstrateTokenize(): void {
  console.log('\n' + '-'.repeat(60));
  console.log('Tokenize Examples');
  console.log('-'.repeat(60));

  const examples = [
    'word1 word2 word3',
    '"hello world" test',
    'key=value',
    'name="John Doe" age=30',
    'query="search term" limit=10 verbose',
    '"I\'m happy" test',
    'word1    word2     word3'
  ];

  examples.forEach(input => {
    const tokens = tokenize(input);
    console.log('\nInput:', input);
    console.log('Tokens:', tokens);
  });
}

/**
 * Demonstrate parseValue function
 */
function demonstrateParseValue(): void {
  console.log('\n' + '-'.repeat(60));
  console.log('ParseValue Examples');
  console.log('-'.repeat(60));

  const examples = [
    'true',
    'false',
    '42',
    '3.14',
    '-5',
    'hello',
    'test123',
    ''
  ];

  examples.forEach(input => {
    const value = parseValue(input);
    console.log(`\n"${input}" →`, value, `(${typeof value})`);
  });
}

/**
 * Demonstrate getCommandHelp function
 */
function demonstrateGetCommandHelp(): void {
  console.log('\n' + '-'.repeat(60));
  console.log('GetCommandHelp Examples');
  console.log('-'.repeat(60));

  Object.values(commands).forEach(cmd => {
    console.log('\n' + getCommandHelp(cmd));
    console.log('');
  });
}

/* ------------------------------------------------------------------ */
/*  Advanced Examples                                                 */
/* ------------------------------------------------------------------ */

/**
 * Example: Building a command executor with error handling
 */
class CommandExecutor {
  private commands: Map<string, SlashCommand> = new Map();

  register(command: SlashCommand): void {
    this.commands.set(command.name, command);
  }

  async execute(input: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { command, args: parsedArgs } = parseCommandInput(input);

      const cmd = this.commands.get(command);
      if (!cmd) {
        return {
          success: false,
          error: `Unknown command: ${command}`
        };
      }

      const mappedArgs = mapArgumentsToDefinition(cmd, parsedArgs);
      const errors = validateArguments(cmd, mappedArgs);

      if (errors.length > 0) {
        return {
          success: false,
          error: errors.join(', ')
        };
      }

      await cmd.execute(mappedArgs);
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  getHelp(commandName?: string): string {
    if (commandName) {
      const cmd = this.commands.get(commandName);
      return cmd ? getCommandHelp(cmd) : `Unknown command: ${commandName}`;
    }

    // Return help for all commands
    let help = 'Available commands:\n\n';
    this.commands.forEach(cmd => {
      help += getCommandHelp(cmd) + '\n\n';
    });
    return help;
  }

  listCommands(): string[] {
    return Array.from(this.commands.keys());
  }
}

/**
 * Example: Using the CommandExecutor
 */
async function demonstrateCommandExecutor(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         CommandExecutor Example                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const executor = new CommandExecutor();

  // Register commands
  executor.register(clearCommand);
  executor.register(rememberCommand);
  executor.register(searchCommand);
  executor.register(addCommand);

  // List commands
  console.log('Available commands:', executor.listCommands());

  // Execute valid commands
  console.log('\n--- Valid Commands ---');
  let result = await executor.execute('/clear');
  console.log('Result:', result);

  result = await executor.execute('/remember "Test" priority=3');
  console.log('Result:', result);

  result = await executor.execute('/search "test" limit=5 caseSensitive=true');
  console.log('Result:', result);

  // Execute invalid commands
  console.log('\n--- Invalid Commands ---');
  result = await executor.execute('/unknown');
  console.log('Result:', result);

  result = await executor.execute('/search'); // Missing required arg
  console.log('Result:', result);

  // Get help
  console.log('\n--- Help ---');
  console.log(executor.getHelp('search'));
}

/* ------------------------------------------------------------------ */
/*  Type-Safe Command Builder                                         */
/* ------------------------------------------------------------------ */

/**
 * Type-safe command builder
 */
class CommandBuilder<T extends Record<string, any> = {}> {
  private command: Partial<SlashCommand> = {
    args: []
  };

  name(name: string): this {
    this.command.name = name;
    return this;
  }

  description(description: string): this {
    this.command.description = description;
    return this;
  }

  stringArg<K extends string>(
    name: K,
    config: {
      required?: boolean;
      default?: string;
      description?: string;
    } = {}
  ): CommandBuilder<T & Record<K, string>> {
    this.command.args!.push({
      name,
      type: 'string',
      required: config.required,
      default: config.default,
      description: config.description
    });
    return this as any;
  }

  numberArg<K extends string>(
    name: K,
    config: {
      required?: boolean;
      default?: number;
      description?: string;
    } = {}
  ): CommandBuilder<T & Record<K, number>> {
    this.command.args!.push({
      name,
      type: 'number',
      required: config.required,
      default: config.default,
      description: config.description
    });
    return this as any;
  }

  booleanArg<K extends string>(
    name: K,
    config: {
      required?: boolean;
      default?: boolean;
      description?: string;
    } = {}
  ): CommandBuilder<T & Record<K, boolean>> {
    this.command.args!.push({
      name,
      type: 'boolean',
      required: config.required,
      default: config.default,
      description: config.description
    });
    return this as any;
  }

  handler(
    handler: (args: T) => void | Promise<void>
  ): SlashCommand {
    this.command.execute = handler as any;
    return this.command as SlashCommand;
  }
}

/**
 * Example: Using the CommandBuilder
 */
function demonstrateCommandBuilder(): void {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         CommandBuilder Example                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Type-safe command definition
  const searchCmd = new CommandBuilder()
    .name('search')
    .description('Search with filters')
    .stringArg('query', { required: true, description: 'Search query' })
    .numberArg('limit', { default: 10, description: 'Result limit' })
    .booleanArg('caseSensitive', { default: false, description: 'Case sensitivity' })
    .handler(async (args) => {
      // TypeScript knows the exact types:
      // args.query: string
      // args.limit: number
      // args.caseSensitive: boolean
      console.log('Query:', args.query);
      console.log('Limit:', args.limit);
      console.log('Case Sensitive:', args.caseSensitive);
    });

  console.log('Command definition:');
  console.log(JSON.stringify(searchCmd, null, 2));
}

/* ------------------------------------------------------------------ */
/*  Run Examples                                                      */
/* ------------------------------------------------------------------ */

// Uncomment to run examples:
// runExamples().catch(console.error);
// demonstrateCommandExecutor().catch(console.error);
// demonstrateCommandBuilder();

export {
  runExamples,
  demonstrateCommandExecutor,
  demonstrateCommandBuilder,
  CommandExecutor,
  CommandBuilder
};
