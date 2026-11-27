// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Warm autumn art drawn from shapes: the turkey, the
// farmer with his pitchfork, the farm, the barn, the kitchen oven, corn and
// pumpkins. Canvas text for the HUD and the panels.

import { ESCAPE_METERS, FIELD, FONT, LIVES, PALETTES, PLAYER, TURKEY, ZONES } from './config.js';
import { KIND_CORN, KIND_FEATHER, KIND_PUMPKIN, zoneAt } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_ESCAPED = 'escaped';

const PANEL = { width: 640, top: 150, line: 34, bottom: 78 };
const HEART_SIZE = 22;
const HEART_GAP = 8;

/** A tiny deterministic hash, so scenery repeats the same way every run. */
function hash(n) {
  let x = (n * 2654435761) | 0;
  x = Math.imul(x ^ (x >>> 15), 2246822519);
  x = Math.imul(x ^ (x >>> 13), 3266489917);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  let runPhase = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function zonePalette(zone) {
    return PALETTES[['farmyard', 'barn', 'kitchen', 'forest'][zone]] || PALETTES.farmyard;
  }

  function drawSky(state, pal) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, pal.skyTop);
    gradient.addColorStop(1, pal.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Sun.
    context.fillStyle = pal.sun;
    context.beginPath();
    context.arc(1080, 110, 52, 0, Math.PI * 2);
    context.fill();
    // Clouds drift with the scroll, slower than the ground.
    for (let i = 0; i < 5; i += 1) {
      const cx = ((i * 340 - state.scroll * 0.12) % 1400 + 1400) % 1400 - 60;
      const cy = 60 + hash(i * 7) * 130;
      context.fillStyle = pal.cloud;
      context.beginPath();
      context.ellipse(cx, cy, 70, 22, 0, 0, Math.PI * 2);
      context.ellipse(cx + 44, cy + 8, 48, 18, 0, 0, Math.PI * 2);
      context.fill();
    }
    // Distant hills.
    context.fillStyle = pal.hillsFar;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.lineTo(x, FIELD.groundY - 90 - hash(Math.floor(x / 80)) * 70);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
    context.fillStyle = pal.hills;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.lineTo(x, FIELD.groundY - 40 - hash(Math.floor(x / 80) + 31) * 46);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
  }

  function drawScenery(state, pal) {
    // Trees and houses scroll past at half speed, so the run feels like a journey.
    const offset = state.scroll * 0.5;
    for (let i = 0; i < 9; i += 1) {
      const spacing = 260;
      const x = ((i * spacing - offset) % (9 * spacing) + 9 * spacing) % (9 * spacing) - 130;
      const kind = hash(i * 3);
      if (kind < 0.45) {
        // A round autumn tree.
        context.fillStyle = pal.treeDark;
        context.fillRect(x - 5, FIELD.groundY - 96, 10, 96);
        context.fillStyle = pal.tree;
        context.beginPath();
        context.arc(x, FIELD.groundY - 120, 46, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = pal.accent;
        context.beginPath();
        context.arc(x - 18, FIELD.groundY - 132, 12, 0, Math.PI * 2);
        context.arc(x + 20, FIELD.groundY - 108, 10, 0, Math.PI * 2);
        context.fill();
      } else if (kind < 0.7) {
        // A little farmhouse.
        context.fillStyle = pal.house;
        context.fillRect(x - 52, FIELD.groundY - 84, 104, 84);
        context.fillStyle = pal.houseRoof;
        context.beginPath();
        context.moveTo(x - 62, FIELD.groundY - 84);
        context.lineTo(x, FIELD.groundY - 132);
        context.lineTo(x + 62, FIELD.groundY - 84);
        context.closePath();
        context.fill();
        context.fillStyle = pal.sun;
        context.fillRect(x - 12, FIELD.groundY - 56, 24, 30);
      } else {
        // A pumpkin patch.
        for (let p = 0; p < 3; p += 1) {
          context.fillStyle = '#d2691e';
          context.beginPath();
          context.ellipse(x - 30 + p * 32, FIELD.groundY - 14, 18, 13, 0, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }

  function drawGround(state, pal) {
    context.fillStyle = pal.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = pal.groundTop;
    context.fillRect(0, FIELD.groundY, FIELD.width, 10);
    // Grass tufts scroll with the ground.
    context.fillStyle = pal.tree;
    const offset = state.scroll % 90;
    for (let x = -offset; x < FIELD.width; x += 90) {
      context.fillRect(x, FIELD.groundY + 22, 4, 12);
      context.fillRect(x + 14, FIELD.groundY + 30, 4, 10);
    }
  }

  /** The turkey: a brown body under a fan of three tail colours, head, beak, wattle, running legs. */
  function drawTurkey(player, pal) {
    const cx = player.x + player.width / 2;
    const base = player.y + PLAYER.height;
    const bob = player.onGround ? Math.sin(runPhase) * 3 : 0;
    const legSwing = player.onGround ? Math.sin(runPhase) * 10 : 6;
    // Tail fan.
    for (let i = 0; i < 3; i += 1) {
      context.fillStyle = TURKEY.tail[i];
      context.beginPath();
      context.arc(cx - 14, base - 26 + bob, 34 - i * 7, Math.PI * 0.9, Math.PI * 2.1);
      context.fill();
    }
    // Legs.
    context.strokeStyle = TURKEY.leg;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(cx - 8, base - 14);
    context.lineTo(cx - 8 + legSwing, base);
    context.moveTo(cx + 8, base - 14);
    context.lineTo(cx + 8 - legSwing, base);
    context.stroke();
    // Body.
    context.fillStyle = TURKEY.body;
    context.beginPath();
    context.ellipse(cx, base - 26 + bob, 30, 22, 0, 0, Math.PI * 2);
    context.fill();
    // Wing.
    context.fillStyle = TURKEY.wing;
    context.beginPath();
    context.ellipse(cx - 6, base - 24 + bob, 16, 11, -0.4, 0, Math.PI * 2);
    context.fill();
    // Head and beak.
    context.fillStyle = TURKEY.head;
    context.beginPath();
    context.arc(cx + 24, base - 48 + bob, 11, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = TURKEY.beak;
    context.beginPath();
    context.moveTo(cx + 32, base - 50 + bob);
    context.lineTo(cx + 46, base - 45 + bob);
    context.lineTo(cx + 32, base - 42 + bob);
    context.closePath();
    context.fill();
    // Wattle.
    context.fillStyle = TURKEY.wattle;
    context.fillRect(cx + 30, base - 40 + bob, 6, 12);
    // Eye.
    context.fillStyle = '#222';
    context.beginPath();
    context.arc(cx + 27, base - 51 + bob, 2.5, 0, Math.PI * 2);
    context.fill();
    // Hidden: the turkey is tucked into the hay, only the tail shows.
    if (player.hidden) {
      context.fillStyle = pal.hay;
      context.beginPath();
      context.ellipse(cx, base - 8, 44, 22, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  /** The farmer: overalls, a straw hat and a pitchfork, striding after the turkey. */
  function drawFarmer(farmer, player, pal) {
    const x = player.x - farmer.gap;
    if (x < -140 || x > FIELD.width + 40) return;
    const base = FIELD.groundY;
    const swing = Math.sin(farmer.walkPhase) * 12;
    const lunge = farmer.mood === 'lunge' ? 1 : 0;
    // Legs.
    context.strokeStyle = pal.fence;
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(x, base - 52);
    context.lineTo(x - 10 + swing, base);
    context.moveTo(x, base - 52);
    context.lineTo(x + 10 - swing, base);
    context.stroke();
    // Overalls.
    context.fillStyle = '#2e4a6b';
    context.fillRect(x - 16, base - 96, 32, 48);
    // Shirt.
    context.fillStyle = '#3a6ea5';
    context.fillRect(x - 16, base - 118, 32, 24);
    // Arms and pitchfork.
    context.strokeStyle = '#e8b88a';
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(x + 12, base - 110);
    context.lineTo(x + 30 - lunge * 12, base - 130 + lunge * 8);
    context.stroke();
    context.strokeStyle = '#7a4a26';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x + 30 - lunge * 12, base - 60);
    context.lineTo(x + 30 - lunge * 12, base - 138 + lunge * 8);
    context.stroke();
    context.strokeStyle = '#c9ced6';
    context.lineWidth = 3;
    for (let t = -1; t <= 1; t += 1) {
      context.beginPath();
      context.moveTo(x + 30 - lunge * 12 + t * 7, base - 138 + lunge * 8);
      context.lineTo(x + 30 - lunge * 12 + t * 7, base - 156 + lunge * 8);
      context.stroke();
    }
    // Head and straw hat.
    context.fillStyle = '#e8b88a';
    context.beginPath();
    context.arc(x, base - 130, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#d8c98a';
    context.beginPath();
    context.ellipse(x, base - 138, 26, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillRect(x - 11, base - 152, 22, 14);
    // Moustache.
    context.fillStyle = '#6b4423';
    context.fillRect(x + 2, base - 126, 12, 4);
    // A shout bubble when he is chasing or lunging.
    if (farmer.mood === 'chase' || farmer.mood === 'lunge') {
      context.fillStyle = '#fff6e0';
      context.beginPath();
      context.ellipse(x + 58, base - 178, 44, 20, 0, 0, Math.PI * 2);
      context.fill();
      text(farmer.mood === 'lunge' ? 'GOTCHA!' : 'COME BACK!', x + 58, base - 172, 15, '#b5533c', 'center');
    }
  }

  function drawKnife(item) {
    // A falling carving knife, point down: a flat blade over a brown handle.
    const handle = item.height * 0.35;
    context.fillStyle = '#7a4a26';
    context.fillRect(item.x + item.width * 0.4, item.y, item.width * 0.2, handle);
    context.fillStyle = '#e8ecf2';
    context.beginPath();
    context.moveTo(item.x, item.y + handle);
    context.lineTo(item.x + item.width, item.y + handle);
    context.lineTo(item.x + item.width / 2, item.y + item.height);
    context.closePath();
    context.fill();
    // Its shadow on the ground, so the player can see where it will land.
    context.fillStyle = 'rgba(0,0,0,0.25)';
    context.beginPath();
    context.ellipse(item.x + item.width / 2, FIELD.groundY + 6, item.width * 0.7, 5, 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawFence(item, pal) {
    const top = FIELD.groundY - item.height;
    context.fillStyle = pal.fence;
    context.fillRect(item.x, top + 8, item.width, 8);
    context.fillRect(item.x, top + 30, item.width, 8);
    context.fillRect(item.x + 4, top, 8, item.height);
    context.fillRect(item.x + item.width - 12, top, 8, item.height);
  }

  function drawHay(item, pal) {
    const top = FIELD.groundY - item.height;
    context.fillStyle = pal.hay;
    context.beginPath();
    context.ellipse(item.x + item.width / 2, FIELD.groundY, item.width / 2, item.height, 0, Math.PI, 0);
    context.fill();
    context.strokeStyle = pal.hayDark;
    context.lineWidth = 3;
    for (let i = -2; i <= 2; i += 1) {
      context.beginPath();
      context.moveTo(item.x + item.width / 2 + i * 18, FIELD.groundY - 6);
      context.quadraticCurveTo(item.x + item.width / 2 + i * 22, FIELD.groundY - item.height * 0.6, item.x + item.width / 2 + i * 10, FIELD.groundY - item.height + 6);
      context.stroke();
    }
  }

  function drawOven(item, pal) {
    const top = FIELD.groundY - item.height;
    // A low kitchen range: a wide oven the turkey jumps, its door glowing
    // when the fire jets are up.
    context.fillStyle = '#3a3f4a';
    context.fillRect(item.x, top, item.width, item.height);
    context.fillStyle = '#565d6b';
    context.fillRect(item.x + 6, top + 5, item.width - 12, item.height - 10);
    // The door window, glowing when the jets are up.
    const glow = item.jetPhase === 'up';
    context.fillStyle = glow ? '#ff9a3c' : '#2a2118';
    context.fillRect(item.x + 12, top + 14, item.width - 24, 26);
    context.strokeStyle = '#c9ced6';
    context.lineWidth = 3;
    context.strokeRect(item.x + 12, top + 14, item.width - 24, 26);
    // Dials.
    context.fillStyle = '#e8ecf2';
    for (let i = 0; i < 2; i += 1) {
      context.beginPath();
      context.arc(item.x + 22 + i * 26, top + 50, 5, 0, Math.PI * 2);
      context.fill();
    }
    // Fire jets: a warning flicker, then a tall flame.
    if (item.jetPhase !== 'down') {
      const h = item.jetPhase === 'warn' ? 40 : 50;
      const x0 = item.x + 12;
      const x1 = item.x + item.width - 12;
      for (let x = x0; x <= x1; x += 30) {
        context.fillStyle = item.jetPhase === 'warn' ? '#ffb347' : '#ff5a3c';
        context.beginPath();
        context.moveTo(x, top);
        context.quadraticCurveTo(x + 7, top - h * 0.7, x + 15, top - h);
        context.quadraticCurveTo(x + 23, top - h * 0.7, x + 30, top);
        context.closePath();
        context.fill();
        context.fillStyle = '#ffd23f';
        context.beginPath();
        context.moveTo(x + 7, top);
        context.quadraticCurveTo(x + 11, top - h * 0.4, x + 15, top - h * 0.55);
        context.quadraticCurveTo(x + 19, top - h * 0.4, x + 23, top);
        context.closePath();
        context.fill();
      }
    }
  }

  function drawPickups(state) {
    for (const item of state.pickups) {
      if (!item.active) continue;
      const y = item.y + Math.sin(item.bob) * 6;
      if (item.kind === KIND_CORN) {
        context.fillStyle = '#f2c94c';
        context.beginPath();
        context.ellipse(item.x + item.width / 2, y + item.height / 2, item.width / 3, item.height / 2, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#2e7d32';
        context.fillRect(item.x + item.width / 2 - 2, y - 6, 4, 10);
      } else if (item.kind === KIND_PUMPKIN) {
        context.fillStyle = '#d2691e';
        context.beginPath();
        context.ellipse(item.x + item.width / 2, y + item.height / 2, item.width / 2, item.height / 2.4, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#2e7d32';
        context.fillRect(item.x + item.width / 2 - 2, y - 4, 4, 10);
      } else if (item.kind === KIND_FEATHER) {
        context.fillStyle = '#ffd23f';
        context.beginPath();
        context.ellipse(item.x + item.width / 2, y + item.height / 2, 9, 16, 0.5, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawField(state, pal) {
    drawSky(state, pal);
    drawScenery(state, pal);
    drawGround(state, pal);
    for (const item of state.fences) if (item.active) drawFence(item, pal);
    for (const item of state.hays) if (item.active) drawHay(item, pal);
    for (const item of state.ovens) if (item.active) drawOven(item, pal);
    drawPickups(state);
    for (const item of state.knives) if (item.active) drawKnife(item);
    drawFarmer(state.farmer, state.player, pal);
    const player = state.player;
    if (player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1) drawTurkey(player, pal);
  }

  function drawHud(state, pal) {
    context.textBaseline = 'top';
    text(`Score ${Math.floor(state.score)}`, 24, 18, 28, pal.text, 'left');
    const zone = ZONES[state.zone];
    const progress = Math.min(1, state.meters / ESCAPE_METERS);
    const barX = FIELD.width / 2 - 220;
    const barW = 440;
    text(`${zone.name}  ·  ${Math.floor(state.meters)}m to the forest`, FIELD.width / 2, 18, 24, pal.text, 'center');
    context.fillStyle = 'rgba(0,0,0,0.35)';
    context.fillRect(barX, 52, barW, 12);
    context.fillStyle = pal.accent;
    context.fillRect(barX, 52, barW * progress, 12);
    // The forest gate at the bar's end.
    context.fillStyle = pal.tree;
    context.fillRect(barX + barW - 4, 44, 8, 28);
    // Lives as hearts.
    const firstHeart = FIELD.width - 24 - LIVES * (HEART_SIZE + HEART_GAP) + HEART_GAP;
    text('Lives', firstHeart - 12, 18, 28, pal.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      const x = firstHeart + life * (HEART_SIZE + HEART_GAP);
      const y = 24;
      context.fillStyle = life < state.lives ? '#e5534b' : 'rgba(0,0,0,0.35)';
      context.beginPath();
      context.moveTo(x + 11, y + 18);
      context.bezierCurveTo(x, y + 8, x + 2, y, x + 11, y + 5);
      context.bezierCurveTo(x + 20, y, x + 22, y + 8, x + 11, y + 18);
      context.fill();
    }
    // The farmer's mood: how close the chase is.
    const farmer = state.farmer;
    const moodText = farmer.mood === 'lunge' ? 'FARMER: LUNGING!' : farmer.mood === 'chase' ? 'FARMER: CHASING!' : farmer.mood === 'search' ? 'Farmer: searching…' : 'Farmer: calm';
    const moodColor = farmer.mood === 'lunge' ? '#ff5a3c' : farmer.mood === 'chase' ? pal.accent : pal.muted;
    text(moodText, 24, 56, 20, moodColor, 'left');
    text(`Suspicion ${Math.floor(farmer.suspicion)}`, 24, 82, 18, pal.muted, 'left');
  }

  function drawPanel(title, lines, prompt, pal) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(0,0,0,0.45)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = pal.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = pal.accent;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 46, pal.text, 'center');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + PANEL.top + i * PANEL.line, 21, pal.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, pal.accent, 'center');
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    runPhase += 0.18;
    const pal = zonePalette(state.zone);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#1a1210';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state, pal);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        "Gobble's Great Escape",
        [
          'Thanksgiving is coming, and Gobble the turkey is on the menu.',
          'Run from the farmyard to the forest gate — 1400 metres to freedom.',
          'Dodge falling carving knives, jump the fences, mind the oven.',
          'Duck behind haystacks when the farmer gets close. Grab corn.',
          `Best escape: ${Math.floor(best)} points`,
        ],
        'Press Space or click to run  ·  ← → move  ·  Space jump  ·  ↓ duck',
        pal,
      );
      return;
    }
    drawHud(state, pal);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The farmer waits for no turkey — except this one.'], 'Press P or click to keep running', pal);
    } else if (screen === SCREEN_OVER) {
      drawPanel(
        'Caught for dinner!',
        [
          `The farmer got Gobble after ${Math.floor(state.meters)} metres.`,
          `Score ${Math.floor(state.score)}  ·  Best ${Math.floor(best)}`,
          'The oven was already warm. So close — run again!',
        ],
        'Press Space or click to run again',
        pal,
      );
    } else if (screen === SCREEN_ESCAPED) {
      drawPanel(
        'Escaped! Gobble is free!',
        [
          `Gobble made all ${ESCAPE_METERS} metres to the forest gate.`,
          `Score ${Math.floor(state.score)}  ·  Best ${Math.floor(best)}`,
          'No turkey dinner this year. The farmer is still looking.',
        ],
        'Press Space or click to run again',
        pal,
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
