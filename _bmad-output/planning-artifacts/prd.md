---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
status: complete
inputDocuments: []
workflowType: 'prd'
---

# Product Requirements Document — Tournée Générale

**Auteur :** Le_Jox
**Date :** 2026-03-30

---

## Résumé Exécutif

Tournée Générale est une web app mobile multijoueur synchronisée en temps réel, conçue pour déclencher et animer le début d'une soirée entre amis. 4 à 8 joueurs, chacun sur son propre téléphone, s'affrontent sur un plateau de jeu style Mario Party avec des mini-jeux de réflexe, de vitesse et d'adresse. Une partie dure ~1h. L'alcool est une conséquence naturelle de la compétition, pas le centre du jeu.

**Utilisateurs cibles :** Groupes de 4 à 8 personnes en soirée ou dans un bar, 18-30 ans, à l'aise avec les smartphones, qui veulent une activité structurée et fun sans effort d'organisation.

**Problème résolu :** Les jeux d'alcool existants sont soit trop passifs (défis sociaux, "jamais je n'ai jamais"), soit nécessitent un seul téléphone partagé — cassant la dynamique et limitant l'implication individuelle. Tournée Générale donne à chaque joueur son propre écran et sa propre agentivité.

### Ce qui rend ce produit unique

- **Chacun sur son propre téléphone** — plus d'écran partagé, chaque joueur est acteur à part entière
- **Vrais mini-jeux compétitifs** — réflexe, vitesse, précision, stratégie — pas des défis sociaux
- **Format contrôlé** — ~1h, structure de plateau Mario Party, conçu pour s'intégrer dans une soirée
- **Tension compétition/convivialité** — on joue pour gagner, mais l'alcool unit le groupe
- **Zéro setup** — rejoindre une salle en 30 secondes avec un code, style Jackbox

## Classification du Projet

- **Type :** Web app mobile — SPA (React + Vite + Pixi.js, portrait uniquement)
- **Domaine :** Gaming / Entertainment social
- **Complexité :** Moyenne — temps réel multi-joueurs, mini-jeux interactifs, pas de contraintes réglementaires
- **Contexte :** Greenfield — nouveau produit from scratch
- **Distribution :** URL directe, aucune installation, aucun store

## Critères de Succès

### Succès Utilisateur
- Une partie complète se joue de bout en bout sans interruption technique
- Tous les joueurs restent actifs et impliqués du début à la fin
- La partie dure entre 45min et 1h15
- Les joueurs rejoignent une salle en moins de 60 secondes avec un code

### Succès Business
- V1 jouable et stable pour un groupe de 4 à 8 joueurs en conditions réelles (bar, soirée)
- Zéro coût d'hébergement au-delà du plan gratuit (Vercel + Railway free tier)

### Succès Technique
- Synchronisation temps réel sans désynchronisation visible entre les joueurs
- Reconnexion automatique si un joueur perd brièvement le réseau
- Expérience fluide sur mobile (portrait, iOS + Android via navigateur)
- Aucun mini-jeu ne plante ou ne bloque la progression de la partie

### Mesures Cibles
- 0 crash de session sur 10 parties de test
- Latence Socket.io < 200ms en conditions normales (réseau 4G/WiFi)

## Parcours Utilisateurs

### Parcours 1 — L'Hôte (chemin idéal)
Lucas sort son téléphone dans le bar, ouvre Tournée Générale, crée une salle. Un code à 4 lettres s'affiche sur son écran. Il le crie à la table, tout le monde tape le code, choisit son avatar animal. En 45 secondes, 6 joueurs sont dans le lobby. Lucas appuie sur "Lancer". Le plateau apparaît sur tous les écrans simultanément. Il lance le dé en premier, son personnage court vers sa case — rouge, il boit 3 gorgées. La partie est lancée.

### Parcours 2 — Le Joueur (chemin idéal)
Sarah rejoint avec le code. Elle choisit l'axolotl comme avatar. Elle regarde les autres jouer leur tour sur son écran, voit les personnages se déplacer en temps réel. Son tour arrive — elle lance le dé, tombe sur une case mini-jeu. Tous les téléphones vibrent. Le mini-jeu "Turbo Tap" s'ouvre. Elle tape frénétiquement, finit 2ème, donne 3 gorgées au perdant. Elle repose son téléphone, reprend son verre.

### Parcours 3 — Le Joueur déconnecté (cas limite)
Tom perd le réseau 30 secondes (réseau bar). Son écran indique "Reconnexion...". Les autres continuent leur tour. Tom revient automatiquement dans la partie à l'état actuel du plateau, sans perte de données. Si Tom ne revient pas après 60 secondes, son tour est passé automatiquement.

### Synthèse des Capacités Révélées

| Parcours | Capacités requises |
|---|---|
| Hôte | Création de salle, génération code, lobby, lancement de partie |
| Joueur | Rejoindre via code, choix avatar, vue plateau temps réel, tour de jeu, mini-jeux |
| Déconnexion | Reconnexion automatique, skip de tour après timeout |

## Scoping & Roadmap

### Approche MVP
**Philosophy :** Experience MVP — le produit doit être jouable et fun end-to-end dès la V1.
**Ressources :** Solo dev IA-assisté, budget zéro, hébergement free tier (Vercel + Railway).

### Objectif de Victoire
Les **Pintes** sont l'équivalent des étoiles Mario Party — objet prestige à collecter. La monnaie courante sert à en acheter ou à en gagner. Le joueur avec le plus de Pintes à la fin gagne.

### Phase 1 — MVP

**Capacités indispensables :**
- Création de salle + code 4 lettres + lobby
- Choix d'avatar animal (pixel art)
- Plateau de jeu (~50 cases) — une seule map
- Cases de base : Rouge, Bleue, Blanche, Noire + Case Duel
- Lancer de dé avec animation
- Système de monnaie + Pintes (objectif de victoire)
- 9 mini-jeux complets
- Synchronisation temps réel (Socket.io)
- Reconnexion automatique + skip de tour après 60s

### Phase 2 — Growth (Post-MVP)
- Boutique complète (objets offensifs, défensifs, utilitaires)
- Cases spéciales supplémentaires (Enchères, Jugement, Roue, Redistribution, Téléportation)
- Avatars animés, polish visuel

### Phase 3 — Expansion
- Thèmes de maps (Western, Pirates, Galaxy)
- Leaderboard de session, partage de résultats fin de partie
- Timer optionnel de partie

### Gestion des Risques
- **Technique :** Réseau bar dégradé → reconnexion automatique + état côté serveur autoritaire
- **Ressources :** Dev solo → carte hard-codée, pas de génération procédurale
- **Marché :** Produit non testé → playtest avec groupe réel le plus tôt possible

## Exigences Fonctionnelles

### Gestion de Session

- FR1 : L'hôte peut créer une salle de jeu et obtenir un code d'accès unique à 4 caractères
- FR2 : Un joueur peut rejoindre une salle existante via un code
- FR3 : L'hôte peut voir la liste des joueurs dans le lobby en temps réel
- FR4 : Chaque joueur peut choisir un avatar animal avant le début de la partie
- FR5 : L'hôte peut lancer la partie depuis le lobby
- FR6 : Le système reconnecte automatiquement un joueur déconnecté à sa session en cours
- FR7 : Le système passe automatiquement le tour d'un joueur absent après 60 secondes

### Plateau de Jeu

- FR8 : Chaque joueur peut voir le plateau complet avec la position de tous les joueurs en temps réel
- FR9 : Un joueur peut lancer le dé lors de son tour
- FR10 : Le personnage du joueur se déplace automatiquement du nombre de cases indiqué par le dé
- FR11 : Le système détecte la case sur laquelle le joueur atterrit et déclenche l'action correspondante
- FR12 : Le système gère les embranchements — le joueur choisit sa direction
- FR13 : Le système fait progresser les tours automatiquement après chaque action résolue

### Cases & Actions

- FR14 : La case Rouge inflige une pénalité de boisson au joueur (3 gorgées)
- FR15 : La case Bleue permet au joueur de distribuer des gorgées à un autre joueur (3 gorgées)
- FR16 : La case Blanche offre au joueur un choix : recevoir de la monnaie ou subir une pénalité de boisson
- FR17 : La case Noire inflige au joueur une pénalité : perd de la monnaie ou boit
- FR18 : La case Duel déclenche un affrontement direct entre deux joueurs sur un mini-jeu

### Mini-Jeux

- FR19 : Le système déclenche un mini-jeu à la fin de chaque round (après que tous les joueurs ont joué)
- FR20 : Tous les joueurs participent simultanément au mini-jeu sur leur propre écran
- FR21 : Le système calcule et affiche les résultats du mini-jeu à tous les joueurs
- FR22 : Le perdant du mini-jeu reçoit une pénalité de boisson ; le gagnant reçoit de la monnaie
- FR23 : Le système dispose de 9 mini-jeux distincts : Séquence, Turbo Tap, Stop Chrono, Tir de gun, Réaction pure, Cible mouvante, Équilibre, Peinture battle, Labyrinthe
- FR24 : Le mini-jeu Équilibre utilise le gyroscope du téléphone (DeviceOrientation API)
- FR25 : Le mini-jeu Peinture battle gère les collisions entre joueurs et les respawns (5 secondes)

### Économie & Victoire

- FR26 : Chaque joueur dispose d'un solde de monnaie visible en permanence
- FR27 : Le joueur gagne de la monnaie en remportant des mini-jeux et via certaines cases
- FR28 : Le joueur peut acheter des Pintes avec sa monnaie sur les cases boutique du plateau
- FR29 : Le système affiche le classement des Pintes de tous les joueurs en temps réel
- FR30 : En fin de partie, le joueur ayant le plus de Pintes est déclaré vainqueur

### Fin de Partie

- FR31 : La partie se termine après 12 rounds (1 mini-jeu par round)
- FR32 : Le système affiche un écran de fin avec le classement final et le vainqueur

## Exigences Non-Fonctionnelles

### Performance
- Actions utilisateur (tap, lancer de dé) reflétées sur tous les écrans en < 200ms (réseau 4G/WiFi)
- Chargement initial de l'application < 3 secondes (4G)
- Mini-jeux animés à 60fps sur appareils mobiles mid-range (2020+)
- Transitions plateau → mini-jeu sans freeze perceptible

### Fiabilité
- Reconnexion automatique après perte réseau < 30 secondes sans perte d'état de jeu
- État de la partie autoritaire côté serveur — aucune désynchronisation possible
- Un crash client ne bloque pas la progression des autres joueurs

### Scalabilité
- Sessions simultanées multiples supportées (plusieurs groupes jouant en même temps)
- Chaque session : 4 à 8 joueurs
- Hébergement Railway free tier suffisant pour la V1 (pas de spike massif attendu)

### Compatibilité
- Chrome mobile et Safari mobile (iOS 14+, Android 10+)
- Portrait uniquement — landscape non supporté
- Accès via URL directe, aucune installation requise

## Spécifications Techniques

- **Frontend :** React + Vite (SPA)
- **Rendu plateau :** Pixi.js (Canvas 2D) — pixel art natif, animations fluides
- **Temps réel :** Socket.io (WebSocket avec fallback polling)
- **Backend :** Node.js — serveur stateful (état de jeu autoritaire)
- **Hébergement :** Vercel (front) + Railway (back) — plans gratuits
- **Device :** DeviceOrientation API (gyroscope), Vibration API (optionnel)
