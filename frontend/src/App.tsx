import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
  Link,
  Navigate,
} from "react-router-dom";
import { MapPinOff } from "lucide-react";
import { AuthProvider, useAuthContext } from "./store/AuthContext";
import { ThemeProvider } from "./store/ThemeContext";
import { ToastProvider } from "@/components/ui/Toast";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import LoadingSpinner from "./components/common/LoadingSpinner";
import ServerWakeNotice from "./components/layout/ServerWakeNotice";
import { LoginPage, RegisterPage } from "@/pages/auth";
import LandingPage from "@/pages/landing/LandingPage";
import MyEventsPage from "@/pages/events/MyEventsPage";
import ProfilePage from "@/pages/main/ProfilePage";
import { AdminReportsPage, AdminEventsPage } from "@/pages/admin";
import { PrivacyPage, ImprintPage, AboutPage } from "@/pages/legal/LegalPages";
import { EmptyState } from "@/components/ui/DataPieces";
import { TOKEN_KEY } from "@/api/axiosInstance";
import "./App.css";

// Map-heavy pages load on demand so MapLibre stays out of the landing bundle.
const DiscoverPage = lazy(() => import("@/pages/events/DiscoverPage"));
const EventDetailPage = lazy(() => import("@/pages/events/EventDetailPage"));
const EventFormPage = lazy(() => import("@/pages/events/EventFormPage"));

export const DISCOVER_PATH = "/entdecken";

function Layout() {
  const { pathname } = useLocation();
  // The discovery views are full-height map/list layouts without a footer.
  const fullBleed = pathname === DISCOVER_PATH || pathname === "/karte";
  return (
    <div className={`app-shell${fullBleed ? " app-shell--full" : ""}`}>
      <Navbar />
      <main id="main" className="app-main">
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      {!fullBleed && <Footer />}
    </div>
  );
}

/** Public landing for guests; signed-in users go straight to the app. */
function HomeRoute() {
  const { authState } = useAuthContext();
  let hasToken = false;
  try {
    hasToken = !!localStorage.getItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: treat as guest */
  }
  if (authState.isLoading && hasToken) return <LoadingSpinner fullScreen />;
  if (authState.isLoggedIn) return <Navigate to={DISCOVER_PATH} replace />;
  return <LandingPage />;
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
  );
}

export default function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ThemeProvider>
        <AuthProvider>
          <a href="#main" className="skip-link">
            Zum Inhalt springen
          </a>
          <ServerWakeNotice />
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/registrieren" element={<RegisterPage />} />
                <Route path="/" element={<HomeRoute />} />
                <Route
                  path={DISCOVER_PATH}
                  element={<DiscoverPage initialView="list" />}
                />
                <Route
                  path="/karte"
                  element={<DiscoverPage initialView="map" />}
                />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/datenschutz" element={<PrivacyPage />} />
                <Route path="/impressum" element={<ImprintPage />} />
                <Route path="/ueber" element={<AboutPage />} />

                {/* Signed-in */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/events/neu" element={<EventFormPage />} />
                  <Route
                    path="/events/:id/bearbeiten"
                    element={<EventFormPage />}
                  />
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
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
