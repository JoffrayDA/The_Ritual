import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

// Socket singleton — créé une seule fois
export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
})

export function useSocket() {
  const [isConnected, setIsConnected] = useState(socket.connected)

  useEffect(() => {
    if (!socket.connected) socket.connect()

    function onConnect() {
      setIsConnected(true)

      // Tentative de reconnexion automatique si session active
      const roomCode = sessionStorage.getItem('tg_roomCode')
      const playerName = sessionStorage.getItem('tg_playerName')
      if (roomCode && playerName) {
        socket.emit('reconnect-to-room', { roomCode, playerName })
      }
    }

    function onDisconnect() {
      setIsConnected(false)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  return { socket, isConnected }
}

export function saveSession(roomCode: string, playerName: string) {
  sessionStorage.setItem('tg_roomCode', roomCode)
  sessionStorage.setItem('tg_playerName', playerName)
}

export function clearSession() {
  sessionStorage.removeItem('tg_roomCode')
  sessionStorage.removeItem('tg_playerName')
}
