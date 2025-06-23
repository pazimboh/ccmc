
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext"; // We'll use parts of AuthContext for now, or adapt it

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false); // This can be used for LocalStorage persistence duration
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { triggerStateSyncFromLocalStorage } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    localStorage.setItem('isLoggingIn', 'true'); // Set flag before sign-in attempt

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user && data.session) {
        // Store user and session in LocalStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("session", JSON.stringify(data.session));

        // Fetch profile and role to store in LocalStorage as well
        // This mimics part of what AuthContext did, but now we store it for ProtectedRoute/GuestRoute
        const userId = data.user.id;
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) console.error('Error fetching profile for localStorage:', profileError.message);
        if (profileData) localStorage.setItem('profile', JSON.stringify(profileData));

        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (roleError) console.error('Error fetching role for localStorage:', roleError.message);
        if (roleData) localStorage.setItem('userRole', JSON.stringify(roleData));

        // Removed: await refreshUserData();
        // AuthContext will rely on its onAuthStateChange or initial load from localStorage.
        // The necessary items are already in localStorage for ProtectedRoute/GuestRoute.

        // Explicitly tell AuthContext to sync its state from LocalStorage NOW.
        triggerStateSyncFromLocalStorage();

        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });

        // Navigate based on role/approval status stored in localStorage
        // These were fetched and stored above.
        // const storedProfile = profileData;
        // const storedRole = roleData;
        // It's safer to read them back from LS to ensure we use what ProtectedRoute will use,
        // or rely on AuthContext state if it's guaranteed to be updated by triggerStateSyncFromLocalStorage.
        // For now, let's use the fresh data from LS that was just written.

        const finalProfile = JSON.parse(localStorage.getItem('profile') || 'null');
        const finalRole = JSON.parse(localStorage.getItem('userRole') || 'null');


        if (finalRole?.role === 'admin') {
          navigate("/admin", { replace: true });
        } else if (finalProfile?.status === 'approved') {
          navigate("/dashboard", { replace: true });
        } else {
          // Pending or other statuses also go to dashboard as per requirements
          navigate("/dashboard", { replace: true });
        }

      } else {
        // Should not happen if signInWithPassword is successful
        toast({
          title: "Login Failed",
          description: "No user or session data returned.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
       localStorage.removeItem('isLoggingIn'); // Clear flag after all operations
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
