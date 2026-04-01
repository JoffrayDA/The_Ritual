import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './components/Home'
import Lobby from './components/Lobby'
import GameBoard from './components/GameBoard'
import GameOver from './components/GameOver'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:code" element={<Lobby />} />
        <Route path="/game/:code" element={<GameBoard />} />
        <Route path="/game-over" element={<GameOver />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
