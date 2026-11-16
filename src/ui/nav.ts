/**
 * Zurück-Geste und Zurück-Taste des Browsers/Handys.
 *
 * Die App ist eine einzige Seite. Damit „Zurück“ nicht die ganze App verlässt, hält sie einen Verlaufseintrag
 * als Puffer: Solange man nicht im Hauptmenü ist, liegt über dem Basiseintrag genau ein Eintrag der App.
 * Wischt man zurück, fällt dieser Puffer weg, die App reagiert (eine Ebene zurück, Fenster schließen oder bei
 * laufendem Spiel/Lobby erst warnen) und legt den Puffer bei Bedarf sofort wieder an.
 * Im Hauptmenü gibt es keinen Puffer: Dort verlässt „Zurück“ die App wie bei jeder anderen App.
 */
interface HistoryLike {
  readonly state: unknown;
  pushState(state: unknown, title: string, url?: string | null): void;
  replaceState(state: unknown, title: string, url?: string | null): void;
  back(): void;
}
export interface NavHost {
  history: HistoryLike;
  addEventListener(type: 'popstate', listener: () => void): void;
}

const MARK = 'cheftSub';
const isBuffer = (state: unknown): boolean => typeof state === 'object' && state !== null && MARK in state;

export class NavGuard {
  /** Ein selbst ausgelöstes history.back() (Menü erreicht) läuft noch; sein popstate ist keine Wischgeste. */
  private quiet = false;

  constructor(
    private readonly host: NavHost,
    /** Ist gerade das Hauptmenü offen? */
    private readonly atRoot: () => boolean,
    /** Der Nutzer wollte zurück, obwohl er nicht im Hauptmenü ist. */
    private readonly onBack: () => void,
  ) {
    host.addEventListener('popstate', () => this.onPop());
  }

  /** Nach jedem Bildschirmwechsel aufrufen: legt den Puffer an (Menü verlassen) oder räumt ihn weg (Menü erreicht). */
  sync(): void {
    const h = this.host.history;
    const inBuffer = isBuffer(h.state);
    if (!this.atRoot() && !inBuffer) h.pushState({ [MARK]: true }, '');
    else if (this.atRoot() && inBuffer && !this.quiet) {
      this.quiet = true;
      h.back();
    }
  }

  /** Adresse bereinigen (z. B. Raumlink /232 -> /), ohne den Puffer zu verlieren. */
  replaceUrl(url: string): void {
    this.host.history.replaceState(this.host.history.state, '', url);
  }

  private onPop(): void {
    if (this.quiet) {
      this.quiet = false;
      this.sync();
      return;
    }
    if (isBuffer(this.host.history.state)) {
      this.sync(); // „Vorwärts“ in einen alten Eintrag: im Menü wieder wegräumen
      return;
    }
    if (this.atRoot()) return;
    this.onBack();
    this.sync();
  }
}
