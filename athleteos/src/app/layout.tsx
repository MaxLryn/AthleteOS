import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AthleteOS — Suivi de Performance Sportive',
  description: 'Ton cockpit personnel de performance sportive',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
