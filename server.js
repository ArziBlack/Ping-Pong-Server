const { log } = require("console");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

let waitingPlayers = [];
let games = [];
let privateGames = {}; // Store private games by invite code

io.on("connection", (socket) => {
  console.log("A user connected");

  // Quick match - pair with any available player
  socket.on("quickMatch", async () => {
    waitingPlayers.push({ playerId: socket.id });
    socket.emit("waitingForPlayer", { inviteCode: null });

    if (waitingPlayers.length >= 2) {
      const player1 = waitingPlayers.shift();
      const player2 = waitingPlayers.shift();
      const roomId = generateRoomId();

      const player1Socket = io.sockets.sockets.get(player1.playerId);
      const player2Socket = io.sockets.sockets.get(player2.playerId);

      if (player1Socket && player2Socket) {
        await player1Socket.join(roomId);
        await player2Socket.join(roomId);

        const game = await generateGame(roomId, player1, player2, "score", 60, 2, 35);
        if (game) {
          startGame(game);
        }
      }
    }
  });

  // Create private game with invite code
  socket.on("createPrivateGame", ({ gameMode, gameDuration, ballSpeed, frameRate }) => {
    const inviteCode = generateInviteCode();
    const roomId = generateRoomId();

    privateGames[inviteCode] = {
      roomId,
      host: { playerId: socket.id },
      guest: null,
      started: false,
      gameMode: gameMode || "score",
      gameDuration: gameDuration || 60,
      ballSpeed: ballSpeed || 2,
      frameRate: frameRate || 35,
    };

    socket.join(roomId);
    socket.emit("waitingForPlayer", { inviteCode });
    console.log(
      `Private game created with code: ${inviteCode} (${gameMode} mode, speed: ${ballSpeed}, fps: ${frameRate})`
    );
  });

  // Join private game with invite code
  socket.on("joinPrivateGame", async (inviteCode) => {
    const privateGame = privateGames[inviteCode];

    if (!privateGame) {
      socket.emit("gameNotFound");
      return;
    }

    if (privateGame.guest || privateGame.started) {
      socket.emit("gameFull");
      return;
    }

    privateGame.guest = { playerId: socket.id };
    await socket.join(privateGame.roomId);

    const game = await generateGame(
      privateGame.roomId,
      privateGame.host,
      privateGame.guest,
      privateGame.gameMode,
      privateGame.gameDuration,
      privateGame.ballSpeed,
      privateGame.frameRate
    );

    if (game) {
      privateGame.started = true;
      startGame(game);
      delete privateGames[inviteCode];
    }
  });

  // Cancel waiting
  socket.on("cancelWaiting", () => {
    // Remove from quick match queue
    waitingPlayers = waitingPlayers.filter(
      (player) => player.playerId !== socket.id
    );

    // Remove from private games
    for (const code in privateGames) {
      if (privateGames[code].host.playerId === socket.id) {
        delete privateGames[code];
        break;
      }
    }
  });

  // Update the player position
  socket.on("movePaddle", ({ paddle, room, id, myId }) => {
    games.forEach((game) => {
      if (game.roomId === room) {
        var index = game.paddles.findIndex((idx) => idx.id === myId);
        index !== -1 && (game.paddles[index] = paddle);
        io.to(id).emit("updatePaddle", paddle);
      }
    });
  });

  // Handle end game request
  socket.on("endGame", ({ room }) => {
    const gameIndex = games.findIndex((g) => g.roomId === room);
    if (gameIndex !== -1) {
      const game = games[gameIndex];
      const { scores, players } = game;
      const winner =
        scores.player1 > scores.player2
          ? 1
          : scores.player2 > scores.player1
          ? 2
          : 0;
      io.to(players.player1.playerId).emit("gameOver", { winner, scores });
      io.to(players.player2.playerId).emit("gameOver", { winner, scores });
      clearInterval(gameLoopIntervals[game.roomId]);
      delete gameLoopIntervals[game.roomId];
      games.splice(gameIndex, 1);
    }
  });

  // Handle player disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected");
    const playerId = socket.id;

    handlePlayerDisconnect(playerId);
  });

  // Function to generate a random room ID
  function generateRoomId() {
    const length = 6;
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  }

  // Function to generate invite code
  function generateInviteCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    do {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }
    } while (privateGames[code]); // Ensure unique code
    return code;
  }
});

function findPaddleAndUpdate(game, playerId, paddle) {
  return game.paddles.find((item) => item.id === playerId && paddle);
}

function getGame(room, games) {
  const found = games.find((item) => item.roomId === room);
  log(found);
  if (found) {
    return found;
  }
  return null;
}

async function generateGame(roomId, player1, player2, gameMode, gameDuration, ballSpeed, frameRate) {
  let players = { player1, player2 };
  const speed = ballSpeed || 2;
  let ball = { x: 250, y: 150, dx: speed, dy: speed, radius: 5, speedX: speed, speedY: speed };
  let scores = { player1: 0, player2: 0 };
  let paddle1 = { x: 0, y: 150, width: 15, height: 100, id: player1.playerId };
  let paddle2 = {
    x: 485,
    y: 150,
    width: 15,
    height: 100,
    id: player2.playerId,
  };
  let paddles = [paddle1, paddle2];

  const game = {
    roomId,
    players,
    ball,
    scores,
    paddles,
    gameMode: gameMode || "score",
    gameDuration: gameDuration || 60,
    ballSpeed: ballSpeed || 2,
    frameRate: frameRate || 35,
    startTime: null,
  };

  games.push(game);
  return game;
}

function startGame(game) {
  game.startTime = Date.now();

  io.to(game.players.player1.playerId).emit("id", {
    id: game.players.player1.playerId,
    num: 1,
  });
  io.to(game.players.player2.playerId).emit("id", {
    id: game.players.player2.playerId,
    num: 2,
  });
  io.to(game.players.player1.playerId).emit("game", game);
  io.to(game.players.player2.playerId).emit("game", game);
  
  // Start the game loop for this specific game
  startGameLoop(game);
  
  setTimeout(() => {
    io.to(game.players.player1.playerId).emit("gameStart", {
      gameMode: game.gameMode,
      gameDuration: game.gameDuration,
      ballSpeed: game.ballSpeed,
      frameRate: game.frameRate,
    });
    io.to(game.players.player2.playerId).emit("gameStart", {
      gameMode: game.gameMode,
      gameDuration: game.gameDuration,
      ballSpeed: game.ballSpeed,
      frameRate: game.frameRate,
    });
  }, 1500);
}

function handlePlayerDisconnect(disconnectedSocketId) {
  // Remove the player from waitingPlayers
  waitingPlayers = waitingPlayers.filter(
    (player) => player.socketId !== disconnectedSocketId
  );

  // Remove the player from active games and notify the other player
  games.forEach((game) => {
    // const disconnectedPlayer = game.players.find(player => player.socketId === disconnectedSocketId);
    const disconnectedPlayer =
      game.players.player1.id === disconnectedSocketId ||
      game.players.player2.id === disconnectedSocketId;
    if (disconnectedPlayer) {
      const otherPlayer =
        game.players.player1.id !== disconnectedSocketId ||
        game.players.player2.id !== disconnectedSocketId;

      io.to(otherPlayer.socketId).emit("opponentDisconnected");
      games = games.filter((g) => g !== game);
    }
  });
}

// Game loop - runs independently of socket connections
let gameLoopIntervals = {};

function startGameLoop(game) {
  const fps = game.frameRate || 35;
  
  if (gameLoopIntervals[game.roomId]) {
    clearInterval(gameLoopIntervals[game.roomId]);
  }
  
  gameLoopIntervals[game.roomId] = setInterval(() => {
    const gameIndex = games.findIndex(g => g.roomId === game.roomId);
    if (gameIndex === -1) {
      clearInterval(gameLoopIntervals[game.roomId]);
      delete gameLoopIntervals[game.roomId];
      return;
    }
    
    const currentGame = games[gameIndex];
    const {
      ball,
      roomId,
      paddles,
      scores,
      players,
      gameMode,
      gameDuration,
      startTime,
    } = currentGame;

    // Check if time-based game has ended
    if (gameMode === "time" && startTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed >= gameDuration) {
        // Time's up - determine winner by score
        const winner =
          scores.player1 > scores.player2
            ? 1
            : scores.player2 > scores.player1
            ? 2
            : 0;
        io.to(players.player1.playerId).emit("gameOver", { winner, scores });
        io.to(players.player2.playerId).emit("gameOver", { winner, scores });
        clearInterval(gameLoopIntervals[roomId]);
        delete gameLoopIntervals[roomId];
        games.splice(gameIndex, 1);
        return;
      }
    }

    ball.x += ball.speedX;
    ball.y += ball.speedY;

    if (ball.y <= 0 || ball.y >= 300) {
      ball.speedY *= -1;
    }

    // Check for scoring
    if (ball.x <= 0 || ball.x >= 500) {
      if (ball.x <= 0) {
        scores.player2++;
      } else {
        scores.player1++;
      }
      ball.x = 250;
      ball.y = 150;
      ball.speedX = -ball.speedX;
      io.to(players.player1.playerId).emit("update scores", scores);
      io.to(players.player2.playerId).emit("update scores", scores);
      io.to(players.player1.playerId).emit("scored");
      io.to(players.player2.playerId).emit("scored");

      // Check if game should end (score reaches 10) - only for score mode
      if (
        gameMode === "score" &&
        (scores.player1 >= 10 || scores.player2 >= 10)
      ) {
        const winner = scores.player1 >= 10 ? 1 : 2;
        io.to(players.player1.playerId).emit("gameOver", { winner, scores });
        io.to(players.player2.playerId).emit("gameOver", { winner, scores });
        // Remove the game from active games
        clearInterval(gameLoopIntervals[roomId]);
        delete gameLoopIntervals[roomId];
        games.splice(gameIndex, 1);
        return; // Exit this iteration since game is over
      }
    }

    // Check for collision with paddles
    for (const id in paddles) {
      const paddle = paddles[id];
      if (
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.width &&
        ball.y >= paddle.y &&
        ball.y <= paddle.y + paddle.height
      ) {
        ball.speedX *= -1;
        io.to(roomId).emit("paddle hit", id);
      }
    }
    io.to(players.player1.playerId).emit("updateBall", ball);
    io.to(players.player2.playerId).emit("updateBall", ball);
  }, 1000 / fps);
}

// Start game loops for existing games
games.forEach(game => startGameLoop(game));

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
