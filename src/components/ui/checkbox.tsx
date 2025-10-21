"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-stroke bg-white transition-all duration-200 outline-none cursor-pointer",
        "hover:border-accent/50",
        "data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:text-white",
        "focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-stroke",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current"
      >
        <CheckIcon className="size-3 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
