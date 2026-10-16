/* 三套题库模拟考试 · 页面逻辑 */
"use strict";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

(function () {
  /* ---------- 仅答题页执行 ---------- */
  var examView = document.getElementById("examView");
  if (!examView) return;

  var STATE_KEY = "zsb-exam-state";
  var HIST_KEY = "zsb-exam-history";
  var REPORTS_KEY = "zsb-exam-reports";
  var WRONGS_KEY = "zsb-exam-wrongs";

  var params = new URLSearchParams(location.search);
  var mode = params.get("paper") || "all";
  if (!Core.PAPER_NAMES[mode]) mode = "all";

  var state = null;

  function loadOrBuild() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null");
      if (saved && saved.mode === mode && saved.paper && saved.paper.name) {
        state = saved;
        return;
      }
    } catch (e) {}
    state = {
      mode: mode,
      paper: Core.buildPaper(mode, window.QUESTIONS, window.QUESTIONS_NOANS),
      answers: {},
      submitted: false,
      result: null,
    };
    save();
  }

  function save() {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function totalCount() {
    var n = 0;
    state.paper.sections.forEach(function (s) { n += s.items.length; });
    return n;
  }

  function answeredCount() {
    return Object.keys(state.answers).filter(function (id) { return state.answers[id]; }).length;
  }

  function optText(q, k) {
    for (var i = 0; i < q.options.length; i++) {
      if (q.options[i].k === k) return q.options[i].t;
    }
    return k;
  }

  /* 答案字母串转显示文本：判断题为 正确/错误，其余直接显示字母 */
  function ansText(q, letters) {
    if (!letters) return "";
    if (q.type === "judge") {
      return letters.split("").map(function (l) { return optText(q, l); }).join("、");
    }
    return letters;
  }

  /* ---------- 答题视图 ---------- */
  function renderExam() {
    document.getElementById("paperTitle").textContent = state.paper.name;
    var intro = document.getElementById("paperIntro");
    if (mode === "all") {
      intro.innerHTML = "<b>" + esc(state.paper.name) + "：</b>从全部 500 题中随机抽取 40 单选 + 40 多选 + 20 判断，共 100 题，顺序已打乱。答题过程中不显示对错，提交答卷后统一显示分数与答案。";
    } else if (mode === "noa") {
      intro.innerHTML = "<b>" + esc(state.paper.name) + "：</b>本卷为原卷未附答案的套卷，共 100 题，顺序已打乱。可正常作答，提交后只显示你的作答记录，<b>不判分、不计入错题本</b>。";
    } else {
      intro.innerHTML = "<b>" + esc(state.paper.name) + "：</b>当天全部 100 题（40 单选 + 40 多选 + 20 判断），顺序已打乱。答题过程中不显示对错，提交答卷后统一显示分数与答案。";
    }

    var box = document.getElementById("sections");
    var html = "";
    var idx = 0;
    state.paper.sections.forEach(function (sec) {
      html += '<div class="section-title">' + esc(sec.title) +
        '<span class="hint">' + sec.items.length + " 题" +
        (sec.type === "multi" ? " · 少选、错选不得分" : "") + "</span></div>";
      sec.items.forEach(function (q) {
        idx++;
        html += '<div class="q-card" data-id="' + esc(q.id) + '">';
        html += '<div class="q-head"><span class="q-no">' + idx + "</span>";
        html += '<div class="q-stem">' + esc(q.stem) + "</div></div>";
        q.options.forEach(function (o) {
          html += '<div class="opt" data-k="' + esc(o.k) + '">' +
            '<span class="opt-key">' + esc(o.k) + "</span>" +
            '<span class="opt-text">' + esc(o.t) + "</span></div>";
        });
        html += "</div>";
      });
    });
    box.innerHTML = html;

    /* 恢复已选状态 */
    Object.keys(state.answers).forEach(function (id) {
      markSelected(id);
    });
    updateProgress();
    examView.hidden = false;
    var rv = document.getElementById("reviewView");
    rv.hidden = true;
    rv.innerHTML = "";
    document.getElementById("bottombar").hidden = false;
  }

  function markSelected(id) {
    var card = document.querySelector('.q-card[data-id="' + id + '"]');
    if (!card) return;
    var picked = state.answers[id] || "";
    card.querySelectorAll(".opt").forEach(function (opt) {
      opt.classList.toggle("sel", picked.indexOf(opt.dataset.k) >= 0);
    });
  }

  function updateProgress() {
    var total = totalCount();
    var done = answeredCount();
    var left = total - done;
    document.getElementById("progress").textContent = "已答 " + done + "/" + total;
    document.getElementById("barCnt").textContent = "已答 " + done + " / " + total + " · 未答 " + left;
  }

  document.getElementById("sections").addEventListener("click", function (e) {
    if (state.submitted) return;
    var opt = e.target.closest(".opt");
    if (!opt) return;
    var card = opt.closest(".q-card");
    var id = card.dataset.id;
    var k = opt.dataset.k;
    var q = findQ(id);

    if (q.type === "multi") {
      var picked = (state.answers[id] || "").split("");
      var i = picked.indexOf(k);
      if (i >= 0) picked.splice(i, 1); else picked.push(k);
      picked.sort();
      if (picked.length) state.answers[id] = picked.join("");
      else delete state.answers[id];
    } else {
      state.answers[id] = k;
    }
    markSelected(id);
    updateProgress();
    save();
  });

  function findQ(id) {
    for (var s = 0; s < state.paper.sections.length; s++) {
      var items = state.paper.sections[s].items;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) return items[i];
      }
    }
    return null;
  }

  document.getElementById("submitBtn").addEventListener("click", function () {
    var total = totalCount();
    var left = total - answeredCount();
    if (left > 0 && !confirm("还有 " + left + " 题未作答，确定提交答卷吗？")) return;

    if (mode === "noa") {
      /* 无答案卷：不判分，只记录作答 */
      var items = [];
      state.paper.sections.forEach(function (sec) {
        sec.items.forEach(function (q) {
          var ua = (state.answers[q.id] || "").split("")
            .filter(function (c) { return c >= "A" && c <= "E"; })
            .sort().join("");
          items.push({ q: q, userAnswer: ua, ok: null });
        });
      });
      state.result = { noa: true, total: null, perSection: {}, items: items };
    } else {
      state.result = Core.grade(state.paper, state.answers);
      saveWrongs(state.result, state.paper.name);
    }
    state.submitted = true;
    save();
    var ts = Date.now();
    pushHistory(ts);
    saveReport(ts);
    renderReview();
    window.scrollTo(0, 0);
  });

  function saveWrongs(result, paperName) {
    try {
      var wrongs = JSON.parse(localStorage.getItem(WRONGS_KEY) || "[]");
      var fresh = Core.collectWrongs(result, paperName);
      /* 本卷出现的题先从错题本移除（做对即出本），再把本次答错/未答的题加回，保留最新记录 */
      var inPaper = {};
      state.paper.sections.forEach(function (sec) {
        sec.items.forEach(function (q) { inPaper[q.id] = true; });
      });
      wrongs = wrongs.filter(function (w) { return !inPaper[w.q.id]; }).concat(fresh);
      localStorage.setItem(WRONGS_KEY, JSON.stringify(wrongs.slice(-1000)));
    } catch (e) {}
  }

  function pushHistory(ts) {
    try {
      var hist = JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
      hist.unshift({
        mode: state.mode,
        name: state.paper.name,
        score: state.result.total,
        total: totalCount(),
        ts: ts,
      });
      localStorage.setItem(HIST_KEY, JSON.stringify(hist.slice(0, 30)));
    } catch (e) {}
  }

  /* 答卷完整存档（题目 id + 作答 + 判分），供首页历史成绩点开回顾；题目详情回顾页从 data.js 现查，存档很小 */
  function saveReport(ts) {
    try {
      var reports = JSON.parse(localStorage.getItem(REPORTS_KEY) || "[]");
      reports.unshift({
        ts: ts,
        mode: state.mode,
        name: state.paper.name,
        score: state.result.total,
        sections: state.paper.sections.map(function (sec) {
          return { type: sec.type, ids: sec.items.map(function (q) { return q.id; }) };
        }),
        items: state.result.items.map(function (it) {
          return { id: it.q.id, ua: it.userAnswer, ok: it.ok };
        }),
      });
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reports.slice(0, 30)));
    } catch (e) {}
  }

  /* ---------- 成绩回顾视图 ---------- */
  function renderReview() {
    document.getElementById("bottombar").hidden = true;
    examView.hidden = true;
    var view = document.getElementById("reviewView");
    view.hidden = false;

    var r = state.result;
    var total = totalCount();

    var html = '<div class="result">';
    if (r.noa) {
      html += '<div class="score-card">';
      html += '<div class="big" style="color:var(--muted)">已交卷</div>';
      html += '<div class="of">' + esc(state.paper.name) + " · 本卷无标准答案，仅记录你的作答</div>";
      html += "</div>";
    } else {
      var pct = r.total / total;
      var cls = pct >= 0.85 ? "high" : (pct >= 0.6 ? "" : "low");
      html += '<div class="score-card">';
      html += '<div class="big ' + cls + '">' + r.total + " 分</div>";
      html += '<div class="of">' + esc(state.paper.name) + " · 满分 " + total + " 分</div>";
      html += '<div class="secs">';
      state.paper.sections.forEach(function (sec) {
        var cnt = sec.items.length;
        html += '<span class="sec">' + esc(sec.title) + " " + r.perSection[sec.type] + "/" + cnt + "</span>";
      });
      html += "</div></div>";
    }
    html += '<div class="result-actions">';
    html += '<button class="btn" id="retakeBtn" type="button">再练一次</button>';
    html += '<a class="btn ghost" href="index.html" style="text-decoration:none">返回首页</a>';
    html += "</div></div>";

    /* 逐题回顾 */
    var idx = 0;
    state.paper.sections.forEach(function (sec) {
      html += '<div class="section-title">' + esc(sec.title) +
        '<span class="hint">' + (r.noa ? "作答记录" : "答案解析") + "</span></div>";
      sec.items.forEach(function (q) {
        idx++;
        var it = null;
        for (var i = 0; i < r.items.length; i++) {
          if (r.items[i].q.id === q.id) { it = r.items[i]; break; }
        }
        var badge = "", badgeCls = "";
        if (!r.noa) {
          if (!it.userAnswer) { badge = "未作答"; badgeCls = "skip"; }
          else if (it.ok) { badge = "答对"; badgeCls = "ok"; }
          else { badge = "答错"; badgeCls = "no"; }
        }

        html += '<div class="q-card review-q">';
        html += '<div class="q-head"><span class="q-no">' + idx + "</span>";
        html += '<div class="q-stem">' + esc(q.stem);
        html += '<span class="q-src">' + esc(q.set) + " · " + esc(sec.title) + " #" + q.num + "</span>";
        if (badge) html += '<span class="badge ' + badgeCls + '">' + badge + "</span>";
        html += "</div></div>";

        q.options.forEach(function (o) {
          var isUser = it.userAnswer.indexOf(o.k) >= 0;
          var cls = "opt locked";
          var mark = "";
          if (r.noa) {
            if (isUser) cls += " sel";
          } else {
            var isCorrect = q.answer.indexOf(o.k) >= 0;
            if (isCorrect) { cls += " correct"; mark = "✓"; }
            else if (isUser) { cls += " wrong-pick"; mark = "✗"; }
          }
          html += '<div class="' + cls + '">' +
            '<span class="opt-key">' + esc(o.k) + "</span>" +
            '<span class="opt-text">' + esc(o.t) + "</span>" +
            (mark ? '<span class="mark">' + mark + "</span>" : "") + "</div>";
        });

        var ua = it.userAnswer ? ansText(q, it.userAnswer) : "未作答";
        html += '<div class="q-answer-line">你的答案：<span class="ua' + (it.ok ? " ok" : "") + '">' + esc(ua) + "</span>";
        if (!r.noa) html += "　正确答案：<b>" + esc(ansText(q, q.answer)) + "</b>";
        else html += "　（本卷无标准答案）";
        html += "</div>";
        html += "</div>";
      });
    });

    view.innerHTML = html;
    document.getElementById("retakeBtn").addEventListener("click", function () {
      state = {
        mode: mode,
        paper: Core.buildPaper(mode, window.QUESTIONS, window.QUESTIONS_NOANS),
        answers: {},
        submitted: false,
        result: null,
      };
      save();
      renderExam();
      window.scrollTo(0, 0);
    });
  }

  loadOrBuild();
  if (state.submitted && state.result) renderReview();
  else renderExam();
})();
