import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import {
  Sidebar,
  SidebarMenuButton,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"

function SidebarStateProbe() {
  const { state, open } = useSidebar()
  return <output data-sidebar-state={state}>{String(open)}</output>
}

describe("composable workspace sidebar", () => {
  it("renders the expanded layout by default", () => {
    const markup = renderToStaticMarkup(
      <SidebarProvider>
        <SidebarStateProbe />
        <Sidebar collapsible="icon">
          <span>Sidebar content</span>
        </Sidebar>
      </SidebarProvider>
    )

    expect(markup).toContain('data-sidebar-state="expanded"')
    expect(markup).toContain('data-state="expanded"')
    expect(markup).toContain("Sidebar content")
  })

  it("renders an icon-collapsed sidebar with its compact width state", () => {
    const markup = renderToStaticMarkup(
      <SidebarProvider open={false}>
        <Sidebar collapsible="icon">
          <span>Sidebar content</span>
        </Sidebar>
      </SidebarProvider>
    )

    expect(markup).toContain('data-sidebar-state="collapsed"')
    expect(markup).toContain('data-collapsible="icon"')
    expect(markup).toContain("var(--sidebar-width-icon)")
  })

  it("keeps collapsed navigation labels available as accessible names and tooltips", () => {
    const markup = renderToStaticMarkup(
      <SidebarProvider open={false}>
        <Sidebar collapsible="icon">
          <SidebarMenuButton render={<a href="/songs" />} tooltip="Songs">
            <span aria-hidden="true">S</span>
            <span>Songs</span>
          </SidebarMenuButton>
        </Sidebar>
      </SidebarProvider>
    )

    expect(markup).toContain('aria-label="Songs"')
    expect(markup).toContain('title="Songs"')
    expect(markup).toContain('href="/songs"')
  })
})
