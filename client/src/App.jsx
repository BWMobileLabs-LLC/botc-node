import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import AuthPage from './pages/AuthPage.jsx'
import CharactersPage from './pages/CharactersPage.jsx'
import CreateScriptPage from './pages/CreateScriptPage.jsx'
import HomePage from './pages/HomePage.jsx'
import MyScriptsPage from './pages/MyScriptsPage.jsx'
import ScriptDetailPage from './pages/ScriptDetailPage.jsx'
import ScriptsPage from './pages/ScriptsPage.jsx'
import GamePage from './pages/GamePage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/my-scripts" element={<MyScriptsPage />} />
        <Route path="/scripts" element={<ScriptsPage />} />
        <Route path="/scripts/new" element={<CreateScriptPage />} />
        <Route path="/scripts/:scriptId/edit" element={<CreateScriptPage />} />
        <Route path="/scripts/:scriptId" element={<ScriptDetailPage />} />
        <Route path="/auth" element={<AuthPage />} />
      </Route>
    </Routes>
  )
}
