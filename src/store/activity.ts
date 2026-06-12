/**
 * Toolbar selection state for the active drawing session. This is UI state:
 * the InkEngine holds the authoritative tool/color/size for stroke capture,
 * and the session hook mirrors these selections into it. Nothing here is in
 * the pointer-to-paint path.
 */
import { create } from 'zustand';
import type { ToolId } from '@/types/ink';
import { BRUSH_SIZES, INK_PALETTE } from '@/constants';

type BrushSizeIndex = 0 | 1 | 2;

type ActivityUiState = {
  tool: ToolId;
  color: string;
  sizeIndex: BrushSizeIndex;
  setTool: (tool: ToolId) => void;
  setColor: (color: string) => void;
  setSizeIndex: (index: BrushSizeIndex) => void;
};

export const useActivityUiStore = create<ActivityUiState>((set) => ({
  tool: 'crayon',
  color: INK_PALETTE[0],
  sizeIndex: 1,
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setSizeIndex: (sizeIndex) => set({ sizeIndex }),
}));

/** The normalized brush size for a size index. */
export function brushSizeFor(index: BrushSizeIndex): number {
  return BRUSH_SIZES[index];
}
