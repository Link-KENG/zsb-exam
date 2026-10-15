/* 抽卷与判分核心逻辑（浏览器 + node 测试共用） */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var SETS = { mon: "周一", tue: "周二", wed: "周三" };
  var PAPER_NAMES = {
    all: "综合模拟卷",
    mon: "模考卷一（周一）",
    tue: "模考卷二（周二）",
    wed: "模考卷三（周三）",
  };
  var SECTIONS = [
    { type: "single", title: "单选题", count: 40 },
    { type: "multi", title: "多选题", count: 40 },
    { type: "judge", title: "判断题", count: 20 },
  ];

  /* mode: 'all' | 'mon' | 'tue' | 'wed' */
  function buildPaper(mode, questions) {
    var pools = { single: [], multi: [], judge: [] };
    questions.forEach(function (q) { pools[q.type].push(q); });

    var sections = SECTIONS.map(function (sec) {
      var pool;
      if (mode === "all") {
        pool = shuffle(pools[sec.type]).slice(0, sec.count);
      } else {
        pool = shuffle(pools[sec.type].filter(function (q) { return q.set === SETS[mode]; }));
      }
      var items = pool.map(function (q) {
        return {
          id: q.type + "-" + q.set + "-" + q.num,
          type: q.type,
          set: q.set,
          num: q.num,
          stem: q.stem,
          options: q.options.map(function (o) { return { k: o[0], t: o[1] }; }),
          answer: q.answer,
        };
      });
      return { type: sec.type, title: sec.title, items: items };
    });
    return { mode: mode, name: PAPER_NAMES[mode], sections: sections };
  }

  /* answers: { questionId: 'A' | 'ABD' | '' }。多选全对才得分，漏选错选不得分。 */
  function grade(paper, answers) {
    var total = 0;
    var perSection = {};
    var items = [];
    paper.sections.forEach(function (sec) {
      var correct = 0;
      sec.items.forEach(function (q) {
        var ua = (answers[q.id] || "").split("")
          .filter(function (c) { return c >= "A" && c <= "E"; })
          .sort().join("");
        var ok = ua === q.answer;
        if (ok) { correct++; total++; }
        items.push({ q: q, userAnswer: ua, ok: ok });
      });
      perSection[sec.type] = correct;
    });
    return { total: total, perSection: perSection, items: items };
  }

  return { shuffle: shuffle, buildPaper: buildPaper, grade: grade, PAPER_NAMES: PAPER_NAMES, SECTIONS: SECTIONS, SETS: SETS };
});
