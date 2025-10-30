"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
document.addEventListener("DOMContentLoaded", function () {
    const socket = io();
    let socketId;
    let room;
    let playerNumber;
    let gamePlay = {};
    let scores = { player1: 0, player2: 0 };
    // UI Elements
    const lobbyScreen = document.getElementById("lobbyScreen");
    const gameSettingsScreen = document.getElementById("gameSettingsScreen");
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
    const startGameBtn = document.getElementById("startGameBtn");
    const backToLobbyBtn = document.getElementById("backToLobbyBtn");
    const gameDurationInput = document.getElementById("gameDuration");
    const timeSettings = document.getElementById("timeSettings");
    const ballSpeedInput = document.getElementById("ballSpeed");
    const ballSpeedValue = document.getElementById("ballSpeedValue");
    const frameRateSelect = document.getElementById("frameRate");
    let gameMode = "score";
    let gameDuration = 60;
    let ballSpeed = 2;
    let frameRate = 35;
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
        other: { x: 0, y: 0, width: 10, height: 60, id: "" },
        my: { x: 790, y: 0, width: 10, height: 60, id: "" },
    };
    let ball = {
        x: 250,
        y: 150,
        radius: 5,
        speedX: 2,
        speedY: 2,
        dx: 2,
        dy: 2,
    };
    let gameStartTime = null;
    let timerInterval = null;
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
        }
        else {
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
    document
        .querySelectorAll('input[name="gameMode"]')
        .forEach((radio) => {
        radio.addEventListener("change", function () {
            gameMode = this.value;
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
    socket.on("id", function (data) {
        socketId = data.id;
        playerNumber = data.num;
        console.log(`Your socket ID is: ${socketId} and you are Player number ${playerNumber}`);
    });
    socket.on("waitingForPlayer", function (data) {
        if (data.inviteCode) {
            inviteCodeSpan.innerText = data.inviteCode;
            showWaitingScreen(true);
        }
        else {
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
            paddles.my = game.paddles.find((paddle) => paddle.id === socketId);
            paddles.other = game.paddles.find((paddle) => paddle.id !== socketId);
        }, 1000);
    });
    socket.on("gameStart", function (data) {
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
        }
        else {
            timerInterval = setInterval(updateTimer, 1000);
        }
        animate();
    });
    function updateTimer() {
        if (!gameStartTime)
            return;
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timerElement.innerText = `Time: ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    function updateCountdown() {
        if (!gameStartTime)
            return;
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        const remaining = Math.max(0, gameDuration - elapsed);
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        timerElement.innerText = `Time: ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
    function animate() {
        socket.emit("movePaddle", {
            paddle: paddles.my,
            room: room,
            id: paddles.other.id,
            myId: paddles.my.id,
        });
        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            alert("Error: Unable to initialize canvas. Your browser may not support the HTML5 canvas element.");
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw paddles
        ctx.fillStyle = "#000";
        ctx.fillRect(paddles.my.x, paddles.my.y, paddles.my.width, paddles.my.height);
        ctx.fillRect(paddles.other.x, paddles.other.y, paddles.other.width, paddles.other.height);
        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.closePath();
        requestAnimationFrame(animate);
    }
    // Add event listeners for paddle movement
    document.addEventListener("keydown", function (e) {
        if (e.key === "ArrowUp" && paddles.my.y > 0) {
            paddles.my.y -= 5;
        }
        else if (e.key === "ArrowDown" &&
            paddles.my.y + paddles.my.height < 300) {
            paddles.my.y += 5;
        }
    });
    socket.on("updatePaddle", function (data) {
        paddles.other.y = data.y;
    });
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
