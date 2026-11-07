import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-field border-0 bg-field px-3 py-1 text-base transition-shadow outline-none placeholder:text-muted-foreground focus-visible:shadow-[0_0_0_2px_var(--primary)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[0_0_0_2px_var(--destructive)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
