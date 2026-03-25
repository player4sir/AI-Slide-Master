import assert from "node:assert/strict";

import { getThemePreview } from "./presentation-theme.ts";

const techPitch = getThemePreview("tech-pitch");

assert.equal(techPitch.background, "#0F0E17");
assert.equal(techPitch.primary, "#FF8906");
assert.equal(techPitch.card, "#1A1926");
