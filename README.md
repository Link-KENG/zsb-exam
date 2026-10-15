# 智盛杯 三套题库 · 模拟考试

在线地址：**https://link-keng.github.io/zsb-exam/**

## 题库

来源为《题库 · 周一周二周三三套》（DOCX / PDF），共 **300 题**：

| 套别 | 单选题 | 多选题 | 判断题 | 合计 |
|---|---|---|---|---|
| 周一 | 40 | 40 | 20 | 100 |
| 周二 | 40 | 40 | 20 | 100 |
| 周三 | 40 | 40 | 20 | 100 |

## 卷型

- **综合模拟卷**：从全部 300 题中随机抽取 40 单选 + 40 多选 + 20 判断，题目顺序打乱，每次进入重新抽题。
- **模考卷一 / 二 / 三**：对应周一 / 周二 / 周三当天全部 100 题，顺序打乱，保证当天题库全覆盖。

## 判分规则

- 共 100 题，每题 1 分，满分 100 分。
- 多选题**少选、错选、多选均不得分**；判断题按 正确 / 错误 作答。
- 答题过程中不显示对错，**提交答卷后**统一显示总分、各题型得分与逐题答案解析。
- 成绩历史保存在浏览器本地（localStorage）。

## 技术说明

纯静态站点，无构建步骤，直接部署于 GitHub Pages：

```
index.html       首页（选卷 + 历史成绩）
exam.html        答题 / 成绩回顾页（?paper=all|mon|tue|wed）
css/style.css    样式
js/data.js       题库数据（300 题，由 tools/build_data.py 生成）
js/core.js       抽卷与判分核心逻辑（浏览器 / node 共用）
js/app.js        页面交互
tools/           题库提取与校验脚本
```

答题进度存于 sessionStorage，中途刷新页面不丢题；提交后刷新仍可查看成绩回顾。

## 更新题库

1. `python tools/dump_docx.py <题库.docx> docx_dump.txt` 提取文本
2. `python tools/parse_questions.py docx_dump.txt questions.json` 解析并校验
3. `python tools/build_data.py questions.json js/data.js` 生成站点数据
4. `node tools/test_core.js` 跑抽卷 / 判分单元测试
