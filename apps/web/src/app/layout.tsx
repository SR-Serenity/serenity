import './global.css'
import { AuthProvider } from '@/hooks/use-auth'

export const metadata = {
  title: 'Serenity',
  description: 'Multi-tenant workspace platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
