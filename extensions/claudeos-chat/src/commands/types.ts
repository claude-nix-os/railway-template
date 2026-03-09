/**
 * Slash Command Type Definitions for ClaudeOS Chat Extension
 *
 * This module provides comprehensive TypeScript type definitions for implementing
 * slash commands in the chat interface. Slash commands enable users to execute
 * special actions by typing commands prefixed with "/" (e.g., /help, /clear).
 */

/* ------------------------------------------------------------------ */
/*  Command Argument Types                                            */
/* ------------------------------------------------------------------ */

/**
 * Defines the type of a command argument
 */
export type ArgumentType = 'string' | 'number' | 'boolean' | 'choice';

/**
 * Represents a single argument for a slash command
 * Used to define parameters that the command can accept
 */
export interface CommandArgument {
  /**
   * The name of the argument (used in parsing and display)
   */
  name: string;

  /**
   * Human-readable description of what this argument does
   */
  description: string;

  /**
   * The expected type of the argument value
   */
  type: ArgumentType;

  /**
   * Whether this argument is required
   * @default false
   */
  required?: boolean;

  /**
   * Default value if the argument is not provided
   */
  default?: string | number | boolean;

  /**
   * For 'choice' type arguments, the available options
   */
  choices?: string[];

  /**
   * Validation pattern (regex) for string arguments
   */
  pattern?: RegExp;

  /**
   * Minimum value for number arguments
   */
  min?: number;

  /**
   * Maximum value for number arguments
   */
  max?: number;
}

/* ------------------------------------------------------------------ */
/*  Command Category and Icons                                        */
/* ------------------------------------------------------------------ */

/**
 * Categories for organizing slash commands
 */
export type CommandCategory =
  | 'general'      // General commands (help, info)
  | 'memory'       // Memory-related operations
  | 'automation'   // Automation and task operations
  | 'browser'      // Browser session commands
  | 'session'      // Session management (new, switch, archive)
  | 'message'      // Message operations (clear, edit, delete)
  | 'model'        // Model selection and configuration
  | 'system'       // System operations (settings)
  | 'utility'      // Utility functions (export, search)
  | 'custom';      // Custom user-defined commands

/**
 * Icon identifiers for commands (using Codicons or custom icons)
 * Examples: 'terminal', 'gear', 'book', 'search', 'trash'
 */
export type CommandIcon = string;

/* ------------------------------------------------------------------ */
/*  Slash Command Definition                                          */
/* ------------------------------------------------------------------ */

/**
 * Complete definition of a slash command
 */
export interface SlashCommand {
  /**
   * Unique identifier for the command (without the "/" prefix)
   * Example: "help", "clear", "model"
   */
  name: string;

  /**
   * Human-readable description of what the command does
   */
  description: string;

  /**
   * Category for organizing commands in help menus
   * @default 'utility'
   */
  category?: CommandCategory;

  /**
   * Icon to display with the command (Codicon ID or custom icon)
   * @default 'terminal'
   */
  icon?: CommandIcon;

  /**
   * List of arguments this command accepts
   */
  arguments?: CommandArgument[];

  /**
   * Alternative names for the command
   * Example: ["h"] for "help", ["cls"] for "clear"
   */
  aliases?: string[];

  /**
   * Whether the command is enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Whether to show this command in autocomplete/help
   * @default true
   */
  visible?: boolean;

  /**
   * Function that executes the command logic
   * @deprecated Use 'handler' instead for consistency
   */
  executor?: CommandHandler;

  /**
   * Function that handles the command execution
   */
  handler?: CommandHandler;

  /**
   * Usage examples for the command
   * Example: ["/help commands", "/help model"]
   */
  examples?: string[];

  /**
   * Minimum permission level required to execute
   * @default 'user'
   */
  permissionLevel?: 'user' | 'admin' | 'system';
}

/* ------------------------------------------------------------------ */
/*  Command Execution Context                                         */
/* ------------------------------------------------------------------ */

/**
 * Context provided to a command when it is executed
 * Contains all information needed to process the command
 */
export interface CommandContext {
  /**
   * The ID of the session where the command was invoked
   */
  sessionId: string;

  /**
   * Parsed arguments passed to the command
   * Key-value pairs of argument names to their values
   */
  args: Record<string, string | number | boolean>;

  /**
   * The raw input text that triggered the command
   * Example: "/model claude-opus-4-6"
   */
  rawInput: string;

  /**
   * The command name that was invoked (without "/" prefix)
   */
  commandName?: string;

  /**
   * User ID or identifier of who invoked the command
   */
  userId?: string;

  /**
   * Timestamp when the command was invoked
   */
  timestamp?: string;

  /**
   * Additional metadata that might be useful for command execution
   */
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Command Execution Result                                          */
/* ------------------------------------------------------------------ */

/**
 * Result returned after a command is executed
 */
export interface CommandResult {
  /**
   * Whether the command executed successfully
   */
  success: boolean;

  /**
   * Human-readable message about the execution result
   * Displayed to the user in the chat interface
   */
  message?: string;

  /**
   * Additional data returned by the command
   * Can be used to update UI state or pass data to other components
   */
  data?: unknown;

  /**
   * Error details if the command failed
   */
  error?: CommandError;

  /**
   * Whether to suppress the result message in the chat
   * @default false
   */
  silent?: boolean;

  /**
   * Whether to clear the input field after execution
   * @default true
   */
  clearInput?: boolean;
}

/**
 * Error information for failed command execution
 */
export interface CommandError {
  /**
   * Error code for programmatic handling
   */
  code?: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Additional error details
   */
  details?: unknown;

  /**
   * Suggestions for fixing the error
   */
  suggestions?: string[];
}

/* ------------------------------------------------------------------ */
/*  Command Handler Function Type                                     */
/* ------------------------------------------------------------------ */

/**
 * Function signature for command handlers
 * Receives context and returns a result (or promise of result)
 */
export type CommandHandler = (
  context: CommandContext
) => CommandResult | Promise<CommandResult>;

/* ------------------------------------------------------------------ */
/*  Command Registration                                              */
/* ------------------------------------------------------------------ */

/**
 * Complete registration of a command with its handler
 */
export interface CommandRegistration {
  /**
   * The command definition
   */
  command: SlashCommand;

  /**
   * The function that handles command execution
   */
  handler: CommandHandler;
}

/**
 * Options for registering a new command
 */
export interface RegisterCommandOptions {
  /**
   * Whether to override existing command with the same name
   * @default false
   */
  override?: boolean;

  /**
   * Whether to validate the command definition before registering
   * @default true
   */
  validate?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Command Registry Types                                            */
/* ------------------------------------------------------------------ */

/**
 * Registry for managing all available slash commands
 */
export interface CommandRegistry {
  /**
   * Map of command names to their definitions
   */
  commands: Map<string, SlashCommand>;

  /**
   * Map of aliases to command names
   */
  aliases: Map<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Command Parser Types                                              */
/* ------------------------------------------------------------------ */

/**
 * Result of parsing a slash command from user input
 */
export interface ParsedCommand {
  /**
   * The command name (without "/" prefix)
   */
  command: string;

  /**
   * Parsed arguments
   */
  args: Record<string, string | number | boolean>;

  /**
   * Raw argument string (unparsed portion)
   */
  rawArgs: string;

  /**
   * Whether the input was recognized as a valid command
   */
  isValid: boolean;

  /**
   * Error message if parsing failed
   */
  error?: string;
}

/**
 * Options for command parsing
 */
export interface ParseOptions {
  /**
   * Whether to perform strict validation of arguments
   * @default false
   */
  strict?: boolean;

  /**
   * Whether to convert argument types automatically
   * @default true
   */
  coerceTypes?: boolean;

  /**
   * Whether to trim whitespace from arguments
   * @default true
   */
  trim?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Command Autocomplete Types                                        */
/* ------------------------------------------------------------------ */

/**
 * Suggestion for command autocomplete
 */
export interface CommandSuggestion {
  /**
   * The command name (with "/" prefix)
   */
  command: string;

  /**
   * Display label for the suggestion
   */
  label: string;

  /**
   * Description to show in autocomplete
   */
  description: string;

  /**
   * Category of the command
   */
  category: CommandCategory;

  /**
   * Icon to display
   */
  icon?: CommandIcon;

  /**
   * Relevance score for sorting suggestions
   * Higher scores appear first
   */
  score?: number;
}

/**
 * Options for generating command suggestions
 */
export interface SuggestionOptions {
  /**
   * Filter suggestions by category
   */
  category?: CommandCategory;

  /**
   * Maximum number of suggestions to return
   */
  limit?: number;

  /**
   * Whether to include aliases in suggestions
   */
  includeAliases?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Error Classes                                                     */
/* ------------------------------------------------------------------ */

/**
 * Error thrown when command validation fails
 */
export class CommandValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandValidationError';
  }
}

/**
 * Error thrown when command execution fails
 */
export class CommandExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandExecutionError';
  }
}
