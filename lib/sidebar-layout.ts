/** Shared sidebar dimensions and spacing — keep dashboard + admin in sync */
export const SIDEBAR_WIDTH_COLLAPSED = "w-16"
export const SIDEBAR_WIDTH_EXPANDED = "w-60"
export const SIDEBAR_HOVER_EXPANDED = "hover:w-60"
export const SIDEBAR_COLLAPSED_OFFSET = "ml-16"
export const SIDEBAR_EXPANDED_OFFSET = "ml-60"
export const SIDEBAR_MAIN_OFFSET = "ml-16 peer-hover:ml-60"

export const sidebarShellClass =
  "fixed left-0 top-0 z-40 h-screen bg-background border-r border-border overflow-hidden"

export const sidebarTransitionClass = "transition-all duration-200 ease-in-out"

export const sidebarHeaderClass =
  "flex h-16 shrink-0 items-center border-b border-border px-2 group-hover:px-4 justify-center group-hover:justify-start"

export const sidebarNavClass = "flex-1 overflow-y-auto px-2 py-4 min-h-0"

export const sidebarNavListClass = "space-y-1"

export const sidebarNavItemClass =
  "flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200 group/item justify-center px-2.5 group-hover:justify-start group-hover:px-3"

/** Nav item padding when the sidebar is always expanded (e.g. docs) */
export const sidebarNavItemExpandedClass =
  "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"

export const sidebarNavItemActiveClass = "bg-primary/10 text-primary shadow-sm"

export const sidebarNavItemInactiveClass =
  "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm"

export const sidebarNavIconClass = "h-5 w-5 flex-shrink-0"

export const sidebarNavLabelClass =
  "w-0 ml-0 opacity-0 overflow-hidden whitespace-nowrap group-hover:w-auto group-hover:ml-3 group-hover:opacity-100 transition-all duration-200 delay-75"

export const sidebarFooterClass = "shrink-0 border-t border-border h-16 group-hover:h-auto group-hover:p-4"
