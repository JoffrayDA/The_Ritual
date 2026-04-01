import type { IBoardNode } from '../types/game.types'

// Copie exacte du server/src/game/board.data.ts
// Plateau fer à cheval ~50 cases, coordonnées normalisées 0.0-1.0
export const BOARD_NODES: IBoardNode[] = [
  // === BRANCHE GAUCHE (montée) ===
  { id: 0,  type: 'start', neighbors: [1],       x: 0.10, y: 0.90 },
  { id: 1,  type: 'red',   neighbors: [0, 2],    x: 0.10, y: 0.80 },
  { id: 2,  type: 'blue',  neighbors: [1, 3],    x: 0.10, y: 0.70 },
  { id: 3,  type: 'white', neighbors: [2, 4],    x: 0.10, y: 0.60 },
  { id: 4,  type: 'red',   neighbors: [3, 5],    x: 0.10, y: 0.50 },
  { id: 5,  type: 'black', neighbors: [4, 6],    x: 0.10, y: 0.40 },
  { id: 6,  type: 'blue',  neighbors: [5, 7],    x: 0.10, y: 0.30 },
  { id: 7,  type: 'duel',  neighbors: [6, 8],    x: 0.10, y: 0.20 },
  { id: 8,  type: 'red',   neighbors: [7, 9],    x: 0.15, y: 0.12 },

  // === HAUT GAUCHE → EMBRANCHEMENT 1 ===
  { id: 9,  type: 'white', neighbors: [8, 10, 20], x: 0.25, y: 0.10 },
  { id: 10, type: 'blue',  neighbors: [9, 11],   x: 0.35, y: 0.10 },
  { id: 11, type: 'red',   neighbors: [10, 12],  x: 0.45, y: 0.10 },
  { id: 12, type: 'shop',  neighbors: [11, 13],  x: 0.50, y: 0.10 },
  { id: 13, type: 'red',   neighbors: [12, 14],  x: 0.55, y: 0.10 },
  { id: 14, type: 'black', neighbors: [13, 15],  x: 0.65, y: 0.10 },
  { id: 15, type: 'blue',  neighbors: [14, 16],  x: 0.75, y: 0.10 },
  { id: 16, type: 'white', neighbors: [15, 17],  x: 0.85, y: 0.12 },

  // === BRANCHE DROITE (descente) ===
  { id: 17, type: 'red',   neighbors: [16, 18],  x: 0.90, y: 0.20 },
  { id: 18, type: 'duel',  neighbors: [17, 19],  x: 0.90, y: 0.30 },
  { id: 19, type: 'blue',  neighbors: [18, 21],  x: 0.90, y: 0.40 },

  // === RACCOURCI EMBRANCHEMENT 1 ===
  { id: 20, type: 'red',   neighbors: [9, 21],   x: 0.25, y: 0.30 },
  { id: 21, type: 'white', neighbors: [20, 19, 22], x: 0.50, y: 0.40 },

  // === EMBRANCHEMENT 2 ===
  { id: 22, type: 'black', neighbors: [21, 23],  x: 0.90, y: 0.50 },
  { id: 23, type: 'red',   neighbors: [22, 24],  x: 0.90, y: 0.60 },
  { id: 24, type: 'blue',  neighbors: [23, 25],  x: 0.90, y: 0.70 },
  { id: 25, type: 'white', neighbors: [24, 26],  x: 0.90, y: 0.80 },
  { id: 26, type: 'red',   neighbors: [25, 27],  x: 0.85, y: 0.88 },

  // === BAS DROITE → BOUCLE RETOUR ===
  { id: 27, type: 'duel',  neighbors: [26, 28],  x: 0.75, y: 0.90 },
  { id: 28, type: 'blue',  neighbors: [27, 29],  x: 0.65, y: 0.92 },
  { id: 29, type: 'black', neighbors: [28, 30],  x: 0.55, y: 0.92 },
  { id: 30, type: 'shop',  neighbors: [29, 31],  x: 0.50, y: 0.92 },
  { id: 31, type: 'red',   neighbors: [30, 32],  x: 0.45, y: 0.92 },
  { id: 32, type: 'white', neighbors: [31, 33],  x: 0.35, y: 0.92 },
  { id: 33, type: 'blue',  neighbors: [32, 34],  x: 0.25, y: 0.92 },
  { id: 34, type: 'red',   neighbors: [33, 35],  x: 0.15, y: 0.90 },

  // === RETOUR CENTRE ===
  { id: 35, type: 'black', neighbors: [34, 36],  x: 0.15, y: 0.80 },
  { id: 36, type: 'red',   neighbors: [35, 37],  x: 0.20, y: 0.70 },
  { id: 37, type: 'blue',  neighbors: [36, 38],  x: 0.25, y: 0.60 },
  { id: 38, type: 'white', neighbors: [37, 39],  x: 0.30, y: 0.55 },
  { id: 39, type: 'duel',  neighbors: [38, 40],  x: 0.35, y: 0.50 },
  { id: 40, type: 'red',   neighbors: [39, 41],  x: 0.40, y: 0.50 },
  { id: 41, type: 'black', neighbors: [40, 42],  x: 0.50, y: 0.55 },
  { id: 42, type: 'blue',  neighbors: [41, 43],  x: 0.55, y: 0.60 },
  { id: 43, type: 'white', neighbors: [42, 44],  x: 0.60, y: 0.65 },
  { id: 44, type: 'red',   neighbors: [43, 45],  x: 0.65, y: 0.70 },
  { id: 45, type: 'duel',  neighbors: [44, 46],  x: 0.70, y: 0.75 },
  { id: 46, type: 'blue',  neighbors: [45, 47],  x: 0.75, y: 0.78 },
  { id: 47, type: 'red',   neighbors: [46, 48],  x: 0.80, y: 0.80 },
  { id: 48, type: 'shop',  neighbors: [47, 49],  x: 0.80, y: 0.85 },
  { id: 49, type: 'black', neighbors: [48, 0],   x: 0.80, y: 0.90 },
]
