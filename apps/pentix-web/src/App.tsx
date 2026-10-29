import { Board, DEFAULT_BOARD_SIZE, PIECE_CATALOG, Piece } from '#pentix/core'

import './App.css'

function App() {
  const previewPieces = PIECE_CATALOG.slice(0, 6).map(
    (definition) => new Piece(definition),
  )
  const previewBoard = new Board(
    DEFAULT_BOARD_SIZE.width,
    DEFAULT_BOARD_SIZE.height,
  )

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Pentix Foundation</p>
        <h1>Shared game primitives are in place.</h1>
        <p className="lede">
          The browser app and PentixServer now share the same TypeScript piece
          and board model, ported from the legacy Delphi source.
        </p>
      </section>

      <section className="summary">
        <article className="card">
          <p className="label">Board</p>
          <strong>
            {previewBoard.width} x {previewBoard.height}
          </strong>
          <span>Default Pentix playfield size from the shared core package.</span>
        </article>
        <article className="card">
          <p className="label">Catalog</p>
          <strong>{PIECE_CATALOG.length} legacy pieces</strong>
          <span>All Delphi piece definitions are available to both apps.</span>
        </article>
        <article className="card">
          <p className="label">Server</p>
          <strong>Lifecycle ready</strong>
          <span>PentixServer can create games, start sessions, and advance pieces.</span>
        </article>
      </section>

      <section className="catalog">
        <div className="catalog-copy">
          <p className="eyebrow">Preview</p>
          <h2>First pieces from the shared catalog</h2>
          <p>
            Each piece stores mino offsets relative to the rotation origin. The
            legacy Delphi `5Corner` exception is preserved exactly.
          </p>
        </div>

        <div className="catalog-grid">
          {previewPieces.map((piece) => (
            <article className="piece-card" key={piece.key}>
              <header>
                <strong>{piece.key}</strong>
                <span>{piece.colorName}</span>
              </header>
              <p>{piece.minoCount} minos</p>
              <code>{piece.offsets.map(({ x, y }) => `(${x},${y})`).join(' ')}</code>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
