import { ArrowUpRight } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../utils/format'

type Variant = 'solid' | 'outline' | 'light' | 'ghost'

const variants: Record<Variant, string> = {
  solid: 'bg-charcoal text-ivory hover:bg-olive-deep',
  outline: 'border border-charcoal/30 text-charcoal hover:border-charcoal hover:bg-charcoal hover:text-ivory',
  light: 'bg-ivory text-charcoal hover:bg-white',
  ghost: 'border border-ivory/35 text-ivory hover:border-ivory hover:bg-ivory hover:text-charcoal',
}

const base =
  'group inline-flex items-center justify-center gap-3 rounded-full px-6 py-3.5 text-[0.8rem] font-medium tracking-[0.14em] uppercase transition-colors duration-500 ease-[var(--ease-architect)] disabled:cursor-not-allowed disabled:opacity-50'

function Arrow() {
  return (
    <ArrowUpRight
      aria-hidden
      className="size-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
    />
  )
}

export function ButtonLink({
  variant = 'solid',
  className,
  children,
  arrow = true,
  ...props
}: LinkProps & { variant?: Variant; arrow?: boolean; children: ReactNode }) {
  return (
    <Link className={cn(base, variants[variant], className)} {...props}>
      {children}
      {arrow && <Arrow />}
    </Link>
  )
}

export function Button({
  variant = 'solid',
  className,
  children,
  arrow = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; arrow?: boolean }) {
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
      {arrow && <Arrow />}
    </button>
  )
}
