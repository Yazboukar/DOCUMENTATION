import { prisma } from "./prisma";
import { cookies } from "next/headers";
import { ReactNode } from "react";

export async function getSectorBySlug(slug: string) {
  return prisma.sector.findUnique({ where: { slug } });
}

export async function SectorThemeProvider({
  sectorSlug,
  children
}: {
  sectorSlug: string;
  children: ReactNode;
}) {
  const sector = await getSectorBySlug(sectorSlug);
  if (!sector) {
    return (
      <div className="p-6">
        <p>Secteur introuvable.</p>
      </div>
    );
  }

  const accent = sector.themeAccent || "#1E5AA8";
  const accentHsl = hexToHsl(accent);

  return (
    <div
      className="min-h-screen sector-theme bg-slate-50"
      style={
        {
          ["--sector-accent-h" as string]: accentHsl
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

function hexToHsl(hex: string) {
  const cleaned = hex.replace("#", "");
  const bigint = parseInt(cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const [h, s, l] = rgbToHsl(r, g, b);
  return `${h} ${s}% ${l}%`;
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
