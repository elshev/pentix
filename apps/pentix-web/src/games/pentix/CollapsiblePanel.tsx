/** A titled panel whose body can be collapsed; the small variant uses a smaller font. */
import { useState, type ReactNode } from 'react'

interface CollapsiblePanelProps {
  readonly title: string
  readonly defaultOpen?: boolean
  readonly small?: boolean
  readonly children: ReactNode
}

export function CollapsiblePanel({
  title,
  defaultOpen = true,
  small = false,
  children,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={small ? 'panel panel--small' : 'panel'}>
      <button
        type="button"
        className="panel__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="panel__title">{title}</span>
        <span className="panel__chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className="panel__body">{children}</div>}
    </section>
  )
}