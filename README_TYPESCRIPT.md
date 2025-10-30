# TypeScript Migration Guide

This project has been converted to TypeScript for better type safety and developer experience.

## Project Structure

```
ping-pong-game/
├── src/
│   ├── server.ts          # Main server (TypeScript)
│   ├── types.ts           # Shared type definitions
│   └── client/
│       ├── main.ts        # Client game logic (TypeScript)
│       └── results.ts     # Results page logic (TypeScript)
├── dist/                  # Compiled server code (generated)
├── public/
│   ├── js/               # Compiled client code (generated)
│   ├── index.html
│   ├── results.html
│   └── output.css
├── tsconfig.json         # Server TypeScript config
├── tsconfig.client.json  # Client TypeScript config
└── package.json
```

## Setup and Installation

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server
- `socket.io` - Real-time communication
- `typescript` - TypeScript compiler
- `@types/express` - Express type definitions
- `@types/node` - Node.js type definitions

### 2. Build the Project

Build both server and client TypeScript files:

```bash
npm run build
```

Or build separately:

```bash
npm run build:server  # Compiles src/ to dist/
npm run build:client  # Compiles src/client/ to public/js/
```

### 3. Start the Server

```bash
npm start
```

The server will run on `http://localhost:4000`

## Development Workflow

### Watch Mode

For development, you can use watch mode to automatically recompile on file changes:

**Terminal 1 - Watch Server:**
```bash
npm run watch:server
```

**Terminal 2 - Watch Client:**
```bash
npm run watch:client
```

**Terminal 3 - Run Server:**
```bash
npm start
```

### Full Development Cycle

```bash
# 1. Make changes to TypeScript files in src/
# 2. Build the project
npm run build

# 3. Start the server
npm start
```

## TypeScript Configuration

### Server Config (tsconfig.json)

- **Target**: ES2020
- **Module**: CommonJS (for Node.js)
- **Output**: `dist/` directory
- **Strict mode**: Enabled for maximum type safety

### Client Config (tsconfig.client.json)

- **Target**: ES2020
- **Module**: ES2020
- **Output**: `public/js/` directory
- **Lib**: ES2020 + DOM APIs
- **Strict mode**: Enabled

## Type Definitions

All shared types are defined in `src/types.ts`:

### Core Types

```typescript
interface Player {
  playerId: string;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  speedX: number;
  speedY: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

interface Scores {
  player1: number;
  player2: number;
}

type GameMode = "score" | "time";

interface Game {
  roomId: string;
  players: Players;
  ball: Ball;
  scores: Scores;
  paddles: Paddle[];
  gameMode: GameMode;
  gameDuration: number;
  ballSpeed: number;
  frameRate: number;
  startTime: number | null;
}
```

## Benefits of TypeScript

### 1. Type Safety

```typescript
// Before (JavaScript)
function generateGame(roomId, player1, player2, gameMode, gameDuration, ballSpeed, frameRate) {
  // No type checking
}

// After (TypeScript)
async function generateGame(
  roomId: string,
  player1: Player,
  player2: Player,
  gameMode: GameMode,
  gameDuration: number,
  ballSpeed: number,
  frameRate: number
): Promise<Game> {
  // Full type checking and autocomplete
}
```

### 2. Better IDE Support

- Autocomplete for all properties and methods
- Inline documentation
- Refactoring tools
- Error detection before runtime

### 3. Catch Errors Early

```typescript
// TypeScript will catch this error at compile time
const game: Game = {
  roomId: "abc123",
  players: { player1, player2 },
  // Error: Missing required properties
};
```

### 4. Self-Documenting Code

```typescript
// Function signature tells you exactly what it expects
socket.on("createPrivateGame", (settings: GameSettings) => {
  // settings must have: gameMode, gameDuration, ballSpeed, frameRate
});
```

## Common Commands

```bash
# Install dependencies
npm install

# Build everything
npm run build

# Build server only
npm run build:server

# Build client only
npm run build:client

# Start server
npm start

# Development mode (build + start)
npm run dev

# Watch server files
npm run watch:server

# Watch client files
npm run watch:client
```

## Migrating from JavaScript

If you're coming from the JavaScript version:

1. **Old files** (keep for reference):
   - `server.js` → Now `src/server.ts`
   - `public/main.js` → Now `src/client/main.ts`
   - `public/results.js` → Now `src/client/results.ts`

2. **Build process**:
   - TypeScript files are compiled to JavaScript
   - Server: `src/*.ts` → `dist/*.js`
   - Client: `src/client/*.ts` → `public/js/*.js`

3. **HTML updates**:
   - Updated script paths to use compiled files
   - `<script src="/js/main.js">` (was `/main.js`)
   - `<script src="/js/results.js">` (was `/results.js`)

## Troubleshooting

### Build Errors

If you get TypeScript errors:

```bash
# Clean build
rm -rf dist/ public/js/
npm run build
```

### Module Not Found

Make sure all dependencies are installed:

```bash
npm install
```

### Port Already in Use

Change the port in `src/server.ts`:

```typescript
const PORT = process.env.PORT || 4000; // Change 4000 to another port
```

## Production Deployment

1. Build the project:
```bash
npm run build
```

2. Set environment variables:
```bash
export PORT=80
export NODE_ENV=production
```

3. Start the server:
```bash
npm start
```

## Type Checking Only

To check types without building:

```bash
# Server
npx tsc --noEmit

# Client
npx tsc -p tsconfig.client.json --noEmit
```

## Further Reading

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Socket.IO with TypeScript](https://socket.io/docs/v4/typescript/)
- [Express with TypeScript](https://expressjs.com/en/advanced/best-practice-performance.html)
