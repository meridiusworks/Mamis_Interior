import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { SiteLayout } from './components/layout/SiteLayout'
import { RouteError } from './pages/RouteError'

// Every page is its own chunk; the 3D stack only loads with the pages that use it.
const Home = lazy(() => import('./pages/Home'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const Studio = lazy(() => import('./pages/Studio'))
const Services = lazy(() => import('./pages/Services'))
const Experience = lazy(() => import('./pages/Experience'))
const Transformations = lazy(() => import('./pages/Transformations'))
const Materials = lazy(() => import('./pages/Materials'))
const Journal = lazy(() => import('./pages/Journal'))
const Article = lazy(() => import('./pages/Article'))
const Recognition = lazy(() => import('./pages/Recognition'))
const Consultation = lazy(() => import('./pages/Consultation'))
const Contact = lazy(() => import('./pages/Contact'))
const NotFound = lazy(() => import('./pages/NotFound'))

const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/projects', element: <Projects /> },
      { path: '/projects/:slug', element: <ProjectDetail /> },
      { path: '/studio', element: <Studio /> },
      { path: '/services', element: <Services /> },
      { path: '/experience', element: <Experience /> },
      { path: '/transformations', element: <Transformations /> },
      { path: '/materials', element: <Materials /> },
      { path: '/journal', element: <Journal /> },
      { path: '/journal/:slug', element: <Article /> },
      { path: '/recognition', element: <Recognition /> },
      { path: '/consultation', element: <Consultation /> },
      { path: '/contact', element: <Contact /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
