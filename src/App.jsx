import { useState } from 'react'
import PinScreen from './components/PinScreen'
import AppContent from './components/AppContent'

function App() {
  const [unlocked, setUnlocked] = useState(false)

  if (!unlocked) {
    return <PinScreen onUnlock={() => setUnlocked(true)} />
  }

  return <AppContent onLock={() => setUnlocked(false)} />
}

export default App
