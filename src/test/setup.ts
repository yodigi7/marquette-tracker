import "@testing-library/jest-dom/vitest";

if (typeof globalThis.Element === "function") {
  if (typeof globalThis.Element.prototype.scrollIntoView !== "function") {
    globalThis.Element.prototype.scrollIntoView = () => {};
  }
  if (typeof globalThis.Element.prototype.hasPointerCapture !== "function") {
    globalThis.Element.prototype.hasPointerCapture = () => false;
  }
  if (typeof globalThis.Element.prototype.releasePointerCapture !== "function") {
    globalThis.Element.prototype.releasePointerCapture = () => {};
  }
}
