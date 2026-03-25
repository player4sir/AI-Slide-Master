import { PPTXTemplate } from "./types.js";
import { MinimalCorporateTemplate } from "./minimal-corporate.js";
import { TechPitchTemplate } from "./tech-pitch.js";
import { AnnualReviewTemplate } from "./annual-review.js";
import { DarkTechTemplate } from "./dark-tech.js";
import { AcademicTemplate } from "./academic.js";

export const TEMPLATES: PPTXTemplate[] = [
  MinimalCorporateTemplate,
  TechPitchTemplate,
  AnnualReviewTemplate,
  DarkTechTemplate,
  AcademicTemplate,
];

export function getTemplate(id: string): PPTXTemplate | undefined {
  return TEMPLATES.find(t => t.id === id);
}

export function getDefaultTemplate(): PPTXTemplate {
  return TEMPLATES[0] || {
    id: "default",
    name: "Default",
    description: "System Default Layout",
    coverUrl: "",
    baseTheme: "professional",
    layout: {
      pad: 0.8,
      contentW: 13.33 - 1.6,
      headerH: 0.8,
      contentY: 1.1,
      footerY: 6.9,
    }
  };
}
