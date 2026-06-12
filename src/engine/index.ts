/**
 * Public surface of the ink engine.
 *
 * The engine is framework-agnostic by design (CLAUDE.md "Engine directory is
 * sacred"): it can be unit-tested, benchmarked headless, or wrapped in a native
 * bridge. UI and db code should import from here, not from internal modules.
 */
export { InkEngine, STROKE_BATCH_VERSION } from './ink';
export type { PointerSample, InkEvent, InkEventListener } from './ink';

export { renderStroke, renderStrokes } from './renderer';
export type { RenderTarget } from './renderer';

export { TOOL_CONFIGS, TOOL_IDS, isToolId } from './tools';
export type { ToolConfig, ToolPass } from './tools';

export { STICKER_IDS, isStickerId, isSticker, isStroke } from './stickers';

export { clamp01, toNormPoint, toPixel, buildOutline, traceOutline } from './geometry';
export type { Viewport, PageSize, PathSink } from './geometry';

export { attachInkInput } from './input';
export type { InkInputOptions } from './input';

export { InkSurface } from './surface';
export type { InkSurfaceOptions, SurfaceCanvas, SurfaceContext } from './surface';
