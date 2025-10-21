import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-muted-foreground border-stroke h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground outline-none transition-all duration-200",
        " focus:shadow-[0_0_0_3px_rgba(212,212,216,0.5)] focus:border-[#d4d4d8]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
