/**
 * Maps API character_type to asset subfolder under src/assets/.
 */
const TYPE_TO_ASSET_FOLDER = {
  townsfolk: 'townsfolk',
  outsider: 'outsiders',
  minion: 'minions',
  demon: 'demons',
  traveller: 'travellers',
}

/**
 * Normalizes a character name to the slug used in icon filenames (Icon_<slug>.png).
 */
export function nameToIconSlug(name) {
  return name
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

const iconByFolderSlug = (() => {
  const modules = import.meta.glob('../assets/*/*.png', {
    eager: true,
    import: 'default',
  })
  const map = Object.create(null)
  for (const fullPath of Object.keys(modules)) {
    const m = fullPath.match(
      /\/(townsfolk|outsiders|minions|demons|travellers)\/Icon_(.+)\.png$/i
    )
    if (m) {
      const folder = m[1].toLowerCase()
      const slug = m[2].toLowerCase()
      map[`${folder}/${slug}`] = modules[fullPath]
    }
  }
  return map
})()

/**
 * Resolved image URL for Vite, or null if no matching file.
 */
export function getCharacterIconSrc(character) {
  const folder = TYPE_TO_ASSET_FOLDER[character.type]
  if (!folder) return null
  const slug = nameToIconSlug(character.name)
  const key = `${folder}/${slug}`
  return iconByFolderSlug[key] ?? null
}
