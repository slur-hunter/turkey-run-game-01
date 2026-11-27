// The screenshot scenes behind ?shot=start|farm|kitchen|end. Each one plays the real
// rules forward from a fresh world, steered by an autopilot that jumps the fences
// and the oven, dodges the falling knives and ducks behind hay when the farmer
// closes in, so the frame is what a real run looks like and the same seed always
// gives the same frame. A scene that ends caught before its target retries with
// the next seed, so the kitchen and escape scenes always show a run that got there.

import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_ESCAPED, EVENT_OVER } from './world.js';
import { SCREEN_ESCAPED, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const FARM_SECONDS = 20;
const SAMPLE = 1 / 30;
const JUMP_RANGE = 55;
const OVEN_JUMP_RANGE = 90;

/** The nearest fence or oven ahead of the turkey, and how far away its front edge is. */
function nextObstacle(state) {
  let best = null;
  let bestDist = Infinity;
  for (const fence of state.fences) {
    if (!fence.active) continue;
    const dist = fence.x - (state.player.x + state.player.width);
    if (dist >= -10 && dist < bestDist) { bestDist = dist; best = fence; }
  }
  for (const oven of state.ovens) {
    if (!oven.active) continue;
    const dist = oven.x - (state.player.x + state.player.width);
    if (dist >= -10 && dist < bestDist) { bestDist = dist; best = oven; }
  }
  return { item: best, dist: bestDist };
}

/** True when a falling knife will land on the turkey's lane soon: it is falling
 * toward the turkey's x-range and will reach it within the next second. */
function knifeThreat(state) {
  const player = state.player;
  for (const knife of state.knives) {
    if (!knife.active) continue;
    const fallTime = (player.y - knife.y) / knife.speed;
    if (fallTime < 0 || fallTime > 1.0) continue;
    if (knife.x + knife.width > player.x - 30 && knife.x < player.x + player.width + 30) return knife;
  }
  return null;
}

/** True when a knife will be in the turkey's jump arc during the next jump, so
 * jumping would meet it: its x overlaps the turkey and it reaches the turkey's
 * height within the jump's own time. */
function knifeAbove(state) {
  const player = state.player;
  for (const knife of state.knives) {
    if (!knife.active) continue;
    if (knife.x + knife.width <= player.x - 6 || knife.x >= player.x + player.width + 6) continue;
    const fallTime = (player.y - knife.y) / knife.speed;
    if (fallTime >= 0 && fallTime <= 0.9) return knife;
  }
  return null;
}

/** Steer the turkey: jump the next obstacle, sidestep a falling knife, duck in hay.
 * The turkey holds the middle of the lane, where it can dodge either way, and
 * only sprints to the front when the farmer's gap is getting short. */
export function autopilot(state) {
  const player = state.player;
  const centre = player.x + player.width / 2;
  const control = { direction: 0, jump: false, duck: false };
  const threat = knifeThreat(state);
  if (threat) {
    control.direction = threat.x + threat.width / 2 > centre ? -1 : 1;
    return control;
  }
  const { item, dist } = nextObstacle(state);
  const range = item && item.jetPhase !== undefined ? OVEN_JUMP_RANGE : JUMP_RANGE;
  if (item && dist < range && player.onGround) {
    // Never jump into a falling knife: sidestep first, jump once the air is clear.
    const above = knifeAbove(state);
    if (above) {
      control.direction = above.x + above.width / 2 > centre ? -1 : 1;
      return control;
    }
    // An oven is only jumped while its jets are down with time to spare for the
    // whole jump; otherwise wait at its edge for the next down phase.
    if (item.jetPhase === undefined) control.jump = true;
    else if (item.jetPhase === 'down' && item.jetTimer > 1.2) control.jump = true;
    else if (dist < 30) control.jump = true;
    else return control;
    // A jump keeps the turkey's speed: push right while airborne.
    control.direction = 1;
    return control;
  }
  // Duck behind hay when the farmer is closing in.
  if (state.farmer.gap < 190 && player.onGround) {
    for (const hay of state.hays) {
      if (!hay.active) continue;
      const near = hay.x - (player.x + player.width);
      if (near > -20 && near < 120) {
        control.duck = true;
        return control;
      }
    }
  }
  // Hold the middle of the lane; sprint to the front only when the farmer is close.
  if (state.farmer.gap < 220) {
    control.direction = 1;
  } else if (centre < 360) {
    control.direction = 1;
  } else if (centre > 420) {
    control.direction = -1;
  }
  return control;
}

/** Play one run with the autopilot until `stop` says so; returns why it stopped. */
function playUntil(world, stop, maxSeconds) {
  const maxSteps = Math.ceil(maxSeconds / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    const events = world.step(STEP, autopilot(world.state));
    if (stop(world.state, events)) return { events, steps: i };
    if (events & EVENT_OVER) return { events, steps: i, caught: true };
  }
  return { events: 0, steps: maxSteps, timeout: true };
}

/**
 * Set the world to the named scene and return the screen to draw over it and the
 * best score to show. `makeWorld(seed)` builds a fresh world for that seed.
 */
export function stageShot(name, makeWorld) {
  if (name !== 'farm' && name !== 'kitchen' && name !== 'end') {
    const world = makeWorld(1);
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { direction: 0, jump: false, duck: false });
    return { world, screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'farm') {
    const world = makeWorld(1);
    const result = playUntil(world, (state) => state.elapsed >= FARM_SECONDS, 60);
    const over = world.state.over;
    return { world, screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score, steps: result.steps };
  }
  if (name === 'kitchen') {
    for (let seed = 1; seed <= 8; seed += 1) {
      const world = makeWorld(seed);
      const result = playUntil(world, (state) => {
        if (state.zone !== 2 || state.meters <= 820) return false;
        // Wait until an oven is in the middle of the frame, so the kitchen's
        // signature hazard is visible in the shot.
        for (const oven of state.ovens) {
          if (oven.active && oven.x > 300 && oven.x < 900) return true;
        }
        return false;
      }, 180);
      if (result.caught) continue;
      const over = world.state.over;
      return { world, screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score, seed };
    }
    const world = makeWorld(1);
    playUntil(world, (state) => state.zone === 2, 180);
    return { world, screen: SCREEN_PLAY, best: world.state.score, seed: 1 };
  }
  // end: the escape. Retry seeds until a run reaches the forest gate.
  for (let seed = 1; seed <= 12; seed += 1) {
    const world = makeWorld(seed);
    const result = playUntil(world, (state, events) => (events & EVENT_ESCAPED) !== 0, 300);
    if (world.state.escaped) return { world, screen: SCREEN_ESCAPED, best: world.state.score, seed };
    if (!result.caught) continue;
  }
  const world = makeWorld(1);
  playUntil(world, () => false, 300);
  return { world, screen: world.state.escaped ? SCREEN_ESCAPED : SCREEN_OVER, best: world.state.score, seed: 1 };
}
