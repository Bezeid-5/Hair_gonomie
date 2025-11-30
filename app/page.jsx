'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Charger les composants Three.js dynamiquement (côté client uniquement)
const HairGonomieApp = dynamic(() => import('../components/HairGonomieApp'), {
  ssr: false,
  loading: () => (
    <div className="loader">
      <div className="loader-content">
        <div className="loader-shape"></div>
        <p>Chargement de l'expérience...</p>
      </div>
    </div>
  )
})

export default function Home() {
  return <HairGonomieApp />
}

