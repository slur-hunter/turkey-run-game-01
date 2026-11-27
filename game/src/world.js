// The game's rules and state, with no drawing and no browser in it: the turkey,
// the farmer, falling knives, fences, haystacks, the kitchen oven, corn and the
// run's distance, score and lives. step() advances one fixed step and returns what
// happened as bit flags, so the caller can react without the world knowing about
// screens or sound. The run is a side-scrolling escape: the turkey runs right,
// the world scrolls left, and the forest gate at ESCAPE_METERS ends the run free.

import {
  ESCAPE_METERS, FARMER, FENCE, FIELD, HAY, KNIFE, LIVES, OVEN, PICKUP, PLAYER,
  PX_PER_METER, RUN, STEP, ZONES,
} from './config.js';
import { createFarmer } from './farmer.js';

export const KIND_KNIFE = 0;
export const KIND_CORN = 1;
export const KIND_PUMPKIN = 2;
export const KIND_FEATHER = 3;

export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_OVER = 4;
export const EVENT_ESCAPED = 8;
export const EVENT_SPOTTED = 16;

const STEER_SPEED = 420;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function zoneAt(meters) {
  for (let i = 0; i < ZONES.length; i += 1) {
    if (meters < ZONES[i].to) return i;
  }
  return ZONES.length - 1;
}

export function createWorld(random) {
  const player = {
    x: 300, y: FIELD.groundY - PLAYER.height, width: PLAYER.width, height: PLAYER.height,
    vy: 0, onGround: true, ducking: false, hidden: false, invulnerable: 0, stumbleTimer: 0,
  };
  const farmer = createFarmer();
  const knives = [];
  const fences = [];
  const hays = [];
  const ovens = [];
  const pickups = [];
  for (let i = 0; i < 24; i += 1) knives.push({ active: false, x: 0, y: 0, width: 0, height: 0, speed: 0 });
  for (let i = 0; i < 10; i += 1) fences.push({ active: false, x: 0, width: 0, height: 0 });
  for (let i = 0; i < 6; i += 1) hays.push({ active: false, x: 0, width: 0, height: 0 });
  for (let i = 0; i < 4; i += 1) ovens.push({ active: false, x: 0, width: 0, height: 0, jetTimer: 0, jetPhase: 'down' });
  for (let i = 0; i < 24; i += 1) pickups.push({ active: false, kind: KIND_CORN, x: 0, y: 0, width: 0, height: 0, bob: 0 });

  const state = {
    player, farmer: farmer.state, knives, fences, hays, ovens, pickups,
    score: 0, lives: LIVES, elapsed: 0, scroll: 0, meters: 0, zone: 0,
    speed: RUN.base, boost: 0, knifeTimer: 0, fenceTimer: 0, hayTimer: 0,
    ovenTimer: 0, cornTimer: 0, pumpkinTimer: 0, featherTimer: 0, over: false, escaped: false,
    lastHit: null, hits: 0,
  };

  function reset() {
    player.x = 300;
    player.y = FIELD.groundY - PLAYER.height;
    player.vy = 0;
    player.onGround = true;
    player.ducking = false;
    player.hidden = false;
    player.invulnerable = 0;
    player.stumbleTimer = 0;
    farmer.reset();
    for (const list of [knives, fences, hays, ovens, pickups]) {
      for (const item of list) item.active = false;
    }
    state.score = 0;
    state.lives = LIVES;
    state.elapsed = 0;
    state.scroll = 0;
    state.meters = 0;
    state.zone = 0;
    state.speed = RUN.base;
    state.boost = 0;
    state.knifeTimer = KNIFE.interval;
    state.fenceTimer = FENCE.interval;
    state.hayTimer = HAY.interval;
    state.ovenTimer = 3;
    state.cornTimer = CORN_INTERVAL;
    state.pumpkinTimer = PICKUP.pumpkinInterval;
    state.featherTimer = PICKUP.featherInterval;
    state.over = false;
    state.escaped = false;
    state.lastHit = null;
    state.hits = 0;
  }

  const CORN_INTERVAL = PICKUP.cornInterval;

  function free(list) {
    for (let i = 0; i < list.length; i += 1) if (!list[i].active) return list[i];
    return null;
  }

  function spawnKnife() {
    const item = free(knives);
    if (!item) return;
    item.active = true;
    item.width = KNIFE.width;
    item.height = KNIFE.height;
    item.x = 200 + random() * (FIELD.width - 240);
    item.y = -item.height;
    item.speed = KNIFE.fallSpeed + KNIFE.fallPerZone * state.zone + random() * 60;
  }

  function spawnFence() {
    const item = free(fences);
    if (!item) return;
    item.active = true;
    item.width = FENCE.width;
    item.height = FENCE.height;
    item.x = FIELD.width + 40;
  }

  function spawnHay() {
    const item = free(hays);
    if (!item) return;
    item.active = true;
    item.width = HAY.width;
    item.height = HAY.height;
    item.x = FIELD.width + 40;
  }

  function spawnOven() {
    const item = free(ovens);
    if (!item) return;
    item.active = true;
    item.width = OVEN.width;
    item.height = OVEN.height;
    item.x = FIELD.width + 40;
    item.jetTimer = OVEN.jetInterval;
    item.jetPhase = 'down';
  }

  function spawnPickup(kind) {
    const item = free(pickups);
    if (!item) return;
    item.active = true;
    item.kind = kind;
    const size = kind === KIND_CORN ? PICKUP.cornSize : kind === KIND_PUMPKIN ? 40 : 30;
    item.width = size;
    item.height = size;
    item.x = FIELD.width + 40;
    item.y = FIELD.groundY - 120 - random() * 160;
    item.bob = random() * Math.PI * 2;
  }

  function playerBox() {
    const height = player.ducking ? PLAYER.duckHeight : PLAYER.height;
    return { x: player.x + 6, y: player.y + (PLAYER.height - height), width: player.width - 12, height };
  }

  function stumble(events, cause) {
    if (player.invulnerable > 0) return events;
    player.invulnerable = PLAYER.invulnerable;
    player.stumbleTimer = 0.6;
    state.lives -= 1;
    state.speed = RUN.stumble;
    state.lastHit = cause;
    state.hits += 1;
    events |= EVENT_HIT;
    if (state.lives <= 0) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  /**
   * One fixed step. `control` is { direction (-1, 0, 1), jump, duck }.
   * Returns bit flags of what happened.
   */
  function step(dt, control) {
    let events = 0;
    if (state.over || state.escaped) return events;
    state.elapsed += dt;
    state.zone = zoneAt(state.meters);

    // Steering and speed: the turkey's place in the lane IS its pace — the
    // further right it runs, the faster it goes. Pushing to the front sprints
    // and pulls away from the farmer; hanging back slows the run and lets him
    // gain. Ducking and a stumble both slow it down.
    const pace = (player.x - PLAYER.minX) / (PLAYER.maxX - PLAYER.minX);
    let targetSpeed = RUN.slow + pace * (RUN.sprint - RUN.slow);
    if (player.stumbleTimer > 0) targetSpeed = RUN.stumble;
    if (player.ducking) targetSpeed = Math.min(targetSpeed, RUN.slow);
    player.x = Math.min(PLAYER.maxX, Math.max(PLAYER.minX, player.x + control.direction * STEER_SPEED * dt));
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 4);
    state.speed += state.boost;
    state.boost = Math.max(0, state.boost - RUN.boostDecay * dt);
    state.scroll += state.speed * dt;
    state.meters = state.scroll / PX_PER_METER;
    state.score += state.speed * dt / PX_PER_METER;

    // Jump and gravity.
    player.ducking = control.ducking && player.onGround;
    if (control.jump && player.onGround && !player.ducking) {
      player.vy = -PLAYER.jumpVelocity;
      player.onGround = false;
    }
    if (!player.onGround) {
      player.vy += PLAYER.gravity * dt;
      player.y += player.vy * dt;
      if (player.y >= FIELD.groundY - PLAYER.height) {
        player.y = FIELD.groundY - PLAYER.height;
        player.vy = 0;
        player.onGround = true;
      }
    }
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.stumbleTimer > 0) player.stumbleTimer = Math.max(0, player.stumbleTimer - dt);

    // Hidden means ducking inside a haystack: the farmer loses the trail.
    player.hidden = false;
    if (player.ducking) {
      const box = playerBox();
      for (const hay of hays) {
        if (hay.active && overlaps(box, { x: hay.x, y: FIELD.groundY - hay.height, width: hay.width, height: hay.height })) {
          player.hidden = true;
          break;
        }
      }
    }

    const dx = state.speed * dt;
    const zone = state.zone;

    // Spawning, faster and meaner as the zones pass.
    state.knifeTimer -= dt;
    if (state.knifeTimer <= 0) {
      spawnKnife();
      const interval = Math.max(KNIFE.minInterval, KNIFE.interval * KNIFE.intervalScale ** zone);
      state.knifeTimer += interval;
    }
    state.fenceTimer -= dt;
    if (state.fenceTimer <= 0 && zone !== 2) {
      spawnFence();
      state.fenceTimer += FENCE.interval + random() * FENCE.intervalJitter;
    }
    state.hayTimer -= dt;
    if (state.hayTimer <= 0 && zone !== 2) {
      spawnHay();
      state.hayTimer += HAY.interval + random() * HAY.intervalJitter;
    }
    state.ovenTimer -= dt;
    if (state.ovenTimer <= 0 && zone === 2) {
      spawnOven();
      state.ovenTimer += 7 + random() * 4;
    }
    state.cornTimer -= dt;
    if (state.cornTimer <= 0) {
      spawnPickup(KIND_CORN);
      state.cornTimer += PICKUP.cornInterval + random() * PICKUP.cornJitter;
    }
    state.pumpkinTimer -= dt;
    if (state.pumpkinTimer <= 0) {
      spawnPickup(KIND_PUMPKIN);
      state.pumpkinTimer += PICKUP.pumpkinInterval;
    }
    state.featherTimer -= dt;
    if (state.featherTimer <= 0) {
      spawnPickup(KIND_FEATHER);
      state.featherTimer += PICKUP.featherInterval;
    }

    const box = playerBox();

    // Falling knives.
    for (const knife of knives) {
      if (!knife.active) continue;
      knife.y += knife.speed * dt;
      if (knife.y > FIELD.groundY) {
        knife.active = false;
        state.score += KNIFE.points;
        continue;
      }
      if (overlaps(box, knife)) {
        knife.active = false;
        events = stumble(events, 'knife');
      }
    }
    // Fences and haystacks: jump them or stumble.
    for (const fence of fences) {
      if (!fence.active) continue;
      fence.x -= dx;
      if (fence.x + fence.width < -40) { fence.active = false; continue; }
      const fenceBox = { x: fence.x, y: FIELD.groundY - fence.height, width: fence.width, height: fence.height };
      if (overlaps(box, fenceBox)) {
        fence.active = false;
        events = stumble(events, 'fence');
      }
    }
    for (const hay of hays) {
      if (!hay.active) continue;
      hay.x -= dx;
      if (hay.x + hay.width < -40) { hay.active = false; continue; }
      // A haystack is soft: running into it only slows the turkey, it never hurts.
      const hayBox = { x: hay.x, y: FIELD.groundY - hay.height, width: hay.width, height: hay.height };
      if (overlaps(box, hayBox) && !player.hidden && player.onGround) {
        state.speed = Math.min(state.speed, RUN.slow);
      }
    }
    // The oven: jump it while its jets are down; a jet up while the turkey is
    // above the oven burns, and running into its side stumbles.
    for (const oven of ovens) {
      if (!oven.active) continue;
      oven.x -= dx;
      if (oven.x + oven.width < -40) { oven.active = false; continue; }
      oven.jetTimer -= dt;
      if (oven.jetPhase === 'down' && oven.jetTimer <= 0) { oven.jetPhase = 'warn'; oven.jetTimer = OVEN.jetWarn; }
      else if (oven.jetPhase === 'warn' && oven.jetTimer <= 0) { oven.jetPhase = 'up'; oven.jetTimer = OVEN.jetUp; }
      else if (oven.jetPhase === 'up' && oven.jetTimer <= 0) { oven.jetPhase = 'down'; oven.jetTimer = OVEN.jetInterval; }
      const ovenBox = { x: oven.x, y: FIELD.groundY - oven.height, width: oven.width, height: oven.height };
      // The fire jet, when up, is a tall flame above the oven: only a turkey
      // whose body is inside the flame is burned, not one that jumped clear over it.
      if (oven.jetPhase === 'up') {
        const jetBox = { x: oven.x, y: FIELD.groundY - oven.height - 50, width: oven.width, height: 50 };
        if (overlaps(box, jetBox)) {
          events = stumble(events, 'oven-jet');
          continue;
        }
      }
      if (overlaps(box, ovenBox)) {
        events = stumble(events, 'oven-side');
      }
    }
    // Pickups.
    for (const item of pickups) {
      if (!item.active) continue;
      item.x -= dx;
      item.bob += dt * 4;
      if (item.x + item.width < -40) { item.active = false; continue; }
      const itemBox = { x: item.x, y: item.y + Math.sin(item.bob) * 6, width: item.width, height: item.height };
      if (overlaps(box, itemBox)) {
        item.active = false;
        if (item.kind === KIND_CORN) {
          state.score += PICKUP.cornPoints;
          state.boost = Math.min(60, state.boost + RUN.cornBoost);
        } else if (item.kind === KIND_PUMPKIN) {
          state.score += PICKUP.pumpkinPoints;
          state.lives = Math.min(5, state.lives + 1);
        } else {
          state.score += PICKUP.featherPoints;
        }
        events |= EVENT_CORN;
      }
    }

    // The farmer: what he can see decides his mood, and the gap is the two speeds.
    const seen = {
      hidden: player.hidden,
      speed: state.speed,
      stumbled: (events & EVENT_HIT) !== 0,
    };
    const wasChase = farmer.state.mood === 'chase';
    const caught = farmer.step(dt, seen);
    if (!wasChase && farmer.state.mood === 'chase') events |= EVENT_SPOTTED;
    if (caught === 'caught' || state.lives <= 0) {
      state.over = true;
      events |= EVENT_OVER;
    }

    // The forest gate: the run ends free.
    if (state.meters >= ESCAPE_METERS) {
      state.escaped = true;
      events |= EVENT_ESCAPED;
    }

    state.score = Math.floor(state.score);
    return events;
  }

  reset();
  return { state, reset, step };
}
