document.addEventListener("DOMContentLoaded", function () {
  const socket = io();

  let socketId;
  let room;
  let playerNumber;
  let gamePlay = {};
  let scores = {};

  // UI Elements
  const lobbyScreen = document.getElementById("lobbyScreen");
  const waitingScreen = document.getElementById("waitingScreen");
  const scoresElement = document.getElementById("scores");
  const gameContainer = document.getElementById("gameContainer");
  const timerElement = document.getElementById("timer");
  const endGameBtn = document.getElementById("endGameBtn");
  const quickMatchBtn = document.getElementById("quickMatchBtn");
  const createGameBtn = document.getElementById("createGameBtn");
  const joinGameBtn = document.getElementById("joinGameBtn");
  const inviteCodeInput = document.getElementById("inviteCodeInput");
  const inviteCodeDisplay = document.getElementById("inviteCodeDisplay");
  const inviteCodeSpan = document.getElementById("inviteCode");
  const cancelWaitBtn = document.getElementById("cancelWaitBtn");

  let paddles = {
    other: { x: 0, y: 0, width: 10, height: 60, id: null },
    my: { x: 790, y: 0, width: 10, height: 60, id: null },
  };
  let ball = { x: 250, y: 150, radius: 5, speedX: 2, speedY: 2 };
  let gameStartTime = null;
  let timerInterval = null;

  // Lobby button handlers
  quickMatchBtn.addEventListener("click", function () {
    socket.emit("quickMatch");
    showWaitingScreen(false);
  });

  createGameBtn.addEventListener("click", function () {
    socket.emit("createPrivateGame");
  });

  joinGameBtn.addEventListener("click", function () {
    const code = inviteCodeInput.value.trim().toUpperCase();
    if (code.length === 6) {
      socket.emit("joinPrivateGame", code);
    } else {
      alert("Please enter a valid 6-character invite code");
    }
  });

  cancelWaitBtn.addEventListener("click", function () {
    socket.emit("cancelWaiting");
    showLobbyScreen();
  });

  function showLobbyScreen() {
    lobbyScreen.style.display = "flex";
    waitingScreen.style.display = "none";
    gameContainer.style.display = "none";
    scoresElement.style.display = "none";
    timerElement.style.display = "none";
    endGameBtn.style.display = "none";
  }

  function showWaitingScreen(showInviteCode) {
    lobbyScreen.style.display = "none";
    waitingScreen.style.display = "block";
    inviteCodeDisplay.style.display = showInviteCode ? "block" : "none";
  }

  socket.on("id", function ({ id, num }) {
    socketId = id;
    playerNumber = num;
    console.log(
      `Your socket ID is: ${socketId} and you are Player number ${playerNumber}`
    );
  });

  socket.on("waitingForPlayer", function ({ inviteCode }) {
    if (inviteCode) {
      inviteCodeSpan.innerText = inviteCode;
      showWaitingScreen(true);
    } else {
      showWaitingScreen(false);
    }
  });

  socket.on("gameNotFound", function () {
    alert("Game not found. Please check the invite code.");
  });

  socket.on("gameFull", function () {
    alert("This game is already full.");
  });

  socket.on("game", function (game) {
    setTimeout(async () => {
      gamePlay = game;
      room = game.roomId;
      console.log(game);
      paddles.my = await gamePlay.paddles.find(
        (paddle) => paddle.id === socketId
      );
      paddles.other = await gamePlay.paddles.find(
        (paddle) => paddle.id !== socketId
      );
    }, 1000);
  });

  socket.on("gameStart", function () {
    // Hide lobby/waiting and show game
    lobbyScreen.style.display = "none";
    waitingScreen.style.display = "none";
    gameContainer.style.display = "block";
    scoresElement.style.display = "block";
    timerElement.style.display = "block";
    endGameBtn.style.display = "block";

    // Start the timer
    gameStartTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);

    animate();
  });

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    timerElement.innerText = `Time: ${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  // End game button handler
  endGameBtn.addEventListener("click", function () {
    if (confirm("Are you sure you want to end the game?")) {
      socket.emit("endGame", { room });
    }
  });

  function animate() {
    // Emit paddles movement to the server
    socket.emit("movePaddle", {
      paddle: paddles.my,
      room: room,
      id: paddles.other.id,
      myId: paddles.my.id,
    });

    // Draw the game state
    // (Assuming you have a canvas element with id 'gameCanvas')
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      alert(
        "Error: Unable to initialize canvas. Your browser may not support the HTML5 canvas element."
      );
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw paddles
    ctx.fillStyle = "#000";
    ctx.fillRect(
      paddles.my.x,
      paddles.my.y,
      paddles.my.width,
      paddles.my.height
    );
    ctx.fillRect(
      paddles.other.x,
      paddles.other.y,
      paddles.other.width,
      paddles.other.height
    );

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.closePath();

    // Request the next animation frame
    requestAnimationFrame(animate);
  }

  // Add event listeners for paddle movement
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp" && paddles.my.y > 0) {
      paddles.my.y -= 5;
    } else if (
      e.key === "ArrowDown" &&
      paddles.my.y + paddles.my.height < 300
    ) {
      paddles.my.y += 5;
    }
  });

  // Listen for updated paddle positions from the server
  socket.on("updatePaddle", function (data) {
    paddles.other.y = data.y;
  });

  // Listen for updated ball positions from the server
  socket.on("updateBall", function (data) {
    console.log(data);
    ball = data;
  });

  socket.on("update scores", (data) => {
    scores = data;
    scoresElement.innerText = `Player 1: ${scores.player1} | Player 2: ${scores.player2}`;
  });

  socket.on("gameOver", (data) => {
    const { winner, scores } = data;
    const message =
      winner === playerNumber
        ? `You Win! Final Score - Player 1: ${scores.player1} | Player 2: ${scores.player2}`
        : `You Lose! Final Score - Player 1: ${scores.player1} | Player 2: ${scores.player2}`;

    // Stop the timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    alert(message);

    // Optionally reload the page or redirect
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  });
});
