"use client";

import { Theme } from "@/lib/types";

interface ThemeSelectorProps {
  themes: Theme[];
  selectedId: string;
  onSelect: (theme: Theme) => void;
}

const SWATCH_WIDTHS = ["90%", "75%", "60%", "80%", "50%"];

export default function ThemeSelector({
  themes,
  selectedId,
  onSelect,
}: ThemeSelectorProps) {
  return (
    <div>
      <div className="section-header">
        <h3>Theme</h3>
      </div>
      <div className="theme-grid">
        {themes.map((theme) => {
          const roadColors = [
            theme.road_motorway,
            theme.road_primary,
            theme.road_secondary,
            theme.road_tertiary,
            theme.road_residential,
          ];

          return (
            <div
              key={theme.id}
              className={`theme-swatch${theme.id === selectedId ? " selected" : ""}`}
              style={{ backgroundColor: theme.bg }}
              onClick={() => onSelect(theme)}
            >
              <div className="swatch-roads">
                {roadColors.map((color, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: color,
                      width: SWATCH_WIDTHS[i],
                    }}
                  />
                ))}
              </div>
              <div className="swatch-name">{theme.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
