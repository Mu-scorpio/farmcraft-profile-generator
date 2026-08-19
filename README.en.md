# FarmCraft

Plant your GitHub activity into a dense pixel village. FarmCraft previews, downloads, and serves a 2D contribution meadow, loot badges, farmer passports, and repository cards for GitHub profile READMEs.

This is the FarmCraft 2.0 visual rebuild of the [CommitCraft](https://github.com/WJZ-P/CommitCraft) generation flow. The four SVG outputs and URL APIs remain, while the visual language becomes a dense village, growing grass, loot badges, and the Zpix pixel font.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. The home page includes deterministic demo data, and accepts a GitHub username, `owner/repo`, or a full repository URL.

```bash
npm run build
npm run start
```

Without a GitHub token, the server uses GitHub's public REST endpoints and contribution calendar page. For higher usage, add `GITHUB_TOKEN` to `.env.local`.

## Output APIs

```text
/api/map/{username}.svg
/api/card/{username}.svg?quote=Keep%20growing
/api/banner/{username}/{statId}.svg
/api/repo/{owner}/{repo}.svg
```

Supported `statId` values are `commits`, `prs`, `stars`, `issues`, `followers`, `repos`, and `merged`.

```md
![Contribution Farm](https://your-domain.example/api/map/your-name.svg)
![Farmer Passport](https://your-domain.example/api/card/your-name.svg)
![Repository Harvest](https://your-domain.example/api/repo/owner/repo.svg)
```

## Assets and attribution

- Farm tiles come from [Kenney Pixel Platformer Farm Expansion](https://kenney.nl/assets/pixel-platformer-farm-expansion). Its CC0 license is included at `public/assets/farm/LICENSE.txt`.
- The local pixel font is [Zpix](https://github.com/SolidZORO/zpix-pixel-font), stored at `public/fonts/zpix.ttf` for the page and downloaded SVGs.
- The architecture, output types, and interaction goals are informed by [WJZ-P/CommitCraft](https://github.com/WJZ-P/CommitCraft); the FarmCraft visual implementation and local asset composition are a separate adaptation.

## Structure

- `app/page.tsx`: generator UI, demo data, input parsing, and view switching.
- `app/lib/mapSvg.ts`: 2D contribution meadow SVG with contribution-driven grass growth.
- `app/lib/bannerSvg.ts`, `cardSvg.ts`, `repoSvg.ts`: pixel SVG generators.
- `public/assets/farm/`: village background, pixel icons, fallback avatar, and license information.
- `DESIGN.md`: FarmCraft visual system and implementation constraints.
