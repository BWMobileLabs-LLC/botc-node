export async function readScriptArrayResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || body.message || `Request failed (${res.status})`)
  }
  const data = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response from server.')
  }
  return data
}

export function mergeBaseAndCatalog(baseList, catalogList) {
  const base = Array.isArray(baseList) ? baseList : []
  const more = Array.isArray(catalogList) ? catalogList : []
  const baseIds = new Set(base.map((s) => String(s?.id)))
  return [...base, ...more.filter((s) => s != null && !baseIds.has(String(s.id)))]
}

export async function fetchScriptsFromUrl(url) {
  const res = await fetch(url)
  return readScriptArrayResponse(res)
}

export async function fetchDefaultScriptList() {
  const [baseRes, catalogRes] = await Promise.all([
    fetch('/api/scripts/base-scripts'),
    fetch('/api/scripts/'),
  ])
  const base = await readScriptArrayResponse(baseRes)
  const catalog = await readScriptArrayResponse(catalogRes)
  return mergeBaseAndCatalog(base, catalog)
}
