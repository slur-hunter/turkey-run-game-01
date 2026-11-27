// Synthesised sound: every effect is built from oscillators and noise, so the game
// ships no audio files. The context is created on the first user gesture (a browser
// only lets sound start after one); before that, play() is a silent no-op.

let context = null;
let master = null;

export function unlockAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume().catch(() => {});
    return;
  }
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.16;
    master.connect(context.destination);
  } catch {
    context = null;
  }
}

function tone(freq, when, length, type, volume, slideTo) {
  if (!context || !master) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, context.currentTime + when);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, context.currentTime + when + length);
  gain.gain.setValueAtTime(volume, context.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + when + length);
  osc.connect(gain);
  gain.connect(master);
  osc.start(context.currentTime + when);
  osc.stop(context.currentTime + when + length + 0.02);
}

function noise(when, length, volume, low) {
  if (!context || !master) return;
  const size = Math.floor(context.sampleRate * length);
  const buffer = context.createBuffer(1, size, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = low;
  const gain = context.createGain();
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(context.currentTime + when);
}

/** A gobble: three quick low clucks, the turkey's own voice. */
export function playGobble() {
  tone(180, 0, 0.09, 'square', 0.5, 120);
  tone(160, 0.1, 0.09, 'square', 0.5, 110);
  tone(220, 0.2, 0.14, 'square', 0.5, 140);
}

/** A bright chirp when corn is caught. */
export function playPickup() {
  tone(880, 0, 0.09, 'sine', 0.5, 1320);
}

/** A heavy thud when the turkey stumbles. */
export function playHit() {
  noise(0, 0.18, 0.7, 400);
  tone(90, 0, 0.2, 'sine', 0.7, 50);
}

/** A soft whoosh for a jump. */
export function playJump() {
  noise(0, 0.12, 0.25, 1200);
}

/** A short fanfare when the turkey escapes. */
export function playEscape() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, index) => tone(freq, index * 0.13, 0.22, 'triangle', 0.55));
}

/** A low two-note alarm when the farmer spots the turkey. */
export function playSpotted() {
  tone(196, 0, 0.16, 'sawtooth', 0.35, 185);
  tone(185, 0.18, 0.22, 'sawtooth', 0.35, 165);
}
