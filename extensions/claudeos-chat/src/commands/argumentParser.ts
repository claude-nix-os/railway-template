/**
 * Argument parser for slash commands
 *
 * Handles parsing of slash command input with support for:
 * - Quoted strings (single and double quotes)
 * - Key=value syntax
 * - Positional arguments
 * - Type conversion (boolean, number, string)
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SlashCommand {
  name: string;
  description: string;
  args?: ArgumentDefinition[];
  execute: (args: ParsedArguments) => void | Promise<void>;
}

export interface ArgumentDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  description?: string;
  default?: string | number | boolean;
}

export interface ParsedArguments {
  [key: string]: string | number | boolean | undefined;
}

export interface CommandInput {
  command: string;
  args: ParsedArguments;
}

export interface Token {
  type: 'string' | 'key-value' | 'quoted';
  value: string;
  key?: string;
  raw: string;
}

/* ------------------------------------------------------------------ */
/*  Main Parser Functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse a slash command string into command name and arguments
 *
 * Examples:
 * - "/remember 'this is one argument' arg2" → { command: "remember", args: { 0: "this is one argument", 1: "arg2" } }
 * - "/search query limit=10" → { command: "search", args: { 0: "query", limit: 10 } }
 * - "/clear" → { command: "clear", args: {} }
 *
 * @param input The full slash command input string
 * @returns Object containing command name and parsed arguments
 */
export function parseCommandInput(input: string): CommandInput {
  const trimmed = input.trim();

  // Handle empty input
  if (!trimmed) {
    return { command: '', args: {} };
  }

  // Remove leading slash if present
  const withoutSlash = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;

  // Split on first whitespace to separate command from arguments
  const firstSpace = withoutSlash.search(/\s/);

  if (firstSpace === -1) {
    // No arguments, just command
    return {
      command: withoutSlash.toLowerCase(),
      args: {}
    };
  }

  const command = withoutSlash.slice(0, firstSpace).toLowerCase();
  const argsString = withoutSlash.slice(firstSpace + 1).trim();

  return {
    command,
    args: parseArguments(argsString)
  };
}

/**
 * Parse argument string respecting quoted strings
 *
 * Handles:
 * - Quoted strings: "hello world", 'hello world'
 * - Key-value pairs: key=value, key="value with spaces"
 * - Positional arguments
 *
 * @param argsString The argument portion of the command
 * @returns Parsed arguments object
 */
export function parseArguments(argsString: string): ParsedArguments {
  if (!argsString.trim()) {
    return {};
  }

  const tokens = tokenize(argsString);
  const result: ParsedArguments = {};
  let positionalIndex = 0;

  for (const token of tokens) {
    if (token.type === 'key-value' && token.key) {
      // Named argument: key=value
      result[token.key] = parseValue(token.value);
    } else {
      // Positional argument: use index as key
      result[positionalIndex] = parseValue(token.value);
      positionalIndex++;
    }
  }

  return result;
}

/**
 * Tokenize arguments with quote handling
 *
 * Splits the input string into tokens while respecting:
 * - Single quotes: 'value'
 * - Double quotes: "value"
 * - Key-value syntax: key=value, key="value"
 * - Escaped quotes: \' and \"
 *
 * @param input The argument string to tokenize
 * @returns Array of tokens
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let current = '';
  let inQuote: '"' | "'" | null = null;
  let isEscaped = false;
  let keyBuffer = '';
  let inKeyValue = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const nextChar = i < input.length - 1 ? input[i + 1] : null;

    // Handle escape sequences
    if (char === '\\' && !isEscaped && (nextChar === '"' || nextChar === "'")) {
      isEscaped = true;
      continue;
    }

    // Handle quotes
    if ((char === '"' || char === "'") && !isEscaped) {
      if (inQuote === char) {
        // Closing quote
        inQuote = null;
      } else if (inQuote === null) {
        // Opening quote
        inQuote = char;
      } else {
        // Quote of different type inside quotes
        current += char;
      }
      isEscaped = false;
      continue;
    }

    // Handle key-value separator
    if (char === '=' && !inQuote && !inKeyValue) {
      keyBuffer = current.trim();
      current = '';
      inKeyValue = true;
      isEscaped = false;
      continue;
    }

    // Handle whitespace (token separator)
    if (/\s/.test(char) && !inQuote) {
      if (current.trim() || keyBuffer) {
        const value = current.trim();
        if (inKeyValue && keyBuffer) {
          tokens.push({
            type: 'key-value',
            value,
            key: keyBuffer,
            raw: `${keyBuffer}=${value}`
          });
          keyBuffer = '';
          inKeyValue = false;
        } else if (value) {
          tokens.push({
            type: 'string',
            value,
            raw: value
          });
        }
        current = '';
      }
      isEscaped = false;
      continue;
    }

    // Add character to current token
    current += char;
    isEscaped = false;
  }

  // Handle remaining content
  if (current.trim() || keyBuffer) {
    const value = current.trim();
    if (inKeyValue && keyBuffer) {
      tokens.push({
        type: 'key-value',
        value,
        key: keyBuffer,
        raw: `${keyBuffer}=${value}`
      });
    } else if (value) {
      tokens.push({
        type: 'string',
        value,
        raw: value
      });
    }
  }

  return tokens;
}

/**
 * Convert string values to appropriate types
 *
 * Converts:
 * - "true"/"false" → boolean
 * - Numeric strings → number
 * - Everything else → string
 *
 * @param value The string value to parse
 * @returns Converted value
 */
export function parseValue(value: string): string | number | boolean {
  // Handle empty values
  if (value === '') {
    return '';
  }

  // Handle booleans
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'true') {
    return true;
  }
  if (lowerValue === 'false') {
    return false;
  }

  // Handle numbers
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const num = Number(value);
    if (!isNaN(num)) {
      return num;
    }
  }

  // Return as string
  return value;
}

/**
 * Map positional arguments to command definition
 *
 * Takes parsed arguments (which may include positional args by index)
 * and maps them to the named parameters defined in the command definition.
 *
 * Example:
 * Command definition: { args: [{ name: 'query', type: 'string' }, { name: 'limit', type: 'number' }] }
 * Parsed args: { 0: 'search term', 1: 10 }
 * Result: { query: 'search term', limit: 10 }
 *
 * @param command The command definition
 * @param parsedArgs The parsed arguments from parseArguments
 * @returns Mapped arguments with proper names
 */
export function mapArgumentsToDefinition(
  command: SlashCommand,
  parsedArgs: ParsedArguments
): ParsedArguments {
  if (!command.args || command.args.length === 0) {
    return parsedArgs;
  }

  const result: ParsedArguments = {};
  const argDefs = command.args;

  // First, handle all named arguments (non-numeric keys)
  for (const [key, value] of Object.entries(parsedArgs)) {
    if (!/^\d+$/.test(key)) {
      // Named argument - find in definition and type-convert
      const argDef = argDefs.find(def => def.name === key);
      if (argDef) {
        result[key] = convertToType(value, argDef.type);
      } else {
        // Unknown named argument - keep as-is
        result[key] = value;
      }
    }
  }

  // Then, map positional arguments to definition names
  let positionalIndex = 0;
  for (const argDef of argDefs) {
    // Skip if already provided as named argument
    if (result.hasOwnProperty(argDef.name)) {
      continue;
    }

    // Look for positional argument
    if (parsedArgs.hasOwnProperty(positionalIndex)) {
      const value = parsedArgs[positionalIndex];
      result[argDef.name] = convertToType(value, argDef.type);
      positionalIndex++;
    } else if (argDef.default !== undefined) {
      // Use default value if available
      result[argDef.name] = argDef.default;
    } else if (argDef.required) {
      // Required argument missing
      throw new Error(`Missing required argument: ${argDef.name}`);
    }
  }

  return result;
}

/**
 * Convert a value to a specific type
 *
 * @param value The value to convert
 * @param type The target type
 * @returns Converted value
 */
function convertToType(
  value: string | number | boolean | undefined,
  type: 'string' | 'number' | 'boolean'
): string | number | boolean {
  if (value === undefined) {
    return type === 'boolean' ? false : type === 'number' ? 0 : '';
  }

  switch (type) {
    case 'boolean':
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return Boolean(value);

    case 'number':
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      }
      return Number(value);

    case 'string':
      return String(value);

    default:
      return value;
  }
}

/* ------------------------------------------------------------------ */
/*  Utility Functions                                                 */
/* ------------------------------------------------------------------ */

/**
 * Validate parsed arguments against command definition
 *
 * @param command The command definition
 * @param args The parsed arguments
 * @returns Array of validation errors (empty if valid)
 */
export function validateArguments(
  command: SlashCommand,
  args: ParsedArguments
): string[] {
  const errors: string[] = [];

  if (!command.args) {
    return errors;
  }

  for (const argDef of command.args) {
    const value = args[argDef.name];

    // Check required arguments
    if (argDef.required && (value === undefined || value === '')) {
      errors.push(`Missing required argument: ${argDef.name}`);
      continue;
    }

    // Check type compatibility if value is present
    if (value !== undefined && value !== '') {
      const valueType = typeof value;
      if (argDef.type === 'number' && valueType !== 'number') {
        errors.push(`Argument '${argDef.name}' must be a number`);
      } else if (argDef.type === 'boolean' && valueType !== 'boolean') {
        errors.push(`Argument '${argDef.name}' must be a boolean`);
      } else if (argDef.type === 'string' && valueType !== 'string') {
        errors.push(`Argument '${argDef.name}' must be a string`);
      }
    }
  }

  return errors;
}

/**
 * Get help text for a command
 *
 * @param command The command definition
 * @returns Formatted help text
 */
export function getCommandHelp(command: SlashCommand): string {
  let help = `/${command.name}`;

  if (command.args && command.args.length > 0) {
    const argStrings = command.args.map(arg => {
      const required = arg.required ? '' : '?';
      return `<${arg.name}${required}>`;
    });
    help += ' ' + argStrings.join(' ');
  }

  help += '\n' + command.description;

  if (command.args && command.args.length > 0) {
    help += '\n\nArguments:';
    for (const arg of command.args) {
      const required = arg.required ? 'required' : 'optional';
      const defaultVal = arg.default !== undefined ? ` (default: ${arg.default})` : '';
      help += `\n  ${arg.name} (${arg.type}, ${required})${defaultVal}`;
      if (arg.description) {
        help += ` - ${arg.description}`;
      }
    }
  }

  return help;
}
