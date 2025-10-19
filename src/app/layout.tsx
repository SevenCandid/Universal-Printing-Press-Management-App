import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from 'react-hot-toast'
import { UserRoleProvider } from '@/context/UserRoleContext'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const metadata = {
  title: 'Universal Printing Press Management System',
  description: 'Efficiently manage enquiries, follow-ups, and operations with Universal Printing Press.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()

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

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ✅ Improve mobile experience */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </head>

      <body className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SupabaseProvider session={session}>
            <UserRoleProvider>
              {/* ✅ Responsive container */}
              <main className="container-responsive min-h-screen flex flex-col">
                {children}
              </main>

              {/* ✅ Toasts always visible and not hidden behind UI */}
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
            </UserRoleProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
