"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DEFAULT_REPO_CARD_EDITOR_CONFIG,
  generateRepoSvg,
  type RepoCardEditorConfig,
  type RepoSvgParams,
} from "@/app/lib/repoSvg";
import { REPO_CARD_ASSETS } from "@/app/lib/themeAssets";
import EndpointCopyBox from "./EndpointCopyBox";

interface RepoCardProps {
  repoData: RepoSvgParams;
}

type NumericEditorKey = Exclude<keyof RepoCardEditorConfig, "heroAsset" | "statIconAssets">;

const HERO_OPTIONS = [
  { key: "chest", asset: REPO_CARD_ASSETS.hero, labelKey: "heroChest" },
  { key: "controller", asset: REPO_CARD_ASSETS.heroController, labelKey: "heroController" },
  { key: "gears", asset: REPO_CARD_ASSETS.heroGears, labelKey: "heroGears" },
  { key: "brain", asset: REPO_CARD_ASSETS.heroBrain, labelKey: "heroBrain" },
] as const;

const ICON_OPTIONS = [
  { key: "star", asset: REPO_CARD_ASSETS.iconStar, labelKey: "iconStar" },
  { key: "fork", asset: REPO_CARD_ASSETS.iconFork, labelKey: "iconFork" },
  { key: "orb", asset: REPO_CARD_ASSETS.iconOrb, labelKey: "iconOrb" },
  { key: "tag", asset: REPO_CARD_ASSETS.iconTag, labelKey: "iconTag" },
  { key: "gears", asset: REPO_CARD_ASSETS.iconGears, labelKey: "iconGears" },
  { key: "chest", asset: REPO_CARD_ASSETS.iconChest, labelKey: "iconChest" },
] as const;

const STAT_ITEMS = [
  { labelKey: "statStars", index: 0 },
  { labelKey: "statForks", index: 1 },
  { labelKey: "statLanguage", index: 2 },
  { labelKey: "statStatus", index: 3 },
] as const;

function cloneDefaultEditorConfig(): RepoCardEditorConfig {
  return {
    ...DEFAULT_REPO_CARD_EDITOR_CONFIG,
    statIconAssets: [...DEFAULT_REPO_CARD_EDITOR_CONFIG.statIconAssets] as RepoCardEditorConfig["statIconAssets"],
  };
}

interface EditorRangeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function EditorRange({ label, value, min, max, step = 1, suffix = "px", onChange }: EditorRangeProps) {
  return (
    <label className="repo-editor-range">
      <span className="repo-editor-range-head">
        <span>{label}</span>
        <output>{value}{suffix}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
    </label>
  );
}

export default function RepoCard({ repoData }: RepoCardProps) {
  const t = useTranslations("components");
  const [animKey, setAnimKey] = useState(0);
  const [editorConfig, setEditorConfig] = useState<RepoCardEditorConfig>(cloneDefaultEditorConfig);
  const fontCacheRef = useRef<Record<string, opentype.Font>>({});

  useEffect(() => {
    setEditorConfig(cloneDefaultEditorConfig());
    setAnimKey((key) => key + 1);
  }, [repoData.owner, repoData.repo]);

  const updateNumber = useCallback((key: NumericEditorKey, value: number) => {
    setEditorConfig((current) => ({ ...current, [key]: value }));
  }, []);

  const updateStatIcon = useCallback((index: number, asset: string) => {
    setEditorConfig((current) => {
      const statIconAssets = [...current.statIconAssets] as RepoCardEditorConfig["statIconAssets"];
      statIconAssets[index] = asset;
      return { ...current, statIconAssets };
    });
  }, []);

  const svgHtml = useMemo(() => {
    return generateRepoSvg(repoData, {}, editorConfig);
  }, [repoData, editorConfig, animKey]);

  const handleDownload = useCallback(async () => {
    const opentype = (await import("opentype.js")).default;

    const fontUrl = "/fonts/zpix.ttf";
    if (!fontCacheRef.current[fontUrl]) {
      const res = await fetch(fontUrl);
      const buf = await res.arrayBuffer();
      fontCacheRef.current[fontUrl] = opentype.parse(buf);
    }
    const font = fontCacheRef.current[fontUrl];
    const zpixFont = font;

    const container = document.createElement("div");
    container.innerHTML = svgHtml;
    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    const isAscii = (ch: string) => ch.charCodeAt(0) <= 0x7f;
    const bakeMixed = (
      text: string,
      startX: number,
      yPos: number,
      fontSize: number,
      fillColor: string,
    ): { elements: SVGElement[]; endX: number } => {
      const elements: SVGElement[] = [];
      let curX = startX;
      const segments: { text: string; ascii: boolean }[] = [];
      for (const character of text) {
        const ascii = isAscii(character);
        if (segments.length > 0 && segments[segments.length - 1].ascii === ascii) {
          segments[segments.length - 1].text += character;
        } else {
          segments.push({ text: character, ascii });
        }
      }
      for (const segment of segments) {
        const activeFont = segment.ascii ? font : zpixFont;
        const path = activeFont.getPath(segment.text, curX, yPos, fontSize);
        const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElement.setAttribute("d", path.toPathData(5));
        pathElement.setAttribute("fill", fillColor);
        elements.push(pathElement);
        curX += activeFont.getAdvanceWidth(segment.text, fontSize);
      }
      return { elements, endX: curX };
    };

    const texts = Array.from(svgEl.querySelectorAll("text"));
    for (const textElement of texts) {
      const fontSize = parseFloat(textElement.getAttribute("font-size") || "16");
      const fill = textElement.getAttribute("fill") || "#000";
      const filter = textElement.getAttribute("filter") || "";
      const anchor = textElement.getAttribute("text-anchor") as "start" | "middle" | "end" || "start";
      const text = textElement.textContent || "";
      const x = parseFloat(textElement.getAttribute("x") || "0");
      const y = parseFloat(textElement.getAttribute("y") || "0");
      let totalWidth = 0;
      for (const character of text) {
        totalWidth += isAscii(character) ? font.getAdvanceWidth(character, fontSize) : fontSize;
      }
      let drawX = x;
      if (anchor === "middle") drawX -= totalWidth / 2;
      if (anchor === "end") drawX -= totalWidth;

      const { elements } = bakeMixed(text, drawX, y, fontSize, fill);
      if (filter || elements.length > 1) {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        if (filter) group.setAttribute("filter", filter);
        elements.forEach((element) => group.appendChild(element));
        textElement.replaceWith(group);
      } else if (elements.length === 1) {
        textElement.replaceWith(elements[0]);
      }
    }

    const blobToDataUri = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error("Failed to read SVG asset"));
      reader.readAsDataURL(blob);
    });
    const imageElements = Array.from(svgEl.querySelectorAll("image"));
    await Promise.all(imageElements.map(async (image) => {
      const href = image.getAttribute("href") || image.getAttribute("xlink:href");
      if (!href || href.startsWith("data:")) return;
      try {
        const response = await fetch(new URL(href, window.location.href).toString());
        if (!response.ok) return;
        image.setAttribute("href", await blobToDataUri(await response.blob()));
        image.removeAttribute("xlink:href");
      } catch {
        // Preserve the same-origin path as a graceful fallback.
      }
    }));

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${repoData.owner}-${repoData.repo}-card.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }, [svgHtml, repoData.owner, repoData.repo]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const endpointUrl = `${baseUrl}/api/repo/${repoData.owner}/${repoData.repo}.svg`;

  return (
    <div className="repo-editor mt-6 w-full">
      <div className="repo-editor-heading">
        <div>
          <p className="repo-editor-eyebrow">REPO CARD WORKSHOP</p>
          <h3>{t("repoEditor.title")}</h3>
          <p>{t("repoEditor.subtitle")}</p>
        </div>
        <button type="button" className="mc-btn-secondary text-xs" onClick={() => {
          setEditorConfig(cloneDefaultEditorConfig());
          setAnimKey((key) => key + 1);
        }}>
          {t("repoEditor.reset")}
        </button>
      </div>

      <div className="repo-editor-workspace">
        <aside className="repo-editor-controls" aria-label={t("repoEditor.title")}>
          <section className="repo-editor-section">
            <h4>{t("repoEditor.heroBadge")}</h4>
            <div className="repo-editor-choice-grid">
              {HERO_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`repo-editor-choice ${editorConfig.heroAsset === option.asset ? "is-selected" : ""}`}
                  aria-pressed={editorConfig.heroAsset === option.asset}
                  onClick={() => setEditorConfig((current) => ({ ...current, heroAsset: option.asset }))}
                >
                  <img src={option.asset} alt="" />
                  <span>{t(`repoEditor.${option.labelKey}`)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="repo-editor-section">
            <h4>{t("repoEditor.statIcons")}</h4>
            <div className="repo-editor-stat-list">
              {STAT_ITEMS.map((item) => (
                <div className="repo-editor-stat-slot" key={item.labelKey}>
                  <span className="repo-editor-slot-label">{t(`repoEditor.${item.labelKey}`)}</span>
                  <div className="repo-editor-icon-palette">
                    {ICON_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={editorConfig.statIconAssets[item.index] === option.asset ? "is-selected" : ""}
                        aria-label={`${t(`repoEditor.${item.labelKey}`)}: ${t(`repoEditor.${option.labelKey}`)}`}
                        aria-pressed={editorConfig.statIconAssets[item.index] === option.asset}
                        onClick={() => updateStatIcon(item.index, option.asset)}
                      >
                        <img src={option.asset} alt="" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="repo-editor-section">
            <h4>{t("repoEditor.typography")}</h4>
            <div className="repo-editor-control-grid">
              <EditorRange label={t("repoEditor.ribbonSize")} value={editorConfig.ribbonFontSize} min={24} max={48} onChange={(value) => updateNumber("ribbonFontSize", value)} />
              <EditorRange label={t("repoEditor.titleSize")} value={editorConfig.titleFontSize} min={30} max={56} onChange={(value) => updateNumber("titleFontSize", value)} />
              <EditorRange label={t("repoEditor.descriptionSize")} value={editorConfig.descriptionFontSize} min={12} max={24} onChange={(value) => updateNumber("descriptionFontSize", value)} />
              <EditorRange label={t("repoEditor.statsLabelSize")} value={editorConfig.statsLabelFontSize} min={10} max={20} onChange={(value) => updateNumber("statsLabelFontSize", value)} />
              <EditorRange label={t("repoEditor.statsValueSize")} value={editorConfig.statsValueFontSize} min={16} max={32} onChange={(value) => updateNumber("statsValueFontSize", value)} />
              <EditorRange label={t("repoEditor.iconSize")} value={editorConfig.statsIconSize} min={36} max={68} onChange={(value) => updateNumber("statsIconSize", value)} />
            </div>
          </section>

          <section className="repo-editor-section">
            <h4>{t("repoEditor.position")}</h4>
            <div className="repo-editor-control-grid">
              <EditorRange label={t("repoEditor.ribbonX")} value={editorConfig.ribbonX} min={400} max={560} onChange={(value) => updateNumber("ribbonX", value)} />
              <EditorRange label={t("repoEditor.ribbonY")} value={editorConfig.ribbonY} min={76} max={120} onChange={(value) => updateNumber("ribbonY", value)} />
              <EditorRange label={t("repoEditor.titleX")} value={editorConfig.titleX} min={380} max={500} onChange={(value) => updateNumber("titleX", value)} />
              <EditorRange label={t("repoEditor.titleY")} value={editorConfig.titleY} min={155} max={220} onChange={(value) => updateNumber("titleY", value)} />
              <EditorRange label={t("repoEditor.descriptionX")} value={editorConfig.descriptionX} min={380} max={500} onChange={(value) => updateNumber("descriptionX", value)} />
              <EditorRange label={t("repoEditor.descriptionY")} value={editorConfig.descriptionY} min={210} max={270} onChange={(value) => updateNumber("descriptionY", value)} />
              <EditorRange label={t("repoEditor.statsX")} value={editorConfig.statsX} min={360} max={440} onChange={(value) => updateNumber("statsX", value)} />
              <EditorRange label={t("repoEditor.statsY")} value={editorConfig.statsY} min={280} max={312} onChange={(value) => updateNumber("statsY", value)} />
            </div>
          </section>
        </aside>

        <section className="repo-editor-preview">
          <div className="repo-editor-preview-head">
            <h4>{t("repoEditor.preview")}</h4>
            <span>{repoData.owner}/{repoData.repo}</span>
          </div>
          <div
            key={animKey}
            className="mc-display repo-editor-canvas flex w-full items-center justify-center p-4"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
          <div className="repo-editor-actions">
            <button type="button" className="mc-btn-secondary text-xs px-4 py-2" onClick={() => setAnimKey((key) => key + 1)}>
              {t("replay")}
            </button>
            <button type="button" className="mc-btn text-xs px-4 py-2" onClick={handleDownload}>
              {t("download")}
            </button>
          </div>
        </section>
      </div>

      <div className="mt-4 w-full">
        <EndpointCopyBox url={endpointUrl} label={t("repoCardLabel")} />
      </div>
    </div>
  );
}
