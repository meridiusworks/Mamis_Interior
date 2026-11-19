import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { NewsletterForm } from '../components/forms/NewsletterForm'
import { Breadcrumbs, PageError, PageLoading } from '../components/ui/Misc'
import { Picture } from '../components/ui/Picture'
import { SplitHeadline } from '../components/ui/Reveal'
import { Dialogue, dialogue } from '../components/ui/Dialogue'
import { Seo } from '../components/ui/Seo'
import { useAsync } from '../hooks/useAsync'
import { getArticles, searchArticles } from '../services/content'
import type { Article } from '../types/content'
import { cn, formatDate } from '../utils/format'

export default function Journal() {
  const state = useAsync(getArticles, [])
  const [params, setParams] = useSearchParams()
  // The input owns its text; the URL follows it (shareable, but never drops keystrokes).
  const [query, setQuery] = useState(() => params.get('q') ?? '')
  const category = params.get('category') ?? 'All'
  const deferredQuery = useDeferredValue(query.trim())

  const articles = useMemo(() => state.data ?? [], [state.data])
  const categories = useMemo(() => ['All', ...new Set(articles.map((a) => a.category))], [articles])
  const featured = articles.find((a) => a.featured)
  const filtering = !!deferredQuery || category !== 'All'
  const results = useMemo(
    () => searchArticles(articles, deferredQuery).filter((a) => category === 'All' || a.category === category),
    [articles, deferredQuery, category],
  )
  const list = filtering ? results : results.filter((a) => a !== featured)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (!value || value === 'All') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (query.trim()) next.set('q', query.trim())
          else next.delete('q')
          return next
        },
        { replace: true, preventScrollReset: true },
      )
    }, 300)
    return () => window.clearTimeout(id)
  }, [query, setParams])

  if (state.status === 'loading') return <PageLoading />
  if (state.status === 'error') return <PageError message={state.error.message} />

  return (
    <>
      <Seo title="Journal" description="Essays on architecture, interiors, materials, sustainability, process and spatial planning from the Mami’s Interior studio." />
      <section className="container-wide pt-36 pb-12 md:pt-44">
        <Breadcrumbs items={[{ label: 'Journal' }]} />
        <SplitHeadline text="Journal" className="mt-8 font-serif text-display" />
        <Dialogue id="journal" className="mt-8" />
      </section>

      {featured && !filtering && (
        <section className="container-wide pb-20">
          <Link to={`/journal/${featured.slug}`} className="group grid gap-8 md:grid-cols-12 md:items-end" data-cursor="Read">
            <div className="relative aspect-[4/5] overflow-hidden md:col-span-5">
              <Picture image={featured.cover} fill priority sizes="(min-width: 768px) 42vw, 100vw" className="transition-transform duration-[1.4s] group-hover:scale-[1.04]" />
            </div>
            <div className="md:col-span-6 md:col-start-7">
              <p className="eyebrow text-olive">Featured · {featured.category}</p>
              <h2 className="mt-5 font-serif text-headline">{featured.title}</h2>
              <p className="mt-5 max-w-lg text-[1.05rem] text-charcoal/70">{featured.dek}</p>
              <p className="mt-6 text-[0.82rem] text-charcoal/55">
                {featured.author} · {formatDate(featured.date)} · {featured.readingMinutes} min read
              </p>
            </div>
          </Link>
        </section>
      )}

      <section className="sticky top-[72px] z-30 border-y border-charcoal/10 bg-ivory/95 backdrop-blur">
        <div className="container-wide flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div role="group" aria-label="Categories" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => update('category', c)}
                className={cn('shrink-0 rounded-full border px-4 py-2 text-[0.78rem] transition-colors', category === c ? 'border-charcoal bg-charcoal text-ivory' : 'border-charcoal/20 hover:border-charcoal')}
              >
                {c}
              </button>
            ))}
          </div>
          <div role="search" className="relative md:w-72">
            <label htmlFor="journal-search" className="sr-only">
              Search articles
            </label>
            <Search aria-hidden className="absolute top-1/2 left-0 size-4 -translate-y-1/2 text-charcoal/45" />
            <input
              id="journal-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the journal"
              className="w-full border-b border-charcoal/25 bg-transparent py-2 pr-8 pl-7 text-[0.92rem] outline-none focus:border-charcoal"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute top-1/2 right-0 -translate-y-1/2 p-1">
                <X aria-hidden className="size-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="container-wide py-16">
        <p className="eyebrow mb-10 text-charcoal/55" aria-live="polite">
          {filtering ? `${results.length} ${results.length === 1 ? 'article' : 'articles'}${deferredQuery ? ` for “${deferredQuery}”` : ''}` : 'Latest'}
        </p>
        {list.length === 0 ? (
          <div className="border border-dashed border-charcoal/25 p-10">
            <p lang="ta-Latn" className="font-serif text-title">{dialogue('empty').ta}</p>
            <p className="mt-2 text-charcoal/65">No articles found.</p>
            <p className="mt-3 text-charcoal/65">Try a different word — for example “athangudi”, “thinnai” or “monsoon”.</p>
          </div>
        ) : (
          <motion.ul layout className="grid gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {list.map((a) => (
                <motion.li key={a.slug} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                  <ArticleCard article={a} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </section>

      <section className="on-dark bg-charcoal py-24 text-ivory">
        <div className="container-wide grid gap-10 md:grid-cols-2 md:items-end">
          <div>
            <h2 className="font-serif text-headline">Essays, occasionally.</h2>
            <Dialogue id="newsletter" size="sm" tone="dark" className="mt-4" />
          </div>
          <NewsletterForm />
        </div>
      </section>
    </>
  )
}

export function ArticleCard({ article: a }: { article: Article }) {
  return (
    <Link to={`/journal/${a.slug}`} className="group block" data-cursor="Read">
      <div className="relative aspect-[4/3] overflow-hidden bg-ivory-deep">
        <Picture image={a.cover} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className={cn('transition-transform duration-[1.4s] group-hover:scale-[1.045]', a.cover.src.includes('/drawings/') && 'contrast-[1.2] brightness-[1.1]')} />
      </div>
      <p className="eyebrow mt-5 text-olive">
        {a.category} · {a.readingMinutes} min read
      </p>
      <h3 className="mt-3 font-serif text-[1.7rem] leading-tight">{a.title}</h3>
      <p className="mt-2 text-[0.92rem] text-charcoal/65">{a.dek}</p>
      <p className="mt-4 text-[0.78rem] text-charcoal/50">{formatDate(a.date)}</p>
    </Link>
  )
}
