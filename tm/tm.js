// A small, faithful two-class Tsetlin Machine (Granmo, 2018) for the browser demo.
// Literals: x_1..x_o followed by NOT x_1..NOT x_o. Clauses alternate polarity: even index votes +, odd votes -.
export class TsetlinMachine {
  constructor({ features, clauses = 8, T = 10, s = 3.9, states = 100, rng = Math.random }) {
    this.o = features;
    this.n = clauses;
    this.T = T;
    this.s = s;
    this.N = states;
    this.rng = rng;
    this.L = 2 * features;
    this.ta = new Int16Array(this.n * this.L);
    this.reset();
  }

  reset() {
    // every automaton starts right at the include boundary, randomly on either side of it
    for (let i = 0; i < this.ta.length; i++) this.ta[i] = this.rng() < 0.5 ? this.N : this.N + 1;
    this.epochs = 0;
  }

  literals(x) {
    const lit = new Uint8Array(this.L);
    for (let k = 0; k < this.o; k++) { lit[k] = x[k]; lit[k + this.o] = 1 - x[k]; }
    return lit;
  }

  included(j, k) { return this.ta[j * this.L + k] > this.N; }

  clauseOutput(j, lit, training) {
    let any = false;
    for (let k = 0; k < this.L; k++) {
      if (this.ta[j * this.L + k] > this.N) {
        any = true;
        if (!lit[k]) return 0;
      }
    }
    return any ? 1 : (training ? 1 : 0);
  }

  vote(lit, training) {
    let v = 0;
    const outs = new Uint8Array(this.n);
    for (let j = 0; j < this.n; j++) {
      const c = this.clauseOutput(j, lit, training);
      outs[j] = c;
      if (c) v += j % 2 === 0 ? 1 : -1;
    }
    return { v: Math.max(-this.T, Math.min(this.T, v)), outs };
  }

  predict(x) { return this.vote(this.literals(x), false).v >= 0 ? 1 : 0; }

  typeI(j, lit, c) {
    const base = j * this.L, pInc = (this.s - 1) / this.s, pDec = 1 / this.s, max = 2 * this.N;
    for (let k = 0; k < this.L; k++) {
      const i = base + k;
      if (c && lit[k]) { if (this.rng() < pInc && this.ta[i] < max) this.ta[i]++; }
      else if (this.rng() < pDec && this.ta[i] > 1) this.ta[i]--;
    }
  }

  typeII(j, lit, c) {
    if (!c) return;
    const base = j * this.L;
    for (let k = 0; k < this.L; k++) {
      const i = base + k;
      if (!lit[k] && this.ta[i] <= this.N) this.ta[i]++;
    }
  }

  update(x, y) {
    const lit = this.literals(x);
    const { v, outs } = this.vote(lit, true);
    const p = y === 1 ? (this.T - v) / (2 * this.T) : (this.T + v) / (2 * this.T);
    for (let j = 0; j < this.n; j++) {
      if (this.rng() >= p) continue;
      const positive = j % 2 === 0;
      if ((y === 1) === positive) this.typeI(j, lit, outs[j]);
      else this.typeII(j, lit, outs[j]);
    }
  }

  // readable clause text, e.g. "x1 ∧ ¬x2"
  clauseText(j, names) {
    const parts = [];
    for (let k = 0; k < this.L; k++) {
      if (!this.included(j, k)) continue;
      parts.push(k < this.o ? names[k] : '¬' + names[k - this.o]);
    }
    return parts.length ? parts.join(' ∧ ') : '(empty)';
  }
}

export function makeXor({ n, features, noise, rng = Math.random }) {
  const X = [], Y = [];
  for (let i = 0; i < n; i++) {
    const x = new Uint8Array(features);
    for (let k = 0; k < features; k++) x[k] = rng() < 0.5 ? 1 : 0;
    let y = x[0] ^ x[1];
    if (rng() < noise) y = 1 - y;
    X.push(x); Y.push(y);
  }
  return { X, Y };
}
