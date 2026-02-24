import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/shared/lib/utils"

const labelVariants = cva(
    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
    React.ElementRef<typeof LabelPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
    // Since we don't have Radix Label installed via CLI, we can use a standard label 
    // or install @radix-ui/react-label. Let's use standard label with the styles if Radix is missing.
    // Actually, I should install @radix-ui/react-label or just use a span/label element.
    // For simplicity and "no extra deps" if possible, I'll use a styled label element.
    <label
        ref={ref}
        className={cn(labelVariants(), className)}
        {...props}
    />
))
Label.displayName = "Label" // LabelPrimitive.Root.displayName

export { Label }
