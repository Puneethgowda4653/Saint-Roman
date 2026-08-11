import * as React from "react"
import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Plain native <input type="checkbox"> rather than a new @base-ui/react/checkbox import — every
// other primitive in this folder (button/dialog/select/dropdown-menu) wraps a Base UI component,
// but row-selection in a table has no need for anything beyond what the browser already gives
// for free, and this keeps the ops-console redesign from depending on a subpath that hasn't been
// exercised anywhere else in this codebase yet.
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "checked" | "onChange"> {
  checked?: boolean | "indeterminate"
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const isIndeterminate = checked === "indeterminate"
    const isChecked = checked === true

    const innerRef = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement)
    React.useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = isIndeterminate
    }, [isIndeterminate])

    return (
      <span className="relative inline-flex size-4 shrink-0">
        <input
          ref={innerRef}
          type="checkbox"
          data-slot="checkbox"
          checked={isChecked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className={cn(
            "peer size-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-input bg-transparent transition-colors outline-none checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        {(isChecked || isIndeterminate) && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-primary-foreground">
            {isIndeterminate ? <MinusIcon className="size-3" /> : <CheckIcon className="size-3" />}
          </span>
        )}
      </span>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
