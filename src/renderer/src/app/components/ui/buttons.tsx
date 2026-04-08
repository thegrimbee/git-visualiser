import * as React from 'react'
import { cn } from './utils'

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
}

export function AppButton({
  className,
  ...props
}: AppButtonProps): React.JSX.Element {
  return (
    <button
      className={cn(
        'cursor-pointer disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}