"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Theme, GenerationStep } from "@/lib/types";
import { themes } from "@/lib/themes";
import { calculateBBox, fetchRoads, fetchFeatures } from "@/lib/overpass";
import { parseRoads, parseFeatures } from "@/lib/osm-parser";
import { renderPoster, loadGoogleFont } from "@/lib/poster-renderer";
import {
  canvasToBlobURL,
  downloadPNG,
  downloadSVG,
  downloadPDF,
} from "@/lib/export-utils";
import ControlPanel from "./control-panel";
import PreviewPanel from "./preview-panel";

export default function PosterApp() {
  // Location state
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [coords, setCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");

  // Theme state
  const [selectedTheme, setSelectedTheme] = useState<Theme>(themes[0]);

  // Options state
  const [distance, setDistance] = useState(5000);
  const [width, setWidth] = useState(12);
  const [height, setHeight] = useState(16);
  const [format, setFormat] = useState<"png" | "svg" | "pdf">("png");
  const [displayCity, setDisplayCity] = useState("");
  const [displayCountry, setDisplayCountry] = useState("");

  // Creative state
  const [fontFamily, setFontFamily] = useState("Roboto");
  const [fontSizeScale, setFontSizeScale] = useState(1.0);
  const [letterSpacingScale, setLetterSpacingScale] = useState(1.0);
  const [roadWidthMultiplier, setRoadWidthMultiplier] = useState(1.0);
  const [fontStatus, setFontStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  // Generation state
  const [generationStep, setGenerationStep] = useState<GenerationStep>("idle");
  const [generationError, setGenerationError] = useState("");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<"controls" | "preview">(
    "controls"
  );
  const [isMobile, setIsMobile] = useState(false);

  // Canvas ref for export
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Switch to preview on generation complete (mobile)
  useEffect(() => {
    if (isMobile && generationStep === "done" && blobUrl) {
      setMobileTab("preview");
    }
  }, [isMobile, generationStep, blobUrl]);

  const handleFontFamilyChange = useCallback(async (family: string) => {
    setFontFamily(family);
    if (family.toLowerCase() === "roboto") {
      setFontStatus("ready");
      return;
    }
    setFontStatus("loading");
    try {
      await loadGoogleFont(family);
      setFontStatus("ready");
    } catch {
      setFontStatus("error");
    }
  }, []);

  const handleGeocode = useCallback(async () => {
    if (!city.trim() || !country.trim()) return;

    setIsGeocoding(true);
    setGeocodeError("");
    setCoords(null);

    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.trim(), country: country.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Location not found");
      }

      const data = await res.json();
      setCoords({ lat: data.lat, lon: data.lon });
    } catch (err) {
      setGeocodeError(
        err instanceof Error ? err.message : "Geocoding failed"
      );
    } finally {
      setIsGeocoding(false);
    }
  }, [city, country]);

  const handleGenerate = useCallback(async () => {
    if (!coords) return;

    // Clear previous output
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
    setGenerationError("");
    setGenerationStep("fetching-roads");

    const effectiveCity = displayCity.trim() || city.trim();
    const effectiveCountry = displayCountry.trim() || country.trim();

    try {
      const bbox = calculateBBox(
        coords.lat,
        coords.lon,
        distance,
        width,
        height
      );

      // Load font if needed
      if (fontFamily.toLowerCase() !== "roboto") {
        await loadGoogleFont(fontFamily);
      }

      // Fetch in parallel
      const [roadsResponse, featuresResponse] = await Promise.all([
        fetchRoads(bbox),
        fetchFeatures(bbox).then((r) => {
          setGenerationStep("fetching-features");
          return r;
        }),
      ]);

      const roads = parseRoads(roadsResponse);
      const polygons = parseFeatures(featuresResponse);

      setGenerationStep("rendering");

      // Small delay so UI can update
      await new Promise((r) => setTimeout(r, 50));

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          const canvas = document.createElement("canvas");
          const canvasWidth = Math.round(width * 300);
          const canvasHeight = Math.round(height * 300);

          renderPoster(canvas, {
            theme: selectedTheme,
            roads,
            polygons,
            bbox,
            canvasWidth,
            canvasHeight,
            displayCity: effectiveCity,
            displayCountry: effectiveCountry,
            lat: coords.lat,
            lon: coords.lon,
            widthInches: width,
            heightInches: height,
            fontFamily,
            fontSizeScale,
            letterSpacingScale,
            roadWidthMultiplier,
          });

          canvasRef.current = canvas;
          resolve();
        });
      });

      setGenerationStep("exporting");
      const url = await canvasToBlobURL(canvasRef.current!);
      setBlobUrl(url);
      setGenerationStep("done");
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : "Generation failed"
      );
      setGenerationStep("error");
    }
  }, [
    coords,
    selectedTheme,
    distance,
    width,
    height,
    city,
    country,
    displayCity,
    displayCountry,
    blobUrl,
    fontFamily,
    fontSizeScale,
    letterSpacingScale,
    roadWidthMultiplier,
  ]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const filename = `${(displayCity.trim() || city.trim() || "poster").toLowerCase().replace(/\s+/g, "_")}_${selectedTheme.id}`;

    if (format === "png") downloadPNG(canvas, filename);
    else if (format === "svg") downloadSVG(canvas, filename, width, height);
    else if (format === "pdf") downloadPDF(canvas, filename, width, height);
  }, [format, width, height, city, displayCity, selectedTheme.id]);

  const handleBackToPreview = useCallback(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setGenerationStep("idle");
  }, [blobUrl]);

  const handleNewPoster = useCallback(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setGenerationStep("idle");
    setGenerationError("");
    if (isMobile) setMobileTab("controls");
  }, [blobUrl, isMobile]);

  const effectiveCity = displayCity.trim() || city.trim();
  const effectiveCountry = displayCountry.trim() || country.trim();

  const controlsHidden = isMobile && mobileTab !== "controls";
  const previewHidden = isMobile && mobileTab !== "preview";

  return (
    <div className="app">
      {/* Mobile tab bar */}
      <div className="mobile-tabs">
        <button
          className={`mobile-tab${mobileTab === "controls" ? " active" : ""}`}
          onClick={() => setMobileTab("controls")}
        >
          Settings
        </button>
        <button
          className={`mobile-tab${mobileTab === "preview" ? " active" : ""}`}
          onClick={() => setMobileTab("preview")}
        >
          Preview
        </button>
      </div>

      <div className={controlsHidden ? "panel-hidden-mobile" : ""} style={controlsHidden ? undefined : { display: "contents" }}>
        <ControlPanel
          city={city}
          onCityChange={setCity}
          country={country}
          onCountryChange={setCountry}
          onGeocode={handleGeocode}
          coords={coords}
          geocodeError={geocodeError}
          isGeocoding={isGeocoding}
          themes={themes}
          selectedTheme={selectedTheme}
          onThemeSelect={setSelectedTheme}
          distance={distance}
          onDistanceChange={setDistance}
          width={width}
          onWidthChange={setWidth}
          height={height}
          onHeightChange={setHeight}
          format={format}
          onFormatChange={setFormat}
          displayCity={displayCity}
          onDisplayCityChange={setDisplayCity}
          displayCountry={displayCountry}
          onDisplayCountryChange={setDisplayCountry}
          fontFamily={fontFamily}
          onFontFamilyChange={handleFontFamilyChange}
          fontSizeScale={fontSizeScale}
          onFontSizeScaleChange={setFontSizeScale}
          letterSpacingScale={letterSpacingScale}
          onLetterSpacingScaleChange={setLetterSpacingScale}
          roadWidthMultiplier={roadWidthMultiplier}
          onRoadWidthMultiplierChange={setRoadWidthMultiplier}
          fontStatus={fontStatus}
          onGenerate={handleGenerate}
          onDownload={handleDownload}
          generationStep={generationStep}
          generationError={generationError}
          canGenerate={!!coords}
          hasOutput={generationStep === "done" && !!blobUrl}
        />
      </div>

      <div className={previewHidden ? "panel-hidden-mobile" : ""} style={previewHidden ? undefined : { display: "contents" }}>
        <PreviewPanel
          theme={selectedTheme}
          city={effectiveCity}
          country={effectiveCountry}
          lat={coords?.lat ?? null}
          lon={coords?.lon ?? null}
          blobUrl={blobUrl}
          fontFamily={fontFamily}
          onBackToPreview={handleBackToPreview}
          onNewPoster={handleNewPoster}
          onDownload={handleDownload}
          format={format}
          hasOutput={generationStep === "done" && !!blobUrl}
        />
      </div>
    </div>
  );
}
