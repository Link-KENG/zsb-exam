# -*- coding: utf-8 -*-
"""Parse the dumped DOCX text into structured questions JSON + validation report."""
import json
import re
import sys

SETS = ["周一", "周二", "周三"]
TYPE_MAP = {
    "单选题": "single",
    "多选题": "multi",
    "判断题": "judge",
}

def main(dump_path, out_path):
    with open(dump_path, encoding="utf-8") as f:
        lines = [l.rstrip("\n") for l in f]

    questions = []
    errors = []
    cur_set = None
    cur_type = None
    cur = None  # current question being built

    def flush():
        nonlocal cur
        if cur is None:
            return
        q = cur
        # validate
        if not q["stem"]:
            errors.append(f"Q{q['set']}-{q['type']}#{q['num']}: empty stem")
        if not q["options"]:
            errors.append(f"Q{q['set']}-{q['type']}#{q['num']}: no options")
        if not q["answer"]:
            errors.append(f"Q{q['set']}-{q['type']}#{q['num']}: no answer")
        questions.append(q)
        cur = None

    q_start = re.compile(r"^(\d+)\.\s*(.*)$")
    opt_start = re.compile(r"^([A-E])\.\s*(.*)$")
    ans_start = re.compile(r"^【答案】\s*([A-E]+)\s*$")
    ans_other = re.compile(r"^【答案】\s*(.+)$")

    for raw in lines:
        # strip dump index prefix like "[243] "
        m = re.match(r"^\[\d+\]\s?(.*)$", raw)
        text = m.group(1) if m else raw
        text = text.strip()
        if not text:
            continue
        if text.startswith("=== TABLE"):
            continue

        if text.startswith("题库 ·"):
            flush()
            name = text.replace("题库 ·", "").strip()
            cur_set = next((s for s in SETS if s in name), name)
            cur_type = None
            continue
        m_type = re.match(r"^[一二三]、(单选题|多选题|判断题)", text)
        if m_type and m_type.group(1) in TYPE_MAP:
            flush()
            cur_type = TYPE_MAP[m_type.group(1)]
            continue

        if cur_set is None or cur_type is None:
            continue

        m = q_start.match(text)
        if m:
            flush()
            cur = {
                "set": cur_set,
                "type": cur_type,
                "num": int(m.group(1)),
                "stem": m.group(2).strip(),
                "options": [],
                "answer": "",
            }
            continue
        if cur is None:
            continue

        m = opt_start.match(text)
        if m:
            cur["options"].append([m.group(1), m.group(2).strip()])
            continue
        m = ans_start.match(text)
        if m:
            cur["answer"] = m.group(1)
            flush()
            continue
        m = ans_other.match(text)
        if m:
            cur["answer"] = m.group(1)
            errors.append(f"Q{cur['set']}-{cur['type']}#{cur['num']}: unusual answer format: {m.group(1)}")
            flush()
            continue
        # continuation line: append to stem or last option
        if cur["options"]:
            cur["options"][-1][1] += " " + text
        else:
            cur["stem"] += " " + text
    flush()

    # ---- validation report ----
    report = []
    per_set = {s: {"single": [], "multi": [], "judge": []} for s in SETS}
    for q in questions:
        if q["set"] in per_set:
            per_set[q["set"]][q["type"]].append(q["num"])

    for s in SETS:
        for t in ["single", "multi", "judge"]:
            nums = sorted(per_set[s][t])
            expected = 40 if t in ("single", "multi") else 20
            report.append(f"{s}-{t}: {len(nums)}/{expected} 题, nums {nums[:5]}...{nums[-3:] if len(nums)>8 else ''}")
            if len(nums) != expected:
                errors.append(f"{s}-{t}: count mismatch {len(nums)} != {expected}")
            if nums and (nums[0] != 1 or any(b - a != 1 for a, b in zip(nums, nums[1:]))):
                errors.append(f"{s}-{t}: numbering gaps/duplicates: {nums}")

    # per-type option/answer sanity
    opt_counts = {}
    for q in questions:
        n = len(q["options"])
        opt_counts.setdefault((q["type"], n), 0)
        opt_counts[(q["type"], n)] += 1
        if q["type"] == "single" and (n != 4 or not re.fullmatch(r"[A-D]", q["answer"])):
            errors.append(f"Q{q['set']}-single#{q['num']}: {n} options, answer {q['answer']}")
        if q["type"] == "multi" and (n < 4 or n > 6 or not re.fullmatch(r"[A-E]{2,}", q["answer"])):
            errors.append(f"Q{q['set']}-multi#{q['num']}: {n} options, answer {q['answer']}")
        if q["type"] == "judge" and (n != 2 or q["answer"] not in ("A", "B")):
            errors.append(f"Q{q['set']}-judge#{q['num']}: {n} options, answer {q['answer']}")
        # multi answers must be sorted unique
        if q["type"] == "multi" and q["answer"] != "".join(sorted(set(q["answer"]))):
            errors.append(f"Q{q['set']}-multi#{q['num']}: answer not sorted/unique: {q['answer']}")

    report.append("option-count distribution (type, n): " + str(sorted(opt_counts.items())))
    report.append(f"TOTAL questions: {len(questions)}")
    report.append(f"ERRORS: {len(errors)}")
    report.extend(errors)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=1)
    with open(out_path + ".report.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(report))
    print("\n".join(report))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
