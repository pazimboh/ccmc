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
  refreshUserData: () => Promise<void>;
  localAuthLoaded: boolean;
  triggerStateSyncFromLocalStorage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localAuthLoaded, setLocalAuthLoaded] = useState(false);

  const isApproved = profile?.status === 'approved';
  const isAdmin = userRole?.role === 'admin';

  const triggerStateSyncFromLocalStorage = () => {
    console.log("AuthContext: Manually triggered state sync from LocalStorage.");
    const lsUser = localStorage.getItem("user");
    const lsSession = localStorage.getItem("session");
    const lsProfile = localStorage.getItem("profile");
    const lsUserRole = localStorage.getItem("userRole");

    let userChanged = false;
    if (lsUser && lsSession) {
      const parsedUser = JSON.parse(lsUser);
      const parsedSession = JSON.parse(lsSession);
      if (JSON.stringify(user) !== JSON.stringify(parsedUser)) setUser(parsedUser);
      if (JSON.stringify(session) !== JSON.stringify(parsedSession)) setSession(parsedSession);

      if (lsProfile) {
        const parsedProfile = JSON.parse(lsProfile);
        if (JSON.stringify(profile) !== JSON.stringify(parsedProfile)) setProfile(parsedProfile);
      } else {
        if (profile !== null) setProfile(null);
      }
      if (lsUserRole) {
        const parsedUserRole = JSON.parse(lsUserRole);
        if (JSON.stringify(userRole) !== JSON.stringify(parsedUserRole)) setUserRole(parsedUserRole);
      } else {
        if (userRole !== null) setUserRole(null);
      }
      userChanged = true;
    } else {
      if (user !== null) setUser(null);
      if (session !== null) setSession(null);
      if (profile !== null) setProfile(null);
      if (userRole !== null) setUserRole(null);
    }
    setIsLoading(false);
    // console.log("AuthContext: Sync complete. User from LS:", lsUser ? JSON.parse(lsUser) : null);
    return userChanged; // Indicate if user state was established from LS
  };

  const refreshUserData = async () => {
    console.log("AuthContext: Refreshing user data from Supabase.");
    setIsLoading(true);
    const { data: { user: currentSupabaseUser }, error: userError } = await supabase.auth.getUser();
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

    if (userError || sessionError) {
        console.error("AuthContext: Error getting user/session from Supabase", userError || sessionError);
        // Potentially clear local state if Supabase session is invalid
        signOut(); // This will clear local storage and set loading to false
        return;
    }

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
      
      if (profileError) {
        console.error('AuthContext: Profile fetch error on refresh:', profileError.message);
        localStorage.removeItem('profile');
        setProfile(null);
      } else if (profileData) {
        localStorage.setItem('profile', JSON.stringify(profileData));
        setProfile(profileData as Profile);
      } else {
        localStorage.removeItem('profile');
        setProfile(null);
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (roleError) {
        console.error('AuthContext: Role fetch error on refresh:', roleError.message);
        localStorage.removeItem('userRole');
        setUserRole(null);
      } else if (roleData) {
        localStorage.setItem('userRole', JSON.stringify(roleData));
        setUserRole(roleData as UserRole);
      } else {
        localStorage.removeItem('userRole');
        setUserRole(null);
      }
    } else {
      console.log("AuthContext: No active Supabase session found during refresh. Clearing local data.");
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
    console.log("AuthContext: Signing out.");
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('AuthContext: Error during Supabase signOut:', error);
    } finally {
      // Clear all auth-related local storage and context state
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
    }
  };

  useEffect(() => {
    console.log("AuthContext: Initializing...");
    // Attempt to load from LS. This also sets isLoading to false.
    const userFoundInLs = triggerStateSyncFromLocalStorage();
    setLocalAuthLoaded(true);

    if (!userFoundInLs) {
        console.log("AuthContext: No user found from LS on initial load. Checking Supabase session.");
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (currentSession?.user) {
                console.log("AuthContext: Active Supabase session found. Refreshing data.");
                refreshUserData(); // Fetches from Supabase, updates LS, updates context, sets isLoading.
            } else {
                console.log("AuthContext: No active Supabase session found.");
                // triggerStateSyncFromLocalStorage already set user to null and isLoading to false.
            }
        });
    } else {
        console.log("AuthContext: User successfully loaded from LS on initial load.");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`AuthContext: onAuthStateChange event: ${event}`, newSession?.user?.email || '');
        
        if (event === "SIGNED_IN") {
          // This event can be triggered by Login.tsx OR by external means (magic link, other tab).
          // Login.tsx will call triggerStateSyncFromLocalStorage() itself after populating LS.
          // For external sign-ins, refreshUserData() is more appropriate.
          // The challenge is distinguishing. A simple check: if context's user is already set
          // to newSession's user, maybe Login.tsx handled it.
          // This logic can be tricky. Let's assume refreshUserData is safer for generic SIGNED_IN events.
          // Login.tsx's explicit sync call should ideally complete before this does much if it's a local login.
          console.log("AuthContext: SIGNED_IN event. Refreshing user data to ensure consistency.");
          await refreshUserData();
        } else if (event === "SIGNED_OUT") {
          // Handles external sign-outs. signOut() function handles local ones.
          console.log("AuthContext: SIGNED_OUT event. Clearing all auth data.");
          signOut(); // Use the internal signOut to clear everything consistently.
        } else if (event === "TOKEN_REFRESHED" && newSession) {
            console.log('AuthContext: TOKEN_REFRESHED event.');
            if (newSession) {
                localStorage.setItem("session", JSON.stringify(newSession));
                setSession(newSession); // Update session in context
                // Verify user from new session
                const userFromSession = newSession.user;
                if (user && userFromSession.id === user.id) {
                    localStorage.setItem("user", JSON.stringify(userFromSession));
                    setUser(userFromSession); // Update user in context if it changed
                } else {
                    // User mismatch or no user, better to refresh all data
                    await refreshUserData();
                }
            } else {
                // No session after refresh? Treat as sign out.
                await signOut();
            }
            setIsLoading(false);
        } else if (event === "USER_UPDATED") {
            console.log('AuthContext: USER_UPDATED event.');
            await refreshUserData();
        } else if (event === "PASSWORD_RECOVERY") {
            console.log('AuthContext: PASSWORD_RECOVERY event. Usually means user is sent a recovery link.');
            // No specific state change here, user needs to act on the email.
            setIsLoading(false);
        }
      }
    );

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChange.");
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
        triggerStateSyncFromLocalStorage,
        localAuthLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
