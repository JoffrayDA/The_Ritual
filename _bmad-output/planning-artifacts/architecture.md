---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: complete
completedAt: '2026-03-30'
inputDocuments: [prd.md]
workflowType: 'architecture'
project_name: 'Tournée Générale'
user_name: 'Le_Jox'
date: '2026-03-30'
---

# Architecture Decision Document

_Ce document se construit collaborativement étape par étape. Les sections sont ajoutées au fil des décisions architecturales._

## Project Context Analysis

### Requirements Overview

**Exigences Fonctionnelles (32 FRs — 6 domaines) :**
- **Gestion de Session (FR1-7)** : Salle, lobby, avatars, reconnexion automatique, skip de tour — cycle de vie de session complet côté serveur
- **Plateau de Jeu (FR8-13)** : Vue temps réel partagée, déplacement, embranchements — serveur source de vérité unique
- **Cases & Actions (FR14-18)** : 5 types de cases dont 1 Duel — machine à états relativement simple
- **Mini-Jeux (FR19-25)** : 9 mini-jeux simultanés, résultats collectifs, gyroscope, respawn — complexité la plus haute du projet
- **Économie & Victoire (FR26-30)** : Monnaie + Pintes, classement temps réel
- **Fin de Partie (FR31-32)** : 12 rounds fixes, écran de résultats

**NFRs critiques :**
- Latence Socket.io < 200ms → impose WebSocket (pas de polling)
- 60fps mini-jeux → impose Canvas/Pixi.js (pas de DOM rendering pour animations)
- Reconnexion < 30s sans perte d'état → persistance d'état en mémoire serveur
- Gyroscope (DeviceOrientation API) → feature-detect requis

**Échelle & Complexité :**
- Domaine : Web app mobile temps réel multijoueur
- Complexité : Moyenne-Haute — machine à états temps réel + 9 mini-jeux distincts
- Composants architecturaux estimés : 8-10

### Contraintes & Dépendances

- Railway free tier (512MB RAM, sleep après inactivité) → contrainte mémoire par session
- Dev solo IA-assisté → architecture simple et découplée, pas de microservices
- Carte hard-codée → graphe de nœuds statique, pas de génération procédurale
- Pas de DB persistante → état de jeu 100% en mémoire serveur (sessions éphémères)

### Préoccupations Transversales

1. **State machine de jeu** — machine à états centrale traversant tous les composants (lobby → tour → case → mini-jeu → fin)
2. **Synchronisation temps réel** — chaque événement serveur propagé simultanément à tous les clients
3. **Gestion des déconnexions** — timeout, reconnexion, skip de tour intégrés à la state machine
4. **Isolation des mini-jeux** — 9 mini-jeux découplés, chargés à la demande
5. **Cycle de vie de session** — création → rejoindre → jouer → terminer → nettoyage mémoire

## Starter Template Evaluation

### Domaine Technologique Primaire
Full-stack web app mobile temps réel — Frontend SPA React + Backend Node.js stateful.

### Stack Confirmé (défini dans le PRD)

Le stack étant acté en amont, l'évaluation confirme les choix plutôt que de les découvrir.

**Commandes d'initialisation :**

```bash
# Frontend
npm create vite@latest tournee-generale-client -- --template react-ts

# Dépendances frontend
cd tournee-generale-client
npm install pixi.js socket.io-client

# Backend (répertoire séparé)
mkdir tournee-generale-server && cd tournee-generale-server
npm init -y
npm install express socket.io cors
npm install -D typescript @types/node @types/express ts-node nodemon
```

**Décisions architecturales fournies par le starter :**

- **Langage :** TypeScript (frontend + backend) — typage fort, essentiel pour la state machine
- **Build tooling :** Vite — HMR ultra-rapide, bundle optimisé mobile
- **Structure :** Monorepo 2 packages (`/client` + `/server`)
- **Rendu :** Pixi.js Canvas — boucle de rendu indépendante du DOM React
- **Temps réel :** Socket.io — WebSocket avec fallback automatique, rooms natives
- **Styling :** CSS modules ou Tailwind (à décider à l'étape suivante)
- **Tests :** Vitest (frontend) — intégré nativement à Vite

**Note :** L'initialisation du projet sera la première story d'implémentation.

## Core Architectural Decisions

### Decision Priority Analysis

**Décisions Critiques (bloquent l'implémentation) :**
- State machine de jeu côté serveur (Map en mémoire)
- Pattern Socket.io events-only (pas de REST API)
- Séparation rendu Pixi.js / UI React

**Décisions Importantes (façonnent l'architecture) :**
- State management frontend : React state + context (pas de Redux)
- Styling : Tailwind pour UI, Pixi.js pour plateau/mini-jeux
- Routing : React Router minimal (3 routes)

**Décisions Différées (post-MVP) :**
- Persistance scores inter-sessions (DB si nécessaire)
- Monitoring et logging avancés

### Data Architecture

- **Persistance :** Aucune base de données — état 100% en mémoire serveur
- **Structure :** `Map<roomCode, GameState>` côté serveur Node.js
- **Sessions :** Éphémères — nettoyées à la fin de la partie ou après timeout
- **Validation :** Côté serveur uniquement — le client ne peut pas altérer le state

### Authentification & Sécurité

- **Auth :** Aucune — pas de compte utilisateur, pas de mot de passe
- **Accès :** Code de salle à 4 caractères (généré aléatoirement côté serveur)
- **Validation :** Vérification serveur que le socketId appartient à la room active
- **CORS :** Configuré pour autoriser uniquement le domaine Vercel en production

### API & Communication

- **Pattern :** 100% Socket.io events — pas de REST API
- **Flux :** Client émet event → Serveur valide + met à jour GameState → Serveur broadcast nouvel état à toute la room
- **Events principaux :** `create-room`, `join-room`, `roll-dice`, `resolve-action`, `start-minigame`, `submit-minigame-result`, `reconnect`
- **Error handling :** Serveur émet `error` event avec code et message lisible

### Frontend Architecture

- **State management :** React useState + useContext pour lobby/UI — Pixi.js gère son propre état de rendu
- **Séparation des responsabilités :** React = UI déclarative (lobby, menus, résultats) / Pixi.js = rendu impératif (plateau, animations, mini-jeux)
- **Routing :** React Router — `/` (accueil), `/lobby/:code`, `/game/:code`
- **Mini-jeux :** Modules isolés, chargés dynamiquement (`import()`) au déclenchement

### Infrastructure & Déploiement

- **Frontend :** Vercel — déploiement automatique sur push `main`, CDN global
- **Backend :** Railway — service Node.js persistant, keep-alive ping pour éviter le sleep
- **Environnement :** Variable `VITE_SERVER_URL` pour pointer le client vers le serveur Socket.io
- **Styling :** Tailwind CSS (UI) — Pixi.js Canvas (plateau + mini-jeux)

### Decision Impact Analysis

**Séquence d'implémentation :**
1. Initialisation monorepo + config TypeScript
2. Serveur Node.js + Socket.io + GameState en mémoire
3. Client React + connexion Socket.io
4. Plateau Pixi.js + rendu temps réel
5. Cases et actions (state machine)
6. Mini-jeux (modules isolés, 1 par 1)
7. Économie (monnaie + Pintes)
8. Fin de partie + déploiement

**Dépendances inter-composants :**
- GameState serveur → tous les composants client le consomment via Socket.io
- Pixi.js scène → initialisée une fois, mise à jour par les events Socket.io
- Mini-jeux → tous accèdent au même channel Socket.io de la room

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Code (TypeScript) :**
- Composants React : PascalCase (`GameBoard`, `MiniGameScreen`)
- Fichiers composants : PascalCase (`GameBoard.tsx`)
- Fichiers utilitaires/hooks : camelCase (`useSocket.ts`, `gameUtils.ts`)
- Variables/fonctions : camelCase (`gameState`, `handleRollDice`)
- Constantes : SCREAMING_SNAKE_CASE (`MAX_PLAYERS`, `ROUND_COUNT`)
- Types/Interfaces : PascalCase avec préfixe I (`IGameState`, `IPlayer`)

**Socket.io Events :**
- Client → Serveur : `kebab-case` (`roll-dice`, `join-room`, `submit-result`)
- Serveur → Client : `kebab-case` (`game-state-updated`, `minigame-started`, `game-over`)
- Jamais de camelCase pour les events Socket.io

**Fichiers :**
- Mini-jeux : `minigames/TurboTap.tsx` (PascalCase)
- Handlers serveur : `handlers/gameHandler.ts` (camelCase)

### Structure Patterns

**Frontend (`/client/src`) :**
```
components/   → UI React (lobby, menus, résultats)
game/         → logique Pixi.js (plateau, animations)
minigames/    → 1 fichier par mini-jeu
hooks/        → hooks React (useSocket, useGameState)
types/        → interfaces TypeScript partagées
utils/        → fonctions pures utilitaires
```

**Backend (`/server/src`) :**
```
handlers/     → logique Socket.io par domaine
game/         → state machine + GameState
minigames/    → logique serveur des mini-jeux
types/        → interfaces TypeScript
utils/        → fonctions pures
```

### Format Patterns

**Socket.io payload standard :**
```typescript
// Client → Serveur
{ roomCode: string, playerId: string, payload: {...} }

// Serveur → Client (broadcast)
{ type: string, gameState: IGameState, error?: string }
```

**Erreur Socket.io :**
```typescript
socket.emit('error', { code: 'INVALID_ACTION', message: 'Ce n\'est pas votre tour' })
```

**GameState — source de vérité unique :**
```typescript
interface IGameState {
  roomCode: string
  phase: 'lobby' | 'playing' | 'minigame' | 'game-over'
  players: IPlayer[]
  currentPlayerIndex: number
  round: number
  board: IBoardState
}
```

### Communication Patterns

- Le client ne modifie JAMAIS le GameState directement
- Toute action = event Socket.io → validation serveur → broadcast état complet
- Le client re-render à chaque réception de `game-state-updated`
- Mini-jeux : modules autonomes (`import()` dynamique), interface commune `{ onComplete: (results: IMinigameResult[]) => void }`

### Process Patterns

- Loading states : prop `isLoading: boolean` sur chaque composant en attente serveur
- Erreurs serveur → toast notification (non bloquant)
- Erreurs critiques (room inexistante) → redirect vers `/`

### Règles Absolues

- **TOUJOURS** valider les actions côté serveur avant de modifier le GameState
- **JAMAIS** stocker le GameState dans localStorage/sessionStorage
- **TOUJOURS** broadcaster le GameState complet après chaque modification (pas de diffs partiels)
- **JAMAIS** utiliser `any` en TypeScript — typer tous les events Socket.io
- **TOUJOURS** nettoyer les listeners Socket.io dans les `useEffect` cleanup

## Project Structure & Boundaries

### Complete Project Directory Structure

## Architecture Validation Results

### Cohérence ✅
Toutes les décisions sont compatibles. TypeScript unifie client et serveur. Pixi.js et React opèrent dans des domaines séparés sans friction. Stack éprouvée, aucun conflit de version.

### Couverture Requirements ✅
- 32/32 FRs architecturalement couverts
- 4/4 catégories NFR adressées (performance, fiabilité, scalabilité, compatibilité)

### Statut : PRÊT POUR L'IMPLÉMENTATION ✅

### Décisions Additionnelles (suite à validation party mode)

- **Duel — sélection de cible :** Tirage au sort côté serveur → event `duel-target-selected` → animation côté client (dé Pixi.js avec avatars de tous les joueurs, s'arrête sur la cible)
- **Timeout mini-jeux :** Le serveur impose un timeout de 30s sur chaque phase mini-jeu pour éviter tout blocage si un client ne répond pas
- **Lazy loading mini-jeux :** `MinigameRouter` utilise `import()` dynamique dès le départ — pas en optimisation tardive
- **Limitation V1 documentée :** Redémarrage du serveur Railway = perte de toutes les parties en cours. Comportement attendu — les agents IA ne doivent PAS ajouter de persistance sans instruction explicite

### Architecture Completeness Checklist

- [x] Analyse du contexte projet et des FRs
- [x] Stack technique défini et versionné
- [x] Décisions architecturales documentées (data, auth, API, frontend, infra)
- [x] Patterns d'implémentation et règles de cohérence
- [x] Structure complète du projet avec mapping FRs → fichiers
- [x] Frontières architecturales définies
- [x] Data flow documenté
- [x] Cas limites identifiés (reconnexion, timeout, redémarrage serveur)

### Première Priorité d'Implémentation

```bash
npm create vite@latest tournee-generale-client -- --template react-ts
```

---

```
tournee-generale/
├── README.md
├── package.json                    # workspace monorepo
├── .gitignore
│
├── client/                         # Frontend React + Vite
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── index.html
│   ├── .env.example                # VITE_SERVER_URL
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                 # Router principal
│       ├── types/
│       │   ├── game.types.ts       # IGameState, IPlayer, IBoardState
│       │   ├── socket.types.ts     # Events Socket.io typés
│       │   └── minigame.types.ts   # IMinigameResult, IMinigameProps
│       ├── hooks/
│       │   ├── useSocket.ts        # Connexion + reconnexion Socket.io
│       │   └── useGameState.ts     # State local synchronisé
│       ├── components/
│       │   ├── Home.tsx            # FR1 — Créer / rejoindre salle
│       │   ├── Lobby.tsx           # FR2-5 — Lobby + choix avatar
│       │   ├── GameOver.tsx        # FR32 — Écran de fin
│       │   ├── ui/
│       │   │   ├── Toast.tsx       # Notifications erreurs
│       │   │   └── Spinner.tsx     # Loading states
│       │   └── hud/
│       │       ├── PlayerList.tsx  # FR29 — Classement Pintes
│       │       └── MoneyBar.tsx    # FR26 — Solde monnaie
│       ├── game/
│       │   ├── PixiApp.tsx         # Conteneur React → Pixi
│       │   ├── BoardRenderer.ts    # FR8-10 — Rendu plateau
│       │   ├── PlayerSprite.ts     # FR10 — Animation personnage
│       │   ├── DiceAnimation.ts    # FR9 — Animation dé
│       │   └── board.data.ts       # Graphe de nœuds hard-codé (~50 cases)
│       └── minigames/
│           ├── MinigameRouter.tsx  # FR19 — Chargement dynamique
│           ├── Sequence.tsx        # FR23 — Mini-jeu 1
│           ├── TurboTap.tsx        # FR23 — Mini-jeu 2
│           ├── StopChrono.tsx      # FR23 — Mini-jeu 3
│           ├── TirDeGun.tsx        # FR23 — Mini-jeu 4
│           ├── ReactionPure.tsx    # FR23 — Mini-jeu 5
│           ├── CibleMovante.tsx    # FR23 — Mini-jeu 6
│           ├── Equilibre.tsx       # FR23-24 — Mini-jeu 7 (gyroscope)
│           ├── PeintureBattle.tsx  # FR23-25 — Mini-jeu 8 (respawn)
│           └── Labyrinthe.tsx      # FR23 — Mini-jeu 9
│
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── nodemon.json
    ├── .env.example
    └── src/
        ├── index.ts                # Entry point Express + Socket.io
        ├── types/
        │   ├── game.types.ts
        │   └── socket.types.ts
        ├── game/
        │   ├── GameState.ts        # IGameState + mutations
        │   ├── StateMachine.ts     # FR11-13 — Machine à états
        │   ├── RoomManager.ts      # FR1-7 — Map<roomCode, GameState>
        │   └── board.data.ts       # Graphe de nœuds
        ├── handlers/
        │   ├── roomHandler.ts      # FR1-7 — create/join/reconnect
        │   ├── gameHandler.ts      # FR8-13 — tour de jeu
        │   ├── actionHandler.ts    # FR14-18 — résolution cases
        │   └── minigameHandler.ts  # FR19-25 — coordination mini-jeux
        ├── minigames/
        │   ├── MinigameCoordinator.ts
        │   ├── sequence.logic.ts
        │   ├── turboTap.logic.ts
        │   ├── stopChrono.logic.ts
        │   ├── tirDeGun.logic.ts
        │   ├── reactionPure.logic.ts
        │   ├── equilibre.logic.ts
        │   ├── peintureBattle.logic.ts
        │   └── labyrinthe.logic.ts
        └── utils/
            ├── roomCode.ts         # Génération code 4 lettres
            └── timer.ts            # Skip de tour après 60s
```

### Frontières Architecturales

- **Socket.io :** unique canal de communication client ↔ serveur — pas de REST en runtime
- **Pixi.js / React :** `PixiApp.tsx` est le seul pont — React gère l'UI, Pixi gère le rendu
- **Mini-jeux :** isolés derrière `MinigameRouter.tsx`, interface unique `{ onComplete }`

### Mapping FRs → Fichiers

| FRs | Fichiers |
|---|---|
| FR1-5 | `Home.tsx`, `Lobby.tsx`, `roomHandler.ts`, `RoomManager.ts` |
| FR6-7 | `useSocket.ts`, `roomHandler.ts`, `timer.ts` |
| FR8-10 | `BoardRenderer.ts`, `PlayerSprite.ts`, `gameHandler.ts` |
| FR11-13 | `StateMachine.ts`, `actionHandler.ts` |
| FR14-18 | `actionHandler.ts` |
| FR19-25 | `MinigameRouter.tsx`, `minigameHandler.ts`, `MinigameCoordinator.ts`, fichiers mini-jeux |
| FR26-30 | `MoneyBar.tsx`, `PlayerList.tsx`, `GameState.ts` |
| FR31-32 | `StateMachine.ts`, `GameOver.tsx` |

### Data Flow

```
User tap → socket.emit() → Handler → StateMachine.update(GameState)
         → io.to(room).emit('game-state-updated', newState)
         → useGameState reçoit → React re-render + Pixi.js update
```
