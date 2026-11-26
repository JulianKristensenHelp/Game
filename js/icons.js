// @ts-check
// Pixel art icons (16 × 16) for weapons, combinations, passives and buttons.
// All have a dark outline and their own shape, so they can be told apart even without colors.
import { Raster, toCanvas } from './pixel.js';
import { PALETTE, COLOR_INDEX as C } from './sprites.js';

/** @type {Record<string, (r: Raster) => void>} */
const DRAW = {
  // ----- Weapons -----
  powerCycle: (r) => {
    // power symbol
    r.ellipse(8, 8.5, 6.5, 6.5, C.TEAL);
    r.ellipse(8, 8.5, 4.5, 4.5, 0);
    r.rect(6, 1, 4, 4, 0);
    r.rect(7, 1, 2, 8, C.WHITE);
    r.rect(7, 1, 1, 8, C.LIGHT_GRAY);
  },
  toner: (r) => {
    r.rect(1, 5, 14, 7, C.NEAR_BLACK);
    r.rect(1, 5, 14, 2, C.DARKER);
    r.rect(3, 5, 3, 7, C.CYAN);
    r.rect(7, 5, 3, 7, C.MAGENTA);
    r.rect(11, 5, 3, 7, C.YELLOW);
    r.rect(2, 12, 12, 2, C.DARK_GRAY);
  },
  password: (r) => {
    r.ellipse(4.5, 8, 3.5, 3.5, C.YELLOW);
    r.ellipse(4.5, 8, 1.5, 1.5, 0);
    r.rect(8, 7, 7, 2, C.YELLOW);
    r.rect(8, 8, 7, 1, C.DARK_YELLOW);
    r.rect(11, 9, 1, 3, C.YELLOW);
    r.rect(14, 9, 1, 3, C.YELLOW);
  },
  hdmi: (r) => {
    // plug with cable
    r.rect(4, 1, 8, 7, C.NEAR_BLACK);
    r.rect(5, 2, 6, 3, C.GOLD);
    r.rect(4, 8, 8, 2, C.DARK_GRAY);
    r.rect(7, 10, 2, 3, C.NEAR_BLACK);
    r.rect(3, 12, 5, 2, C.NEAR_BLACK);
    r.rect(2, 13, 2, 2, C.NEAR_BLACK);
  },
  remote: (r) => {
    // satellite dish with signal
    r.ellipse(6, 9, 5, 5, C.LIGHT_GRAY);
    r.ellipse(7, 8, 3, 3, C.WHITE);
    r.rect(5, 13, 4, 2, C.DARK_GRAY);
    r.px(12, 3, C.BLUE);
    r.px(13, 4, C.BLUE);
    r.px(10, 1, C.BLUE);
    r.px(11, 1, C.BLUE);
    r.px(13, 1, C.BLUE);
    r.px(14, 2, C.BLUE);
    r.px(14, 3, C.BLUE);
    r.px(9, 6, C.RED);
  },
  mouse: (r) => {
    r.ellipse(8, 9, 5, 6.5, C.NEAR_WHITE);
    r.rect(8, 3, 1, 5, C.GRAY);
    r.rect(3, 7, 11, 1, C.GRAY);
    r.rect(7, 4, 3, 2, C.TEAL);
    r.px(12, 1, C.BLUE);
    r.px(13, 2, C.BLUE);
  },
  // ----- Combinations -----
  'evo:powerCycle': (r) => {
    // two arrows in a circle (restart)
    r.ellipse(8, 8, 7, 7, C.TEAL);
    r.ellipse(8, 8, 4.5, 4.5, 0);
    r.rect(0, 6, 5, 4, 0);
    r.rect(11, 6, 5, 4, 0);
    r.stamp('#### .##. ..#.', 0, 6, { '#': C.GOLD_L });
    r.stamp('.#.. .##. ####', 12, 6, { '#': C.GOLD_L });
    r.rect(7, 4, 2, 5, C.WHITE);
  },
  'evo:toner': (r) => {
    // printer with flames
    r.stamp('..#...#...#.... .###.###.###... ###############', 0, 0, { '#': C.ORANGE });
    r.rect(1, 2, 14, 1, C.YELLOW);
    r.rect(1, 4, 14, 8, C.DARK_RED);
    r.rect(1, 4, 14, 2, C.RED);
    r.rect(3, 8, 10, 2, C.NEAR_BLACK);
    r.rect(4, 10, 8, 4, C.PAPER);
  },
  'evo:password': (r) => {
    // padlock + key
    r.rect(3, 1, 6, 6, C.LIGHT_GRAY);
    r.rect(5, 3, 2, 4, 0);
    r.rect(1, 6, 10, 8, C.LIGHT_BLUE);
    r.rect(1, 6, 10, 2, C.WHITE);
    r.rect(5, 9, 2, 3, C.DARK_BLUE);
    r.rect(11, 10, 4, 2, C.YELLOW);
    r.rect(13, 12, 1, 2, C.YELLOW);
  },
  'evo:hdmi': (r) => {
    // tangle of cable
    r.ellipse(8, 8, 7, 7, C.NEAR_BLACK);
    r.ellipse(8, 8, 5.5, 5.5, 0);
    r.ellipse(8, 8, 3.5, 3.5, C.DARKER);
    r.ellipse(8, 8, 2, 2, 0);
    r.rect(1, 7, 4, 2, C.NEAR_BLACK);
    r.rect(12, 3, 3, 3, C.GOLD);
    r.rect(1, 11, 3, 3, C.GOLD);
  },
  'evo:remote': (r) => {
    // crown
    r.stamp('#..#..#..#..#.. #..#..#..#..#.. ##.##.##.##.##. ###############', 1, 3, { '#': C.GOLD });
    r.rect(1, 7, 14, 5, C.GOLD);
    r.rect(1, 11, 14, 2, C.GOLD_M);
    r.rect(4, 8, 2, 2, C.RED);
    r.rect(10, 8, 2, 2, C.BLUE);
    r.rect(7, 8, 2, 2, C.GREEN);
  },
  'evo:mouse': (r) => {
    // mouse pad with swirl
    r.rect(1, 3, 14, 11, C.PURPLE);
    r.rect(1, 3, 14, 2, C.LIGHT_BLUE);
    r.ellipse(8, 9, 4, 3, C.LIGHT_BLUE);
    r.ellipse(8, 9, 2, 1.5, C.PURPLE);
    r.ellipse(12, 6, 2, 2.5, C.WHITE);
  },
  // ----- Passives -----
  ram: (r) => {
    r.rect(1, 4, 14, 7, C.GREEN);
    r.rect(1, 4, 14, 1, C.LIGHT_GREEN);
    for (const x of [3, 7, 11]) r.rect(x, 6, 2, 3, C.NEAR_BLACK);
    for (let x = 2; x < 14; x += 2) r.rect(x, 11, 1, 2, C.GOLD);
  },
  paperTray: (r) => {
    // paper tray
    r.rect(3, 1, 10, 7, C.PAPER);
    r.rect(5, 3, 6, 1, C.LIGHT_GRAY);
    r.rect(5, 5, 6, 1, C.LIGHT_GRAY);
    r.rect(1, 8, 14, 6, C.DARK_GRAY);
    r.rect(1, 8, 14, 2, C.GRAY);
    r.rect(6, 11, 4, 1, C.NEAR_BLACK);
  },
  batteries: (r) => {
    r.rect(6, 1, 4, 2, C.LIGHT_GRAY);
    r.rect(4, 3, 8, 12, C.NEAR_BLACK);
    r.rect(5, 4, 6, 10, C.GREEN);
    r.rect(5, 4, 6, 3, C.LIGHT_GREEN);
    r.stamp('.#. ### .#.', 6, 7, { '#': C.WHITE });
  },
  ssd: (r) => {
    r.rect(1, 3, 14, 10, C.DARKER);
    r.rect(2, 4, 12, 8, C.DARK_SLATE);
    r.stamp('...##. ..##.. .####. ..##.. .##... ##....', 5, 5, { '#': C.YELLOW });
    r.rect(13, 6, 2, 4, C.GOLD);
  },
  sneakers: (r) => {
    r.rect(2, 5, 6, 6, C.RED);
    r.rect(2, 9, 13, 3, C.RED);
    r.rect(9, 8, 5, 2, C.RED);
    r.rect(1, 12, 15, 2, C.WHITE);
    r.px(4, 6, C.WHITE);
    r.px(6, 7, C.WHITE);
    r.rect(11, 9, 2, 1, C.WHITE);
  },
  biggerCan: (r) => {
    // big energy drink can with plus
    r.rect(3, 1, 10, 2, C.LIGHT_GRAY);
    r.rect(3, 3, 10, 11, C.GREEN);
    r.rect(11, 3, 2, 11, C.DARK_GREEN);
    r.rect(3, 14, 10, 1, C.LIGHT_GRAY);
    r.rect(7, 5, 2, 7, C.WHITE);
    r.rect(5, 7, 6, 2, C.WHITE);
  },
  extensionCord: (r) => {
    // extension cord (power socket with cable)
    r.rect(1, 8, 10, 6, C.NEAR_WHITE);
    r.rect(1, 12, 10, 2, C.LIGHT_GRAY);
    r.rect(3, 10, 2, 2, C.NEAR_BLACK);
    r.rect(7, 10, 2, 2, C.NEAR_BLACK);
    r.rect(11, 10, 2, 2, C.NEAR_WHITE);
    r.rect(12, 3, 2, 8, C.NEAR_WHITE);
    r.rect(10, 1, 5, 3, C.ORANGE);
  },
  admin: (r) => {
    // shield with star
    r.stamp('############## ############## ############## ############## ############## .############. .############. ..##########.. ...########... ....######.... .....####..... ......##......', 1, 2, { '#': C.DARK_BLUE });
    r.stamp('......#...... .....###..... ..#########.. ....#####.... ...##...##...', 1, 4, { '#': C.GOLD });
  },
  // ----- Other -----
  coffee: (r) => {
    r.rect(2, 6, 10, 8, C.WHITE);
    r.rect(3, 7, 8, 2, C.BROWN);
    r.ellipse(13, 10, 2.5, 2.5, C.WHITE);
    r.ellipse(13, 10, 1, 1, 0);
    r.rect(4, 1, 1, 3, C.LIGHT_GRAY);
    r.rect(7, 2, 1, 3, C.LIGHT_GRAY);
    r.rect(1, 14, 13, 1, C.LIGHT_GRAY);
  },
  soundOn: (r) => {
    r.rect(1, 6, 4, 5, C.WHITE);
    r.stamp('...#. ..##. .###. ####. ####. ####. ####. .###. ..##. ...#.', 3, 3, { '#': C.WHITE });
    r.rect(10, 6, 1, 5, C.WHITE);
    r.rect(12, 4, 1, 9, C.WHITE);
    r.rect(14, 2, 1, 13, C.WHITE);
  },
  soundOff: (r) => {
    r.rect(1, 6, 4, 5, C.WHITE);
    r.stamp('...#. ..##. .###. ####. ####. ####. ####. .###. ..##. ...#.', 3, 3, { '#': C.WHITE });
    r.stamp('#...# .#.#. ..#.. .#.#. #...#', 10, 6, { '#': C.RED });
  },
  pause: (r) => {
    r.rect(3, 2, 4, 12, C.WHITE);
    r.rect(9, 2, 4, 12, C.WHITE);
  },
  // ----- New weapons (version 3) -----
  ctrlz: (r) => {
    // keyboard key with «Z» and back arrow
    r.rect(1, 2, 14, 12, C.DARK_GRAY);
    r.rect(1, 2, 14, 10, C.LIGHT_GRAY);
    r.rect(2, 3, 12, 8, C.NEAR_WHITE);
    r.stamp('#### ...# ..#. .#.. ####', 7, 4, { '#': C.NEAR_BLACK });
    r.stamp('.#.. ##.. .#..', 2, 6, { '#': C.BLUE });
    r.rect(3, 7, 3, 1, C.BLUE);
  },
  beam: (r) => {
    // progress indicator
    r.rect(0, 5, 16, 7, C.NEAR_BLACK);
    r.rect(1, 6, 14, 5, C.DARKER);
    for (let x = 1; x < 11; x += 2) r.rect(x, 6, 1, 5, C.GREEN);
    for (let x = 2; x < 11; x += 2) r.rect(x, 6, 1, 5, C.LIGHT_GREEN);
    r.rect(1, 13, 9, 1, C.LIGHT_GREEN);
  },
  teams: (r) => {
    // purple alert icon with «T» and red dot
    r.rect(1, 3, 12, 12, C.PURPLE);
    r.rect(1, 3, 12, 2, C.LIGHT_BLUE);
    r.rect(4, 6, 6, 2, C.WHITE);
    r.rect(6, 8, 2, 5, C.WHITE);
    r.ellipse(13, 3, 2.6, 2.6, C.RED);
  },
  headset: (r) => {
    r.ellipse(8, 8, 7, 7, C.DARKER);
    r.ellipse(8, 8, 5, 5, 0);
    r.rect(0, 8, 16, 8, 0);
    r.rect(1, 7, 4, 7, C.TEAL);
    r.rect(11, 7, 4, 7, C.TEAL);
    r.rect(2, 8, 2, 5, C.TEAL_M);
    r.rect(12, 8, 2, 5, C.TEAL_M);
  },
  'evo:ctrlz': (r) => {
    // Ctrl, Alt and Del
    for (const [x, y, c] of [[0, 1, C.LIGHT_GRAY], [5, 6, C.LIGHT_GRAY], [10, 11, C.PINK]]) {
      r.rect(x, y, 6, 5, C.DARK_GRAY);
      r.rect(x, y, 6, 4, c);
    }
    r.rect(1, 3, 3, 1, C.NEAR_BLACK);
    r.rect(6, 8, 3, 1, C.NEAR_BLACK);
    r.rect(11, 13, 3, 1, C.DARK_RED);
  },
  'evo:beam': (r) => {
    // two crossed beams
    for (let i = 0; i < 14; i++) {
      r.rect(1 + i, 1 + i, 2, 2, C.GREEN);
      r.rect(13 - i, 1 + i, 2, 2, C.LIGHT_GREEN);
    }
    r.ellipse(8, 8, 2.5, 2.5, C.WHITE);
  },
  'evo:teams': (r) => {
    // all-hands meeting: three people
    for (const [x, c] of [[1, C.PURPLE], [6, C.BLUE], [11, C.PURPLE]]) {
      r.ellipse(x + 2, 5, 2, 2, c);
      r.rect(x, 8, 5, 6, c);
    }
    r.rect(0, 14, 16, 1, C.DARKER);
  },
  'evo:headset': (r) => {
    // home office: house with heart
    r.stamp('.......##....... ......####...... .....######..... ....########.... ...##########... ..############.. .##############.', 0, 0, { '#': C.RED });
    r.rect(3, 7, 10, 8, C.CREAM);
    r.rect(7, 10, 3, 5, C.WOOD);
    r.rect(4, 9, 2, 2, C.LIGHT_BLUE);
  },
  dualMonitor: (r) => {
    for (const x of [0, 8]) {
      r.rect(x, 3, 8, 7, C.DARKER);
      r.rect(x + 1, 4, 6, 5, C.LIGHT_BLUE);
    }
    r.rect(3, 10, 2, 3, C.DARK_GRAY);
    r.rect(11, 10, 2, 3, C.DARK_GRAY);
    r.rect(1, 13, 14, 1, C.DARK_GRAY);
  },
  shortcuts: (r) => {
    r.rect(0, 6, 16, 8, C.DARK_GRAY);
    for (let y = 7; y < 13; y += 3) for (let x = 1; x < 15; x += 3) r.rect(x, y, 2, 2, C.LIGHT_GRAY);
    r.stamp('...##. ..##.. .####. ..##.. .##...', 9, 0, { '#': C.YELLOW });
  },
  ergonomicChair: (r) => {
    // office chair
    r.rect(4, 1, 8, 7, C.CHAIR);
    r.rect(5, 2, 6, 5, C.LIGHT_GRAY2);
    r.rect(3, 8, 10, 2, C.CHAIR_M);
    r.rect(7, 10, 2, 3, C.DARKER);
    r.rect(3, 13, 10, 1, C.DARKER);
    r.px(3, 14, C.NEAR_BLACK);
    r.px(12, 14, C.NEAR_BLACK);
  },
  certification: (r) => {
    // Shopkeeperen (Endringsprompt 4): a friendly shop assistant in a black sweater with a big white «A»
    r.rect(2, 9, 12, 7, C.NEAR_BLACK);
    r.rect(1, 11, 14, 5, C.NEAR_BLACK);
    r.stamp('.#. #.# ### #.#', 6, 11, { '#': C.WHITE });
    r.ellipse(8, 5, 3.6, 3.8, C.WOOD_L);
    r.ellipse(8, 2.2, 4, 2, C.POT);
    r.px(6, 5, C.NEAR_BLACK);
    r.px(10, 5, C.NEAR_BLACK);
    r.rect(7, 7, 3, 1, C.DARK_RED);
  },
  // ----- Endringsprompt 4 -----
  pingpong: (r) => {
    // a red ping-pong paddle and a white ball
    r.ellipse(6, 6, 5, 5, C.RED);
    r.ellipse(5, 5, 2.5, 2.5, C.WINE_L);
    r.rect(9, 9, 2, 2, C.WOOD);
    r.rect(10, 10, 3, 3, C.WOOD_M);
    r.rect(12, 12, 3, 3, C.WOOD_M);
    r.ellipse(12.5, 3.5, 2.5, 2.5, C.NEAR_WHITE);
  },
  'evo:pingpong': (r) => {
    // Ping of Death: a red-hot ball splitting in two, with glowing trails behind both
    for (let i = 0; i < 5; i++) {
      r.px(1 + i, 14 - i, i < 2 ? C.YELLOW : C.ORANGE);
      r.px(2 + i, 14 - i, C.ORANGE);
      r.px(1 + i, 9 - Math.floor(i / 2), C.ORANGE);
    }
    r.ellipse(10, 8.5, 3.6, 3.6, C.RED);
    r.rect(9, 7, 2, 2, C.YELLOW);
    r.ellipse(13, 3, 2.2, 2.2, C.RED);
    r.px(12, 2, C.YELLOW);
  },
  bodyguard: (r) => {
    // Livvakten: head with sunglasses and an earpiece, black suit, and a small flame
    r.rect(2, 11, 12, 5, C.NEAR_BLACK);
    r.rect(7, 11, 2, 3, C.WHITE);
    r.ellipse(8, 6, 4, 4.3, C.POT_M);
    r.rect(4, 2, 8, 2, C.NEAR_BLACK);
    r.rect(5, 5, 6, 2, C.NEAR_BLACK);
    r.px(5, 5, C.DARK_GRAY);
    r.px(9, 5, C.DARK_GRAY);
    r.px(12, 7, C.LIGHT_GRAY);
    r.px(13, 8, C.LIGHT_GRAY);
    r.px(12, 9, C.LIGHT_GRAY);
    r.ellipse(13, 13, 2, 2.6, C.ORANGE);
    r.px(13, 13, C.YELLOW);
  },
  matrix: (r) => {
    // The Matrix: green falling code with a pair of black sunglasses
    for (const [x, h] of [[1, 9], [4, 13], [7, 6], [10, 11], [13, 8]]) {
      for (let y = 0; y < h; y += 2) r.px(x, 15 - h + y, y === h - 1 || y === h - 2 ? C.LIGHT_GREEN : C.GREEN);
    }
    r.rect(1, 6, 6, 3, C.NEAR_BLACK);
    r.rect(9, 6, 6, 3, C.NEAR_BLACK);
    r.rect(7, 6, 2, 1, C.NEAR_BLACK);
    r.px(2, 6, C.LIGHT_GREEN);
    r.px(10, 6, C.LIGHT_GREEN);
  },
  // ----- Version 4 -----
  angel: (r) => {
    // the guardian angel: bald head with glasses, white wings, halo
    r.ellipse(8, 1.8, 3.5, 1.2, C.GOLD);
    r.ellipse(8, 1.8, 2, 0.4, 0);
    r.ellipse(3.5, 9, 3, 3.5, C.WHITE);
    r.ellipse(12.5, 9, 3, 3.5, C.WHITE);
    r.rect(5, 10, 6, 5, C.WOOD_M);
    r.rect(8, 10, 1, 5, C.CREAM);
    r.ellipse(8, 6.5, 3.3, 3.2, C.WOOD_L);
    r.rect(5, 6, 2, 2, C.DARKER);
    r.rect(9, 6, 2, 2, C.DARKER);
    r.px(7, 6, C.DARKER);
    r.rect(7, 9, 2, 1, C.WOOD);
  },
  'evo:angel': (r) => {
    // heavenly service agreement: golden glow, bigger wings and a mini printer
    r.ellipse(8, 7, 7.5, 7, C.GOLD_L);
    r.ellipse(8, 1.8, 4.5, 1.4, C.GOLD);
    r.ellipse(8, 1.8, 2.5, 0.5, 0);
    r.ellipse(3, 8, 3, 4.5, C.WHITE);
    r.ellipse(13, 8, 3, 4.5, C.WHITE);
    r.ellipse(8, 6, 3, 3, C.WOOD_L);
    r.rect(5, 5, 2, 2, C.DARKER);
    r.rect(9, 5, 2, 2, C.DARKER);
    r.rect(4, 10, 8, 5, C.NEAR_WHITE);
    r.rect(5, 9, 6, 2, C.PAPER);
    r.rect(5, 12, 4, 1, C.TEAL);
  },
  // ----- Version 5 (the stat passives) -----
  coffeeMachine: (r) => {
    // a coffee machine with a cup under the spout
    r.rect(2, 1, 12, 7, C.DARK_GRAY);
    r.rect(3, 2, 10, 2, C.NEAR_BLACK);
    r.rect(4, 3, 3, 1, C.GREEN);
    r.rect(10, 3, 2, 1, C.RED);
    r.rect(7, 8, 2, 2, C.NEAR_BLACK);
    r.rect(5, 10, 6, 4, C.WHITE);
    r.rect(6, 11, 4, 1, C.BROWN);
    r.rect(11, 11, 2, 2, C.WHITE);
    r.rect(2, 14, 12, 1, C.DARK_GRAY);
  },
  mechKeyboard: (r) => {
    // a mechanical keyboard with a lit key
    r.rect(0, 5, 16, 9, C.NEAR_BLACK);
    for (let y = 6; y < 13; y += 3) for (let x = 1; x < 15; x += 3) r.rect(x, y, 2, 2, C.LIGHT_GRAY);
    r.rect(7, 9, 2, 2, C.GOLD);
    r.rect(4, 12, 8, 1, C.GRAY);
    r.stamp('.#. ### .#.', 6, 1, { '#': C.YELLOW });
  },
  overtime: (r) => {
    // a clock showing late hours, with a moon
    r.ellipse(7, 8.5, 6, 6, C.WHITE);
    r.ellipse(7, 8.5, 5, 5, C.NEAR_WHITE);
    r.rect(7, 4, 1, 5, C.NEAR_BLACK);
    r.rect(7, 8, 4, 1, C.NEAR_BLACK);
    r.px(7, 8, C.RED);
    r.ellipse(13.5, 3, 2.5, 2.5, C.YELLOW);
    r.ellipse(14.5, 2.5, 2, 2, 0);
  },
  standingDesk: (r) => {
    // a sit-stand desk with a monitor, raised
    r.rect(4, 1, 8, 5, C.DARKER);
    r.rect(5, 2, 6, 3, C.LIGHT_BLUE);
    r.rect(1, 7, 14, 2, C.WOOD_L);
    r.rect(1, 9, 14, 1, C.WOOD);
    r.rect(3, 10, 2, 5, C.DARK_GRAY);
    r.rect(11, 10, 2, 5, C.DARK_GRAY);
    r.stamp('.#. ###', 7, 11, { '#': C.GREEN });
  },
  firewall: (r) => {
    // a brick wall with flames on top
    r.stamp('..#...#...#.... .###.###.###... ###############', 0, 0, { '#': C.ORANGE });
    r.rect(1, 2, 14, 1, C.YELLOW);
    r.rect(0, 4, 16, 11, C.RED);
    for (let y = 4; y < 15; y += 3) {
      r.rect(0, y + 2, 16, 1, C.DARK_RED);
      for (let x = (y / 3) % 2 === 0 ? 3 : 1; x < 16; x += 5) r.rect(x, y, 1, 2, C.DARK_RED);
    }
  },
  // ----- Version 6.1 (the items) -----
  backup: (r) => {
    // an external drive with a green check mark
    r.rect(1, 4, 14, 8, C.DARK_SLATE);
    r.rect(2, 5, 12, 6, C.SLATE);
    r.rect(3, 6, 6, 1, C.LIGHT_GRAY);
    r.rect(3, 8, 4, 1, C.LIGHT_GRAY);
    r.rect(12, 6, 1, 1, C.GREEN);
    r.stamp('....# ...## #.##. ###.. .#...', 9, 10, { '#': C.GREEN });
  },
  grateful: (r) => {
    // a thank-you card with a heart
    r.rect(2, 2, 12, 12, C.PAPER);
    r.rect(2, 2, 12, 1, C.LIGHT_GRAY);
    r.stamp('.##.##. ####### ####### .#####. ..###.. ...#...', 4, 5, { '#': C.RED });
  },
  postIt: (r) => {
    // a yellow post-it block with a curled corner
    r.rect(2, 2, 12, 12, C.YELLOW);
    r.rect(2, 2, 12, 2, C.GOLD_L);
    r.rect(4, 6, 7, 1, C.OCHRE);
    r.rect(4, 8, 8, 1, C.OCHRE);
    r.rect(4, 10, 5, 1, C.OCHRE);
    r.stamp('..# .## ###', 11, 11, { '#': C.DARK_YELLOW });
  },
  bonusScheme: (r) => {
    // a bag of coins with a percent sign
    r.rect(5, 1, 6, 2, C.WOOD_M);
    r.ellipse(8, 9.5, 6, 5.5, C.WOOD);
    r.ellipse(8, 9.5, 4.5, 4, C.WOOD_L);
    r.stamp('##..# ##.#. ..#.. .#.## #..##', 5, 7, { '#': C.GOLD_M });
  },
  thermos: (r) => {
    // a steel thermos with steam
    r.rect(5, 2, 6, 2, C.DARK_GRAY);
    r.rect(4, 4, 8, 11, C.LIGHT_GRAY);
    r.rect(4, 4, 2, 11, C.WHITE);
    r.rect(5, 7, 6, 4, C.RED);
    r.rect(12, 6, 1, 5, C.DARK_GRAY);
    r.px(6, 0, C.LIGHT_GRAY);
    r.px(9, 0, C.LIGHT_GRAY);
  },
  janitor: (r) => {
    // a mop in a bucket
    r.rect(9, 0, 2, 10, C.WOOD);
    r.rect(6, 9, 8, 4, C.LIGHT_GRAY);
    r.rect(2, 8, 8, 7, C.BLUE);
    r.rect(2, 8, 8, 1, C.LIGHT_BLUE);
    r.rect(3, 9, 1, 5, C.DARK_BLUE);
    r.rect(1, 7, 10, 1, C.DARK_GRAY);
  },
  // ----- Version 6 -----
  horseshoe: (r) => {
    // a gold horseshoe, open at the bottom, with nail holes
    r.ellipse(8, 7.5, 6.5, 6.5, C.GOLD);
    r.ellipse(8, 7.5, 3.5, 3.5, 0);
    r.rect(5, 10, 6, 6, 0);
    r.rect(2, 13, 3, 2, C.GOLD_M);
    r.rect(11, 13, 3, 2, C.GOLD_M);
    for (const [x, y] of [[3, 7], [13, 7], [5, 3], [11, 3]]) r.px(x, y, C.GOLD_M);
  },
  throwingCourse: (r) => {
    // a paper plane with a dotted flight path
    r.stamp('..........## .......##### ....######## .#########.. ....######.. .......####. ..........#.', 1, 3, { '#': C.WHITE });
    r.stamp('....######.. .......###..', 1, 6, { '#': C.LIGHT_GRAY });
    for (let x = 1; x < 8; x += 2) r.px(x, 12 - Math.floor(x / 3), C.LIGHT_BLUE);
  },
  networkCert: (r) => {
    // three network nodes joined by cables, with a certificate seal
    r.rect(1, 1, 5, 4, C.GREEN);
    r.rect(10, 1, 5, 4, C.GREEN);
    r.rect(5, 10, 6, 4, C.GREEN);
    r.rect(3, 5, 1, 4, C.LIGHT_GRAY);
    r.rect(12, 5, 1, 4, C.LIGHT_GRAY);
    r.rect(3, 9, 10, 1, C.LIGHT_GRAY);
    r.ellipse(13, 12, 2.5, 2.5, C.GOLD);
  },
  openPlan: (r) => {
    // a floor plan: four desks in an open office
    r.rect(0, 1, 16, 14, C.CREAM);
    for (const [x, y] of [[2, 3], [9, 3], [2, 9], [9, 9]]) {
      r.rect(x, y, 5, 3, C.WOOD_L);
      r.rect(x + 1, y + 3, 3, 1, C.CHAIR);
    }
    r.rect(7, 1, 1, 14, C.LIGHT_GRAY);
  },
  summerIntern: (r) => {
    // a cheerful intern in a company t-shirt and a cap
    r.rect(5, 1, 6, 2, C.RED);
    r.rect(4, 3, 8, 1, C.RED);
    r.rect(5, 4, 6, 4, C.WOOD_L);
    r.px(6, 5, C.DARKER);
    r.px(9, 5, C.DARKER);
    r.rect(6, 7, 4, 1, C.DARK_RED);
    r.rect(3, 9, 10, 6, C.TEAL);
    r.rect(6, 10, 4, 2, C.WHITE);
    r.rect(1, 9, 2, 4, C.WOOD_L);
    r.rect(13, 8, 2, 3, C.WOOD_L);
  },
  package: (r) => {
    // the supplier package: cardboard box with tape and a gold sticker
    r.rect(1, 4, 14, 11, C.WOOD);
    r.rect(1, 4, 14, 3, C.WOOD_L);
    r.rect(1, 14, 14, 1, C.WOOD_M);
    r.rect(7, 4, 2, 11, C.BEIGE);
    r.rect(2, 9, 4, 3, C.WHITE);
    r.rect(3, 10, 2, 1, C.GRAY);
    r.stamp('.#. ### .#.', 10, 9, { '#': C.GOLD });
    r.rect(5, 1, 6, 3, C.ORANGE);
  },
  fired: (r) => {
    // the moving box (you are fired): cardboard box with a plant and a mug
    r.rect(4, 2, 2, 5, C.LEAF_M);
    r.ellipse(5, 2.5, 2.5, 2, C.LEAF);
    r.rect(9, 4, 4, 4, C.WHITE);
    r.rect(13, 5, 1, 2, C.WHITE);
    r.rect(1, 7, 14, 8, C.WOOD);
    r.rect(1, 7, 14, 2, C.WOOD_L);
    r.rect(6, 10, 4, 1, C.BROWN);
  },
  lock: (r) => {
    r.rect(4, 1, 8, 7, C.GRAY);
    r.rect(6, 3, 4, 5, 0);
    r.rect(2, 7, 12, 8, C.DARK_GRAY);
    r.rect(2, 7, 12, 2, C.GRAY);
    r.rect(7, 10, 2, 3, C.NEAR_BLACK);
  },
  empty: () => {},
};

/** @type {Map<string, HTMLCanvasElement>} */
const cache = new Map();

/** Gets an icon (16 × 16 canvas). Unknown ids give an empty icon. */
export function icon(id) {
  let c = cache.get(id);
  if (c) return c;
  const r = new Raster(16, 16);
  (DRAW[id] ?? DRAW.empty)(r);
  r.outline(C.OUT);
  c = toCanvas(r, PALETTE);
  cache.set(id, c);
  return c;
}

/** Icon id for a weapon the player has (combinations have their own icons). */
export function weaponIconId(w) {
  return w.evo ? 'evo:' + w.id : w.id;
}

/** An icon as a small canvas element in HTML (scaled with sharp pixels via CSS). */
export function iconElement(id, cls = 'icon') {
  const source = icon(id);
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  c.className = cls;
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  ctx.drawImage(source, 0, 0);
  return c;
}
