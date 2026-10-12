// なそが自分で過ごすための「考え」。いえ と おさんぽ で別々に持つ。

// まっすぐ行けないときは、広場のまん中を経由して歩く
export function walkVia(actor, world, x, z, cb) {
  if (world.clearPath(actor.x, actor.z, x, z)) {
    actor.walkTo(x, z, cb);
    return;
  }
  const mid = world.hub || { x: 0, z: 0.2 };
  actor.walkTo(mid.x, mid.z, () => actor.walkTo(x, z, cb));
}

// いえ：歩きまわる・わら人形で修行・かまどで料理
export class HomeBrain {
  constructor(actor, world) {
    this.a = actor;
    this.w = world;
    this.wait = 2.5;
    this.task = null;
    this.paused = false;
  }
  pause() {
    this.paused = true;
    this.task = null;
  }
  resume(wait = 2) {
    this.paused = false;
    this.wait = wait;
    this.task = null;
  }
  update(dt) {
    if (this.paused) return;
    if (this.task) {
      if (this.a.moving) return;
      this.task.left -= dt;
      if (this.task.left <= 0) {
        this.task = null;
        this.a.naso.play('idle');
        this.wait = 2 + Math.random() * 3;
      }
      return;
    }
    if (this.a.moving) return;
    this.wait -= dt;
    if (this.wait > 0) return;
    const r = Math.random();
    if (r < 0.2) this.goDo('train', 8 + Math.random() * 6);
    else if (r < 0.32) this.goDo('cook', 5 + Math.random() * 3);
    else {
      const p = this.w.randomPoint(this.a);
      if (p) this.a.walkTo(p.x, p.z, () => { this.wait = 1.5 + Math.random() * 3.5; });
      else this.wait = 1;
    }
  }
  goDo(kind, secs) {
    const s = this.w.spots[kind];
    const task = (this.task = { kind, left: 1e9 });
    walkVia(this.a, this.w, s.x, s.z, () => {
      if (this.task !== task) return;
      this.a.face(...s.face);
      this.a.naso.play(kind);
      task.left = secs;
    });
  }
}

// おさんぽ：まだ見つけていない場所へ歩いていき、見つけたら立ち止まって教える。ときどき魔物
export class OutingBrain {
  constructor(actor, world, { spots, onFind, onEncounter }) {
    this.a = actor;
    this.w = world;
    this.spots = spots;
    this.onFind = onFind;
    this.onEncounter = onEncounter;
    this.wait = 1.2;
    this.waitFind = 0;
    this.paused = false;
    this.encIn = 14 + Math.random() * 12;
  }
  pause() {
    this.paused = true;
  }
  resume(wait = 1.2) {
    this.paused = false;
    this.wait = wait;
  }
  picked() {
    if (this.waitFind > 0) this.waitFind = Math.min(this.waitFind, 0.8);
  }
  update(dt) {
    if (this.paused) return;
    if (this.waitFind > 0) {
      this.waitFind -= dt;
      if (this.waitFind <= 0) this.wait = 0.4;
      return;
    }
    if (this.a.moving) {
      this.encIn -= dt;
      if (this.encIn <= 0) {
        this.encIn = 20 + Math.random() * 18;
        this.onEncounter();
      }
      return;
    }
    this.wait -= dt;
    if (this.wait > 0) return;
    const hidden = this.spots.filter((s) => s.state === 'hidden');
    if (hidden.length && Math.random() < 0.65) {
      hidden.sort((p, q) => Math.hypot(p.x - this.a.x, p.z - this.a.z) - Math.hypot(q.x - this.a.x, q.z - this.a.z));
      const s = hidden[0];
      walkVia(this.a, this.w, s.x - 0.35, s.z, () => this.arrive(s));
    } else {
      const p = this.w.randomPoint(this.a);
      if (p) this.a.walkTo(p.x, p.z, () => { this.wait = 0.8 + Math.random() * 2; });
      else this.wait = 0.6;
    }
  }
  arrive(s) {
    if (s.state === 'hidden') {
      this.a.face(s.x, s.z);
      this.onFind(s);
      this.waitFind = 6;
    } else {
      this.wait = 0.6;
    }
  }
}
