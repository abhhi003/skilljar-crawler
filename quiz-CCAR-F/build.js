// Builds questions.js from exam.json and data/m*.json.
// Deals the bank into exam sets that follow the blueprint in exam.json (set size, domain
// weights). Sets never share a question. Uses a fixed seed, so set contents are stable between
// builds. Questions left over after dealing are still used by the domain-drill mode.
// Usage: node build.js
const fs = require('fs');
const path = require('path');

const EXAM = JSON.parse(fs.readFileSync(path.join(__dirname, 'exam.json'), 'utf8'));
const SET_SIZE = EXAM.setSize;
const MAX_SETS = 10;
const SEED = EXAM.seed;
const DOMAINS = EXAM.domains;
const MODULE_NAMES = EXAM.modules;
const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };
const BANNED = /\b(all of the above|none of the above|both [a-e] and [a-e]|option [a-e]\b)/i;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- load and validate ----
const dataDir = path.join(__dirname, 'data');
const files = fs.readdirSync(dataDir).filter(f => /^m\d+\.json$/.test(f)).sort();
const domainNames = DOMAINS.map(d => d[0]);
const all = [];
const errors = [];
const seen = new Set();
for (const f of files) {
  const arr = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
  for (const q of arr) {
    const where = `${f}:${q.id}`;
    const multi = Array.isArray(q.answer);
    const answers = multi ? q.answer : [q.answer];
    const n = (q.options || []).length;
    if (seen.has(q.id)) errors.push(`${where} duplicate id`);
    seen.add(q.id);
    if (!domainNames.includes(q.domain)) errors.push(`${where} unknown domain "${q.domain}"`);
    if (q.scenario && !(EXAM.scenarios || []).includes(q.scenario)) errors.push(`${where} unknown scenario "${q.scenario}"`);
    if (!(q.difficulty in DIFF_ORDER)) errors.push(`${where} bad difficulty ${q.difficulty}`);
    if (!q.question || !q.explanation) errors.push(`${where} missing question/explanation`);
    if (multi ? (n < 5 || answers.length < 2) : n !== 4) errors.push(`${where} wrong option/answer count`);
    if (answers.some(a => !Number.isInteger(a) || a < 0 || a >= n) || new Set(answers).size !== answers.length)
      errors.push(`${where} bad answer index`);
    if ((q.options || []).some(o => BANNED.test(o))) errors.push(`${where} option depends on order`);
    if (new Set(q.options).size !== n) errors.push(`${where} duplicate options`);
    all.push(q);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

// ---- shuffle option order once, so a question looks the same every time ----
const questions = {};
for (const q of all) {
  const order = shuffle(q.options.map((_, i) => i));
  const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
  questions[q.id] = {
    id: q.id,
    module: q.module,
    domain: q.domain,
    topic: q.topic,
    scenario: q.scenario,
    difficulty: q.difficulty,
    multi: Array.isArray(q.answer),
    question: q.question,
    options: order.map(i => q.options[i]),
    answer: answers.map(a => order.indexOf(a)).sort(),
    explanation: q.explanation,
    source: q.source,
  };
}

// ---- per-set quota for each domain ----
const nSets = Math.min(MAX_SETS, Math.floor(all.length / SET_SIZE));
if (nSets < 1) {
  console.error(`only ${all.length} questions; need at least ${SET_SIZE}`);
  process.exit(1);
}
const pools = {};
for (const d of domainNames) {
  pools[d] = shuffle(all.filter(q => q.domain === d));
}
// Largest-remainder rounding of the blueprint weights to SET_SIZE.
const raw = DOMAINS.map(([d, w]) => ({ d, exact: (w / 100) * SET_SIZE }));
raw.forEach(r => { r.n = Math.floor(r.exact); });
let rest = SET_SIZE - raw.reduce((s, r) => s + r.n, 0);
[...raw].sort((a, b) => (b.exact - b.n) - (a.exact - a.n)).slice(0, rest).forEach(r => r.n++);
const target = Object.fromEntries(raw.map(r => [r.d, r.n]));
// Domains short of questions give their slots to the heaviest domains that have spare.
const quota = {};
for (const d of domainNames) quota[d] = Math.min(target[d], Math.floor(pools[d].length / nSets));
let deficit = SET_SIZE - Object.values(quota).reduce((s, n) => s + n, 0);
while (deficit > 0) {
  const d = domainNames.find(x => Math.floor(pools[x].length / nSets) > quota[x]);
  if (!d) break;
  quota[d]++; deficit--;
}
if (deficit > 0) {
  console.error('not enough questions to fill the sets');
  process.exit(1);
}

// ---- deal round-robin, so each set gets the same difficulty mix per domain ----
const sets = Array.from({ length: nSets }, (_, i) => ({
  id: 'SET-' + String.fromCharCode(65 + i),
  questionIds: [],
}));
let offset = 0;
for (const d of domainNames) {
  // Pick at random, then order by type and difficulty so dealing balances both.
  pools[d].slice(0, quota[d] * nSets)
    .sort((a, b) => Array.isArray(a.answer) - Array.isArray(b.answer)
      || DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty])
    .forEach((q, i) => sets[(i + offset) % nSets].questionIds.push(q.id));
  offset += quota[d];
}
// Like the real exam, questions that share a scenario sit together; untagged ones come last.
const SCEN = EXAM.scenarios || [];
const scenRank = id => {
  const i = SCEN.indexOf(questions[id].scenario);
  return i < 0 ? SCEN.length : i;
};
for (const s of sets) {
  // Scenario blocks in a random order per set, untagged questions at the end.
  const order = shuffle(SCEN.map((_, i) => i)).concat(SCEN.length);
  s.questionIds = shuffle(s.questionIds)
    .sort((a, b) => order.indexOf(scenRank(a)) - order.indexOf(scenRank(b)));
}

const out = {
  generated: new Date().toISOString(),
  exam: { code: EXAM.code, title: EXAM.title, storagePrefix: EXAM.storagePrefix,
    setSize: SET_SIZE, minutes: EXAM.minutes, passPercent: EXAM.passPercent },
  modules: MODULE_NAMES,
  domains: DOMAINS.map(([name, weight]) => ({ name, weight, perSet: quota[name], target: target[name] })),
  sets,
  questions,
};
fs.writeFileSync(path.join(__dirname, 'questions.js'),
  '// Generated by build.js. Do not edit; edit data/*.json and rebuild.\nwindow.QUIZ = ' +
  JSON.stringify(out, null, 1) + ';\n');

// ---- report ----
console.log(`${all.length} questions -> ${nSets} sets of ${SET_SIZE}`);
console.log('domain                              bank  target/set  actual/set');
for (const d of domainNames)
  console.log(`${d.padEnd(36)}${String(pools[d].length).padStart(4)}  ${String(target[d]).padStart(10)}  ${String(quota[d]).padStart(10)}`);
for (const s of sets) {
  const qs = s.questionIds.map(id => questions[id]);
  const byScen = SCEN.length ? '  scenarios ' + SCEN.map((_, i) => qs.filter(q => SCEN.indexOf(q.scenario) === i).length).join('/') : '';
  const byDiff = ['easy', 'medium', 'hard'].map(d => qs.filter(q => q.difficulty === d).length).join('/');
  console.log(`${s.id}: e/m/h ${byDiff}  multi-response ${qs.filter(q => q.multi).length}${byScen}`);
}
const used = nSets * SET_SIZE;
console.log(`${all.length - used} questions not in any set (domain drill only)`);
const pos = {};
Object.values(questions).filter(q => !q.multi).forEach(q => { pos[q.answer[0]] = (pos[q.answer[0]] || 0) + 1; });
console.log('single-answer correct position spread:', JSON.stringify(pos));
