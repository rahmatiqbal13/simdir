import './globals.css'
import { AgendaProvider } from '@/context/AgendaContext'
import { ProgramKerjaProvider } from '@/context/ProgramKerjaContext'
import { PencairanProvider } from '@/context/PencairanContext'
import { SuratProvider } from '@/context/SuratContext'

export const metadata = {
  title: "SIMDIR - Sistem Informasi Manajemen Direktorat",
  description: "Sistem Informasi Manajemen Direktorat Unesa Science Center"
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <AgendaProvider>
          <ProgramKerjaProvider>
            <PencairanProvider>
              <SuratProvider>
                {children}
              </SuratProvider>
            </PencairanProvider>
          </ProgramKerjaProvider>
        </AgendaProvider>
      </body>
    </html>
  )
}