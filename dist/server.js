"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server);
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
app.get("/", (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/index.html"));
});
let waitingPlayers = [];
let games = [];
const privateGames = {};
const gameLoopIntervals = {};
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
    socket.on("createPrivateGame", (settings) => {
        const inviteCode = generateInviteCode();
        const roomId = generateRoomId();
        privateGames[inviteCode] = {
            roomId,
            host: { playerId: socket.id },
            guest: null,
            started: false,
            gameMode: settings.gameMode || "score",
            gameDuration: settings.gameDuration || 60,
            ballSpeed: settings.ballSpeed || 2,
            frameRate: settings.frameRate || 35,
        };
        socket.join(roomId);
        socket.emit("waitingForPlayer", { inviteCode });
        console.log(`Private game created with code: ${inviteCode} (${settings.gameMode} mode, speed: ${settings.ballSpeed}, fps: ${settings.frameRate})`);
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
        const game = await generateGame(privateGame.roomId, privateGame.host, privateGame.guest, privateGame.gameMode, privateGame.gameDuration, privateGame.ballSpeed, privateGame.frameRate);
        if (game) {
            privateGame.started = true;
            startGame(game);
            delete privateGames[inviteCode];
        }
    });
    // Cancel waiting
    socket.on("cancelWaiting", () => {
        // Remove from quick match queue
        waitingPlayers = waitingPlayers.filter((player) => player.playerId !== socket.id);
        // Remove from private games
        for (const code in privateGames) {
            if (privateGames[code].host.playerId === socket.id) {
                delete privateGames[code];
                break;
            }
        }
    });
    // Update the player position
    socket.on("movePaddle", (data) => {
        games.forEach((game) => {
            if (game.roomId === data.room) {
                const index = game.paddles.findIndex((idx) => idx.id === data.myId);
                if (index !== -1) {
                    game.paddles[index] = data.paddle;
                    io.to(data.id).emit("updatePaddle", data.paddle);
                }
            }
        });
    });
    // Handle end game request
    socket.on("endGame", (data) => {
        const gameIndex = games.findIndex((g) => g.roomId === data.room);
        if (gameIndex !== -1) {
            const game = games[gameIndex];
            const { scores, players } = game;
            const winner = scores.player1 > scores.player2
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
        handlePlayerDisconnect(socket.id);
    });
});
function generateRoomId() {
    const length = 6;
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
function generateInviteCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    do {
        code = "";
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
    } while (privateGames[code]);
    return code;
}
async function generateGame(roomId, player1, player2, gameMode, gameDuration, ballSpeed, frameRate) {
    const speed = ballSpeed || 2;
    const game = {
        roomId,
        players: { player1, player2 },
        ball: {
            x: 250,
            y: 150,
            dx: speed,
            dy: speed,
            radius: 5,
            speedX: speed,
            speedY: speed,
        },
        scores: { player1: 0, player2: 0 },
        paddles: [
            { x: 0, y: 150, width: 15, height: 100, id: player1.playerId },
            { x: 485, y: 150, width: 15, height: 100, id: player2.playerId },
        ],
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
    waitingPlayers = waitingPlayers.filter((player) => player.playerId !== disconnectedSocketId);
    // Remove the player from active games and notify the other player
    games.forEach((game) => {
        const disconnectedPlayer = game.players.player1.playerId === disconnectedSocketId ||
            game.players.player2.playerId === disconnectedSocketId;
        if (disconnectedPlayer) {
            const otherPlayerId = game.players.player1.playerId !== disconnectedSocketId
                ? game.players.player1.playerId
                : game.players.player2.playerId;
            io.to(otherPlayerId).emit("opponentDisconnected");
            clearInterval(gameLoopIntervals[game.roomId]);
            delete gameLoopIntervals[game.roomId];
            games = games.filter((g) => g !== game);
        }
    });
}
function startGameLoop(game) {
    const fps = game.frameRate || 35;
    if (gameLoopIntervals[game.roomId]) {
        clearInterval(gameLoopIntervals[game.roomId]);
    }
    gameLoopIntervals[game.roomId] = setInterval(() => {
        const gameIndex = games.findIndex((g) => g.roomId === game.roomId);
        if (gameIndex === -1) {
            clearInterval(gameLoopIntervals[game.roomId]);
            delete gameLoopIntervals[game.roomId];
            return;
        }
        const currentGame = games[gameIndex];
        const { ball, roomId, paddles, scores, players, gameMode, gameDuration, startTime, } = currentGame;
        // Check if time-based game has ended
        if (gameMode === "time" && startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            if (elapsed >= gameDuration) {
                const winner = scores.player1 > scores.player2
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
            }
            else {
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
            if (gameMode === "score" &&
                (scores.player1 >= 10 || scores.player2 >= 10)) {
                const winner = scores.player1 >= 10 ? 1 : 2;
                io.to(players.player1.playerId).emit("gameOver", { winner, scores });
                io.to(players.player2.playerId).emit("gameOver", { winner, scores });
                clearInterval(gameLoopIntervals[roomId]);
                delete gameLoopIntervals[roomId];
                games.splice(gameIndex, 1);
                return;
            }
        }
        // Check for collision with paddles
        paddles.forEach((paddle) => {
            if (ball.x >= paddle.x &&
                ball.x <= paddle.x + paddle.width &&
                ball.y >= paddle.y &&
                ball.y <= paddle.y + paddle.height) {
                ball.speedX *= -1;
                io.to(roomId).emit("paddle hit", paddle.id);
            }
        });
        io.to(players.player1.playerId).emit("updateBall", ball);
        io.to(players.player2.playerId).emit("updateBall", ball);
    }, 1000 / fps);
}
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
