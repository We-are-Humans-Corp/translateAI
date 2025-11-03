import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { ThemeToggle } from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: 'Scientific Translation B2B Service',
  description: 'Enterprise-grade AI-powered translation service for scientific and academic texts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="relative min-h-screen">
          {/* Header with theme toggle */}
          <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    TranslateAI
                  </h1>
                </Link>

                <nav className="flex items-center gap-6">
                  <Link
                    href="/"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Home
                  </Link>
                  <Link
                    href="/translate"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Translator
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Dashboard
                  </Link>
                </nav>
              </div>
              <ThemeToggle />
            </div>
          </header>

          {/* Main content */}
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto">
            <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-400">
              <p>&copy; {new Date().getFullYear()} We are Humans Corp. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}