"use client";

import { Theme, GenerationStep } from "@/lib/types";
import ThemeSelector from "./theme-selector";
import AdvancedOptions from "./advanced-options";
import ProgressBar from "./progress-bar";

interface ControlPanelProps {
  // Location
  city: string;
  onCityChange: (v: string) => void;
  country: string;
  onCountryChange: (v: string) => void;
  onGeocode: () => void;
  coords: { lat: number; lon: number } | null;
  geocodeError: string;
  isGeocoding: boolean;

  // Theme
  themes: Theme[];
  selectedTheme: Theme;
  onThemeSelect: (t: Theme) => void;

  // Advanced
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

  // Creative
  fontFamily: string;
  onFontFamilyChange: (v: string) => void;
  fontSizeScale: number;
  onFontSizeScaleChange: (v: number) => void;
  letterSpacingScale: number;
  onLetterSpacingScaleChange: (v: number) => void;
  roadWidthMultiplier: number;
  onRoadWidthMultiplierChange: (v: number) => void;
  fontStatus: "idle" | "loading" | "ready" | "error";

  // Generation
  onGenerate: () => void;
  onCancel: () => void;
  onDownload: () => void;
  generationStep: GenerationStep;
  generationError: string;
  canGenerate: boolean;
  hasOutput: boolean;
}

export default function ControlPanel(props: ControlPanelProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") props.onGeocode();
  };

  const isGenerating =
    props.generationStep !== "idle" &&
    props.generationStep !== "done" &&
    props.generationStep !== "error";

  return (
    <div className="panel-controls">
      {/* Logo */}
      <div className="logo-area">
        <div className="logo">MapToPoster</div>
        <div className="tagline">
          Crafted by <strong>Mohammed Alkhalifa</strong> &middot; Dammam, SA
        </div>
      </div>

      {/* Location */}
      <div className="section-header">
        <h3>Location</h3>
      </div>

      <div className="control-row">
        <div className="control-group">
          <label>City</label>
          <input
            type="text"
            placeholder="Paris"
            value={props.city}
            onChange={(e) => props.onCityChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="control-group">
          <label>Country</label>
          <input
            type="text"
            placeholder="France"
            value={props.country}
            onChange={(e) => props.onCountryChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      <button
        className="btn btn-secondary btn-full"
        onClick={props.onGeocode}
        disabled={props.isGeocoding || !props.city || !props.country}
      >
        {props.isGeocoding ? "Looking up..." : "Look up coordinates"}
      </button>

      {props.coords && (
        <div className="coords-display">
          {props.coords.lat.toFixed(4)}, {props.coords.lon.toFixed(4)}
        </div>
      )}

      {props.geocodeError && (
        <div className="coords-display" style={{ color: "var(--danger)" }}>
          {props.geocodeError}
        </div>
      )}

      {/* Theme */}
      <ThemeSelector
        themes={props.themes}
        selectedId={props.selectedTheme.id}
        onSelect={props.onThemeSelect}
      />

      {/* Advanced / Creative Options */}
      <div className="section-header">
        <h3>Customize</h3>
      </div>

      <AdvancedOptions
        distance={props.distance}
        onDistanceChange={props.onDistanceChange}
        width={props.width}
        onWidthChange={props.onWidthChange}
        height={props.height}
        onHeightChange={props.onHeightChange}
        format={props.format}
        onFormatChange={props.onFormatChange}
        displayCity={props.displayCity}
        onDisplayCityChange={props.onDisplayCityChange}
        displayCountry={props.displayCountry}
        onDisplayCountryChange={props.onDisplayCountryChange}
        fontFamily={props.fontFamily}
        onFontFamilyChange={props.onFontFamilyChange}
        fontSizeScale={props.fontSizeScale}
        onFontSizeScaleChange={props.onFontSizeScaleChange}
        letterSpacingScale={props.letterSpacingScale}
        onLetterSpacingScaleChange={props.onLetterSpacingScaleChange}
        roadWidthMultiplier={props.roadWidthMultiplier}
        onRoadWidthMultiplierChange={props.onRoadWidthMultiplierChange}
        fontStatus={props.fontStatus}
      />

      {/* Generate / Download */}
      <div className="action-area">
        {isGenerating ? (
          <button
            className="btn btn-secondary btn-full"
            onClick={props.onCancel}
          >
            Cancel
          </button>
        ) : (
          <button
            className="btn btn-primary btn-full"
            onClick={props.onGenerate}
            disabled={!props.canGenerate}
          >
            Generate Poster
          </button>
        )}

        <ProgressBar
          step={props.generationStep}
          error={props.generationError}
        />

        {props.hasOutput && (
          <button
            className="btn btn-download btn-full"
            onClick={props.onDownload}
          >
            Download {props.format.toUpperCase()}
          </button>
        )}
      </div>

      <div className="panel-footer">
        <span>Made with care in Dammam, SA</span>
        <span className="footer-sep">&middot;</span>
        <span>Data from OpenStreetMap</span>
      </div>
    </div>
  );
}
