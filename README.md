# Ping Pong Multiplayer Game

A real-time multiplayer ping pong game built with Node.js, Express, and Socket.IO. Play against friends or random opponents with customizable game settings.

## Features

### Game Modes
- **Score Mode**: First player to reach 10 points wins
- **Time Mode**: Countdown timer - highest score when time runs out wins (customizable 1-10 minutes)

### Matchmaking Options
- **Quick Match**: Automatically pair with any available player
- **Private Game**: Create a game with a unique 6-character invite code to play with friends
- **Join Game**: Enter an invite code to join a friend's private game

### Customizable Settings (Private Games)
- **Ball Speed**: Adjustable from 1 (Very Slow) to 5 (Very Fast)
- **Frame Rate**: Choose between 30, 35 (default), 45, or 60 FPS for different gameplay smoothness
- **Game Duration**: Set custom time limits for time-based games (1-10 minutes)

### Gameplay Features
- Real-time multiplayer synchronization
- Live score tracking
- Game timer (counts up in Score Mode, counts down in Time Mode)
- End Game button to manually end matches
- Paddle collision detection
- Ball physics with wall bouncing

### Results & Statistics
- Dedicated results page after each game
- Displays winner/loser/tie status
- Shows final scores for both players
- Game mode and duration statistics
- Total points scored
- "Play Again" button to return to lobby

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd ping-pong-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node server.js
```

4. Open your browser and navigate to:
```
http://localhost:4000
```

## Project Structure

```
ping-pong-game/
├── server.js              # Main server file with game logic
├── public/
│   ├── index.html         # Main game page with lobby
│   ├── main.js            # Client-side game logic
│   ├── results.html       # Game results page
│   ├── results.js         # Results page logic
│   └── output.css         # Tailwind CSS styles
├── package.json
└── README.md
```

## Technology Stack

- **Backend**: Node.js, Express.js
- **Real-time Communication**: Socket.IO
- **Frontend**: HTML5 Canvas, Vanilla JavaScript
- **Styling**: Tailwind CSS with custom retro gaming theme

## How to Play

### Controls
- **Arrow Up**: Move paddle up
- **Arrow Down**: Move paddle down

### Starting a Game

#### Quick Match
1. Click "Quick Match" button
2. Wait for another player to join
3. Game starts automatically when matched

#### Private Game
1. Click "Create Private Game"
2. Choose game settings:
   - Select Score Mode or Time Mode
   - Adjust ball speed (1-5)
   - Select frame rate (30-60 FPS)
   - Set game duration (for Time Mode)
3. Click "Start Game"
4. Share the invite code with your friend
5. Game starts when friend joins

#### Join Private Game
1. Get invite code from friend
2. Enter the 6-character code
3. Click "Join Game"
4. Game starts automatically

## Code Architecture

### Server-Side (server.js)

#### Socket Events

**Connection Events:**
```javascript
socket.on("quickMatch")        // Join quick match queue
socket.on("createPrivateGame") // Create private game with settings
socket.on("joinPrivateGame")   // Join game using invite code
socket.on("cancelWaiting")     // Cancel waiting for opponent
```

**Game Events:**
```javascript
socket.on("movePaddle")        // Update paddle position
socket.on("endGame")           // Manually end game
socket.on("disconnect")        // Handle player disconnection
```

**Emitted Events:**
```javascript
socket.emit("waitingForPlayer") // Show waiting screen
socket.emit("gameNotFound")     // Invalid invite code
socket.emit("gameFull")         // Game already has 2 players
socket.emit("id")               // Send player ID and number
socket.emit("game")             // Send game state
socket.emit("gameStart")        // Start game with settings
socket.emit("updatePaddle")     // Update opponent paddle
socket.emit("updateBall")       // Update ball position
socket.emit("update scores")    // Update scores
socket.emit("gameOver")         // End game with results
```

#### Game Loop

Each game runs its own independent loop at the specified FPS:

```javascript
function startGameLoop(game) {
  const fps = game.frameRate || 35;
  
  gameLoopIntervals[game.roomId] = setInterval(() => {
    // Update ball position
    ball.x += ball.speedX;
    ball.y += ball.speedY;
    
    // Check wall collisions
    // Check paddle collisions
    // Check scoring
    // Check win conditions
    // Emit updates to players
  }, 1000 / fps);
}
```

#### Game State Structure

```javascript
const game = {
  roomId: string,           // Unique room identifier
  players: {
    player1: { playerId },
    player2: { playerId }
  },
  ball: {
    x, y,                   // Position
    speedX, speedY,         // Velocity
    radius                  // Size
  },
  scores: {
    player1: number,
    player2: number
  },
  paddles: [
    { x, y, width, height, id },
    { x, y, width, height, id }
  ],
  gameMode: "score" | "time",
  gameDuration: number,     // Seconds
  ballSpeed: 1-5,          // Speed multiplier
  frameRate: 30-60,        // FPS
  startTime: timestamp
};
```

### Client-Side (main.js)

#### UI State Management

```javascript
function showLobbyScreen()        // Display lobby with options
function showGameSettingsScreen() // Display game settings
function showWaitingScreen()      // Display waiting for opponent
```

#### Game Rendering

```javascript
function animate() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw paddles
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  
  // Draw ball
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  
  // Request next frame
  requestAnimationFrame(animate);
}
```

#### Timer Management

**Score Mode (Count Up):**
```javascript
function updateTimer() {
  const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  // Display: MM:SS
}
```

**Time Mode (Countdown):**
```javascript
function updateCountdown() {
  const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  const remaining = Math.max(0, gameDuration - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  // Display: MM:SS
}
```

### Results Page (results.js)

Displays game statistics using URL parameters:

```javascript
const urlParams = new URLSearchParams(window.location.search);
const winner = urlParams.get("winner");      // 0=tie, 1=player1, 2=player2
const player1Score = urlParams.get("p1");    // Player 1 final score
const player2Score = urlParams.get("p2");    // Player 2 final score
const gameMode = urlParams.get("mode");      // "score" or "time"
const duration = urlParams.get("duration");  // Game duration in seconds
const playerNumber = urlParams.get("player"); // Current player number
```

## Game Logic

### Scoring System

**Score Mode:**
- Ball crosses left boundary → Player 2 scores
- Ball crosses right boundary → Player 1 scores
- First to 10 points wins

**Time Mode:**
- Same scoring rules
- Game ends when timer reaches 0:00
- Winner determined by highest score
- Tie if scores are equal

### Ball Physics

```javascript
// Ball movement
ball.x += ball.speedX;
ball.y += ball.speedY;

// Wall collision (top/bottom)
if (ball.y <= 0 || ball.y >= 300) {
  ball.speedY *= -1;
}

// Paddle collision
if (ball collides with paddle) {
  ball.speedX *= -1;
}

// Scoring (left/right boundaries)
if (ball.x <= 0 || ball.x >= 500) {
  // Award point and reset ball
}
```

### Paddle Controls

```javascript
// Keyboard input
if (ArrowUp && paddle.y > 0) {
  paddle.y -= 5;
}
if (ArrowDown && paddle.y + paddle.height < 300) {
  paddle.y += 5;
}
```

## Configuration

### Default Settings

```javascript
// Quick Match defaults
gameMode: "score"
gameDuration: 60 seconds
ballSpeed: 2 (Normal)
frameRate: 35 FPS

// Canvas dimensions
width: 500px
height: 300px

// Paddle dimensions
width: 15px
height: 100px

// Ball
radius: 5px
initial position: (250, 150)
```

### Customizable Ranges

```javascript
ballSpeed: 1-5        // Very Slow to Very Fast
frameRate: 30-60      // FPS options: 30, 35, 45, 60
gameDuration: 1-10    // Minutes (Time Mode only)
```

## Dependencies

```json
{
  "express": "^4.x.x",
  "socket.io": "^4.x.x"
}
```

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Any modern browser with HTML5 Canvas and WebSocket support

## Future Enhancements

- [ ] Add sound effects
- [ ] Implement power-ups
- [ ] Add AI opponent for single-player mode
- [ ] Tournament mode with brackets
- [ ] Player profiles and statistics tracking
- [ ] Leaderboard system
- [ ] Mobile touch controls
- [ ] Spectator mode
- [ ] Chat functionality
- [ ] Replay system

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues or questions, please open an issue on the GitHub repository.
