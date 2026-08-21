"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import WeatherCanvas from "./components/WeatherCanvas";
import ContributionMap from "./components/ContributionMap";
import BannerHall from "./components/BannerHall";
import ProfileCardView from "./components/ProfileCard";
import RepoCard from "./components/RepoCard";
import type { ContributionCalendar, UserStats } from "./lib/github";
import type { RepoSvgParams } from "./lib/repoSvg";
import { parseGitHubInput } from "./lib/inputParser";
import { FARM_ASSETS } from "./lib/themeAssets";

const PROJECT_REPO_URL = "https://github.com/Mu-scorpio/farmcraft-profile-generator";

type ActiveView = "map" | "banner" | "card" | "repo";

type DisplayError = {
  message: string;
  recommendation?: string;
};

class ApiRequestError extends Error {
  constructor(message: string, public readonly recommendation?: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function payloadString(data: unknown, key: string): string | undefined {
  if (!isRecord(data)) return undefined;
  return typeof data[key] === "string" ? data[key] : undefined;
}

function getFallbackAvatar(): string {
  return "/assets/farm/avatar-fallback.svg";
}

function isContributionCalendarPayload(data: unknown): data is ContributionCalendar & { avatarUrl?: string; stats?: UserStats } {
  if (!isRecord(data) || !Number.isFinite(data.totalContributions) || !Array.isArray(data.weeks)) return false;
  return data.weeks.every((week) => {
    if (!isRecord(week) || !Array.isArray(week.contributionDays)) return false;
    return week.contributionDays.every((day) => {
      if (!isRecord(day)) return false;
      return typeof day.date === "string"
        && Number.isFinite(day.contributionCount)
        && typeof day.color === "string";
    });
  });
}

function isRepoSvgPayload(data: unknown): data is RepoSvgParams {
  if (!isRecord(data)) return false;
  return typeof data.owner === "string"
    && typeof data.repo === "string"
    && typeof data.description === "string"
    && typeof data.language === "string"
    && typeof data.languageColor === "string"
    && Number.isFinite(data.stars)
    && Number.isFinite(data.forks)
    && Number.isFinite(data.issues)
    && Number.isFinite(data.sizeKb)
    && typeof data.isPrivate === "boolean";
}

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();
  const [input, setInput] = useState("");
  const [displayUsername, setDisplayUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [calendarData, setCalendarData] = useState<ContributionCalendar | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [repoData, setRepoData] = useState<RepoSvgParams | null>(null);
  const [resultMode, setResultMode] = useState<"user" | "repo" | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("map");
  const [error, setError] = useState<DisplayError | null>(null);
  const [weather, setWeather] = useState<"clear" | "rain" | "snow">("clear");
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0 });
  const bgRef = useRef<HTMLDivElement>(null);

  const viewKeys: ActiveView[] = ["map", "banner", "card", "repo"];
  const viewLabels: Record<ActiveView, string> = {
    map: t("views.map"),
    banner: t("views.banner"),
    card: t("views.card"),
    repo: t("views.repo"),
  };
  const viewAssets: Record<ActiveView, string> = {
    map: FARM_ASSETS.sprouts,
    banner: FARM_ASSETS.sunflower,
    card: FARM_ASSETS.pumpkin,
    repo: FARM_ASSETS.greenhouse,
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    bgRef.current?.style.setProperty("--mouse-x", x.toString());
    bgRef.current?.style.setProperty("--mouse-y", y.toString());
    mouseRef.current = { x, y };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    if (!isAboutOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAboutOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAboutOpen]);

  async function handleGenerate() {
    const parsed = parseGitHubInput(input);
    if (!parsed) {
      setCalendarData(null);
      setAvatarUrl(null);
      setUserStats(null);
      setRepoData(null);
      setResultMode(null);
      setError({
        message: t("error.invalidInput"),
        recommendation: t("error.invalidInputRecommendation"),
      });
      return;
    }

    setLoading(true);
    setError(null);
    setCalendarData(null);
    setAvatarUrl(null);
    setUserStats(null);
    setRepoData(null);
    setResultMode(null);

    try {
      if (parsed.type === "user") {
        const response = await fetch(`/api/contributions/${encodeURIComponent(parsed.username)}`);
        const data: unknown = await response.json().catch(() => null);
        const errorMessage = payloadString(data, "error");
        if (!response.ok || errorMessage) {
          const recommendation = locale === "zh"
            ? payloadString(data, "recommendationZh") || payloadString(data, "recommendation")
            : payloadString(data, "recommendation");
          throw new ApiRequestError(errorMessage || t("error.contributions"), recommendation);
        }
        if (!isContributionCalendarPayload(data)) {
          throw new ApiRequestError(t("error.invalidResponse"), t("error.invalidResponseRecommendation"));
        }
        setCalendarData(data);
        setAvatarUrl(typeof data.avatarUrl === "string" ? data.avatarUrl : getFallbackAvatar());
        setUserStats(data.stats ?? null);
        setDisplayUsername(parsed.username);
        setResultMode("user");
        setActiveView("map");
      } else {
        const [repoResponse, ownerResponse] = await Promise.all([
          fetch(`/api/repoinfo/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`),
          fetch(`/api/contributions/${encodeURIComponent(parsed.owner)}`),
        ]);
        const [repoDataPayload, ownerDataPayload] = await Promise.all([
          repoResponse.json().catch(() => null) as Promise<unknown>,
          ownerResponse.json().catch(() => null) as Promise<unknown>,
        ]);

        const repoErrorMessage = payloadString(repoDataPayload, "error");
        if (!repoResponse.ok || repoErrorMessage) {
          const recommendation = locale === "zh"
            ? payloadString(repoDataPayload, "recommendationZh") || payloadString(repoDataPayload, "recommendation")
            : payloadString(repoDataPayload, "recommendation");
          throw new ApiRequestError(repoErrorMessage || t("error.repo"), recommendation);
        }
        if (!isRepoSvgPayload(repoDataPayload)) {
          throw new ApiRequestError(t("error.invalidResponse"), t("error.invalidResponseRecommendation"));
        }

        const ownerErrorMessage = payloadString(ownerDataPayload, "error");
        if (!ownerResponse.ok || ownerErrorMessage) {
          const recommendation = locale === "zh"
            ? payloadString(ownerDataPayload, "recommendationZh") || payloadString(ownerDataPayload, "recommendation")
            : payloadString(ownerDataPayload, "recommendation");
          throw new ApiRequestError(ownerErrorMessage || t("error.contributions"), recommendation);
        }
        if (!isContributionCalendarPayload(ownerDataPayload)) {
          throw new ApiRequestError(t("error.invalidResponse"), t("error.invalidResponseRecommendation"));
        }

        setRepoData(repoDataPayload);
        setCalendarData(ownerDataPayload);
        setAvatarUrl(typeof ownerDataPayload.avatarUrl === "string" ? ownerDataPayload.avatarUrl : getFallbackAvatar());
        setUserStats(ownerDataPayload.stats ?? null);
        setDisplayUsername(parsed.owner);
        setResultMode("repo");
        setActiveView("repo");
      }
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setError({ message: caught.message, recommendation: caught.recommendation });
      } else if (caught instanceof Error && !/fetch failed|failed to fetch|network/i.test(caught.message)) {
        setError({ message: caught.message, recommendation: t("error.networkRecommendation") });
      } else {
        setError({ message: t("error.network"), recommendation: t("error.networkRecommendation") });
      }
    } finally {
      setLoading(false);
    }
  }

  const selectView = (view: ActiveView) => {
    if (view === "repo") {
      setActiveView("repo");
      setResultMode("repo");
      setError(null);
      return;
    }

    setActiveView(view);
    setResultMode(calendarData ? "user" : null);
    setError(null);
  };

  const toggleLocale = () => {
    const next = locale === "zh" ? "en" : "zh";
    document.cookie = `locale=${next};path=/;max-age=31536000`;
    window.location.reload();
  };

  return (
    <div className={`farm-page selection:bg-[#e5ad4b] selection:text-[#2e241d] ${weather === "clear" ? "is-clear" : "is-rain"}`}>
      <div ref={bgRef} className="farm-background" />
      <div className="farm-vignette" />
      <WeatherCanvas weather={weather} mouseRef={mouseRef} />

      <nav className="farm-navbar flex items-center justify-between gap-4 px-5 py-3">
        <div className="relative z-10 flex min-w-0 items-center justify-between gap-4 w-full">
          <div className="farm-nav-left">
            <a className="farm-brand" href={PROJECT_REPO_URL} target="_blank" rel="noreferrer">
              <img className="farm-brand-icon" src={FARM_ASSETS.pumpkin} alt="FarmCraft" />
              <h1 className="farm-brand-title"><span>Farm</span>Craft</h1>
            </a>
            <button
              type="button"
              className={`weather-toggle weather-toggle-${weather}`}
              onClick={() => setWeather((current) => current === "rain" ? "clear" : "rain")}
              aria-pressed={weather === "clear"}
              aria-label={weather === "rain" ? t("nav.weatherClear") : t("nav.weatherRain")}
            >
              <span className="weather-toggle-swatch" aria-hidden="true" />
              <span>{weather === "rain" ? t("nav.weatherRain") : t("nav.weatherClear")}</span>
            </button>
          </div>
          <div className="farm-nav-actions">
            <button type="button" className="mc-btn-secondary text-xs" onClick={toggleLocale}>
              {locale === "zh" ? "EN" : "中文"}
            </button>
            <button type="button" className="mc-btn-secondary text-xs" onClick={() => setIsAboutOpen(true)} aria-haspopup="dialog" aria-expanded={isAboutOpen}>
              {t("nav.about")}
            </button>
            <a className="mc-nav-link text-xs" href={PROJECT_REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </nav>

      <main className="relative z-20 flex min-h-[calc(100vh-134px)] w-full items-start justify-center">
        <section className="farm-hero">
          <div className="farm-hero-copy">
            <p className="farm-kicker">FARMCRAFT · PIXEL PROFILE FORGE</p>
            <h2 className="farm-hero-title">{t("hero.title")}</h2>
            <p className="farm-hero-subtitle">{t("hero.subtitle")}</p>
          </div>

          <div className="mc-gui">
            <div className="mc-gui-inner">
              <label className="farm-input-label" htmlFor="github-target">{t("input.label")}</label>
              <div className="farm-input-row">
                <div className="mc-input-sunken">
                  <input
                    id="github-target"
                    type="text"
                    value={input}
                    placeholder={t("input.placeholder")}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") void handleGenerate(); }}
                    spellCheck={false}
                    aria-label={t("input.label")}
                  />
                </div>
                <button type="button" className="mc-btn min-h-14 px-7 text-base" onClick={() => void handleGenerate()} disabled={loading || !input.trim()}>
                  {loading ? t("input.mining") : t("input.craft")}
                </button>
              </div>
              <p className="farm-input-hint">{t("input.hint")}</p>

              {!loading && !error && (resultMode === "user" || resultMode === "repo") && (
                <nav className="mc-generator-tabs mt-6 mb-2" aria-label="Views" role="tablist">
                  {viewKeys.map((view) => (
                    <button
                      key={view}
                      type="button"
                      role="tab"
                      aria-selected={activeView === view}
                      className={`mc-generator-tab ${activeView === view ? "is-active" : ""}`}
                      onClick={() => selectView(view)}
                    >
                      <img src={viewAssets[view]} alt="" aria-hidden="true" />
                      <span>{viewLabels[view]}</span>
                    </button>
                  ))}
                </nav>
              )}

              {(!resultMode || loading || error) && (
                <div className="mc-display mt-6">
                  {!loading && !error && !resultMode && (
                    <div className="text-center text-[#d6e0c8] mc-text-shadow-light">
                      <p className="mb-2">{t("empty.title")}</p>
                      <p className="text-sm">{t("empty.subtitle")}</p>
                    </div>
                  )}
                  {loading && (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex gap-2">
                        {[FARM_ASSETS.sprouts, FARM_ASSETS.sunflower, FARM_ASSETS.pumpkin].map((asset, index) => (
                          <img key={asset} src={asset} alt="" className="mc-pixel-icon h-8 w-8 animate-bounce" style={{ animationDelay: `${index * 0.14}s`, animationFillMode: "both" }} />
                        ))}
                      </div>
                      <p className="text-[#e5ad4b] animate-pulse mc-text-shadow">{parsedLoadingLabel(parseGitHubInput(input)?.type, t)}</p>
                    </div>
                  )}
                  {error && (
                    <div className="text-center text-[#f1a08b] mc-text-shadow-error">
                      <p className="mb-1 text-lg">{t("error.label")}</p>
                      <p className="text-sm">{error.message}</p>
                      {error.recommendation && <p className="mt-2 text-xs text-[#f2d79a]">{t("error.recommendation")} {error.recommendation}</p>}
                    </div>
                  )}
                </div>
              )}

              {resultMode === "user" && calendarData && !loading && activeView === "map" && (
                <ContributionMap calendar={calendarData} username={displayUsername} avatarUrl={avatarUrl} stats={userStats} />
              )}
              {resultMode === "user" && calendarData && !loading && activeView === "banner" && userStats && (
                <BannerHall stats={userStats} totalContributions={calendarData.totalContributions} username={displayUsername} />
              )}
              {resultMode === "user" && calendarData && !loading && activeView === "card" && userStats && avatarUrl && (
                <ProfileCardView stats={userStats} totalContributions={calendarData.totalContributions} username={displayUsername} avatarUrl={avatarUrl} />
              )}
              {resultMode === "repo" && repoData && !loading && !error && <RepoCard repoData={repoData} />}
              {resultMode === "repo" && !repoData && !loading && !error && (
                <div className="mc-display mt-6 text-center">
                  <p className="text-sm text-[#d6e0c8] mc-text-shadow-light">{t("empty.repoSubtitle")}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {isAboutOpen && (
        <div className="mc-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center px-4 py-4" role="presentation" onClick={() => setIsAboutOpen(false)}>
          <div className="mc-gui mc-modal-shell w-full max-w-3xl" role="dialog" aria-modal="true" aria-labelledby="about-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="mc-gui-inner max-h-[88vh] overflow-y-auto">
              <div className="mb-5 flex items-start justify-between gap-4 border-b-2 border-[#a77a50] pb-4">
                <div>
                  <p className="mb-1 text-xs tracking-widest text-[#775840]">{t("about.projectInfo")}</p>
                  <h3 id="about-modal-title" className="text-2xl text-[#2e241d] mc-text-shadow-white">{t("about.title")}</h3>
                  <p className="mc-cjk-text mt-2 text-sm font-semibold text-[#775840]">{t("about.description")}</p>
                </div>
                <button type="button" className="mc-btn-secondary shrink-0 text-xs" onClick={() => setIsAboutOpen(false)}>{t("about.close")}</button>
              </div>
              <section className="mc-about-section p-4">
                <h4 className="farm-section-heading">{t("about.whatIsThis")}</h4>
                <p className="text-sm leading-7">{t("about.whatIsThisContent")}</p>
              </section>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <section className="mc-about-section p-4">
                  <h4 className="farm-section-heading">{t("about.supportedInputs")}</h4>
                  <ul className="space-y-3 text-sm">
                    <li><p className="font-bold text-[#28533d]">{t("about.inputUsername")}</p><p className="mc-about-code mt-1 text-xs">{t("about.inputUsernameExample")}</p><p className="mt-1 leading-6">{t("about.inputUsernameDetail")}</p></li>
                    <li><p className="font-bold text-[#28533d]">{t("about.inputShort")}</p><p className="mc-about-code mt-1 text-xs">{t("about.inputShortExample")}</p><p className="mt-1 leading-6">{t("about.inputShortDetail")}</p></li>
                    <li><p className="font-bold text-[#28533d]">{t("about.inputUrl")}</p><p className="mc-about-code mt-1 text-xs">{t("about.inputUrlExample")}</p><p className="mt-1 leading-6">{t("about.inputUrlDetail")}</p></li>
                  </ul>
                </section>
                <section className="mc-about-section p-4">
                  <h4 className="farm-section-heading">{t("about.whatCanGenerate")}</h4>
                  <ul className="space-y-3 text-sm">
                    <li><p className="font-bold text-[#28533d]">{t("about.resultMap")}</p><p className="mt-1 leading-6">{t("about.resultMapDetail")}</p></li>
                    <li><p className="font-bold text-[#28533d]">{t("about.resultBanner")}</p><p className="mt-1 leading-6">{t("about.resultBannerDetail")}</p></li>
                    <li><p className="font-bold text-[#28533d]">{t("about.resultPassport")}</p><p className="mt-1 leading-6">{t("about.resultPassportDetail")}</p></li>
                    <li><p className="font-bold text-[#28533d]">{t("about.resultRepo")}</p><p className="mt-1 leading-6">{t("about.resultRepoDetail")}</p></li>
                  </ul>
                </section>
              </div>
              <section className="mc-about-section mt-4 p-4">
                <h4 className="farm-section-heading">{t("about.howToUse")}</h4>
                <ol className="space-y-2 text-sm leading-7">
                  <li>1. {t("about.step1")}</li>
                  <li>2. {t("about.step2_prefix")}<span className="mc-about-code">{t("about.step2_craft")}</span>{t("about.step2_suffix")}</li>
                  <li>3. {t("about.step3_prefix")}<span className="mc-about-code">{t("views.map")}</span>、<span className="mc-about-code">{t("views.banner")}</span>、<span className="mc-about-code">{t("views.card")}</span>{t("about.step3_suffix")}</li>
                  <li>4. {t("about.step4_prefix")}<span className="mc-about-code">{t("about.step4_download")}</span>{t("about.step4_suffix")}</li>
                </ol>
              </section>
              <p className="mt-4 text-xs leading-6 text-[#775840]">{t("about.notes")}: {t("about.note1")}</p>
            </div>
          </div>
        </div>
      )}

      <footer className="farm-footer flex items-center justify-center px-4 py-4">
        <p className="farm-footer-copy">{t("footer.credit")} · <a href="https://kenney.nl/assets/pixel-platformer-farm-expansion" target="_blank" rel="noreferrer">Kenney CC0 farm tiles</a></p>
      </footer>
    </div>
  );
}

function parsedLoadingLabel(type: "repo" | "user" | undefined, t: ReturnType<typeof useTranslations>): string {
  return type === "repo" ? t("loading.repo") : t("loading.user");
}
