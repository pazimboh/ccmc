
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

  const isApproved = profile?.status === 'approved';
  const isAdmin = userRole?.role === 'admin';

  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for:', userId);
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (roleError) {
        console.error('Role fetch error:', roleError);
      }

      // Fix: Ensure status is one of the allowed values with proper typing
      const allowedStatuses: Array<'pending' | 'approved' | 'rejected'> = ['pending', 'approved', 'rejected'];
      const status: 'pending' | 'approved' | 'rejected' = 
        profileData?.status && allowedStatuses.includes(profileData.status as any)
          ? (profileData.status as 'pending' | 'approved' | 'rejected')
          : 'pending';

      const updatedProfile: Profile | null = profileData
        ? { 
            ...profileData, 
            status 
          }
        : null;

      console.log('Fetched profile:', updatedProfile);
      console.log('Fetched role:', roleData);

      setProfile(updatedProfile);
      setUserRole(roleData);
      
      // IMPORTANT: Only set loading to false AFTER we've fetched and set the user data
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Set loading to false even if there's an error
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // State updates (setUser, setSession, setProfile, setUserRole) and navigation
      // will now be handled by the onAuthStateChange listener and the UI component respectively.
    } catch (error) {
      console.error('Error signing out:', error);
      // Optionally, re-throw or handle UI feedback if needed, though onAuthStateChange should eventually reflect failure.
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user data directly without setTimeout
          await fetchUserData(session.user.id); // Ensure fetchUserData sets isLoading appropriately
        } else {
          // Clear profile and role, set loading to false as there's no user data to fetch
          setProfile(null);
          setUserRole(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id); // This will set isLoading to false when done
      } else {
        setIsLoading(false); // Only set loading to false when there's no user
      }
    });

    return () => subscription.unsubscribe();
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
