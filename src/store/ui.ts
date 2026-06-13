/**
 * UI state only (CLAUDE.md: no ink state here, ever). Screen routing, the
 * parental gate, and parent-facing notices. Phase 1 screens are a tagged union
 * rather than a router dependency.
 */
import { create } from 'zustand';

export type Screen =
  | { name: 'shelf' }
  | { name: 'settings' }
  | { name: 'activity'; documentId: string };

/**
 * A pending gated action. The gate is rendered once at the app root; any
 * surface that needs a parent (import, delete, export, settings) calls
 * `requestGate`, and `onPass` runs only after the gate is cleared.
 */
export type GateRequest = {
  /** Parent-facing description of what passing the gate will do. */
  label: string;
  onPass: () => void;
};

type UiState = {
  screen: Screen;
  gate: GateRequest | null;
  /** Parent-zone notice (plain language). Null when nothing to show. */
  parentNotice: string | null;
  /** A blocking, plain-language progress message (e.g. while exporting). */
  busy: string | null;
  openShelf: () => void;
  openSettings: () => void;
  openActivity: (documentId: string) => void;
  requestGate: (request: GateRequest) => void;
  closeGate: () => void;
  setParentNotice: (notice: string | null) => void;
  setBusy: (message: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  screen: { name: 'shelf' },
  gate: null,
  parentNotice: null,
  busy: null,
  openShelf: () => set({ screen: { name: 'shelf' } }),
  openSettings: () => set({ screen: { name: 'settings' } }),
  openActivity: (documentId) => set({ screen: { name: 'activity', documentId } }),
  requestGate: (request) => set({ gate: request }),
  closeGate: () => set({ gate: null }),
  setParentNotice: (notice) => set({ parentNotice: notice }),
  setBusy: (message) => set({ busy: message }),
}));
