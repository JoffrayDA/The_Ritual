import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket, saveSession } from '../hooks/useSocket'
import { useGameState } from '../hooks/useGameState'
import { Spinner } from './ui/Spinner'
import { showToast, ToastContainer } from './ui/Toast'

type Mode = 'choose' | 'create' | 'join'

export default function Home() {
  const navigate = useNavigate()
  const { socket, isConnected } = useSocket()
  const { gameState } = useGameState()
  const [mode, setMode] = useState<Mode>('choose')
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Redirect dans useEffect (jamais pendant le render)
  useEffect(() => {
    if (gameState && gameState.phase === 'lobby') {
      navigate(`/lobby/${gameState.roomCode}`, { replace: true })
    }
  }, [gameState, navigate])

  function handleCreate() {
    if (!playerName.trim()) { showToast('Entre ton prénom', 'error'); return }
    if (!isConnected) { showToast('Connexion au serveur en cours…', 'info'); return }
    setIsLoading(true)
    saveSession('', playerName.trim())
    socket.emit('create-room', { playerName: playerName.trim() })
  }

  function handleJoin() {
    if (!playerName.trim()) { showToast('Entre ton prénom', 'error'); return }
    if (roomCode.length !== 4) { showToast('Le code fait 4 lettres', 'error'); return }
    if (!isConnected) { showToast('Connexion au serveur en cours…', 'info'); return }
    setIsLoading(true)
    socket.emit('join-room', { roomCode: roomCode.toUpperCase(), playerName: playerName.trim() })
  }

  // Écouter les erreurs pour stopper le spinner
  useEffect(() => {
    function onError({ message }: { message: string }) {
      setIsLoading(false)
      showToast(message, 'error')
    }
    function onFatalError({ message }: { message: string }) {
      setIsLoading(false)
      showToast(message, 'error')
    }
    socket.on('error', onError)
    socket.on('fatal-error', onFatalError)
    return () => {
      socket.off('error', onError)
      socket.off('fatal-error', onFatalError)
    }
  }, [socket])

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-6">
      <div className="text-center">
        <div className="text-5xl mb-2">🍺</div>
        <h1 className="text-3xl font-bold text-white">Tournée Générale</h1>
        <p className={`text-sm mt-1 ${isConnected ? 'text-green-400' : 'text-white/40'}`}>
          {isConnected ? '● connecté' : '○ connexion...'}
        </p>
      </div>

      {mode === 'choose' && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            className="w-full py-4 bg-indigo-600 rounded-2xl text-white font-bold text-lg active:scale-95 transition-transform"
            onClick={() => setMode('create')}
          >
            Créer une salle
          </button>
          <button
            className="w-full py-4 bg-white/10 rounded-2xl text-white font-bold text-lg active:scale-95 transition-transform"
            onClick={() => setMode('join')}
          >
            Rejoindre
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input
            className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder-white/40 text-center text-lg outline-none"
            placeholder="Ton prénom"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={16}
            autoFocus
          />
          <button
            className="w-full py-4 bg-indigo-600 rounded-2xl text-white font-bold text-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={handleCreate}
            disabled={isLoading}
          >
            {isLoading ? <Spinner size={20} /> : 'Créer la salle'}
          </button>
          <button className="text-white/40 text-sm" onClick={() => setMode('choose')}>← Retour</button>
        </div>
      )}

      {mode === 'join' && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input
            className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder-white/40 text-center text-lg outline-none"
            placeholder="Ton prénom"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={16}
          />
          <input
            className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder-white/40 text-center text-2xl font-mono tracking-widest outline-none uppercase"
            placeholder="CODE"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
            maxLength={4}
            autoCapitalize="characters"
          />
          <button
            className="w-full py-4 bg-indigo-600 rounded-2xl text-white font-bold text-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={handleJoin}
            disabled={isLoading}
          >
            {isLoading ? <Spinner size={20} /> : 'Rejoindre'}
          </button>
          <button className="text-white/40 text-sm" onClick={() => setMode('choose')}>← Retour</button>
        </div>
      )}

      <ToastContainer />
    </div>
  )
}
