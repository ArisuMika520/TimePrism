import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { NotificationProvider } from "@/components/ui/notification"
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog"
import { PromptDialogProvider } from "@/components/ui/prompt-dialog"
import { ArchiveNotificationWatcher } from "@/components/todos/ArchiveNotificationWatcher"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TimePrism",
  description: "集成Todo、Task Manager和Schedule的现代化应用",
  icons: {
    icon: "/tp logo512.png",
    apple: "/tp logo512.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NotificationProvider>
            <ConfirmDialogProvider>
              <PromptDialogProvider>
                {children}
                <ArchiveNotificationWatcher />
                <Toaster />
              </PromptDialogProvider>
            </ConfirmDialogProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

