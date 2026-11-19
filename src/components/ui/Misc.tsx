import { motion, useScroll, useSpring } from 'framer-motion'
import { ChevronRight, Info, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { site } from '../../config/site'
import { cn } from '../../utils/format'
import { ButtonLink } from './Button'
import { Dialogue } from './Dialogue'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline gap-2 font-display whitespace-nowrap', className)}>
      <span className="text-[1.4rem] leading-none font-bold tracking-[0.04em]">{site.wordmark.split(' ')[0]}</span>
      <span className="text-[0.66rem] font-medium tracking-[0.36em]">{site.wordmark.split(' ').slice(1).join(' ')}</span>
    </span>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('eyebrow flex items-center gap-3', className)}>
      <span aria-hidden className="h-px w-8 bg-current opacity-50" />
      {children}
    </p>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  className,
  align = 'left',
}: {
  eyebrow?: string
  title: ReactNode
  intro?: ReactNode
  className?: string
  align?: 'left' | 'center'
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <Eyebrow className={cn('mb-6', align === 'center' && 'justify-center')}>{eyebrow}</Eyebrow>}
      <h2 className="font-serif text-headline">{title}</h2>
      {intro && <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed opacity-75">{intro}</p>}
    </div>
  )
}

/** Inline notice for anything that is sample, demo or fictional content. */
export function SampleNote({ children, tone = 'light', className }: { children: ReactNode; tone?: 'light' | 'dark'; className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2.5 text-[0.78rem] leading-relaxed',
        tone === 'dark' ? 'text-ivory/60' : 'text-charcoal/60',
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items, tone = 'light' }: { items: Crumb[]; tone?: 'light' | 'dark' }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-[0.72rem] tracking-[0.12em] uppercase', tone === 'dark' ? 'text-ivory/70' : 'text-charcoal/60')}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {[{ label: 'Home', to: '/' }, ...items].map((c, i, all) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {c.to && i < all.length - 1 ? (
              <Link to={c.to} className="link-underline hover:opacity-100">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className={tone === 'dark' ? 'text-ivory' : 'text-charcoal'}>
                {c.label}
              </span>
            )}
            {i < all.length - 1 && <ChevronRight aria-hidden className="size-3 opacity-50" />}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[60vh] items-center justify-center gap-3 text-charcoal/60">
      <LoaderCircle aria-hidden className="size-5 animate-spin" />
      <span className="eyebrow">{label}</span>
    </div>
  )
}

export function PageError({ message }: { message?: string }) {
  return (
    <div role="alert" className="container-wide flex min-h-[60vh] flex-col items-start justify-center gap-6 py-24">
      <p className="eyebrow text-error">Something went wrong</p>
      <h1 className="font-serif text-headline">This page could not be loaded.</h1>
      <p className="max-w-lg text-charcoal/70">{message ?? 'Please refresh the page. If the problem continues, contact the studio.'}</p>
      <ButtonLink to="/">Return home</ButtonLink>
    </div>
  )
}

/** Thin progress bar for long-form pages. */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-olive"
      style={{ scaleX }}
    />
  )
}

/** Shared closing call-to-action band. */
export function ConsultationCta({ title = 'Begin with a conversation.', text }: { title?: string; text?: string }) {
  return (
    <section className="on-dark bg-charcoal text-ivory">
      <div className="container-wide grid gap-10 py-24 md:grid-cols-[1.4fr_1fr] md:items-end md:py-32">
        <div>
          <Eyebrow className="mb-6 text-stone">Consultation</Eyebrow>
          <h2 className="font-serif text-headline">{title}</h2>
          <Dialogue id="cta" tone="dark" className="mt-6" />
        </div>
        <div className="space-y-8">
          <p className="max-w-md text-ivory/70">
            {text ??
              'Tell us about your plot, your old house or a single room. We review every request and reply with suggested next steps.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/consultation" variant="light">
              Request a consultation
            </ButtonLink>
            <ButtonLink to="/contact" variant="ghost" arrow={false}>
              Contact the studio
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}
