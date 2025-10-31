// PixiJS Game Renderer - GPU Accelerated
class PixiPongGame {
  constructor(containerElement) {
    this.container = containerElement;
    this.app = null;
    this.graphics = {
      paddle1: null,
      paddle2: null,
      ball: null,
      pausedText: null,
      pausedOverlay: null,
    };
    this.isPaused = false;
    
    this.init();
  }

  init() {
    // Create PixiJS Application with WebGL renderer
    this.app = new PIXI.Application({
      width: 900,
      height: 500,
      backgroundColor: 0xe0aaff,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Add canvas to container
    this.container.appendChild(this.app.view);

    // Create game objects
    this.createPaddles();
    this.createBall();
    this.createPauseOverlay();

    console.log("PixiJS initialized with WebGL renderer");
  }

  createPaddles() {
    // Paddle 1 (left)
    this.graphics.paddle1 = new PIXI.Graphics();
    this.graphics.paddle1.beginFill(0x000000);
    this.graphics.paddle1.drawRect(0, 0, 15, 100);
    this.graphics.paddle1.endFill();
    this.graphics.paddle1.x = 20;
    this.graphics.paddle1.y = 200;
    this.app.stage.addChild(this.graphics.paddle1);

    // Paddle 2 (right)
    this.graphics.paddle2 = new PIXI.Graphics();
    this.graphics.paddle2.beginFill(0x000000);
    this.graphics.paddle2.drawRect(0, 0, 15, 100);
    this.graphics.paddle2.endFill();
    this.graphics.paddle2.x = 865;
    this.graphics.paddle2.y = 200;
    this.app.stage.addChild(this.graphics.paddle2);
  }

  createBall() {
    this.graphics.ball = new PIXI.Graphics();
    this.graphics.ball.beginFill(0xFF4444);
    this.graphics.ball.drawCircle(0, 0, 7);
    this.graphics.ball.endFill();
    this.graphics.ball.x = 450;
    this.graphics.ball.y = 250;
    this.app.stage.addChild(this.graphics.ball);
  }

  createPauseOverlay() {
    // Semi-transparent overlay
    this.graphics.pausedOverlay = new PIXI.Graphics();
    this.graphics.pausedOverlay.beginFill(0x000000, 0.5);
    this.graphics.pausedOverlay.drawRect(0, 0, 900, 500);
    this.graphics.pausedOverlay.endFill();
    this.graphics.pausedOverlay.visible = false;
    this.app.stage.addChild(this.graphics.pausedOverlay);

    // Paused text
    this.graphics.pausedText = new PIXI.Text('PAUSED', {
      fontFamily: 'Press Start 2P, monospace',
      fontSize: 48,
      fill: 0xFFD700,
      align: 'center',
    });
    this.graphics.pausedText.anchor.set(0.5);
    this.graphics.pausedText.x = 450;
    this.graphics.pausedText.y = 250;
    this.graphics.pausedText.visible = false;
    this.app.stage.addChild(this.graphics.pausedText);
  }

  updatePaddle(paddleNum, x, y, hitEffect = false) {
    const paddle = paddleNum === 1 ? this.graphics.paddle1 : this.graphics.paddle2;
    paddle.x = x;
    paddle.y = y;
    
    // Update color for hit effect
    paddle.clear();
    paddle.beginFill(hitEffect ? 0xFFD700 : 0x000000);
    paddle.drawRect(0, 0, 15, 100);
    paddle.endFill();
  }

  updateBall(x, y) {
    this.graphics.ball.x = x;
    this.graphics.ball.y = y;
  }

  setPaused(paused) {
    this.isPaused = paused;
    this.graphics.pausedOverlay.visible = paused;
    this.graphics.pausedText.visible = paused;
  }

  destroy() {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true, baseTexture: true });
    }
  }

  // Get the PixiJS ticker for custom animations
  getTicker() {
    return this.app.ticker;
  }

  // Resize handler
  resize(width, height) {
    this.app.renderer.resize(width, height);
  }
}

// Export for use in main.js
window.PixiPongGame = PixiPongGame;
