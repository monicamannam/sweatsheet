(function () {
  const VERSION = 1
  const PREFIX = 'sweatsheet:'
  const ACCESS_STORAGE_NAME = `${PREFIX}access:v${VERSION}`

  function key(name, id) {
    return `${PREFIX}${name}:v${VERSION}:${id}`
  }

  function dirtyKey(name, id) {
    return `${PREFIX}${name}:dirty:${id}`
  }

  function readKey(storageKey) {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null') } catch { return null }
  }

  function writeKey(storageKey, value) {
    try { localStorage.setItem(storageKey, JSON.stringify(value)) } catch {}
  }

  function removeKey(storageKey) {
    try { localStorage.removeItem(storageKey) } catch {}
  }

  function read(name, id) {
    const cached = readKey(key(name, id))
    return cached?.version === VERSION ? cached : null
  }

  function write(name, id, value) {
    if (!id) return
    writeKey(key(name, id), { version: VERSION, savedAt: Date.now(), ...value })
  }

  function markDirty(name, id) {
    if (id) writeKey(dirtyKey(name, id), Date.now())
  }

  function isDirty(name, id) {
    return !!readKey(dirtyKey(name, id))
  }

  function clearDirty(name, id) {
    removeKey(dirtyKey(name, id))
  }

  function param(name) {
    return new URLSearchParams(location.search).get(name) || ''
  }

  function accessSignature() {
    const params = new URLSearchParams(location.search)
    for (const name of ['day', 'set', 'user', 'cardio']) params.delete(name)
    return params.toString()
  }

  function canRestore() {
    try { return sessionStorage.getItem(ACCESS_STORAGE_NAME) === accessSignature() } catch { return false }
  }

  function navigationType() {
    const entry = performance.getEntriesByType?.('navigation')?.[0]
    if (entry?.type) return entry.type
    return performance.navigation?.type === 1 ? 'reload' : 'navigate'
  }

  function isExplicitReload() {
    return !document.wasDiscarded && navigationType() === 'reload'
  }

  function paintHtml(name, id, selectors) {
    if (!canRestore()) return false
    if (!id) return false
    const cached = read(name, id)
    if (!cached) return false

    for (const [selector, htmlKey] of Object.entries(selectors)) {
      const el = document.querySelector(selector)
      const html = cached[htmlKey]
      if (!el || !html) continue
      el.innerHTML = html
      el.querySelectorAll('button[disabled]').forEach(button => { button.disabled = false })
      el.classList?.remove('hidden')
    }
    return true
  }

  window.SweatSheetCache = {
    read,
    write,
    markDirty,
    isDirty,
    clearDirty,
    param,
    canRestore,
    isExplicitReload,
    paintHtml,
  }
})()
