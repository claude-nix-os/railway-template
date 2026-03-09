/* ------------------------------------------------------------------ */
/*  Command System Exports                                            */
/* ------------------------------------------------------------------ */

export { CommandRegistry, commandRegistry } from './CommandRegistry';
export { registerBuiltinCommands } from './builtinCommands';
export * from './types';

/* ------------------------------------------------------------------ */
/*  Argument Parser Exports                                           */
/* ------------------------------------------------------------------ */

export {
  parseCommandInput,
  parseArguments,
  tokenize,
  parseValue,
  mapArgumentsToDefinition,
  validateArguments,
  getCommandHelp
} from './argumentParser';

export type {
  SlashCommand,
  ArgumentDefinition,
  ParsedArguments,
  CommandInput,
  Token
} from './argumentParser';
