import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AUTH } from '@template-dev/shared'
import { useIsAuthenticated, useAuthLoading } from './stores/auth.store'
import { useSseStore } from './stores/sse.store'
import { useEntityInvalidation } from './hooks/useEntityInvalidation'
import { usePreferencesSync } from './hooks/use-preferences-sync'
import AppLayout from './components/layout/AppLayout'
import MiseAJour from './components/MiseAJour'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'

// Kit de design (.flow/design-kit.md) : en développement seulement. En production la condition vaut
// `false` à la compilation, et ni le panneau ni les prototypes n'entrent dans le bundle.
const DesignKit = import.meta.env.DEV ? lazy(() => import('./design-kit/DesignKit')) : null
const PrototypesPage = import.meta.env.DEV
  ? lazy(() => import('./design-kit/PrototypesPage'))
  : null

// ============================================================================
// SSE MANAGER
// ============================================================================

function SseManager() {
  const isAuthenticated = useIsAuthenticated()
  useEntityInvalidation()
  usePreferencesSync()

  useEffect(() => {
    if (isAuthenticated) {
      useSseStore.getState().connect()
    } else {
      useSseStore.getState().disconnect()
    }
    return () => {
      useSseStore.getState().disconnect()
    }
  }, [isAuthenticated])

  return null
}

// ============================================================================
// ROUTE GUARDS
// ============================================================================

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const isLoading = useAuthLoading()
  const location = useLocation()

  if (isLoading) return <Loading />

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return <AppLayout>{children}</AppLayout>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const isLoading = useAuthLoading()

  if (isLoading) return <Loading />

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

// ============================================================================
// APP
// ============================================================================

// Les écrans du mode `password` (packages/shared/src/app.config.ts) ; en mode `magic-link`
// la page de connexion suffit.
const password = AUTH.mode === 'password'

function App() {
  return (
    <>
      <SseManager />
      <MiseAJour />
      {DesignKit && (
        <Suspense fallback={null}>
          <DesignKit />
        </Suspense>
      )}
      <Routes>
        {PrototypesPage && (
          <Route
            path="/prototypes/*"
            element={
              <Suspense fallback={<Loading />}>
                <PrototypesPage />
              </Suspense>
            }
          />
        )}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        {password && AUTH.signup !== 'invite-only' && (
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignUpPage />
              </PublicRoute>
            }
          />
        )}
        {password && (
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
        )}
        {/* Aussi la page « Créer mon mot de passe » d'une invitation (?invitation=1). */}
        {password && <Route path="/reset-password" element={<ResetPasswordPage />} />}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default App
