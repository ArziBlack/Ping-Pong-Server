document.addEventListener("DOMContentLoaded", function () {
  // Get game results from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const winner = parseInt(urlParams.get("winner") || "0");
  const player1Score = parseInt(urlParams.get("p1") || "0");
  const player2Score = parseInt(urlParams.get("p2") || "0");
  const gameMode = urlParams.get("mode") || "score";
  const duration = parseInt(urlParams.get("duration") || "0");
  const playerNumber = parseInt(urlParams.get("player") || "0");

  // Update winner message
  const winnerMessage = document.getElementById("winnerMessage") as HTMLDivElement;
  const resultTitle = document.getElementById("resultTitle") as HTMLHeadingElement;

  if (winner === 0) {
    winnerMessage.innerText = "It's a Tie!";
    winnerMessage.className = "text-3xl text-shadow mb-5 text-yellow-400";
    resultTitle.innerText = "Game Over - Tie!";
  } else if (winner === playerNumber) {
    winnerMessage.innerText = "You Win!";
    winnerMessage.className = "text-3xl text-shadow mb-5 text-green-400";
    resultTitle.innerText = "Victory!";
  } else {
    winnerMessage.innerText = "You Lose!";
    winnerMessage.className = "text-3xl text-shadow mb-5 text-red-400";
    resultTitle.innerText = "Defeat!";
  }

  // Update scores
  const player1ScoreElement = document.getElementById("player1Score") as HTMLSpanElement;
  const player2ScoreElement = document.getElementById("player2Score") as HTMLSpanElement;
  player1ScoreElement.innerText = player1Score.toString();
  player2ScoreElement.innerText = player2Score.toString();

  // Update game mode
  const gameModeText = gameMode === "time" ? "Time Mode" : "Score Mode";
  const gameModeElement = document.getElementById("gameMode") as HTMLSpanElement;
  gameModeElement.innerText = gameModeText;

  // Update game duration
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const gameDurationElement = document.getElementById("gameDuration") as HTMLSpanElement;
  gameDurationElement.innerText = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;

  // Update total points
  const totalPoints = player1Score + player2Score;
  const totalPointsElement = document.getElementById("totalPoints") as HTMLSpanElement;
  totalPointsElement.innerText = totalPoints.toString();
});
