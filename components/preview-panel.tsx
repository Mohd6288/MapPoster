"use client";

import { Theme } from "@/lib/types";

interface PreviewPanelProps {
  theme: Theme;
  city: string;
  country: string;
  lat: number | null;
  lon: number | null;
  blobUrl: string | null;
  fontFamily: string;
  onBackToPreview: () => void;
  onNewPoster: () => void;
  onDownload: () => void;
  format: string;
  hasOutput: boolean;
}

function isLatin(text: string): boolean {
  if (!text) return true;
  let latin = 0;
  let total = 0;
  for (const ch of text) {
    if (/\p{L}/u.test(ch)) {
      total++;
      if ((ch.codePointAt(0) ?? 0) < 0x250) latin++;
    }
  }
  return total === 0 || latin / total > 0.8;
}

export default function PreviewPanel({
  theme,
  city,
  country,
  lat,
  lon,
  blobUrl,
  fontFamily,
  onBackToPreview,
  onNewPoster,
  onDownload,
  format,
  hasOutput,
}: PreviewPanelProps) {
  // Rendered output view
  if (blobUrl && hasOutput) {
    return (
      <div className="panel-preview">
        <div className="output-view success-flash">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blobUrl}
            alt="Generated poster"
            className="canvas-output"
          />
          <div className="output-actions">
            <button className="btn btn-download" onClick={onDownload}>
              Download {format.toUpperCase()}
            </button>
            <button className="btn btn-ghost" onClick={onBackToPreview}>
              Edit
            </button>
            <button className="btn btn-ghost" onClick={onNewPoster}>
              New Poster
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Live CSS preview
  const displayCity = city || "Paris";
  const displayCountry = country || "France";

  const formattedCity = isLatin(displayCity)
    ? displayCity
        .toUpperCase()
        .split("")
        .join(" \u00a0")
    : displayCity;

  const roadColors = [
    theme.road_motorway,
    theme.road_primary,
    theme.road_secondary,
    theme.road_tertiary,
    theme.road_residential,
    theme.road_default,
    theme.road_secondary,
    theme.road_primary,
    theme.road_residential,
    theme.road_tertiary,
    theme.road_motorway,
    theme.road_default,
    theme.road_primary,
    theme.road_residential,
    theme.road_secondary,
  ];

  let coordsText = "";
  if (lat !== null && lon !== null) {
    const latDir = lat >= 0 ? "N" : "S";
    const lonDir = lon >= 0 ? "E" : "W";
    coordsText = `${Math.abs(lat).toFixed(4)}\u00b0 ${latDir} / ${Math.abs(lon).toFixed(4)}\u00b0 ${lonDir}`;
  }

  const fontStyle =
    fontFamily && fontFamily !== "Roboto"
      ? { fontFamily: `"${fontFamily}", sans-serif` }
      : {};

  return (
    <div className="panel-preview">
      <div className="preview-frame">
        <div
          className="preview-poster"
          style={{ backgroundColor: theme.bg }}
        >
          <div className="preview-roads">
            {roadColors.map((color, i) => {
              const w = 40 + Math.sin(i * 1.7) * 30;
              return (
                <div
                  key={i}
                  className="road-line"
                  style={{
                    backgroundColor: color,
                    width: `${w}%`,
                    marginLeft: i % 3 === 0 ? `${15 + i * 2}%` : undefined,
                  }}
                />
              );
            })}
          </div>
          <div
            className="preview-gradient-top"
            style={{
              background: `linear-gradient(to bottom, ${theme.bg}, transparent)`,
            }}
          />
          <div
            className="preview-gradient-bottom"
            style={{
              background: `linear-gradient(to top, ${theme.bg}, transparent)`,
            }}
          />
          <div className="preview-text">
            <div
              className="preview-city"
              style={{ color: theme.text, ...fontStyle }}
            >
              {formattedCity}
            </div>
            <div
              className="preview-divider"
              style={{ backgroundColor: theme.text }}
            />
            <div
              className="preview-country"
              style={{ color: theme.text, ...fontStyle }}
            >
              {displayCountry.toUpperCase()}
            </div>
            {coordsText && (
              <div className="preview-coords" style={{ color: theme.text }}>
                {coordsText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
