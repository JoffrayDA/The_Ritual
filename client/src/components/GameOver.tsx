import { useNavigate } from 'react-router-dom'
import { useGameState } from '../hooks/useGameState'
import { useSocket, clearSession } from '../hooks/useSocket'
import { useParams } from 'react-router-dom'

export default function GameOver() {
  const navigate = useNavigate()
  const { gameState } = useGameState()
  const { socket } = useSocket()
  const { code } = useParams<{ code?: string }>()

  function handleReplay() {
    if (gameState?.roomCode || code) {
      socket.emit('leave-room', { roomCode: gameState?.roomCode || code! })
    }
    clearSession()
    navigate('/', { replace: true })
  }

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <h1 className="text-3xl font-bold text-white">Fin de partie !</h1>
        <button
          className="w-full max-w-xs py-4 bg-indigo-600 rounded-2xl text-white font-bold text-lg active:scale-95"
          onClick={handleReplay}
        >
          Rejouer
        </button>
      </div>
    )
  }

  const sorted = [...gameState.players].sort((a, b) => {
    if (b.pintes !== a.pintes) return b.pintes - a.pintes
    return b.money - a.money
  })

  const winner = sorted[0]

  return (
    <div className="flex flex-col h-full px-4 py-8 gap-6">
      <div className="text-center">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="text-2xl font-bold text-white">{winner?.name} remporte la partie</h1>
        <p className="text-yellow-400 font-medium mt-1">
          {winner?.pintes} pinte{winner?.pintes !== 1 ? 's' : ''} !
        </p>
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {sorted.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl ${i === 0 ? 'bg-yellow-500/20 border border-yellow-400/40' : 'bg-white/5'}`}
          >
            <span className="text-xl font-bold text-white/50 w-6">#{i + 1}</span>
            <span className="text-2xl">{player.avatar || '❓'}</span>
            <div className="flex-1">
              <p className="text-white font-medium">{player.name}</p>
              <p className="text-white/40 text-xs">{player.money} 🪙</p>
            </div>
            <p className="text-yellow-400 font-bold">🍺 ×{player.pintes}</p>
          </div>
        ))}
      </div>

      <button
        className="w-full py-4 bg-indigo-600 rounded-2xl text-white font-bold text-lg active:scale-95 transition-transform"
        onClick={handleReplay}
      >
        Rejouer
      </button>
    </div>
  )
}
