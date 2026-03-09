/**
 * Example usage of the CommandRegistry.
 * This file demonstrates how to register and use slash commands.
 */

import { commandRegistry, SlashCommand, CommandContext } from './index';

/* ------------------------------------------------------------------ */
/*  Example Commands                                                  */
/* ------------------------------------------------------------------ */

// Example 1: Simple command with no arguments
const helloCommand: SlashCommand = {
  name: 'hello',
  description: 'Say hello',
  category: 'general',
  examples: ['/hello'],
};

commandRegistry.register(helloCommand, async (context: CommandContext) => {
  console.log(`Hello from session ${context.sessionId}!`);
  return {
    success: true,
    message: 'Hello!',
  };
});

// Example 2: Command with required string argument
const greetCommand: SlashCommand = {
  name: 'greet',
  description: 'Greet someone by name',
  category: 'general',
  aliases: ['hi', 'hey'],
  arguments: [
    {
      name: 'name',
      description: 'Name of the person to greet',
      type: 'string',
      required: true,
    },
  ],
  examples: ['/greet Alice', '/hi Bob'],
};

commandRegistry.register(greetCommand, async (context: CommandContext) => {
  const name = context.args.name as string;
  console.log(`Hello, ${name}!`);
  return {
    success: true,
    message: `Hello, ${name}!`,
  };
});

// Example 3: Command with choice argument
const moodCommand: SlashCommand = {
  name: 'mood',
  description: 'Set your current mood',
  category: 'general',
  arguments: [
    {
      name: 'feeling',
      description: 'How are you feeling?',
      type: 'choice',
      required: true,
      choices: ['happy', 'sad', 'excited', 'calm'],
    },
  ],
  examples: ['/mood happy', '/mood calm'],
};

commandRegistry.register(moodCommand, async (context: CommandContext) => {
  const feeling = context.args.feeling as string;
  console.log(`You are feeling ${feeling}`);
  return {
    success: true,
    message: `Your mood has been set to ${feeling}`,
  };
});

// Example 4: Command with optional argument and default
const repeatCommand: SlashCommand = {
  name: 'repeat',
  description: 'Repeat a message multiple times',
  category: 'utility',
  arguments: [
    {
      name: 'message',
      description: 'Message to repeat',
      type: 'string',
      required: true,
    },
    {
      name: 'count',
      description: 'Number of times to repeat',
      type: 'number',
      required: false,
      default: 3,
    },
  ],
  examples: ['/repeat "hello" 5', '/repeat "test"'],
};

commandRegistry.register(repeatCommand, async (context: CommandContext) => {
  const message = context.args.message as string;
  const count = (context.args.count as number) || 3;

  for (let i = 0; i < count; i++) {
    console.log(message);
  }

  return {
    success: true,
    message: `Repeated "${message}" ${count} times`,
  };
});

// Example 5: Command with boolean flag
const verboseCommand: SlashCommand = {
  name: 'debug',
  description: 'Toggle debug mode',
  category: 'utility',
  arguments: [
    {
      name: 'verbose',
      description: 'Enable verbose output',
      type: 'boolean',
      required: false,
      default: false,
    },
  ],
  examples: ['/debug', '/debug verbose=true'],
};

commandRegistry.register(verboseCommand, async (context: CommandContext) => {
  const verbose = context.args.verbose || false;
  console.log(`Debug mode ${verbose ? 'enabled' : 'disabled'}`);
  return {
    success: true,
    message: `Debug mode ${verbose ? 'enabled' : 'disabled'}`,
  };
});

/* ------------------------------------------------------------------ */
/*  Usage Examples                                                    */
/* ------------------------------------------------------------------ */

async function demonstrateUsage() {
  console.log('=== Command Registry Examples ===\n');

  // Execute commands
  console.log('1. Execute hello command:');
  await commandRegistry.execute('hello', {
    sessionId: 'demo-session',
    args: {},
    rawInput: '/hello',
  });

  console.log('\n2. Execute greet command:');
  await commandRegistry.execute('greet', {
    sessionId: 'demo-session',
    args: { name: 'Alice' },
    rawInput: '/greet Alice',
  });

  console.log('\n3. Execute greet via alias:');
  await commandRegistry.execute('hi', {
    sessionId: 'demo-session',
    args: { name: 'Bob' },
    rawInput: '/hi Bob',
  });

  console.log('\n4. Autocomplete search for "gre":');
  const autocompleteResults = commandRegistry.autocomplete('gre', 10);
  console.log(autocompleteResults.map((cmd) => `  - /${cmd.name}: ${cmd.description}`).join('\n'));

  console.log('\n5. Get all general commands:');
  const generalCommands = commandRegistry.getCommands({ category: 'general' });
  console.log(generalCommands.map((cmd) => `  - /${cmd.name}: ${cmd.description}`).join('\n'));

  console.log('\n6. Check if command exists:');
  console.log(`  /hello exists: ${commandRegistry.hasCommand('hello')}`);
  console.log(`  /unknown exists: ${commandRegistry.hasCommand('unknown')}`);

  console.log('\n7. Get command details:');
  const greetDetails = commandRegistry.getCommand('greet');
  console.log(`  Command: /${greetDetails?.name}`);
  console.log(`  Description: ${greetDetails?.description}`);
  console.log(`  Aliases: ${greetDetails?.aliases?.join(', ')}`);
  console.log(`  Arguments: ${greetDetails?.arguments?.map((a) => a.name).join(', ')}`);

  console.log('\n8. Registry stats:');
  console.log(`  Total commands registered: ${commandRegistry.size}`);
  console.log(`  All command names: ${commandRegistry.getAllCommandNames().join(', ')}`);
}

// Uncomment to run examples
// demonstrateUsage().catch(console.error);

/* ------------------------------------------------------------------ */
/*  Error Handling Examples                                           */
/* ------------------------------------------------------------------ */

async function demonstrateErrorHandling() {
  console.log('=== Error Handling Examples ===\n');

  try {
    // Invalid command name
    commandRegistry.register(
      {
        name: 'Invalid_Name',
        description: 'This will fail',
        category: 'general',
      },
      async () => {}
    );
  } catch (error) {
    console.log('1. Invalid command name:', (error as Error).message);
  }

  try {
    // Duplicate command
    commandRegistry.register(helloCommand, async () => {});
  } catch (error) {
    console.log('2. Duplicate command:', (error as Error).message);
  }

  try {
    // Missing required argument
    await commandRegistry.execute('greet', {
      sessionId: 'demo',
      args: {},
      rawInput: '/greet',
    });
  } catch (error) {
    console.log('3. Missing required argument:', (error as Error).message);
  }

  try {
    // Invalid choice value
    await commandRegistry.execute('mood', {
      sessionId: 'demo',
      args: { feeling: 'angry' }, // not in choices
      rawInput: '/mood angry',
    });
  } catch (error) {
    console.log('4. Invalid choice value:', (error as Error).message);
  }

  try {
    // Command not found
    await commandRegistry.execute('nonexistent', {
      sessionId: 'demo',
      args: {},
      rawInput: '/nonexistent',
    });
  } catch (error) {
    console.log('5. Command not found:', (error as Error).message);
  }
}

// Uncomment to run error examples
// demonstrateErrorHandling().catch(console.error);

export { demonstrateUsage, demonstrateErrorHandling };
