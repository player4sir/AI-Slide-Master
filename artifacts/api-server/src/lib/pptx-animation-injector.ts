/**
 * PPTX Animation Injector (Phase 1 — Post-Processing Approach)
 * 
 * PptxGenJS doesn't support slide transitions or element animations.
 * This module post-processes the generated .pptx file (which is a ZIP of
 * XML files) to inject:
 * 
 * 1. Slide Transitions (p:transition) — fade, push, wipe, zoom, etc.
 * 2. Element Entry Animations (p:timing) — appear, fly-in, fade-in
 * 
 * Uses JSZip (already available as a pptxgenjs dependency) to unzip,
 * modify slide XML, and re-zip.
 */
import JSZip from "jszip";
import fs from "fs";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type TransitionType = "fade" | "push" | "wipe" | "split" | "zoom" | "cover" | "none";
export type TransitionSpeed = "slow" | "med" | "fast";

export interface SlideTransition {
  type: TransitionType;
  speed?: TransitionSpeed;
  advanceAfterMs?: number;  // auto-advance (for kiosk/auto-play)
}

export interface AnimationConfig {
  /** Transition to apply per slide (by 0-based index) */
  transitions: Map<number, SlideTransition>;
  /** Default transition for slides not in the map */
  defaultTransition?: SlideTransition;
  /** Whether to add subtle entry animations to text elements */
  enableEntryAnimations?: boolean;
}

// ─── TRANSITION XML GENERATORS ──────────────────────────────────────────────

function generateTransitionXml(t: SlideTransition): string {
  if (t.type === "none") return "";

  const speed = t.speed || "med";
  const advClick = "1";
  const advTm = t.advanceAfterMs ? ` advTm="${t.advanceAfterMs}"` : "";

  let inner: string;
  switch (t.type) {
    case "fade":
      inner = `<p:fade/>`;
      break;
    case "push":
      inner = `<p:push dir="l"/>`;
      break;
    case "wipe":
      inner = `<p:wipe dir="d"/>`;
      break;
    case "split":
      inner = `<p:split orient="horz" dir="out"/>`;
      break;
    case "zoom":
      // Zoom isn't universally supported in p:transition; fall back to fade
      inner = `<p:fade/>`;
      break;
    case "cover":
      inner = `<p:cover dir="l"/>`;
      break;
    default:
      inner = `<p:fade/>`;
  }

  // Use simple p:transition element (universally supported, no mc:AlternateContent wrapper)
  return `<p:transition spd="${speed}" advClick="${advClick}"${advTm}>${inner}</p:transition>`;
}

// ─── ENTRY ANIMATION XML GENERATOR ─────────────────────────────────────────
// NOTE: Entry animations are disabled by default because they require extremely
// precise OOXML structure (unique node IDs, exact shape targeting, proper
// namespace references). Producing even slightly malformed XML here will cause
// PowerPoint to show a "content problem" error dialog or fail to open the file.
// The function is retained for potential future use with proper OOXML validation.

// ─── SLIDE TYPE → TRANSITION MAPPING ────────────────────────────────────────

export type SlideType = "title" | "content" | "section" | "conclusion" | "qa";

export function getDefaultTransitionForSlideType(
  slideType: SlideType,
  visualType?: string
): SlideTransition {
  switch (slideType) {
    case "title":
      return { type: "fade", speed: "med" };
    case "section":
      return { type: "fade", speed: "slow" };
    case "conclusion":
    case "qa":
      return { type: "fade", speed: "slow" };
    default: {
      if (visualType === "hero" || visualType === "quote") {
        return { type: "fade", speed: "slow" };
      }
      if (visualType === "process") {
        return { type: "push", speed: "med" };
      }
      if (visualType === "stats" || visualType === "chart") {
        return { type: "wipe", speed: "med" };
      }
      if (visualType === "comparison") {
        return { type: "split", speed: "med" };
      }
      return { type: "fade", speed: "med" };
    }
  }
}

// ─── MAIN POST-PROCESSOR ───────────────────────────────────────────────────

export async function injectAnimations(
  filePath: string,
  config: AnimationConfig
): Promise<void> {
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);

  const slideFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
      return numA - numB;
    });

  for (let i = 0; i < slideFiles.length; i++) {
    const slideFile = slideFiles[i];
    let xml = await zip.file(slideFile)!.async("text");

    const trans = config.transitions.get(i) || config.defaultTransition;

    if (trans && trans.type !== "none") {
      const transXml = generateTransitionXml(trans);

      // Remove ONLY existing p:transition elements (NOT mc:AlternateContent which may contain legitimate content)
      xml = xml.replace(/<p:transition[^>]*>[\s\S]*?<\/p:transition>/g, "");
      // Also remove self-closing p:transition
      xml = xml.replace(/<p:transition[^>]*\/>/g, "");

      // Inject before </p:cSld> (inside the slide, before any existing timing/transition area)
      // If </p:cSld> not found, inject before </p:sld>
      if (xml.includes("</p:cSld>")) {
        xml = xml.replace(
          /<\/p:cSld>/,
          `</p:cSld>${transXml}`
        );
      } else {
        xml = xml.replace(
          /<\/p:sld>/,
          `${transXml}</p:sld>`
        );
      }
    }

    // Entry animations are intentionally disabled — see note above
    zip.file(slideFile, xml);
  }

  const output = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(filePath, output);
}

/**
 * Convenience: auto-inject transitions based on slide types.
 * Call after buildPPTX to add transitions automatically.
 */
export async function autoInjectTransitions(
  filePath: string,
  slides: { slideType: SlideType; visualType?: string }[],
  enableEntryAnimations = false
): Promise<void> {
  const transitions = new Map<number, SlideTransition>();

  slides.forEach((slide, i) => {
    transitions.set(i, getDefaultTransitionForSlideType(slide.slideType, slide.visualType));
  });

  await injectAnimations(filePath, {
    transitions,
    enableEntryAnimations,
  });
}
