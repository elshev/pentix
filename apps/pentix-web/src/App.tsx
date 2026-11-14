import { DEFAULT_BOARD_SIZE, PIECE_CATALOG } from '#pentix/core'

import { Game } from './games/pentix/Game.tsx'

import './App.css'

function App() {
  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">Pentix</p>
        <h1>Play the rebuilt classic.</h1>
        <p className="lede">
          A {DEFAULT_BOARD_SIZE.width}×{DEFAULT_BOARD_SIZE.height} board and{' '}
          {PIECE_CATALOG.length} legacy pieces from the shared <code>pentix-core</code>, now
          playable in the browser. Arrow keys move, <code>Up</code>/<code>Z</code> rotates,{' '}
          <code>Space</code> hard-drops, and <code>P</code> pauses.
        </p>
      </header>
      <Game />
    </main>
  )
}

export default App