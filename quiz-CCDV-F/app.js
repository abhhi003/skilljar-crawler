/* Certification practice exam (settings in exam.json). Plain JS, no build step. State lives in localStorage. */
(function () {
  'use strict';
  const Q = window.QUIZ;
  const app = document.getElementById('app');
  if (!Q) { app.innerHTML = '<p class="empty">questions.js is missing. Run <code>node build.js</code>.</p>'; return; }
  // file:// pages share one localStorage, so keys are prefixed per certification.
  const P = Q.exam.storagePrefix + '.';
  const LS_ATTEMPTS = P + 'attempts';
  const LS_CURRENT = P + 'current';
  const LETTERS = 'ABCDEFGH';
  let timerHandle = null;

  // ---------- storage ----------
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const attempts = () => load(LS_ATTEMPTS, []);
  const current = () => load(LS_CURRENT, null);

  // ---------- helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function md(s) {
    let h = esc(s);
    h = h.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, (_, c) => `<pre><code>${c}</code></pre>`);
    h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return h;
  }
  const fmtTime = s => {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  };
  const fmtDate = t => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  const isCorrect = (q, sel) => !!sel && same(sel, q.answer);
  const setById = id => Q.sets.find(s => s.id === id);
  function score(att) {
    const qs = att.questionIds.map(id => Q.questions[id]);
    const correct = qs.filter(q => isCorrect(q, att.answers[q.id])).length;
    return { correct, total: qs.length, percent: pct(correct, qs.length) };
  }
  const passed = p => p >= Q.exam.passPercent;
  function stopTimer() { if (timerHandle) clearInterval(timerHandle); timerHandle = null; }

  // ---------- router ----------
  function route() {
    stopTimer();
    const [, view, arg] = location.hash.split('/');
    window.scrollTo(0, 0);
    if (view === 'exam') return renderExam();
    if (view === 'result') return renderResult(arg);
    if (view === 'key') return renderKey(arg);
    if (view === 'history') return renderHistory();
    if (view === 'drill') return renderDrillSetup();
    return renderHome();
  }
  window.addEventListener('hashchange', route);

  // ---------- home ----------
  function renderHome() {
    const atts = attempts();
    const cur = current();
    const cards = Q.sets.map(s => {
      const mine = atts.filter(a => a.setId === s.id);
      const best = mine.length ? Math.max(...mine.map(a => a.score.percent)) : null;
      const last = mine[mine.length - 1];
      const inProg = cur && cur.setId === s.id;
      let status = '<span class="pill">Not attempted</span>';
      if (inProg) status = '<span class="pill prog">In progress</span>';
      else if (best !== null) status = `<span class="pill ${passed(best) ? 'ok' : 'bad'}">Best ${best}%</span>`;
      return `<div class="card">
        <h3>${s.id} ${status}</h3>
        <div class="meta">${s.questionIds.length} questions · ${Q.exam.minutes} min</div>
        <div class="stats">
          <div><b>${mine.length}</b>attempts</div>
          <div><b>${best === null ? '–' : best + '%'}</b>best</div>
          <div><b>${last ? last.score.percent + '%' : '–'}</b>last</div>
        </div>
        <div class="actions">
          ${inProg ? `<a class="btn primary" href="#/exam">Resume</a>`
                   : `<button class="btn primary" data-start="${s.id}">${mine.length ? 'Retake' : 'Start'}</button>`}
          ${last ? `<a class="btn" href="#/result/${last.id}">Review last</a>` : ''}
          <a class="btn" href="#/key/${s.id}">Answer key</a>
        </div>
      </div>`;
    }).join('');
    const domainRows = Q.domains.map(d => `<tr><td>${esc(d.name)}</td><td>${d.weight}%</td><td>${d.perSet}</td></tr>`).join('');
    app.innerHTML = `
      <h1>${esc(Q.exam.title)} (${esc(Q.exam.code)}) practice</h1>
      <p class="sub">${Q.sets.length} sets with no shared questions, each built like the real exam: ${Q.exam.setSize} questions,
      ${Q.exam.minutes} minutes, single-answer and multiple-response items. Pass mark here is ${Q.exam.passPercent}%,
      a rough stand-in for the real exam's scaled 720/1000.</p>
      ${cur && !setById(cur.setId) ? `<p><a class="btn primary" href="#/exam">Resume domain drill</a></p>` : ''}
      <div class="settings">
        <label><input type="checkbox" id="optTimed" ${load(P + 'timed', true) ? 'checked' : ''}> Timed (${Q.exam.minutes} min)</label>
        <label><input type="checkbox" id="optFeedback" ${load(P + 'feedback', false) ? 'checked' : ''}> Show answer after each question (study mode)</label>
      </div>
      <div class="grid">${cards}
        <div class="card">
          <h3>Domain drill</h3>
          <div class="meta">Untimed practice on chosen domains, drawn from the whole bank (${Object.keys(Q.questions).length} questions).</div>
          <div class="actions" style="margin-top:14px"><a class="btn" href="#/drill">Set up drill</a></div>
        </div>
      </div>
      <h2>Exam blueprint</h2>
      <table><tr><th>Domain</th><th>Exam weight</th><th>Questions per set</th></tr>${domainRows}</table>`;
    document.getElementById('optTimed').onchange = e => save(P + 'timed', e.target.checked);
    document.getElementById('optFeedback').onchange = e => save(P + 'feedback', e.target.checked);
    app.querySelectorAll('[data-start]').forEach(b => b.onclick = () => startSet(b.dataset.start));
  }

  function startSet(setId) {
    const cur = current();
    if (cur && !confirm('You have an unfinished attempt. Discard it and start this set?')) return;
    const timed = load(P + 'timed', true);
    begin({
      setId,
      label: setId,
      questionIds: setById(setId).questionIds.slice(),
      limitSec: timed ? Q.exam.minutes * 60 : null,
      feedback: load(P + 'feedback', false),
    });
  }

  function begin(opts) {
    save(LS_CURRENT, {
      id: 'a' + Date.now(),
      ...opts,
      startedAt: Date.now(),
      elapsedSec: 0,
      index: 0,
      answers: {},
      flagged: [],
      locked: [],
    });
    location.hash = '#/exam';
  }

  // ---------- drill ----------
  function renderDrillSetup() {
    const counts = {};
    Object.values(Q.questions).forEach(q => { counts[q.domain] = (counts[q.domain] || 0) + 1; });
    app.innerHTML = `
      <h1>Domain drill</h1>
      <p class="sub">Random questions from the chosen domains, untimed, with the answer shown after each question.</p>
      <div class="card">
        ${Q.domains.map(d => `<label style="display:block;margin:4px 0">
          <input type="checkbox" name="dom" value="${esc(d.name)}" checked> ${esc(d.name)} <span class="pill">${counts[d.name] || 0}</span></label>`).join('')}
        <div class="settings" style="margin-top:14px">
          <label>Questions <input type="number" id="drillN" value="20" min="1"></label>
          <label><input type="checkbox" id="drillMissed"> Only questions I've got wrong before</label>
        </div>
        <button class="btn primary" id="drillGo">Start drill</button>
      </div>`;
    document.getElementById('drillGo').onclick = () => {
      const doms = [...app.querySelectorAll('input[name=dom]:checked')].map(i => i.value);
      let pool = Object.values(Q.questions).filter(q => doms.includes(q.domain));
      if (document.getElementById('drillMissed').checked) {
        const missed = new Set();
        attempts().forEach(a => a.questionIds.forEach(id => {
          if (!isCorrect(Q.questions[id], a.answers[id])) missed.add(id);
        }));
        pool = pool.filter(q => missed.has(q.id));
      }
      if (!pool.length) return alert('No questions match those choices.');
      const n = Math.min(pool.length, Math.max(1, +document.getElementById('drillN').value || 20));
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      if (current() && !confirm('You have an unfinished attempt. Discard it and start a drill?')) return;
      begin({ setId: 'DRILL', label: 'Domain drill', questionIds: pool.slice(0, n).map(q => q.id), limitSec: null, feedback: true });
    };
  }

  // ---------- exam ----------
  function renderExam() {
    stopTimer();
    const att = current();
    if (!att) { location.hash = '#/'; return; }
    const ids = att.questionIds;
    const q = Q.questions[ids[att.index]];
    const sel = att.answers[q.id] || [];
    const need = q.answer.length;
    const locked = att.feedback && att.locked.includes(q.id);
    const flagged = att.flagged.includes(q.id);
    const answeredCount = ids.filter(id => (att.answers[id] || []).length).length;

    const optsHtml = q.options.map((o, i) => {
      let cls = sel.includes(i) ? 'sel' : '';
      if (locked) cls = q.answer.includes(i) ? 'correct' : sel.includes(i) ? 'wrong' : '';
      return `<button class="opt ${cls}" data-i="${i}" ${locked ? 'disabled' : ''}>
        <span class="key">${LETTERS[i]}</span><span>${md(o)}</span></button>`;
    }).join('');

    const palette = ids.map((id, i) => {
      const c = [];
      if ((att.answers[id] || []).length) c.push('ans');
      if (att.feedback && att.locked.includes(id)) c.push(isCorrect(Q.questions[id], att.answers[id]) ? 'r-ok' : 'r-bad');
      if (att.flagged.includes(id)) c.push('flag');
      if (i === att.index) c.push('cur');
      return `<button class="${c.join(' ')}" data-go="${i}">${i + 1}</button>`;
    }).join('');

    app.innerHTML = `
      <div class="exam-head">
        <div><b>${esc(att.label)}</b> · Question ${att.index + 1} of ${ids.length}</div>
        <div class="timer" id="timer"></div>
      </div>
      <div class="exam">
        <div>
          <div class="qcard">
            <div class="qmeta"><span class="pill">${esc(q.domain)}</span><span class="pill">${q.difficulty}</span>
              ${q.multi ? `<span class="pill prog">Select ${need}</span>` : ''}</div>
            ${scenarioHtml(q)}<div class="qtext">${md(q.question)}</div>
            ${optsHtml}
            ${locked ? explainHtml(q, sel) : ''}
          </div>
          <div class="qnav">
            <button class="btn" id="prev" ${att.index === 0 ? 'disabled' : ''}>← Previous</button>
            <button class="btn flagbtn ${flagged ? 'on' : ''}" id="flag">${flagged ? '★ Flagged' : '☆ Flag for review'}</button>
            ${att.feedback && !locked
              ? `<button class="btn primary" id="check" ${sel.length !== need ? 'disabled' : ''}>Check answer</button>`
              : att.index < ids.length - 1
                ? `<button class="btn primary" id="next">Next →</button>`
                : `<button class="btn primary" id="submit2">Finish</button>`}
          </div>
          <p class="legend" style="margin-top:14px">Keys: <kbd>A</kbd>–<kbd>E</kbd> or <kbd>1</kbd>–<kbd>5</kbd> select ·
            <kbd>←</kbd>/<kbd>→</kbd> move · <kbd>F</kbd> flag${att.feedback ? ' · <kbd>Enter</kbd> check' : ''}</p>
        </div>
        <aside class="side">
          <div><b>${answeredCount}</b> / ${ids.length} answered · <b>${att.flagged.length}</b> flagged</div>
          <div class="palette">${palette}</div>
          <button class="btn primary" id="submit" style="width:100%">Submit exam</button>
          <button class="btn small" id="quit" style="width:100%;margin-top:8px">Discard attempt</button>
        </aside>
      </div>`;

    const persist = () => save(LS_CURRENT, att);
    const pick = i => {
      if (locked || i >= q.options.length) return;
      let s = (att.answers[q.id] || []).slice();
      if (!q.multi) s = [i];
      else if (s.includes(i)) s = s.filter(x => x !== i);
      else if (s.length < need) s.push(i);
      else s = [...s.slice(1), i]; // over the limit: replace the oldest pick
      att.answers[q.id] = s;
      persist(); renderExam();
    };
    const go = i => { if (i >= 0 && i < ids.length) { att.index = i; persist(); renderExam(); } };
    const check = () => {
      if (!att.feedback || locked || sel.length !== need) return;
      att.locked.push(q.id); persist(); renderExam();
    };
    const toggleFlag = () => {
      att.flagged = flagged ? att.flagged.filter(x => x !== q.id) : [...att.flagged, q.id];
      persist(); renderExam();
    };
    app.querySelectorAll('.opt').forEach(b => b.onclick = () => pick(+b.dataset.i));
    app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(+b.dataset.go));
    document.getElementById('prev').onclick = () => go(att.index - 1);
    document.getElementById('flag').onclick = toggleFlag;
    const nx = document.getElementById('next'); if (nx) nx.onclick = () => go(att.index + 1);
    const ck = document.getElementById('check'); if (ck) ck.onclick = check;
    const trySubmit = () => {
      const left = ids.length - answeredCount;
      const msg = left ? `${left} question(s) unanswered and ${att.flagged.length} flagged. Submit anyway?` : 'Submit the exam?';
      if (confirm(msg)) finish(att);
    };
    document.getElementById('submit').onclick = trySubmit;
    const s2 = document.getElementById('submit2'); if (s2) s2.onclick = trySubmit;
    document.getElementById('quit').onclick = () => {
      if (confirm('Discard this attempt? Nothing will be saved.')) { localStorage.removeItem(LS_CURRENT); location.hash = '#/'; }
    };
    document.onkeydown = e => {
      if (!location.hash.startsWith('#/exam') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k >= 'a' && k <= 'e' && k.length === 1) pick(k.charCodeAt(0) - 97);
      else if (k >= '1' && k <= '5') pick(+k - 1);
      else if (k === 'arrowright') go(att.index + 1);
      else if (k === 'arrowleft') go(att.index - 1);
      else if (k === 'f') toggleFlag();
      else if (k === 'enter' && att.feedback) check();
    };

    // Timer: elapsed time is stored, so a reload or closed tab doesn't eat into the limit.
    const t = document.getElementById('timer');
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      att.elapsedSec += (now - last) / 1000; last = now;
      const fresh = current();
      if (fresh && fresh.id === att.id) { fresh.elapsedSec = att.elapsedSec; save(LS_CURRENT, fresh); }
      if (att.limitSec) {
        const left = att.limitSec - att.elapsedSec;
        t.textContent = '⏱ ' + fmtTime(left) + ' left';
        t.classList.toggle('low', left < 600);
        if (left <= 0) { stopTimer(); alert('Time is up. Your exam will be submitted.'); finish(current()); }
      } else t.textContent = '⏱ ' + fmtTime(att.elapsedSec);
    };
    tick();
    timerHandle = setInterval(tick, 1000);
  }

  function finish(att) {
    stopTimer();
    document.onkeydown = null;
    const rec = {
      id: att.id, setId: att.setId, label: att.label, questionIds: att.questionIds,
      answers: att.answers, flagged: att.flagged, startedAt: att.startedAt,
      finishedAt: Date.now(), elapsedSec: Math.round(att.elapsedSec), timed: !!att.limitSec,
    };
    rec.score = score(rec);
    const all = attempts(); all.push(rec); save(LS_ATTEMPTS, all);
    localStorage.removeItem(LS_CURRENT);
    location.hash = '#/result/' + rec.id;
  }

  // ---------- review ----------
  const scenarioHtml = q => q.scenario ? `<div class="scenario">Scenario: <b>${esc(q.scenario)}</b></div>` : '';

  function explainHtml(q, sel) {
    const ok = !!sel && isCorrect(q, sel);
    const right = q.answer.map(i => LETTERS[i]).join(', ');
    return `<div class="explain">
      ${sel === null ? '' : `<b>${sel.length ? (ok ? '✓ Correct' : '✗ Incorrect') : '— Not answered'}</b> · `}Correct answer: <b>${right}</b>
      <div style="margin-top:6px">${md(q.explanation)}</div>
      <div class="src">${esc(q.topic || '')}${q.source ? ' · ' + esc(q.source) : ''} · ${q.id}</div>
    </div>`;
  }

  // sel === null means answer-key view: no attempt to grade.
  function reviewItem(q, n, sel, flagged) {
    const graded = sel === null ? null : sel || [];
    sel = graded || [];
    const opts = q.options.map((o, i) => {
      const cls = q.answer.includes(i) ? 'correct' : sel.includes(i) ? 'wrong' : '';
      const mine = sel.includes(i) ? ' <span class="pill">your answer</span>' : '';
      return `<div class="opt ${cls}"><span class="key">${LETTERS[i]}</span><span>${md(o)}${mine}</span></div>`;
    }).join('');
    return `<div class="qcard review-item">
      <div class="qmeta"><b>Q${n}</b><span class="pill">${esc(q.domain)}</span><span class="pill">${q.difficulty}</span>
        ${q.multi ? `<span class="pill prog">Select ${q.answer.length}</span>` : ''}${flagged ? '<span class="pill">★ flagged</span>' : ''}</div>
      ${scenarioHtml(q)}<div class="qtext">${md(q.question)}</div>${opts}${explainHtml(q, graded)}</div>`;
  }

  function renderResult(id) {
    const att = attempts().find(a => a.id === id);
    if (!att) { app.innerHTML = '<p class="empty">Attempt not found.</p>'; return; }
    const qs = att.questionIds.map(x => Q.questions[x]).filter(Boolean);
    const s = att.score;
    const byDomain = Q.domains.map(d => {
      const dq = qs.filter(q => q.domain === d.name);
      const c = dq.filter(q => isCorrect(q, att.answers[q.id])).length;
      return dq.length ? `<tr><td>${esc(d.name)}</td><td>${c} / ${dq.length}</td>
        <td><div class="bar"><i style="width:${pct(c, dq.length)}%"></i></div></td><td>${pct(c, dq.length)}%</td></tr>` : '';
    }).join('');

    let filter = 'all';
    const draw = () => {
      const list = qs.map((q, i) => ({ q, i })).filter(({ q }) => {
        const sel = att.answers[q.id];
        if (filter === 'wrong') return !isCorrect(q, sel);
        if (filter === 'flagged') return att.flagged.includes(q.id);
        if (filter === 'unanswered') return !(sel && sel.length);
        if (filter.startsWith('d:')) return q.domain === filter.slice(2);
        return true;
      });
      document.getElementById('rlist').innerHTML = list.length
        ? list.map(({ q, i }) => reviewItem(q, i + 1, att.answers[q.id], att.flagged.includes(q.id))).join('')
        : '<p class="empty">Nothing here.</p>';
      app.querySelectorAll('[data-f]').forEach(b => b.classList.toggle('on', b.dataset.f === filter));
    };
    const wrong = qs.filter(q => !isCorrect(q, att.answers[q.id])).length;
    app.innerHTML = `
      <h1>${esc(att.label)} result</h1>
      <p class="sub">${fmtDate(att.finishedAt)} · ${fmtTime(att.elapsedSec)} ${att.timed ? 'of ' + Q.exam.minutes + ' min' : '(untimed)'}</p>
      <div class="score">
        <div class="big ${passed(s.percent) ? 'pass' : 'fail'}">${s.percent}%</div>
        <div><b>${s.correct} / ${s.total}</b> correct<br>
          ${att.setId === 'DRILL' ? 'Practice drill' : passed(s.percent) ? 'Pass (≥ ' + Q.exam.passPercent + '%)' : 'Below the ' + Q.exam.passPercent + '% pass mark'}</div>
        <div class="actions" style="margin-left:auto">
          ${setById(att.setId) ? `<button class="btn primary" id="retake">Retake ${att.setId}</button>` : ''}
          <a class="btn" href="#/">All sets</a>
        </div>
      </div>
      <h2>By domain</h2>
      <table><tr><th>Domain</th><th>Score</th><th></th><th></th></tr>${byDomain}</table>
      <h2>Review answers</h2>
      <div class="filters">
        <button class="btn small" data-f="all">All (${qs.length})</button>
        <button class="btn small" data-f="wrong">Incorrect (${wrong})</button>
        <button class="btn small" data-f="flagged">Flagged (${att.flagged.length})</button>
        <button class="btn small" data-f="unanswered">Unanswered</button>
        ${Q.domains.filter(d => qs.some(q => q.domain === d.name)).map(d =>
          `<button class="btn small" data-f="d:${esc(d.name)}">${esc(d.name)}</button>`).join('')}
      </div>
      <div id="rlist"></div>`;
    app.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; draw(); });
    const rt = document.getElementById('retake'); if (rt) rt.onclick = () => startSet(att.setId);
    draw();
  }

  function renderKey(setId) {
    const s = setById(setId);
    if (!s) { app.innerHTML = '<p class="empty">Set not found.</p>'; return; }
    const ok = current() && current().setId === setId
      ? confirm('You have this set in progress. Show the answer key anyway?') : true;
    if (!ok) { location.hash = '#/'; return; }
    app.innerHTML = `<h1>${s.id} answer key</h1>
      <p class="sub">All ${s.questionIds.length} questions with the correct answers and explanations.</p>
      ${s.questionIds.map((id, i) => reviewItem(Q.questions[id], i + 1, null, false)).join('')}`;
  }

  function renderHistory() {
    const atts = attempts().slice().reverse();
    app.innerHTML = `<h1>History</h1>
      ${atts.length ? `<table><tr><th>When</th><th>Set</th><th>Score</th><th>Time</th><th></th></tr>
        ${atts.map(a => `<tr><td>${fmtDate(a.finishedAt)}</td><td>${esc(a.label)}</td>
          <td><span class="pill ${passed(a.score.percent) ? 'ok' : 'bad'}">${a.score.percent}%</span> ${a.score.correct}/${a.score.total}</td>
          <td>${fmtTime(a.elapsedSec)}</td><td><a href="#/result/${a.id}">Review</a></td></tr>`).join('')}
        </table>
        <p style="margin-top:16px"><button class="btn small" id="clear">Clear history</button></p>`
      : '<p class="empty">No attempts yet.</p>'}`;
    const c = document.getElementById('clear');
    if (c) c.onclick = () => { if (confirm('Delete all saved attempts?')) { localStorage.removeItem(LS_ATTEMPTS); renderHistory(); } };
  }

  document.title = Q.exam.code + ' Practice Exam';
  document.getElementById('brandCode').textContent = Q.exam.code;
  route();
})();
