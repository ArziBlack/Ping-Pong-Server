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

// const players = {};
let ball = { x: 300, y: 300, dx: 2, dy: 2 };
let scores = { player1: 0, player2: 0 };
let rooms = {};
let waitingPlayers = [];
let games = []

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('new player', async () => {
    waitingPlayers.push({ playerId: socket.id });
    if (waitingPlayers.length >= 2) {
      const roomId = generateRoomId();
      const game = await generateGame(socket, roomId);
      if (game) {
        io.to(game.players.player1.playerId).emit('id', game.players.player1.playerId);
        io.to(game.players.player2.playerId).emit('id', game.players.player2.playerId);
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
      game.roomId === room && const index = game.paddles.findIndex(idx => idx.id === myId);
      index !== -1 && (game.paddles[index] = paddle); 
      io.to(id).emit('updatePaddle', paddle);
    })
  });

  setInterval(() => {
    games.forEach(({ ball, room, players }) => {
      log(ball);
      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.y <= 0 || ball.y >= 600) {
        ball.dy *= -1;
      }

      // Check for collision with paddles
      if (
        (ball.x - ball.radius < players.player1?.paddle?.x + players.player1.paddle.width &&
          ball.y > players.player1.paddle.y &&
          ball.y < players.player1.paddle.y + players.player1.paddle.height) ||
        (ball.x + ball.radius > players.player2.paddle.x &&
          ball.y > players.player2.paddle.y &&
          ball.y < players.player2.paddle.y + players.player2.paddle.height)
      ) {
        ball.speedX = -ball.speedX;
      }

      // Check for scoring
      if (ball.x <= 0 || ball.x >= 600) {
        if (ball.x <= 0) {
          scores.player2++;
        } else {
          scores.player1++;
        }
        io.to(room).emit('update scores', scores);
        io.to(room).emit('scored');
        ball = { x: 250, y: 150, dx: 2, dy: 2, radius: 5, speedX: 2, speedY: 2  };
      }

      io.to(room).emit('updateBall', ball);
    })
  }, 1000 / 30);

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    const playerId = socket.id;
    // games.forEach(game => {
    //   game.players.m
    // })
    // const player = players[playerId];
    // if (player) {
    // delete players[playerId];
    // io.to(player.room).emit('current players', getPlayersInRoom(player.room));
    // }
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

  // Function to get players in a specific room
  function getPlayersInRoom(room, players) {
    const playersInRoom = {};
    for (const playerId in players) {
      const player = players[playerId];
      if (player.roomId === room) {
        playersInRoom[playerId] = player;
      }
    }
    return playersInRoom;
  }
});

function getPlayers(id) {
  const found = games.players.find(item => item.playerId === id)
  return found;
}

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

async function generateGame(socket, roomId) {
  const player1 = waitingPlayers.shift();
  const player2 = waitingPlayers.shift();
  let players = { player1, player2 };
  log(roomId)
  await socket.join(roomId);
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

  // return null;
}

function handlePlayerDisconnect(disconnectedSocketId) {
  // Remove the player from waitingPlayers
  waitingPlayers = waitingPlayers.filter(player => player.socketId !== disconnectedSocketId);

  // Remove the player from active games and notify the other player
  games.forEach(game => {
      const disconnectedPlayer = game.players.find(player => player.socketId === disconnectedSocketId);
      if (disconnectedPlayer) {
          const otherPlayer = game.players.find(player => player !== disconnectedPlayer);

          io.to(otherPlayer.socketId).emit('opponentDisconnected');
          games = games.filter(g => g !== game);
      }
  });
}

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
