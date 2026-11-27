// Keyboard and pointer input. Held keys steer and sprint; one-shot presses (jump,
// start, restart, pause) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. The mouse steers
// too: while the pointer is held the turkey runs toward it, and a click jumps.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_JUMP = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const DUCK = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target, canvas) {
  let left = false;
  let right = false;
  let duck = false;
  let actions = 0;
  let pointerX = null;
  let pointerHeld = false;
  let pointerDownAt = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (DUCK.has(event.code)) duck = true;
    else if (JUMP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_JUMP;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (DUCK.has(event.code)) duck = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    duck = false;
    pointerHeld = false;
    pointerX = null;
  });

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return (event.clientX - rect.left) / rect.width;
  }

  target.addEventListener('pointerdown', (event) => {
    pointerHeld = true;
    pointerX = pointerPosition(event);
    pointerDownAt = performance.now();
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointermove', (event) => {
    if (pointerHeld) pointerX = pointerPosition(event);
  });
  function pointerUp(event) {
    if (pointerHeld && performance.now() - pointerDownAt < 220) actions |= ACTION_JUMP;
    pointerHeld = false;
    pointerX = null;
  }
  target.addEventListener('pointerup', pointerUp);
  target.addEventListener('pointercancel', () => {
    pointerHeld = false;
    pointerX = null;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both; the pointer steers when held. */
    direction(playerCenterX) {
      if (pointerHeld && pointerX !== null) {
        const target = pointerX * 1280;
        if (target > playerCenterX + 24) return 1;
        if (target < playerCenterX - 24) return -1;
        return 0;
      }
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    ducking() {
      return duck;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
