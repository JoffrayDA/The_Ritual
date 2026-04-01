import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import { useGameState } from '../hooks/useGameState'
import { showToast, ToastContainer } from './ui/Toast'
import { Spinner } from './ui/Spinner'

const AVATARS = ['🐸', '🦊', '🦆', '🦝', '🐙', '🐻', '🐯', '🐼']

export default function Lobby() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { socket } = useSocket()
  const { gameState, myPlayer, isHost } = useGameState()

  useEffect(() => {
    function onError({ message }: { message: string }) {
      showToast(message, 'error')
    }
    function onFatalError({ message }: { message: string }) {
      showToast(message, 'error')
      setTimeout(() => navigate('/'), 2000)
    }
    function onHostDisconnected({ message }: { message: string }) {
      showToast(message, 'info')
    }
    socket.on('error', onError)
    socket.on('fatal-error', onFatalError)
    socket.on('host-disconnected', onHostDisconnected)
    return () => {
      socket.off('error', onError)
      socket.off('fatal-error', onFatalError)
      socket.off('host-disconnected', onHostDisconnected)
    }
  }, [socket, navigate])

  // Redirect quand la partie commence
  useEffect(() => {
    if (gameState?.phase === 'playing') {
      navigate(`/game/${gameState.roomCode}`, { replace: true })
    }
  }, [gameState?.phase, gameState?.roomCode, navigate])

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={32} />
      </div>
    )
  }

  function selectAvatar(avatar: string) {
    if (!code) return
    socket.emit('select-avatar', { roomCode: code, avatar })
  }

  function startGame() {
    if (!code) return
    socket.emit('start-game', { roomCode: code })
  }

  const canStart = isHost && gameState.players.length >= 2

  return (
    <div className="flex flex-col h-full px-4 py-6 gap-4">
      {/* Code salle */}
      <div className="text-center">
        <p className="text-white/50 text-xs uppercase tracking-widest">Code de la salle</p>
        <p className="text-4xl font-bold font-mono tracking-widest text-yellow-400">{gameState.roomCode}</p>
        <p className="text-white/40 text-xs mt-1">{gameState.players.length}/8 joueurs</p>
      </div>

      {/* Liste joueurs */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {gameState.players.map(player => (
          <div
            key={player.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl ${player.id === myPlayer?.id ? 'bg-indigo-600/40 border border-indigo-400/40' : 'bg-white/5'}`}
          >
            <span className="text-2xl">{player.avatar || '❓'}</span>
            <span className="flex-1 text-white font-medium">{player.name}</span>
            {gameState.hostId === player.id && (
              <span className="text-yellow-400 text-xs">Hôte</span>
            )}
            {!player.isConnected && (
              <span className="text-red-400 text-xs">Déconnecté</span>
            )}
          </div>
        ))}
      </div>

      {/* Sélection avatar */}
      {myPlayer && (
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2 text-center">Ton avatar</p>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map(emoji => (
              <button
                key={emoji}
                className={`text-3xl py-2 rounded-xl active:scale-95 transition-transform ${myPlayer.avatar === emoji ? 'bg-indigo-600' : 'bg-white/10'}`}
                onClick={() => selectAvatar(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bouton lancer */}
      {isHost && (
        <button
          className="w-full py-4 bg-green-600 rounded-2xl text-white font-bold text-lg active:scale-95 transition-transform disabled:opacity-40 disabled:scale-100"
          onClick={startGame}
          disabled={!canStart}
        >
          {gameState.players.length < 2 ? 'Attendre 1 joueur de plus...' : '🎲 Lancer la partie !'}
        </button>
      )}
      {!isHost && (
        <p className="text-center text-white/40 text-sm py-4">En attente du lancement par l'hôte…</p>
      )}

      <ToastContainer />
    </div>
  )
}
