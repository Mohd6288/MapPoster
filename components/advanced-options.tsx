"use client";

import { useState, useCallback } from "react";
import { SizePreset } from "@/lib/types";

const FONT_PRESETS = [
  "Roboto",
  "Playfair Display",
  "Montserrat",
  "Oswald",
  "Lora",
  "Raleway",
  "Bebas Neue",
  "Cormorant Garamond",
  "Space Grotesk",
  "DM Serif Display",
];

const SIZE_PRESETS: SizePreset[] = [
  { label: "A4", width: 8.3, height: 11.7 },
  { label: "A3", width: 11.7, height: 16.5 },
  { label: '12"x16"', width: 12, height: 16 },
  { label: '18"x24"', width: 18, height: 24 },
  { label: '11"x14"', width: 11, height: 14 },
  { label: "Square", width: 12, height: 12 },
  { label: '24"x36"', width: 24, height: 36 },
];

interface AdvancedOptionsProps {
  distance: number;
  onDistanceChange: (v: number) => void;
  width: number;
  onWidthChange: (v: number) => void;
  height: number;
  onHeightChange: (v: number) => void;
  format: "png" | "svg" | "pdf";
  onFormatChange: (v: "png" | "svg" | "pdf") => void;
  displayCity: string;
  onDisplayCityChange: (v: string) => void;
  displayCountry: string;
  onDisplayCountryChange: (v: string) => void;
  fontFamily: string;
  onFontFamilyChange: (v: string) => void;
  fontSizeScale: number;
  onFontSizeScaleChange: (v: number) => void;
  letterSpacingScale: number;
  onLetterSpacingScaleChange: (v: number) => void;
  roadWidthMultiplier: number;
  onRoadWidthMultiplierChange: (v: number) => void;
  fontStatus: "idle" | "loading" | "ready" | "error";
}

export default function AdvancedOptions(props: AdvancedOptionsProps) {
  const [customFont, setCustomFont] = useState("");

  const handleCustomFontSubmit = useCallback(() => {
    if (customFont.trim()) {
      props.onFontFamilyChange(customFont.trim());
    }
  }, [customFont, props]);

  const isSizeActive = (p: SizePreset) =>
    Math.abs(props.width - p.width) < 0.1 &&
    Math.abs(props.height - p.height) < 0.1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {/* ── Font Picker ─────────────────────────────────────── */}
      <details className="collapsible" open>
        <summary>Typography</summary>
        <div className="collapsible-body">
          <div className="font-picker">
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-dim)",
              }}
            >
              Font Family
            </label>
            <div className="font-presets">
              {FONT_PRESETS.map((f) => (
                <button
                  key={f}
                  className={`font-preset-btn${props.fontFamily === f ? " active" : ""}`}
                  onClick={() => props.onFontFamilyChange(f)}
                  style={
                    f !== "Roboto"
                      ? { fontFamily: `"${f}", sans-serif` }
                      : undefined
                  }
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="control-row">
              <input
                type="text"
                placeholder="Or type any Google Font..."
                value={customFont}
                onChange={(e) => setCustomFont(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCustomFontSubmit();
                }}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-secondary"
                onClick={handleCustomFontSubmit}
                disabled={!customFont.trim()}
                style={{ flex: "none", padding: "9px 14px" }}
              >
                Apply
              </button>
            </div>
            {props.fontStatus !== "idle" && (
              <div className={`font-status ${props.fontStatus}`}>
                <span>
                  {props.fontStatus === "loading" && "Loading font..."}
                  {props.fontStatus === "ready" && "Font loaded"}
                  {props.fontStatus === "error" && "Font not found"}
                </span>
              </div>
            )}
          </div>

          {/* Font size */}
          <div className="slider-group">
            <div className="slider-label-row">
              <label>Font Size</label>
              <span className="slider-value">
                {Math.round(props.fontSizeScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.05}
              value={props.fontSizeScale}
              onChange={(e) =>
                props.onFontSizeScaleChange(parseFloat(e.target.value))
              }
            />
          </div>

          {/* Letter spacing */}
          <div className="slider-group">
            <div className="slider-label-row">
              <label>Letter Spacing</label>
              <span className="slider-value">
                {Math.round(props.letterSpacingScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={3.0}
              step={0.1}
              value={props.letterSpacingScale}
              onChange={(e) =>
                props.onLetterSpacingScaleChange(parseFloat(e.target.value))
              }
            />
          </div>
        </div>
      </details>

      {/* ── Poster Size ─────────────────────────────────────── */}
      <details className="collapsible">
        <summary>Poster Size</summary>
        <div className="collapsible-body">
          <div className="size-presets">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.label}
                className={`size-preset-btn${isSizeActive(p) ? " active" : ""}`}
                onClick={() => {
                  props.onWidthChange(p.width);
                  props.onHeightChange(p.height);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="row-2">
            <div>
              <label>Width (inches)</label>
              <input
                type="number"
                min={4}
                max={36}
                step={0.1}
                value={props.width}
                onChange={(e) =>
                  props.onWidthChange(parseFloat(e.target.value) || 12)
                }
              />
            </div>
            <div>
              <label>Height (inches)</label>
              <input
                type="number"
                min={4}
                max={36}
                step={0.1}
                value={props.height}
                onChange={(e) =>
                  props.onHeightChange(parseFloat(e.target.value) || 16)
                }
              />
            </div>
          </div>
        </div>
      </details>

      {/* ── Map Options ─────────────────────────────────────── */}
      <details className="collapsible">
        <summary>Map Options</summary>
        <div className="collapsible-body">
          <div className="slider-group">
            <div className="slider-label-row">
              <label>Coverage Distance</label>
              <span className="slider-value">
                {props.distance >= 1000
                  ? `${(props.distance / 1000).toFixed(1)}km`
                  : `${props.distance}m`}
              </span>
            </div>
            <input
              type="range"
              min={1000}
              max={50000}
              step={500}
              value={props.distance}
              onChange={(e) =>
                props.onDistanceChange(parseInt(e.target.value))
              }
            />
          </div>

          <div className="slider-group">
            <div className="slider-label-row">
              <label>Road Thickness</label>
              <span className="slider-value">
                {Math.round(props.roadWidthMultiplier * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.3}
              max={3.0}
              step={0.1}
              value={props.roadWidthMultiplier}
              onChange={(e) =>
                props.onRoadWidthMultiplierChange(parseFloat(e.target.value))
              }
            />
          </div>
        </div>
      </details>

      {/* ── Display Overrides ───────────────────────────────── */}
      <details className="collapsible">
        <summary>Display Overrides</summary>
        <div className="collapsible-body">
          <div className="control-group">
            <label>City Name Override</label>
            <input
              type="text"
              placeholder="Leave blank for input city"
              value={props.displayCity}
              onChange={(e) => props.onDisplayCityChange(e.target.value)}
            />
          </div>
          <div className="control-group">
            <label>Country Name Override</label>
            <input
              type="text"
              placeholder="Leave blank for input country"
              value={props.displayCountry}
              onChange={(e) => props.onDisplayCountryChange(e.target.value)}
            />
          </div>
        </div>
      </details>

      {/* ── Export ───────────────────────────────────────────── */}
      <details className="collapsible">
        <summary>Export Format</summary>
        <div className="collapsible-body">
          <div className="row-3">
            {(["png", "svg", "pdf"] as const).map((f) => (
              <button
                key={f}
                className={`size-preset-btn${props.format === f ? " active" : ""}`}
                onClick={() => props.onFormatChange(f)}
                style={{ padding: "8px", textAlign: "center" }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
