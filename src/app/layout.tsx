import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from 'react-hot-toast'
import { UserRoleProvider } from '@/context/UserRoleContext'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'
import { OfflineProvider } from '@/components/providers/OfflineProvider'
import GlobalNotifier from '@/components/GlobalNotifier'
import OfflineIndicator from '@/components/ui/OfflineIndicator'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const metadata = {
  title: 'Universal Printing Press',
  description:
    'Efficiently manage enquiries, follow-ups, and operations with Universal Printing Press.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'Universal Printing Press',
    description: 'Efficiently manage enquiries, follow-ups, and operations with Universal Printing Press.',
    images: ['/icons/icon-512x512.png'],
  },
}

export const viewport = {
  themeColor: '#1A237E',
  display: 'standalone',
  background_color: '#ffffff',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ Await cookies() so SSR Supabase works properly
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  // ✅ Correctly fetch the session from Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ✅ Mobile viewport optimization */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
        />
      </head>

      <body className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SupabaseProvider session={session}>
            <OfflineProvider>
              {/* 🔔 Notification System START */}
              <GlobalNotifier>
                <UserRoleProvider>
                  <main className="container-responsive min-h-screen flex flex-col">
                    {children}
                  </main>

                  <Toaster
                    position="top-center"
                    toastOptions={{
                      style: {
                        fontSize: '0.875rem',
                        maxWidth: '90vw',
                        wordBreak: 'break-word',
                      },
                    }}
                  />
                  
                  {/* Offline Indicator */}
                  <OfflineIndicator />
                </UserRoleProvider>
              </GlobalNotifier>
              {/* 🔔 Notification System END */}
            </OfflineProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
