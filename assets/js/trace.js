// TRACE content guard, inference only.
// A faithful port of tracekit.booleanize + tracekit.tm (predict mode) from github.com/AnwarDebes/TRACE.

export class TraceGuard {
  constructor(model) {
    this.model = model;
    this.vocab = model.vocab;
    this.F = model.n_features;
    this.C = model.n_clauses;
    this.half = this.C / 2;               // first half votes "unsafe", second half votes "safe"
    this.index = new Map(model.vocab.map((t, i) => [t, i]));
    this.clauses = model.clauses.map(c => Int16Array.from(c));
  }

  // lowercase, split on anything that is not [a-z0-9_], add adjacent bigrams
  terms(text) {
    const toks = text.toLowerCase().match(/[a-z0-9_]+/g) || [];
    const set = new Set(toks);
    for (let i = 0; i + 1 < toks.length; i++) set.add(toks[i] + '_' + toks[i + 1]);
    return set;
  }

  features(text) {
    const x = new Uint8Array(this.F);
    for (const t of this.terms(text)) {
      const j = this.index.get(t);
      if (j !== undefined) x[j] = 1;
    }
    return x;
  }

  // literal k: k < F means "word k present", k >= F means "word k-F absent"
  literal(x, k) { return k < this.F ? x[k] : 1 - x[k - this.F]; }

  verdict(text) {
    const x = this.features(text);
    let v = 0;
    const fired = [];
    for (let c = 0; c < this.C; c++) {
      const inc = this.clauses[c];
      if (inc.length === 0) continue;       // empty clauses output 0 when predicting
      let ok = 1;
      for (let n = 0; n < inc.length; n++) { if (!this.literal(x, inc[n])) { ok = 0; break; } }
      if (!ok) continue;
      const unsafe = c < this.half;
      v += unsafe ? 1 : -1;
      fired.push(c);
    }
    const forUnsafe = fired.filter(c => c < this.half).length;
    return { unsafe: v > 0, margin: v, forUnsafe, forSafe: fired.length - forUnsafe, fired, x };
  }

  // readable parts of a clause: words that must be present, words that must be absent
  describe(c) {
    const present = [], absent = [];
    for (const k of this.clauses[c]) {
      if (k < this.F) present.push(this.vocab[k]); else absent.push(this.vocab[k - this.F]);
    }
    return { present, absent, unsafe: c < this.half };
  }
}

export async function loadTrace(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('model ' + r.status);
  return new TraceGuard(await r.json());
}
