
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  isLoading: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>; // Keep for now, might be adapted
  localAuthLoaded: boolean; // New state to track if local storage has been checked
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const initialUser = (): User | null => {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

const initialSession = (): Session | null => {
  const sessionStr = localStorage.getItem("session");
  return sessionStr ? JSON.parse(sessionStr) : null;
};

const initialProfile = (): Profile | null => {
  const profileStr = localStorage.getItem("profile");
  return profileStr ? JSON.parse(profileStr) : null;
};

const initialUserRole = (): UserRole | null => {
  const roleStr = localStorage.getItem("userRole");
  return roleStr ? JSON.parse(roleStr) : null;
};


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [userRole, setUserRole] = useState<UserRole | null>(initialUserRole);
  const [isLoading, setIsLoading] = useState(true); // True until local storage check + initial Supabase sync
  const [localAuthLoaded, setLocalAuthLoaded] = useState(false);


  const isApproved = profile?.status === 'approved';
  const isAdmin = userRole?.role === 'admin';

  // This function can be used by login/registration to manually update context after storing in localStorage
  // Or after a manual refresh action by the user.
  const refreshUserData = async () => {
    setIsLoading(true);
    const currentSupabaseUser = (await supabase.auth.getUser()).data.user;
    const currentSession = (await supabase.auth.getSession()).data.session;

    if (currentSupabaseUser && currentSession) {
      localStorage.setItem("user", JSON.stringify(currentSupabaseUser));
      localStorage.setItem("session", JSON.stringify(currentSession));
      setUser(currentSupabaseUser);
      setSession(currentSession);

      const userId = currentSupabaseUser.id;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) console.error('Profile fetch error on refresh:', profileError.message);
      else {
        localStorage.setItem('profile', JSON.stringify(profileData));
        setProfile(profileData as Profile || null);
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (roleError) console.error('Role fetch error on refresh:', roleError.message);
      else {
        localStorage.setItem('userRole', JSON.stringify(roleData));
        setUserRole(roleData as UserRole || null);
      }
    } else {
      // No active Supabase session, clear local storage and context state
      localStorage.removeItem("user");
      localStorage.removeItem("session");
      localStorage.removeItem("profile");
      localStorage.removeItem("userRole");
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
    }
    setIsLoading(false);
  };


  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear local storage
      localStorage.removeItem("user");
      localStorage.removeItem("session");
      localStorage.removeItem("profile");
      localStorage.removeItem("userRole");
      localStorage.removeItem("dashboardAccounts"); // Also clear dashboard data
      localStorage.removeItem("dashboardTransactions");
      // Clear state in context
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      // isLoading should be false as we are definitively logged out
      setIsLoading(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    // Initialize from localStorage first
    const lsUser = localStorage.getItem("user");
    const lsSession = localStorage.getItem("session");
    const lsProfile = localStorage.getItem("profile");
    const lsUserRole = localStorage.getItem("userRole");

    if (lsUser && lsSession) {
      setUser(JSON.parse(lsUser));
      setSession(JSON.parse(lsSession));
      if (lsProfile) setProfile(JSON.parse(lsProfile));
      if (lsUserRole) setUserRole(JSON.parse(lsUserRole));
      setIsLoading(false); // Data loaded from localStorage, initial loading done
    } else {
      // No data in localStorage, check Supabase session (e.g. if user was already logged in via Supabase)
      // This also covers the case where localStorage might be cleared but Supabase session is still active
      supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
        if (currentSession?.user) {
          // Active Supabase session found, populate localStorage and context
          await refreshUserData(); // This will fetch user, profile, role and set localStorage
        } else {
          setIsLoading(false); // No local or Supabase session
        }
      });
    }
    setLocalAuthLoaded(true);


    // Supabase auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state change event:', event, newSession?.user?.email); // Existing log
        
        if (event === "SIGNED_IN" && newSession?.user) {
          console.log('AuthContext: SIGNED_IN event triggered.');
          // Login.tsx is responsible for populating LocalStorage on a fresh sign-in.
          // AuthContext needs to ensure its state reflects this and isLoading is false.

          const lsUser = localStorage.getItem("user");
          const lsSession = localStorage.getItem("session");

          if (lsUser && lsSession) {
            console.log('AuthContext: User and session found in LocalStorage after SIGNED_IN. Updating context state.');
            setUser(JSON.parse(lsUser));
            setSession(JSON.parse(lsSession));
            const lsProfile = localStorage.getItem("profile");
            if (lsProfile) setProfile(JSON.parse(lsProfile)); else setProfile(null);
            const lsUserRole = localStorage.getItem("userRole");
            if (lsUserRole) setUserRole(JSON.parse(lsUserRole)); else setUserRole(null);

            // It's good practice to ensure Supabase client has the latest session from the event
            if (newSession) supabase.auth.setSession(newSession);

          } else {
            // This case implies that Login.tsx might not have completed LocalStorage population
            // before this event fired, or an external sign-in happened without Login.tsx's direct involvement.
            console.warn('AuthContext: SIGNED_IN event, but user/session not found immediately in LS. Calling refreshUserData as a fallback.');
            await refreshUserData(); // refreshUserData handles setting context state, localStorage, and isLoading.
          }
          setIsLoading(false); // Explicitly set isLoading to false after handling SIGNED_IN.
        } else if (event === "SIGNED_OUT") {
          console.log('AuthContext: SIGNED_OUT event triggered.');
          // SignOut function (called by user action) already clears local storage and state.
          // This listener block ensures consistency if sign-out happens e.g. in another tab or via direct Supabase call.
          localStorage.removeItem("user");
          localStorage.removeItem("session");
          localStorage.removeItem("profile");
          localStorage.removeItem("userRole");
          localStorage.removeItem("dashboardAccounts");
          localStorage.removeItem("dashboardTransactions");
          setUser(null);
          setSession(null);
          setProfile(null);
          setUserRole(null);
          setIsLoading(false);
        } else if (event === "TOKEN_REFRESHED" && newSession) {
            // Update session in localStorage and context
            localStorage.setItem("session", JSON.stringify(newSession));
            setSession(newSession);
            // User data typically doesn't change on token refresh, but session does.
            // Profile and role are unlikely to change with token refresh.
            setIsLoading(false); // Ensure loading is false after token refresh
        } else if (event === "USER_UPDATED" && newSession?.user) {
            // If user metadata changes (e.g. email), refresh everything
            await refreshUserData();
        }
        // Initial session is handled by the getSession call above.
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Run once on mount

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        userRole,
        isLoading,
        isApproved,
        isAdmin,
        signOut,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
