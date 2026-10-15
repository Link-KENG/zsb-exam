/* Node tests for core.js logic */
const assert = require("assert");
global.window = {};
require("../js/data.js");
const QUESTIONS = global.window.QUESTIONS;
const Core = require("../js/core.js");

let passed = 0;
function ok(cond, msg) {
  assert(cond, msg);
  passed++;
  console.log("  ok - " + msg);
}

console.log("[data]");
ok(QUESTIONS.length === 400, "400 questions total");
const bySet = {};
QUESTIONS.forEach(q => { bySet[q.set] = bySet[q.set] || {}; (bySet[q.set][q.type] = bySet[q.set][q.type] || []).push(q); });
["周一", "周二", "周三", "周四"].forEach(s => {
  ok(bySet[s].single.length === 40, s + " single 40");
  ok(bySet[s].multi.length === 40, s + " multi 40");
  ok(bySet[s].judge.length === 20, s + " judge 20");
});

console.log("[buildPaper all]");
const all = Core.buildPaper("all", QUESTIONS);
ok(all.sections.length === 3, "3 sections");
ok(all.sections[0].items.length === 40 && all.sections[1].items.length === 40 && all.sections[2].items.length === 20, "40/40/20 items");
const allIds = new Set();
let dupId = 0;
all.sections.forEach(s => s.items.forEach(q => { if (allIds.has(q.id)) dupId++; allIds.add(q.id); }));
ok(allIds.size === 100 && dupId === 0, "100 unique ids");

console.log("[buildPaper per day: covers all 100 of that day]");
["mon", "tue", "wed", "thu"].forEach(m => {
  const p = Core.buildPaper(m, QUESTIONS);
  const got = [];
  p.sections.forEach(s => s.items.forEach(q => got.push(q.id)));
  ok(got.length === 100, m + " has 100 items");
  const set = Core.SETS[m];
  const expect = QUESTIONS.filter(q => q.set === set).map(q => q.type + "-" + q.set + "-" + q.num).sort();
  ok(JSON.stringify(got.slice().sort()) === JSON.stringify(expect), m + " covers exactly all " + set + " questions");
});

console.log("[grade]");
// perfect score
const perfect = {};
all.sections.forEach(s => s.items.forEach(q => { perfect[q.id] = q.answer; }));
const r1 = Core.grade(all, perfect);
ok(r1.total === 100, "perfect = 100");
ok(r1.perSection.single === 40 && r1.perSection.multi === 40 && r1.perSection.judge === 20, "per-section 40/40/20");

// all wrong: pick a wrong answer for each
const wrong = {};
all.sections.forEach(s => s.items.forEach(q => {
  const keys = q.options.map(o => o.k);
  const wrongKey = keys.find(k => !q.answer.includes(k));
  wrong[q.id] = wrongKey;
}));
const r2 = Core.grade(all, wrong);
ok(r2.total === 0, "all wrong = 0");

// multi partial (only first letter of answer) => wrong
const partial = {};
all.sections.forEach(s => s.items.forEach(q => {
  if (q.type === "multi") partial[q.id] = q.answer[0];
  else partial[q.id] = q.answer;
}));
const r3 = Core.grade(all, partial);
const multiCorrectPartial = r3.items.filter(it => it.q.type === "multi" && it.q.answer.length > 1 && it.ok).length;
ok(multiCorrectPartial === 0, "multi partial = wrong");
ok(r3.total === 40 + 20 + (40 - r3.items.filter(it => it.q.type === "multi" && it.q.answer.length > 1).length), "only full-match multi counted");

// unanswered all => 0
const r4 = Core.grade(all, {});
ok(r4.total === 0 && r4.items.every(it => it.userAnswer === ""), "unanswered = 0");

// user answer letters get sorted, judge answered with A/B letters
const j = all.sections[2].items[0];
const r5 = Core.grade({ mode: "all", name: "t", sections: [{ type: "judge", title: "判断题", items: [j] }] }, { [j.id]: j.answer.split("").reverse().join("") });
ok(r5.total === 1, "judge correct even if user answer order differs");

// two 'all' builds differ in order (probabilistic)
const all2 = Core.buildPaper("all", QUESTIONS);
const s1 = all.sections[0].items.map(q => q.id).join(",");
const s2 = all2.sections[0].items.map(q => q.id).join(",");
ok(s1 !== s2, "shuffling produces different order");

console.log("\nALL " + passed + " TESTS PASSED");
