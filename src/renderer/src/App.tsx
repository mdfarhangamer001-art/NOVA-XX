import React, { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import IndexRoot from './NovaXRoot'
import { Preloader } from './components/Preloader'

const App = () => {
  const [loading, setLoading] = useState(true)

  return (
    <>
      <AnimatePresence>
        {loading && <Preloader key="preloader" onComplete={() => setLoading(false)} />}
      </AnimatePresence>
      
      {!loading && (
        <div style={{ animation: 'fadeIn 1s ease-in-out' }}>
          <IndexRoot />
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}

export default App
