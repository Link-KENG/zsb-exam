# -*- coding: utf-8 -*-
"""Validate questions.json and generate site/js/data.js"""
import json
import sys

def main(q_path, out_path):
    with open(q_path, encoding="utf-8") as f:
        questions = json.load(f)

    errors = []
    # answer letters must exist in options
    for q in questions:
        letters = {o[0] for o in q["options"]}
        for ch in q["answer"]:
            if ch not in letters:
                errors.append(f"Q{q['set']}-{q['type']}#{q['num']}: answer {q['answer']} has {ch} not in options {sorted(letters)}")

    # duplicate stems within same set
    seen = {}
    for q in questions:
        key = (q["set"], q["type"], q["stem"].strip())
        seen.setdefault(key, []).append(q["num"])
    for key, nums in seen.items():
        if len(nums) > 1:
            errors.append(f"dup stem in {key[0]}-{key[1]}: #{nums}: {key[2][:30]}")

    print(f"total {len(questions)}, errors {len(errors)}")
    for e in errors:
        print(" -", e)

    out = ["// 题库数据：周一/周二/周三 各 100 题（40单选+40多选+20判断），共 300 题",
           "// 由 build_data.py 从 题库_周一周二周三三套.docx 自动生成，请勿手改",
           "window.QUESTIONS = " + json.dumps(questions, ensure_ascii=False) + ";"]
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print("written:", out_path)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
