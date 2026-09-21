import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useIsAuthenticated, useAuthLoading, useAccessToken } from './stores/auth.store'
import { useSseStore } from './stores/sse.store'
import { useEntityInvalidation } from './hooks/useEntityInvalidation'
import { usePreferencesSync } from './hooks/use-preferences-sync'
import AppLayout from './components/layout/AppLayout'
import MiseAJour from './components/MiseAJour'
import LoginPage from './pages/LoginPage'
import VerifyPage from './pages/VerifyPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'

// ============================================================================
// SSE MANAGER
// ============================================================================

function SseManager() {
  const accessToken = useAccessToken()
  const isAuthenticated = useIsAuthenticated()
  useEntityInvalidation()
  usePreferencesSync()

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      useSseStore.getState().connect(accessToken)
    } else {
      useSseStore.getState().disconnect()
    }
    return () => {
      useSseStore.getState().disconnect()
    }
  }, [isAuthenticated, accessToken])

  return null
}

// ============================================================================
// ROUTE GUARDS
// ============================================================================

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const isLoading = useAuthLoading()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    )
  }

  return isAuthenticated ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const isLoading = useAuthLoading()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    )
  }

  return isAuthenticated ? <Navigate to="/dashboard" /> : <>{children}</>
}

// ============================================================================
// APP
// ============================================================================

function App() {
  return (
    <>
      <SseManager />
      <MiseAJour />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/auth/verify"
          element={
            <PublicRoute>
              <VerifyPage />
            </PublicRoute>
          }
        />
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
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </>
  )
}

export default App
