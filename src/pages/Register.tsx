
import { useState, useEffect } from "react"; // Added useEffect
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client"; // Added supabase

const Register = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Register - CCMC Bank";
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !accountType) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match. Please try again.", variant: "destructive" });
      return;
    }
    if (!agreeTerms) {
      toast({ title: "Error", description: "You must agree to the terms and conditions to register.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      // const redirectUrl = `${window.location.origin}/`; // For email confirmation, if enabled

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { // This data is passed to raw_user_meta_data for the trigger to pick up
            first_name: firstName,
            last_name: lastName,
            account_type: accountType,
            // Phone and address are typically not part of Supabase Auth signUp options.data directly for profiles table.
            // They are usually updated post-registration in a user profile section.
            // The trigger on auth.users insert will create a public.profiles record.
          }
        }
      });

      if (error) throw error;

      // Check if user object exists and if a session is created
      // data.session is null if email confirmation is required
      if (data.user && !data.session) {
        toast({
          title: "Registration Successful",
          description: "Please check your email to confirm your registration.",
          duration: 5000,
        });
        // Optionally, clear form or redirect to a "check email" page
        // For now, user stays on page, form can be cleared if desired
      } else if (data.user && data.session) {
        // This case happens if email confirmation is disabled or user is auto-confirmed
        toast({
          title: "Registration Successful!",
          description: "Your account has been created and you are now logged in. Please wait for approval.",
        });
        navigate('/pending-approval'); // New users go to pending approval
      } else {
        // Fallback, should ideally not happen if user and session are primary indicators
        toast({
          title: "Registration Submitted",
          description: "Your application is being processed. You might need to confirm your email.",
        });
      }
      // Reset form fields
      setFirstName(""); setLastName(""); setEmail(""); setPassword("");
      setConfirmPassword(""); setAccountType(""); setAgreeTerms(false);

    } catch (error: any) {
      toast({
        title: "Registration Error",
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
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>
              Enter your information below to open a new bank account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <Select onValueChange={setAccountType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking Account</SelectItem>
                    <SelectItem value="savings">Savings Account</SelectItem>
                    <SelectItem value="business">Business Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link to="/auth" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Register;
