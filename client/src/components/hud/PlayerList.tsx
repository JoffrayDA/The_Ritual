import type { IPlayer } from '../../types/game.types'

interface PlayerListProps {
  players: IPlayer[]
}

export default function PlayerList({ players }: PlayerListProps) {
  const sorted = [...players].sort((a, b) => {
    if (b.pintes !== a.pintes) return b.pintes - a.pintes
    return b.money - a.money
  })

  return (
    <div className="bg-black/80 rounded-2xl px-3 py-2 flex flex-col gap-1 min-w-[160px]">
      <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Classement</p>
      {sorted.map((player, i) => (
        <div key={player.id} className="flex items-center gap-2">
          <span className="text-white/40 text-xs w-4">#{i + 1}</span>
          <span className="text-sm">{player.avatar || '❓'}</span>
          <span className="text-white text-xs flex-1 truncate max-w-[80px]">{player.name}</span>
          <span className="text-yellow-400 text-xs font-bold">🍺{player.pintes}</span>
          {!player.isConnected && <span className="text-red-400 text-xs">●</span>}
        </div>
      ))}
    </div>
  )
}
