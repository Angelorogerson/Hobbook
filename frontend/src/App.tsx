import { BrowserRouter, Routes, Route, Outlet, useLocation, Link } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import { LoginPage, RegisterPage } from '@/pages/auth'
import DiscoverPage from '@/pages/events/DiscoverPage'
import EventDetailPage from '@/pages/events/EventDetailPage'
import EventFormPage from '@/pages/events/EventFormPage'
import MyEventsPage from '@/pages/events/MyEventsPage'
import ProfilePage from '@/pages/main/ProfilePage'
import { AdminReportsPage, AdminEventsPage } from '@/pages/admin'
import { PrivacyPage, ImprintPage, AboutPage } from '@/pages/legal/LegalPages'
import './App.css'

function Layout() {
  const { pathname } = useLocation()
  // The discovery views are full-height map/list layouts without a footer.
  const fullBleed = pathname === '/' || pathname === '/karte'
  return (
    <div className={`app-shell${fullBleed ? ' app-shell--full' : ''}`}>
      <Navbar />
      <main id="main" className="app-main">
        <Outlet />
      </main>
      {!fullBleed && <Footer />}
    </div>
  )
}

function NotFound() {
  return (
    <div className="page">
      <h1 className="page-title">Seite nicht gefunden</h1>
      <p className="page-subtitle">Diese Seite gibt es nicht (mehr).</p>
      <Link to="/" className="btn btn-primary">Zu den Events</Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <a href="#main" className="skip-link">Zum Inhalt springen</a>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registrieren" element={<RegisterPage />} />

          <Route element={<Layout />}>
            {/* Public */}
            <Route path="/" element={<DiscoverPage initialView="list" />} />
            <Route path="/karte" element={<DiscoverPage initialView="map" />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/datenschutz" element={<PrivacyPage />} />
            <Route path="/impressum" element={<ImprintPage />} />
            <Route path="/ueber" element={<AboutPage />} />

            {/* Signed-in */}
            <Route element={<ProtectedRoute />}>
              <Route path="/events/neu" element={<EventFormPage />} />
              <Route path="/events/:id/bearbeiten" element={<EventFormPage />} />
              <Route path="/meine-events" element={<MyEventsPage />} />
              <Route path="/profil" element={<ProfilePage />} />
            </Route>

            {/* Moderation */}
            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/admin" element={<AdminReportsPage />} />
              <Route path="/admin/events" element={<AdminEventsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
