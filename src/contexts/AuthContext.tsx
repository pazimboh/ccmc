import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// No longer using module-level flag for this approach
// let isLocalLoginAttemptInProgress = false;
// export const setLocalLoginAttemptFlag = (value: boolean) => { ... };

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

interface DirectAuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
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
  // triggerStateSyncFromLocalStorage: () => boolean; // Removing this in favor of direct set
  setAuthStateDirectly: (data: DirectAuthState) => void; // Corrected name
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

  // New function for Login.tsx to call
  const setAuthStateDirectly = (data: DirectAuthState) => {
    console.log("AuthContext: setAuthStateDirectly called by Login.tsx", data);
    setUser(data.user);
    setSession(data.session);
    setProfile(data.profile);
    setUserRole(data.userRole);
    // LocalStorage should have already been set by Login.tsx
    // Ensure Supabase client has the session if provided
    if (data.session) {
        supabase.auth.setSession(data.session);
    }
    setIsLoading(false);
  };

  // Reads from LS and updates state. Used on initial load.
  const syncStateFromLocalStorage = (): boolean => {
    // console.log("AuthContext: syncStateFromLocalStorage called.");
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
      setUser(null); setSession(null); setProfile(null); setUserRole(null);
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
        await internalSignOut(false);
        return;
    }

    if (currentSupabaseUser && currentSession) {
      localStorage.setItem("user", JSON.stringify(currentSupabaseUser));
      localStorage.setItem("session", JSON.stringify(currentSession));
      setUser(currentSupabaseUser);
      setSession(currentSession);

      const userId = currentSupabaseUser.id;
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profileError) { localStorage.removeItem('profile'); setProfile(null); }
      else if (profileData) { localStorage.setItem('profile', JSON.stringify(profileData)); setProfile(profileData as Profile); }
      else { localStorage.removeItem('profile'); setProfile(null); }

      const { data: roleData, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', userId).single();
      if (roleError) { localStorage.removeItem('userRole'); setUserRole(null); }
      else if (roleData) { localStorage.setItem('userRole', JSON.stringify(roleData)); setUserRole(roleData as UserRole); }
      else { localStorage.removeItem('userRole'); setUserRole(null); }
    } else {
      localStorage.removeItem("user"); localStorage.removeItem("session"); localStorage.removeItem("profile"); localStorage.removeItem("userRole");
      setUser(null); setSession(null); setProfile(null); setUserRole(null);
    }
    setIsLoading(false);
  };

  const internalSignOut = async (callSupabase: boolean = true) => {
    console.log("AuthContext: internalSignOut called.");
    if (callSupabase) {
        try { await supabase.auth.signOut(); }
        catch (err) { console.error("AuthContext: Supabase signOut error", err); }
    }
    localStorage.removeItem("user"); localStorage.removeItem("session"); localStorage.removeItem("profile"); localStorage.removeItem("userRole");
    localStorage.removeItem("dashboardAccounts"); localStorage.removeItem("dashboardTransactions");
    setUser(null); setSession(null); setProfile(null); setUserRole(null);
    setIsLoading(false);
  };

  const signOut = async () => {
    await internalSignOut(true);
  };


  useEffect(() => {
    console.log("AuthContext: Initializing (useEffect)...");
    const userFoundInLs = syncStateFromLocalStorage(); // Try to load from LS, sets isLoading=false
    setLocalAuthLoaded(true);

    if (!userFoundInLs) {
        console.log("AuthContext: No user from LS on initial load. Checking Supabase session.");
        supabase.auth.getSession().then(({ data: { session: supabaseSession } }) => {
            if (supabaseSession?.user) {
                console.log("AuthContext: Active Supabase session found. Refreshing data.");
                // If a Supabase session exists, it's the source of truth.
                // refreshUserData will fetch, update LS, and update context state.
                refreshUserData();
            } else {
                console.log("AuthContext: No active Supabase session found. User remains logged out.");
                // syncStateFromLocalStorage already set user to null and isLoading to false.
            }
        });
    } else {
        console.log("AuthContext: User successfully loaded from LS on initial load.");
         // If user loaded from LS, ensure Supabase client knows about the session
        const lsSession = localStorage.getItem("session");
        if (lsSession) {
            supabase.auth.setSession(JSON.parse(lsSession));
        }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, sessionFromEvent) => {
        console.log(`AuthContext: onAuthStateChange event: ${event}`, sessionFromEvent?.user?.email || '');
        
        // The setAuthStateDirectly from Login.tsx should be the primary way a local login updates context.
        // This listener now primarily handles external changes (other tabs, magic links, session expiry).

        if (event === "SIGNED_IN") {
            // If Login.tsx called setAuthStateDirectly, context is already up-to-date.
            // This event might be for an external sign-in.
            // To be safe, refresh unless the current user in context matches the event's user.
            // This avoids a refresh if setAuthStateDirectly just ran.
            if (user?.id !== sessionFromEvent?.user?.id) {
                console.log("AuthContext: SIGNED_IN event (likely external or context out of sync). Refreshing user data.");
                await refreshUserData();
            } else {
                console.log("AuthContext: SIGNED_IN event, but user in context matches. Assuming Login.tsx handled it.");
                // Ensure isLoading is false, as Login.tsx might not have set it if this event is very fast.
                if (isLoading) setIsLoading(false);
            }
        } else if (event === "SIGNED_OUT") {
          console.log("AuthContext: SIGNED_OUT event. Clearing all auth data locally.");
          await internalSignOut(false); // Don't call Supabase signOut, just clear local state
        } else if (event === "TOKEN_REFRESHED") {
            console.log('AuthContext: TOKEN_REFRESHED event.');
            if (sessionFromEvent) {
                localStorage.setItem("session", JSON.stringify(sessionFromEvent));
                setSession(sessionFromEvent);
                if (sessionFromEvent.user) { // If user object also changed (e.g. metadata)
                    localStorage.setItem("user", JSON.stringify(sessionFromEvent.user));
                    setUser(sessionFromEvent.user);
                }
            } else { // No session after refresh? Treat as sign out.
                await internalSignOut(false);
            }
            setIsLoading(false);
        } else if (event === "USER_UPDATED") {
            console.log('AuthContext: USER_UPDATED event.');
            await refreshUserData(); // User's own data (e.g. email) changed.
        } else if (event === "PASSWORD_RECOVERY") {
            console.log('AuthContext: PASSWORD_RECOVERY event.');
            setIsLoading(false);
        }
        // INITIAL_SESSION is often handled by getSession on load.
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
        setAuthStateDirectly, // Corrected name here as well
        localAuthLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
