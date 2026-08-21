# FarmCraft design system

FarmCraft 2.0 keeps CommitCraft's generation model and SVG-first output, but moves the visual language to a dense, hand-built pixel village with grass growth and loot badges.

- Color palette: deep forest `#16392d`, spruce `#28533d`, leaf `#4f7f3d`, paper `#f4e5bf`, soil `#a86848`, water `#3d8c96`, crop gold `#e5ad4b`, berry `#c86662`.
- Typography: local Zpix pixel font for UI headings and labels; monospace fallback for content and code snippets.
- Spacing: 4px base unit, with 8 / 12 / 16 / 24 / 32px rhythm.
- Shape language: 2px pixel corners, dark 4px keylines, inset highlights, and small wooden/metal layered panels.
- Texture: a locally bundled village panorama plus small CC0 farm sprites in `public/assets/farm`; no Stardew Valley proprietary sprites are redistributed.
- Motion: short 120–220ms press/hover feedback, slow parallax on the farm background, and optional weather particles inherited from the reference flow.
- Interaction: username and repository parsing match CommitCraft; weather switches between rain and clear, the meadow exposes hover details, and each generated view exposes SVG download plus an embeddable endpoint.

The initial page starts empty and only renders data after the user submits a GitHub username or repository. Live public REST data is used when a target is generated; `GITHUB_TOKEN` remains optional for higher-fidelity GraphQL statistics.
