/**
 * UI state only (CLAUDE.md: no ink state here, ever). Screen routing and
 * parent-facing notices. Phase 1 has two screens, so routing is a tagged
 * union rather than a router dependency.
 */
import { create } from 'zustand';

export type Screen = { name: 'shelf' } | { name: 'activity'; documentId: string };

type UiState = {
  screen: Screen;
  /** Parent-zone notice (plain language). Null when nothing to show. */
  parentNotice: string | null;
  openShelf: () => void;
  openActivity: (documentId: string) => void;
  setParentNotice: (notice: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  screen: { name: 'shelf' },
  parentNotice: null,
  openShelf: () => set({ screen: { name: 'shelf' } }),
  openActivity: (documentId) => set({ screen: { name: 'activity', documentId } }),
  setParentNotice: (notice) => set({ parentNotice: notice }),
}));
