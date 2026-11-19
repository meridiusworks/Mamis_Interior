import dialogues from '../../data/dialogues.json'
import { cn } from '../../utils/format'

export type DialogueKey = Exclude<keyof typeof dialogues, '_note'>
type Line = { ta: string; en: string; script?: string }

export function dialogue(key: DialogueKey): Line {
  return dialogues[key] as Line
}

/**
 * A Tamil-cinema-style punch line in Tanglish with its English subtitle.
 * `lang="ta-Latn"` tells assistive tech the line is Tamil written in Latin script.
 */
export function Dialogue({
  id,
  className,
  size = 'md',
  tone = 'light',
  showScript = false,
}: {
  id: DialogueKey
  className?: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'light' | 'dark'
  showScript?: boolean
}) {
  const line = dialogue(id)
  return (
    <figure className={cn('max-w-2xl', className)}>
      <blockquote
        lang="ta-Latn"
        className={cn(
          'font-serif italic',
          size === 'lg' ? 'text-[clamp(1.6rem,3vw,2.6rem)] leading-tight' : size === 'md' ? 'text-[1.45rem] leading-snug' : 'text-[1.1rem] leading-snug',
          tone === 'dark' ? 'text-stone' : 'text-olive-deep',
        )}
      >
        “{line.ta}”
      </blockquote>
      {showScript && line.script && (
        <p lang="ta" className={cn('mt-1 text-[0.95rem]', tone === 'dark' ? 'text-ivory/60' : 'text-charcoal/55')}>
          {line.script}
        </p>
      )}
      <figcaption className={cn('mt-2 text-[0.8rem] tracking-[0.02em]', tone === 'dark' ? 'text-ivory/55' : 'text-charcoal/55')}>
        {line.en}
      </figcaption>
    </figure>
  )
}
