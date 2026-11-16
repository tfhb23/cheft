import { describe, expect, it } from 'vitest';
import { NavGuard, NavHost } from './nav';

/** Minimaler Browserverlauf: eine Liste von Einträgen mit Position. back() löst wie im Browser popstate aus. */
function fakeBrowser() {
  const entries: unknown[] = [null]; // [0] = die Seite davor ... hier: Basiseintrag der App
  let pos = 0;
  let listener: (() => void) | null = null;
  const host: NavHost = {
    history: {
      get state() {
        return entries[pos];
      },
      pushState(s) {
        entries.splice(pos + 1);
        entries.push(s);
        pos++;
      },
      replaceState(s) {
        entries[pos] = s;
      },
      back() {
        if (pos === 0) throw new Error('App verlassen');
        pos--;
        listener?.();
      },
    },
    addEventListener(_t, l) {
      listener = l;
    },
  };
  return { host, depth: () => pos, swipeBack: () => host.history.back() };
}

describe('NavGuard', () => {
  it('legt außerhalb des Menüs einen Puffer an und fängt „Zurück“ ab', () => {
    const b = fakeBrowser();
    let root = true;
    let backs = 0;
    const nav = new NavGuard(b.host, () => root, () => { backs++; root = true; });
    nav.sync();
    expect(b.depth()).toBe(0); // Menü: kein Puffer, Zurück würde die App verlassen
    root = false;
    nav.sync();
    expect(b.depth()).toBe(1);
    b.swipeBack();
    expect(backs).toBe(1);
    expect(b.depth()).toBe(0); // Menü erreicht, kein Puffer mehr
  });

  it('legt den Puffer neu an, wenn die App nach „Zurück“ nicht im Menü landet (Fenster/Warnung)', () => {
    const b = fakeBrowser();
    let root = false;
    let backs = 0;
    const nav = new NavGuard(b.host, () => root, () => { backs++; });
    nav.sync();
    b.swipeBack();
    b.swipeBack();
    b.swipeBack();
    expect(backs).toBe(3);
    expect(b.depth()).toBe(1); // nie aus der App gefallen
  });

  it('räumt den Puffer weg, wenn das Menü per Knopf erreicht wird, ohne die App zu verlassen', () => {
    const b = fakeBrowser();
    let root = false;
    let backs = 0;
    const nav = new NavGuard(b.host, () => root, () => backs++);
    nav.sync();
    root = true;
    nav.sync(); // „Zurück“-Knopf der App
    expect(b.depth()).toBe(0);
    expect(backs).toBe(0); // das war keine Wischgeste
    root = false;
    nav.sync();
    expect(b.depth()).toBe(1); // erneut betreten funktioniert wieder
  });

  it('verträgt schnelles Menü -> Seite -> Menü, bevor popstate eintrifft', () => {
    const b = fakeBrowser();
    let root = false;
    const nav = new NavGuard(b.host, () => root, () => undefined);
    nav.sync();
    root = true;
    nav.sync();
    root = false;
    nav.sync();
    root = true;
    nav.sync();
    expect(b.depth()).toBe(0);
  });

  it('ersetzt die Adresse, ohne den Puffer zu verlieren', () => {
    const b = fakeBrowser();
    const nav = new NavGuard(b.host, () => false, () => undefined);
    nav.sync();
    nav.replaceUrl('/');
    nav.sync();
    expect(b.depth()).toBe(1);
  });
});
