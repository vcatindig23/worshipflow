"use client"

import * as React from "react"
import { PanelLeft, PanelLeftClose } from "lucide-react"

type SidebarOpenChange = (open: boolean) => void

type SidebarContextValue = {
  open: boolean
  state: "expanded" | "collapsed"
  setOpen: (open: boolean) => void
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

type SidebarProviderProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: SidebarOpenChange
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className = "",
  style,
  ...props
}: SidebarProviderProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [controlledOpen, onOpenChange]
  )

  const toggleSidebar = React.useCallback(() => {
    setOpen(!open)
  }, [open, setOpen])

  React.useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target
      const isEditing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))

      if (
        isEditing ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "b"
      ) {
        return
      }

      event.preventDefault()
      toggleSidebar()
    }

    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [toggleSidebar])

  const contextValue = React.useMemo<SidebarContextValue>(
    () => ({
      open,
      state: open ? "expanded" : "collapsed",
      setOpen,
      toggleSidebar,
    }),
    [open, setOpen, toggleSidebar]
  )

  const providerStyle = {
    "--sidebar-width": "16.5rem",
    "--sidebar-width-icon": "4.75rem",
    ...style,
  } as React.CSSProperties

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        data-state={contextValue.state}
        className={`group/sidebar-wrapper flex min-h-svh w-full ${className}`.trim()}
        style={providerStyle}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = React.useContext(SidebarContext)

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

type SidebarProps = React.HTMLAttributes<HTMLElement> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}

export function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "icon",
  className = "",
  children,
  style,
  ...props
}: SidebarProps) {
  const { open } = useSidebar()
  const collapsed = !open && collapsible === "icon"
  const offcanvas = !open && collapsible === "offcanvas"

  return (
    <aside
      data-slot="sidebar"
      data-sidebar="sidebar"
      data-side={side}
      data-variant={variant}
      data-state={open ? "expanded" : "collapsed"}
      data-collapsible={collapsed ? "icon" : undefined}
      aria-hidden={offcanvas ? true : undefined}
      className={`app-sidebar group/sidebar fixed inset-y-0 z-40 hidden h-svh flex-col border-white/10 bg-[var(--sidebar)] text-white shadow-sm transition-[width,transform] duration-200 ease-linear motion-reduce:transition-none ${side === "left" ? "left-0 border-r" : "right-0 border-l"} ${className}`.trim()}
      style={{
        width:
          collapsible === "none"
            ? "var(--sidebar-width)"
            : open
              ? "var(--sidebar-width)"
              : collapsed
                ? "var(--sidebar-width-icon)"
                : "0px",
        transform: offcanvas
          ? side === "left"
            ? "translateX(-100%)"
            : "translateX(100%)"
          : undefined,
        ...style,
      }}
      {...props}
    >
      <div className="flex h-full min-h-0 w-full flex-col">{children}</div>
    </aside>
  )
}

type SidebarSectionProps = React.HTMLAttributes<HTMLDivElement>

export function SidebarHeader({
  className = "",
  ...props
}: SidebarSectionProps) {
  const { state } = useSidebar()

  return (
    <div
      data-slot="sidebar-header"
      className={`flex h-[78px] shrink-0 items-center border-b border-white/8 ${state === "collapsed" ? "justify-center px-3" : "gap-3 px-5"} ${className}`.trim()}
      {...props}
    />
  )
}

export function SidebarContent({
  className = "",
  ...props
}: SidebarSectionProps) {
  return (
    <div
      data-slot="sidebar-content"
      className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 ${className}`.trim()}
      {...props}
    />
  )
}

export function SidebarFooter({
  className = "",
  ...props
}: SidebarSectionProps) {
  return (
    <div
      data-slot="sidebar-footer"
      className={`shrink-0 border-t border-white/8 p-3 ${className}`.trim()}
      {...props}
    />
  )
}

export function SidebarGroup({
  className = "",
  ...props
}: SidebarSectionProps) {
  return (
    <section
      data-slot="sidebar-group"
      className={`min-w-0 ${className}`.trim()}
      {...props}
    />
  )
}

export function SidebarGroupLabel({
  className = "",
  ...props
}: SidebarSectionProps) {
  const { state } = useSidebar()

  if (state === "collapsed") return null

  return (
    <div
      data-slot="sidebar-group-label"
      className={`px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--sidebar-muted)] ${className}`.trim()}
      {...props}
    />
  )
}

export function SidebarGroupContent({
  className = "",
  ...props
}: SidebarSectionProps) {
  return (
    <div data-slot="sidebar-group-content" className={className} {...props} />
  )
}

export function SidebarMenu({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={`m-0 list-none space-y-1 p-0 ${className}`.trim()}
      {...props}
    />
  )
}

export function SidebarMenuItem({
  className = "",
  ...props
}: React.LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={`relative min-w-0 ${className}`.trim()}
      {...props}
    />
  )
}

type SidebarMenuButtonProps = {
  render?: React.ReactElement
  isActive?: boolean
  ariaCurrent?: "page" | "location"
  tooltip?: string
  size?: "default" | "sm" | "lg"
  className?: string
  children: React.ReactNode
}

export function SidebarMenuButton({
  render,
  isActive = false,
  ariaCurrent = "page",
  tooltip,
  size = "default",
  className = "",
  children,
}: SidebarMenuButtonProps) {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const element = render ?? <button type="button" />
  const sizeClasses =
    size === "sm"
      ? "min-h-9 text-xs"
      : size === "lg"
        ? "min-h-12 text-sm"
        : "min-h-11 text-sm"
  const buttonClasses = [
    "relative flex w-full min-w-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
    sizeClasses,
    collapsed ? "justify-center px-2 [&>span:last-child]:sr-only" : "",
    isActive
      ? "bg-[var(--brand)] text-white shadow-sm hover:bg-[var(--brand-dark)]"
      : "text-[var(--sidebar-muted)] hover:bg-white/[0.07] hover:text-white",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  const enhancedProps = {
    className: [element.props.className, buttonClasses].filter(Boolean).join(" "),
    "data-slot": "sidebar-menu-button",
    "data-active": isActive ? "true" : "false",
    "aria-current": isActive ? ariaCurrent : undefined,
    "aria-label": collapsed ? tooltip : undefined,
    title: collapsed ? tooltip : undefined,
  } as React.HTMLAttributes<HTMLElement>

  return React.cloneElement(
    element as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
    enhancedProps,
    <>
      {isActive ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#b5d4bd]"
        />
      ) : null}
      {children}
    </>
  )
}

export function SidebarMenuAction({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      data-slot="sidebar-menu-action"
      type="button"
      className={`absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--sidebar-muted)] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${className}`.trim()}
      {...props}
    />
  )
}

export function SidebarMenuBadge({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="sidebar-menu-badge"
      className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--sidebar-muted)] ${className}`.trim()}
      {...props}
    />
  )
}

export function SidebarInset({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sidebar-inset"
      className={`min-h-screen min-w-0 flex-1 ${className}`.trim()}
      {...props}
    />
  )
}

export function SidebarTrigger({
  className = "",
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, toggleSidebar } = useSidebar()
  const Icon = open ? PanelLeftClose : PanelLeft
  const label = open ? "Collapse sidebar" : "Expand sidebar"

  return (
    <button
      data-slot="sidebar-trigger"
      type="button"
      aria-label={label}
      aria-expanded={open}
      title={`${label} (Ctrl+B)`}
      className={className}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) toggleSidebar()
      }}
      {...props}
    >
      <Icon aria-hidden="true" className="wf-icon-motion size-[18px]" />
    </button>
  )
}

export function SidebarRail({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, toggleSidebar } = useSidebar()

  return (
    <button
      data-slot="sidebar-rail"
      type="button"
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      title={open ? "Collapse sidebar" : "Expand sidebar"}
      className={`absolute inset-y-0 right-0 z-20 hidden w-2 translate-x-1/2 cursor-ew-resize border-0 bg-transparent p-0 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 lg:block ${className}`.trim()}
      onClick={toggleSidebar}
      {...props}
    />
  )
}
