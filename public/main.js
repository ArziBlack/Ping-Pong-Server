document.addEventListener("DOMContentLoaded", function () {
  const socket = io();

  let socketId;
  let room;
  let playerNumber;
  let gamePlay = {};
  let scores = {};
  
  // PixiJS Game Instance
  let pixiGame = null;

  // UI Elements
  const lobbyScreen = document.getElementById("lobbyScreen");
  const gameSettingsScreen = document.getElementById("gameSettingsScreen");
  const waitingScreen = document.getElementById("waitingScreen");
  const scoresElement = document.getElementById("scores");
  const gameContainer = document.getElementById("gameContainer");
  const pixiContainer = document.getElementById("pixiContainer");
  const timerElement = document.getElementById("timer");
  const endGameBtn = document.getElementById("endGameBtn");
  const pauseGameBtn = document.getElementById("pauseGameBtn");
  const pauseOverlay = document.getElementById("pauseOverlay");
  const resumeGameBtn = document.getElementById("resumeGameBtn");
  const quickMatchBtn = document.getElementById("quickMatchBtn");
  const createGameBtn = document.getElementById("createGameBtn");
  const joinGameBtn = document.getElementById("joinGameBtn");
  const inviteCodeInput = document.getElementById("inviteCodeInput");
  const inviteCodeDisplay = document.getElementById("inviteCodeDisplay");
  const inviteCodeSpan = document.getElementById("inviteCode");
  const cancelWaitBtn = document.getElementById("cancelWaitBtn");
  const startGameBtn = document.getElementById("startGameBtn");
  const backToLobbyBtn = document.getElementById("backToLobbyBtn");
  const gameDurationInput = document.getElementById("gameDuration");
  const timeSettings = document.getElementById("timeSettings");
  const ballSpeedInput = document.getElementById("ballSpeed");
  const ballSpeedValue = document.getElementById("ballSpeedValue");
  const frameRateSelect = document.getElementById("frameRate");

  let gameMode = "score"; // 'score' or 'time'
  let gameDuration = 60; // in seconds
  let ballSpeed = 2; // 1-5
  let frameRate = 35; // FPS
  let countdownInterval = null;

  // Ball speed slider handler
  ballSpeedInput.addEventListener("input", function () {
    ballSpeed = parseInt(this.value);
    const speedLabels = ["Very Slow", "Slow", "Normal", "Fast", "Very Fast"];
    ballSpeedValue.innerText = speedLabels[ballSpeed - 1];
  });

  // Frame rate selector handler
  frameRateSelect.addEventListener("change", function () {
    frameRate = parseInt(this.value);
  });

  let paddles = {
    other: { x: 0, y: 0, width: 15, height: 100, id: null, hitEffect: false },
    my: { x: 865, y: 200, width: 15, height: 100, id: null, hitEffect: false },
  };
  let ball = { x: 450, y: 250, radius: 7, speedX: 2, speedY: 2 };
  let gameStartTime = null;
  let timerInterval = null;
  let isPaused = false;
  let pauseStartTime = null;
  let totalPausedTime = 0;

  // Lobby button handlers
  quickMatchBtn.addEventListener("click", function () {
    socket.emit("quickMatch");
    showWaitingScreen(false);
  });

  createGameBtn.addEventListener("click", function () {
    showGameSettingsScreen();
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
    gameSettingsScreen.style.display = "none";
    waitingScreen.style.display = "none";
    gameContainer.style.display = "none";
    scoresElement.style.display = "none";
    timerElement.style.display = "none";
    endGameBtn.style.display = "none";
    pauseGameBtn.style.display = "none";
    pauseOverlay.style.display = "none";
  }

  function showGameSettingsScreen() {
    lobbyScreen.style.display = "none";
    gameSettingsScreen.style.display = "flex";
  }

  function showWaitingScreen(showInviteCode) {
    lobbyScreen.style.display = "none";
    gameSettingsScreen.style.display = "none";
    waitingScreen.style.display = "block";
    inviteCodeDisplay.style.display = showInviteCode ? "block" : "none";
  }

  // Game mode radio button handler
  document.querySelectorAll('input[name="gameMode"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      gameMode = this.value;
      timeSettings.style.display = gameMode === "time" ? "flex" : "none";
    });
  });

  // Start game button handler
  startGameBtn.addEventListener("click", function () {
    if (gameMode === "time") {
      gameDuration = parseInt(gameDurationInput.value) * 60; // Convert to seconds
    }
    ballSpeed = parseInt(ballSpeedInput.value);
    frameRate = parseInt(frameRateSelect.value);
    socket.emit("createPrivateGame", {
      gameMode,
      gameDuration,
      ballSpeed,
      frameRate,
    });
  });

  // Back to lobby button handler
  backToLobbyBtn.addEventListener("click", function () {
    showLobbyScreen();
  });

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

  socket.on("gamePaused", function (data) {
    console.log("Received gamePaused event", data);
    console.log("Current isPaused state:", isPaused);
    
    isPaused = true;

    // Store current positions when pausing
    if (data && data.ball) {
      ball = data.ball;
      console.log("Ball position frozen at:", ball.x, ball.y);
    }
    if (data && data.paddles) {
      data.paddles.forEach((serverPaddle) => {
        if (serverPaddle.id === paddles.my.id) {
          paddles.my = serverPaddle;
        } else if (serverPaddle.id === paddles.other.id) {
          paddles.other = serverPaddle;
        }
      });
      console.log("Paddles frozen");
    }

    pauseOverlay.style.display = "flex";
    pauseGameBtn.innerText = "Resume";
    pauseGameBtn.classList.remove("bg-yellow-600", "hover:bg-yellow-700");
    pauseGameBtn.classList.add("bg-green-600", "hover:bg-green-700");
    pauseStartTime = Date.now();
    
    console.log("Game paused successfully. isPaused:", isPaused);
  });

  socket.on("gameResumed", function () {
    console.log("Received gameResumed event");
    console.log("Current isPaused state:", isPaused);
    
    isPaused = false;
    pauseOverlay.style.display = "none";
    pauseGameBtn.innerText = "Pause";
    pauseGameBtn.classList.remove("bg-green-600", "hover:bg-green-700");
    pauseGameBtn.classList.add("bg-yellow-600", "hover:bg-yellow-700");

    if (pauseStartTime) {
      totalPausedTime += Date.now() - pauseStartTime;
      pauseStartTime = null;
    }
    
    console.log("Game resumed successfully. isPaused:", isPaused);
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

  socket.on("gameStart", function (data) {
    gameMode = data.gameMode;
    gameDuration = data.gameDuration;
    ballSpeed = data.ballSpeed || 2;
    frameRate = data.frameRate || 35;

    // Initialize PixiJS Game (GPU-accelerated)
    if (!pixiGame) {
      pixiGame = new PixiPongGame(pixiContainer);
      console.log("PixiJS game initialized with WebGL renderer");
    }

    // Hide lobby/waiting and show game
    lobbyScreen.style.display = "none";
    gameSettingsScreen.style.display = "none";
    waitingScreen.style.display = "none";
    gameContainer.style.display = "block";
    scoresElement.style.display = "block";
    timerElement.style.display = "block";
    endGameBtn.style.display = "block";
    pauseGameBtn.style.display = "block";

    // Start the timer
    gameStartTime = Date.now();

    if (gameMode === "time") {
      // Countdown timer
      countdownInterval = setInterval(updateCountdown, 1000);
    } else {
      // Regular timer
      timerInterval = setInterval(updateTimer, 1000);
    }

    animate();
  });

  function updateTimer() {
    if (isPaused) return;
    const elapsed = Math.floor(
      (Date.now() - gameStartTime - totalPausedTime) / 1000
    );
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    timerElement.innerText = `Time: ${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  function updateCountdown() {
    if (isPaused) return;
    const elapsed = Math.floor(
      (Date.now() - gameStartTime - totalPausedTime) / 1000
    );
    const remaining = Math.max(0, gameDuration - elapsed);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timerElement.innerText = `Time: ${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      // Time's up - server will handle game over
    }
  }

  // Pause game button handler
  pauseGameBtn.addEventListener("click", function () {
    togglePause();
  });

  // Resume game button handler
  resumeGameBtn.addEventListener("click", function () {
    togglePause();
  });

  // End game button handler
  endGameBtn.addEventListener("click", function () {
    if (confirm("Are you sure you want to end the game?")) {
      socket.emit("endGame", { room });
    }
  });

  function togglePause() {
    if (isPaused) {
      // Resume game
      isPaused = false;
      pauseOverlay.style.display = "none";
      pauseGameBtn.innerText = "Pause";
      pauseGameBtn.classList.remove("bg-green-600", "hover:bg-green-700");
      pauseGameBtn.classList.add("bg-yellow-600", "hover:bg-yellow-700");

      // Calculate paused duration and add to total
      if (pauseStartTime) {
        totalPausedTime += Date.now() - pauseStartTime;
        pauseStartTime = null;
      }

      socket.emit("resumeGame", { room });
    } else {
      // Pause game
      isPaused = true;
      pauseOverlay.style.display = "flex";
      pauseGameBtn.innerText = "Resume";
      pauseGameBtn.classList.remove("bg-yellow-600", "hover:bg-yellow-700");
      pauseGameBtn.classList.add("bg-green-600", "hover:bg-green-700");
      pauseStartTime = Date.now();

      socket.emit("pauseGame", { room });
    }
  }

  // Keyboard shortcut for pause (Space key)
  document.addEventListener("keydown", function (e) {
    if (e.code === "Space" && gameContainer.style.display === "block") {
      e.preventDefault();
      togglePause();
    }
  });

  function animate() {
    // Only send paddle updates if not paused
    if (!isPaused) {
      socket.emit("movePaddle", {
        paddle: paddles.my,
        room: room,
        id: paddles.other.id,
        myId: paddles.my.id,
      });
    }

    // Update PixiJS game objects
    if (pixiGame) {
      // Update my paddle
      pixiGame.updatePaddle(
        playerNumber,
        paddles.my.x,
        paddles.my.y,
        paddles.my.hitEffect
      );

      // Update other paddle
      const otherPlayerNum = playerNumber === 1 ? 2 : 1;
      pixiGame.updatePaddle(
        otherPlayerNum,
        paddles.other.x,
        paddles.other.y,
        paddles.other.hitEffect
      );

      // Update ball
      pixiGame.updateBall(ball.x, ball.y);

      // Update pause state
      pixiGame.setPaused(isPaused);
    }

    // Request the next animation frame
    requestAnimationFrame(animate);
  }

  // Add event listeners for paddle movement
  document.addEventListener("keydown", function (e) {
    if (isPaused) return; // Don't move paddles when paused

    if (e.key === "ArrowUp" && paddles.my.y > 0) {
      paddles.my.y -= 7;
    } else if (
      e.key === "ArrowDown" &&
      paddles.my.y + paddles.my.height < 500
    ) {
      paddles.my.y += 7;
    }
  });

  // Listen for updated paddle positions from the server
  socket.on("updatePaddle", function (data) {
    // Only update paddle position if not paused
    if (!isPaused) {
      paddles.other.y = data.y;
      if (data.hitEffect !== undefined) {
        paddles.other.hitEffect = data.hitEffect;
      }
    }
  });

  // Listen for updated paddles (for hit effects)
  socket.on("updatePaddles", function (data) {
    // Only update paddle effects if not paused
    if (!isPaused) {
      data.forEach((serverPaddle) => {
        if (serverPaddle.id === paddles.my.id) {
          paddles.my.hitEffect = serverPaddle.hitEffect;
        } else if (serverPaddle.id === paddles.other.id) {
          paddles.other.hitEffect = serverPaddle.hitEffect;
        }
      });
    }
  });

  // Listen for updated ball positions from the server
  socket.on("updateBall", function (data) {
    // Only update ball position if not paused
    if (!isPaused) {
      console.log(data);
      ball = data;
    }
  });

  socket.on("update scores", (data) => {
    scores = data;
    scoresElement.innerText = `Player 1: ${scores.player1} | Player 2: ${scores.player2}`;
  });

  socket.on("gameOver", (data) => {
    const { winner, scores } = data;

    // Stop the timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    // Calculate game duration
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);

    // Navigate to results page with game stats
    const params = new URLSearchParams({
      winner: winner,
      p1: scores.player1,
      p2: scores.player2,
      mode: gameMode,
      duration: elapsed,
      player: playerNumber,
    });

    window.location.href = `/results.html?${params.toString()}`;
  });
});
