/**
 * Kartenbewegungen: FLIP-Animation über data-card-id.
 * Vor einer Änderung Positionen merken, nach dem Neuzeichnen Klone fliegen lassen.
 */

export type RectMap = Map<number, DOMRect>;

export function snapshot(root: HTMLElement): RectMap {
  const map: RectMap = new Map();
  root.querySelectorAll<HTMLElement>('[data-card-id]').forEach((el) => {
    const id = Number(el.dataset.cardId);
    if (!Number.isFinite(id) || el.closest('.overlay')) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0) map.set(id, r);
  });
  return map;
}

export interface FlipOptions {
  /** Startpunkt für neu erscheinende Karten. */
  appearFrom?: DOMRect | null;
  /** Zielpunkt für verschwindende Karten. */
  disappearTo?: DOMRect | null;
  duration?: number;
  /** Nur Karten mit diesen IDs animieren (sonst alle). */
  only?: Set<number>;
}

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function flip(root: HTMLElement, before: RectMap, opts: FlipOptions = {}): Promise<void> {
  if (reduce()) return Promise.resolve();
  const duration = opts.duration ?? 260;
  const after = snapshot(root);
  const promises: Promise<unknown>[] = [];
  const byId = new Map<number, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-card-id]').forEach((el) => {
    if (!el.closest('.overlay')) byId.set(Number(el.dataset.cardId), el);
  });

  for (const [id, to] of after) {
    if (opts.only && !opts.only.has(id)) continue;
    const from = before.get(id) ?? opts.appearFrom ?? null;
    if (!from) continue;
    if (Math.abs(from.left - to.left) < 2 && Math.abs(from.top - to.top) < 2 && Math.abs(from.width - to.width) < 2) continue;
    const el = byId.get(id)!;
    promises.push(flyClone(el, from, to, duration, false));
  }
  if (opts.disappearTo) {
    for (const [id, from] of before) {
      if (after.has(id)) continue;
      if (opts.only && !opts.only.has(id)) continue;
      const ghost = document.createElement('div');
      ghost.className = 'card fly';
      ghost.style.width = `${from.width}px`;
      ghost.style.height = `${from.height}px`;
      ghost.style.backgroundSize = `${(from.width / 32) * 256}px ${(from.height / 44) * 308}px`;
      ghost.style.backgroundPosition = 'calc(-32px * 5) calc(-44px * 6)';
      promises.push(flyClone(ghost, from, opts.disappearTo, duration, true));
    }
  }
  return Promise.all(promises).then(() => undefined);
}

/** Lässt eine Kopie von el von from nach to fliegen; el bleibt währenddessen unsichtbar. */
export function flyClone(el: HTMLElement, from: DOMRect, to: DOMRect, duration: number, fade: boolean): Promise<void> {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.classList.add('fly');
  clone.classList.remove('selected', 'fresh', 'glow', 'dragging', 'hidden-anim');
  clone.style.left = '0px';
  clone.style.top = '0px';
  clone.style.width = `${to.width}px`;
  clone.style.height = `${to.height}px`;
  clone.style.transform = '';
  clone.style.transition = 'none';
  document.body.appendChild(clone);
  if (!fade && el.isConnected) el.classList.add('hidden-anim');
  const sx = from.width / to.width;
  const sy = from.height / to.height;
  const anim = clone.animate(
    [
      { transform: `translate(${from.left}px, ${from.top}px) scale(${sx}, ${sy})`, opacity: 1 },
      { transform: `translate(${to.left}px, ${to.top}px) scale(1, 1)`, opacity: fade ? 0 : 1 },
    ],
    { duration, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
  );
  return new Promise((resolve) => {
    const done = () => {
      clone.remove();
      el.classList.remove('hidden-anim');
      resolve();
    };
    anim.onfinish = done;
    anim.oncancel = done;
    setTimeout(done, duration + 100);
  });
}

/** Austeil-Animation: Kartenrücken fliegen vom Stapel zu den Sitzen. */
export function dealAnimation(stock: DOMRect | null, targets: DOMRect[], perTarget: number, cardW: number, cardH: number): Promise<void> {
  if (!stock || targets.length === 0 || reduce()) return Promise.resolve();
  const promises: Promise<void>[] = [];
  let delay = 0;
  for (let i = 0; i < perTarget; i++) {
    for (const t of targets) {
      const ghost = document.createElement('div');
      ghost.className = 'card fly';
      ghost.style.width = `${cardW}px`;
      ghost.style.height = `${cardH}px`;
      ghost.style.backgroundSize = `${(cardW / 32) * 256}px ${(cardH / 44) * 308}px`;
      ghost.style.backgroundPosition = `${-(53 % 8) * cardW}px ${-Math.floor(53 / 8) * cardH}px`;
      const to = new DOMRect(t.left + t.width / 2 - cardW / 2, t.top + t.height / 2 - cardH / 2, cardW, cardH);
      const d = delay;
      promises.push(
        new Promise((resolve) => {
          setTimeout(() => {
            document.body.appendChild(ghost);
            flyClone(ghost, stock, to, 180, true).then(resolve);
            ghost.remove();
          }, d);
        }),
      );
      delay += 35;
    }
  }
  return Promise.all(promises).then(() => undefined);
}
