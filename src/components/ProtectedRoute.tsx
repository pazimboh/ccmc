
import { Navigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  account_type?: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface UserRole {
  role: 'admin' | 'customer';
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  // Read directly from LocalStorage
  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const profileStr = localStorage.getItem("profile");
  const profile: Profile | null = profileStr ? JSON.parse(profileStr) : null;

  const userRoleStr = localStorage.getItem("userRole");
  const userRole: UserRole | null = userRoleStr ? JSON.parse(userRoleStr) : null;

  // isLoading can be set to false as we are doing a synchronous check on localStorage.
  // A more sophisticated approach might involve a brief loading state if we still want to use AuthContext's isLoading for initial app load.
  // For now, assume localStorage is the source of truth and if it's not there, the user is not logged in for this route.
  const isLoading = false;


  // Log current state for debugging
  // console.log('ProtectedRoute (LocalStorage) check:', {
  //   user: user?.email,
  //   profileStatus: profile?.status,
  //   role: userRole?.role,
  //   requireAdmin
  // });

  if (isLoading) { // This isLoading is now vestigial if we only use localStorage.
                  // It might be reintroduced if we wait for AuthContext to confirm localStorage.
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading user session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // console.log('ProtectedRoute (LocalStorage): No user, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  const isAdmin = userRole?.role === 'admin';
  const isApproved = profile?.status === 'approved';

  if (requireAdmin && !isAdmin) {
    // console.log('ProtectedRoute (LocalStorage): Admin required, user is not admin. Redirecting to /dashboard.');
    return <Navigate to="/dashboard" replace />; // Or an unauthorized page
  }

  // For non-admin routes, if the user is not approved AND not an admin (admins bypass approval for normal routes)
  // As per new requirements, users pending approval should now go to the dashboard.
  // So, this check for !isApproved is no longer needed to redirect to a special page.
  // Users who are 'pending' or 'rejected' will be able to access the dashboard.
  // The previous logic was:
  // if (!requireAdmin && !isApproved && !isAdmin) {
  //   console.log('ProtectedRoute: User not approved and not admin. Redirecting to /pending-approval.');
  //   return <Navigate to="/pending-approval" replace />;
  // }
  // This redirection to /pending-approval is now removed.

  // console.log('ProtectedRoute (LocalStorage): All checks passed, rendering children.');
  return <>{children}</>;
};

export default ProtectedRoute;
