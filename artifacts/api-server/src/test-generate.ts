import { planOutline, normalizeOutlineForExport } from "./lib/deepseek.js";
import { generateDesignSpec } from "./lib/design-strategist.js";
import { enrichSlideContent } from "./lib/deepseek.js";
import { buildPPTX } from "./lib/pptx-builder.js";
import { applyInfographicUpgrade } from "./lib/infographic-engine.js";

async function main() {
  const params = {
    topic: "人工智能未来发展趋势与挑战",
    language: "zh",
    slideCount: 6,
    style: "tech",
  };

  console.log("1. Generating Outline...");
  const rawOutline = await planOutline(params);
  const outline = normalizeOutlineForExport(rawOutline);

  console.log("2. Generating DesignSpec...");
  const designSpec = await generateDesignSpec(outline, params);
  console.log("   Color Scheme:", designSpec.colorScheme);
  console.log("   Typography:", designSpec.typography);

  console.log("3. Enriching Content...");
  const currentSlides = [...outline.slides];
  for (let i = 0; i < currentSlides.length; i++) {
    console.log(`   enriching slide ${i + 1}/${currentSlides.length}`);
    const slide = currentSlides[i];
    let enriched = await enrichSlideContent(slide, {
      presentationTitle: outline.presentationTitle,
      topic: params.topic,
      language: params.language,
      style: params.style,
      designSpec,
    });
    enriched = applyInfographicUpgrade(enriched);
    currentSlides[i] = enriched;
  }
  
  outline.slides = currentSlides;

  console.log("4. Building PPTX...");
  const filePath = await buildPPTX(outline, "dark-tech", undefined, designSpec);
  
  console.log(`\n✅ Success! PPTX generated at: ${filePath}`);
}

main().catch(console.error);
