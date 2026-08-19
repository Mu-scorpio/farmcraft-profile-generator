# FarmCraft

把 GitHub 贡献记录种进一座茂密的像素乡镇：二维贡献草地、战利品徽章、农夫名片和仓库卡片都可以直接预览、下载或嵌入 GitHub Profile README。

这是基于 [CommitCraft](https://github.com/WJZ-P/CommitCraft) 的生成流程重做的 FarmCraft 2.0：保留原仓库的四种 SVG 输出与 URL API，把视觉语言换成乡村小镇、发育小草、战利品徽章和 Zpix 像素字体。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:3000`。首页自带确定性的演示农场；也可以输入 GitHub 用户名、`owner/repo` 或完整仓库 URL。

```bash
npm run build
npm run start
```

没有 GitHub token 时，服务端会使用 GitHub 公共 REST 接口和贡献日历页面；访问频率较高时，可以在 `.env.local` 中配置 `GITHUB_TOKEN`。

## 输出接口

```text
/api/map/{username}.svg
/api/card/{username}.svg?quote=Keep%20growing
/api/banner/{username}/{statId}.svg
/api/repo/{owner}/{repo}.svg
```

`statId` 支持 `commits`、`prs`、`stars`、`issues`、`followers`、`repos` 和 `merged`。例如：

```md
![Contribution Farm](https://your-domain.example/api/map/your-name.svg)
![Farmer Passport](https://your-domain.example/api/card/your-name.svg)
![Repository Harvest](https://your-domain.example/api/repo/owner/repo.svg)
```

## 素材与授权

- 本地农场贴图来自 [Kenney Pixel Platformer Farm Expansion](https://kenney.nl/assets/pixel-platformer-farm-expansion)，随项目保留 CC0 许可文件：`public/assets/farm/LICENSE.txt`。
- 中文像素字体为 [Zpix](https://github.com/SolidZORO/zpix-pixel-font)，放在 `public/fonts/zpix.ttf`，用于页面和下载时的像素文字。
- 原仓库的架构、输出类型和交互目标参考 [WJZ-P/CommitCraft](https://github.com/WJZ-P/CommitCraft)；本项目的 FarmCraft 视觉实现和本地素材编排是独立改造。

## 目录速览

- `app/page.tsx`：生成器界面、演示数据、用户/仓库输入与视图切换。
- `app/lib/mapSvg.ts`：二维贡献草地 SVG，贡献量映射为小草的发育阶段。
- `app/lib/bannerSvg.ts`、`cardSvg.ts`、`repoSvg.ts`：三种像素 SVG 输出。
- `public/assets/farm/`：乡村小镇背景、像素图标、头像回退图和授权信息。
- `DESIGN.md`：FarmCraft 视觉系统与实现约束。
