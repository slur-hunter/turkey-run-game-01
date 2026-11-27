// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play, paused,
// caught and escaped.
//
// ?seed=N fixes the run's pattern. ?shot=start|farm|kitchen|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_ESCAPED, EVENT_HIT, EVENT_OVER, EVENT_SPOTTED } from './world.js';
import { ACTION_CONFIRM, ACTION_JUMP, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_ESCAPED, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { playEscape, playGobble, playHit, playJump, playPickup, playSpotted, unlockAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

function makeWorld(nextSeed) {
  return createWorld(createRandom(nextSeed));
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, makeWorld);
  let painted = 0;
  function paint() {
    renderer.draw(scene.world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, canvas);
  const world = makeWorld(seed);
  let screen = SCREEN_TITLE;
  let best = readBest();
  // A read-only handle for automated checks: the live screen and world state.
  window.__game = { get screen() { return screen; }, get state() { return world.state; } };
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    unlockAudio();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    playGobble();
    announce(`Playing. ${LIVES} lives. Run 1400 metres to the forest gate.`);
  }

  function endGame(escaped) {
    screen = escaped ? SCREEN_ESCAPED : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (escaped) {
      playEscape();
      announce(`Escaped! Score ${world.state.score}. Best ${best}.`);
    } else {
      announce(`Caught. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function handleActions(actions) {
    const startScreens = screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_ESCAPED;
    // Space (or W / Up) starts and restarts the run, as the screens promise;
    // Enter and a click do the same through ACTION_CONFIRM.
    if ((actions & (ACTION_CONFIRM | ACTION_JUMP)) && startScreens) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  let pendingJump = false;

  function step() {
    if (screen === SCREEN_TITLE) {
      // The title's backdrop: the farm ambles on, harmless, behind the panel.
      world.step(STEP, { direction: 0, jump: false, duck: false });
      return;
    }
    const control = {
      direction: input.direction(world.state.player.x + world.state.player.width / 2),
      jump: pendingJump,
      duck: input.ducking(),
    };
    pendingJump = false;
    if (control.jump && world.state.player.onGround) playJump();
    const events = world.step(STEP, control);
    if (events & EVENT_HIT) {
      playHit();
      announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    } else if (events & EVENT_SPOTTED) {
      playSpotted();
      announce('The farmer spotted you!');
    }
    if (events & EVENT_ESCAPED) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_JUMP) pendingJump = true;
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the farmer catch the turkey unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce("Gobble's Great Escape. Press Space or click to run.");
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
