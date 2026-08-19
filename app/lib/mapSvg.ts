/**
 * FarmCraft 2.0 contribution meadow.
 *
 * Contributions are rendered as a 2D field: each day is a small soil plot and
 * the number of leaves/height of the grass communicates activity at a glance.
 * The same pure SVG generator powers the preview download and the public API.
 */

import type { ContributionDay, ContributionWeek } from "./github";

export const MAP_LEVELS = [
  { label: "Fallow", soil: "#9d6f47", grass: "#7d9b55", shadow: "#5e452f" },
  { label: "Seed", soil: "#a97548", grass: "#a0bd67", shadow: "#6f4a32" },
  { label: "Sprout", soil: "#6f9550", grass: "#b8cf70", shadow: "#375d40" },
  { label: "Meadow", soil: "#4f814a", grass: "#d1df86", shadow: "#244d3b" },
  { label: "Bloom", soil: "#356a43", grass: "#ebdc8b", shadow: "#173b31" },
] as const;

export function contributionLevel(day: Pick<ContributionDay, "contributionCount">): number {
  const count = Math.max(0, day.contributionCount || 0);
  if (count === 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 12) return 3;
  return 4;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function grassArtwork(x: number, y: number, level: number, index: number, animated: boolean): string {
  const palette = MAP_LEVELS[Math.max(0, Math.min(4, level))];
  const stemHeight = [2, 5, 8, 12, 15][level] || 2;
  const baseY = y + 18;
  const stemY = baseY - stemHeight;
  const animationClass = animated && level > 0 ? ` class="grass-grow grass-grow-${index % 7}"` : "";

  if (level === 0) {
    return `<g${animationClass}>
      <rect x="${x + 8}" y="${y + 14}" width="2" height="2" fill="${palette.grass}" opacity="0.75" />
      <rect x="${x + 11}" y="${y + 15}" width="2" height="1" fill="${palette.grass}" opacity="0.5" />
    </g>`;
  }

  const leaves = [
    `<rect x="${x + 8}" y="${stemY + 2}" width="5" height="2" fill="${palette.grass}" />`,
    `<rect x="${x + 5}" y="${stemY + 5}" width="5" height="2" fill="${palette.grass}" />`,
    `<rect x="${x + 10}" y="${stemY + 7}" width="5" height="2" fill="${palette.grass}" />`,
    `<rect x="${x + 4}" y="${stemY + 10}" width="4" height="2" fill="${palette.grass}" opacity="0.9" />`,
  ].slice(0, level + 1).join("");

  const bloom = level === 4
    ? `<rect x="${x + 8}" y="${stemY - 2}" width="4" height="3" fill="#efd77d" /><rect x="${x + 7}" y="${stemY - 1}" width="6" height="1" fill="#f6e8a5" />`
    : "";

  return `<g${animationClass}>
    <rect x="${x + 9}" y="${stemY}" width="2" height="${stemHeight + 2}" fill="${palette.shadow}" />
    ${leaves}
    ${bloom}
    <rect x="${x + 7}" y="${baseY - 1}" width="7" height="2" fill="${palette.shadow}" opacity="0.75" />
  </g>`;
}

export interface MapSvgParams {
  weeks: ContributionWeek[];
  interactive?: boolean;
  animate?: boolean;
}

export function generateMapSvg({ weeks, interactive = false, animate = false }: MapSvgParams): string {
  const cell = 20;
  const gap = 4;
  const left = 58;
  const top = 42;
  const gridWidth = Math.max(1, weeks.length) * (cell + gap) - gap;
  const width = left + gridWidth + 34;
  const height = top + 7 * (cell + gap) - gap + 50;
  const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const monthLabels: string[] = [];
  let previousMonth = "";

  const cells: string[] = [];
  weeks.forEach((week, weekIndex) => {
    const month = week.contributionDays[0]?.date?.slice(0, 7) || "";
    if (month && month !== previousMonth) {
      monthLabels.push(`<text x="${left + weekIndex * (cell + gap)}" y="24" class="map-month">${escapeXml(month)}</text>`);
      previousMonth = month;
    }

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = week.contributionDays[dayIndex];
      if (!day) continue;
      const level = contributionLevel(day);
      const x = left + weekIndex * (cell + gap);
      const y = top + dayIndex * (cell + gap);
      const palette = MAP_LEVELS[level];
      const title = `${day.date} · ${day.contributionCount.toLocaleString()} contributions`;
      cells.push(`<g data-date="${escapeXml(day.date)}" data-level="${level}"${interactive ? " tabindex=\"0\"" : ""}>
        <title>${escapeXml(title)}</title>
        <rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${palette.soil}" stroke="#18392f" stroke-width="1" />
        <rect x="${x + 2}" y="${y + 2}" width="${cell - 4}" height="2" rx="1" fill="#f5df9c" opacity="0.22" />
        ${grassArtwork(x, y, level, weekIndex + dayIndex, animate)}
      </g>`);
    }
  });

  const legend = MAP_LEVELS.map((palette, level) => {
    const x = left + level * 74;
    const y = height - 25;
    return `<g transform="translate(${x},${y})">
      <rect width="18" height="18" rx="3" fill="${palette.soil}" stroke="#18392f" />
      ${grassArtwork(0, 0, level, level, false)}
      <text x="24" y="13" class="map-legend">${palette.label}</text>
    </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="contribution-meadow-svg" role="img" aria-label="Contribution meadow">
  <style>
    .map-month,.map-days,.map-legend { font-family: 'Zpix', 'Courier New', monospace; fill: #f5e7bd; font-size: 11px; letter-spacing: .04em; }
    .map-days { fill: #a9c58e; font-size: 9px; }
    .map-legend { fill: #d9e5bf; font-size: 9px; }
    .grass-grow { transform-box: fill-box; transform-origin: center bottom; animation: grass-rise .55s steps(3, end) both; }
    .grass-grow-1 { animation-delay: .04s; } .grass-grow-2 { animation-delay: .08s; } .grass-grow-3 { animation-delay: .12s; }
    .grass-grow-4 { animation-delay: .16s; } .grass-grow-5 { animation-delay: .2s; } .grass-grow-6 { animation-delay: .24s; }
    @keyframes grass-rise { from { opacity: 0; transform: scaleY(.55); } to { opacity: 1; transform: scaleY(1); } }
  </style>
  <rect width="${width}" height="${height}" rx="10" fill="#17392f" />
  <rect x="8" y="8" width="${width - 16}" height="${height - 16}" rx="8" fill="none" stroke="#5f8b61" stroke-width="2" opacity=".45" />
  <text x="16" y="24" class="map-days">DAY</text>
  ${dayLabels.map((label, index) => `<text x="16" y="${top + index * (cell + gap) + 13}" class="map-days">${label}</text>`).join("")}
  ${monthLabels.join("")}
  ${cells.join("")}
  ${legend}
</svg>`;
}
