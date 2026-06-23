'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

/**
 * ProtectedRoute Component
 *
 * Wraps pages that require authentication.
 * - Redirects unauthenticated users to /login
 * - Optionally checks for specific roles
 * - Shows loading state while verifying auth
 *
 * Usage:
 * ```tsx
 * export default function DashboardPage() {
 *   return (
 *     <ProtectedRoute requiredRoles={['TOMADOR', 'ADMIN']}>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   );
 * }
 * ```
 */
export function ProtectedRoute({
  children,
  requiredRoles,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Check role-based access
  if (isAuthenticated && requiredRoles && user) {
    const hasRequiredRole = requiredRoles.includes(user.role);
    if (!hasRequiredRole) {
      // User is authenticated but doesn't have required role
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '1.5rem',
          background: 'linear-gradient(150deg, #F0F5FF 0%, #FFFFFF 55%, #F0FDF7 100%)',
        }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: '2.25rem',
            maxWidth: 400,
            textAlign: 'center',
            boxShadow: '0 24px 60px rgba(15,23,42,0.1)',
            border: '1px solid var(--border)',
          }}>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.35rem' }}>
              Acesso Negado
            </h1>
            <p style={{ fontSize: '0.83rem', color: 'var(--gray)', marginBottom: '1.5rem' }}>
              Você não tem permissão para acessar esta página.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                width: '100%',
                background: 'var(--blue)',
                color: 'white',
                padding: '0.85rem',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
              }}
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  // Show loading state
  if (loading) {
    return (
      fallback || (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(150deg, #F0F5FF 0%, #FFFFFF 55%, #F0FDF7 100%)',
        }}>
          <div style={{
            textAlign: 'center',
            color: 'var(--gray)',
          }}>
            <div style={{
              width: 40,
              height: 40,
              border: '3px solid var(--border)',
              borderTop: '3px solid var(--blue)',
              borderRadius: '50%',
              margin: '0 auto 1rem',
              animation: 'spin 1s linear infinite',
            }} />
            <p>Carregando...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )
    );
  }

  // Not authenticated - shouldn't reach here due to useEffect redirect, but just in case
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated and authorized
  return <>{children}</>;
}

/**
 * Variant: Render children only if authenticated
 * Usage for conditional rendering (not full-page protection)
 */
export function RequireAuth({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <>{fallback}</>;
  if (!isAuthenticated) return <>{fallback}</>;
  return <>{children}</>;
}
