
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom'; // Import Navigate

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, isLoading, isApproved, isAdmin, profile } = useAuth(); // profile is implicitly part of isLoading's correctness for isApproved

  // Log current state for debugging, can be removed in production
  console.log('ProtectedRoute check:', {
    user: user?.email,
    isLoading,
    profileStatus: profile?.status, // More direct check for what isApproved depends on
    isApproved,
    isAdmin,
    requireAdmin
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading user session...</p> {/* More specific loading message */}
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  // At this point, user is authenticated (user object exists)
  // Now check admin and approval status

  if (requireAdmin && !isAdmin) {
    console.log('ProtectedRoute: Admin required, user is not admin. Redirecting to /dashboard.');
    // Or redirect to a specific "Unauthorized" page if available
    return <Navigate to="/dashboard" replace />;
  }

  // This condition applies only if NOT requiring admin
  // If requireAdmin is true, the above condition handles it.
  // If requireAdmin is false, then we check for approval for regular protected routes.
  // An admin user should bypass the approval check for regular routes.
  if (!requireAdmin && !isApproved && !isAdmin) {
    console.log('ProtectedRoute: User not approved and not admin. Redirecting to /pending-approval.');
    return <Navigate to="/pending-approval" replace />;
  }

  // If all checks pass, render the children
  console.log('ProtectedRoute: All checks passed, rendering children.');
  return <>{children}</>;
};

export default ProtectedRoute;
