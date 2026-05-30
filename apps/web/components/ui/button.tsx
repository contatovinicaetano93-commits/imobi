import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"

    const variantStyles = {
      default: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600",
      ghost: "hover:bg-gray-100 text-gray-900"
    }

    const sizeStyles = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-9 px-3 text-xs",
      lg: "h-12 px-8 text-lg"
    }

    return (
      <button
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ""}`}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }
