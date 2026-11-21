/**
 * Kartenbewegungen: FLIP-Animation über data-card-id.
 * Vor einer Änderung Positionen merken, nach dem Neuzeichnen Klone fliegen lassen.
 */

import { CARD_PX, EASE_FLY, MOTION } from './tokens';

/** Zelle des Kartenrückens (A) im Atlas. */
const BACK_CELL = 53;

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
  const duration = opts.duration ?? MOTION.fly;
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
    const appeared = !before.has(id);
    promises.push(flyClone(el, from, to, duration, false, rotationOf(el), appeared ? 0 : rotationOf(el)));
  }
  if (opts.disappearTo) {
    for (const [id, from] of before) {
      if (after.has(id)) continue;
      if (opts.only && !opts.only.has(id)) continue;
      const ghost = document.createElement('div');
      ghost.className = 'card fly';
      ghost.style.width = `${from.width}px`;
      ghost.style.height = `${from.height}px`;
      ghost.style.backgroundSize = `${(from.width / CARD_PX.w) * CARD_PX.atlasW}px ${(from.height / CARD_PX.h) * CARD_PX.atlasH}px`;
      ghost.style.backgroundPosition = `${-(BACK_CELL % CARD_PX.cols) * from.width}px ${-Math.floor(BACK_CELL / CARD_PX.cols) * from.height}px`;
      document.body.appendChild(ghost);
      const pr = flyClone(ghost, from, opts.disappearTo, duration, true, 0, 0);
      ghost.remove();
      promises.push(pr);
    }
  }
  return Promise.all(promises).then(() => undefined);
}

/** Drehung eines Kartenelements durch gedrehte Sitz-Container (in Grad). */
export function rotationOf(el: HTMLElement): number {
  let rot = 0;
  let node: HTMLElement | null = el;
  while (node) {
    if (node.classList.contains('flip180')) rot += 180;
    if (node.classList.contains('seat-left')) rot += 90;
    if (node.classList.contains('seat-right')) rot -= 90;
    if (node.classList.contains('carpet')) rot -= 90;
    node = node.parentElement;
  }
  return rot;
}

/** Lässt eine Kopie von el von from nach to fliegen; el bleibt währenddessen unsichtbar. */
export function flyClone(el: HTMLElement, from: DOMRect, to: DOMRect, duration: number, fade: boolean, rotTo = rotationOf(el), rotFrom = rotTo): Promise<void> {
  const clone = el.cloneNode(false) as HTMLElement;
  clone.className = 'card fly';
  const cs = getComputedStyle(el);
  const w = el.offsetWidth || to.width;
  const hgt = el.offsetHeight || to.height;
  clone.style.width = `${w}px`;
  clone.style.height = `${hgt}px`;
  clone.style.backgroundSize = cs.backgroundSize;
  clone.style.backgroundPosition = cs.backgroundPosition;
  clone.style.backgroundImage = cs.backgroundImage;
  clone.style.left = '0px';
  clone.style.top = '0px';
  clone.style.transform = '';
  clone.style.transition = 'none';
  clone.style.transformOrigin = 'center';
  document.body.appendChild(clone);
  if (!fade && el.isConnected) el.classList.add('hidden-anim');
  const fx = from.left + from.width / 2 - w / 2;
  const fy = from.top + from.height / 2 - hgt / 2;
  const tx = to.left + to.width / 2 - w / 2;
  const ty = to.top + to.height / 2 - hgt / 2;
  const anim = clone.animate(
    [
      { transform: `translate(${fx}px, ${fy}px) rotate(${rotFrom}deg)`, opacity: 1 },
      { transform: `translate(${tx}px, ${ty}px) rotate(${rotTo}deg)`, opacity: fade ? 0 : 1 },
    ],
    { duration, easing: EASE_FLY, fill: 'forwards' },
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
      ghost.style.backgroundSize = `${(cardW / CARD_PX.w) * CARD_PX.atlasW}px ${(cardH / CARD_PX.h) * CARD_PX.atlasH}px`;
      ghost.style.backgroundPosition = `${-(BACK_CELL % CARD_PX.cols) * cardW}px ${-Math.floor(BACK_CELL / CARD_PX.cols) * cardH}px`;
      const to = new DOMRect(t.left + t.width / 2 - cardW / 2, t.top + t.height / 2 - cardH / 2, cardW, cardH);
      const d = delay;
      promises.push(
        new Promise((resolve) => {
          setTimeout(() => {
            document.body.appendChild(ghost);
            flyClone(ghost, stock, to, MOTION.fly, true, 0, 0).then(resolve);
            ghost.remove();
          }, d);
        }),
      );
      delay += MOTION.step;
    }
  }
  return Promise.all(promises).then(() => undefined);
}
