
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface Profile { // Define Profile if not already globally available or imported
  status: 'pending' | 'approved' | 'rejected';
}

interface UserRole { // Define UserRole if not already globally available or imported
  role: 'admin' | 'customer';
}

interface GuestRouteProps {
  children: React.ReactNode;
}

const GuestRoute = ({ children }: GuestRouteProps) => {
  const navigate = useNavigate();

  // Read directly from LocalStorage
  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const profileStr = localStorage.getItem("profile");
  const profile: Profile | null = profileStr ? JSON.parse(profileStr) : null;

  const userRoleStr = localStorage.getItem("userRole");
  const userRole: UserRole | null = userRoleStr ? JSON.parse(userRoleStr) : null;

  // No isLoading concept here from AuthContext, direct check.
  // The useEffect will handle redirection if a user is found in localStorage.

  useEffect(() => {
    if (user) { // If a user is found in localStorage
      const isAdmin = userRole?.role === 'admin';
      const isApproved = profile?.status === 'approved';

      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else if (isApproved) {
        navigate('/dashboard', { replace: true });
      } else {
        // User is logged in but not admin and not approved (e.g., pending)
        // As per new requirements, redirect to dashboard.
        // Old: navigate('/pending-approval', { replace: true });
        navigate('/dashboard', { replace: true });
      }
    }
    // If no user in localStorage, the children (Guest pages like Login/Register) will render.
  }, [user, profile, userRole, navigate]);


  // If user exists in localStorage, we are about to redirect, so render null.
  // Otherwise, render the children (Login, Register page etc.)
  if (user) {
    return null;
  }

  return <>{children}</>;
};

export default GuestRoute;
