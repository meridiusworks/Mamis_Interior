import { ButtonLink } from '../components/ui/Button'
import { Picture } from '../components/ui/Picture'
import { Dialogue, dialogue } from '../components/ui/Dialogue'
import { Seo } from '../components/ui/Seo'

export default function NotFound() {
  return (
    <section className="container-wide grid min-h-[85vh] items-center gap-12 pt-32 pb-20 md:grid-cols-2">
      <Seo title="Page not found" noindex />
      <div>
        <p className="eyebrow text-olive">Error 404</p>
        <h1 lang="ta-Latn" className="mt-6 font-serif text-headline">{dialogue('notFound').ta}</h1>
        <p className="mt-3 text-charcoal/60">{dialogue('notFound').en}</p>
        <Dialogue id="notFoundSub" size="sm" className="mt-6" />
        <p className="mt-6 max-w-md text-charcoal/70">
          The page you were looking for does not exist or has moved. Try the portfolio, or start from the home page.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink to="/">Home</ButtonLink>
          <ButtonLink to="/projects" variant="outline" arrow={false}>
            Projects
          </ButtonLink>
        </div>
      </div>
      <Picture image={{ src: '/images/renders/mylapore-living-before', alt: 'An empty, unfinished room awaiting renovation', ratio: 1.6 }} sizes="(min-width: 768px) 50vw, 100vw" />
    </section>
  )
}
