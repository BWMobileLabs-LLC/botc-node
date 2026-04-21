import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import CharactersPage from './pages/CharactersPage.jsx'
import HomePage from './pages/HomePage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/characters" element={<CharactersPage />} />
      </Route>
    </Routes>
  )
}
