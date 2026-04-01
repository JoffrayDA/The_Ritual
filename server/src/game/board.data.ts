import type { IBoardNode } from '../types/game.types'

// Plateau en U : gauche (montée) → haut (droite) → droite (descente) → bas (gauche) → retour départ
// + raccourci en diagonale au centre
// 29 cases, espacement uniforme ~0.12 unités normalisées
export const BOARD_NODES: IBoardNode[] = [

  // === GAUCHE — montée ===
  { id: 0,  type: 'start', neighbors: [23, 1],      x: 0.12, y: 0.90 },
  { id: 1,  type: 'red',   neighbors: [0,  2],      x: 0.12, y: 0.78 },
  { id: 2,  type: 'blue',  neighbors: [1,  3, 24],  x: 0.12, y: 0.66 }, // FORK → raccourci 24
  { id: 3,  type: 'white', neighbors: [2,  4],      x: 0.12, y: 0.54 },
  { id: 4,  type: 'black', neighbors: [3,  5],      x: 0.12, y: 0.42 },
  { id: 5,  type: 'red',   neighbors: [4,  6],      x: 0.12, y: 0.30 },
  { id: 6,  type: 'duel',  neighbors: [5,  7],      x: 0.12, y: 0.18 },

  // === HAUT — gauche vers droite ===
  { id: 7,  type: 'red',   neighbors: [6,  8],      x: 0.26, y: 0.10 },
  { id: 8,  type: 'white', neighbors: [7,  9],      x: 0.40, y: 0.10 },
  { id: 9,  type: 'shop',  neighbors: [8,  10],     x: 0.54, y: 0.10 },
  { id: 10, type: 'blue',  neighbors: [9,  11],     x: 0.68, y: 0.10 },
  { id: 11, type: 'black', neighbors: [10, 12],     x: 0.80, y: 0.10 },
  { id: 12, type: 'red',   neighbors: [11, 13],     x: 0.88, y: 0.18 },

  // === DROITE — descente ===
  { id: 13, type: 'duel',  neighbors: [12, 14],     x: 0.88, y: 0.30 },
  { id: 14, type: 'white', neighbors: [13, 28, 15], x: 0.88, y: 0.42 }, // MERGE ← raccourci 28
  { id: 15, type: 'blue',  neighbors: [14, 16],     x: 0.88, y: 0.54 },
  { id: 16, type: 'black', neighbors: [15, 17],     x: 0.88, y: 0.66 },
  { id: 17, type: 'red',   neighbors: [16, 18],     x: 0.88, y: 0.78 },
  { id: 18, type: 'duel',  neighbors: [17, 19],     x: 0.88, y: 0.88 },

  // === BAS — droite vers gauche ===
  { id: 19, type: 'white', neighbors: [18, 20],     x: 0.74, y: 0.93 },
  { id: 20, type: 'shop',  neighbors: [19, 21],     x: 0.60, y: 0.93 },
  { id: 21, type: 'red',   neighbors: [20, 22],     x: 0.46, y: 0.93 },
  { id: 22, type: 'blue',  neighbors: [21, 23],     x: 0.32, y: 0.93 },
  { id: 23, type: 'black', neighbors: [22, 0],      x: 0.20, y: 0.93 },

  // === RACCOURCI — diagonal centre (node 2 → node 14) ===
  { id: 24, type: 'white', neighbors: [2,  25],     x: 0.26, y: 0.60 },
  { id: 25, type: 'red',   neighbors: [24, 26],     x: 0.40, y: 0.54 },
  { id: 26, type: 'duel',  neighbors: [25, 27],     x: 0.54, y: 0.50 },
  { id: 27, type: 'shop',  neighbors: [26, 28],     x: 0.68, y: 0.50 },
  { id: 28, type: 'blue',  neighbors: [27, 14],     x: 0.80, y: 0.48 },
]
