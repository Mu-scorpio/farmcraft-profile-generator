"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DEFAULT_REPO_CARD_EDITOR_CONFIG,
  generateRepoSvg,
  normalizeRepoCardStatAssets,
  REPO_CARD_STAT_OPTIONS,
  type RepoCardEditorConfig,
  type RepoSvgParams,
} from "@/app/lib/repoSvg";
import { REPO_CARD_ASSETS } from "@/app/lib/themeAssets";
import EndpointCopyBox from "./EndpointCopyBox";

interface RepoCardProps {
  repoData: RepoSvgParams;
}

type NumericEditorKey = Exclude<keyof RepoCardEditorConfig, "heroAsset" | "statIconAssets" | "showStatLabels">;

const HERO_OPTIONS = [
  { key: "chest", asset: REPO_CARD_ASSETS.hero, labelKey: "heroChest" },
  { key: "controller", asset: REPO_CARD_ASSETS.heroController, labelKey: "heroController" },
  { key: "gears", asset: REPO_CARD_ASSETS.heroGears, labelKey: "heroGears" },
  { key: "brain", asset: REPO_CARD_ASSETS.heroBrain, labelKey: "heroBrain" },
  { key: "toolbox", asset: REPO_CARD_ASSETS.badgeToolbox, labelKey: "badgeToolbox" },
  { key: "bricks", asset: REPO_CARD_ASSETS.badgeBricks, labelKey: "badgeBricks" },
  { key: "pouch", asset: REPO_CARD_ASSETS.badgePouch, labelKey: "badgePouch" },
  { key: "sword", asset: REPO_CARD_ASSETS.badgeSword, labelKey: "badgeSword" },
] as const;

const ICON_OPTIONS = REPO_CARD_STAT_OPTIONS;

function cloneDefaultEditorConfig(): RepoCardEditorConfig {
  return {
    ...DEFAULT_REPO_CARD_EDITOR_CONFIG,
    statIconAssets: [...DEFAULT_REPO_CARD_EDITOR_CONFIG.statIconAssets],
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
  const [editorConfig, setEditorConfig] = useState<RepoCardEditorConfig>(cloneDefaultEditorConfig);
  const fontCacheRef = useRef<Record<string, opentype.Font>>({});

  useEffect(() => {
    setEditorConfig(cloneDefaultEditorConfig());
  }, [repoData.owner, repoData.repo]);

  const updateNumber = useCallback((key: NumericEditorKey, value: number) => {
    setEditorConfig((current) => ({ ...current, [key]: value }));
  }, []);

  const updateShowStatLabels = useCallback((showStatLabels: boolean) => {
    setEditorConfig((current) => ({ ...current, showStatLabels }));
  }, []);

  const updateStatIcon = useCallback((asset: string) => {
    setEditorConfig((current) => {
      const selectedAssets = new Set(current.statIconAssets);
      const option = REPO_CARD_STAT_OPTIONS.find((candidate) => candidate.asset === asset);
      if (!option) return current;
      if (selectedAssets.has(asset)) {
        selectedAssets.delete(asset);
      } else {
        const selectedVariant = current.statIconAssets.find((selectedAsset) => {
          const selectedOption = REPO_CARD_STAT_OPTIONS.find((candidate) => candidate.asset === selectedAsset);
          return selectedOption?.dataId === option.dataId;
        });
        if (selectedVariant) {
          selectedAssets.delete(selectedVariant);
        } else if (selectedAssets.size >= 4) {
          return current;
        }
        selectedAssets.add(asset);
      }
      return { ...current, statIconAssets: normalizeRepoCardStatAssets([...selectedAssets]) };
    });
  }, []);

  const svgHtml = useMemo(() => {
    return generateRepoSvg(repoData, {}, editorConfig, false);
  }, [repoData, editorConfig]);

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
            <div className="repo-editor-control-grid repo-editor-badge-control-grid">
              <EditorRange label={t("repoEditor.badgeX")} value={editorConfig.heroX} min={21} max={121} onChange={(value) => updateNumber("heroX", value)} />
              <EditorRange label={t("repoEditor.badgeY")} value={editorConfig.heroY} min={78} max={158} onChange={(value) => updateNumber("heroY", value)} />
              <EditorRange label={t("repoEditor.badgeWidth")} value={editorConfig.heroWidth} min={270} max={390} onChange={(value) => updateNumber("heroWidth", value)} />
              <EditorRange label={t("repoEditor.badgeHeight")} value={editorConfig.heroHeight} min={250} max={370} onChange={(value) => updateNumber("heroHeight", value)} />
            </div>
          </section>

          <section className="repo-editor-section">
            <div className="repo-editor-section-title-row">
              <div>
                <h4>{t("repoEditor.statIcons")}</h4>
                <p className="repo-editor-section-hint">{t("repoEditor.statIconsHint")}</p>
              </div>
              <output className="repo-editor-selection-count" aria-live="polite">
                {editorConfig.statIconAssets.length}/4
              </output>
            </div>
            <div className="repo-editor-stat-picker">
              {ICON_OPTIONS.map((option) => {
                const isSelected = editorConfig.statIconAssets.includes(option.asset);
                const isSelectedDataVariant = editorConfig.statIconAssets.some((selectedAsset) => {
                  const selectedOption = REPO_CARD_STAT_OPTIONS.find((candidate) => candidate.asset === selectedAsset);
                  return selectedOption?.dataId === option.dataId;
                });
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`repo-editor-stat-option ${isSelected ? "is-selected" : ""}`}
                    aria-label={t(`repoEditor.${option.pickerLabelKey}`)}
                    aria-pressed={isSelected}
                    disabled={!isSelected && !isSelectedDataVariant && editorConfig.statIconAssets.length >= 4}
                    onClick={() => updateStatIcon(option.asset)}
                  >
                    <img src={option.asset} alt="" />
                    <span>{t(`repoEditor.${option.pickerLabelKey}`)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="repo-editor-section">
            <h4>{t("repoEditor.statDisplay")}</h4>
            <div className="repo-editor-display-grid">
              <label className="repo-editor-toggle">
                <input
                  type="checkbox"
                  checked={editorConfig.showStatLabels}
                  onChange={(event) => updateShowStatLabels(event.target.checked)}
                />
                <span>{t("repoEditor.showStatLabels")}</span>
              </label>
              <EditorRange
                label={t("repoEditor.statIconGap")}
                value={editorConfig.statsIconLabelGap}
                min={4}
                max={20}
                onChange={(value) => updateNumber("statsIconLabelGap", value)}
              />
            </div>
          </section>

          <section className="repo-editor-section">
            <h4>{t("repoEditor.typography")}</h4>
            <div className="repo-editor-control-grid">
              <EditorRange label={t("repoEditor.ribbonSize")} value={editorConfig.ribbonFontSize} min={22} max={46} onChange={(value) => updateNumber("ribbonFontSize", value)} />
              <EditorRange label={t("repoEditor.titleSize")} value={editorConfig.titleFontSize} min={34} max={58} onChange={(value) => updateNumber("titleFontSize", value)} />
              <EditorRange label={t("repoEditor.descriptionSize")} value={editorConfig.descriptionFontSize} min={10} max={26} onChange={(value) => updateNumber("descriptionFontSize", value)} />
              <EditorRange label={t("repoEditor.statsLabelSize")} value={editorConfig.statsLabelFontSize} min={8} max={20} onChange={(value) => updateNumber("statsLabelFontSize", value)} />
              <EditorRange label={t("repoEditor.statsValueSize")} value={editorConfig.statsValueFontSize} min={8} max={32} onChange={(value) => updateNumber("statsValueFontSize", value)} />
              <EditorRange label={t("repoEditor.iconSize")} value={editorConfig.statsIconSize} min={45} max={85} onChange={(value) => updateNumber("statsIconSize", value)} />
            </div>
          </section>

          <section className="repo-editor-section">
            <h4>{t("repoEditor.position")}</h4>
            <div className="repo-editor-control-grid">
              <EditorRange label={t("repoEditor.ribbonX")} value={editorConfig.ribbonX} min={408} max={568} onChange={(value) => updateNumber("ribbonX", value)} />
              <EditorRange label={t("repoEditor.ribbonY")} value={editorConfig.ribbonY} min={56} max={96} onChange={(value) => updateNumber("ribbonY", value)} />
              <EditorRange label={t("repoEditor.titleX")} value={editorConfig.titleX} min={363} max={483} onChange={(value) => updateNumber("titleX", value)} />
              <EditorRange label={t("repoEditor.titleY")} value={editorConfig.titleY} min={150} max={230} onChange={(value) => updateNumber("titleY", value)} />
              <EditorRange label={t("repoEditor.descriptionX")} value={editorConfig.descriptionX} min={363} max={483} onChange={(value) => updateNumber("descriptionX", value)} />
              <EditorRange label={t("repoEditor.descriptionY")} value={editorConfig.descriptionY} min={191} max={271} onChange={(value) => updateNumber("descriptionY", value)} />
              <EditorRange label={t("repoEditor.statsX")} value={editorConfig.statsX} min={332} max={452} onChange={(value) => updateNumber("statsX", value)} />
              <EditorRange label={t("repoEditor.statsY")} value={editorConfig.statsY} min={263} max={343} onChange={(value) => updateNumber("statsY", value)} />
            </div>
          </section>
        </aside>

        <section className="repo-editor-preview">
          <div className="repo-editor-preview-head">
            <h4>{t("repoEditor.preview")}</h4>
            <span>{repoData.repo}</span>
          </div>
          <div
            className="mc-display repo-editor-canvas flex w-full items-center justify-center p-4"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
          <div className="repo-editor-actions">
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
