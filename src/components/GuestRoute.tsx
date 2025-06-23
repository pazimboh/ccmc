import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Use AuthContext
import { useNavigate } from 'react-router-dom';
// User, Profile, UserRole types might be needed if not inferred correctly from useAuth()
// For now, assuming they are correctly inferred or available in AuthContext's return type.

interface GuestRouteProps {
  children: React.ReactNode;
}

const GuestRoute = ({ children }: GuestRouteProps) => {
  const { user, profile, userRole, isLoading, localAuthLoaded } = useAuth(); // Get user state from context
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth context to finish its initial loading from LS/Supabase.
    // And only act if a user object is present.
    if (!isLoading && localAuthLoaded && user) {
      // console.log("GuestRoute: User detected in context, attempting redirect.", user);
      const isAdmin = userRole?.role === 'admin';
      // const isApproved = profile?.status === 'approved'; // Not strictly needed for this redirect logic if pending also goes to dashboard

      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        // All non-admin logged-in users (approved, pending, etc.) go to dashboard from a guest route
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, profile, userRole, isLoading, localAuthLoaded, navigate]);

  // If AuthContext is still loading its initial state, don't render children yet.
  // Could show a global loader/spinner here, or null.
  if (isLoading && !localAuthLoaded) {
     // console.log("GuestRoute: Auth is loading, rendering null.");
    return null; // Or a loading spinner
  }

  // If auth has loaded and there IS a user, it means redirection is about to happen via useEffect.
  // So, don't render the children (e.g., Login form).
  if (localAuthLoaded && user) {
    // console.log("GuestRoute: Auth loaded and user exists, rendering null (expecting redirect).");
    return null;
  }

  // Only render children (Login, Register page) if auth has loaded and there is NO user.
  // console.log("GuestRoute: Auth loaded and no user, rendering children.");
  return <>{children}</>;
};

export default GuestRoute;
