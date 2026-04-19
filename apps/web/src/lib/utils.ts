import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Slug transformation steps: (1) remove invalid characters except spaces and hyphens,
    // (2) convert spaces to hyphens, and (3) collapse multiple hyphens into one.
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function formatDateLong(date: Date = new Date(), locale = 'en-US'): string {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
