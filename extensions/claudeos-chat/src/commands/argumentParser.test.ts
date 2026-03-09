/**
 * Tests for argument parser
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
  Token
} from './argumentParser';

/* ------------------------------------------------------------------ */
/*  parseCommandInput Tests                                           */
/* ------------------------------------------------------------------ */

describe('parseCommandInput', () => {
  test('parses command without arguments', () => {
    const result = parseCommandInput('/clear');
    expect(result).toEqual({
      command: 'clear',
      args: {}
    });
  });

  test('parses command with single argument', () => {
    const result = parseCommandInput('/remember arg1');
    expect(result).toEqual({
      command: 'remember',
      args: { 0: 'arg1' }
    });
  });

  test('parses command with quoted argument', () => {
    const result = parseCommandInput('/remember "this is one argument" arg2');
    expect(result).toEqual({
      command: 'remember',
      args: {
        0: 'this is one argument',
        1: 'arg2'
      }
    });
  });

  test('parses command with single-quoted argument', () => {
    const result = parseCommandInput("/remember 'this is one argument' arg2");
    expect(result).toEqual({
      command: 'remember',
      args: {
        0: 'this is one argument',
        1: 'arg2'
      }
    });
  });

  test('parses command with key-value pairs', () => {
    const result = parseCommandInput('/search query limit=10');
    expect(result).toEqual({
      command: 'search',
      args: {
        0: 'query',
        limit: 10
      }
    });
  });

  test('parses command with mixed arguments', () => {
    const result = parseCommandInput('/search "my query" limit=10 verbose=true');
    expect(result).toEqual({
      command: 'search',
      args: {
        0: 'my query',
        limit: 10,
        verbose: true
      }
    });
  });

  test('handles command without slash', () => {
    const result = parseCommandInput('clear');
    expect(result).toEqual({
      command: 'clear',
      args: {}
    });
  });

  test('handles empty input', () => {
    const result = parseCommandInput('');
    expect(result).toEqual({
      command: '',
      args: {}
    });
  });

  test('converts command to lowercase', () => {
    const result = parseCommandInput('/CLEAR');
    expect(result.command).toBe('clear');
  });

  test('handles extra whitespace', () => {
    const result = parseCommandInput('  /clear  ');
    expect(result).toEqual({
      command: 'clear',
      args: {}
    });
  });
});

/* ------------------------------------------------------------------ */
/*  parseArguments Tests                                              */
/* ------------------------------------------------------------------ */

describe('parseArguments', () => {
  test('parses simple positional arguments', () => {
    const result = parseArguments('arg1 arg2 arg3');
    expect(result).toEqual({
      0: 'arg1',
      1: 'arg2',
      2: 'arg3'
    });
  });

  test('parses key-value pairs', () => {
    const result = parseArguments('key1=value1 key2=value2');
    expect(result).toEqual({
      key1: 'value1',
      key2: 'value2'
    });
  });

  test('parses quoted values in key-value pairs', () => {
    const result = parseArguments('name="John Doe" age=30');
    expect(result).toEqual({
      name: 'John Doe',
      age: 30
    });
  });

  test('parses mixed positional and key-value', () => {
    const result = parseArguments('pos1 key=value pos2');
    expect(result).toEqual({
      0: 'pos1',
      key: 'value',
      1: 'pos2'
    });
  });

  test('handles empty string', () => {
    const result = parseArguments('');
    expect(result).toEqual({});
  });

  test('handles whitespace-only string', () => {
    const result = parseArguments('   ');
    expect(result).toEqual({});
  });

  test('handles boolean values', () => {
    const result = parseArguments('enabled=true disabled=false');
    expect(result).toEqual({
      enabled: true,
      disabled: false
    });
  });

  test('handles numeric values', () => {
    const result = parseArguments('count=42 price=19.99 negative=-5');
    expect(result).toEqual({
      count: 42,
      price: 19.99,
      negative: -5
    });
  });
});

/* ------------------------------------------------------------------ */
/*  tokenize Tests                                                    */
/* ------------------------------------------------------------------ */

describe('tokenize', () => {
  test('tokenizes simple words', () => {
    const tokens = tokenize('word1 word2 word3');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ type: 'string', value: 'word1' });
    expect(tokens[1]).toMatchObject({ type: 'string', value: 'word2' });
    expect(tokens[2]).toMatchObject({ type: 'string', value: 'word3' });
  });

  test('tokenizes double-quoted strings', () => {
    const tokens = tokenize('"hello world" test');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ type: 'string', value: 'hello world' });
    expect(tokens[1]).toMatchObject({ type: 'string', value: 'test' });
  });

  test('tokenizes single-quoted strings', () => {
    const tokens = tokenize("'hello world' test");
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ type: 'string', value: 'hello world' });
    expect(tokens[1]).toMatchObject({ type: 'string', value: 'test' });
  });

  test('tokenizes key-value pairs', () => {
    const tokens = tokenize('key=value');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'key-value',
      key: 'key',
      value: 'value'
    });
  });

  test('tokenizes key-value with quoted value', () => {
    const tokens = tokenize('name="John Doe"');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      type: 'key-value',
      key: 'name',
      value: 'John Doe'
    });
  });

  test('handles escaped quotes', () => {
    const tokens = tokenize('"hello \\"world\\""');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ type: 'string', value: 'hello "world"' });
  });

  test('handles mixed quotes', () => {
    const tokens = tokenize('"I\'m happy" test');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ type: 'string', value: "I'm happy" });
    expect(tokens[1]).toMatchObject({ type: 'string', value: 'test' });
  });

  test('handles multiple spaces', () => {
    const tokens = tokenize('word1    word2     word3');
    expect(tokens).toHaveLength(3);
    expect(tokens.map(t => t.value)).toEqual(['word1', 'word2', 'word3']);
  });

  test('handles empty string', () => {
    const tokens = tokenize('');
    expect(tokens).toHaveLength(0);
  });

  test('handles complex mixed input', () => {
    const tokens = tokenize('query="search term" limit=10 verbose');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ type: 'key-value', key: 'query', value: 'search term' });
    expect(tokens[1]).toMatchObject({ type: 'key-value', key: 'limit', value: '10' });
    expect(tokens[2]).toMatchObject({ type: 'string', value: 'verbose' });
  });
});

/* ------------------------------------------------------------------ */
/*  parseValue Tests                                                  */
/* ------------------------------------------------------------------ */

describe('parseValue', () => {
  test('parses boolean true', () => {
    expect(parseValue('true')).toBe(true);
    expect(parseValue('True')).toBe(true);
    expect(parseValue('TRUE')).toBe(true);
  });

  test('parses boolean false', () => {
    expect(parseValue('false')).toBe(false);
    expect(parseValue('False')).toBe(false);
    expect(parseValue('FALSE')).toBe(false);
  });

  test('parses integers', () => {
    expect(parseValue('42')).toBe(42);
    expect(parseValue('0')).toBe(0);
    expect(parseValue('-5')).toBe(-5);
  });

  test('parses decimals', () => {
    expect(parseValue('3.14')).toBe(3.14);
    expect(parseValue('0.5')).toBe(0.5);
    expect(parseValue('-2.5')).toBe(-2.5);
  });

  test('returns string for non-numeric/boolean values', () => {
    expect(parseValue('hello')).toBe('hello');
    expect(parseValue('test123')).toBe('test123');
    expect(parseValue('12abc')).toBe('12abc');
  });

  test('handles empty string', () => {
    expect(parseValue('')).toBe('');
  });
});

/* ------------------------------------------------------------------ */
/*  mapArgumentsToDefinition Tests                                    */
/* ------------------------------------------------------------------ */

describe('mapArgumentsToDefinition', () => {
  test('maps positional arguments to definition', () => {
    const command: SlashCommand = {
      name: 'search',
      description: 'Search command',
      args: [
        { name: 'query', type: 'string', required: true },
        { name: 'limit', type: 'number', required: false, default: 10 }
      ],
      execute: () => {}
    };

    const parsedArgs = { 0: 'search term', 1: 5 };
    const result = mapArgumentsToDefinition(command, parsedArgs);

    expect(result).toEqual({
      query: 'search term',
      limit: 5
    });
  });

  test('uses default values for missing optional arguments', () => {
    const command: SlashCommand = {
      name: 'search',
      description: 'Search command',
      args: [
        { name: 'query', type: 'string', required: true },
        { name: 'limit', type: 'number', required: false, default: 10 }
      ],
      execute: () => {}
    };

    const parsedArgs = { 0: 'search term' };
    const result = mapArgumentsToDefinition(command, parsedArgs);

    expect(result).toEqual({
      query: 'search term',
      limit: 10
    });
  });

  test('preserves named arguments', () => {
    const command: SlashCommand = {
      name: 'search',
      description: 'Search command',
      args: [
        { name: 'query', type: 'string', required: true },
        { name: 'limit', type: 'number', required: false }
      ],
      execute: () => {}
    };

    const parsedArgs = { query: 'search term', limit: 20 };
    const result = mapArgumentsToDefinition(command, parsedArgs);

    expect(result).toEqual({
      query: 'search term',
      limit: 20
    });
  });

  test('handles mixed positional and named arguments', () => {
    const command: SlashCommand = {
      name: 'search',
      description: 'Search command',
      args: [
        { name: 'query', type: 'string', required: true },
        { name: 'limit', type: 'number', required: false }
      ],
      execute: () => {}
    };

    const parsedArgs = { 0: 'search term', limit: 20 };
    const result = mapArgumentsToDefinition(command, parsedArgs);

    expect(result).toEqual({
      query: 'search term',
      limit: 20
    });
  });

  test('converts types according to definition', () => {
    const command: SlashCommand = {
      name: 'test',
      description: 'Test command',
      args: [
        { name: 'count', type: 'number', required: true },
        { name: 'enabled', type: 'boolean', required: true },
        { name: 'name', type: 'string', required: true }
      ],
      execute: () => {}
    };

    const parsedArgs = { 0: '42', 1: 'true', 2: 'test' };
    const result = mapArgumentsToDefinition(command, parsedArgs);

    expect(result).toEqual({
      count: 42,
      enabled: true,
      name: 'test'
    });
  });

  test('throws error for missing required argument', () => {
    const command: SlashCommand = {
      name: 'search',
      description: 'Search command',
      args: [
        { name: 'query', type: 'string', required: true },
        { name: 'limit', type: 'number', required: true }
      ],
      execute: () => {}
    };

    const parsedArgs = { 0: 'search term' };
    expect(() => mapArgumentsToDefinition(command, parsedArgs)).toThrow('Missing required argument: limit');
  });

  test('handles command with no argument definitions', () => {
    const command: SlashCommand = {
      name: 'clear',
      description: 'Clear command',
      execute: () => {}
    };

    const parsedArgs = { 0: 'arg' };
    const result = mapArgumentsToDefinition(command, parsedArgs);

    expect(result).toEqual({ 0: 'arg' });
  });
});

/* ------------------------------------------------------------------ */
/*  validateArguments Tests                                           */
/* ------------------------------------------------------------------ */

describe('validateArguments', () => {
  test('validates correct arguments', () => {
    const command: SlashCommand = {
      name: 'test',
      description: 'Test',
      args: [
        { name: 'name', type: 'string', required: true },
        { name: 'count', type: 'number', required: false }
      ],
      execute: () => {}
    };

    const args = { name: 'test', count: 5 };
    const errors = validateArguments(command, args);

    expect(errors).toHaveLength(0);
  });

  test('detects missing required argument', () => {
    const command: SlashCommand = {
      name: 'test',
      description: 'Test',
      args: [
        { name: 'name', type: 'string', required: true }
      ],
      execute: () => {}
    };

    const args = {};
    const errors = validateArguments(command, args);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Missing required argument: name');
  });

  test('detects type mismatch', () => {
    const command: SlashCommand = {
      name: 'test',
      description: 'Test',
      args: [
        { name: 'count', type: 'number', required: true }
      ],
      execute: () => {}
    };

    const args = { count: 'not a number' };
    const errors = validateArguments(command, args);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('must be a number');
  });

  test('allows optional arguments to be missing', () => {
    const command: SlashCommand = {
      name: 'test',
      description: 'Test',
      args: [
        { name: 'name', type: 'string', required: true },
        { name: 'count', type: 'number', required: false }
      ],
      execute: () => {}
    };

    const args = { name: 'test' };
    const errors = validateArguments(command, args);

    expect(errors).toHaveLength(0);
  });

  test('handles command with no arguments', () => {
    const command: SlashCommand = {
      name: 'clear',
      description: 'Clear',
      execute: () => {}
    };

    const args = {};
    const errors = validateArguments(command, args);

    expect(errors).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  getCommandHelp Tests                                              */
/* ------------------------------------------------------------------ */

describe('getCommandHelp', () => {
  test('generates help for command without arguments', () => {
    const command: SlashCommand = {
      name: 'clear',
      description: 'Clear the screen',
      execute: () => {}
    };

    const help = getCommandHelp(command);

    expect(help).toContain('/clear');
    expect(help).toContain('Clear the screen');
  });

  test('generates help for command with arguments', () => {
    const command: SlashCommand = {
      name: 'search',
      description: 'Search for items',
      args: [
        { name: 'query', type: 'string', required: true, description: 'Search query' },
        { name: 'limit', type: 'number', required: false, default: 10, description: 'Result limit' }
      ],
      execute: () => {}
    };

    const help = getCommandHelp(command);

    expect(help).toContain('/search <query> <limit?>');
    expect(help).toContain('Search for items');
    expect(help).toContain('query (string, required) - Search query');
    expect(help).toContain('limit (number, optional) (default: 10) - Result limit');
  });

  test('shows required vs optional arguments', () => {
    const command: SlashCommand = {
      name: 'test',
      description: 'Test command',
      args: [
        { name: 'required', type: 'string', required: true },
        { name: 'optional', type: 'string', required: false }
      ],
      execute: () => {}
    };

    const help = getCommandHelp(command);

    expect(help).toContain('<required>');
    expect(help).toContain('<optional?>');
  });
});

/* ------------------------------------------------------------------ */
/*  Integration Tests                                                 */
/* ------------------------------------------------------------------ */

describe('Integration tests', () => {
  test('complete flow: parse and map arguments', () => {
    const command: SlashCommand = {
      name: 'remember',
      description: 'Remember something',
      args: [
        { name: 'text', type: 'string', required: true },
        { name: 'priority', type: 'number', required: false, default: 1 }
      ],
      execute: () => {}
    };

    const input = '/remember "this is important" priority=5';
    const { command: cmdName, args: parsedArgs } = parseCommandInput(input);
    const mappedArgs = mapArgumentsToDefinition(command, parsedArgs);

    expect(cmdName).toBe('remember');
    expect(mappedArgs).toEqual({
      text: 'this is important',
      priority: 5
    });
  });

  test('complete flow: complex command with multiple argument types', () => {
    const command: SlashCommand = {
      name: 'search',
      description: 'Search with filters',
      args: [
        { name: 'query', type: 'string', required: true },
        { name: 'limit', type: 'number', required: false, default: 10 },
        { name: 'caseSensitive', type: 'boolean', required: false, default: false }
      ],
      execute: () => {}
    };

    const input = '/search "hello world" limit=20 caseSensitive=true';
    const { command: cmdName, args: parsedArgs } = parseCommandInput(input);
    const mappedArgs = mapArgumentsToDefinition(command, parsedArgs);
    const errors = validateArguments(command, mappedArgs);

    expect(cmdName).toBe('search');
    expect(mappedArgs).toEqual({
      query: 'hello world',
      limit: 20,
      caseSensitive: true
    });
    expect(errors).toHaveLength(0);
  });

  test('complete flow: positional arguments only', () => {
    const command: SlashCommand = {
      name: 'add',
      description: 'Add numbers',
      args: [
        { name: 'a', type: 'number', required: true },
        { name: 'b', type: 'number', required: true }
      ],
      execute: () => {}
    };

    const input = '/add 5 10';
    const { command: cmdName, args: parsedArgs } = parseCommandInput(input);
    const mappedArgs = mapArgumentsToDefinition(command, parsedArgs);

    expect(cmdName).toBe('add');
    expect(mappedArgs).toEqual({
      a: 5,
      b: 10
    });
  });
});
