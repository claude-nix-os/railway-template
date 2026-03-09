import * as vscode from 'vscode';
import {
  SlashCommand,
  CommandHandler,
  CommandContext,
  CommandRegistration,
  CommandExecutionError,
} from './types';

/* ------------------------------------------------------------------ */
/*  Built-in Command Handlers                                         */
/* ------------------------------------------------------------------ */

/**
 * /compress - Trigger context compression
 */
const compressHandler: CommandHandler = async (context: CommandContext) => {
  try {
    // For now, we'll send a system message to trigger compression
    // In a full implementation, this would communicate with the kernel server
    vscode.window.showInformationMessage('Context compression triggered');

    // TODO: Send message to webview/kernel to actually trigger compression
    // This would typically involve calling the kernel's compression API
    console.log(`[/compress] Triggered for session ${context.sessionId}`);

    return {
      success: true,
      message: 'Context compression triggered',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        message: `Failed to compress context: ${errorMessage}`,
      },
    };
  }
};

/**
 * /schedule - Schedule a task
 */
const scheduleHandler: CommandHandler = async (context: CommandContext) => {
  try {
    const task = context.args.task as string;
    const time = context.args.time as string;

    if (!task || !time) {
      return {
        success: false,
        error: {
          message: 'Both task and time arguments are required',
        },
      };
    }

    // For now, just return a success message
    // In a full implementation, this would integrate with the task system (US-009)
    const message = `Scheduled: ${task} at ${time}`;
    vscode.window.showInformationMessage(message);

    // TODO: Store scheduled task in task management system
    console.log(`[/schedule] Task: "${task}", Time: ${time}, Session: ${context.sessionId}`);

    return {
      success: true,
      message,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        message: `Failed to schedule task: ${errorMessage}`,
      },
    };
  }
};

/**
 * /remember - Store in Mem0
 */
const rememberHandler: CommandHandler = async (context: CommandContext) => {
  try {
    const text = context.args.text as string;

    if (!text) {
      return {
        success: false,
        error: {
          message: 'Text argument is required',
        },
      };
    }

    // Get the kernel server URL from configuration
    const config = vscode.workspace.getConfiguration('claudeos.chat');
    const wsUrl = config.get<string>('wsUrl', 'ws://localhost:3000/ws');
    const httpUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '');

    // Make HTTP POST to /api/memory
    const response = await fetch(`${httpUrl}/api/memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sessionId: context.sessionId,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          message: `Memory API returned ${response.status}: ${response.statusText}`,
        },
      };
    }

    const result = await response.json();
    const message = `Memory saved: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
    vscode.window.showInformationMessage(message);
    console.log(`[/remember] Saved to memory:`, result);

    return {
      success: true,
      message,
      data: result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        message: `Failed to save memory: ${errorMessage}`,
      },
    };
  }
};

/**
 * /recall - Search Mem0
 */
const recallHandler: CommandHandler = async (context: CommandContext) => {
  try {
    const query = context.args.query as string;
    const limit = (context.args.limit as number) || 10;

    if (!query) {
      return {
        success: false,
        error: {
          message: 'Query argument is required',
        },
      };
    }

    // Get the kernel server URL from configuration
    const config = vscode.workspace.getConfiguration('claudeos.chat');
    const wsUrl = config.get<string>('wsUrl', 'ws://localhost:3000/ws');
    const httpUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '');

    // Make HTTP GET to /api/memory/search
    const url = new URL(`${httpUrl}/api/memory/search`);
    url.searchParams.append('q', query);
    url.searchParams.append('limit', limit.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      return {
        success: false,
        error: {
          message: `Memory search API returned ${response.status}: ${response.statusText}`,
        },
      };
    }

    const results = await response.json();

    // Show results in an information message
    let message: string;
    if (results.length === 0) {
      message = `No memories found for: ${query}`;
    } else {
      message = `Found ${results.length} memories for: ${query}`;
    }
    vscode.window.showInformationMessage(message);

    console.log(`[/recall] Query: "${query}", Results:`, results);

    // TODO: Display results in the chat UI instead of just showing a notification
    return {
      success: true,
      message,
      data: results,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        message: `Failed to search memories: ${errorMessage}`,
      },
    };
  }
};

/**
 * /think - Toggle thinking mode
 */
const thinkHandler: CommandHandler = async (context: CommandContext) => {
  try {
    // For now, just show a success message
    // In a full implementation, this would send a message to the webview to toggle thinking display
    vscode.window.showInformationMessage('Thinking mode toggled');

    // TODO: Send message to webview to toggle thinking mode UI
    console.log(`[/think] Toggled for session ${context.sessionId}`);

    return {
      success: true,
      message: 'Thinking mode toggled',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        message: `Failed to toggle thinking mode: ${errorMessage}`,
      },
    };
  }
};

/**
 * /help - Show available commands
 */
const helpHandler: CommandHandler = async (context: CommandContext) => {
  try {
    // Show a QuickPick with all available commands
    const commandList = [
      '/compress - Compress the current conversation context',
      '/schedule <task> <time> - Schedule a task or reminder',
      '/task <title> [description] [priority] [doAt] - Create a task with optional scheduling',
      '/remember <text> - Save information to long-term memory',
      '/recall <query> [limit] - Search through memories',
      '/think - Toggle chain-of-thought thinking mode',
      '/help - Show this help message',
      '/clear - Clear current session',
      '/new - Create new session',
    ];

    await vscode.window.showQuickPick(commandList, {
      title: 'Available Slash Commands',
      placeHolder: 'Browse available commands',
    });

    console.log(`[/help] Displayed help for session ${context.sessionId}`);

    return {
      success: true,
      message: 'Available commands: /compress, /schedule, /task, /remember, /recall, /think, /help, /clear, /new',
      silent: true, // Don't show message in chat since QuickPick was displayed
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        message: `Failed to show help: ${errorMessage}`,
      },
    };
  }
};

/**
 * /clear - Clear current session
 */
const clearHandler: CommandHandler = async (context: CommandContext) => {
  try {
    // Ask for confirmation
    const result = await vscode.window.showWarningMessage(
      'Are you sure you want to clear the current session? This action cannot be undone.',
      { modal: true },
      'Clear',
      'Cancel'
    );

    if (result === 'Clear') {
      // For now, just add a system message saying cleared
      // In a full implementation, this would communicate with the kernel to clear the session
      vscode.window.showInformationMessage('Session cleared');

      // TODO: Send message to webview/kernel to clear the session
      console.log(`[/clear] Cleared session ${context.sessionId}`);

      return {
        success: true,
        message: 'Session cleared',
      };
    } else {
      return {
        success: false,
        message: 'Session clear cancelled',
        silent: true,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        message: `Failed to clear session: ${errorMessage}`,
      },
    };
  }
};

/**
 * /new - Create new session
 */
const newHandler: CommandHandler = async (context: CommandContext) => {
  try {
    // Send message to webview to create new session
    vscode.window.showInformationMessage('Creating new session...');

    // TODO: Send message to webview to create a new session
    // This should trigger the kernel to create a new session via WebSocket
    console.log(`[/new] Creating new session from ${context.sessionId}`);

    return {
      success: true,
      message: 'Creating new session...',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        message: `Failed to create new session: ${errorMessage}`,
      },
    };
  }
};

/**
 * Parse natural language time expressions into ISO 8601 timestamps
 */
function parseNaturalTime(timeStr: string): string | null {
  const now = new Date();
  const normalized = timeStr.toLowerCase().trim();

  // Match "in X minutes/hours/days"
  const inPattern = /^in\s+(\d+)\s+(minute|minutes|min|hour|hours|hr|day|days)$/;
  const inMatch = normalized.match(inPattern);
  if (inMatch) {
    const amount = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    const target = new Date(now);

    if (unit.startsWith('min')) {
      target.setMinutes(target.getMinutes() + amount);
    } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
      target.setHours(target.getHours() + amount);
    } else if (unit.startsWith('day')) {
      target.setDate(target.getDate() + amount);
    }

    return target.toISOString();
  }

  // Match "tomorrow [at HH:mm]"
  if (normalized.startsWith('tomorrow')) {
    const target = new Date(now);
    target.setDate(target.getDate() + 1);

    const timeMatch = normalized.match(/at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3];

      if (meridiem === 'pm' && hours < 12) {
        hours += 12;
      } else if (meridiem === 'am' && hours === 12) {
        hours = 0;
      }

      target.setHours(hours, minutes, 0, 0);
    } else {
      target.setHours(9, 0, 0, 0); // Default to 9 AM
    }

    return target.toISOString();
  }

  // Match "next Monday/Tuesday/etc"
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const nextDayPattern = /^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?)?$/;
  const nextDayMatch = normalized.match(nextDayPattern);
  if (nextDayMatch) {
    const targetDayName = nextDayMatch[1];
    const targetDayIndex = dayNames.indexOf(targetDayName);
    const currentDayIndex = now.getDay();

    let daysToAdd = targetDayIndex - currentDayIndex;
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }

    const target = new Date(now);
    target.setDate(target.getDate() + daysToAdd);

    if (nextDayMatch[2]) {
      let hours = parseInt(nextDayMatch[2], 10);
      const minutes = nextDayMatch[3] ? parseInt(nextDayMatch[3], 10) : 0;
      const meridiem = nextDayMatch[4];

      if (meridiem === 'pm' && hours < 12) {
        hours += 12;
      } else if (meridiem === 'am' && hours === 12) {
        hours = 0;
      }

      target.setHours(hours, minutes, 0, 0);
    } else {
      target.setHours(9, 0, 0, 0); // Default to 9 AM
    }

    return target.toISOString();
  }

  // Match "today at HH:mm"
  if (normalized.startsWith('today')) {
    const timeMatch = normalized.match(/at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    if (timeMatch) {
      const target = new Date(now);
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3];

      if (meridiem === 'pm' && hours < 12) {
        hours += 12;
      } else if (meridiem === 'am' && hours === 12) {
        hours = 0;
      }

      target.setHours(hours, minutes, 0, 0);
      return target.toISOString();
    }
  }

  // Try to parse as ISO 8601 or standard date format
  const parsed = new Date(timeStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
}

/**
 * /task - Create a task
 */
const taskHandler: CommandHandler = async (context: CommandContext) => {
  try {
    const title = context.args.title as string;
    const description = (context.args.description as string) || '';
    const priority = (context.args.priority as string) || 'medium';
    const doAt = context.args.doAt as string | undefined;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return {
        success: false,
        error: {
          message: 'Title is required',
        },
      };
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    let normalizedPriority = priority.toLowerCase();

    // Map "urgent" to "high" since the API only supports low/medium/high
    if (normalizedPriority === 'urgent') {
      normalizedPriority = 'high';
    }

    if (!validPriorities.includes(normalizedPriority)) {
      return {
        success: false,
        error: {
          message: 'Priority must be one of: low, medium, high, urgent',
        },
      };
    }

    // Parse doAt time if provided
    let dueDate: string | null = null;
    if (doAt) {
      dueDate = parseNaturalTime(doAt);
      if (!dueDate) {
        return {
          success: false,
          error: {
            message: `Could not parse time expression: "${doAt}". Try "in 5 minutes", "tomorrow at 3pm", or "next Monday"`,
          },
        };
      }
    }

    // Get the kernel server URL from configuration
    const config = vscode.workspace.getConfiguration('claudeos.chat');
    const wsUrl = config.get<string>('wsUrl', 'ws://localhost:3000/ws');
    const httpUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '');

    // Create task via HTTP POST to /api/tasks
    const response = await fetch(`${httpUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        priority: normalizedPriority === 'urgent' ? 'high' : normalizedPriority,
        dueDate,
        sessionId: context.sessionId,
        status: 'todo',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      return {
        success: false,
        error: {
          message: `Failed to create task: ${errorData.error || response.statusText}`,
        },
      };
    }

    const task = await response.json();

    // Build success message
    let message = `Task created: ${task.title} (ID: ${task.id})`;
    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      const formattedDate = dueDateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      message += `\nScheduled for: ${formattedDate}`;
    }
    if (normalizedPriority !== 'medium') {
      message += `\nPriority: ${normalizedPriority === 'high' && priority.toLowerCase() === 'urgent' ? 'urgent' : normalizedPriority}`;
    }

    vscode.window.showInformationMessage(`Task created: ${task.title}`);
    console.log(`[/task] Created task:`, task);

    // TODO: Trigger claudeos-tasks extension to refresh its tree view
    // This could be done via a VS Code command or event

    return {
      success: true,
      message,
      data: task,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        message: `Failed to create task: ${errorMessage}`,
      },
    };
  }
};

/* ------------------------------------------------------------------ */
/*  Built-in Command Definitions                                      */
/* ------------------------------------------------------------------ */

const compressCommand: SlashCommand = {
  name: 'compress',
  description: 'Compress the current conversation context',
  category: 'session',
  examples: ['/compress'],
};

const scheduleCommand: SlashCommand = {
  name: 'schedule',
  description: 'Schedule a task or reminder',
  category: 'automation',
  arguments: [
    {
      name: 'task',
      description: 'The task to schedule',
      type: 'string',
      required: true,
    },
    {
      name: 'time',
      description: 'When to execute the task (e.g., "2024-03-10 14:00" or "in 2 hours")',
      type: 'string',
      required: true,
    },
  ],
  examples: [
    '/schedule "Review PR" "2024-03-10 14:00"',
    '/schedule "Deploy to production" "in 2 hours"',
  ],
};

const rememberCommand: SlashCommand = {
  name: 'remember',
  description: 'Save information to long-term memory',
  category: 'memory',
  arguments: [
    {
      name: 'text',
      description: 'The information to remember',
      type: 'string',
      required: true,
    },
  ],
  examples: [
    '/remember The API key is stored in .env.local',
    '/remember User prefers dark mode and compact UI',
  ],
};

const recallCommand: SlashCommand = {
  name: 'recall',
  description: 'Search through memories',
  category: 'memory',
  arguments: [
    {
      name: 'query',
      description: 'Search query for memories',
      type: 'string',
      required: true,
    },
    {
      name: 'limit',
      description: 'Maximum number of results to return',
      type: 'number',
      required: false,
      default: 10,
    },
  ],
  examples: [
    '/recall API key',
    '/recall user preferences 5',
  ],
};

const thinkCommand: SlashCommand = {
  name: 'think',
  description: 'Toggle chain-of-thought thinking mode',
  category: 'utility',
  examples: ['/think'],
};

const helpCommand: SlashCommand = {
  name: 'help',
  description: 'Show available commands',
  category: 'utility',
  aliases: ['h', '?'],
  examples: ['/help', '/h', '/?'],
};

const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'Clear current session',
  category: 'session',
  examples: ['/clear'],
};

const newCommand: SlashCommand = {
  name: 'new',
  description: 'Create new session',
  category: 'session',
  examples: ['/new'],
};

const taskCommand: SlashCommand = {
  name: 'task',
  description: 'Create a task with optional scheduling',
  category: 'automation',
  arguments: [
    {
      name: 'title',
      description: 'The task title',
      type: 'string',
      required: true,
    },
    {
      name: 'description',
      description: 'Optional task description',
      type: 'string',
      required: false,
    },
    {
      name: 'priority',
      description: 'Task priority (low, medium, high, urgent)',
      type: 'string',
      required: false,
      default: 'medium',
    },
    {
      name: 'doAt',
      description: 'When to do the task (e.g., "in 5 minutes", "tomorrow at 3pm", "next Monday")',
      type: 'string',
      required: false,
    },
  ],
  examples: [
    '/task title="Review PR #123" priority=high',
    '/task title="Daily standup" doAt="tomorrow at 9am"',
    '/task title="Fix bug in login" description="Users can\'t login with SSO" priority=urgent doAt="in 30 minutes"',
    '/task title="Weekly team meeting" doAt="next Monday at 10am"',
  ],
};

/* ------------------------------------------------------------------ */
/*  Command Registry Integration                                      */
/* ------------------------------------------------------------------ */

/**
 * All built-in command registrations
 */
export const BUILTIN_COMMANDS: CommandRegistration[] = [
  { command: compressCommand, handler: compressHandler },
  { command: scheduleCommand, handler: scheduleHandler },
  { command: rememberCommand, handler: rememberHandler },
  { command: recallCommand, handler: recallHandler },
  { command: thinkCommand, handler: thinkHandler },
  { command: helpCommand, handler: helpHandler },
  { command: clearCommand, handler: clearHandler },
  { command: newCommand, handler: newHandler },
  { command: taskCommand, handler: taskHandler },
];

/**
 * Register all built-in commands with the command registry
 *
 * @param registry - The command registry to register commands with
 * @returns Array of registered command names
 */
export function registerBuiltinCommands(
  registry: { register: (command: SlashCommand, handler: CommandHandler) => void }
): string[] {
  const registeredNames: string[] = [];

  for (const registration of BUILTIN_COMMANDS) {
    try {
      registry.register(registration.command, registration.handler);
      registeredNames.push(registration.command.name);

      // Aliases are handled automatically by the CommandRegistry
      if (registration.command.aliases) {
        for (const alias of registration.command.aliases) {
          registeredNames.push(alias);
        }
      }
    } catch (error) {
      console.error(`Failed to register command ${registration.command.name}:`, error);
    }
  }

  console.log(`Registered ${registeredNames.length} built-in commands:`, registeredNames);
  return registeredNames;
}
