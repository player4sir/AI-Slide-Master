import "pptxgenjs";

// The pptxgenjs library supports `transparency` on shape objects at runtime
// but the TypeScript type definitions don't include it on `ShapeProps`.
// This augmentation adds the missing property.
declare module "pptxgenjs" {
  interface ShapeProps {
    /**
     * Transparency (percent)
     * - range: 0-100
     * @default 0
     */
    transparency?: number;
  }
}
