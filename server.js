const { log } = require('console');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

let waitingPlayers = [];
let games = []

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('new player', async () => {
    waitingPlayers.push({ playerId: socket.id });
    if (waitingPlayers.length >= 2) {
      const roomId = generateRoomId();
      await socket.join(roomId);
      const game = await generateGame(roomId);
      if (game) {
        io.to(game.players.player1.playerId).emit('id', { id: game.players.player1.playerId, num: 1 });
        io.to(game.players.player2.playerId).emit('id', { id: game.players.player2.playerId, num: 2 });
        io.to(game.players.player1.playerId).emit('game', game);
        io.to(game.players.player2.playerId).emit('game', game);
        setTimeout(() => {
          io.to(game.players.player1.playerId).emit('gameStart');
          io.to(game.players.player2.playerId).emit('gameStart');
        }, 1500);
      }
    }
  });

  // Update the player position
  socket.on('movePaddle', ({ paddle, room, id, myId }) => {
    games.forEach(game => {
      if (game.roomId === room) {
        var index = game.paddles.findIndex(idx => idx.id === myId);
        index !== -1 && (game.paddles[index] = paddle);
        io.to(id).emit('updatePaddle', paddle);
      }
    })
  });

  setInterval(() => {
    games.forEach(({ ball, roomId, paddles, scores, players }) => {
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
        io.to(players.player1.playerId).emit('update scores', scores);
        io.to(players.player2.playerId).emit('update scores', scores);
        io.to(players.player1.playerId).emit('scored');
        io.to(players.player2.playerId).emit('scored');
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
          io.to(roomId).emit('paddle hit', id);
        }
      }
      io.to(players.player1.playerId).emit('updateBall', ball);
      io.to(players.player2.playerId).emit('updateBall', ball);
    })
  }, 1000 / 30);

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    const playerId = socket.id;

    handlePlayerDisconnect(playerId);
  });


  // Function to generate a random room ID
  function generateRoomId() {
    const length = 6;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
});

function findPaddleAndUpdate(game, playerId, paddle) {
  return game.paddles.find(item => item.id === playerId && paddle);
}

function getGame(room, games) {
  const found = games.find(item => item.roomId === room);
  log(found);
  if (found) {
    return found;
  }
  return null;
}

async function generateGame(roomId) {
  const player1 = waitingPlayers.shift();
  const player2 = waitingPlayers.shift();
  let players = { player1, player2 };
  let ball = { x: 250, y: 150, dx: 2, dy: 2, radius: 5, speedX: 2, speedY: 2 };
  let scores = { player1: 0, player2: 0 };
  let paddle1 = { x: 0, y: 150, width: 15, height: 100, id: player1.playerId };
  let paddle2 = { x: 485, y: 150, width: 15, height: 100, id: player2.playerId };
  let paddles = [paddle1, paddle2];

  const game = {
    roomId,
    players,
    ball,
    scores,
    paddles
  }

  games.push(game);
  return game;
}

function handlePlayerDisconnect(disconnectedSocketId) {
  // Remove the player from waitingPlayers
  waitingPlayers = waitingPlayers.filter(player => player.socketId !== disconnectedSocketId);

  // Remove the player from active games and notify the other player
  games.forEach(game => {
    // const disconnectedPlayer = game.players.find(player => player.socketId === disconnectedSocketId);
    const disconnectedPlayer = game.players.player1.id === disconnectedSocketId || game.players.player2.id === disconnectedSocketId;
    if (disconnectedPlayer) {
      const otherPlayer = game.players.player1.id !== disconnectedSocketId || game.players.player2.id !== disconnectedSocketId;

      io.to(otherPlayer.socketId).emit('opponentDisconnected');
      games = games.filter(g => g !== game);
    }
  });
}

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
