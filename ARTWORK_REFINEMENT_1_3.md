# Refined Build Advisor artwork

The built-in image tool refined the existing fantasy mural. The generated master is 1672 × 941 pixels. A normal asset export resampled it to **3840 × 2160** using Lanczos3 and lossless WebP encoding. This is a 4K-sized upscale, not native 4K detail. The cleaner character rendering is from the refinement, not merely the pixel-count change.

Saved assets in the project:
- `public/eqlsak-mural-refined-master.png` — native refined master.
- `public/eqlsak-mural-refined-4k.webp` — lossless desktop backdrop.
- Original mural files remain available.

The standalone file embeds the image, and the installer bundles it locally. Direct image URLs avoid the browser's size limit for CSS custom properties with large embedded images. No image generation or network model runs inside Build Advisor.

Mode: built-in image generation/editing tool. Final prompt:

> Use case: precise-object-edit. Edit target: the supplied existing fantasy mural used behind the EQLSaK Build Advisor. Refine and restore this SAME artwork for a clean 4K UHD full-screen desktop backdrop, target 3840 x 2160, landscape 16:9. Keep every character, their identity, pose, clothing, position, the open central sunlit valley, mountains, castles, warm gold and blue palette, and composition unchanged. Improve the visible faces, eyes, hair, armor and fabric with coherent fine detail and crisp edges. Remove graininess, mottled pixel texture, compression artifacts and mushy painterly noise while keeping the original rich fantasy illustration style. Smooth clean tonal gradients in sky and skin. No artificial film grain, no oversharpening halos, no new subjects, no text, no logos, no framing, no UI. This is a detail restoration of the supplied artwork, not a new composition. Deliver the highest-resolution clean image available, ideally exact 3840x2160.
