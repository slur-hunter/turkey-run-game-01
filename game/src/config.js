// Gobble's Great Escape: every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Pixels of scroll per metre of escape distance. */
export const PX_PER_METER = 20;
/** The forest gate: reach this many metres and the turkey is free. */
export const ESCAPE_METERS = 1400;

export const PLAYER = {
  width: 64,
  height: 56,
  minX: 140,
  maxX: 640,
  jumpVelocity: 900,
  gravity: 1700,
  invulnerable: 1.6,
  duckHeight: 34,
};

export const RUN = {
  base: 260,
  sprint: 350,
  slow: 170,
  stumble: 170,
  cornBoost: 26,
  boostDecay: 30,
};

export const LIVES = 3;

/** The farmer's gap behind the turkey, in pixels: 0 means caught. */
export const FARMER = {
  startGap: 340,
  lungeGap: 70,
  stumbleLoss: 30,
  patrolSpeed: 245,
  chaseSpeed: 320,
  searchSpeed: 140,
  chaseAt: 60,
  suspicionRise: 10,
  suspicionClose: 15,
  suspicionFall: 45,
  suspicionCool: 15,
};

export const KNIFE = {
  width: 26,
  height: 64,
  fallSpeed: 430,
  fallPerZone: 45,
  interval: 1.4,
  intervalScale: 0.9,
  minInterval: 0.6,
  points: 5,
};

export const FENCE = {
  width: 54,
  height: 56,
  interval: 2.6,
  intervalJitter: 1.4,
};

export const HAY = {
  width: 110,
  height: 64,
  interval: 5.5,
  intervalJitter: 2.5,
};

export const OVEN = {
  width: 70,
  height: 60,
  jetInterval: 2.2,
  jetWarn: 0.55,
  jetUp: 0.7,
};

export const PICKUP = {
  cornSize: 26,
  cornPoints: 10,
  cornInterval: 1.15,
  cornJitter: 0.7,
  pumpkinPoints: 25,
  pumpkinInterval: 14,
  featherPoints: 50,
  featherInterval: 26,
};

export const ZONES = [
  { name: 'Farmyard', from: 0, to: 350 },
  { name: 'Barn', from: 350, to: 750 },
  { name: 'Kitchen', from: 750, to: 1150 },
  { name: 'Forest Gate', from: 1150, to: 1400 },
];

/** One palette per zone, so the run reads as a journey from farmyard to kitchen. */
export const PALETTES = {
  farmyard: {
    skyTop: '#f7b733', skyBottom: '#fc4a1a', sun: '#fff3b0', cloud: '#ffe9c9',
    hills: '#8a6d3b', hillsFar: '#a8874f', ground: '#7a5a2e', groundTop: '#c98f3d',
    fence: '#6b4423', hay: '#e8b64c', hayDark: '#c98f2e', tree: '#4e7a3a', treeDark: '#3a5c2c',
    house: '#b5533c', houseRoof: '#7a3b2e', barn: '#a03d2d', panel: '#2b1d12',
    text: '#fff6e0', muted: '#e8c9a0', accent: '#ffd23f', danger: '#e63946',
  },
  barn: {
    skyTop: '#e8935a', skyBottom: '#b34a2e', sun: '#ffe1a8', cloud: '#f2c9a0',
    hills: '#6d4c2f', hillsFar: '#8a6742', ground: '#5f4526', groundTop: '#a87a3f',
    fence: '#54341c', hay: '#e8b64c', hayDark: '#c98f2e', tree: '#3f6b32', treeDark: '#2f5226',
    house: '#96422f', houseRoof: '#5f2d22', barn: '#8a3325', panel: '#241610',
    text: '#fff6e0', muted: '#e8c9a0', accent: '#ffd23f', danger: '#e63946',
  },
  kitchen: {
    skyTop: '#5a3a5e', skyBottom: '#2e1a33', sun: '#ffb347', cloud: '#7a5570',
    hills: '#3d2a40', hillsFar: '#4a3348', ground: '#4a2f28', groundTop: '#7a4a35',
    fence: '#3a241c', hay: '#c99a4a', hayDark: '#a87a30', tree: '#2e4a2e', treeDark: '#223822',
    house: '#6b3a2e', houseRoof: '#452620', barn: '#5f2a22', panel: '#1d1016',
    text: '#fff6e0', muted: '#e8c9a0', accent: '#ffd23f', danger: '#ff5a3c',
  },
  forest: {
    skyTop: '#2e6b4f', skyBottom: '#7ab648', sun: '#fff3b0', cloud: '#dff0d8',
    hills: '#2a5238', hillsFar: '#3a6b46', ground: '#4a3a22', groundTop: '#6b8f3f',
    fence: '#4a3220', hay: '#d8a94c', hayDark: '#b8892e', tree: '#2e5c2e', treeDark: '#1e4222',
    house: '#7a4a30', houseRoof: '#54341f', barn: '#6b3a28', panel: '#12241a',
    text: '#fff6e0', muted: '#d8e8c9', accent: '#ffd23f', danger: '#e63946',
  },
};

export const TURKEY = {
  body: '#8a5230', bodyDark: '#6b3d22', tail: ['#c96a2e', '#e8a33c', '#d2691e'],
  head: '#f2e8d5', beak: '#e8a33c', wattle: '#e5534b', leg: '#e8a33c',
  wing: '#5f3a1e',
};

export const FARMER_COLORS = {
  skin: '#e8b88a', shirt: '#3a6ea5', overalls: '#2e4a6b', hat: '#d8c98a',
  hatBand: '#6b4423', boots: '#4a3220', fork: '#c9ced6', forkHandle: '#7a4a26',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobbles-great-escape.best';
