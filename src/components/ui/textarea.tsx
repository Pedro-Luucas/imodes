import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground border-stroke min-h-16 w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground outline-none transition-all duration-200",
        "focus:shadow-[0_0_0_3px_rgba(212,212,216,0.5)] focus:border-[#d4d4d8]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
