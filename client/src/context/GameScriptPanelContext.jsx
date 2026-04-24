import { createContext, useContext, useMemo, useState } from 'react'

const GameScriptPanelContext = createContext(null)

export function GameScriptPanelProvider({ children }) {
  const [scriptDetail, setScriptDetail] = useState(null)
  const value = useMemo(() => ({ scriptDetail, setScriptDetail }), [scriptDetail])
  return <GameScriptPanelContext.Provider value={value}>{children}</GameScriptPanelContext.Provider>
}

export function useGameScriptPanel() {
  const ctx = useContext(GameScriptPanelContext)
  if (!ctx) {
    throw new Error('useGameScriptPanel must be used within GameScriptPanelProvider')
  }
  return ctx
}
