const { CastleDefenseGame, GAME_WIDTH, GAME_HEIGHT, PLAYER_DOOR, ENEMY_DOORS, START_BUTTON_BOUNDS, HELP_BUTTON_BOUNDS } = globalThis.CastleDefense;

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const game = new CastleDefenseGame();
const hoverPoint = { x: -1, y: -1 };
const assetState = { ready: false, assets: Object.create(null), failed: [] };
const ASSET_PATHS = Object.freeze({
  startScreen: "./assets/screens/start.png",
  helpScreen: "./assets/screens/help.png",
  clearScreen: "./assets/screens/clear.png",
  overScreen: "./assets/screens/over.png",
  gameBase: "./assets/screens/game-base.png",
  startHover: "./assets/sprites/start-hover.png",
  helpHover: "./assets/sprites/help-hover.png",
  cursor: "./assets/sprites/cursor.png",
  friendlyIdle: "./assets/sprites/friendly-idle.png",
  friendlyFly: "./assets/sprites/friendly-fly.png",
  friendlyRun: "./assets/sprites/friendly-run.png",
  enemy: "./assets/sprites/enemy.png",
  shellFlight: "./assets/sprites/shell-flight.png",
  shellExplosion: "./assets/sprites/shell-explosion.png",
  cannonNormal: "./assets/sprites/cannon-normal.png",
  cannonReady: "./assets/sprites/cannon-ready.png",
  door: "./assets/sprites/door.png"
});
const SPRITE_ANCHORS = Object.freeze({
  cursor: Object.freeze({ x: 23, y: 45 }),
  friendlyIdle: Object.freeze({ x: 10, y: 44 }),
  friendlyFly: Object.freeze({ x: 40, y: 34 }),
  friendlyRun: Object.freeze({ x: 24, y: 34 }),
  enemy: Object.freeze({ x: 24, y: 55 }),
  shellFlight: Object.freeze({ x: 70, y: 62 }),
  shellExplosion: Object.freeze({ x: 82, y: 65 }),
  door: Object.freeze({ x: 54, y: 57 })
});
let lastFrame = performance.now();

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => resolve(null), { once: true });
    image.src = src;
  });
}

async function loadAssets() {
  const entries = Object.entries(ASSET_PATHS);
  const results = await Promise.all(entries.map(async ([key, src]) => [key, await loadImage(src), src]));
  for (const [key, image, src] of results) {
    if (image) {
      assetState.assets[key] = image;
      continue;
    }
    assetState.failed.push(src);
  }
  assetState.ready = true;
  render();
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = GAME_WIDTH * ratio;
  canvas.height = GAME_HEIGHT * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function worldPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * (GAME_WIDTH / rect.width), y: (event.clientY - rect.top) * (GAME_HEIGHT / rect.height) };
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function drawImageFull(image) {
  ctx.drawImage(image, 0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawImageTopLeft(image, x, y, width = image.width, height = image.height) {
  ctx.drawImage(image, x, y, width, height);
}

function drawImageAnchored(image, x, y, anchor, width = image.width, height = image.height) {
  drawImageTopLeft(image, x - anchor.x, y - anchor.y, width, height);
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fieldGradient() {
  const gradient = ctx.createRadialGradient(390, 170, 20, 398, 292, 430);
  gradient.addColorStop(0, "#fbfbfb");
  gradient.addColorStop(0.18, "#f9ead1");
  gradient.addColorStop(0.62, "#f6cf96");
  gradient.addColorStop(1, "#f3b85d");
  return gradient;
}

function drawLoadingScreen() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = "#111111";
  ctx.font = '28px "MS PGothic", "Yu Gothic", sans-serif';
  ctx.fillText("SWF 素材を読み込み中...", 250, 290);
}

function drawTitleScreen() {
  const image = assetState.assets.startScreen;
  if (image) {
    drawImageFull(image);
    if (pointInRect(hoverPoint.x, hoverPoint.y, START_BUTTON_BOUNDS) && assetState.assets.startHover) {
      drawImageTopLeft(assetState.assets.startHover, START_BUTTON_BOUNDS.x, START_BUTTON_BOUNDS.y, START_BUTTON_BOUNDS.width, START_BUTTON_BOUNDS.height);
    }
    if (pointInRect(hoverPoint.x, hoverPoint.y, HELP_BUTTON_BOUNDS) && assetState.assets.helpHover) {
      drawImageTopLeft(assetState.assets.helpHover, HELP_BUTTON_BOUNDS.x, HELP_BUTTON_BOUNDS.y, HELP_BUTTON_BOUNDS.width, HELP_BUTTON_BOUNDS.height);
    }
    return;
  }
  drawLoadingScreen();
}

function drawHelpScreen() {
  const image = assetState.assets.helpScreen;
  if (image) {
    drawImageFull(image);
    return;
  }
  drawLoadingScreen();
}

function drawEndScreen() {
  const image = game.phase === "clear" ? assetState.assets.clearScreen : assetState.assets.overScreen;
  if (image) {
    drawImageFull(image);
    return;
  }
  drawLoadingScreen();
}

function drawBackground() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = "#cfcfcf";
  ctx.fillRect(0, 74, 144, GAME_HEIGHT - 74);
  ctx.fillRect(732, 74, 68, GAME_HEIGHT - 74);
  ctx.fillStyle = fieldGradient();
  ctx.fillRect(145, 0, 587, GAME_HEIGHT);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, GAME_WIDTH - 1, GAME_HEIGHT - 1);
  ctx.beginPath();
  ctx.moveTo(72.5, 74);
  ctx.lineTo(72.5, 130);
  ctx.moveTo(72.5, 388);
  ctx.lineTo(72.5, 452);
  ctx.moveTo(145.5, 0);
  ctx.lineTo(145.5, GAME_HEIGHT);
  ctx.moveTo(732.5, 0);
  ctx.lineTo(732.5, GAME_HEIGHT);
  ctx.stroke();
}

function drawHud() {
  if (assetState.assets.gameBase) {
    ctx.drawImage(assetState.assets.gameBase, 0, 0, 306, 74, 0, 0, 306, 74);
    ctx.drawImage(assetState.assets.gameBase, 542, 0, 258, 74, 542, 0, 258, 74);
    return;
  }
  drawRoundedRect(0, 0, 252, 74, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.stroke();
  drawRoundedRect(548, 0, 252, 74, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHudNumbers() {
  drawHud();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(190, 4, 88, 66);
  ctx.fillRect(708, 4, 82, 66);
  ctx.fillStyle = "#ff00ff";
  ctx.font = '60px "Times New Roman", serif';
  ctx.fillText(String(game.cannonTimer).padStart(2, "0"), 6, 502);
  ctx.fillStyle = "#ff0000";
  ctx.font = '60px "Times New Roman", serif';
  ctx.fillText(String(game.playerCastleLife), 200, 55);
  ctx.fillText(String(game.enemyCastleLife), 719, 55);
}

function drawCannon() {
  const image = game.cannonReady ? assetState.assets.cannonReady : assetState.assets.cannonNormal;
  if (!image) {
    return;
  }
  drawImageTopLeft(image, 8, 448, 143, 143);
}

function drawDoor(x, y, side) {
  if (assetState.assets.door) {
    const width = 34;
    const height = 68;
    drawImageAnchored(assetState.assets.door, x, y, { x: SPRITE_ANCHORS.door.x * (width / assetState.assets.door.width), y: SPRITE_ANCHORS.door.y * (height / assetState.assets.door.height) }, width, height);
    return;
  }
  const left = side === "player" ? x - 11 : x - 16;
  const top = y - 24;
  drawRoundedRect(left, top, 24, 44, 10);
  ctx.fillStyle = "#111111";
  ctx.fill();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawFriendly(friendly) {
  if (!friendly.launched) {
    if (assetState.assets.friendlyIdle) {
      drawImageAnchored(assetState.assets.friendlyIdle, friendly.x, friendly.y, SPRITE_ANCHORS.friendlyIdle);
    }
    return;
  }
  if (friendly.variant === "re") {
    if (assetState.assets.friendlyRun) {
      drawImageAnchored(assetState.assets.friendlyRun, friendly.x, friendly.y, SPRITE_ANCHORS.friendlyRun);
    }
    return;
  }
  if (assetState.assets.friendlyFly) {
    drawImageAnchored(assetState.assets.friendlyFly, friendly.x, friendly.y, SPRITE_ANCHORS.friendlyFly);
  }
}

function drawEnemy(enemy) {
  if (assetState.assets.enemy) {
    drawImageAnchored(assetState.assets.enemy, enemy.x, enemy.y, SPRITE_ANCHORS.enemy);
  }
}

function drawShell(shell) {
  if (shell.mode === "explosion") {
    if (!assetState.assets.shellExplosion) {
      return;
    }
    const scale = 0.8 + Math.min(1, shell.ttl / 30) * 0.2;
    const width = assetState.assets.shellExplosion.width * scale;
    const height = assetState.assets.shellExplosion.height * scale;
    const anchor = { x: SPRITE_ANCHORS.shellExplosion.x * scale, y: SPRITE_ANCHORS.shellExplosion.y * scale };
    drawImageAnchored(assetState.assets.shellExplosion, shell.x, shell.y, anchor, width, height);
    return;
  }
  if (assetState.assets.shellFlight) {
    drawImageAnchored(assetState.assets.shellFlight, shell.x, shell.y, SPRITE_ANCHORS.shellFlight);
  }
}

function drawCursor() {
  if (assetState.assets.cursor) {
    drawImageAnchored(assetState.assets.cursor, game.cursor.x, game.cursor.y, SPRITE_ANCHORS.cursor);
  }
}

function drawGameScene() {
  drawBackground();
  drawDoor(PLAYER_DOOR.x, PLAYER_DOOR.y, "player");
  for (const door of ENEMY_DOORS) {
    drawDoor(door.x, door.y, "enemy");
  }
  drawCannon();
  drawHudNumbers();
  for (const friendly of game.friendlies) {
    drawFriendly(friendly);
  }
  for (const enemy of game.enemies) {
    drawEnemy(enemy);
  }
  for (const shell of game.shells) {
    drawShell(shell);
  }
  drawCursor();
}

function render() {
  if (!assetState.ready) {
    drawLoadingScreen();
    return;
  }
  if (game.phase === "game") {
    drawGameScene();
  } else if (game.phase === "start") {
    drawTitleScreen();
  } else if (game.phase === "setumei") {
    drawHelpScreen();
  } else {
    drawEndScreen();
  }
}

function frame(now) {
  const delta = (now - lastFrame) / 1000;
  lastFrame = now;
  game.tick(delta);
  render();
  requestAnimationFrame(frame);
}

canvas.addEventListener("pointermove", (event) => {
  const point = worldPoint(event);
  hoverPoint.x = point.x;
  hoverPoint.y = point.y;
  game.movePointer(point.x, point.y);
  render();
});

canvas.addEventListener("pointerleave", () => {
  hoverPoint.x = -1;
  hoverPoint.y = -1;
  render();
});

canvas.addEventListener("pointerdown", (event) => {
  const point = worldPoint(event);
  hoverPoint.x = point.x;
  hoverPoint.y = point.y;
  game.movePointer(point.x, point.y);
  game.click(point.x, point.y);
  render();
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
render();
loadAssets();
requestAnimationFrame(frame);
