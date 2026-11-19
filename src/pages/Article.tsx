import { Check, Link2, Mail } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { NewsletterForm } from '../components/forms/NewsletterForm'
import { Breadcrumbs, PageError, PageLoading, ReadingProgress, SampleNote } from '../components/ui/Misc'
import { Picture } from '../components/ui/Picture'
import { Reveal } from '../components/ui/Reveal'
import { Seo } from '../components/ui/Seo'
import { site } from '../config/site'
import { useAsync } from '../hooks/useAsync'
import { getArticle, getRelatedArticles } from '../services/content'
import { formatDate } from '../utils/format'
import { ArticleCard } from './Journal'
import NotFound from './NotFound'

export default function ArticlePage() {
  const { slug = '' } = useParams()
  const state = useAsync(async () => {
    const article = await getArticle(slug)
    return article ? { article, related: await getRelatedArticles(article) } : null
  }, [slug])

  if (state.status === 'loading') return <PageLoading />
  if (state.status === 'error') return <PageError message={state.error.message} />
  if (!state.data) return <NotFound />
  const { article: a, related } = state.data
  const url = `${site.url}/journal/${a.slug}`

  return (
    <article>
      <Seo
        title={a.title}
        description={a.dek}
        image={a.cover.src}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: a.title,
          description: a.dek,
          datePublished: a.date,
          author: { '@type': 'Person', name: a.author },
          publisher: { '@type': 'Organization', name: site.name },
          image: `${site.url}${a.cover.src}.webp`,
          mainEntityOfPage: url,
        }}
      />
      <ReadingProgress />
      <header className="container-wide pt-36 md:pt-44">
        <Breadcrumbs items={[{ label: 'Journal', to: '/journal' }, { label: a.title }]} />
        <div className="mx-auto mt-14 max-w-3xl text-center">
          <p className="eyebrow text-olive">
            {a.category} · {a.readingMinutes} min read
          </p>
          <h1 className="mt-6 font-serif text-headline">{a.title}</h1>
          <p className="mt-6 text-[1.15rem] text-charcoal/70">{a.dek}</p>
          <p className="mt-8 text-[0.85rem] text-charcoal/55">
            By {a.author} · <time dateTime={a.date}>{formatDate(a.date)}</time>
          </p>
        </div>
      </header>

      <div className="container-wide mt-14">
        <Picture image={a.cover} priority sizes="100vw" className={`mx-auto max-h-[80vh] object-cover ${a.cover.src.includes('/drawings/') ? 'contrast-[1.2] brightness-[1.1]' : ''}`} />
      </div>

      <div className="container-wide grid gap-12 py-20 lg:grid-cols-12">
        <aside className="order-2 lg:order-1 lg:col-span-2">
          <div className="lg:sticky lg:top-28">
            <ShareLinks title={a.title} url={url} />
          </div>
        </aside>
        <div className="prose-editorial order-1 lg:order-2 lg:col-span-7 lg:col-start-4">
          {a.body.map((b, i) => {
            if (b.type === 'h2') return <h2 key={i}>{b.text}</h2>
            if (b.type === 'quote') return <blockquote key={i}>{b.text}</blockquote>
            if (b.type === 'image')
              return (
                <figure key={i} className="my-12">
                  <Picture image={b.image} sizes="(min-width: 1024px) 60vw, 100vw" className={b.image.src.includes('/drawings/') ? 'contrast-[1.2] brightness-[1.1]' : undefined} />
                  {b.image.caption && <figcaption className="mt-3 text-[0.82rem] text-charcoal/55">{b.image.caption}</figcaption>}
                </figure>
              )
            return <p key={i}>{b.text}</p>
          })}
          <SampleNote className="mt-12">Original sample editorial written for this fictional studio.</SampleNote>
          <ul className="mt-8 flex flex-wrap gap-2">
            {a.tags.map((t) => (
              <li key={t} className="rounded-full border border-charcoal/20 px-3 py-1 text-[0.75rem]">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="border-t border-charcoal/10 bg-ivory-deep py-24">
        <div className="container-wide">
          <h2 className="mb-12 font-serif text-title">Related reading</h2>
          <div className="grid gap-10 md:grid-cols-3">
            {related.map((r, i) => (
              <Reveal key={r.slug} delay={i * 0.06}>
                <ArticleCard article={r} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="on-dark bg-charcoal py-24 text-ivory">
        <div className="container-wide grid gap-10 md:grid-cols-2 md:items-end">
          <h2 className="font-serif text-headline">More essays, occasionally.</h2>
          <NewsletterForm />
        </div>
      </section>
    </article>
  )
}

function ShareLinks({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const e = encodeURIComponent
  const links = [
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}` },
    { label: 'X', href: `https://x.com/intent/post?text=${e(title)}&url=${e(url)}` },
    { label: 'Pinterest', href: `https://www.pinterest.com/pin/create/button/?url=${e(url)}&description=${e(title)}` },
  ]
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link', url)
    }
  }
  return (
    <div>
      <p className="eyebrow mb-4 text-charcoal/55">Share</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[0.88rem] lg:flex-col">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="noopener noreferrer" className="link-underline">
              {l.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
        <li>
          <a href={`mailto:?subject=${e(title)}&body=${e(url)}`} className="link-underline inline-flex items-center gap-1.5">
            <Mail aria-hidden className="size-3.5" /> Email
          </a>
        </li>
        <li>
          <button type="button" onClick={copy} className="link-underline inline-flex items-center gap-1.5" aria-live="polite">
            {copied ? <Check aria-hidden className="size-3.5" /> : <Link2 aria-hidden className="size-3.5" />}
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </li>
      </ul>
    </div>
  )
}
