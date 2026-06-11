/**
 * A headless RenderTarget that records what the renderer asked it to draw.
 * Lets tests assert tool compositing (e.g. eraser uses destination-out) and
 * lets the latency gate exercise the full render path with no DOM canvas.
 */
import type { RenderTarget } from '@/engine/renderer';

/** State captured at the moment of each `fill()`. */
export type FillRecord = {
  composite: GlobalCompositeOperation;
  alpha: number;
  fillStyle: string;
};

export class RecordingTarget implements RenderTarget {
  globalCompositeOperation: GlobalCompositeOperation = 'source-over';
  globalAlpha = 1;
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000';

  readonly fills: FillRecord[] = [];
  beginPathCount = 0;
  moveToCount = 0;
  quadraticCurveToCount = 0;
  closePathCount = 0;

  save(): void {}
  restore(): void {}

  beginPath(): void {
    this.beginPathCount += 1;
  }

  moveTo(): void {
    this.moveToCount += 1;
  }

  quadraticCurveTo(): void {
    this.quadraticCurveToCount += 1;
  }

  closePath(): void {
    this.closePathCount += 1;
  }

  fill(): void {
    this.fills.push({
      composite: this.globalCompositeOperation,
      alpha: this.globalAlpha,
      fillStyle: typeof this.fillStyle === 'string' ? this.fillStyle : '[non-string]',
    });
  }
}
