# ClaudeOS UI Module

This is the core UI module for ClaudeOS, providing a VSCode-inspired web interface.

## Architecture

- **Framework**: Next.js 15 + React 19 + Tailwind CSS
- **State Management**: Zustand stores (panel, session, ui)
- **Layout**: react-resizable-panels for split views
- **Animations**: Framer Motion
- **Icons**: lucide-react

## Key Patterns

- All components use the custom Tailwind theme with CSS variables for colors
- Glass morphism effect: `backdrop-blur-xl bg-surface-2/50 border border-white/5`
- WebSocket connection uses JWT auth and handles reconnection
- Panel system supports tabs, split views, and drag-to-split
- Chat panel handles streaming text, tool calls, thinking blocks with full markdown

## Store Conventions

- Zustand stores use the `create` function with TypeScript interfaces
- Actions are defined within the store, not as separate functions
- Selectors are provided as named exports for common access patterns

## Testing

- Vitest with jsdom environment
- Tests located in `__tests__/` mirroring `src/` structure
- Stores tested for all state transitions
- Components tested with @testing-library/react
