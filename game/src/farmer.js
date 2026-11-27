// The farmer: the pressure behind every run. He walks the farmyard with his
// pitchfork, and his gap behind the turkey is the run's real health bar. He has
// four moods: patrol (ambling just slower than the turkey's run, so the gap
// grows only slowly), chase (he spotted the turkey and runs faster than it, so
// the turkey must sprint or hide), search (the turkey ducked behind hay, he
// slows and looks about) and lunge (close enough to grab, telegraphed, the
// turkey must sprint clear). The gap is just relative speed: the turkey's speed
// minus the farmer's, each second. A stumble costs a chunk of gap at once.
// The farmer never reads the world directly: the world hands him what he can
// see (whether the turkey is hidden, how fast the turkey is moving, whether it
// just stumbled) and he answers with his gap and mood.

import { FARMER } from './config.js';

export const MOOD_PATROL = 'patrol';
export const MOOD_CHASE = 'chase';
export const MOOD_SEARCH = 'search';
export const MOOD_LUNGE = 'lunge';

export function createFarmer() {
  const state = {
    gap: FARMER.startGap,
    suspicion: 0,
    mood: MOOD_PATROL,
    lungeTimer: 0,
    walkPhase: 0,
  };

  function reset() {
    state.gap = FARMER.startGap;
    state.suspicion = 0;
    state.mood = MOOD_PATROL;
    state.lungeTimer = 0;
    state.walkPhase = 0;
  }

  /**
   * One step. `seen` is what the farmer can tell: whether the turkey is hidden
   * behind hay, how fast the turkey is running, and whether it just stumbled.
   * Returns 'caught' when the gap closes to nothing.
   */
  function step(dt, seen) {
    state.walkPhase += dt * 6;
    // Suspicion grows only when the turkey is slow or close enough to see
    // clearly, and cools off while it runs fast and far ahead; behind hay it
    // falls fast. So a turkey that keeps its pace never draws a chase.
    if (seen.hidden) {
      state.suspicion = Math.max(0, state.suspicion - FARMER.suspicionFall * dt);
      state.mood = MOOD_SEARCH;
    } else if (seen.speed < 240 || state.gap < 180) {
      let rise = FARMER.suspicionRise;
      if (state.gap < 180) rise += FARMER.suspicionClose;
      state.suspicion = Math.min(100, state.suspicion + rise * dt);
      state.mood = state.suspicion > FARMER.chaseAt ? MOOD_CHASE : MOOD_PATROL;
    } else {
      state.suspicion = Math.max(0, state.suspicion - FARMER.suspicionCool * dt);
      state.mood = state.suspicion > FARMER.chaseAt ? MOOD_CHASE : MOOD_PATROL;
    }
    // The gap is relative speed: the turkey's speed minus the farmer's.
    const farmerSpeed = state.mood === MOOD_CHASE
      ? FARMER.chaseSpeed
      : state.mood === MOOD_SEARCH ? FARMER.searchSpeed : FARMER.patrolSpeed;
    state.gap += (seen.speed - farmerSpeed) * dt;
    if (seen.stumbled) state.gap -= FARMER.stumbleLoss;

    // Close enough to grab: warn, then lunge. The warning is the turkey's chance
    // to sprint clear; a lunge that misses leaves him winded and further behind.
    if (state.gap <= FARMER.lungeGap && state.mood !== MOOD_LUNGE) {
      state.mood = MOOD_LUNGE;
      state.lungeTimer = 0.9;
    }
    if (state.mood === MOOD_LUNGE) {
      state.lungeTimer -= dt;
      state.gap -= 80 * dt;
      if (state.lungeTimer <= 0) {
        state.mood = MOOD_PATROL;
        state.gap = FARMER.lungeGap + 60;
      }
    }

    state.gap = Math.min(420, Math.max(0, state.gap));
    if (state.gap <= 0) return 'caught';
    return null;
  }

  return { state, reset, step };
}
