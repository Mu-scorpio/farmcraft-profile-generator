/**
 * FarmCraft 2.0 contribution field.
 *
 * The heatmap uses solid color plots. Activity is encoded by the plot color;
 * the pixel farm border keeps the map readable as a profile-sized illustration.
 */

import type { ContributionDay, ContributionWeek } from "./github";

export const MAP_LEVELS = [
  { label: "Fallow", color: "#8b511f", border: "#593015" },
  { label: "Seed", color: "#b46b22", border: "#6f3b16" },
  { label: "Sprout", color: "#75872b", border: "#4b5018" },
  { label: "Meadow", color: "#20a34b", border: "#0b5b31" },
  { label: "Bloom", color: "#087a32", border: "#053e22" },
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

export interface MapSvgParams {
  weeks: ContributionWeek[];
  interactive?: boolean;
  animate?: boolean;
  borderHref?: string;
}

export function generateMapSvg({
  weeks,
  interactive = false,
  animate = false,
  borderHref = "/assets/farm/meadow-border.png",
}: MapSvgParams): string {
  // Coordinates match the cropped 1672 × 540 farm border asset.
  const width = 1200;
  const height = 388;
  const fieldX = 127;
  const fieldY = 165;
  const fieldWidth = 966;
  const fieldHeight = 170;
  const fieldGap = 3;
  const columnCount = Math.max(1, weeks.length);
  const cellSize = Math.min(
    (fieldWidth - fieldGap * (columnCount - 1)) / columnCount,
    (fieldHeight - fieldGap * 6) / 7,
  );
  const gridHeight = cellSize * 7 + fieldGap * 6;
  const gridY = fieldY + (fieldHeight - gridHeight) / 2;
  const cells: string[] = [];

  weeks.forEach((week, weekIndex) => {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = week.contributionDays[dayIndex];
      if (!day) continue;

      const level = contributionLevel(day);
      const palette = MAP_LEVELS[level];
      const x = fieldX + weekIndex * (cellSize + fieldGap);
      const y = gridY + dayIndex * (cellSize + fieldGap);
      const title = `${day.date} · ${day.contributionCount.toLocaleString()} contributions`;
      const animationClass = animate ? ` class="field-cell-rise field-cell-rise-${(weekIndex + dayIndex) % 7}"` : "";

      cells.push(`<g data-date="${escapeXml(day.date)}" data-level="${level}"${interactive ? " tabindex=\"0\"" : ""}${animationClass}>
        <title>${escapeXml(title)}</title>
      <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" rx="2" fill="${palette.color}" stroke="${palette.border}" stroke-width="2" />
      </g>`);
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="contribution-meadow-svg" role="img" aria-label="Contribution meadow">
  <title>Contribution meadow</title>
  <desc>Solid color contribution plots framed as a pixel farm.</desc>
  <style>
    .field-cell-rise { transform-box: fill-box; transform-origin: center; animation: field-cell-in .32s steps(3, end) both; }
    .field-cell-rise-1 { animation-delay: .04s; } .field-cell-rise-2 { animation-delay: .08s; }
    .field-cell-rise-3 { animation-delay: .12s; } .field-cell-rise-4 { animation-delay: .16s; }
    .field-cell-rise-5 { animation-delay: .20s; } .field-cell-rise-6 { animation-delay: .24s; }
    @keyframes field-cell-in { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
  </style>
  <rect width="${width}" height="${height}" fill="#101b14" />
  <image href="${escapeXml(borderHref)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" />
  <rect x="${fieldX - 5}" y="${fieldY - 5}" width="${fieldWidth + 10}" height="${fieldHeight + 10}" rx="5" fill="#5d361b" stroke="#24170e" stroke-width="3" />
  ${cells.join("")}
</svg>`;
}
