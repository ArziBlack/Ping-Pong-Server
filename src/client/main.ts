import type {
  Game,
  Paddle,
  Ball,
  Scores,
  GameMode,
  GameStartData,
  WaitingForPlayerData,
  IdData,
  GameOverData,
} from "../types";

// Socket.IO client is loaded via CDN in the HTML
interface Socket {
  emit(event: string, ...args: any[]): void;
  on(event: string, callback: (...args: any[]) => void): void;
  id: string;
}

declare const io: () => Socket;

interface PaddleState {
  other: Paddle;
  my: Paddle;
}

document.addEventListener("DOMContentLoaded", function () {
  const socket: Socket = io();

  let socketId: string;
  let room: string;
  let playerNumber: number;
  let gamePlay: Partial<Game> = {};
  let scores: Scores = { player1: 0, player2: 0 };

  // UI Elements
  const lobbyScreen = document.getElementById("lobbyScreen") as HTMLDivElement;
  const gameSettingsScreen = document.getElementById(
    "gameSettingsScreen"
  ) as HTMLDivElement;
  const waitingScreen = document.getElementById(
    "waitingScreen"
  ) as HTMLDivElement;
  const scoresElement = document.getElementById("scores") as HTMLDivElement;
  const gameContainer = document.getElementById(
    "gameContainer"
  ) as HTMLDivElement;
  const timerElement = document.getElementById("timer") as HTMLDivElement;
  const endGameBtn = document.getElementById("endGameBtn") as HTMLButtonElement;
  const quickMatchBtn = document.getElementById(
    "quickMatchBtn"
  ) as HTMLButtonElement;
  const createGameBtn = document.getElementById(
    "createGameBtn"
  ) as HTMLButtonElement;
  const joinGameBtn = document.getElementById(
    "joinGameBtn"
  ) as HTMLButtonElement;
  const inviteCodeInput = document.getElementById(
    "inviteCodeInput"
  ) as HTMLInputElement;
  const inviteCodeDisplay = document.getElementById(
    "inviteCodeDisplay"
  ) as HTMLDivElement;
  const inviteCodeSpan = document.getElementById(
    "inviteCode"
  ) as HTMLSpanElement;
  const cancelWaitBtn = document.getElementById(
    "cancelWaitBtn"
  ) as HTMLButtonElement;
  const startGameBtn = document.getElementById(
    "startGameBtn"
  ) as HTMLButtonElement;
  const backToLobbyBtn = document.getElementById(
    "backToLobbyBtn"
  ) as HTMLButtonElement;
  const gameDurationInput = document.getElementById(
    "gameDuration"
  ) as HTMLInputElement;
  const timeSettings = document.getElementById(
    "timeSettings"
  ) as HTMLDivElement;
  const ballSpeedInput = document.getElementById(
    "ballSpeed"
  ) as HTMLInputElement;
  const ballSpeedValue = document.getElementById(
    "ballSpeedValue"
  ) as HTMLSpanElement;
  const frameRateSelect = document.getElementById(
    "frameRate"
  ) as HTMLSelectElement;

  let gameMode: GameMode = "score";
  let gameDuration: number = 60;
  let ballSpeed: number = 2;
  let frameRate: number = 35;
  let countdownInterval: NodeJS.Timeout | null = null;

  // Ball speed slider handler
  ballSpeedInput.addEventListener("input", function (this: HTMLInputElement) {
    ballSpeed = parseInt(this.value);
    const speedLabels = ["Very Slow", "Slow", "Normal", "Fast", "Very Fast"];
    ballSpeedValue.innerText = speedLabels[ballSpeed - 1];
  });

  // Frame rate selector handler
  frameRateSelect.addEventListener("change", function (this: HTMLSelectElement) {
    frameRate = parseInt(this.value);
  });

  let paddles: PaddleState = {
    other: { x: 0, y: 0, width: 10, height: 60, id: "" },
    my: { x: 790, y: 0, width: 10, height: 60, id: "" },
  };
  let ball: Ball = {
    x: 250,
    y: 150,
    radius: 5,
    speedX: 2,
    speedY: 2,
    dx: 2,
    dy: 2,
  };
  let gameStartTime: number | null = null;
  let timerInterval: NodeJS.Timeout | null = null;

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

  function showLobbyScreen(): void {
    lobbyScreen.style.display = "flex";
    gameSettingsScreen.style.display = "none";
    waitingScreen.style.display = "none";
    gameContainer.style.display = "none";
    scoresElement.style.display = "none";
    timerElement.style.display = "none";
    endGameBtn.style.display = "none";
  }

  function showGameSettingsScreen(): void {
    lobbyScreen.style.display = "none";
    gameSettingsScreen.style.display = "flex";
  }

  function showWaitingScreen(showInviteCode: boolean): void {
    lobbyScreen.style.display = "none";
    gameSettingsScreen.style.display = "none";
    waitingScreen.style.display = "block";
    inviteCodeDisplay.style.display = showInviteCode ? "block" : "none";
  }

  // Game mode radio button handler
  document
    .querySelectorAll<HTMLInputElement>('input[name="gameMode"]')
    .forEach((radio: HTMLInputElement) => {
      radio.addEventListener("change", function (this: HTMLInputElement) {
        gameMode = this.value as GameMode;
        timeSettings.style.display = gameMode === "time" ? "flex" : "none";
      });
    });

  // Start game button handler
  startGameBtn.addEventListener("click", function () {
    if (gameMode === "time") {
      gameDuration = parseInt(gameDurationInput.value) * 60;
    }
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

  socket.on("id", function (data: IdData) {
    socketId = data.id;
    playerNumber = data.num;
    console.log(
      `Your socket ID is: ${socketId} and you are Player number ${playerNumber}`
    );
  });

  socket.on("waitingForPlayer", function (data: WaitingForPlayerData) {
    if (data.inviteCode) {
      inviteCodeSpan.innerText = data.inviteCode;
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

  socket.on("game", function (game: Game) {
    setTimeout(async () => {
      gamePlay = game;
      room = game.roomId;
      console.log(game);
      paddles.my = game.paddles.find((paddle) => paddle.id === socketId)!;
      paddles.other = game.paddles.find((paddle) => paddle.id !== socketId)!;
    }, 1000);
  });

  socket.on("gameStart", function (data: GameStartData) {
    gameMode = data.gameMode;
    gameDuration = data.gameDuration;
    ballSpeed = data.ballSpeed || 2;
    frameRate = data.frameRate || 35;

    // Hide lobby/waiting and show game
    lobbyScreen.style.display = "none";
    gameSettingsScreen.style.display = "none";
    waitingScreen.style.display = "none";
    gameContainer.style.display = "block";
    scoresElement.style.display = "block";
    timerElement.style.display = "block";
    endGameBtn.style.display = "block";

    // Start the timer
    gameStartTime = Date.now();

    if (gameMode === "time") {
      countdownInterval = setInterval(updateCountdown, 1000);
    } else {
      timerInterval = setInterval(updateTimer, 1000);
    }

    animate();
  });

  function updateTimer(): void {
    if (!gameStartTime) return;
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    timerElement.innerText = `Time: ${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  function updateCountdown(): void {
    if (!gameStartTime) return;
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const remaining = Math.max(0, gameDuration - elapsed);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timerElement.innerText = `Time: ${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;

    if (remaining <= 0 && countdownInterval) {
      clearInterval(countdownInterval);
    }
  }

  // End game button handler
  endGameBtn.addEventListener("click", function () {
    if (confirm("Are you sure you want to end the game?")) {
      socket.emit("endGame", { room });
    }
  });

  function animate(): void {
    socket.emit("movePaddle", {
      paddle: paddles.my,
      room: room,
      id: paddles.other.id,
      myId: paddles.my.id,
    });

    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
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

    requestAnimationFrame(animate);
  }

  // Add event listeners for paddle movement
  document.addEventListener("keydown", function (e: KeyboardEvent) {
    if (e.key === "ArrowUp" && paddles.my.y > 0) {
      paddles.my.y -= 5;
    } else if (
      e.key === "ArrowDown" &&
      paddles.my.y + paddles.my.height < 300
    ) {
      paddles.my.y += 5;
    }
  });

  socket.on("updatePaddle", function (data: Paddle) {
    paddles.other.y = data.y;
  });

  socket.on("updateBall", function (data: Ball) {
    console.log(data);
    ball = data;
  });

  socket.on("update scores", (data: Scores) => {
    scores = data;
    scoresElement.innerText = `Player 1: ${scores.player1} | Player 2: ${scores.player2}`;
  });

  socket.on("gameOver", (data: GameOverData) => {
    const { winner, scores } = data;

    if (timerInterval) {
      clearInterval(timerInterval);
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    const elapsed = gameStartTime
      ? Math.floor((Date.now() - gameStartTime) / 1000)
      : 0;

    const params = new URLSearchParams({
      winner: winner.toString(),
      p1: scores.player1.toString(),
      p2: scores.player2.toString(),
      mode: gameMode,
      duration: elapsed.toString(),
      player: playerNumber.toString(),
    });

    window.location.href = `/results.html?${params.toString()}`;
  });
});
