import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: "Hair'gonomie - Navigation 3D Innovante",
  description: "Une expérience de navigation révolutionnaire avec une interface 3D interactive",
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <Script 
          src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  )
}

