// @ts-check
// The map: one office floor with outer walls and zones. The layout is fixed and the same for everyone.
//
// How to change the map:
//  • The zones (floor and name) are in ZONES. The order matters: later zones are drawn over earlier ones.
//  • The decor (desks, plants, printers …) is in makeDecor(). Decor never blocks movement.
//  • DOORS are elevators and doors along the walls where lawyers can enter when it is crowded.
// The map's size and wall thickness are in config.js (CONFIG.map).
import { CONFIG } from './config.js';

const K = CONFIG.map;
const V = K.wall;

/** The inside of the map (where you can walk). */
export const INSIDE = { x0: V.left, y0: V.top, x1: K.width - V.right, y1: K.height - V.bottom };

/**
 * @typedef {Object} Zone
 * @property {string} id
 * @property {string} name
 * @property {string} floor floor type (see the map drawing in renderer.js)
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {string} minimap color on the minimap
 */

/** @type {Zone[]} */
export const ZONES = [
  { id: 'openOffice', name: 'Kontorlandskapet', floor: 'carpet', x: INSIDE.x0, y: INSIDE.y0, w: INSIDE.x1 - INSIDE.x0, h: INSIDE.y1 - INSIDE.y0, minimap: '#5f7d9c' },
  { id: 'canteen', name: 'Kantina', floor: 'vinyl', x: 16, y: 40, w: 704, h: 520, minimap: '#c9a66b' },
  { id: 'elevators', name: 'Heisene', floor: 'tiles', x: 1056, y: 40, w: 448, h: 184, minimap: '#7c7f8a' },
  { id: 'meetingRoom', name: 'Møterommene', floor: 'parquet', x: 1824, y: 40, w: 720, h: 520, minimap: '#a87a4f' },
  { id: 'printer', name: 'Printerrommet', floor: 'linoleum', x: 16, y: 960, w: 544, h: 464, minimap: '#8d96a3' },
  { id: 'reception', name: 'Resepsjonen', floor: 'marble', x: 1040, y: 1120, w: 480, h: 304, minimap: '#d8d3c8' },
  { id: 'sofa', name: 'Sofakroken', floor: 'green', x: 1920, y: 1040, w: 624, h: 384, minimap: '#5f9a6a' },
];

/** Elevators and doors along the walls. Used when there is no room to let lawyers in outside the field of view. */
export const DOORS = [
  { x: 1150, y: 58 }, { x: 1280, y: 58 }, { x: 1410, y: 58 }, // the elevators
  { x: 1280, y: 1410 }, // the main entrance
  { x: 30, y: 760 }, { x: 2530, y: 760 }, // emergency exits
  { x: 600, y: 1410 }, { x: 2000, y: 58 }, { x: 30, y: 300 }, { x: 2530, y: 1250 }, // stairs
];

/**
 * The spots for the capture-point events (Endringsprompt 5, CONFIG.capture): the centre of the circle on the floor.
 * Spread out over the map so it always takes a trip to get there. The decor for each is added in makeDecor().
 *  snacks = Jacob's desk (bottom, between the reception and the sofa corner), pingpongTable = the ping-pong table
 *  (a social corner just below the canteen), meeting = the left meeting room (around its table).
 * @type {Record<string, {x: number, y: number}>}
 */
export const HOTSPOTS = {
  snacks: { x: 1700, y: 1262 },
  pingpongTable: { x: 300, y: 648 },
  meeting: { x: 2004, y: 262 },
};

/** Keeps a point inside the outer walls. */
export function clampIn(x, y, r, out) {
  out.x = Math.min(INSIDE.x1 - r, Math.max(INSIDE.x0 + r, x));
  out.y = Math.min(INSIDE.y1 - r, Math.max(INSIDE.y0 + r, y));
  return out;
}

/** Which zone a point is in (the last one that fits). */
export function zoneAt(x, y) {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    const s = ZONES[i];
    if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return s;
  }
  return ZONES[0];
}

/**
 * @typedef {{t: string, x: number, y: number}} Decor
 * t is the name of the decor sprite (see sprites.js), (x, y) is the center.
 */

/** Makes the fixed list of decor. Decor never blocks movement. */
export function makeDecor() {
  /** @type {Decor[]} */
  const p = [];
  const add = (t, x, y) => p.push({ t, x, y });

  // The open office: desk islands (two desks with chairs, back to back)
  const eye = (x, y) => {
    add('desk', x, y);
    add('desk', x + 44, y);
    add('chair', x, y + 22);
    add('chair', x + 44, y + 22);
    add('deskUp', x, y - 30);
    add('deskUp', x + 44, y - 30);
    add('chairUp', x, y - 52);
    add('chairUp', x + 44, y - 52);
  };
  for (const x of [860, 1100, 1340, 1580]) for (const y of [380, 600, 820, 1020]) eye(x, y);
  for (const x of [110, 330, 550]) eye(x, 760);
  for (const x of [1990, 2260]) for (const y of [700, 900]) eye(x, y);
  for (const x of [660, 880]) for (const y of [1130, 1330]) eye(x, y);
  for (const [x, y] of [[760, 300], [1760, 300], [760, 1060], [1000, 1060], [1800, 1080], [1800, 640], [1820, 1300], [600, 900], [2440, 600]]) add('plant', x, y);
  for (const [x, y] of [[1000, 520], [1700, 900], [480, 640], [1460, 1080], [2120, 1000]]) add('waterCooler', x, y);
  add('whiteboard', 1220, 250);

  // The canteen
  for (const x of [120, 280, 440, 600]) for (const y of [200, 340, 480]) {
    add('table', x, y);
    add('chairUp', x, y - 22);
    add('chair', x, y + 20);
    add('chairSide', x - 24, y);
    add('chairSide', x + 24, y);
  }
  add('bench', 250, 68);
  add('coffeeMachine', 120, 62);
  add('coffeeMachine', 160, 62);
  add('fridge', 400, 58);
  add('vendingMachine', 460, 58);
  add('vendingMachine', 520, 58);
  add('waterCooler', 680, 70);
  add('plant', 690, 520);

  // The elevators
  add('benchLong', 1280, 170);
  add('plant', 1080, 70);
  add('plant', 1480, 70);

  // The meeting rooms (glass walls are drawn separately)
  for (const x of [2004, 2364]) {
    add('meetingTable', x, 260);
    for (const dx of [-60, -20, 20, 60]) {
      add('chairUp', x + dx, 232);
      add('chair', x + dx, 292);
    }
    add('whiteboard', x, 52);
    add('plant', x - 150, 480);
    add('screen', x + 120, 60);
  }

  // The printer room
  for (const y of [1040, 1130, 1220, 1310]) add('printer', 56, y);
  add('copier', 300, 1040);
  add('copier', 420, 1040);
  for (const x of [200, 260, 320, 380, 440]) add('paperBoxes', x, 1390);
  add('shelf', 500, 1250);
  add('shelf', 500, 1320);
  add('paperBoxes', 300, 1200);
  add('paperBoxes', 330, 1210);

  // The reception
  add('receptionDesk', 1280, 1210);
  add('carpetLogo', 1280, 1320);
  add('sofa', 1110, 1380);
  add('sofa', 1450, 1380);
  add('plant', 1060, 1150);
  add('plant', 1500, 1150);

  // The sofa corner
  for (const [x, y] of [[2050, 1150], [2300, 1150], [2050, 1330], [2300, 1330]]) {
    add('carpetRound', x, y);
    add('sofa', x, y - 30);
    add('armchair', x - 50, y + 10);
    add('armchair', x + 50, y + 10);
    add('coffeeTable', x, y + 10);
  }
  for (const x of [1980, 2140, 2300, 2460]) add('shelf', x, 1060);
  add('plant', 2510, 1400);
  add('plant', 1950, 1400);

  // Endringsprompt 5: the spots for the capture-point events (nothing above is moved)
  add('jacobDesk', HOTSPOTS.snacks.x, HOTSPOTS.snacks.y - 12);
  add('pingpongTable', HOTSPOTS.pingpongTable.x, HOTSPOTS.pingpongTable.y);

  // Along the walls
  for (const x of [800, 900, 1600, 1700]) add('plant', x, 62);
  for (const y of [620, 880]) {
    add('plant', 34, y);
    add('plant', 2526, y);
  }
  return p;
}

/** Glass walls (decor only): [x0, y0, x1, y1] – vertical or horizontal lines. */
export const GLASS = [
  [1824, 560, 1960, 560], [2040, 560, 2320, 560], [2400, 560, 2544, 560], // meeting room, bottom (with doors)
  [2184, 40, 2184, 560], [1824, 40, 1824, 480], // between the meeting rooms and toward the open office
  [16, 960, 160, 960], [240, 960, 560, 960], [560, 960, 560, 1300], // the printer room
];
