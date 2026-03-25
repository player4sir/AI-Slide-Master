import fs from "fs";
import path from "path";
import { PresentationTheme } from "./ppt-theme.js";

const ASSETS_DIR = path.join(process.cwd(), "src", "assets", "illustrations");

/**
 * Returns a base64 data URI of the tinted SVG illustration.
 * PptxGenJS requires `data:` URIs for image embedding — filesystem paths don't work.
 * Theme colors (without #) are injected WITH proper # prefix into SVG fill attributes.
 */
export function getTintedIllustrationPath(name: string, theme: PresentationTheme): string | undefined {
  const sourcePath = path.join(ASSETS_DIR, `${name}.svg`);
  if (!fs.existsSync(sourcePath)) {
    return undefined;
  }

  let svgContent = fs.readFileSync(sourcePath, "utf-8");
  
  // Replace template color tokens — note: SVG uses `#RRGGBB` format
  // The placeholder in SVG is `#PRIMARY_COLOR`, we replace with `#<hex>`
  svgContent = svgContent.replace(/#PRIMARY_COLOR/g, `#${theme.primary}`);
  svgContent = svgContent.replace(/#ACCENT_COLOR/g, `#${theme.accent}`);
  svgContent = svgContent.replace(/#SECONDARY_COLOR/g, `#${theme.secondary}`);

  // Convert to base64 data URI for pptxgenjs embedding
  const base64 = Buffer.from(svgContent, "utf-8").toString("base64");
  return `image/svg+xml;base64,${base64}`;
}
