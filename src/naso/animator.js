import { smooth, clamp01 } from './geom.js';

// 動きは「休みの姿勢からのずれ」で書く。関節の名前は model-proto.js の JOINTS と同じ。
// モデルを GLB に差し替えても、関節の名前がそろっていればこのまま動く。
//   sword   … 'back'（背中）か 'hand'（右手に持つ）。書いていなければ、そのときの持ち方のまま
//   glasses … t → メガネのずれ（0〜1）
const KEYS = [
  'root.py', 'root.pz', 'root.ry', 'root.sq', 'hips.py', 'spine.rx', 'spine.rz', 'spine.sy', 'head.rx', 'head.ry', 'head.rz',
  'armL.rx', 'armL.rz', 'armR.rx', 'armR.rz', 'foreL.rx', 'foreL.rz', 'foreR.rx', 'foreR.rz', 'legL.rx', 'legR.rx',
];
const zero = () => Object.fromEntries(KEYS.map((k) => [k, 0]));
const TAU = Math.PI * 2;

// 待機：息をして、ときどき首をかしげたり横を見たりする（tt は通しの時計）
function idlePose(t, P, tt) {
  const br = Math.sin(tt * 2.1);
  P['spine.sy'] = 0.01 * br;
  P['hips.py'] = -0.004 * (1 - br);
  P['spine.rz'] = 0.012 * Math.sin(tt * 0.55 + 0.5);
  P['head.rz'] = 0.035 * Math.sin(tt * 0.55);
  P['head.rx'] = 0.015 * Math.sin(tt * 1.05 + 1);
  P['head.ry'] = 0.18 * Math.sin(tt * 0.31) * Math.sin(tt * 0.17);
  P['armL.rz'] = 0.02 * br;
  P['armR.rz'] = -0.02 * br;
}

// 剣をふる（u: 0〜1）。0〜0.45 で頭の上へふりかぶり、0.45〜0.6 でふりおろす
function swingPose(P, u, lunge = 0) {
  const up = smooth(0, 0.42, u) * (1 - smooth(0.45, 0.58, u));
  const down = smooth(0.45, 0.58, u) * (1 - smooth(0.7, 1, u));
  P['armR.rx'] += -2.7 * up - 0.5 * down;
  P['armR.rz'] += 0.15 * up;
  P['foreR.rx'] += -0.3 * up;
  P['spine.rx'] += -0.12 * up + 0.22 * down;
  P['head.rx'] += -0.08 * up + 0.08 * down;
  P['armL.rx'] += 0.2 * up - 0.3 * down;
  P['root.pz'] += lunge * down;
}
const swingMouth = (u) => (u > 0.45 && u < 0.65 ? 'open' : 'smile');

export const CLIPS = {
  idle: { loop: true, sword: 'back', pose: idlePose, face: () => ({ eyes: 'normal', mouth: 'smile' }) },

  // 手をふる（なその左手＝画面の右）
  wave: {
    dur: 3.4,
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const k = smooth(0, 0.35, t) * (1 - smooth(this.dur - 0.45, this.dur, t));
      P['armL.rz'] += 2.45 * k;
      P['armL.rx'] += 0.35 * k; // 上げた腕を少し前へ（頭の後ろに隠れないように）
      P['foreL.rz'] += (0.3 + 0.42 * Math.sin(t * 10)) * k;
      P['armR.rz'] -= 0.06 * k;
      P['spine.rz'] += (-0.035 + 0.02 * Math.sin(t * 5)) * k;
      P['head.rz'] += (-0.08 + 0.025 * Math.sin(t * 5)) * k;
      P['head.ry'] *= 1 - k;
    },
    face: (t) => ({ eyes: 'smile', mouth: t > 0.25 && t < 3.0 ? 'grin' : 'smile' }),
  },

  // ジャンプ：しゃがむ → とぶ（バンザイ） → 着地でつぶれる → もどる
  jump: {
    dur: 1.5,
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const crouch = smooth(0, 0.24, t) * (1 - smooth(0.26, 0.34, t));
      const a = (t - 0.32) / 0.62, air = a > 0 && a < 1;
      const h = air ? 4 * a * (1 - a) : 0;
      const land = t > 0.94 && t < 1.22 ? Math.sin((Math.PI * (t - 0.94)) / 0.28) : 0;
      const up = air ? smooth(0, 0.22, a) * (1 - smooth(0.72, 1, a)) : 0;
      P['root.py'] = 0.5 * h;
      P['root.sq'] = -0.09 * crouch - 0.1 * land + (air ? 0.07 * (1 - smooth(0, 0.4, a)) : 0);
      P['hips.py'] -= 0.04 * crouch + 0.03 * land;
      P['spine.rx'] += 0.14 * crouch + 0.08 * land - 0.06 * up;
      P['armL.rx'] += 0.55 * crouch;
      P['armR.rx'] += 0.55 * crouch;
      P['armL.rz'] += 2.3 * up;
      P['armR.rz'] -= 2.3 * up;
      P['foreL.rz'] += 0.3 * up;
      P['foreR.rz'] -= 0.3 * up;
      if (air) {
        const tuck = Math.sin(Math.PI * a);
        P['legL.rx'] -= 0.45 * tuck;
        P['legR.rx'] -= 0.35 * tuck;
      }
      P['head.rx'] -= 0.12 * up;
    },
    face: (t) => (t < 0.3 ? { eyes: 'normal', mouth: 'smile' } : t < 1.0 ? { eyes: 'smile', mouth: 'open' } : { eyes: 'smile', mouth: 'grin' }),
  },

  // 小さくぴょん
  hop: {
    dur: 0.85,
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const a = t / 0.42, air = a < 1, h = air ? 4 * a * (1 - a) : 0;
      const land = !air && t < 0.65 ? Math.sin((Math.PI * (t - 0.42)) / 0.23) : 0;
      P['root.py'] = 0.2 * h;
      P['root.sq'] = (air ? 0.05 * Math.sin(Math.PI * a) : 0) - 0.07 * land;
      P['armL.rz'] += 0.9 * h;
      P['armR.rz'] -= 0.9 * h;
      P['head.rx'] -= 0.08 * h;
    },
    face: (t) => (t < 0.5 ? { eyes: 'wide', mouth: 'o', brows: 'up' } : { eyes: 'smile', mouth: 'grin' }),
  },

  // 歩く
  walk: {
    loop: true,
    sword: 'back',
    pose(t, P, tt) {
      const w = t * 9.5, s = Math.sin(w);
      P['legL.rx'] = 0.45 * s;
      P['legR.rx'] = -0.45 * s;
      P['armL.rx'] = -0.35 * s;
      P['armR.rx'] = 0.35 * s;
      P['root.py'] = 0.035 * Math.abs(Math.cos(w));
      P['spine.rz'] = 0.03 * s;
      P['spine.rx'] = 0.04;
      P['head.rz'] = -0.02 * s;
      P['spine.sy'] = 0.008 * Math.sin(tt * 2.1);
    },
    face: () => ({ eyes: 'normal', mouth: 'smile' }),
  },

  // 何か見つけた：ぴょんとして、右手で指さす
  find: {
    dur: 1.6,
    sword: 'back',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const h = t < 0.35 ? Math.sin((Math.PI * t) / 0.35) : 0;
      const k = smooth(0.2, 0.45, t) * (1 - smooth(1.3, 1.6, t));
      P['root.py'] = 0.12 * h;
      P['armR.rx'] = -1.3 * k;
      P['armR.rz'] += 0.15 * k;
      P['head.rx'] = 0.1 * k;
    },
    face: (t) => (t < 0.5 ? { eyes: 'wide', mouth: 'o', brows: 'up' } : { eyes: 'smile', mouth: 'grin' }),
  },

  // 食べる：右手を口へ、もぐもぐ
  eat: {
    dur: 2.4,
    sword: 'back',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const k = smooth(0, 0.3, t) * (1 - smooth(2.1, 2.4, t)), c = Math.sin(t * 9);
      P['armR.rx'] = -0.7 * k;
      P['foreR.rx'] = (-1.5 + 0.25 * c) * k;
      P['armR.rz'] += 0.25 * k;
      P['head.rx'] = (0.06 + 0.04 * c) * k;
    },
    face: (t) => ({ eyes: 'smile', mouth: Math.floor(t * 6) % 2 && t < 2.1 ? 'o' : 'smile' }),
  },

  // 料理：鍋をぐるぐる
  cook: {
    loop: true,
    sword: 'back',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const c = t * 5;
      P['armR.rx'] = -0.85 + 0.12 * Math.sin(c);
      P['armR.rz'] += 0.12 * Math.cos(c);
      P['foreR.rx'] = -0.5;
      P['armL.rx'] = -0.4;
      P['foreL.rx'] = -0.8;
      P['spine.rx'] = 0.12;
      P['head.rx'] = 0.18;
    },
    face: () => ({ eyes: 'smile', mouth: 'smile' }),
  },

  // 修行：わら人形に向かって素振り
  train: {
    loop: true,
    sword: 'hand',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      swingPose(P, (t % 1.5) / 1.5, 0.08);
    },
    face: (t) => ({ eyes: 'normal', mouth: swingMouth((t % 1.5) / 1.5) }),
  },

  // バトル：かまえ
  ready: {
    loop: true,
    sword: 'hand',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const b = Math.sin(tt * 3.2);
      P['hips.py'] = -0.03 + 0.012 * b;
      P['armR.rx'] = -0.5;
      P['armR.rz'] -= 0.1;
      P['foreR.rx'] = -0.4;
      P['spine.rx'] = 0.06;
      P['legL.rx'] = -0.15;
      P['legR.rx'] = 0.15;
    },
    face: () => ({ eyes: 'normal', mouth: 'smile' }),
  },
  // たたかう（0.52秒あたりで当たる）
  attack: {
    dur: 1.0,
    sword: 'hand',
    next: 'ready',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      swingPose(P, t / this.dur, 0.45);
    },
    face: (t) => ({ eyes: 'normal', mouth: swingMouth(t) }),
  },
  // とくぎ：くるっとまわってから斬る（0.85秒あたりで当たる）
  skill: {
    dur: 1.4,
    sword: 'hand',
    next: 'ready',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const u = t / this.dur;
      P['root.ry'] = TAU * smooth(0.02, 0.3, u);
      P['root.py'] = 0.15 * Math.sin(Math.PI * clamp01(u / 0.3));
      swingPose(P, clamp01((u - 0.2) / 0.8), 0.5);
    },
    face: (t) => ({ eyes: t < 0.4 ? 'smile' : 'normal', mouth: t > 0.7 && t < 1.0 ? 'open' : 'grin' }),
  },
  // こうげきを受けた
  hurt: {
    dur: 0.6,
    next: 'ready',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const k = Math.sin(Math.PI * Math.min(1, t / 0.6));
      P['root.pz'] = -0.15 * k;
      P['spine.rx'] = -0.2 * k;
      P['head.rx'] = -0.15 * k;
      P['armL.rz'] += 0.4 * k;
      P['armR.rz'] -= 0.4 * k;
    },
    face: () => ({ eyes: 'closed', mouth: 'o', brows: 'sad' }),
  },
  // 勝った：剣を高くかかげる
  victory: {
    dur: 2.2,
    sword: 'hand',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const k = smooth(0, 0.3, t) * (1 - smooth(1.9, 2.2, t));
      const h = t < 0.45 ? Math.sin((Math.PI * t) / 0.45) : 0;
      P['root.py'] = 0.18 * h;
      P['armR.rz'] -= 2.5 * k;
      P['armR.rx'] += 0.2 * k;
      P['armL.rz'] += 0.3 * k;
      P['head.rx'] -= 0.08 * k;
    },
    face: () => ({ eyes: 'smile', mouth: 'grin' }),
  },
  // つかれて座りこむ（負けたとき。でも笑顔）
  tired: {
    loop: true,
    sword: 'back',
    pose(t, P, tt) {
      const k = smooth(0, 0.5, t), br = Math.sin(tt * 1.6);
      P['hips.py'] = -0.2 * k;
      P['legL.rx'] = -1.2 * k;
      P['legR.rx'] = -1.2 * k;
      P['spine.rx'] = (-0.05 + 0.02 * br) * k;
      P['spine.sy'] = 0.01 * br;
      P['armL.rz'] = 0.5 * k;
      P['armR.rz'] = -0.5 * k;
      P['head.rz'] = 0.12 * k;
      P['head.rx'] = 0.08 * k;
    },
    face: () => ({ eyes: 'smile', mouth: 'smile' }),
  },
  // こまる（にがてな食べもの）：怒らない
  troubled: {
    dur: 2.4,
    sword: 'back',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const k = smooth(0, 0.3, t) * (1 - smooth(2.1, 2.4, t));
      P['head.rz'] += 0.16 * k;
      P['head.rx'] += 0.06 * k;
      P['armL.rx'] = -0.5 * k;
      P['armR.rx'] = -0.5 * k;
      P['armL.rz'] -= 0.25 * k;
      P['armR.rz'] += 0.25 * k;
      P['foreL.rx'] = -0.4 * k;
      P['foreR.rx'] = -0.4 * k;
      P['spine.rz'] += 0.03 * Math.sin(t * 3) * k;
    },
    face: () => ({ eyes: 'normal', mouth: 'wavy', brows: 'sad' }),
  },
  // よろこぶ（レベルアップ・新しいレシピ）
  happy: {
    dur: 1.6,
    sword: 'back',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const fade = 1 - smooth(1.3, 1.6, t);
      const up = smooth(0, 0.2, t) * fade;
      P['root.py'] = 0.12 * Math.abs(Math.sin((t * Math.PI) / 0.4)) * fade;
      P['armL.rz'] += 2.2 * up;
      P['armR.rz'] -= 2.2 * up;
      P['foreL.rz'] += 0.3 * up;
      P['foreR.rz'] -= 0.3 * up;
    },
    face: () => ({ eyes: 'smile', mouth: 'grin' }),
  },
  // 照れる：頭の後ろに手をやる
  shy: {
    dur: 2.2,
    sword: 'back',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const k = smooth(0, 0.35, t) * (1 - smooth(1.8, 2.2, t));
      P['armL.rz'] += 2.5 * k;
      P['armL.rx'] -= 0.3 * k;
      P['foreL.rz'] += 1.0 * k;
      P['head.rz'] += (-0.1 + 0.03 * Math.sin(t * 6)) * k;
      P['spine.rz'] += 0.02 * Math.sin(t * 6) * k;
    },
    face: () => ({ eyes: 'smile', mouth: 'smile', brows: 'sad' }),
  },
  // ハイタッチ
  hifive: {
    dur: 1.7,
    sword: 'back',
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const k = smooth(0, 0.25, t) * (1 - smooth(1.3, 1.7, t));
      const tap = t > 0.45 && t < 0.75 ? Math.sin((Math.PI * (t - 0.45)) / 0.3) : 0;
      P['armL.rz'] += 2.4 * k;
      P['armL.rx'] += 0.55 * k + 0.25 * tap;
      P['foreL.rz'] += 0.2 * k;
      P['root.py'] = 0.06 * tap;
    },
    face: (t) => ({ eyes: 'smile', mouth: t > 0.4 ? 'grin' : 'smile' }),
  },
  // メガネがずれる
  glasses: {
    dur: 2.4,
    sword: 'back',
    glasses: (t) => smooth(0, 0.2, t) * (1 - smooth(1.9, 2.3, t)),
    pose(t, P, tt) {
      idlePose(t, P, tt);
      const k = smooth(0, 0.2, t) * (1 - smooth(1.9, 2.3, t));
      P['armL.rx'] = (-0.6 + 0.25 * Math.sin(t * 12)) * k;
      P['armR.rx'] = (-0.6 - 0.25 * Math.sin(t * 12)) * k;
      P['foreL.rx'] = -0.4 * k;
      P['foreR.rx'] = -0.4 * k;
      P['head.rx'] = 0.1 * k;
    },
    face: (t) => (t > 0.15 && t < 2.0 ? { eyes: 'wide', mouth: 'o', brows: 'up', bare: true } : { eyes: 'normal', mouth: 'smile' }),
  },
};

export class Animator {
  constructor(model) {
    this.model = model;
    this.rest = {};
    for (const [k, o] of Object.entries(model.joints)) this.rest[k] = { p: o.position.clone(), r: o.rotation.clone() };
    this.name = 'idle';
    this.t = 0;
    this.clock = 0;
    this.pose = zero();
    this.from = null;
    this.fade = 1;
    this.blinkIn = 2 + Math.random() * 2;
    this.blinkLeft = 0;
    this.slip = 0;
    this.onEnd = null;
    this.sword('back');
  }

  sword(mode) {
    if (this.model.props && this.model.props.setSword) this.model.props.setSword(mode);
  }

  play(name) {
    const c = CLIPS[name];
    if (!c) return false;
    this.from = { ...this.pose };
    this.fade = 0;
    this.name = name;
    this.t = 0;
    if (c.sword) this.sword(c.sword);
    return true;
  }

  get lift() {
    return Math.max(0, this.pose['root.py']);
  }

  update(dt) {
    this.t += dt;
    this.clock += dt;
    let clip = CLIPS[this.name];
    if (!clip.loop && this.t >= clip.dur) {
      const done = this.name;
      this.play(clip.next || 'idle');
      clip = CLIPS[this.name];
      if (this.onEnd) this.onEnd(done);
    }
    const P = zero();
    clip.pose(this.t, P, this.clock);
    if (this.fade < 1) {
      this.fade = Math.min(1, this.fade + dt / 0.2);
      const w = smooth(0, 1, this.fade);
      for (const k of KEYS) P[k] = this.from[k] + (P[k] - this.from[k]) * w;
    }
    this.pose = P;
    this.apply(P);

    const slip = clip.glasses ? clip.glasses(this.t) : 0;
    if (slip !== this.slip && this.model.props && this.model.props.setGlasses) {
      this.model.props.setGlasses(slip);
      this.slip = slip;
    }

    // 表情とまばたき（ふつうの目のときだけ、ときどき閉じる）
    const f = { eyes: 'normal', mouth: 'smile', brows: 'normal', bare: false, ...clip.face(this.t) };
    if (f.eyes === 'normal') {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0) {
        this.blinkLeft = 0.13;
        this.blinkIn = 2.4 + Math.random() * 3.2;
      }
    }
    if (this.blinkLeft > 0) {
      this.blinkLeft -= dt;
      if (f.eyes === 'normal') f.eyes = 'closed';
    }
    this.model.face.set(f);
  }

  apply(P) {
    const J = this.model.joints, R = this.rest;
    J.root.position.y = R.root.p.y + P['root.py'];
    J.root.position.z = R.root.p.z + P['root.pz'];
    J.root.rotation.y = R.root.r.y + P['root.ry'];
    const sq = P['root.sq'];
    J.root.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    J.hips.position.y = R.hips.p.y + P['hips.py'];
    J.spine.rotation.x = R.spine.r.x + P['spine.rx'];
    J.spine.rotation.z = R.spine.r.z + P['spine.rz'];
    J.spine.scale.y = 1 + P['spine.sy'];
    J.head.rotation.set(R.head.r.x + P['head.rx'], R.head.r.y + P['head.ry'], R.head.r.z + P['head.rz']);
    for (const s of ['L', 'R']) {
      const arm = J['arm' + s], ra = R['arm' + s];
      arm.rotation.x = ra.r.x + P['arm' + s + '.rx'];
      arm.rotation.z = ra.r.z + P['arm' + s + '.rz'];
      const fore = J['fore' + s], rf = R['fore' + s];
      fore.rotation.x = rf.r.x + P['fore' + s + '.rx'];
      fore.rotation.z = rf.r.z + P['fore' + s + '.rz'];
      // 肩当ては腕の3割だけついていく
      const sh = J['shoulder' + s], rs = R['shoulder' + s];
      sh.rotation.z = rs.r.z + 0.3 * P['arm' + s + '.rz'];
      sh.rotation.x = rs.r.x + 0.3 * P['arm' + s + '.rx'];
      J['leg' + s].rotation.x = R['leg' + s].r.x + P['leg' + s + '.rx'];
    }
  }
}
