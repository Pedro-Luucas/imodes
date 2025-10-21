import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium text-sm leading-5 transition-colors outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-white text-foreground border border-input hover:bg-gray-50",
        outline: "border border-stroke bg-transparent hover:bg-muted",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground",
        "ghost-muted": "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5",
        lg: "h-11 px-6",
        sm: "h-8 px-3",
        mini: "h-6 px-3 text-xs",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
      roundness: {
        default: "rounded-lg",
        round: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      roundness: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, roundness, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, roundness, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
