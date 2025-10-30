export interface Player {
  playerId: string;
}

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  speedX: number;
  speedY: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

export interface Scores {
  player1: number;
  player2: number;
}

export interface Players {
  player1: Player;
  player2: Player;
}

export type GameMode = "score" | "time";

export interface Game {
  roomId: string;
  players: Players;
  ball: Ball;
  scores: Scores;
  paddles: Paddle[];
  gameMode: GameMode;
  gameDuration: number;
  ballSpeed: number;
  frameRate: number;
  startTime: number | null;
}

export interface PrivateGame {
  roomId: string;
  host: Player;
  guest: Player | null;
  started: boolean;
  gameMode: GameMode;
  gameDuration: number;
  ballSpeed: number;
  frameRate: number;
}

export interface GameSettings {
  gameMode: GameMode;
  gameDuration: number;
  ballSpeed: number;
  frameRate: number;
}

export interface MovePaddleData {
  paddle: Paddle;
  room: string;
  id: string;
  myId: string;
}

export interface EndGameData {
  room: string;
}

export interface GameOverData {
  winner: number;
  scores: Scores;
}

export interface GameStartData {
  gameMode: GameMode;
  gameDuration: number;
  ballSpeed: number;
  frameRate: number;
}

export interface WaitingForPlayerData {
  inviteCode: string | null;
}

export interface IdData {
  id: string;
  num: number;
}
