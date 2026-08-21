"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";

function useCopyToClipboard(url: string) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const textArea = document.createElement("textarea");
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
    document.body.removeChild(textArea);
  }, [url]);

  return { copied, handleCopy };
}

function getDefaultDownloadName(url: string): string {
  const pathname = url.split("?")[0].split("#")[0];
  const lastSegment = pathname.split("/").filter(Boolean).pop();

  if (lastSegment?.toLowerCase().endsWith(".svg")) {
    try {
      return decodeURIComponent(lastSegment);
    } catch {
      return lastSegment;
    }
  }

  return "farmcraft-output.svg";
}

export default function EndpointCopyBox({
  url,
  label,
  downloadName,
}: {
  url: string;
  label?: string;
  downloadName?: string;
}) {
  const t = useTranslations("components");
  const displayUrl = url;
  const copyUrl = url.startsWith("/") && typeof window !== "undefined"
    ? `${window.location.origin}${url}`
    : url;
  const fileName = downloadName || getDefaultDownloadName(url);

  const { copied, handleCopy } = useCopyToClipboard(copyUrl);

  return (
    <div className="w-full flex flex-col gap-2 mt-2">
      <div className="flex items-center">
        <label
          className="text-[#3f3f3f] font-bold text-lg tracking-wide"
          style={{ textShadow: "1px 1px 0px #fff" }}
        >
          {label ? t("endpointLabel", { label }) : t("endpointDefault")}
        </label>
      </div>

      <div className="flex min-w-0 items-stretch gap-3">
        <button
          onClick={handleCopy}
          className={`
            group relative min-w-0 flex-1 h-14 flex items-center justify-between px-4
            border-4 border-black font-mono transition-none outline-none cursor-pointer
            ${copied
              ? "bg-[#707070] shadow-[inset_4px_4px_0_0_#373737,inset_-4px_-4px_0_0_#a0a0a0]"
              : "bg-[#8b8b8b] hover:bg-[#9c9c9c] shadow-[inset_4px_4px_0_0_#c6c6c6,inset_-4px_-4px_0_0_#555555] active:bg-[#707070] active:shadow-[inset_4px_4px_0_0_#373737,inset_-4px_-4px_0_0_#a0a0a0]"
            }
          `}
        >
          <div
            className={`
              flex w-full items-center justify-between overflow-hidden
              ${copied ? "translate-y-[2px] translate-x-[2px]" : "group-active:translate-y-[2px] group-active:translate-x-[2px]"}
            `}
          >
            <span
              className="font-mono text-xl text-white truncate pr-4 tracking-wide"
              style={{ textShadow: "2px 2px 0px #3f3f3f" }}
            >
              {displayUrl}
            </span>

            <span
              className={`
                flex-shrink-0 font-bold text-xl tracking-widest
                ${copied ? "text-[#ffff55]" : "text-white"}
              `}
              style={{ textShadow: "2px 2px 0px #3f3f3f" }}
            >
              {copied ? t("copied") : t("copy")}
            </span>
          </div>
        </button>

        <a
          href={copyUrl}
          download={fileName}
          className="flex h-14 shrink-0 items-center justify-center border-4 border-black bg-[#4f7f3d] px-4 font-bold text-lg tracking-wide text-white shadow-[inset_4px_4px_0_0_#78a455,inset_-4px_-4px_0_0_#294b2e] hover:bg-[#5f9148] active:translate-y-[2px] active:bg-[#376447] active:shadow-[inset_4px_4px_0_0_#294b2e,inset_-4px_-4px_0_0_#78a455] max-sm:px-3 max-sm:text-sm"
          aria-label={t("downloadSvg")}
        >
          {t("downloadSvg")}
        </a>
      </div>

    </div>
  );
}
