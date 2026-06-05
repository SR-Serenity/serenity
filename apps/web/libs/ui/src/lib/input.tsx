'use client'

import React from 'react'
import { cn } from './cn'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm',
        'bg-white text-gray-900',
        'focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100',
        'placeholder:text-gray-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
)

Input.displayName = 'Input'
