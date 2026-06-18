import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom doesn't implement matchMedia / scrollTo / SpeechSynthesis used in app
if (!window.matchMedia) {
  window.matchMedia = (q: string) =>
    ({ matches: false, media: q, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }) as unknown as MediaQueryList;
}
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
// @ts-expect-error stub
window.speechSynthesis = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {} };
// @ts-expect-error stub
window.SpeechSynthesisUtterance = function () { return { addEventListener: () => {} }; };