import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js'; // Import User and Session types

// Define Profile and UserRole types if not already globally available
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


const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Login.tsx's own loading state for the button
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setAuthStateDirectly } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (authData.user && authData.session) {
        // Store user and session in LocalStorage
        localStorage.setItem("user", JSON.stringify(authData.user));
        localStorage.setItem("session", JSON.stringify(authData.session));

        // Fetch profile and role
        const userId = authData.user.id;
        let userProfile: Profile | null = null;
        let userRoleData: UserRole | null = null;

        try {
            const { data: fetchedProfile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            if (profileError) {
                console.error('Error fetching profile post-login:', profileError.message);
                // Not throwing error here, proceed with null profile
            }
            userProfile = fetchedProfile as Profile | null;
            if (userProfile) localStorage.setItem('profile', JSON.stringify(userProfile));
            else localStorage.removeItem('profile');
        } catch (e: any) {
            console.error('Exception fetching profile for localStorage:', e.message);
            localStorage.removeItem('profile');
        }

        try {
            const { data: fetchedRole, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId)
              .single();
            if (roleError) {
                console.error('Error fetching role post-login:', roleError.message);
                // Not throwing error here, proceed with null role
            }
            userRoleData = fetchedRole as UserRole | null;
            if (userRoleData) localStorage.setItem('userRole', JSON.stringify(userRoleData));
            else localStorage.removeItem('userRole');
        } catch (e: any) {
            console.error('Exception fetching role for localStorage:', e.message);
            localStorage.removeItem('userRole');
        }

        // Directly update AuthContext state
        setAuthStateDirectly({
          user: authData.user as User, // Cast to ensure type
          session: authData.session as Session, // Cast to ensure type
          profile: userProfile,
          userRole: userRoleData,
        });

        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });

        // Navigate based on the fetched (and now context-set) profile and role
        if (userRoleData?.role === 'admin') {
          navigate("/admin", { replace: true });
        } else if (userProfile?.status === 'approved') {
          navigate("/dashboard", { replace: true });
        } else {
          // Pending or other statuses also go to dashboard as per requirements
          navigate("/dashboard", { replace: true });
        }

      } else {
        // Should not happen if signInWithPassword is successful without error
        throw new Error("Login successful but no user or session data returned.");
      }
    } catch (error: any) {
      console.error("Login page error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-primary py-4">
        <div className="container mx-auto px-4">
          <Link to="/">
            <h1 className="text-2xl font-bold text-primary-foreground">CCMC Bank</h1>
          </Link>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm">Remember me</Label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <div className="text-center text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Login;
