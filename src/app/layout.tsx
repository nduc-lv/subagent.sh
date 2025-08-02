import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { StructuredDataScript } from '@/components/seo/structured-data';
import { generateWebsiteStructuredData } from '@/lib/structured-data';
import { ErrorBoundary } from '@/components/error-boundary';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | Subagents.sh',
    default: 'Subagents.sh - Claude Code Sub-Agent Directory',
  },
  description:
    'Discover and share Claude Code sub-agents to enhance your development workflow. Find the best AI-powered development tools and automation scripts.',
  keywords: [
    'Claude Code',
    'sub-agents',
    'AI development',
    'automation',
    'programming tools',
    'developer tools',
    'AI assistant',
    'workflow automation',
  ],
  authors: [{ name: 'Subagents.sh Team' }],
  creator: 'Subagents.sh Team',
  publisher: 'Subagents.sh',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Subagents.sh - Claude Code Sub-Agent Directory',
    description:
      'Discover and share Claude Code sub-agents to enhance your development workflow.',
    url: 'https://subagents.sh',
    siteName: 'Subagents.sh',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://subagents.sh/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Subagents.sh - Claude Code Sub-Agent Directory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Subagents.sh - Claude Code Sub-Agent Directory',
    description:
      'Discover and share Claude Code sub-agents to enhance your development workflow.',
    images: ['https://subagents.sh/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredDataScript data={generateWebsiteStructuredData()} />
      </head>
      <body
        className={`${inter.variable} ${jetBrainsMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
