import { useEffect, useRef, useState } from 'react'
import type { CatalogEntry } from '../content/format'
import { messages } from '../messages'
import type { CatalogState } from './App'
import styles from './ContentMenu.module.css'

export interface ContentMenuProps {
  catalog: CatalogState
  onOpenLesson: (entry: CatalogEntry) => void
  onOpenAbout: () => void
}

const groupByCategory = (entries: CatalogEntry[]): [string, CatalogEntry[]][] => {
  const groups = new Map<string, CatalogEntry[]>()
  for (const entry of entries) {
    groups.set(entry.category, [...(groups.get(entry.category) ?? []), entry])
  }
  return [...groups]
}

export const ContentMenu = ({ catalog, onOpenLesson, onOpenAbout }: ContentMenuProps) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const renderMenu = () => {
    if (catalog.status === 'loading') return <p className={styles.note}>{messages.contentsLoading}</p>
    if (catalog.status === 'error') return <p className={styles.note}>{messages.contentsError}</p>
    if (catalog.catalog.lessons.length === 0) return <p className={styles.note}>{messages.noContents}</p>
    return groupByCategory(catalog.catalog.lessons).map(([category, entries]) => (
      <section key={category} className={styles.group}>
        <h2 className={styles.category}>{category}</h2>
        <ul className={styles.list}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={styles.item}
                onClick={() => {
                  setOpen(false)
                  onOpenLesson(entry)
                }}
              >
                <span className={styles.itemTitle}>{entry.title}</span>
                {entry.summary && <span className={styles.itemSummary}>{entry.summary}</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>
    ))
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        {messages.contents}
      </button>
      {open && (
        <div className={styles.dropdown} role="region" aria-label={messages.contents}>
          {renderMenu()}
        </div>
      )}
      <button type="button" className={styles.menuButton} onClick={onOpenAbout}>
        {messages.about}
      </button>
    </div>
  )
}
