/** Root shell rendering the PENTIX wordmark and the Pentix game. */
import { Game } from './games/pentix/Game.tsx'

import './App.css'

function App() {
  return (
    <main className="shell">
      <header className="hero">
        <h1 className="hero__wordmark">PENTIX</h1>
      </header>
      <Game />
    </main>
  )
}

export default App