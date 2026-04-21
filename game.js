(function (globalScope, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  globalScope.CastleDefense = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 600;
  const FIXED_STEP_SECONDS = 1 / 12;
  const PLAYER_MIN_X = 160;
  const PLAYER_MAX_X = 650;
  const PLAYER_MIN_Y = 100;
  const PLAYER_MAX_Y = 560;
  const FIELD_BOUNDS = Object.freeze({ x: PLAYER_MIN_X, y: PLAYER_MIN_Y, width: PLAYER_MAX_X - PLAYER_MIN_X, height: PLAYER_MAX_Y - PLAYER_MIN_Y });
  const CASTLE_AREA_BOUNDS = Object.freeze({ x: 21.5, y: 70.5, width: 121, height: 543 });
  const ENEMY_CASTLE_BOUNDS = Object.freeze({ x: 732.8, y: 68.9, width: 56.3, height: 561.9 });
  const PLAYER_DOOR = Object.freeze({ x: 79.5, y: 325.0 });
  const ENEMY_DOORS = Object.freeze([{ x: 767.0, y: 200.0 }, { x: 766.0, y: 350.0 }, { x: 767.0, y: 500.0 }]);
  const CURSOR_START = Object.freeze({ x: 278.35, y: 323.35 });
  const CANNON_BOUNDS = Object.freeze({ x: 18, y: 446, width: 146, height: 142 });
  const START_BUTTON_BOUNDS = Object.freeze({ x: 414, y: 356, width: 340, height: 94 });
  const HELP_BUTTON_BOUNDS = Object.freeze({ x: 408, y: 479, width: 352, height: 97 });
  const BACK_BUTTON_BOUNDS = Object.freeze({ x: 406, y: 493, width: 359, height: 86 });
  const CLEAR_RESTART_BUTTON_BOUNDS = Object.freeze({ x: 458, y: 485, width: 318, height: 82 });
  const OVER_RESTART_BUTTON_BOUNDS = Object.freeze({ x: 379, y: 489, width: 388, height: 80 });
  const MAX_FRIENDLIES = 5;
  const MIN_ENEMY_SLOT = 10;
  const MAX_ENEMY_SLOT = 17;
  const FRIENDLY_PUSH_DISTANCE = 20;
  const FRIENDLY_LAUNCH_SPEED = 20;
  const ENEMY_SPEED = 5;
  const SHELL_SPEED_X = 15;
  const SHELL_SPEED_Y = -8;
  const SHELL_EXPLOSION_TICKS = 30;
  const FRIENDLY_HITBOX = Object.freeze({ width: 46, height: 44 });
  const ENEMY_HITBOX = Object.freeze({ width: 44, height: 58 });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  function overlapsBox(aX, aY, aBounds, bX, bY, bBounds) {
    return Math.abs(aX - bX) * 2 <= aBounds.width + bBounds.width && Math.abs(aY - bY) * 2 <= aBounds.height + bBounds.height;
  }

  function nextId(game) {
    game.nextId += 1;
    return game.nextId;
  }

  function findFreeFriendlySlot(friendlies) {
    for (let slot = 0; slot < MAX_FRIENDLIES; slot += 1) {
      if (!friendlies.some((friendly) => friendly.slot === slot)) {
        return slot;
      }
    }
    return -1;
  }

  function findFreeEnemySlot(enemies) {
    for (let slot = MIN_ENEMY_SLOT; slot <= MAX_ENEMY_SLOT; slot += 1) {
      if (!enemies.some((enemy) => enemy.slot === slot)) {
        return slot;
      }
    }
    return -1;
  }

  function createFriendly(game, slot) {
    return { id: nextId(game), slot, x: PLAYER_DOOR.x, y: PLAYER_DOOR.y, ready: false, launched: false, variant: "follow" };
  }

  function createEnemy(game, slot, door) {
    return { id: nextId(game), slot, x: door.x, y: door.y };
  }

  function updateIdleFriendly(friendly, cursor, random) {
    const place = Math.trunc(random() * 5) - 5;
    friendly.x -= place;
    friendly.y -= place;
    if (friendly.x > cursor.x) {
      friendly.x -= 20;
    }
    if (friendly.y > cursor.y) {
      friendly.y -= 20;
    }
    if (friendly.x < cursor.x) {
      friendly.x += 10;
    }
    if (friendly.y < cursor.y) {
      friendly.y += 10;
    }
    friendly.ready = friendly.x >= cursor.x - 30;
  }

  function updateLaunchedFriendly(friendly, orderedEnemies) {
    friendly.x += FRIENDLY_LAUNCH_SPEED;
    const hitEnemy = orderedEnemies.find((enemy) => overlapsBox(friendly.x, friendly.y, FRIENDLY_HITBOX, enemy.x, enemy.y, ENEMY_HITBOX));
    if (hitEnemy) {
      hitEnemy.x += FRIENDLY_PUSH_DISTANCE;
    }
    return friendly.x < GAME_WIDTH;
  }

  function updateEnemy(game, enemy) {
    enemy.x -= ENEMY_SPEED;
    if (pointInRect(enemy.x, enemy.y, CASTLE_AREA_BOUNDS)) {
      game.playerCastleLife = Math.max(0, game.playerCastleLife - 1);
      return false;
    }
    return enemy.x < GAME_WIDTH;
  }

  function updateFlyingShell(game, shell) {
    shell.x += SHELL_SPEED_X;
    shell.y += SHELL_SPEED_Y;
    if (pointInRect(shell.x, shell.y, ENEMY_CASTLE_BOUNDS)) {
      game.enemyCastleLife = Math.max(0, game.enemyCastleLife - 1);
      shell.mode = "explosion";
      shell.ttl = SHELL_EXPLOSION_TICKS;
      if (shell.x < ENEMY_CASTLE_BOUNDS.x) {
        shell.x = ENEMY_CASTLE_BOUNDS.x;
      }
      return true;
    }
    return shell.x <= GAME_WIDTH + 40 && shell.y >= -80;
  }

  function updateExplosionShell(shell) {
    shell.ttl = Math.max(0, shell.ttl - 1);
    return shell.ttl > 0;
  }

  class CastleDefenseGame {
    constructor({ random = Math.random } = {}) {
      this.random = random;
      this.reset();
    }

    reset() {
      this.nextId = 0;
      this.pointerX = CURSOR_START.x;
      this.pointerY = CURSOR_START.y;
      this.phase = "start";
      this.resetBattlefield();
    }

    resetBattlefield() {
      this.elapsed = 0;
      this.stepAccumulator = 0;
      this.playerCastleLife = 3;
      this.enemyCastleLife = 3;
      this.enemySpawnCounter = 0;
      this.cannonTimer = 10;
      this.cannonCount = 0;
      this.cannonQueued = false;
      this.cursor = { x: CURSOR_START.x, y: CURSOR_START.y };
      this.friendlies = [];
      this.enemies = [];
      this.shells = [];
    }

    startGame() {
      this.resetBattlefield();
      this.phase = "game";
      this.syncCursor();
    }

    movePointer(x, y) {
      this.pointerX = x;
      this.pointerY = y;
      if (this.phase === "game") {
        this.syncCursor();
      }
    }

    syncCursor() {
      this.cursor.x = clamp(this.pointerX, PLAYER_MIN_X, PLAYER_MAX_X);
      this.cursor.y = clamp(this.pointerY, PLAYER_MIN_Y, PLAYER_MAX_Y);
    }

    click(x, y) {
      if (this.phase !== "game") {
        return this.handleScreenClick(x, y);
      }
      return this.handleBattlefieldClick(x, y);
    }

    handleScreenClick(x, y) {
      if (this.phase === "start") {
        if (pointInRect(x, y, START_BUTTON_BOUNDS)) {
          this.startGame();
          return { action: "start" };
        }
        if (pointInRect(x, y, HELP_BUTTON_BOUNDS)) {
          this.phase = "setumei";
          return { action: "help" };
        }
        return { action: "none" };
      }
      if (this.phase === "setumei") {
        if (pointInRect(x, y, BACK_BUTTON_BOUNDS)) {
          this.phase = "start";
          return { action: "back" };
        }
        return { action: "none" };
      }
      if (this.phase === "clear" || this.phase === "over") {
        const restartBounds = this.phase === "clear" ? CLEAR_RESTART_BUTTON_BOUNDS : OVER_RESTART_BUTTON_BOUNDS;
        if (pointInRect(x, y, restartBounds)) {
          this.reset();
          return { action: "restart" };
        }
        return { action: "none" };
      }
      return { action: "none" };
    }

    handleBattlefieldClick(x, y) {
      if (pointInRect(x, y, CANNON_BOUNDS)) {
        if (!this.cannonReady) {
          return { action: "none" };
        }
        this.cannonQueued = true;
        return { action: "cannon" };
      }
      if (!pointInRect(x, y, FIELD_BOUNDS)) {
        return { action: "none" };
      }
      const launched = this.launchReadyFriendly();
      return launched ? { action: "mob", slot: launched.slot } : { action: "none" };
    }

    launchReadyFriendly() {
      const readyFriendlies = this.friendlies.filter((friendly) => !friendly.launched && friendly.ready).sort((left, right) => left.slot - right.slot);
      const target = readyFriendlies[0];
      if (!target) {
        return null;
      }
      target.launched = true;
      target.ready = false;
      target.variant = this.random() < 0.75 ? "fly" : "re";
      return target;
    }

    tick(dt) {
      if (this.phase !== "game") {
        return;
      }
      this.stepAccumulator += clamp(dt, 0, 0.25);
      while (this.stepAccumulator >= FIXED_STEP_SECONDS) {
        this.stepAccumulator -= FIXED_STEP_SECONDS;
        this.stepFrame();
      }
    }

    stepFrame() {
      this.elapsed += FIXED_STEP_SECONDS;
      this.syncCursor();
      this.updateCannon();
      this.spawnFriendly();
      this.updateFriendlies();
      this.spawnEnemy();
      this.updateEnemies();
      this.updateShells();
      this.resolvePhase();
    }

    updateCannon() {
      this.cannonCount += 1;
      if (this.cannonCount > 12) {
        this.cannonTimer = Math.max(0, this.cannonTimer - 1);
        this.cannonCount = 0;
      }
      if (this.cannonTimer === 0) {
        this.cannonCount = 0;
      } else {
        this.cannonQueued = false;
      }
      if (this.cannonTimer === 0 && this.cannonQueued) {
        this.fireShell();
      }
    }

    fireShell() {
      this.shells = [{ id: nextId(this), x: 100, y: 500, mode: "flight", ttl: 0 }];
      this.cannonQueued = false;
      this.cannonTimer = 10;
      this.cannonCount = 0;
    }

    spawnFriendly() {
      const slot = findFreeFriendlySlot(this.friendlies);
      if (slot === -1) {
        return;
      }
      this.friendlies.push(createFriendly(this, slot));
    }

    updateFriendlies() {
      const survivors = [];
      const orderedEnemies = [...this.enemies].sort((left, right) => left.slot - right.slot);
      for (const friendly of this.friendlies) {
        if (!friendly.launched) {
          updateIdleFriendly(friendly, this.cursor, this.random);
          survivors.push(friendly);
          continue;
        }
        if (updateLaunchedFriendly(friendly, orderedEnemies)) {
          survivors.push(friendly);
        }
      }
      this.friendlies = survivors;
    }

    spawnEnemy() {
      this.enemySpawnCounter += 1;
      if (this.enemySpawnCounter <= 3) {
        return;
      }
      this.enemySpawnCounter = 0;
      const slot = findFreeEnemySlot(this.enemies);
      if (slot === -1) {
        return;
      }
      const doorIndex = Math.floor(this.random() * ENEMY_DOORS.length) % ENEMY_DOORS.length;
      const door = ENEMY_DOORS[doorIndex];
      this.enemies.push(createEnemy(this, slot, door));
    }

    updateEnemies() {
      const survivors = [];
      for (const enemy of this.enemies) {
        if (updateEnemy(this, enemy)) {
          survivors.push(enemy);
        }
      }
      this.enemies = survivors;
    }

    updateShells() {
      const survivors = [];
      for (const shell of this.shells) {
        if (shell.mode === "flight") {
          if (updateFlyingShell(this, shell)) {
            survivors.push(shell);
          }
          continue;
        }
        if (updateExplosionShell(shell)) {
          survivors.push(shell);
        }
      }
      this.shells = survivors;
    }

    resolvePhase() {
      if (this.playerCastleLife <= 0) {
        this.phase = "over";
        return;
      }
      if (this.enemyCastleLife <= 0) {
        this.phase = "clear";
      }
    }

    get cannonReady() {
      return this.cannonTimer === 0;
    }
  }

  return Object.freeze({ CastleDefenseGame, GAME_WIDTH, GAME_HEIGHT, FIXED_STEP_SECONDS, FIELD_BOUNDS, CASTLE_AREA_BOUNDS, ENEMY_CASTLE_BOUNDS, PLAYER_DOOR, ENEMY_DOORS, CURSOR_START, CANNON_BOUNDS, START_BUTTON_BOUNDS, HELP_BUTTON_BOUNDS, BACK_BUTTON_BOUNDS, CLEAR_RESTART_BUTTON_BOUNDS, OVER_RESTART_BUTTON_BOUNDS });
});
