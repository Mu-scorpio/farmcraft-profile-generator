<div align="center">
  <h1>🌾 FarmCraft</h1>
  <p><strong>我生不愿六国印，但愿耕种二顷田</strong></p>
  <p>贡献草地 · 战利品大厅 · 玩家护照 · 仓库卡片</p>
  <p>
    <a href="https://github.com/Mu-scorpio/farmcraft-profile-generator">项目仓库</a>
    ·
    <a href="LICENSE">CC BY-NC 4.0</a>
    ·
    <a href="https://github.com/Mu-scorpio/farmcraft-profile-generator/issues">反馈问题</a>
  </p>
</div>

<p align="center">
  <img src="docs/screenshots/home-zh.png" alt="FarmCraft 中文首页" width="960" />
</p>

FarmCraft 2.0 是一个面向 GitHub Profile、README 和项目展示的像素风数据可视化工具。它把提交记录、用户统计和仓库信息，换算成一座可以浏览、调节、下载和嵌入的像素农场。

### 贡献草地

<p align="center">
  <img src="docs/examples/mu-scorpio-contribution-meadow.svg" alt="Mu-scorpio 带农场外框的贡献草地 SVG" width="960" />
</p>

### 战利品大厅

每项统计都可以独立下载、引用和嵌入：

<table>
  <tr>
    <td align="center"><img src="docs/examples/mu-scorpio-loot-commits.svg" alt="Mu-scorpio commits 战利品徽章" width="180" /></td>
    <td align="center"><img src="docs/examples/mu-scorpio-loot-prs.svg" alt="Mu-scorpio pull requests 战利品徽章" width="180" /></td>
    <td align="center"><img src="docs/examples/mu-scorpio-loot-stars.svg" alt="Mu-scorpio stars 战利品徽章" width="180" /></td>
    <td align="center"><img src="docs/examples/mu-scorpio-loot-issues.svg" alt="Mu-scorpio issues 战利品徽章" width="180" /></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/examples/mu-scorpio-loot-followers.svg" alt="Mu-scorpio followers 战利品徽章" width="180" /></td>
    <td align="center"><img src="docs/examples/mu-scorpio-loot-repos.svg" alt="Mu-scorpio repositories 战利品徽章" width="180" /></td>
    <td align="center"><img src="docs/examples/mu-scorpio-loot-merged.svg" alt="Mu-scorpio merged pull requests 战利品徽章" width="180" /></td>
    <td></td>
  </tr>
</table>

### 玩家护照

<p align="center">
  <img src="docs/examples/mu-scorpio-player-passport.svg" alt="Mu-scorpio 玩家护照 SVG" width="720" />
</p>

### 仓库卡片

<p align="center">
  <img src="docs/examples/farmcraft-repo-card.svg" alt="FarmCraft 仓库卡片 SVG" width="960" />
</p>

## 项目结构

```text
app/
├─ page.tsx                         页面、输入解析、视图切换
├─ components/                      四种视图与编辑器组件
├─ api/                             数据与 SVG 接口
└─ lib/
   ├─ github.ts                     GitHub 访问与数据整理
   ├─ inputParser.ts                用户名、仓库短格式、GitHub URL 解析
   ├─ mapSvg.ts                     贡献草地 SVG
   ├─ bannerSvg.ts                  战利品大厅 SVG
   ├─ cardSvg.ts                    玩家护照 SVG
   └─ repoSvg.ts                    仓库卡片 SVG 与编辑配置
public/assets/                      农场与仓库卡片素材
docs/
├─ examples/                        README 直接展示的 SVG 成果
└─ screenshots/                     README 首页截图
worker/                             Cloudflare Workers 入口
```

## 素材与授权

- 项目灵感来源于 [wjz-p](https://github.com/wjz-p) 的 GitHub 项目。
- 农场素材来自 [Kenney Pixel Platformer Farm Expansion](https://kenney.nl/assets/pixel-platformer-farm-expansion)，项目内保留 CC0 许可文件。
- 像素字体使用 [Zpix](https://github.com/SolidZORO/zpix-pixel-font)。
- 项目整体授权见 [LICENSE](LICENSE)：Creative Commons Attribution-NonCommercial 4.0 International。

## 开发状态

这是一个持续生长中的个人项目。欢迎提交 Issue、提出视觉建议，或者把自己的 GitHub 仓库种进农场里。

## 部署指南

### 本地开发

```bash
git clone https://github.com/Mu-scorpio/farmcraft-profile-generator.git
cd farmcraft-profile-generator
npm install
npm run dev
```

然后打开 <http://127.0.0.1:3001>。

### 生产运行

```bash
npm run build
npm run start
```

### Cloudflare Workers

仓库保留了 `vite.config.ts`、`wrangler.jsonc` 和 `worker/` 部署链路：

```bash
npm run build:vinext
npm run deploy
```
