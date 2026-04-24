import { useMemo } from 'react'
import { getCharacterIconSrc } from '../utils/characterIcon.js'
import './GameScriptPanelSidebar.css'

const CHARACTER_TYPE_ORDER = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller']

function formatTypeLabel(type) {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function groupCharactersByType(characters) {
  const buckets = new Map()
  for (const c of characters) {
    if (!buckets.has(c.type)) buckets.set(c.type, [])
    buckets.get(c.type).push(c)
  }

  const seen = new Set()
  const sections = []

  for (const t of CHARACTER_TYPE_ORDER) {
    const list = buckets.get(t)
    if (list?.length) {
      sections.push({ type: t, characters: list })
      seen.add(t)
    }
  }

  for (const t of buckets.keys()) {
    if (!seen.has(t)) {
      const list = buckets.get(t)
      if (list?.length) sections.push({ type: t, characters: list })
    }
  }

  return sections
}

export function GameScriptPanelSidebar({ detail, onClose }) {
  const sections = useMemo(
    () => (detail?.characters?.length ? groupCharactersByType(detail.characters) : []),
    [detail]
  )

  if (!detail) return null

  return (
    <div className="game-script-panel">
      <div className="game-script-panel__head">
        <h2 className="game-script-panel__title">{detail.name ?? 'Script'}</h2>
        {onClose && (
          <button type="button" className="game-script-panel__close" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      <div className="game-script-panel__body">
        {sections.map(({ type, characters }) => (
          <section key={type} className="game-script-panel__section">
            <h3 className="game-script-panel__type">{formatTypeLabel(type)}</h3>
            <ul className="game-script-panel__list">
              {characters.map((c) => {
                const iconSrc = getCharacterIconSrc(c)
                return (
                  <li key={c.id} className="game-script-panel__row">
                    <div className="game-script-panel__icon-wrap">
                      {iconSrc ? (
                        <img
                          className="game-script-panel__icon"
                          src={iconSrc}
                          alt=""
                          width={44}
                          height={44}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="game-script-panel__icon-placeholder" aria-hidden />
                      )}
                    </div>
                    <div className="game-script-panel__text">
                      <div className="game-script-panel__char-name">{c.name}</div>
                      <p className="game-script-panel__ability">{c.ability}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
