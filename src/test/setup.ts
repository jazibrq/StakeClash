import "@testing-library/jest-dom";

// Guard: only set up browser globals when running in a browser-like environment.
// Tests that use `@vitest-environment node` do not have `window`.
if (typeof window === "undefined") {
  // Node environment — nothing to set up
} else {
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
}
