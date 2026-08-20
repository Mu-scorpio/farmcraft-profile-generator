"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ContributionDay, ContributionCalendar, UserStats } from "@/app/lib/github";
import { contributionLevel, generateMapSvg, MAP_LEVELS } from "@/app/lib/mapSvg";
import EndpointCopyBox from "./EndpointCopyBox";

interface ContributionMapProps {
  calendar: ContributionCalendar;
  username: string;
  avatarUrl?: string | null;
  stats?: UserStats | null;
}

function fallbackAvatarUrl(): string {
  return "/assets/farm/avatar-fallback.svg";
}

function formatDay(day: ContributionDay): string {
  return `${day.date} · ${day.contributionCount.toLocaleString()} contributions`;
}

export default function ContributionMap({ calendar, username, avatarUrl, stats }: ContributionMapProps) {
  const t = useTranslations("components");
  const allDays = useMemo(() => calendar.weeks.flatMap((week) => week.contributionDays), [calendar.weeks]);
  const [selectedDay, setSelectedDay] = useState<ContributionDay | null>(allDays[allDays.length - 1] || null);

  useEffect(() => {
    setSelectedDay(allDays[allDays.length - 1] || null);
  }, [allDays]);

  const handleDownload = () => {
    const svg = generateMapSvg({ weeks: calendar.weeks, interactive: false, animate: true });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${username}-contribution-meadow.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (calendar.weeks.length === 0) return null;

  const selectedLevel = selectedDay ? contributionLevel(selectedDay) : 0;
  const activeAvatar = avatarUrl || fallbackAvatarUrl();

  return (
    <div className="contribution-map mt-8">
      <div className="mc-player-bar meadow-player-bar mb-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="mc-avatar-frame meadow-avatar-frame">
            <img
              src={activeAvatar}
              alt={username}
              onError={(event) => {
                const image = event.currentTarget;
                if (image.dataset.fallback === "true") return;
                image.dataset.fallback = "true";
                image.src = fallbackAvatarUrl();
              }}
            />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="meadow-username">{username}</span>
            <span className="meadow-total">{calendar.totalContributions.toLocaleString()} {t("contributions")}</span>
          </div>
        </div>
        <button type="button" onClick={handleDownload} className="mc-btn-secondary text-sm">
          {t("downloadSvg")}
        </button>
      </div>

      <div className="meadow-heading-row">
        <div>
          <p className="meadow-eyebrow">CONTRIBUTION MEADOW</p>
          <h3 className="meadow-title">{t("meadowTitle")}</h3>
        </div>
        <div className="meadow-total-chip">
          <span>{calendar.totalContributions.toLocaleString()}</span>
          <small>{t("contributions")}</small>
        </div>
      </div>

      <div className="meadow-farm-frame">
        <img className="meadow-border-art" src="/assets/farm/meadow-border.png" alt="" aria-hidden="true" />
        <div className="meadow-field-window">
          <div className="meadow-grid-scroll" role="grid" aria-label={t("mapHint")}>
            <div className="meadow-grid">
              {calendar.weeks.map((week, weekIndex) => week.contributionDays.map((day) => {
                const level = contributionLevel(day);
                return (
                  <button
                    type="button"
                    key={day.date}
                    className={`grass-cell grass-level-${level}`}
                    role="gridcell"
                    aria-label={formatDay(day)}
                    title={formatDay(day)}
                    onMouseEnter={() => setSelectedDay(day)}
                    onFocus={() => setSelectedDay(day)}
                    style={{ animationDelay: `${(weekIndex % 9) * 20}ms` }}
                  >
                    <span className="grass-plot" aria-hidden="true" />
                  </button>
                );
              }))}
            </div>
          </div>
        </div>
      </div>

      <div className="meadow-detail-row">
        <div className="meadow-detail-copy">
          <span className="meadow-detail-date">{selectedDay?.date || "—"}</span>
          <span className="meadow-detail-count">{selectedDay?.contributionCount.toLocaleString() || "0"} {t("dayContributions")}</span>
          <span className="meadow-detail-stage">{MAP_LEVELS[selectedLevel].label}</span>
        </div>
        <div className="meadow-legend" aria-label={t("growthLegend")}>
          {MAP_LEVELS.map((level, index) => (
            <span key={level.label} className={`legend-item legend-level-${index}`}>
              <span className="legend-swatch" aria-hidden="true" />
              <span>{level.label}</span>
            </span>
          ))}
        </div>
      </div>

      {stats && <p className="meadow-secondary-note">{stats.publicRepos.toLocaleString()} {t("meadowRepos")} · {stats.followers.toLocaleString()} {t("meadowNeighbors")}</p>}

      <div className="mt-3">
        <EndpointCopyBox url={`/api/map/${encodeURIComponent(username)}.svg`} />
      </div>
      <p className="map-hint">{t("mapHint")}</p>
    </div>
  );
}
