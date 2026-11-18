/** Pixel-Piktogramme (10 × 10), als SVG gezeichnet und in der Textfarbe des Buttons eingefärbt. */
export interface IconDef {
  id: string;
  key: string;
  name: string;
  use: string;
  rows: string[];
}

export const ICON_BOOK = ['.########.', '.#..#....#', '.#..#....#', '.#..#....#', '.#..#....#', '.#..#....#', '.#..#....#', '.#..#....#', '.########.', '..........'];
export const ICON_TABLE = ['##########', '#...#....#', '##########', '#...#....#', '#...#....#', '##########', '#...#....#', '#...#....#', '##########', '..........'];
export const ICON_GEAR = ['....##....', '.#.####.#.', '.########.', '..##..##..', '###....###', '###....###', '..##..##..', '.########.', '.#.####.#.', '....##....'];
export const ICON_ARROW_L = ['..........', '....#.....', '...##.....', '..###.....', '.####.....', '.####.....', '..###.....', '...##.....', '....#.....', '..........'];
export const ICON_ARROW_R = ['..........', '.....#....', '.....##...', '.....###..', '.....####.', '.....####.', '.....###..', '.....##...', '.....#....', '..........'];
export const ICON_X = ['..........', '.##....##.', '..##..##..', '...####...', '....##....', '....##....', '...####...', '..##..##..', '.##....##.', '..........'];
/**
 * Funksymbol mit fettem X: Verbindung verloren (Variante 3b, design/icons/funk-varianten-runde2.png). 12 × 12 Pixel, also
 * nicht in ICONS (die 10 × 10 für Icon-Buttons); die Größe steht im Token `--size-icon-status`. Das X hat überall 1 Pixel Abstand zu den Wellen.
 */
export const ICON_NOCONN = ['..####.##.##', '.#......###.', '#........#..', '...###..###.', '..#....##.##', '............', '....####....', '...#....#...', '............', '.....##.....', '.....##.....', '............'];

/** 5.41–5.44: alle Piktogramme der App. */
export const ICONS: IconDef[] = [
  { id: '5.41', key: 'table', name: 'Punkteübersicht', use: 'Kopfzeile im Spiel, links', rows: ICON_TABLE },
  { id: '5.42', key: 'book', name: 'Regeln', use: 'Kopfzeile im Spiel, rechts', rows: ICON_BOOK },
  { id: '5.43', key: 'gear', name: 'Einstellungen', use: 'Kopfzeile im Spiel, rechts außen', rows: ICON_GEAR },
  { id: '5.44', key: 'x', name: 'Entfernen', use: 'Lobby: Mitspieler oder Bot entfernen (nur Gastgeber)', rows: ICON_X },
];

const NS = 'http://www.w3.org/2000/svg';

/** SVG aus Pixelzeilen; `fill` ist currentColor, damit der Button die Farbe bestimmt. */
export function pixelArt(rows: string[], colors?: Record<string, string>): SVGElement {
  const w = Math.max(...rows.map((r) => r.length));
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${rows.length}`);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const fill = colors ? colors[ch] : ch === '#' ? 'currentColor' : undefined;
      if (!fill) continue;
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', String(x));
      r.setAttribute('y', String(y));
      r.setAttribute('width', '1');
      r.setAttribute('height', '1');
      r.setAttribute('fill', fill);
      svg.appendChild(r);
    }
  });
  return svg;
}

export function pixelIcon(rows: string[]): HTMLElement {
  return pixelArt(rows) as unknown as HTMLElement;
}
