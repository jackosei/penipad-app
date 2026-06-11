import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not implement DOMMatrix, which pdf.js references at module scope.
// A bare stub lets the module evaluate; unit tests never rasterize pages
// (real rendering is covered by the Step 9 device matrix pass).
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixStub {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only global shim; jsdom has no DOMMatrix to type against
  globalThis.DOMMatrix = DOMMatrixStub as any;
}

afterEach(() => {
  cleanup();
});
