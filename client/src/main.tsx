import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode désactivé intentionnellement — évite la double-initialisation de Pixi.js en dev
createRoot(document.getElementById('root')!).render(<App />)
