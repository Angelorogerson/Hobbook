import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import { VenueProvider } from './store/VenueContext'
import { EventProvider } from './store/EventContext'
import { BookingProvider } from './store/BookingContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import { LoginPage, RegisterPage } from '@/pages/auth'
import { HomePage, SearchPage, ProfilePage, DashboardPage, FavoritesPage, VenueDetailPage, BookingsPage } from '@/pages/main'
import { ConnectPage, CreateEventPage } from '@/pages/connect'
import { AdminDashboardPage, VenueListAdminPage, VenueFormPage, BookingsAdminPage, ConnectEventListAdminPage, ConnectEventFormAdminPage } from '@/pages/admin'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VenueProvider>
          <EventProvider>
            <BookingProvider>
              <Navbar />
              <Routes>
              {/* Redirect root to home */}
              <Route path="/" element={<Navigate to="/home" replace />} />

              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/venues/:id" element={<VenueDetailPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/connect" element={<ConnectPage />} />
                <Route path="/connect/new" element={<CreateEventPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/venues" element={<VenueListAdminPage />} />
                <Route path="/admin/venues/new" element={<VenueFormPage />} />
                <Route path="/admin/venues/:id/edit" element={<VenueFormPage />} />
                <Route path="/admin/events" element={<ConnectEventListAdminPage />} />
                <Route path="/admin/events/new" element={<ConnectEventFormAdminPage />} />
                <Route path="/admin/events/:id/edit" element={<ConnectEventFormAdminPage />} />
                <Route path="/admin/events/:id/view" element={<ConnectEventFormAdminPage />} />
                <Route path="/admin/bookings" element={<BookingsAdminPage />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<div>404 - Page Not Found</div>} />
            </Routes>
            </BookingProvider>
          </EventProvider>
        </VenueProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
