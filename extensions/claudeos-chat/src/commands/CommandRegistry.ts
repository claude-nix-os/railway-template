import {
  SlashCommand,
  CommandHandler,
  CommandContext,
  CommandRegistration,
  CommandValidationError,
  CommandExecutionError,
  CommandCategory,
  CommandArgument,
  CommandResult,
} from './types';

/* ------------------------------------------------------------------ */
/*  Command Registry                                                  */
/* ------------------------------------------------------------------ */

export class CommandRegistry {
  private commands: Map<string, CommandRegistration> = new Map();
  private aliasMap: Map<string, string> = new Map();

  /**
   * Register a slash command with its handler.
   * Validates command name and arguments before registration.
   */
  register(command: SlashCommand, handler: CommandHandler): void {
    this.validateCommandName(command.name);
    this.validateArguments(command);

    // Check for conflicts
    if (this.commands.has(command.name)) {
      throw new CommandValidationError(
        `Command '${command.name}' is already registered`
      );
    }

    // Check alias conflicts
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.validateCommandName(alias);
        if (this.aliasMap.has(alias) || this.commands.has(alias)) {
          throw new CommandValidationError(
            `Alias '${alias}' conflicts with existing command or alias`
          );
        }
      }
    }

    // Register command
    this.commands.set(command.name, { command, handler });

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliasMap.set(alias, command.name);
      }
    }
  }

  /**
   * Unregister a command by name.
   */
  unregister(commandName: string): boolean {
    const registration = this.commands.get(commandName);
    if (!registration) {
      return false;
    }

    // Remove aliases
    if (registration.command.aliases) {
      for (const alias of registration.command.aliases) {
        this.aliasMap.delete(alias);
      }
    }

    // Remove command
    return this.commands.delete(commandName);
  }

  /**
   * Execute a registered command.
   * Returns the CommandResult from the handler.
   */
  async execute(commandName: string, context: CommandContext): Promise<CommandResult> {
    // Resolve alias to actual command name
    const actualName = this.aliasMap.get(commandName) || commandName;
    const registration = this.commands.get(actualName);

    if (!registration) {
      throw new CommandExecutionError(
        `Command '${commandName}' not found`
      );
    }

    // Validate arguments
    this.validateExecutionArguments(registration.command, context.args);

    // Execute handler
    try {
      const result = await registration.handler(context);
      return result;
    } catch (error) {
      throw new CommandExecutionError(
        `Error executing command '${commandName}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get filtered list of commands.
   * Only returns visible and enabled commands by default.
   */
  getCommands(filter?: {
    category?: CommandCategory;
    search?: string;
    includeDisabled?: boolean;
    includeHidden?: boolean;
  }): SlashCommand[] {
    let commands = Array.from(this.commands.values()).map(
      (reg) => reg.command
    );

    // Filter out disabled and hidden commands unless explicitly requested
    if (!filter?.includeDisabled) {
      commands = commands.filter((cmd) => cmd.enabled !== false);
    }
    if (!filter?.includeHidden) {
      commands = commands.filter((cmd) => cmd.visible !== false);
    }

    if (filter?.category) {
      commands = commands.filter((cmd) => cmd.category === filter.category);
    }

    if (filter?.search) {
      const searchLower = filter.search.toLowerCase();
      commands = commands.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(searchLower) ||
          cmd.description.toLowerCase().includes(searchLower) ||
          cmd.aliases?.some((alias) =>
            alias.toLowerCase().includes(searchLower)
          )
      );
    }

    return commands;
  }

  /**
   * Fuzzy autocomplete search for commands.
   * Implements priority-based matching:
   * 1. Exact match on command name
   * 2. Prefix match on command name
   * 3. Prefix match on alias
   * 4. Substring match on command name
   * 5. Substring match on description
   *
   * Only returns enabled and visible commands.
   */
  autocomplete(query: string, maxResults: number = 25): SlashCommand[] {
    // Get only enabled and visible commands
    const availableCommands = Array.from(this.commands.values())
      .map((reg) => reg.command)
      .filter((cmd) => cmd.enabled !== false && cmd.visible !== false);

    if (!query) {
      // Return all available commands if no query, limited to maxResults
      return availableCommands.slice(0, maxResults);
    }

    const queryLower = query.toLowerCase();
    const results: Array<{ command: SlashCommand; priority: number }> = [];

    for (const cmd of availableCommands) {
      const nameLower = cmd.name.toLowerCase();
      const descLower = cmd.description.toLowerCase();

      let priority = 0;

      // Priority 1: Exact match
      if (nameLower === queryLower) {
        priority = 1;
      }
      // Priority 2: Prefix match on command name
      else if (nameLower.startsWith(queryLower)) {
        priority = 2;
      }
      // Priority 3: Prefix match on alias
      else if (
        cmd.aliases?.some((alias) =>
          alias.toLowerCase().startsWith(queryLower)
        )
      ) {
        priority = 3;
      }
      // Priority 4: Substring match on command name
      else if (nameLower.includes(queryLower)) {
        priority = 4;
      }
      // Priority 5: Substring match on description
      else if (descLower.includes(queryLower)) {
        priority = 5;
      }

      if (priority > 0) {
        results.push({ command: cmd, priority });
      }
    }

    // Sort by priority (lower number = higher priority), then alphabetically
    results.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.command.name.localeCompare(b.command.name);
    });

    // Limit results (max 25 as per requirements)
    return results.slice(0, Math.min(maxResults, 25)).map((r) => r.command);
  }

  /**
   * Validate command name format.
   * Must be lowercase, alphanumeric, and hyphens only.
   */
  private validateCommandName(name: string): void {
    if (!name || name.length === 0) {
      throw new CommandValidationError('Command name cannot be empty');
    }

    if (!/^[a-z0-9-]+$/.test(name)) {
      throw new CommandValidationError(
        `Command name '${name}' must be lowercase, alphanumeric, and hyphens only`
      );
    }

    if (name.startsWith('-') || name.endsWith('-')) {
      throw new CommandValidationError(
        `Command name '${name}' cannot start or end with a hyphen`
      );
    }
  }

  /**
   * Validate command arguments definition.
   */
  private validateArguments(command: SlashCommand): void {
    if (!command.arguments) {
      return;
    }

    const argNames = new Set<string>();

    for (const arg of command.arguments) {
      // Check for duplicate argument names
      if (argNames.has(arg.name)) {
        throw new CommandValidationError(
          `Duplicate argument name '${arg.name}' in command '${command.name}'`
        );
      }
      argNames.add(arg.name);

      // Validate argument name format
      if (!/^[a-z][a-z0-9-]*$/i.test(arg.name)) {
        throw new CommandValidationError(
          `Invalid argument name '${arg.name}' in command '${command.name}'`
        );
      }

      // Validate choices for choice type
      if (arg.type === 'choice' && (!arg.choices || arg.choices.length === 0)) {
        throw new CommandValidationError(
          `Argument '${arg.name}' of type 'choice' must have choices defined`
        );
      }

      // Validate default value type
      if (arg.default !== undefined) {
        const valid = this.validateArgumentValue(
          arg.name,
          arg.type,
          arg.default,
          arg.choices
        );
        if (!valid) {
          throw new CommandValidationError(
            `Default value for argument '${arg.name}' does not match type '${arg.type}'`
          );
        }
      }
    }
  }

  /**
   * Validate arguments provided during command execution.
   */
  private validateExecutionArguments(
    command: SlashCommand,
    args: Record<string, string | number | boolean>
  ): void {
    if (!command.arguments) {
      return;
    }

    for (const arg of command.arguments) {
      const value = args[arg.name];

      // Check required arguments
      if (arg.required && value === undefined) {
        throw new CommandValidationError(
          `Required argument '${arg.name}' is missing`
        );
      }

      // Validate argument type and choices
      if (value !== undefined) {
        const valid = this.validateArgumentValue(
          arg.name,
          arg.type,
          value,
          arg.choices
        );
        if (!valid) {
          throw new CommandValidationError(
            `Invalid value for argument '${arg.name}': expected ${arg.type}`
          );
        }
      }
    }
  }

  /**
   * Validate a single argument value against its type definition.
   */
  private validateArgumentValue(
    argName: string,
    type: string,
    value: string | number | boolean,
    choices?: string[]
  ): boolean {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return false;
        }
        if (choices && !choices.includes(value)) {
          return false;
        }
        return true;

      case 'number':
        return typeof value === 'number' && !isNaN(value);

      case 'boolean':
        return typeof value === 'boolean';

      case 'choice':
        return (
          typeof value === 'string' &&
          choices !== undefined &&
          choices.includes(value)
        );

      default:
        return false;
    }
  }

  /**
   * Get all registered command names (including aliases).
   */
  getAllCommandNames(): string[] {
    const names = Array.from(this.commands.keys());
    const aliases = Array.from(this.aliasMap.keys());
    return [...names, ...aliases];
  }

  /**
   * Check if a command is registered.
   */
  hasCommand(commandName: string): boolean {
    return (
      this.commands.has(commandName) || this.aliasMap.has(commandName)
    );
  }

  /**
   * Get command registration details.
   */
  getCommand(commandName: string): SlashCommand | undefined {
    const actualName = this.aliasMap.get(commandName) || commandName;
    return this.commands.get(actualName)?.command;
  }

  /**
   * Clear all registered commands.
   */
  clear(): void {
    this.commands.clear();
    this.aliasMap.clear();
  }

  /**
   * Get total number of registered commands.
   */
  get size(): number {
    return this.commands.size;
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton Instance                                                */
/* ------------------------------------------------------------------ */

export const commandRegistry = new CommandRegistry();
