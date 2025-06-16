import { useState, useEffect } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // For loan status
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { AlertCircle, ListChecks, Landmark } from "lucide-react"; // Icons
import { Link } from "react-router-dom"; // For "Apply for new loan" button

const Loans = () => {
  const [activeTab, setActiveTab] = useState("loans");
  const { profile, user, isLoading: authLoading } = useAuth();

  const [loansData, setLoansData] = useState<Tables<"loans">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "My Loans - CCMC Bank";
  }, []);

  useEffect(() => {
    if (authLoading || !user || !profile?.id) {
      if (!authLoading) setIsLoading(false); // Stop loading if auth is done but no user/profile
      return;
    }

    const fetchLoans = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from("loans")
          .select("*")
          .eq("customer_id", profile.id)
          .order("created_at", { ascending: false });

        if (dbError) throw dbError;
        setLoansData(data || []);
      } catch (err) {
        console.error("Error fetching loans:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoans();
  }, [user, profile?.id, authLoading]);

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "outline" | "destructive" => {
    switch (status?.toLowerCase()) {
      case "approved": return "default"; // Tailwind green often default/success
      case "pending": return "secondary"; // Tailwind yellow/amber often secondary
      case "rejected": return "destructive"; // Tailwind red
      default: return "outline";
    }
  };


  if (isLoading || authLoading && loansData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg text-gray-600">Loading your loans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <DashboardNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6">
          <div className="container mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Your Loans</h1>
                <Button asChild>
                    <Link to="/apply-loan">Apply for New Loan</Link>
                </Button>
            </div>

            {error && (
              <Card className="border-destructive bg-destructive/10">
                <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Error Fetching Loans</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-destructive/90">Could not load your loan applications: {error}</p>
                  <Button onClick={() => window.location.reload()} className="mt-3" variant="destructive">Try Again</Button>
                </CardContent>
              </Card>
            )}

            {isLoading && loansData.length === 0 && !error && <p>Loading loans...</p> }
            {!isLoading && loansData.length === 0 && !error && (
                <Card className="text-center py-10">
                    <CardHeader>
                        <div className="mx-auto bg-gray-100 rounded-full p-3 w-fit">
                           <Landmark className="h-10 w-10 text-gray-400" />
                        </div>
                        <CardTitle className="mt-4">No Loan Applications Found</CardTitle>
                        <CardDescription>You have not applied for any loans yet. Get started by applying for a new loan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="mt-2">
                            <Link to="/apply-loan">Apply for New Loan</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {loansData.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loansData.map(loan => (
                  <Card key={loan.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{loan.loan_type} Loan</CardTitle>
                        <Badge variant={getStatusBadgeVariant(loan.status)} className="capitalize">{loan.status || 'N/A'}</Badge>
                      </div>
                      <CardDescription>Applied on: {new Date(loan.created_at).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Amount Requested</p>
                        <p className="font-semibold text-lg">{Number(loan.amount).toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Term</p>
                        <p className="font-semibold">{loan.term_months} months</p>
                      </div>
                      {loan.purpose && (
                        <div>
                          <p className="text-sm text-muted-foreground">Purpose</p>
                          <p className="text-sm">{loan.purpose}</p>
                        </div>
                      )}
                    </CardContent>
                    {/* Optional: Add CardFooter for actions like "View Details" if a detail page exists */}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Loans;
