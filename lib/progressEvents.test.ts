import { afterEach, describe, expect, it } from "vitest";
import { PROGRESS_EVENT, notifyProgress, pauseProgress, progressPaused } from "./progressEvents";

describe("rechargement du tableau de bord pendant une construction", () => {
  const g = globalThis as unknown as { window?: EventTarget };
  afterEach(() => { pauseProgress(false); delete g.window; });

  it("signale chaque étape terminée en temps normal", () => {
    g.window = new EventTarget();
    let n = 0;
    g.window.addEventListener(PROGRESS_EVENT, () => n++);
    notifyProgress(); notifyProgress();
    expect(n).toBe(2);
  });

  it("ne signale plus rien tant que la construction est en pause, puis reprend", () => {
    g.window = new EventTarget();
    let n = 0;
    g.window.addEventListener(PROGRESS_EVENT, () => n++);
    pauseProgress(true);
    expect(progressPaused()).toBe(true);
    notifyProgress(); notifyProgress(); notifyProgress();
    expect(n).toBe(0);
    pauseProgress(false);
    notifyProgress();
    expect(n).toBe(1);
  });
});
