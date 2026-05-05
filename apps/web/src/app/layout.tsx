import './global.css'
import { IBM_Plex_Sans } from 'next/font/google'
import { AuthProvider } from '@/hooks/use-auth'
import { ThemeProvider } from '@/lib/theme-provider'
import { cn } from '@/lib/utils'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata = {
  title: 'Serenity',
  description: 'Multi-tenant workspace platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(ibmPlexSans.variable, 'font-sans')}>
        <ThemeProvider defaultTheme="theme-light">
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
