import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation, Link } from 'react-router-dom'
import { MapPinOff } from 'lucide-react'
import { AuthProvider, useAuthContext } from './store/AuthContext'
import { ThemeProvider } from './store/ThemeContext'
import { ToastProvider } from '@/components/ui/Toast'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import LoadingSpinner from './components/common/LoadingSpinner'
import ServerWakeNotice from './components/layout/ServerWakeNotice'
import { LoginPage, RegisterPage } from '@/pages/auth'
import LandingPage from '@/pages/landing/LandingPage'
import MyEventsPage from '@/pages/events/MyEventsPage'
import ProfilePage from '@/pages/main/ProfilePage'
import HomePage from '@/pages/main/HomePage'
import { AdminReportsPage, AdminEventsPage } from '@/pages/admin'
import { PrivacyPage, ImprintPage, AboutPage, RulesPage } from '@/pages/legal/LegalPages'
import { EmptyState } from '@/components/ui/DataPieces'
import { TOKEN_KEY } from '@/api/axiosInstance'
import './App.css'

// Map-heavy pages load on demand so MapLibre stays out of the landing bundle.
const DiscoverPage = lazy(() => import('@/pages/events/DiscoverPage'))
const EventDetailPage = lazy(() => import('@/pages/events/EventDetailPage'))
const EventFormPage = lazy(() => import('@/pages/events/EventFormPage'))
const GroupPage = lazy(() => import('@/pages/groups/GroupPage'))
const NotificationsPage = lazy(() => import('@/pages/main/NotificationsPage'))
const PublicProfilePage = lazy(() => import('@/pages/main/PublicProfilePage'))
const AnswerLinkPage = lazy(() => import('@/pages/main/LinkActionPages').then((m) => ({ default: m.AnswerLinkPage })))
const MuteLinkPage = lazy(() => import('@/pages/main/LinkActionPages').then((m) => ({ default: m.MuteLinkPage })))
const AdminMetricsPage = lazy(() => import('@/pages/admin/AdminMetricsPage'))
const WelcomePage = lazy(() => import('@/pages/auth/WelcomePage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'))
const PosterPage = lazy(() => import('@/pages/events/PosterPage'))
const FeedbackPage = lazy(() => import('@/pages/main/FeedbackPage'))
const AdminFeedbackPage = lazy(() => import('@/pages/admin/AdminFeedbackPage'))

export const DISCOVER_PATH = '/entdecken'

function Layout() {
  const { pathname } = useLocation()
  // The discovery views are full-height map/list layouts without a footer.
  const fullBleed = pathname === DISCOVER_PATH || pathname === '/karte'
  return (
    <div className={`app-shell${fullBleed ? ' app-shell--full' : ''}`}>
      <Navbar />
      <main id="main" className="app-main">
        <Suspense fallback={<LoadingSpinner />}>
          <div key={pathname} className="route">
            <Outlet />
          </div>
        </Suspense>
      </main>
      {!fullBleed && <Footer />}
    </div>
  )
}

/** Public landing for guests; signed-in users get their personal start page. */
function HomeRoute() {
  const { authState } = useAuthContext()
  let hasToken = false
  try {
    hasToken = !!localStorage.getItem(TOKEN_KEY)
  } catch {
    /* storage unavailable: treat as guest */
  }
  if (authState.isLoading && hasToken) return <LoadingSpinner fullScreen />
  if (authState.isLoggedIn) return <HomePage />
  return <LandingPage />
}

function NotFound() {
  return (
    <div className="page">
      <EmptyState
        icon={<MapPinOff size={24} aria-hidden="true" />}
        title="Seite nicht gefunden"
        action={
          <Link to={DISCOVER_PATH} className="btn btn-primary">
            Zu den Events
          </Link>
        }
      >
        Diese Seite gibt es nicht (mehr).
      </EmptyState>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <a href="#main" className="skip-link">
            Zum Inhalt springen
          </a>
          <ServerWakeNotice />
          <ToastProvider>
          <Routes>
            {/* Printable posters: no navigation around them */}
            <Route
              element={
                <Suspense fallback={<LoadingSpinner fullScreen />}>
                  <Outlet />
                </Suspense>
              }
            >
              <Route path="/events/:id/aushang" element={<PosterPage />} />
              <Route path="/stammspiel/:key/aushang" element={<PosterPage />} />
            </Route>

            <Route element={<Layout />}>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registrieren" element={<RegisterPage />} />
              <Route path="/passwort-vergessen" element={<ForgotPasswordPage />} />
              <Route path="/passwort-neu/:token" element={<ResetPasswordPage />} />
              <Route path="/email-bestaetigen/:token" element={<VerifyEmailPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/" element={<HomeRoute />} />
              <Route path={DISCOVER_PATH} element={<DiscoverPage initialView="list" />} />
              <Route path="/karte" element={<DiscoverPage initialView="map" />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/datenschutz" element={<PrivacyPage />} />
              <Route path="/impressum" element={<ImprintPage />} />
              <Route path="/ueber" element={<AboutPage />} />
              <Route path="/regeln" element={<RulesPage />} />
              <Route path="/s/:key" element={<GroupPage />} />
              <Route path="/stammspiel/:key" element={<GroupPage />} />
              <Route path="/leute/:id" element={<PublicProfilePage />} />
              <Route path="/antwort/:token" element={<AnswerLinkPage />} />
              <Route path="/stumm/:token" element={<MuteLinkPage />} />

              {/* Signed-in */}
              <Route element={<ProtectedRoute />}>
                <Route path="/events/neu" element={<EventFormPage />} />
                <Route path="/events/:id/bearbeiten" element={<EventFormPage />} />
                <Route path="/meine-events" element={<MyEventsPage />} />
                <Route path="/profil" element={<ProfilePage />} />
                <Route path="/benachrichtigungen" element={<NotificationsPage />} />
                <Route path="/willkommen" element={<WelcomePage />} />
                <Route path="/stammspiel/:groupId/bearbeiten" element={<EventFormPage />} />
              </Route>

              {/* Moderation */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/admin" element={<AdminReportsPage />} />
                <Route path="/admin/events" element={<AdminEventsPage />} />
                <Route path="/admin/kennzahlen" element={<AdminMetricsPage />} />
                <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
