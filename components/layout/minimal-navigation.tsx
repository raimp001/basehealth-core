"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
// Removed wallet button import to fix client-side errors
import { 
  Menu, 
  X, 
  Activity, 
  Search, 
  FlaskConical, 
  Home,
  User,
  Settings,
  CreditCard,
  Bookmark,
  Bot,
  LifeBuoy,
  MessageSquare,
  Pill,
  NotebookPen,
  CalendarCheck2,
  LayoutDashboard
} from "lucide-react"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { SignInWithBase } from "@/components/auth/sign-in-with-base"

type NavItem = {
  href: string
  label: string
  icon: any
  badge?: string | number
}

const navigationItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Care hub', icon: LayoutDashboard },
  { href: '/medications', label: 'Medications', icon: Pill },
  { href: '/journal', label: 'Journal', icon: NotebookPen },
  { href: '/screening/milestones', label: 'Milestones', icon: CalendarCheck2 },
  { href: '/chat', label: 'Assistant', icon: Bot },
  { href: '/screening', label: 'Screenings', icon: Activity },
  { href: '/providers/search', label: 'Find care', icon: Search },
  { href: '/clinical-trials', label: 'Clinical trials', icon: FlaskConical },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
]

const userMenuItems: NavItem[] = [
  { href: '/patient-portal', label: 'Portal', icon: User },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const quickActions = [
  { href: '/chat', label: 'Assistant', icon: Bot, badge: null },
  { href: '/support', label: 'Support', icon: LifeBuoy, badge: null },
]

const desktopNavigationItems = [
  { href: '/dashboard', label: 'Care hub' },
  { href: '/medications', label: 'Medications' },
  { href: '/journal', label: 'Journal' },
  { href: '/screening/milestones', label: 'Milestones' },
  { href: '/providers/search', label: 'Find care' },
  { href: '/chat', label: 'Assistant' },
]

const mobileBottomItems = [
  { href: '/dashboard', label: 'Care', icon: LayoutDashboard },
  { href: '/medications', label: 'Meds', icon: Pill },
  { href: '/journal', label: 'Journal', icon: NotebookPen },
  { href: '/screening/milestones', label: 'Screen', icon: CalendarCheck2 },
  { href: '/chat', label: 'Assistant', icon: Bot },
]

export function MinimalNavigation() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const visibleNavigationItems = navigationItems
  const visibleQuickActions = quickActions
  const visibleDesktopNavigationItems = desktopNavigationItems

  return (
    <>
      {/* Desktop Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-border/60 backdrop-blur-xl relative after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/40 after:to-transparent ${
          scrolled ? "bg-background/70 shadow-enterprise" : "bg-background/40"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            <div className="flex items-center gap-8 lg:gap-12">
              <Link 
                href="/" 
                className="group flex items-center gap-3 hover:opacity-90 transition-opacity duration-200"
              >
                <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 via-accent/10 to-transparent ring-1 ring-border/60 shadow-glow-subtle">
                  <Image
                    src="/icon-192.png"
                    alt="BaseHealth"
                    width={22}
                    height={22}
                    priority
                    unoptimized
                    className="rounded-md opacity-95"
                  />
                </span>
                <span className="leading-none">
                  <span className="block font-display text-base md:text-lg font-semibold tracking-tight text-foreground">
                    BaseHealth
                  </span>
                  <span className="block mt-0.5 text-[11px] text-muted-foreground">
                    Healthcare on Base
                  </span>
                </span>
              </Link>
              
              <nav className="hidden md:flex items-center gap-1 lg:gap-2">
                {visibleDesktopNavigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200 ${
                      pathname === item.href
                        ? "text-foreground bg-card/45 border-border/60 shadow-glow-subtle"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:border-border/40 hover:bg-card/25"
                    }`}
                  >
                    {item.label}
                    {pathname === item.href && (
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                    )}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/saved"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Saved items"
              >
                <Bookmark className="h-5 w-5" />
              </Link>
              <NotificationCenter />
              <div className="w-px h-6 bg-border mx-1" />
              <Button 
                asChild 
                variant="ghost" 
                size="sm" 
                className="h-9 px-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
              >
                <Link href="/join">Join</Link>
              </Button>
              <SignInWithBase className="h-9" />
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-card/30 h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[360px] p-0 bg-background/80 backdrop-blur-xl">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <span className="text-lg font-bold text-foreground">Menu</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="text-muted-foreground hover:text-foreground hover:bg-card/30 h-9 w-9"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <nav className="flex-1 py-6 overflow-y-auto">
                    <div className="px-4 space-y-1">
                      {visibleNavigationItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                            pathname === item.href
                              ? "bg-muted text-foreground font-semibold shadow-sm"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          <item.icon className={`h-5 w-5 ${pathname === item.href ? "text-foreground" : "text-muted-foreground"}`} />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-border">
                      <div className="px-4 mb-6">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Quick Actions
                        </p>
                        <div className="space-y-1">
                          {visibleQuickActions.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsOpen(false)}
                              className="flex items-center justify-between px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200"
                            >
                              <div className="flex items-center gap-3">
                                <item.icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium text-foreground">{item.label}</span>
                              </div>
                              {item.badge && (
                                <Badge variant="secondary" className="bg-card/60 text-foreground border border-border/60 text-xs font-semibold">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                      
                      <div className="px-4 mb-6">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Account
                        </p>
                        <div className="space-y-1">
                          {userMenuItems.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsOpen(false)}
                              className="flex items-center justify-between px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200"
                            >
                              <div className="flex items-center gap-3">
                                <item.icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium text-foreground">{item.label}</span>
                              </div>
                              {item.badge && (
                                <Badge variant="secondary" className="bg-card/60 text-foreground border border-border/60 text-xs font-semibold">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>

                    </div>
                  </nav>
                  
                  <div className="p-5 border-t border-border bg-card/20 space-y-3">
                    <Button 
                      asChild 
                      className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-glow-cyan" 
                      onClick={() => setIsOpen(false)}
                    >
                      <Link href="/join">Join network</Link>
                    </Button>
                    <div className="flex justify-center" onClick={() => setIsOpen(false)}>
                      <SignInWithBase className="w-full h-11" />
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/70 backdrop-blur-xl border-t border-border/60 md:hidden z-50 shadow-enterprise">
        <div className="grid grid-cols-5 h-16">
          {mobileBottomItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 relative ${
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`relative ${pathname === item.href ? 'scale-110' : ''} transition-transform duration-200`}>
                <item.icon className={`h-5 w-5 ${pathname === item.href ? "text-foreground" : ""}`} />
                {pathname === item.href && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
              </div>
              <span className={`text-xs font-medium ${pathname === item.href ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
