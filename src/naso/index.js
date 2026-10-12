import { buildProtoModel } from './model-proto.js';
import { Animator, CLIPS } from './animator.js';

export const ACTIONS = Object.keys(CLIPS);

// なそ本体。画面側はこのクラスだけを使う。
// いまはコードで組んだ試作モデル。GLB に差し替えるときは buildProtoModel の代わりに
// 同じ形（root / joints / face / dispose）を返す読み込み関数を使う。
export class Naso {
  constructor({ style = 'toon', detail = 1 } = {}) {
    this.style = style;
    this.model = buildProtoModel(style, { detail });
    this.root = this.model.root;
    this.anim = new Animator(this.model);
  }
  play(name) {
    return this.anim.play(name);
  }
  get action() {
    return this.anim.name;
  }
  get lift() {
    return this.anim.lift;
  }
  set onActionEnd(fn) {
    this.anim.onEnd = fn;
  }
  update(dt) {
    this.anim.update(dt);
  }
  dispose() {
    this.root.removeFromParent();
    this.model.dispose();
  }
}
