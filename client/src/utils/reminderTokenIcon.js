/**
 * Maps `reminder_tokens/<basename>.png` files to resolved Vite asset URLs.
 */
const reminderPngByBasename = (() => {
  const modules = import.meta.glob('../assets/reminder_tokens/*.png', {
    eager: true,
    import: 'default',
  })
  const map = Object.create(null)
  for (const fullPath of Object.keys(modules)) {
    const m = fullPath.match(/\/reminder_tokens\/(.+)\.png$/i)
    if (m) map[m[1].toLowerCase()] = modules[fullPath]
  }
  return map
})()

function characterSlug(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function textSlugUnderscore(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function textSlugCompact(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Basename keys (without `.png`) to try against `reminder_tokens/`, most specific first.
 */
export function reminderImageBasenameCandidates(characterName, text) {
  const c = characterSlug(characterName)
  const raw = String(text ?? '').trim()
  const tUnder = textSlugUnderscore(raw)
  const tOne = textSlugCompact(raw)

  const seen = new Set()
  const out = []
  const push = (key) => {
    const k = String(key).toLowerCase()
    if (!k || seen.has(k)) return
    seen.add(k)
    out.push(k)
  }

  if (c && tUnder) push(`${c}_${tUnder}`)
  if (c && tOne && `${c}_${tOne}` !== `${c}_${tUnder}`) push(`${c}_${tOne}`)
  if (c) push(c)
  if (tUnder) push(tUnder)
  if (tOne && tOne !== tUnder.replace(/_/g, '')) push(tOne)

  return out
}

/**
 * Resolved Vite URL for a reminder token image, or null if no file matches.
 */
export function getReminderTokenIconSrc(characterName, text) {
  for (const key of reminderImageBasenameCandidates(characterName, text)) {
    const url = reminderPngByBasename[key]
    if (url) return url
  }
  return null
}
