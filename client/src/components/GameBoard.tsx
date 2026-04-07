import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as PIXI from 'pixi.js'
import PixiApp from '../game/PixiApp'
import { BoardRenderer } from '../game/BoardRenderer'
import { DiceAnimation } from '../game/DiceAnimation'
import { PlayerSprite } from '../game/PlayerSprite'
import { useSocket } from '../hooks/useSocket'
import { useGameState } from '../hooks/useGameState'
import MoneyBar from './hud/MoneyBar'
import PlayerList from './hud/PlayerList'
import MinigameRouter from '../minigames/MinigameRouter'
import { showToast, ToastContainer } from './ui/Toast'
import type { IPlayer } from '../types/game.types'

type CaseModal =
  | { type: 'red' | 'black-drink' | 'white-drink'; playerId: string }
  | { type: 'choose-target'; sourcePlayerId: string }
  | { type: 'white-choice' | 'black-choice'; playerId: string }
  | { type: 'duel'; targetPlayerId: string }
  | { type: 'shop'; playerId: string }
  | { type: 'direction'; options: number[] }
  | null

export default function GameBoard() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { socket } = useSocket()
  const { gameState, myPlayer, isMyTurn } = useGameState()

  const rendererRef = useRef<BoardRenderer | null>(null)
  const diceRef = useRef<DiceAnimation | null>(null)
  const spritesRef = useRef<Map<string, PlayerSprite>>(new Map())
  const pixiAppRef = useRef<PIXI.Application | null>(null)

  const [caseModal, setCaseModal] = useState<CaseModal>(null)
  const [diceRolling, setDiceRolling] = useState(false)
  const [showPlayers, setShowPlayers] = useState(false)

  // Redirect game-over
  useEffect(() => {
    if (gameState?.phase === 'game-over') {
      navigate('/game-over', { replace: true })
    }
  }, [gameState?.phase, navigate])

  // Listeners socket events liés au jeu
  useEffect(() => {
    function onError({ message }: { message: string }) {
      showToast(message, 'error')
    }
    function onChooseDirection({ options }: { options: number[] }) {
      setCaseModal({ type: 'direction', options })
    }
    function onCaseResolved({ type, playerId, targetPlayerId }: { type: string; playerId: string; targetPlayerId?: string }) {
      if (type === 'red') setCaseModal({ type: 'red', playerId })
      if (type === 'blue' && targetPlayerId) setCaseModal({ type: 'red', playerId: targetPlayerId }) // cible boit
    }
    function onChooseTarget({ sourcePlayerId }: { sourcePlayerId: string }) {
      setCaseModal({ type: 'choose-target', sourcePlayerId })
    }
    function onChooseWhiteAction({ playerId }: { playerId: string }) {
      if (playerId === socket.id) setCaseModal({ type: 'white-choice', playerId })
    }
    function onChooseBlackAction({ playerId }: { playerId: string }) {
      if (playerId === socket.id) setCaseModal({ type: 'black-choice', playerId })
    }
    function onDuelTarget({ targetPlayerId }: { targetPlayerId: string }) {
      setCaseModal({ type: 'duel', targetPlayerId })
    }
    function onShopOpened({ playerId }: { playerId: string }) {
      if (playerId === socket.id) setCaseModal({ type: 'shop', playerId })
    }

    socket.on('error', onError)
    socket.on('choose-direction', onChooseDirection)
    socket.on('case-resolved', onCaseResolved)
    socket.on('choose-target', onChooseTarget)
    socket.on('choose-white-action', onChooseWhiteAction)
    socket.on('choose-black-action', onChooseBlackAction)
    socket.on('duel-target-selected', onDuelTarget)
    socket.on('shop-opened', onShopOpened)

    return () => {
      socket.off('error', onError)
      socket.off('choose-direction', onChooseDirection)
      socket.off('case-resolved', onCaseResolved)
      socket.off('choose-target', onChooseTarget)
      socket.off('choose-white-action', onChooseWhiteAction)
      socket.off('choose-black-action', onChooseBlackAction)
      socket.off('duel-target-selected', onDuelTarget)
      socket.off('shop-opened', onShopOpened)
    }
  }, [socket])

  // Synchroniser les sprites joueurs quand gameState change
  useEffect(() => {
    if (!gameState || !rendererRef.current || !pixiAppRef.current) return

    const board = gameState.board
    const app = pixiAppRef.current
    const renderer = rendererRef.current

    gameState.players.forEach((player, i) => {
      let sprite = spritesRef.current.get(player.id)
      if (!sprite) {
        sprite = new PlayerSprite(app, player, renderer.spriteLayerRef)
        sprite.setColorIndex(i)
        const pos = renderer.getNodePosition(player.position, board)
        sprite.setPosition(pos.x, pos.y)
        spritesRef.current.set(player.id, sprite)
      } else {
        // Mettre à jour la position pour les autres joueurs (téléportation immédiate)
        if (player.id !== socket.id) {
          const pos = renderer.getNodePosition(player.position, board)
          sprite.setPosition(pos.x, pos.y)
        }
      }
      sprite.updatePlayer(player)
    })
  }, [gameState?.players])

  const handlePixiReady = useCallback((app: PIXI.Application) => {
    pixiAppRef.current = app
    const renderer = new BoardRenderer(app)
    rendererRef.current = renderer

    const dice = new DiceAnimation(app)
    diceRef.current = dice

    if (gameState?.board) {
      renderer.render(gameState.board)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render plateau quand l'app est prête et qu'on a le board
  useEffect(() => {
    if (rendererRef.current && gameState?.board) {
      rendererRef.current.render(gameState.board)
    }
  }, [gameState?.board])

  async function handleRollDice() {
    if (!code || diceRolling) return
    setDiceRolling(true)

    socket.once('dice-rolled', async ({ result, targetNodeId }) => {
      await diceRef.current?.play(result)

      // Animer le déplacement
      const sprite = spritesRef.current.get(socket.id!)
      if (sprite && rendererRef.current && gameState) {
        const pos = rendererRef.current.getNodePosition(targetNodeId, gameState.board)
        await sprite.moveTo(pos.x, pos.y)
      }

      socket.emit('movement-complete', { roomCode: code })
      setDiceRolling(false)
    })

    socket.emit('roll-dice', { roomCode: code })
  }

  function handleDirectionChoice(nodeId: number) {
    if (!code) return
    socket.emit('choose-direction', { roomCode: code, nodeId })
    setCaseModal(null)
  }

  function handleTargetChosen(targetPlayerId: string) {
    if (!code) return
    socket.emit('target-chosen', { roomCode: code, targetPlayerId })
    setCaseModal(null)
  }

  function handleWhiteAction(choice: 'money' | 'drink') {
    if (!code) return
    socket.emit('white-action-chosen', { roomCode: code, choice })
    setCaseModal(null)
  }

  function handleBlackAction(choice: 'money' | 'drink') {
    if (!code) return
    socket.emit('black-action-chosen', { roomCode: code, choice })
    setCaseModal(null)
  }

  function handleBuyPinte() {
    if (!code) return
    socket.emit('buy-pinte', { roomCode: code })
    setCaseModal(null)
  }

  if (!gameState) return null

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isMinigame = gameState.phase === 'minigame'

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Canvas Pixi.js */}
      <PixiApp onReady={handlePixiReady} />

      {/* HUD overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* MoneyBar en bas */}
        <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-auto">
          {myPlayer && <MoneyBar money={myPlayer.money} />}
        </div>

        {/* Toggle classement */}
        <div className="absolute top-3 right-3 pointer-events-auto">
          <button
            className="bg-white/10 rounded-xl px-3 py-2 text-white text-sm"
            onClick={() => setShowPlayers(!showPlayers)}
          >
            🏆
          </button>
        </div>

        {/* Classement */}
        {showPlayers && (
          <div className="absolute top-12 right-3 pointer-events-auto">
            <PlayerList players={gameState.players} />
          </div>
        )}

        {/* Indicateur tour */}
        <div className="absolute top-3 left-3 bg-black/60 rounded-xl px-3 py-2">
          <p className="text-white text-xs">Round {gameState.round}/{gameState.maxRounds}</p>
          <p className="text-yellow-400 text-xs font-bold">
            {isMyTurn ? '🎲 Ton tour !' : `Tour de ${currentPlayer?.name}`}
          </p>
        </div>
      </div>

      {/* Bouton lancer le dé */}
      {isMyTurn && gameState.phase === 'playing' && !caseModal && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <button
            className="px-10 py-4 bg-indigo-600 rounded-2xl text-white font-bold text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50"
            onClick={handleRollDice}
            disabled={diceRolling}
          >
            {diceRolling ? '🎲 ...' : '🎲 Lancer'}
          </button>
        </div>
      )}

      {/* Modals résolution de case */}
      {caseModal && (
        <CaseModalOverlay
          modal={caseModal}
          players={gameState.players}
          myPlayer={myPlayer}
          onClose={() => setCaseModal(null)}
          onDirectionChoice={handleDirectionChoice}
          onTargetChosen={handleTargetChosen}
          onWhiteAction={handleWhiteAction}
          onBlackAction={handleBlackAction}
          onBuyPinte={handleBuyPinte}
        />
      )}

      {/* Mini-jeux */}
      {isMinigame && (
        <MinigameRouter
          gameState={gameState}
          myPlayerId={socket.id!}
          roomCode={code!}
        />
      )}

      <ToastContainer />
    </div>
  )
}

// --- Overlay modal résolution de case ---
interface CaseModalProps {
  modal: NonNullable<CaseModal>
  players: IPlayer[]
  myPlayer: IPlayer | null
  onClose: () => void
  onDirectionChoice: (nodeId: number) => void
  onTargetChosen: (id: string) => void
  onWhiteAction: (choice: 'money' | 'drink') => void
  onBlackAction: (choice: 'money' | 'drink') => void
  onBuyPinte: () => void
}

function CaseModalOverlay({
  modal, players, myPlayer,
  onClose, onDirectionChoice, onTargetChosen, onWhiteAction, onBlackAction, onBuyPinte,
}: CaseModalProps) {
  const getPlayer = (id: string) => players.find(p => p.id === id)

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center px-6 z-40">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-xs text-center flex flex-col gap-4">

        {modal.type === 'red' && (
          <>
            <p className="text-4xl">🍺</p>
            <p className="text-white font-bold text-lg">
              {getPlayer(modal.playerId)?.name || 'Un joueur'} boit 3 gorgées !
            </p>
            <button className="w-full py-3 bg-red-600 rounded-xl text-white font-bold" onClick={onClose}>OK</button>
          </>
        )}

        {modal.type === 'direction' && (
          <>
            <p className="text-white font-bold text-lg">Choisir une direction</p>
            <div className="flex flex-col gap-2">
              {modal.options.map((nodeId, i) => (
                <button
                  key={nodeId}
                  className="w-full py-3 bg-indigo-600 rounded-xl text-white font-bold"
                  onClick={() => onDirectionChoice(nodeId)}
                >
                  Chemin {i + 1} (case {nodeId})
                </button>
              ))}
            </div>
          </>
        )}

        {modal.type === 'choose-target' && (
          <>
            <p className="text-white font-bold text-lg">Choisir un joueur à arroser 💧</p>
            <div className="flex flex-col gap-2">
              {players.filter(p => p.id !== myPlayer?.id && p.isConnected).map(player => (
                <button
                  key={player.id}
                  className="w-full py-3 bg-blue-600 rounded-xl text-white font-bold flex items-center gap-3 px-4"
                  onClick={() => onTargetChosen(player.id)}
                >
                  <span>{player.avatar || '❓'}</span>
                  <span>{player.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {modal.type === 'white-choice' && (
          <>
            <p className="text-4xl">⬜</p>
            <p className="text-white font-bold text-lg">Case blanche — Choisis :</p>
            <button className="w-full py-3 bg-green-600 rounded-xl text-white font-bold" onClick={() => onWhiteAction('money')}>
              +15 🪙 Monnaie
            </button>
            <button className="w-full py-3 bg-blue-600 rounded-xl text-white font-bold" onClick={() => onWhiteAction('drink')}>
              Donner 3 gorgées à quelqu'un
            </button>
          </>
        )}

        {modal.type === 'black-choice' && (
          <>
            <p className="text-4xl">⬛</p>
            <p className="text-white font-bold text-lg">Case noire — Choisis :</p>
            <button className="w-full py-3 bg-red-700 rounded-xl text-white font-bold" onClick={() => onBlackAction('money')}>
              -15 🪙 Monnaie
            </button>
            <button className="w-full py-3 bg-orange-600 rounded-xl text-white font-bold" onClick={() => onBlackAction('drink')}>
              Boire 3 gorgées
            </button>
          </>
        )}

        {modal.type === 'duel' && (
          <>
            <p className="text-4xl">⚔️</p>
            <p className="text-white font-bold text-lg">DUEL !</p>
            <p className="text-yellow-400">
              {getPlayer(modal.targetPlayerId)?.avatar || '❓'} {getPlayer(modal.targetPlayerId)?.name} est désigné(e) !
            </p>
            <p className="text-white/60 text-sm">Le perdant boit 5 gorgées</p>
            <button className="w-full py-3 bg-purple-600 rounded-xl text-white font-bold" onClick={onClose}>OK</button>
          </>
        )}

        {modal.type === 'shop' && (
          <>
            <p className="text-4xl">🏪</p>
            <p className="text-white font-bold text-lg">Boutique</p>
            <p className="text-white/60 text-sm">1 Pinte = 100 🪙</p>
            {myPlayer && myPlayer.money >= 100 ? (
              <button className="w-full py-3 bg-yellow-600 rounded-xl text-white font-bold" onClick={onBuyPinte}>
                Acheter 1 Pinte 🍺 (100 🪙)
              </button>
            ) : (
              <p className="text-red-400 text-sm">Pas assez de monnaie</p>
            )}
            <button className="w-full py-3 bg-white/10 rounded-xl text-white" onClick={onClose}>Fermer</button>
          </>
        )}

      </div>
    </div>
  )
}
