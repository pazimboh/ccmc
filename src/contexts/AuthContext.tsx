import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Module-level flag
let isLocalLoginAttemptInProgress = false;

export const setLocalLoginAttemptFlag = (value: boolean) => {
  // console.log(`AuthContext: Setting isLocalLoginAttemptInProgress to ${value}`);
  isLocalLoginAttemptInProgress = value;
};

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
  triggerStateSyncFromLocalStorage: () => boolean;
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
    // console.log("AuthContext: triggerStateSyncFromLocalStorage called.");
    const lsUser = localStorage.getItem("user");
    const lsSession = localStorage.getItem("session");
    const lsProfile = localStorage.getItem("profile");
    const lsUserRole = localStorage.getItem("userRole");

    let userActuallyFoundAndSet = false;
    if (lsUser && lsSession) {
      setUser(JSON.parse(lsUser));
      setSession(JSON.parse(lsSession));
      if (lsProfile) setProfile(JSON.parse(lsProfile)); else setProfile(null);
      if (lsUserRole) setUserRole(JSON.parse(lsUserRole)); else setUserRole(null);
      userActuallyFoundAndSet = true;
    } else {
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
    }
    setIsLoading(false);
    return userActuallyFoundAndSet;
  };

  const refreshUserData = async () => {
    console.log("AuthContext: Refreshing user data from Supabase.");
    setIsLoading(true);
    const { data: { user: currentSupabaseUser }, error: userError } = await supabase.auth.getUser();
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

    if (userError || sessionError) {
        console.error("AuthContext: Error getting user/session from Supabase", userError || sessionError);
        await signOutInternalLogic(false); // Avoid calling supabase.auth.signOut again if it failed
        return;
    }

    if (currentSupabaseUser && currentSession) {
      localStorage.setItem("user", JSON.stringify(currentSupabaseUser));
      localStorage.setItem("session", JSON.stringify(currentSession));
      setUser(currentSupabaseUser);
      setSession(currentSession);

      const userId = currentSupabaseUser.id;
      // Profile and Role fetching logic remains the same
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profileError) { localStorage.removeItem('profile'); setProfile(null); }
      else if (profileData) { localStorage.setItem('profile', JSON.stringify(profileData)); setProfile(profileData as Profile); }
      else { localStorage.removeItem('profile'); setProfile(null); }

      const { data: roleData, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', userId).single();
      if (roleError) { localStorage.removeItem('userRole'); setUserRole(null); }
      else if (roleData) { localStorage.setItem('userRole', JSON.stringify(roleData)); setUserRole(roleData as UserRole); }
      else { localStorage.removeItem('userRole'); setUserRole(null); }
    } else {
      // No active Supabase session
      localStorage.removeItem("user"); localStorage.removeItem("session"); localStorage.removeItem("profile"); localStorage.removeItem("userRole");
      setUser(null); setSession(null); setProfile(null); setUserRole(null);
    }
    setIsLoading(false);
  };

  // Separated internal logic for signOut to avoid recursive calls via onAuthStateChange
  const signOutInternalLogic = (callSupabaseSignOut: boolean = true) => {
    console.log("AuthContext: signOutInternalLogic called.");
    if (callSupabaseSignOut) {
        supabase.auth.signOut().catch(err => console.error("AuthContext: Supabase signOut error", err));
    }
    localStorage.removeItem("user"); localStorage.removeItem("session"); localStorage.removeItem("profile"); localStorage.removeItem("userRole");
    localStorage.removeItem("dashboardAccounts"); localStorage.removeItem("dashboardTransactions");
    setLocalLoginAttemptFlag(false); // Clear flag on sign out
    setUser(null); setSession(null); setProfile(null); setUserRole(null);
    setIsLoading(false);
  }

  const signOut = async () => {
    await signOutInternalLogic(true);
  };


  useEffect(() => {
    console.log("AuthContext: Initializing...");
    const userFoundInLs = triggerStateSyncFromLocalStorage();
    setLocalAuthLoaded(true);

    if (!userFoundInLs) {
        console.log("AuthContext: No user from LS on initial load. Checking Supabase session.");
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (currentSession?.user) {
                console.log("AuthContext: Active Supabase session found. Refreshing data.");
                refreshUserData();
            } else {
                console.log("AuthContext: No active Supabase session found.");
            }
        });
    } else {
        console.log("AuthContext: User loaded from LS on initial load.");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`AuthContext: onAuthStateChange event: ${event}`, newSession?.user?.email || '');
        
        if (event === "INITIAL_SESSION") {
            // This event might be redundant if getSession() is already called.
            // However, if it fires and we have a session, ensure data is fresh.
            if (newSession?.user) {
                if(isLocalLoginAttemptInProgress){
                    console.log("AuthContext: INITIAL_SESSION during local login. Deferring to Login.tsx sync.");
                    triggerStateSyncFromLocalStorage(); // Ensure state is from LS
                    setLocalLoginAttemptFlag(false); // Reset flag as login process should take over or complete
                } else {
                    console.log("AuthContext: INITIAL_SESSION with user. Refreshing data.");
                    await refreshUserData();
                }
            } else {
                 console.log("AuthContext: INITIAL_SESSION no user. Ensuring logged out state.");
                 signOutInternalLogic(false); // Ensure local state is cleared
            }
            return; // Typically don't need to handle other events if INITIAL_SESSION is comprehensive
        }


        if (event === "SIGNED_IN") {
          if (isLocalLoginAttemptInProgress) {
            console.log("AuthContext: SIGNED_IN event during local login. Login.tsx will call triggerStateSyncFromLocalStorage.");
            // Login.tsx is responsible for populating LS and calling triggerStateSyncFromLocalStorage().
            // That call will set isLoading to false and update context state.
            // Reset the flag here as the login attempt (from AuthContext's perspective) is now confirmed.
            triggerStateSyncFromLocalStorage(); // Sync from LS one more time for safety
            setLocalLoginAttemptFlag(false);
          } else {
            console.log("AuthContext: SIGNED_IN event (external). Refreshing user data.");
            await refreshUserData();
          }
        } else if (event === "SIGNED_OUT") {
          console.log("AuthContext: SIGNED_OUT event. Clearing all auth data.");
          signOutInternalLogic(false); // Call internal to avoid loop if signOut itself triggered this
        } else if (event === "TOKEN_REFRESHED" && newSession) {
            console.log('AuthContext: TOKEN_REFRESHED event.');
            if (newSession) {
                localStorage.setItem("session", JSON.stringify(newSession));
                setSession(newSession);
                const userFromSession = newSession.user;
                if (user && userFromSession.id === user.id) {
                    localStorage.setItem("user", JSON.stringify(userFromSession));
                    setUser(userFromSession);
                } else {
                    await refreshUserData();
                }
            } else {
                await signOutInternalLogic(false);
            }
            setIsLoading(false);
        } else if (event === "USER_UPDATED") {
            console.log('AuthContext: USER_UPDATED event.');
            await refreshUserData();
        } else if (event === "PASSWORD_RECOVERY") {
            console.log('AuthContext: PASSWORD_RECOVERY event.');
            setIsLoading(false);
        }
      }
    );

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChange.");
      subscription.unsubscribe();
    };
  }, []);

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
