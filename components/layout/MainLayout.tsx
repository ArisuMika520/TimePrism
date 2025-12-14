"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { PageTransition } from "@/components/ui/page-transition"

interface MainLayoutProps {
  children: React.ReactNode
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string | null
  }
}

export function MainLayout({ children, user }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header user={user} onMenuClick={() => setMobileMenuOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapseChange={setSidebarCollapsed}
            userRole={user?.role}
          />
        </aside>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar onMobileLinkClick={() => setMobileMenuOpen(false)} userRole={user?.role} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-auto bg-background">
          <PageTransition>
            <div className="container mx-auto p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl">
              {children}
            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  )
}






