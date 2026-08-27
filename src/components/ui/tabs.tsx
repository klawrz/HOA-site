"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("relative flex items-center gap-1 border-b overflow-x-auto", className)}
      {...props}
    />
  )
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "relative shrink-0 px-3 py-2 text-sm font-medium text-gray-500 whitespace-nowrap outline-none transition-colors hover:text-gray-900 data-active:text-gray-900",
        className
      )}
      {...props}
    />
  )
}

function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "absolute bottom-0 h-0.5 rounded-full bg-gray-900 transition-all duration-200",
        className
      )}
      style={{
        left: "var(--active-tab-left)",
        width: "var(--active-tab-width)",
      }}
      {...props}
    />
  )
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel data-slot="tabs-panel" className={cn("pt-4 outline-none", className)} {...props} />
  )
}

export { Tabs, TabsList, TabsTab, TabsIndicator, TabsPanel }
