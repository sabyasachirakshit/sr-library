import { useState } from 'react'
import PinScreen from './components/PinScreen'

function AppContent() {
  return (
    <div className="p-6 text-[var(--text-h)]">
      <h1 className="text-2xl font-semibold">App Content</h1>
    </div>
  )
}

function App() {
  const [unlocked, setUnlocked] = useState(false)

  if (!unlocked) {
    return <PinScreen onUnlock={() => setUnlocked(true)} />
  }

  return <AppContent />
}

export default App
