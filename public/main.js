
document.addEventListener('DOMContentLoaded', function () {
  const socket = io();

  let socketId;
  let room;
  let playerNumber;
  let gamePlay = {};
  let scores = {};
  const scoresElement = document.getElementById('scores');
  let paddles = {
    other: { x: 0, y: 0, width: 10, height: 60, id: null },
    my: { x: 790, y: 0, width: 10, height: 60, id: null }
  };
  let ball = { x: 250, y: 150, radius: 5, speedX: 2, speedY: 2 };

  socket.emit('new player');

  socket.on('id', function ({id, num}) {
    socketId = id;
    playerNumber = num;
    console.log(`Your socket ID is: ${socketId} and you are Player number ${playerNumber}`);
  });

  socket.on('game', function (game) {
    setTimeout(async () => {
      gamePlay = game;
      room = game.roomId;
      console.log(game);
      paddles.my = await gamePlay.paddles.find(paddle => paddle.id === socketId);
      paddles.other = await gamePlay.paddles.find(paddle => paddle.id !== socketId);
    }, 1000);
  });

  socket.on('gameStart', function () {
    animate();
  });

  function animate() {
    // Emit paddles movement to the server
    socket.emit('movePaddle', { paddle: paddles.my, room: room, id: paddles.other.id, myId: paddles.my.id });

    // Draw the game state
    // (Assuming you have a canvas element with id 'gameCanvas')
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      alert('Error: Unable to initialize canvas. Your browser may not support the HTML5 canvas element.');
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw paddles
    ctx.fillStyle = '#000';
    ctx.fillRect(paddles.my.x, paddles.my.y, paddles.my.width, paddles.my.height);
    ctx.fillRect(paddles.other.x, paddles.other.y, paddles.other.width, paddles.other.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.closePath();

    // Request the next animation frame
    requestAnimationFrame(animate);
  }

  // Add event listeners for paddle movement
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' && paddles.my.y > 0) {
      paddles.my.y -= 5;
    } else if (e.key === 'ArrowDown' && paddles.my.y + paddles.my.height < 300) {
      paddles.my.y += 5;
    }
  });

  // Listen for updated paddle positions from the server
  socket.on('updatePaddle', function (data) {
    paddles.other.y = data.y;
  });

  // Listen for updated ball positions from the server
  socket.on('updateBall', function (data) {
    console.log(data);
    ball = data;
  });

  socket.on('update scores', (data) => {
    scores = data;
    scoresElement.innerText = `Player 1: ${scores.player1} | Player 2: ${scores.player2}`;;
  });

});
