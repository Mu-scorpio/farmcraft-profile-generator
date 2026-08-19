"use client";

import { useMemo, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { UserStats } from "@/app/lib/github";
import { buildStats, generateLootHallSvg, TIER_CONFIG, type StatItem } from "@/app/lib/bannerSvg";
import EndpointCopyBox from "./EndpointCopyBox";

interface BannerHallProps {
  stats: UserStats;
  totalContributions: number;
  username: string;
}

function toneForTier(tier: string): string {
  if (tier.startsWith("S")) return "orchard";
  if (tier.startsWith("A")) return "pumpkin";
  if (tier.startsWith("B")) return "gold";
  if (tier.startsWith("C")) return "stone";
  return "fallow";
}

function LootBadge({ stat, index }: { stat: StatItem; index: number }) {
  const config = TIER_CONFIG[stat.tier];
  const tone = toneForTier(stat.tier);

  return (
    <article
      className={`loot-badge loot-tone-${tone}`}
      style={{ "--loot-color": config.base, "--loot-text": "#fff4c8", "--loot-delay": `${index * 55}ms` } as CSSProperties}
    >
      <div className="loot-badge-rivet loot-rivet-top-left" />
      <div className="loot-badge-rivet loot-rivet-top-right" />
      <div className="loot-badge-rivet loot-rivet-bottom-left" />
      <div className="loot-badge-rivet loot-rivet-bottom-right" />
      <div className="loot-badge-header">{stat.title}</div>
      <div className="loot-icon-socket">
        <span className="loot-icon-glow" />
        <img src={stat.icon} alt="" />
      </div>
      <div className="loot-badge-value">{stat.value}</div>
      <div className="loot-badge-sheen" />
    </article>
  );
}

export default function BannerHall({ stats, totalContributions, username }: BannerHallProps) {
  const t = useTranslations("components");
  const statItems = useMemo(() => buildStats(stats, totalContributions), [stats, totalContributions]);

  const handleDownload = () => {
    const svg = generateLootHallSvg(statItems);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${username}-loot-hall.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="loot-hall mt-8">
      <div className="mc-player-bar loot-control-bar mb-3">
        <div className="loot-control-copy">
          <span className="loot-control-mark" aria-hidden="true" />
          <div>
            <p className="loot-eyebrow">BANNER HALL · 2.0</p>
            <p className="loot-control-title">{username}</p>
          </div>
          <span className="loot-control-total">{totalContributions.toLocaleString()} {t("contributions")}</span>
        </div>
        <button type="button" onClick={handleDownload} className="mc-btn-secondary text-sm">
          {t("downloadSvg")}
        </button>
      </div>

      <div className="loot-hall-intro">
        <div>
          <p className="loot-eyebrow">DROP TABLE · FARMCRAFT</p>
          <h3 className="loot-title">{t("lootTitle")}</h3>
        </div>
        <p className="loot-intro-copy">{t("lootIntro")}</p>
      </div>

      <div className="loot-badge-grid">
        {statItems.map((stat, index) => <LootBadge key={stat.id} stat={stat} index={index} />)}
      </div>

      <div className="loot-endpoints">
        {statItems.map((stat) => (
          <EndpointCopyBox
            key={stat.id}
            label={stat.title}
            url={`/api/banner/${encodeURIComponent(username)}/${stat.id}.svg`}
          />
        ))}
      </div>

      <p className="loot-hint">{t("lootHint")}</p>
    </div>
  );
}
