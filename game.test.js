const test = require("node:test");
const assert = require("node:assert/strict");
const { CastleDefenseGame, FIELD_BOUNDS, CANNON_BOUNDS, CASTLE_AREA_BOUNDS, ENEMY_CASTLE_BOUNDS, START_BUTTON_BOUNDS, HELP_BUTTON_BOUNDS, BACK_BUTTON_BOUNDS, CLEAR_RESTART_BUTTON_BOUNDS, OVER_RESTART_BUTTON_BOUNDS } = require("./game.js");

function step(game, count, dt = 1 / 12) {
  for (let index = 0; index < count; index += 1) {
    game.tick(dt);
  }
}

test("味方はカーソル周辺に最大5体まで補充される", () => {
  const game = new CastleDefenseGame({ random: () => 0 });
  game.startGame();
  game.movePointer(220, 324);
  step(game, 30);
  assert.equal(game.friendlies.length, 5);
  assert.equal(game.friendlies.filter((friendly) => friendly.ready).length, 5);
});

test("ゲーム画面クリックで準備完了した味方を1体だけ発射する", () => {
  const game = new CastleDefenseGame({ random: () => 0 });
  game.startGame();
  game.movePointer(220, 324);
  step(game, 30);
  const readyCount = game.friendlies.filter((friendly) => friendly.ready).length;
  game.click(FIELD_BOUNDS.x + 120, FIELD_BOUNDS.y + 120);
  assert.equal(game.friendlies.filter((friendly) => friendly.launched).length, 1);
  assert.equal(game.friendlies.filter((friendly) => friendly.ready).length, readyCount - 1);
});

test("発射した味方は敵を倒さずに押し返す", () => {
  const game = new CastleDefenseGame({ random: () => 0 });
  game.startGame();
  game.friendlies = [{ id: 1, slot: 0, x: 300, y: 300, ready: false, launched: true, variant: "fly" }];
  game.enemies = [{ id: 2, slot: 10, x: 320, y: 300 }];
  step(game, 1);
  assert.ok(game.friendlies.some((friendly) => friendly.id === 1));
  assert.equal(game.enemies.length, 1);
  assert.ok(game.enemies[0].x > 320);
});

test("敵は自城に触れるとライフを1減らして消える", () => {
  const game = new CastleDefenseGame({ random: () => 0 });
  game.startGame();
  game.enemies = [{ id: 2, slot: 10, x: CASTLE_AREA_BOUNDS.x + CASTLE_AREA_BOUNDS.width - 1, y: CASTLE_AREA_BOUNDS.y + 20 }];
  step(game, 1);
  assert.equal(game.playerCastleLife, 2);
  assert.equal(game.enemies.length, 0);
});

test("砲弾は斜めに飛び敵城に当たると爆発へ遷移する", () => {
  const game = new CastleDefenseGame({ random: () => 0 });
  game.startGame();
  game.cannonTimer = 0;
  game.click(CANNON_BOUNDS.x + 10, CANNON_BOUNDS.y + 10);
  step(game, 1);
  assert.equal(game.shells.length, 1);
  assert.ok(game.shells[0].x > 100);
  assert.ok(game.shells[0].y < 500);
  step(game, 50);
  assert.equal(game.enemyCastleLife, 2);
  assert.equal(game.shells[0].mode, "explosion");
  assert.ok(game.shells[0].ttl > 0);
  assert.ok(game.shells[0].x >= ENEMY_CASTLE_BOUNDS.x);
});

test("砲台の準備ができていない間はクリックしても発射されない", () => {
  const game = new CastleDefenseGame({ random: () => 0 });
  game.startGame();
  game.cannonTimer = 4;
  assert.equal(game.click(CANNON_BOUNDS.x + 10, CANNON_BOUNDS.y + 10).action, "none");
  step(game, 1);
  assert.equal(game.cannonQueued, false);
  assert.equal(game.shells.length, 0);
});

test("敵城ライフが0になるとクリアへ遷移する", () => {
  const game = new CastleDefenseGame({ random: () => 0 });
  game.startGame();
  game.enemyCastleLife = 1;
  game.cannonTimer = 0;
  assert.equal(game.click(CANNON_BOUNDS.x + 10, CANNON_BOUNDS.y + 10).action, "cannon");
  step(game, 50);
  assert.equal(game.enemyCastleLife, 0);
  assert.equal(game.phase, "clear");
});

test("自城ライフが0になるとゲームオーバーへ遷移する", () => {
  const game = new CastleDefenseGame({ random: () => 0 });
  game.startGame();
  game.playerCastleLife = 1;
  game.enemies = [{ id: 2, slot: 10, x: CASTLE_AREA_BOUNDS.x + CASTLE_AREA_BOUNDS.width - 1, y: CASTLE_AREA_BOUNDS.y + 20 }];
  step(game, 1);
  assert.equal(game.playerCastleLife, 0);
  assert.equal(game.phase, "over");
});

test("爆発状態の砲弾は残り時間を使い切ると消える", () => {
  const game = new CastleDefenseGame({ random: () => 0 });
  game.startGame();
  game.shells = [{ id: 1, x: ENEMY_CASTLE_BOUNDS.x, y: ENEMY_CASTLE_BOUNDS.y, mode: "explosion", ttl: 1 }];
  step(game, 1);
  assert.equal(game.shells.length, 0);
});

test("開始画面と説明画面のボタン矩形で遷移できる", () => {
  const game = new CastleDefenseGame({ random: () => 0 });
  assert.equal(game.click(START_BUTTON_BOUNDS.x + START_BUTTON_BOUNDS.width / 2, START_BUTTON_BOUNDS.y + START_BUTTON_BOUNDS.height / 2).action, "start");
  game.reset();
  assert.equal(game.click(HELP_BUTTON_BOUNDS.x + HELP_BUTTON_BOUNDS.width / 2, HELP_BUTTON_BOUNDS.y + HELP_BUTTON_BOUNDS.height / 2).action, "help");
  assert.equal(game.click(BACK_BUTTON_BOUNDS.x + BACK_BUTTON_BOUNDS.width / 2, BACK_BUTTON_BOUNDS.y + BACK_BUTTON_BOUNDS.height / 2).action, "back");
});

test("クリアとゲームオーバーのボタン矩形で開始画面へ戻れる", () => {
  const game = new CastleDefenseGame({ random: () => 0 });
  game.phase = "clear";
  assert.equal(game.click(CLEAR_RESTART_BUTTON_BOUNDS.x + CLEAR_RESTART_BUTTON_BOUNDS.width / 2, CLEAR_RESTART_BUTTON_BOUNDS.y + CLEAR_RESTART_BUTTON_BOUNDS.height / 2).action, "restart");
  game.phase = "over";
  assert.equal(game.click(OVER_RESTART_BUTTON_BOUNDS.x + OVER_RESTART_BUTTON_BOUNDS.width / 2, OVER_RESTART_BUTTON_BOUNDS.y + OVER_RESTART_BUTTON_BOUNDS.height / 2).action, "restart");
});
