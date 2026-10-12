// 効果音（8ビットのレトロRPG風）。2D版の音をそのまま引きつぐ。
// iPhone の WebAudio はマナーモードで無音になるため、音を WAV に合成して <audio> で鳴らす（マナーモードでも鳴る）
const SR = 22050, URIS = {}, pool = [];
let poolI = 0, unlocked = false;
const SND_KEY = 'naso3d-snd';
export let soundOn = true;
try { if (localStorage.getItem(SND_KEY) === 'off') soundOn = false; } catch (e) { /* なし */ }

function synth(evs) {
  let len = 0;
  evs.forEach((e) => { len = Math.max(len, e.t + e.d); });
  const N = Math.ceil((len + 0.05) * SR), out = new Float32Array(N);
  evs.forEach((e) => {
    const i0 = Math.floor(e.t * SR), n = Math.floor(e.d * SR), att = e.att || 0.02;
    let ph = 0, z1 = 0, z2 = 0, rnd = 12345 + Math.floor(e.t * 1000);
    for (let i = 0; i < n; i++) {
      const tt = i / SR, pr = tt / e.d, f = e.f0 * Math.pow(e.f1 / e.f0, pr);
      const env = tt < att ? 0.0001 * Math.pow(e.v / 0.0001, tt / att) : e.v * Math.pow(0.0001 / e.v, (tt - att) / Math.max(0.001, e.d - att));
      let x;
      if (e.k === 't') {
        ph += f / SR;
        const u = ph % 1;
        x = e.type === 'square' ? (u < 0.5 ? 1 : -1) * 0.6 : e.type === 'pulse' ? (u < 0.25 ? 1 : -1) * 0.6 : e.type === 'pulse12' ? (u < 0.125 ? 1 : -1) * 0.6
          : e.type === 'sawtooth' ? 2 * u - 1 : e.type === 'triangle' ? 4 * Math.abs(u - 0.5) - 1 : Math.sin(2 * Math.PI * ph);
      } else {
        rnd = (rnd * 1664525 + 1013904223) >>> 0;
        const w = (rnd / 4294967296) * 2 - 1;
        const w0 = (2 * Math.PI * f) / SR, al = Math.sin(w0) / (2 * e.q), c = Math.cos(w0), b0 = al, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
        const y = (b0 / a0) * w - (a1 / a0) * z1 - (a2 / a0) * z2;
        z2 = z1; z1 = y; x = y * 3;
      }
      out[i0 + i] += x * env;
    }
  });
  return out;
}
function wavUri(f) {
  const n = f.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const ws = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, f[i])) * 32767, true);
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let j = 0; j < bytes.length; j += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(j, j + 8192));
  return 'data:audio/wav;base64,' + btoa(bin);
}
const T_ = (t, d, f0, f1, v, type) => ({ k: 't', t, d, f0, f1, v, type: type || 'sine' });
const N_ = (t, d, f0, f1, q, v, att) => ({ k: 'n', t, d, f0, f1, q, v, att });
const NOTE = (() => { const o = {}, nm = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']; for (let oc = 2; oc <= 8; oc++) nm.forEach((n, i) => { o[n + oc] = 440 * Math.pow(2, oc - 4 + (i - 9) / 12); }); return o; })();
const P_ = (t, d, n, v, type) => { const f = NOTE[n]; return T_(t, d, f, f, v, type || 'pulse'); };
const kick = (t) => N_(t, 0.09, 220, 90, 1, 0.14, 0.003);
const snare = (t) => N_(t, 0.11, 3200, 2200, 0.8, 0.1, 0.003);

const SPECS = {
  cursor: [P_(0, 0.06, 'G6', 0.14)],
  clink: [N_(0, 0.05, 6000, 4000, 1.2, 0.8, 0.002), T_(0, 0.3, 2350, 2340, 0.06), T_(0, 0.26, 3420, 3400, 0.04), T_(0, 0.2, 5120, 5100, 0.03), N_(0.07, 0.04, 5000, 3500, 1.2, 0.45, 0.002)],
  tap: [P_(0, 0.08, 'C6', 0.12), P_(0.07, 0.08, 'E6', 0.12), P_(0.14, 0.2, 'G6', 0.12), P_(0, 0.34, 'C5', 0.1, 'triangle'), T_(0.14, 0.3, NOTE.G7, NOTE.G7, 0.02)],
  sparkle: ['E6', 'G6', 'C7', 'E7'].map((n, i) => P_(i * 0.04, 0.12, n, 0.08)).concat([T_(0.12, 0.4, NOTE.E7, NOTE.E7, 0.03)]),
  oops: [P_(0, 0.15, 'G5', 0.14, 'triangle'), T_(0.16, 0.34, NOTE['D#5'], NOTE.D5, 0.14, 'triangle'), T_(0.16, 0.34, NOTE['D#4'], NOTE.D4, 0.04, 'pulse12')],
  munch: [0, 0.22, 0.44].reduce((a, t) => a.concat([N_(t, 0.07, 2200, 1400, 1.5, 0.6, 0.003), P_(t, 0.06, 'A3', 0.1)]), []),
  yum: [P_(0, 0.1, 'G5', 0.1), P_(0.09, 0.1, 'C6', 0.1), P_(0.18, 0.1, 'E6', 0.1), P_(0.27, 0.4, 'G6', 0.1), T_(0.27, 0.4, NOTE.G7, NOTE.G7, 0.03), P_(0, 0.6, 'C4', 0.08, 'triangle')],
  gold: [P_(0, 0.07, 'A6', 0.12), P_(0.06, 0.42, 'E7', 0.12), T_(0.06, 0.42, NOTE.E8, NOTE.E8, 0.025), T_(0.06, 0.42, NOTE.B7, NOTE.B7, 0.03)],
  swish: [N_(0, 0.16, 700, 4200, 1.4, 0.7, 0.06), N_(0.15, 0.1, 4200, 1500, 1.4, 0.4, 0.005)],
  hit: [N_(0, 0.09, 1800, 400, 1.2, 0.9, 0.002), P_(0, 0.08, 'C4', 0.16, 'square'), P_(0.05, 0.1, 'G3', 0.12, 'square')],
  hurt: [P_(0, 0.08, 'E4', 0.14, 'square'), P_(0.07, 0.08, 'C4', 0.14, 'square'), N_(0, 0.12, 900, 300, 1, 0.5, 0.002)],
  sizzle: [N_(0, 0.75, 6500, 5000, 0.7, 0.45, 0.03)].concat([0.05, 0.13, 0.2, 0.31, 0.38, 0.5, 0.58].map((t, i) => N_(t, 0.02, 3000 + i * 400, 2500, 2, 0.5, 0.001))),
  buy: [P_(0, 0.06, 'C6', 0.12), P_(0.07, 0.06, 'E6', 0.12), P_(0.15, 0.07, 'A6', 0.12), P_(0.21, 0.42, 'E7', 0.12), T_(0.21, 0.42, NOTE.B7, NOTE.B7, 0.03)],
  encounter: ['C5', 'E5', 'G5', 'C6', 'E5', 'G5', 'C6', 'E6'].map((n, i) => P_(i * 0.055, 0.07, n, 0.1, i % 2 ? 'pulse12' : 'pulse')).concat([P_(0.44, 0.3, 'G6', 0.1)]),
  ok: [P_(0, 0.07, 'C6', 0.12), P_(0.07, 0.2, 'G6', 0.12)],
  ng: [P_(0, 0.2, 'G3', 0.14, 'pulse12'), T_(0.18, 0.26, NOTE.D3, NOTE['C#3'], 0.14, 'pulse12')],
  win: (() => {
    const e = [kick(0), snare(0.24), kick(0.48), snare(0.66)];
    [['E6', 0, 0.1], ['G6', 0.12, 0.1], ['C7', 0.24, 0.22], ['B6', 0.48, 0.08], ['C7', 0.58, 0.08], ['E7', 0.68, 0.6]].forEach((x) => e.push(P_(x[1], x[2], x[0], 0.11)));
    [['C6', 0.68, 0.6], ['G6', 0.68, 0.6]].forEach((x) => e.push(P_(x[1], x[2], x[0], 0.05, 'pulse12')));
    [['C4', 0, 0.24], ['G3', 0.24, 0.24], ['A3', 0.48, 0.2], ['C4', 0.68, 0.7]].forEach((x) => e.push(P_(x[1], x[2], x[0], 0.16, 'triangle')));
    return e;
  })(),
  lose: (() => {
    const e = [];
    [['G5', 0, 0.16], ['E5', 0.18, 0.16], ['C5', 0.36, 0.16], ['D5', 0.56, 0.55]].forEach((x) => { e.push(P_(x[1], x[2], x[0], 0.12, 'triangle')); e.push(P_(x[1], x[2], x[0], 0.03, 'pulse12')); });
    [['C4', 0, 0.5], ['G3', 0.56, 0.6]].forEach((x) => e.push(P_(x[1], x[2], x[0], 0.1, 'triangle')));
    return e;
  })(),
  fanfare: (() => {
    const e = [snare(0), snare(0.06), snare(0.12)];
    [['E5', 0.2, 0.1], ['G5', 0.3, 0.1], ['C6', 0.4, 0.3], ['D6', 0.74, 0.1], ['C6', 0.84, 0.1], ['A5', 0.94, 0.24], ['B5', 1.22, 0.12], ['D6', 1.34, 0.12], ['G6', 1.46, 0.42]].forEach((x) => e.push(P_(x[1], x[2], x[0], 0.11)));
    [['C5', 0.4, 0.3], ['F5', 0.94, 0.24], ['B5', 1.46, 0.42]].forEach((x) => e.push(P_(x[1], x[2], x[0], 0.05, 'pulse12')));
    [['C3', 0.2, 0.52], ['F3', 0.74, 0.46], ['G3', 1.22, 0.66], ['C3', 1.94, 1.1]].forEach((x) => e.push(P_(x[1], x[2], x[0], 0.17, 'triangle')));
    ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => e.push(P_(1.94 + i * 0.03, 1.1, n, 0.07, i % 2 ? 'pulse12' : 'pulse')));
    [0.2, 0.74, 1.22, 1.94].forEach((t) => e.push(kick(t)));
    [0.47, 1.0, 1.7].forEach((t) => e.push(snare(t)));
    return e;
  })(),
};
const LEVEL = { cursor: 0.5, clink: 0.7, tap: 0.6, sparkle: 0.5, oops: 0.6, munch: 0.6, yum: 0.55, gold: 0.55, swish: 0.7, hit: 0.7, hurt: 0.6, sizzle: 0.5, buy: 0.55, encounter: 0.6, ok: 0.55, ng: 0.55, win: 0.7, lose: 0.6, fanfare: 0.8 };

function getUri(name) {
  if (URIS[name]) return URIS[name];
  const f = synth(SPECS[name]);
  let m = 0;
  for (let i = 0; i < f.length; i++) m = Math.max(m, Math.abs(f[i]));
  const g = m > 0 ? LEVEL[name] / m : 1;
  for (let i = 0; i < f.length; i++) f[i] *= g;
  return (URIS[name] = wavUri(f));
}
function mkAudio() { const a = new Audio(); a.preload = 'auto'; return a; }

export function play(name) {
  if (!soundOn || !SPECS[name]) return;
  try {
    if (!pool.length) for (let i = 0; i < 4; i++) pool.push(mkAudio());
    const a = pool[poolI++ % pool.length];
    a.src = getUri(name);
    a.currentTime = 0;
    const pr = a.play();
    if (pr && pr.catch) pr.catch(() => {});
  } catch (e) { /* 鳴らなくても動く */ }
}

function unlock() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* なし */ }
  try {
    if (!pool.length) for (let i = 0; i < 4; i++) pool.push(mkAudio());
    const u = getUri('cursor');
    pool.forEach((a) => {
      a.src = u; a.muted = true;
      const pr = a.play();
      if (pr && pr.then) pr.then(() => { a.pause(); a.muted = false; unlocked = true; }).catch(() => { a.muted = false; });
    });
  } catch (e) { /* なし */ }
}
['pointerdown', 'touchend', 'click'].forEach((ev) => document.addEventListener(ev, () => { if (!unlocked) unlock(); }, true));

export function setSound(on) {
  soundOn = on;
  try { localStorage.setItem(SND_KEY, on ? 'on' : 'off'); } catch (e) { /* なし */ }
  if (on) { unlocked = false; unlock(); setTimeout(() => play('gold'), 60); }
}
