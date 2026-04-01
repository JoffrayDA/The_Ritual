---
title: 'Tournée Générale — V1 MVP Full Implementation'
slug: 'tournee-generale-v1-mvp'
created: '2026-03-30'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - React 18 + Vite + TypeScript (client)
  - Pixi.js v7 (canvas rendering — plateau + mini-jeux)
  - Tailwind CSS (UI)
  - Socket.io 4 client + server (real-time)
  - Node.js 20 + Express (backend stateful)
  - React Router (3 routes)
  - Monorepo (client/ + server/ packages)
files_to_modify:
  # CLIENT
  - client/src/main.tsx
  - client/src/App.tsx
  - client/src/types/game.types.ts
  - client/src/types/socket.types.ts
  - client/src/types/minigame.types.ts
  - client/src/hooks/useSocket.ts
  - client/src/hooks/useGameState.ts
  - client/src/components/Home.tsx
  - client/src/components/Lobby.tsx
  - client/src/components/GameOver.tsx
  - client/src/components/ui/Toast.tsx
  - client/src/components/ui/Spinner.tsx
  - client/src/components/hud/PlayerList.tsx
  - client/src/components/hud/MoneyBar.tsx
  - client/src/game/PixiApp.tsx
  - client/src/game/BoardRenderer.ts
  - client/src/game/PlayerSprite.ts
  - client/src/game/DiceAnimation.ts
  - client/src/game/board.data.ts
  - client/src/minigames/MinigameRouter.tsx
  - client/src/minigames/Sequence.tsx
  - client/src/minigames/TurboTap.tsx
  - client/src/minigames/StopChrono.tsx
  - client/src/minigames/TirDeGun.tsx
  - client/src/minigames/ReactionPure.tsx
  - client/src/minigames/CibleMouvante.tsx
  - client/src/minigames/Equilibre.tsx
  - client/src/minigames/PeintureBattle.tsx
  - client/src/minigames/Labyrinthe.tsx
  # SERVER
  - server/src/index.ts
  - server/src/types/game.types.ts
  - server/src/types/socket.types.ts
  - server/src/game/GameState.ts
  - server/src/game/StateMachine.ts
  - server/src/game/RoomManager.ts
  - server/src/game/board.data.ts
  - server/src/handlers/roomHandler.ts
  - server/src/handlers/gameHandler.ts
  - server/src/handlers/actionHandler.ts
  - server/src/handlers/minigameHandler.ts
  - server/src/minigames/MinigameCoordinator.ts
  - server/src/minigames/sequence.logic.ts
  - server/src/minigames/turboTap.logic.ts
  - server/src/minigames/stopChrono.logic.ts
  - server/src/minigames/tirDeGun.logic.ts
  - server/src/minigames/reactionPure.logic.ts
  - server/src/minigames/cibleMouvante.logic.ts
  - server/src/minigames/equilibre.logic.ts
  - server/src/minigames/peintureBattle.logic.ts
  - server/src/minigames/labyrinthe.logic.ts
  - server/src/utils/roomCode.ts
  - server/src/utils/timer.ts
code_patterns:
  - server-authoritative state (never modify GameState client-side)
  - Socket.io events only — no REST API at runtime
  - broadcast full GameState after every mutation
  - React (UI) / Pixi.js (rendering) strict separation via PixiApp.tsx
  - mini-games isolated behind MinigameRouter with dynamic import()
  - Socket.io event naming: kebab-case for all events
  - TypeScript: PascalCase components, camelCase hooks/utils, IPrefix interfaces
  - loading states via isLoading prop on components awaiting server
test_patterns:
  - V1: manual playtesting only (no automated unit tests)
  - target: 0 crashes across 10 test sessions
  - Socket.io latency target: <200ms on 4G/WiFi
---

# Tech-Spec: Tournée Générale — V1 MVP Full Implementation

**Created:** 2026-03-30

## Overview

### Problem Statement

Projet greenfield complet. Aucun code existant. Il faut construire de zéro une web app mobile multijoueur synchronisée en temps réel — jeu de plateau style Mario Party, 4 à 8 joueurs chacun sur son propre téléphone, avec 9 mini-jeux compétitifs, un système d'économie (monnaie + Pintes), et une session de ~1h. 32 Functional Requirements définis dans le PRD.

### Solution

Monorepo `tournee-generale/` avec deux packages : `client/` (React + Vite + TypeScript + Pixi.js) et `server/` (Node.js + Express + Socket.io). État de jeu autoritaire côté serveur (GameState en mémoire). Rendu plateau via Pixi.js Canvas. Temps réel via Socket.io WebSocket. Hébergement Vercel (front) + Railway (back).

### Scope

**In Scope (V1 MVP):**
- Setup monorepo + infra de base (Vite, TypeScript, Socket.io, Express)
- Système de session : création de salle, code 4 lettres, lobby, choix avatar
- StateMachine serveur : `lobby → playing → minigame → results → game-over`
- Plateau de jeu Pixi.js : ~50 cases, graphe de nœuds hard-codé, déplacement animé
- 5 types de cases : Rouge, Bleue, Blanche, Noire, Duel
- Système dé : animation locale, résultat serveur autoritaire
- Système tours : rotation automatique, skip après 60s timeout
- Reconnexion automatique (Socket.io reconnect + état serveur autoritaire)
- Économie : monnaie courante + Pintes (victoire)
- 9 mini-jeux complets : Séquence, Turbo Tap, Stop Chrono, Tir de gun, Réaction pure, Cible mouvante, Équilibre (gyroscope), Peinture battle, Labyrinthe
- Fin de partie après 12 rounds, écran de victoire
- UI React : Home, Lobby, HUD, GameOver

**Out of Scope (Phase 2/3):**
- Boutique et objets (offensifs, défensifs, utilitaires)
- Cases spéciales supplémentaires (Enchères, Jugement, Roue, Redistribution, Téléportation)
- Avatars animés / polish visuel avancé
- Maps thématiques (Western, Pirates, Galaxy)
- Leaderboard partagé / partage de résultats
- Timer optionnel de partie
- Base de données / persistance des sessions

## Context for Development

### Codebase Patterns

- **Greenfield** : aucun code existant, pas de patterns à respecter, partir de zéro
- **Server-authoritative** : le client ne modifie JAMAIS le GameState directement — toujours via événements Socket.io
- **Animations locales** : les animations (dé, déplacement) tournent côté client sans attendre le serveur, l'état est ensuite validé par le serveur
- **Lazy loading** : les mini-jeux sont chargés via `dynamic import()` — MinigameRouter déclenche l'import au moment du lancement
- **Portrait uniquement** : `orientation: portrait` en CSS, aucune logique landscape
- **Pas de REST API** : toute la communication runtime passe par Socket.io uniquement

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `_bmad-output/planning-artifacts/prd.md` | 32 FRs — source de vérité fonctionnelle |
| `_bmad-output/planning-artifacts/architecture.md` | Structure complète, décisions techniques, patterns, mapping FRs→fichiers |
| `_bmad/bmm/config.yaml` | Config projet (user, langue, paths) |

### Mapping FRs → Fichiers Clés

| FRs | Fichiers |
|---|---|
| FR1-5 — Session | `Home.tsx`, `Lobby.tsx`, `roomHandler.ts`, `RoomManager.ts` |
| FR6-7 — Reconnexion/Timeout | `useSocket.ts`, `roomHandler.ts`, `timer.ts` |
| FR8-10 — Plateau | `BoardRenderer.ts`, `PlayerSprite.ts`, `gameHandler.ts` |
| FR11-13 — State machine | `StateMachine.ts`, `actionHandler.ts` |
| FR14-18 — Cases | `actionHandler.ts` |
| FR19-25 — Mini-jeux | `MinigameRouter.tsx`, `minigameHandler.ts`, `MinigameCoordinator.ts`, 9 fichiers mini-jeux |
| FR26-30 — Économie | `MoneyBar.tsx`, `PlayerList.tsx`, `GameState.ts` |
| FR31-32 — Fin partie | `StateMachine.ts`, `GameOver.tsx` |

### Data Flow

```
User tap → socket.emit() → Handler → StateMachine.update(GameState)
         → io.to(room).emit('game-state-updated', newState)
         → useGameState reçoit → React re-render + Pixi.js update
```

### Technical Decisions

| Décision | Choix | Raison |
|---|---|---|
| Rendu plateau | Pixi.js Canvas | 60fps, pixel art natif, animations fluides |
| Temps réel | Socket.io | WebSocket + fallback polling, reconnexion intégrée |
| État | Serveur autoritaire en mémoire | Pas de BDD, sessions éphémères, simplicité |
| Hosting | Vercel + Railway free tier | Budget zéro |
| Carte | Graphe hard-codé | Dev solo, pas de génération procédurale |
| Duel target | Tirage au sort serveur | Animation dé côté client avec avatars joueurs |
| Mini-jeux | Lazy loading dynamique | Performance — pas tout charger au démarrage |
| Carte Peinture battle | S'adapte au nombre de joueurs | Map size ∝ nombre de joueurs |
| Labyrinthe | Sortie commune au centre, fog of war | Mechanique de jeu validée |

## Implementation Plan

### Stories (ordre d'implémentation)

---

#### STORY 01 — Monorepo Setup & Project Infra

**Objectif :** Initialiser la structure complète du monorepo, configurer tous les outils de build, et vérifier que client et serveur démarrent.

- [ ] Task 1.1: Créer la structure monorepo racine
  - File: `tournee-generale/package.json`
  - Action: Créer le package.json racine avec `"workspaces": ["client", "server"]`, scripts `dev` (lance client + server en parallèle), `build`
  - Notes: Utiliser `npm workspaces` natif, pas de Turborepo ni Nx — trop complexe pour dev solo

- [ ] Task 1.2: Initialiser le client React + Vite + TypeScript
  - File: `client/package.json`, `client/vite.config.ts`, `client/tsconfig.json`, `client/index.html`
  - Action: `npm create vite@latest client -- --template react-ts` puis installer `pixi.js@7 socket.io-client react-router-dom`
  - Notes: **Épingler `pixi.js@7` impérativement** — `pixi.js@8` a une API incompatible (Application async). Supprimer le boilerplate Vite (App.css, assets/react.svg, etc.). Désactiver React StrictMode dans `main.tsx` (retirer `<React.StrictMode>`) pour éviter la double-initialisation de Pixi.js en dev.

- [ ] Task 1.3: Configurer Tailwind CSS côté client
  - File: `client/tailwind.config.js`, `client/src/index.css`
  - Action: Installer `tailwindcss postcss autoprefixer`, initialiser config, ajouter directives `@tailwind` dans index.css
  - Notes: Config minimaliste — pas de plugin supplémentaire en V1

- [ ] Task 1.4: Initialiser le serveur Node.js + TypeScript
  - File: `server/package.json`, `server/tsconfig.json`, `server/nodemon.json`
  - Action: `npm init -y`, installer `express socket.io cors`, dev deps `typescript @types/node @types/express ts-node nodemon`
  - Notes: `nodemon.json` watch sur `src/**/*.ts`, exec `ts-node src/index.ts`

- [ ] Task 1.5: Créer les fichiers d'environnement
  - File: `client/.env.example`, `server/.env.example`, `.gitignore`
  - Action: `client/.env.example` → `VITE_SERVER_URL=http://localhost:3001` ; `server/.env.example` → `PORT=3001 CLIENT_URL=http://localhost:5173`
  - Notes: Ne jamais committer les vrais `.env`

- [ ] Task 1.6: Créer le serveur Express minimal + Socket.io
  - File: `server/src/index.ts`
  - Action: Express app + `http.createServer` + `new Server(httpServer, { cors: { origin: process.env.CLIENT_URL } })` — écoute sur PORT — `io.on('connection', socket => console.log('connected:', socket.id))`
  - Notes: CORS strict — autoriser uniquement CLIENT_URL

- [ ] Task 1.7: Créer le client React minimal connecté au serveur
  - File: `client/src/main.tsx`, `client/src/App.tsx`
  - Action: App.tsx → affiche "Tournée Générale" + status socket (connected/disconnected). Connexion socket dans useEffect.
  - Notes: Vérifier que le client se connecte au serveur en dev

**Critère de validation story :** `npm run dev` depuis la racine lance client (port 5173) + server (port 3001). Le navigateur affiche "Tournée Générale — connected". Aucune erreur TypeScript.

---

#### STORY 02 — Types Partagés & GameState Core

**Objectif :** Définir tous les types TypeScript utilisés sur client et serveur. Implémenter GameState et RoomManager côté serveur.

- [ ] Task 2.1: Créer les types de jeu partagés (client)
  - File: `client/src/types/game.types.ts`
  - Action: Définir `IPlayer { id, name, avatar, position: number, prevNodeId: number | null, money: number, pintes: number, isConnected: boolean }`, `IBoardNode { id: number, type: 'red'|'blue'|'white'|'black'|'duel'|'shop'|'start', neighbors: number[], x: number, y: number }`, `IBoardState { nodes: IBoardNode[] }`, `IGameState { roomCode: string, phase: 'lobby'|'playing'|'minigame'|'results'|'game-over', players: IPlayer[], currentPlayerIndex: number, round: number, maxRounds: 12, activeMinigame?: MinigameName, actionResolved: boolean }`
  - Notes: `IPlayer.prevNodeId` est essentiel pour la détection de fork (Task 6.1). `IGameState.actionResolved` est un flag booléen remis à `false` à chaque début de tour — empêche les doubles `movement-complete`.
  - Notes: Copier les mêmes types dans `server/src/types/game.types.ts` — pas de package partagé en V1

- [ ] Task 2.2: Créer les types d'events Socket.io (client + server)
  - File: `client/src/types/socket.types.ts`, `server/src/types/socket.types.ts`
  - Action: Définir interfaces pour tous les events C→S (`CreateRoomPayload`, `JoinRoomPayload`, `RollDicePayload`, `ResolveActionPayload`, `SubmitMinigameResultPayload`) et S→C (`GameStateUpdatedPayload`, `ErrorPayload`, `MinigameStartedPayload`, `DuelTargetSelectedPayload`)
  - Notes: Utiliser `ServerToClientEvents` et `ClientToServerEvents` interfaces pour typer Socket.io

- [ ] Task 2.3: Créer les types mini-jeux
  - File: `client/src/types/minigame.types.ts`, `server/src/types/minigame.types.ts`
  - Action: `IMinigameResult { playerId: string, score: number, rank?: number }`, `IMinigameProps { players: IPlayer[], onComplete: (results: IMinigameResult[]) => void }`, `MinigameName` union type canonique : `'sequence' | 'turbo-tap' | 'stop-chrono' | 'tir-de-gun' | 'reaction-pure' | 'cible-mouvante' | 'equilibre' | 'peinture-battle' | 'labyrinthe'`
  - Notes: Ces noms kebab-case sont la référence pour les events Socket.io ET le dynamic import map de MinigameRouter. Ne jamais utiliser les noms PascalCase pour les events.

- [ ] Task 2.4: Implémenter GameState.ts (serveur)
  - File: `server/src/game/GameState.ts`
  - Action: Fonction `createGameState(roomCode: string): IGameState` → retourne l'état initial (phase: 'lobby', players: [], round: 0, maxRounds: 12, board initialisé). Fonctions de mutation : `addPlayer`, `removePlayer`, `updatePlayerPosition`, `updatePlayerMoney`, `updatePlayerPintes`, `advanceTurn`, `setPhase`
  - Notes: Chaque mutation retourne le nouvel état (immutable pattern). Ne jamais muter directement.

- [ ] Task 2.5: Implémenter RoomManager.ts (serveur)
  - File: `server/src/game/RoomManager.ts`
  - Action: Classe `RoomManager` avec `Map<string, IGameState>`. Méthodes: `createRoom(): string` (génère code + appelle createGameState), `getRoom(code)`, `deleteRoom(code)`, `roomExists(code)`. Singleton exporté.
  - Notes: Nettoyage automatique de la room 5min après `game-over`

- [ ] Task 2.6: Implémenter roomCode.ts
  - File: `server/src/utils/roomCode.ts`
  - Action: Fonction `generateRoomCode(): string` → 4 lettres majuscules aléatoires (A-Z, pas de lettres ambiguës O/I). Vérifier unicité contre les rooms existantes.

**Critère de validation story :** TypeScript compile sans erreur `tsc --noEmit` sur client et server. Tous les types sont cohérents entre client et server.

---

#### STORY 03 — Session Management (FR1-7)

**Objectif :** Implémenter la création/rejoindre de salle, le lobby temps réel, la reconnexion automatique et le skip de tour.

- [ ] Task 3.1: Implémenter roomHandler.ts (serveur)
  - File: `server/src/handlers/roomHandler.ts`
  - Action: Handler pour events: `create-room` → crée room, ajoute host, **`socket.join(roomCode)`**, émet `game-state-updated` ; `join-room` → valide code, ajoute joueur, **`socket.join(roomCode)`**, broadcast `game-state-updated` ; `select-avatar` → met à jour avatar du joueur, broadcast ; `start-game` → valide min 2 joueurs + hôte uniquement, passe phase à 'playing', broadcast ; `disconnect` → marque joueur `isConnected: false`, broadcast — ne pas supprimer le joueur
  - Notes: **`socket.join(roomCode)` est obligatoire** dans `create-room` ET `join-room` — sans ça, `io.to(roomCode).emit()` n'atteint personne. Toujours vérifier que socketId appartient bien à la room avant toute action.

- [ ] Task 3.2: Implémenter reconnexion automatique (serveur)
  - File: `server/src/handlers/roomHandler.ts`
  - Action: Event `reconnect-to-room { roomCode, playerName }` → chercher le joueur par nom ET `isConnected: false` dans la room. **Si plusieurs joueurs ont le même nom** → refuser la reconnexion et émettre `error { code: 'NAME_CONFLICT', message: 'Deux joueurs ont le même nom, reconnexion impossible' }`. Si trouvé unique → `socket.join(roomCode)`, réassocier socketId, marquer `isConnected: true`, émettre état complet au socket reconnecté.
  - Notes: Prévention collision noms : dans `join-room`, rejeter si un joueur avec ce nom existe déjà dans la room (`isConnected: true` ou `false`). Ajouter cette validation dans Task 3.1.

- [ ] Task 3.3: Implémenter timer.ts (skip de tour)
  - File: `server/src/utils/timer.ts`
  - Action: Classe `TurnTimer` — `start(roomCode, callback, delayMs = 60000)`, `cancel(roomCode)`. Utilise `setTimeout`, annule si le joueur joue avant l'expiration. Enregistrer les timers actifs dans une Map.

- [ ] Task 3.4: Implémenter useSocket.ts (client)
  - File: `client/src/hooks/useSocket.ts`
  - Action: Hook qui crée et expose le socket Socket.io. Gère `connect`, `disconnect`, `reconnect` events. Sur reconnexion automatique, émet `reconnect-to-room` avec roomCode + playerName récupérés depuis sessionStorage. Expose `socket`, `isConnected`.
  - Notes: Stocker roomCode + playerName dans `sessionStorage` pour la reconnexion — PAS dans localStorage

- [ ] Task 3.5: Implémenter useGameState.ts (client)
  - File: `client/src/hooks/useGameState.ts`
  - Action: Hook qui écoute `game-state-updated` et met à jour le state React local. Expose `gameState`, `myPlayer` (joueur courant basé sur socketId). Initialise à `null`.

**Critère de validation story :**
- AC 3.1: Given un navigateur ouvert, when l'hôte clique "Créer", then un code 4 lettres s'affiche et la room existe côté serveur
- AC 3.2: Given un code valide, when un joueur le saisit et confirme, then il apparaît dans le lobby de tous les joueurs
- AC 3.3: Given un joueur connecté, when il perd le réseau 10s et revient, then il réapparaît dans la partie avec son état intact
- AC 3.4: Given un joueur absent 60s pendant son tour, when le timer expire, then son tour est passé et le joueur suivant est notifié

---

#### STORY 04 — Home & Lobby UI (FR1-5)

**Objectif :** Créer les écrans d'accueil et de lobby avec choix d'avatar et gestion des états de chargement.

- [ ] Task 4.1: Créer Home.tsx
  - File: `client/src/components/Home.tsx`
  - Action: Deux modes : "Créer une salle" (input nom + bouton Créer) et "Rejoindre" (input nom + input code 4 lettres + bouton Rejoindre). Sur submit → émet `create-room` ou `join-room` → redirect vers `/lobby/:code`. Afficher spinner pendant attente serveur.
  - Notes: Validation : nom non vide, code 4 lettres majuscules. Auto-uppercase sur le champ code.

- [ ] Task 4.2: Créer Lobby.tsx
  - File: `client/src/components/Lobby.tsx`
  - Action: Affiche liste des joueurs avec avatars (mis à jour temps réel via gameState), sélection d'avatar (grille d'emojis animaux : 🐸 grenouille, 🦊 renard, 🦆 canard, 🦝 raton laveur, 🐙 axolotl, 🐻 ours, 🐯 tigre, 🐼 panda). Bouton "Lancer" visible uniquement pour l'hôte + disabled si < 2 joueurs. Afficher code de salle en grand.
  - Notes: Hôte = premier joueur dans `gameState.players`

- [ ] Task 4.3: Créer Toast.tsx et Spinner.tsx
  - File: `client/src/components/ui/Toast.tsx`, `client/src/components/ui/Spinner.tsx`
  - Action: Toast → notification non-bloquante en bas d'écran, auto-dismiss après 3s, couleurs error/success. Spinner → cercle animé CSS.

- [ ] Task 4.4: Configurer le routing React
  - File: `client/src/App.tsx`
  - Action: React Router avec 3 routes : `/` → Home, `/lobby/:code` → Lobby, `/game/:code` → GameBoard (placeholder). Guards : redirect `/` si roomCode inconnu dans les routes lobby/game.

**Critère de validation story :**
- AC 4.1: Given la page d'accueil, when l'hôte entre son nom et clique Créer, then il est redirigé vers /lobby/CODE en < 1s
- AC 4.2: Given le lobby, when chaque joueur sélectionne un avatar, then tous les écrans se mettent à jour instantanément
- AC 4.3: Given 2+ joueurs dans le lobby, when l'hôte clique Lancer, then tous les joueurs sont redirigés vers /game/CODE

---

#### STORY 05 — Plateau de Jeu Pixi.js — Fondation (FR8)

**Objectif :** Implémenter le graphe de nœuds de la carte, l'initialisation Pixi.js, et le rendu statique du plateau.

- [ ] Task 5.1: Créer board.data.ts (client + server)
  - File: `client/src/game/board.data.ts`, `server/src/game/board.data.ts`
  - Action: Définir le graphe de ~50 nœuds. Structure : tableau `IBoardNode[]` avec `id`, `type`, `neighbors: number[]`, `x: number`, `y: number`. **Coordonnées normalisées 0.0–1.0** (pas en pixels absolus) — le BoardRenderer les multiplie par la taille réelle du canvas au moment du rendu, ce qui garantit la compatibilité avec tous les écrans mobiles. Forme : fer à cheval / île avec 2-3 embranchements. Distribution cases : 40% rouge, 25% bleue, 15% blanche, 10% noire, 5% duel, 5% boutique (ignorée en V1, `type: 'shop'` présent mais sans action). Une case `start` (id: 0). **Pour les embranchements** : les nœuds de carrefour ont >2 voisins — le `StateMachine` détecte un fork en excluant le nœud d'où vient le joueur (`prevNodeId`) des `neighbors`. `IBoardNode` n'a pas besoin de `prevNodeId` — c'est le `GameState` qui track `IPlayer.prevNodeId: number`.
  - Notes: Copier fichier identique dans client + server.

- [ ] Task 5.2: Créer PixiApp.tsx (conteneur React → Pixi)
  - File: `client/src/game/PixiApp.tsx`
  - Action: Composant React qui crée un `<canvas>` ref, initialise `PIXI.Application` au mount, expose l'app via context ou prop. Détruit l'app au unmount. Taille : 100% viewport width, height calculée pour portrait.
  - Notes: `PIXI.Application` est créé UNE seule fois. Utiliser un `ref` guard : `if (pixiAppRef.current) return;` au début du `useEffect` pour éviter toute double-initialisation. Ne pas recréer à chaque re-render React. React StrictMode est déjà désactivé (Task 1.2) mais le guard est une sécurité supplémentaire.

- [ ] Task 5.3: Créer BoardRenderer.ts
  - File: `client/src/game/BoardRenderer.ts`
  - Action: Classe `BoardRenderer(app: PIXI.Application)`. Méthode `render(boardData: IBoardNode[])` — dessine chaque nœud comme un cercle coloré selon son type (rouge, bleu, blanc, noir, duel=violet). Dessine les connexions entre nœuds voisins (lignes grises). Méthode `update(playerPositions: Record<string, number>)` — placeholder pour story 06.
  - Notes: Couleurs : rouge=#FF4444, bleu=#4488FF, blanc=#FFFFFF, noir=#333333, duel=#AA44FF

- [ ] Task 5.4: Intégrer le plateau dans la route /game
  - File: `client/src/App.tsx` (route /game/:code) → créer `client/src/components/GameBoard.tsx`
  - Action: GameBoard.tsx monte PixiApp + BoardRenderer. Écoute `game-state-updated` via useGameState. Affiche HUD (placeholder).

**Critère de validation story :**
- AC 5.1: Given la route /game, when la page charge, then le plateau Pixi.js s'affiche avec ~50 cases colorées et les connexions
- AC 5.2: Given un viewport mobile 390px, when le plateau est rendu, then toutes les cases sont visibles sans scroll

---

#### STORY 06 — Tour de Jeu & Dé (FR9-13)

**Objectif :** Implémenter le lancer de dé, le déplacement du personnage, la détection de case, et la rotation automatique des tours.

- [ ] Task 6.1: Implémenter StateMachine.ts — phase playing (serveur)
  - File: `server/src/game/StateMachine.ts`
  - Action: Classe `StateMachine`. Méthode `rollDice(gameState, playerId): { newState, diceResult, landedNode }` — valide que c'est le tour du joueur, tire dé 1-6, calcule nouvelle position (en excluant `player.prevNodeId` des voisins pour éviter le demi-tour), retourne nouvel état avec `player.prevNodeId` mis à jour. Méthode `advanceTurn(gameState): newState` — ordre d'opération précis : (1) incrémenter `currentPlayerIndex`, (2) si tous les joueurs ont joué ce round → incrémenter `round`, (3) si `round > maxRounds` (12) → `setPhase('game-over')`, sinon → `setPhase('minigame')`. **`round` est incrémenté AVANT de déclencher le mini-jeu** — le mini-jeu du round 12 se joue avec `round === 12`, et c'est après ses résultats que `advanceTurn` passe en `game-over`.
  - Notes: Si fork (nœud avec >1 voisins non-retour), `rollDice` s'arrête au carrefour et émet `choose-direction` — `advanceTurn` n'est pas encore appelé. `advanceTurn` est appelé uniquement après résolution complète de l'action de case.

- [ ] Task 6.2: Implémenter gameHandler.ts (serveur)
  - File: `server/src/handlers/gameHandler.ts`
  - Action: Event `roll-dice { roomCode }` → StateMachine.rollDice() → broadcast `game-state-updated` + émettre `dice-rolled { result, targetNodeId }` pour animation client. Event `choose-direction { roomCode, nodeId }` → valide choix, avance le joueur, broadcast.
  - Notes: TurnTimer.start() après chaque début de tour — TurnTimer.cancel() quand `roll-dice` reçu

- [ ] Task 6.3: Créer DiceAnimation.ts (client)
  - File: `client/src/game/DiceAnimation.ts`
  - Action: Classe `DiceAnimation(app: PIXI.Application)`. Méthode `play(result: number): Promise<void>` — anime un dé Pixi.js (sprite rectangulaire avec nombre) qui "vole en l'air" et retombe vers le bas de l'écran, révèle le résultat après 1.5s. Résout la promesse quand animation terminée.

- [ ] Task 6.4: Créer PlayerSprite.ts (client)
  - File: `client/src/game/PlayerSprite.ts`
  - Action: Classe `PlayerSprite(app: PIXI.Application, player: IPlayer)`. Affiche l'emoji avatar du joueur dans un cercle coloré (couleur unique par joueur) sur le plateau. Méthode `moveTo(targetNode: IBoardNode): Promise<void>` — animation de déplacement case par case (tween position x/y, 0.3s par case).

- [ ] Task 6.5: Ajouter bouton "Lancer le dé" dans GameBoard.tsx
  - File: `client/src/components/GameBoard.tsx`
  - Action: Affiche bouton "🎲 Lancer" uniquement si `gameState.players[gameState.currentPlayerIndex].id === myPlayer.id`. Sur tap → émet `roll-dice`, déclenche DiceAnimation avec le résultat reçu, puis PlayerSprite.moveTo().
  - Notes: Désactiver le bouton pendant l'animation pour éviter double-tap

**Critère de validation story :**
- AC 6.1: Given mon tour, when je tape "Lancer", then l'animation de dé s'affiche et mon personnage se déplace du bon nombre de cases
- AC 6.2: Given le tour d'un autre joueur, when il lance, then je vois son personnage se déplacer sur mon écran
- AC 6.3: Given un embranchement, when mon personnage y arrive, then un choix de direction m'est proposé
- AC 6.4: Given que tous les joueurs ont joué, when le dernier termine, then le round s'incrémente et un mini-jeu se déclenche

---

#### STORY 07 — Résolution des Cases (FR14-18)

**Objectif :** Implémenter les 5 types de cases et leur logique de résolution côté serveur et client.

- [ ] Task 7.1: Implémenter actionHandler.ts (serveur)
  - File: `server/src/handlers/actionHandler.ts`
  - Action: **Le serveur déclenche la résolution de case automatiquement** après avoir reçu `movement-complete { roomCode }` du client (émis par le client quand l'animation PlayerSprite.moveTo() est terminée). Ce handshake évite que le serveur résolve une case avant que le joueur voie l'animation. Selon `node.type` : `red` → broadcast `case-resolved { type: 'red', playerId }` — pas de mutation GameState ; `blue` → émet `choose-target { roomCode, sourcePlayerId }` et attend `target-chosen` ; `white` → émet `choose-white-action` → attend `white-action-chosen: 'money'|'drink'` ; `black` → émet `choose-black-action` → attend `black-action-chosen: 'money'|'drink'` ; `duel` → émet `duel-started`, tire la cible au sort, broadcast `duel-target-selected { targetPlayerId }` ; `shop` → émet `shop-opened { playerId }`, attend `buy-pinte` (voir Story 08 Task 8.4).
  - Notes: `movement-complete` est émis par le client une seule fois par tour (désactiver après émission). Les cases "gorgées" ne modifient PAS le GameState. Seule la monnaie est trackée.

- [ ] Task 7.2: Logique économique des cases dans GameState.ts
  - File: `server/src/game/GameState.ts`
  - Action: Case blanche (choix money) → `updatePlayerMoney(playerId, +15)` ; case noire (choix money) → `updatePlayerMoney(playerId, -15)` ; victoire mini-jeu → `updatePlayerMoney(winner, +30)`. Mini-jeu perte → rien (juste boire).

- [ ] Task 7.3: Affichage résolution de case côté client
  - File: `client/src/components/GameBoard.tsx`
  - Action: Écouter events de résolution de case et afficher une modal/overlay : case rouge → "Tu bois 3 gorgées 🍺" + bouton OK ; case bleue → sélecteur de joueur cible ; case blanche/noire → deux boutons choix ; duel → animation dé avec avatars (voir Task 7.4).
  - Notes: Modal bloque l'interface jusqu'à résolution

- [ ] Task 7.4: Animation Duel — tirage de cible
  - File: `client/src/game/DiceAnimation.ts`
  - Action: Ajouter méthode `playDuelDraw(players: IPlayer[], targetId: string): Promise<void>` — affiche les avatars de tous les joueurs en cercle, anime un pointeur tournant qui "ralentit" et s'arrête sur le joueur cible. Durée : 2s.

**Critère de validation story :**
- AC 7.1: Given une case rouge, when le joueur arrive dessus, then tous les écrans affichent "X boit 3 gorgées"
- AC 7.2: Given une case bleue, when le joueur choisit une cible, then l'écran de la cible affiche "X te donne 3 gorgées à boire"
- AC 7.3: Given une case Duel, when le tirage s'effectue, then l'animation montre les avatars et désigne la cible
- AC 7.4: Given une case blanche, when le joueur choisit "monnaie", then son solde augmente de 15 sur tous les écrans

---

#### STORY 08 — Système Économie & HUD (FR26-30)

**Objectif :** Implémenter l'affichage temps réel du solde de monnaie et du classement des Pintes.

- [ ] Task 8.1: Créer MoneyBar.tsx
  - File: `client/src/components/hud/MoneyBar.tsx`
  - Action: Composant affichant le solde de monnaie du joueur courant (`myPlayer.money`) avec icône pièce. Mise à jour automatique via gameState. Animation +/- sur changement de valeur.

- [ ] Task 8.2: Créer PlayerList.tsx (classement Pintes)
  - File: `client/src/components/hud/PlayerList.tsx`
  - Action: Liste triée des joueurs par nombre de Pintes décroissant. Affiche avatar + nom + 🍺 × pintes. Bouton toggle pour afficher/masquer (économise l'espace en jeu). Mis à jour en temps réel.

- [ ] Task 8.3: Intégrer HUD dans GameBoard.tsx
  - File: `client/src/components/GameBoard.tsx`
  - Action: Superposer MoneyBar (bas d'écran) et PlayerList (toggle en haut à droite) par-dessus le canvas Pixi.js. Utiliser CSS `position: absolute` pour l'overlay React sur le canvas.

- [ ] Task 8.4: Logique achat de Pintes (serveur)
  - File: `server/src/handlers/actionHandler.ts`, `server/src/game/GameState.ts`
  - Action: Cases `shop` (pour V1 : hard-coder 1 Pinte = 100 monnaie). Event `buy-pinte { roomCode }` → vérifie `player.money >= 100` → `money -= 100`, `pintes += 1` → broadcast. Si argent insuffisant → émet error.
  - Notes: Les cases boutique sont présentes sur le plateau mais rares. La mécanique boutique complète est Phase 2.

**Critère de validation story :**
- AC 8.1: Given un joueur gagnant un mini-jeu, when les résultats arrivent, then son solde visible passe de X à X+30 en temps réel
- AC 8.2: Given le classement affiché, then les joueurs sont triés par Pintes décroissantes en permanence
- AC 8.3: Given 100 monnaie et une case boutique, when le joueur achète une Pinte, then son solde passe à 0 et son compteur Pintes à 1

---

#### STORY 09 — Infrastructure Mini-jeux (FR19-22)

**Objectif :** Implémenter le système de coordination des mini-jeux, le routeur client, et la logique commune (résultats, pénalités, timeout).

- [ ] Task 9.1: Implémenter MinigameCoordinator.ts (serveur)
  - File: `server/src/minigames/MinigameCoordinator.ts`
  - Action: Classe qui gère une session de mini-jeu. `start(gameState, minigameName)` → émet `minigame-started { name, players, duration: 30000 }` à toute la room. Collecte les résultats via `submitResult(roomCode, playerId, result)`. `setTimeout(30000)` → après 30s, calculer résultats avec les joueurs n'ayant pas répondu classés derniers. `finalize(results)` → trier par score, distribuer monnaie au gagnant (+30), broadcast `minigame-results`, appeler `StateMachine.advanceTurn`.

- [ ] Task 9.2: Implémenter minigameHandler.ts (serveur)
  - File: `server/src/handlers/minigameHandler.ts`
  - Action: Event `submit-minigame-result { roomCode, playerId, score }` → passe au MinigameCoordinator. Valider que le mini-jeu est bien en cours et que le joueur appartient à la room.

- [ ] Task 9.3: Créer MinigameRouter.tsx (client)
  - File: `client/src/minigames/MinigameRouter.tsx`
  - Action: Écoute event `minigame-started`. Sur réception → `import()` dynamique du composant correspondant selon `name`. Affiche un compte à rebours overlay pendant le chargement (<500ms attendu). Passe `players` et `onComplete` au composant. Sur `onComplete(results)` → émet `submit-minigame-result`.
  - Notes: Import map : `{ 'sequence': () => import('./Sequence'), 'turbo-tap': () => import('./TurboTap'), ... }`

- [ ] Task 9.4: Affichage résultats mini-jeu
  - File: `client/src/components/GameBoard.tsx` ou `MinigameRouter.tsx`
  - Action: Écouter `minigame-results` → afficher écran résultats 3s : classement avec avatars, score, monnaie gagnée. Puis retour automatique au plateau.

**Critère de validation story :**
- AC 9.1: Given la fin d'un round, when le serveur déclenche un mini-jeu, then tous les téléphones affichent le même mini-jeu simultanément
- AC 9.2: Given un joueur qui ne répond pas, when le timeout 30s expire, then la partie continue sans lui (classé dernier)
- AC 9.3: Given la fin du mini-jeu, when les résultats arrivent, then le gagnant voit +30 sur son solde

---

#### STORY 10 — Mini-jeux Réflexes : Réaction Pure, Turbo Tap, Stop Chrono (FR23)

- [ ] Task 10.1: Réaction Pure
  - File: `client/src/minigames/ReactionPure.tsx`, `server/src/minigames/reactionPure.logic.ts`
  - Action: Client — fond noir, après délai aléatoire 1-4s, flash couleur plein écran. Le joueur tape. Le timestamp de tap est envoyé comme score. Server logic — calcule le délai de réaction (timestamp reçu - timestamp du flash envoyé). Classement par délai croissant (moins = mieux).
  - Notes: Le serveur envoie `reaction-flash-at: timestamp` pour synchronisation précise.

- [ ] Task 10.2: Turbo Tap
  - File: `client/src/minigames/TurboTap.tsx`, `server/src/minigames/turboTap.logic.ts`
  - Action: Client — barre de progression qui monte à chaque tap. Durée : 10s. Affiche visualisation "course de chevaux" horizontale avec les avatars des joueurs. Score = nombre de taps. Server logic — classement par nombre de taps décroissant.
  - Notes: Limiter à max 20 taps/s côté serveur pour éviter le cheating.

- [ ] Task 10.3: Stop Chrono
  - File: `client/src/minigames/StopChrono.tsx`, `server/src/minigames/stopChrono.logic.ts`
  - Action: Client — compteur numérique qui monte de 0.00 à ~10s. Cible aléatoire entre 3.00 et 8.00 affichée. Tap pour arrêter. Score = valeur absolue de `|stopTime - targetTime|`. Server logic — classement par score croissant (moins d'écart = mieux). Afficher le résultat exact de chaque joueur à la fin.

**Critère de validation story :**
- AC 10.1: Given Réaction Pure, when le flash apparaît, then le premier à tapper est classé premier
- AC 10.2: Given Turbo Tap 10s, when le timer expire, then le joueur avec le plus de taps gagne
- AC 10.3: Given Stop Chrono, when je stoppe à 3.47 pour une cible de 3.50, then mon score affiché est 0.03

---

#### STORY 11 — Mini-jeux Précision : Séquence, Tir de Gun, Cible Mouvante (FR23)

- [ ] Task 11.1: Séquence
  - File: `client/src/minigames/Sequence.tsx`, `server/src/minigames/sequence.logic.ts`
  - Action: Client — affiche une séquence de flèches (↑↓←→) s'allongeant après chaque réussite. Commencer à 3 flèches, max 8. Tap sur les flèches dans l'ordre. Score = longueur de séquence réussie. Erreur = game over pour ce joueur. Server logic — classement par score décroissant.
  - Notes: Afficher la séquence complète 2s puis la masquer, joueur doit reproduire de mémoire.

- [ ] Task 11.2: Tir de Gun
  - File: `client/src/minigames/TirDeGun.tsx`, `server/src/minigames/tirDeGun.logic.ts`
  - Action: Client (Pixi.js) — cibles circulaires apparaissent à positions aléatoires sur l'écran pendant 15s. Tap sur une cible = disparaît + +1 point. Cibles se déplacent lentement. Difficulté : cibles rétrécissent avec le temps. Score = nombre de hits. Server logic — classement par score.

- [ ] Task 11.3: Cible Mouvante
  - File: `client/src/minigames/CibleMouvante.tsx`, `server/src/minigames/cibleMouvante.logic.ts`
  - Action: Client (Pixi.js) — UNE cible circulaire (type cercles concentriques) se déplace en rebondissant sur les bords. Joueur tape — la précision est mesurée par la distance entre le tap et le centre. Score = 100 - distance_en_pixels (max 100). 5 tirs par joueur, score = somme. Server logic — classement par score total.

**Critère de validation story :**
- AC 11.1: Given Séquence à 5 flèches, when je reproduis correctement, then une 6e flèche s'ajoute
- AC 11.2: Given Tir de Gun, when je tape sur une cible, then elle disparaît et mon compteur monte
- AC 11.3: Given Cible Mouvante, when je tape exactement au centre, then je reçois 100 points

---

#### STORY 12 — Mini-jeux Complexes : Équilibre, Peinture Battle, Labyrinthe (FR23-25)

- [ ] Task 12.1: Équilibre (gyroscope)
  - File: `client/src/minigames/Equilibre.tsx`, `server/src/minigames/equilibre.logic.ts`
  - Action: Client (Pixi.js) — plateau inclinable avec une balle. Utiliser `DeviceOrientationEvent` (`beta`, `gamma`) pour incliner le plateau. La balle tombe si elle sort des bords. Durée : 30s. Score = temps de survie en ms. Feature-detect : si DeviceOrientation non disponible, afficher message "Gyroscope non disponible" et attribuer score 0. Server logic — classement par survie décroissante.
  - Notes: Requiert HTTPS en production. Demander permission sur iOS 13+ via `DeviceOrientationEvent.requestPermission()`.

- [ ] Task 12.2: Peinture Battle
  - File: `client/src/minigames/PeintureBattle.tsx`, `server/src/minigames/peintureBattle.logic.ts`
  - Action: Client (Pixi.js) — chaque joueur contrôle un personnage sur une map carrée. Déplacement via joystick virtuel. Le personnage laisse une traînée de sa couleur. Tir automatique dans la direction du mouvement. Touché par un tir → explosion + respawn 5s après à position aléatoire. Map size : 600×600 pour 4 joueurs, 800×800 pour 5-6, 1000×1000 pour 7-8 (scroll camera). Durée : 60s. À la fin du timer, le client envoie un snapshot final via `submit-minigame-result` avec le payload : `{ playerId: string, score: number }` où `score` = pourcentage de surface couverte × 100 (ex: 23.5% → score 2350). Server logic — classement par score décroissant. **Format exact du payload** : `IMinigameResult { playerId: string, score: number }` — identique aux autres mini-jeux, `score` = surface × 100.
  - Notes: Surface calculée côté client : compter les pixels de la couleur du joueur sur le RenderTexture Pixi.js à la fin du timer (`app.renderer.extract.pixels()`). Risque de triche acceptable en V1.

- [ ] Task 12.3: Labyrinthe
  - File: `client/src/minigames/Labyrinthe.tsx`, `server/src/minigames/labyrinthe.logic.ts`
  - Action: Client (Pixi.js) — labyrinthe identique pour tous (seed partagée via event `minigame-started`). Chaque joueur entre par un coin différent. Fog of war : visible uniquement autour du joueur (rayon ~3 cases). Sortie commune au centre. Pièges fixes : téléportation (tp à position aléatoire) et ralentissement (50% vitesse pendant 5s). Contrôle : swipe ou boutons directionnels. Server logic — classement par temps d'arrivée. Joueurs n'ayant pas atteint la sortie : classés par distance restante à la sortie.
  - Notes: Le labyrinthe est généré côté serveur avec une seed, envoyé dans `minigame-started`. Algorithme de génération simple (recursive backtracking).

**Critère de validation story :**
- AC 12.1: Given Équilibre, when je penche mon téléphone à droite, then la balle roule à droite
- AC 12.2: Given Peinture Battle, when je touche un adversaire, then il explose et réapparaît 5s après
- AC 12.3: Given Labyrinthe, when je marche dans le noir, then je ne vois que les cases proches de moi

---

#### STORY 13 — Fin de Partie & Écran de Victoire (FR31-32)

**Objectif :** Gérer la fin après 12 rounds et afficher l'écran de victoire.

- [ ] Task 13.1: StateMachine — game-over après 12 rounds (serveur)
  - File: `server/src/game/StateMachine.ts`
  - Action: Dans `advanceTurn`, si `gameState.round >= gameState.maxRounds` (12) après le dernier mini-jeu → `setPhase('game-over')` → broadcast `game-state-updated`.

- [ ] Task 13.2: Créer GameOver.tsx
  - File: `client/src/components/GameOver.tsx`
  - Action: Affiche le classement final trié par Pintes décroissantes. Announce le vainqueur en grand : "🏆 [Nom] remporte la partie avec [N] pintes !". Affiche le solde final de monnaie de chaque joueur. Bouton "Rejouer" → retour à `/` (pas de nouvelle partie automatique en V1).

- [ ] Task 13.3: Redirection automatique vers GameOver
  - File: `client/src/hooks/useGameState.ts` ou `client/src/components/GameBoard.tsx`
  - Action: Quand `gameState.phase === 'game-over'` → redirect vers `/game-over` (ou afficher GameOver par-dessus). Nettoyage : émettre `leave-room` pour libérer la mémoire serveur.

- [ ] Task 13.4: Nettoyage de room côté serveur
  - File: `server/src/game/RoomManager.ts`
  - Action: À `game-over` → setTimeout 5min → `deleteRoom(roomCode)`. Event `leave-room` → si tous les joueurs ont quitté → `deleteRoom` immédiatement.

**Critère de validation story :**
- AC 13.1: Given le 12e round terminé, when le dernier mini-jeu se résout, then tous les écrans passent à GameOver
- AC 13.2: Given GameOver, then le joueur avec le plus de Pintes est affiché comme vainqueur
- AC 13.3: Given 0 Pinte pour tous (partie sans boutique), then le joueur avec le plus de monnaie est déclaré vainqueur par défaut

---

#### STORY 14 — Robustesse & Gestion d'Erreurs

**Objectif :** Implémenter la gestion des erreurs serveur, les états de déconnexion, et les cas limites.

- [ ] Task 14.1: Error handling serveur → client
  - File: `server/src/handlers/*.ts`
  - Action: Wrapper tous les handlers dans try/catch. Sur erreur non-critique → `socket.emit('error', { code, message })`. Sur erreur critique (room inexistante) → `socket.emit('fatal-error', { message })`.

- [ ] Task 14.2: Error handling côté client
  - File: `client/src/hooks/useSocket.ts`, `client/src/components/ui/Toast.tsx`
  - Action: Écouter event `error` → afficher Toast. Écouter `fatal-error` → afficher message bloquant + bouton retour à `/`.

- [ ] Task 14.3: Gestion des cas limites en jeu
  - File: `server/src/handlers/roomHandler.ts`, `server/src/handlers/minigameHandler.ts`, `server/src/handlers/gameHandler.ts`
  - Action: Couvrir ces cas explicitement :
    - Hôte déconnecté en phase `lobby` → broadcast `host-disconnected`, deleteRoom après 60s sans reconnexion
    - Hôte déconnecté en phase `playing` ou `minigame` → ne pas supprimer la room, passer le tour de l'hôte, TurnTimer gère le skip
    - `roll-dice` reçu quand `phase !== 'playing'` → rejeter silencieusement (émettre `error` au socket)
    - `submit-minigame-result` reçu après le timeout 30s du MinigameCoordinator → ignorer (résultats déjà finalisés)
    - `movement-complete` reçu deux fois pour le même tour → ignorer le doublon (flag `actionResolved` dans GameState)

**Critère de validation story :**
- AC 14.1: Given un code de salle invalide, when le joueur tente de rejoindre, then un message d'erreur s'affiche et il reste sur Home
- AC 14.2: Given une erreur serveur, when elle arrive, then le joueur voit un toast non-bloquant
- AC 14.3: Given un `roll-dice` hors tour, when il arrive au serveur, then la partie continue sans bug et le joueur voit un message d'erreur

---

#### STORY 15 — Déploiement (Vercel + Railway)

**Objectif :** Déployer client sur Vercel et serveur sur Railway, configurer les variables d'environnement.

- [ ] Task 15.1: Config Vercel (client)
  - File: `client/vercel.json`
  - Action: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` pour SPA routing. Build command : `npm run build`. Output : `dist/`.

- [ ] Task 15.2: Config Railway (serveur)
  - File: `server/Procfile` ou `railway.json`
  - Action: Start command : `npm run start` (compile TS + lance node). Variables d'env Railway : `PORT`, `CLIENT_URL` (URL Vercel en production).

- [ ] Task 15.3: CORS production
  - File: `server/src/index.ts`
  - Action: Modifier CORS pour autoriser `process.env.CLIENT_URL` en production ET `http://localhost:5173` en dev. Ne jamais autoriser `*` en production.

- [ ] Task 15.4: Keep-alive ping pour Railway
  - File: `server/src/index.ts`
  - Action: Endpoint GET `/health` → `{ status: 'ok', rooms: roomManager.getActiveRoomsCount() }`. Configurer Railway health check sur cet endpoint pour éviter le sleep.

- [ ] Task 15.5: Variable d'env client en production
  - File: `client/.env.production`
  - Action: `VITE_SERVER_URL=https://[votre-app].up.railway.app`. Ne pas committer — documenter dans README.

- [ ] Task 15.6: Vérifier HTTPS pour le mini-jeu Équilibre
  - File: `client/src/minigames/Equilibre.tsx`
  - Action: Vérifier que l'URL Vercel est bien en `https://` (c'est le cas par défaut sur Vercel). Ajouter dans Equilibre.tsx un check au mount : `if (location.protocol !== 'https:' && location.hostname !== 'localhost')` → afficher message "Gyroscope indisponible : connexion sécurisée requise" et score 0. Sur iOS 13+, appeler `DeviceOrientationEvent.requestPermission()` et gérer le refus utilisateur (score 0, message "Permission refusée").
  - Notes: Railway sert aussi en HTTPS par défaut — aucune config supplémentaire nécessaire.

**Critère de validation story :**
- AC 15.1: Given l'URL Vercel de production, when 2+ joueurs l'ouvrent sur leurs téléphones, then une partie complète se joue sans erreurs
- AC 15.2: Given le serveur Railway inactif, when une requête arrive, then il répond en < 3s (pas de cold start grâce au keep-alive)

---

### Acceptance Criteria Globaux

- [ ] AC-G1: Given 4 joueurs sur leurs téléphones, when l'hôte crée une salle et partage le code, then tous rejoignent en < 60 secondes
- [ ] AC-G2: Given une partie en cours, when un joueur perd le réseau 30s et revient, then il retrouve son état intact sans perturber les autres
- [ ] AC-G3: Given 12 rounds joués, when le dernier mini-jeu se termine, then le vainqueur est déclaré et tous les écrans affichent GameOver
- [ ] AC-G4: Given n'importe quel mini-jeu, when le serveur n'a pas reçu tous les résultats après 30s, then la partie continue avec les scores partiels
- [ ] AC-G5: Given une action utilisateur (tap, lancer), when émise, then reflétée sur tous les écrans en < 200ms sur WiFi

## Additional Context

### Dependencies

**Client npm install :**
```
pixi.js@7 socket.io-client react-router-dom
tailwindcss postcss autoprefixer
```

**Server npm install :**
```
express socket.io cors
typescript @types/node @types/express ts-node nodemon (dev)
```

**Versions cibles :** Node.js 20+, Vite 5+, React 18+, Pixi.js v7, Socket.io 4+, TypeScript 5+

**Hosting :** Vercel (front, gratuit) + Railway (back, 512MB RAM free tier)

### Ordre de développement recommandé

```
Story 01 → Story 02 → Story 03 → Story 04
→ Story 05 → Story 06 → Story 07 → Story 08
→ Story 09 → Stories 10-11-12 (dans l'ordre ou en parallèle)
→ Story 13 → Story 14 → Story 15
```

Chaque story peut être passée à QD de manière indépendante.

### Testing Strategy

- Tests manuels uniquement en V1 — pas de tests unitaires automatisés
- Playtest local : lancer client + server en dev, tester avec 2 onglets navigateur (simuler 2 joueurs)
- Playtest réel : groupe de 4+ personnes, conditions bar (WiFi dégradé)
- Objectif : 0 crash sur 10 parties de test
- Latence Socket.io < 200ms sur 4G/WiFi

### Notes & Risques

- **Typo** : `CibleMouvante.tsx` (pas `CibleMovante`) — l'architecture doc a une typo, corriger pendant l'implémentation
- **Railway** : restart serveur = toutes les parties perdues — limitation V1 connue, ne PAS ajouter de persistance sans instruction explicite
- **DeviceOrientation** : requiert HTTPS en production ET permission iOS 13+ (`DeviceOrientationEvent.requestPermission()`)
- **Safari iOS** : Vibration API non supportée — dégradation gracieuse (pas de vibration, pas de crash)
- **Peinture Battle** : logique de surface côté client — risque de triche acceptable en V1, à surveiller pour V2
- **Labyrinthe** : génération par seed partagée — tous les joueurs doivent recevoir la même seed du serveur avant de démarrer
- **Déploiement first** : envisager de déployer l'infra vide (Story 15) tôt pour valider Vercel+Railway avant de coder les features
