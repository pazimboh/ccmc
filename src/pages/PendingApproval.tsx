import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react"; // Added useEffect
import { useNavigate } from "react-router-dom";

const PendingApproval = () => {
  const { signOut, profile, refreshUserData, isApproved, isAdmin, isLoading: authIsLoading } = useAuth(); // Added authIsLoading
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  useEffect(() => {
    document.title = "Pending Approval - CCMC Bank";
  }, []);

  // useEffect for initial redirection check
  useEffect(() => {
    // Don't redirect if auth is still loading, as status might not be accurate yet
    if (authIsLoading) {
      return;
    }

    if (isAdmin) {
      console.log('User is admin (on mount/status change), redirecting to admin dashboard');
      navigate('/admin', { replace: true });
    } else if (isApproved) {
      console.log('User is approved (on mount/status change), redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
    // If neither, user stays on this page.
  }, [isApproved, isAdmin, navigate, authIsLoading]);


  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUserData();
      // The useEffect above will handle redirection if status changes after refresh.
      // No need for setTimeout and manual navigation here anymore if useEffect is robust.
      // However, if refreshUserData updates isApproved/isAdmin synchronously AND
      // the component doesn't re-render fast enough for useEffect, direct nav might still be desired.
      // For now, relying on useEffect. If issues, can add back direct nav post-refresh.
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-primary py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-foreground">CCMC Bank</h1>
          <Button variant="secondary" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
            <CardDescription>
              Your account application is being reviewed by our team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg text-left">
              <h3 className="font-semibold mb-2">Application Details:</h3>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Name:</strong> {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Account Type:</strong> {profile?.account_type}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Status:</strong> <span className="capitalize">{profile?.status}</span>
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                We are currently reviewing your application. This process typically takes 1-3 business days.
              </p>
              <p>
                You will receive an email notification once your account has been approved.
              </p>
            </div>
            <div className="pt-4 space-y-3">
              <Button 
                variant="outline" 
                onClick={handleRefresh} 
                className="w-full"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Checking Status...' : 'Check Status'}
              </Button>
              <p className="text-sm text-gray-500 mb-3">
                Need help? Contact us at support@ccmcbank.com or (237) 653-225-597
              </p>
              <Button variant="outline" onClick={handleLogout} className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PendingApproval;
