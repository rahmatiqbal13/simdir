import './globals.css'
import { AgendaProvider } from '@/context/AgendaContext'

export const metadata = {
  title: "SIMDIR - Sistem Informasi Manajemen Direktorat",
  description: "Sistem Informasi Manajemen Direktorat Unesa Science Center"
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <AgendaProvider>
          {children}
        </AgendaProvider>
      </body>
    </html>
  )
}