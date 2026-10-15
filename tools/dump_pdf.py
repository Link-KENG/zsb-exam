# -*- coding: utf-8 -*-
"""Extract PDF text to a line dump for structure inspection."""
import sys
import fitz

def main(src, out):
    doc = fitz.open(src)
    print("pages:", len(doc))
    with open(out, "w", encoding="utf-8") as f:
        for pno in range(len(doc)):
            page = doc[pno]
            text = page.get_text("text")
            f.write(f"\n===== PAGE {pno+1} =====\n")
            f.write(text)
    print("done ->", out)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
