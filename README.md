# Xiangcheng Zhan · Personal homepage

Academic homepage: **https://zhanxch.github.io/**.

## 内容说明

- 个人资料由本人提供：Xiangcheng Zhan，哈尔滨工业大学（深圳），zhanxch@foxmail.com；研究方向为具身智能、多模态大模型。
- DEWO 的标题、五位作者、简介及 ICLR 2027 在投状态由本人提供，明确标注 Under review。
- ROT 的标题、EMNLP 2026 Oral 和三位作者顺序由本人提供。
- DEWO 附 arXiv 链接（arXiv:2609.37398）。ROT 附 ACL Anthology 官方页面（2026.emnlp-main.1442）、PDF、arXiv（2610.06056）与第一作者的代码仓库 Rooselyn/ROT。作者顺序已与官方页面核对。
- 牙菌斑工作来自 [HKU Scholars Hub](https://hub.hku.hk/handle/10722/359253)，按资料库的 Conference_Paper 类型及 Journal of Clinical Periodontology 52(S28) 信息展示。放在 Earlier work，保留完整研究经历。
- Projects 板块分 Research 与 Software。Research：Embodied Infrastructure Half-Life（仓库 embodied-infra-half-life，原 LinkMind）与 RoboExperience（原 RoboRAG），各链接仓库内的 docs/essay.md（Gemini 起草、经核对数字出处）。Software：visual RSI studio（原 deepseek-harness-LinkMind）、dsh-robotics、dsh-linux。示意图均为概念草图。RoboUse-RSI 仅以 Coming soon 一行展示、不带链接。
- 页面仅包含已确认适合展示的研究内容。
- 个人栏展示绿色 Z 字头像和本人姓名的原创手写签名图。
- 教育经历由本人提供：2019 年开始四年本科、两年硕士、博士在读。按连续就读展示为中山大学数学与应用数学本科（2019–2023）、香港大学人工智能硕士（2023–2025）、哈尔滨工业大学（深圳）计算机博士在读（2025–至今）。

## 部署到 GitHub Pages

1. 在 `zhanxch` 账号下新建公开仓库，名称必须是 `zhanxch.github.io`。
2. 将本文件夹的内容上传到仓库根目录，包括 `index.html`、`styles.css`、`assets/` 和 `.nojekyll`。
3. 在仓库 **Settings → Pages → Build and deployment** 中选择 **Deploy from a branch**，分支选择 `main`，目录选择 `/ (root)`，保存。
4. 等 GitHub Pages 部署完成后，访问 https://zhanxch.github.io/。

已部署到 GitHub Pages，发布来源为 `main` 分支根目录。后续推送到 `main` 会自动更新网站。

官方参考：[Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。

## 后续修改

直接编辑 `index.html` 即可修改个人信息和论文，`styles.css` 控制外观，`site.js` 负责滚动导航。无构建步骤，无第三方脚本；所有字体和签名图片均随站点提供。所有论文内容在 HTML 中，即使关闭 JavaScript 也可阅读。

草原水彩（`assets/savanna-watercolor.webp`，提示词见 `assets/savanna-watercolor-prompt.txt`）作为首屏底部的虚化背景，不再单独成框。

视觉（2026-11 改版）：顶部吸顶导航 + 大字号 hero（姓名、签名卡片）、水彩草原全景、三栏研究方向、带示意线稿的论文卡片、横向教育时间轴和深绿色页脚。主色取自 Z 头像的森林绿，点缀色取自水彩的赭黄。论文卡片中的线稿为手写 SVG 示意，不是论文原图。部分文案由 Gemini 起草后人工精简。

字体使用 DM Sans 与 Newsreader，许可证保存在 `assets/fonts/`。

其他工作决定公开且有可公开材料后再加入；若仍在审稿，清楚区分投稿状态与已接收论文。
