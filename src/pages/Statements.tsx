import { useState, useEffect } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Added Button
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { AlertCircle, DownloadCloud, FileText } from "lucide-react"; // Added Icons

// Combine Statement with Account info for easier display
interface StatementWithAccountInfo extends Tables<"statements"> {
  account_name: string | undefined;
  account_number: string | undefined;
}

const Statements = () => {
  const [activeTab, setActiveTab] = useState("statements");
  const { profile, user, isLoading: authLoading } = useAuth();

  const [statements, setStatements] = useState<StatementWithAccountInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Account Statements - CCMC Bank";
  }, []);

  useEffect(() => {
    if (!user || !profile?.id || authLoading) {
      if (!authLoading) setIsLoading(false);
      return;
    }

    const fetchStatements = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch statements for the customer
        const { data: statementsData, error: statementsError } = await supabase
          .from("statements")
          .select("*, accounts!inner(account_name, account_number)") // Ensure accounts are loaded via inner join
          .eq("accounts.user_id", profile.id) // Filter by user_id on the joined accounts table
          .order("statement_date", { ascending: false });

        if (statementsError) throw statementsError;

        // Process data to combine statement with account info
        const combinedData: StatementWithAccountInfo[] = (statementsData || []).map(s => {
          const accountInfo = Array.isArray(s.accounts) ? s.accounts[0] : s.accounts; // Handle potential array from join
          return {
            ...s,
            account_name: accountInfo?.account_name, // Changed to access accountInfo?.account_name
            account_number: accountInfo?.account_number,
          };
        });
        setStatements(combinedData);

      } catch (err) {
        console.error("Error fetching statements (friendly message):", err instanceof Error ? err.message : String(err));
        console.error("Raw error object fetching statements:", err); // Detailed log
        setError(err instanceof Error ? err.message : "An unknown error occurred while fetching statements.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatements();
  }, [user, profile?.id, authLoading]);

  if (isLoading || authLoading && statements.length === 0) {
     return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg text-gray-600">Loading statements...</p>
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
            <h1 className="text-3xl font-bold">Account Statements</h1>

            {error && (
              <Card className="border-destructive bg-destructive/10">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center">
                    <AlertCircle className="mr-2 h-5 w-5" /> Error Fetching Statements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-destructive/90">Could not load your statements: {error}</p>
                  <Button onClick={() => window.location.reload()} className="mt-3" variant="destructive">Try Again</Button>
                </CardContent>
              </Card>
            )}

            {isLoading && statements.length === 0 && !error && <p>Loading statements...</p>}
            {!isLoading && statements.length === 0 && !error && (
                <Card>
                    <CardHeader>
                        <CardTitle>No Statements Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">You do not have any account statements available at this time.</p>
                    </CardContent>
                </Card>
            )}

            {statements.length > 0 && (
              <div className="space-y-6">
                {statements.map(stmt => (
                  <Card key={stmt.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50/50 border-b p-4">
                      <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center">
                                <FileText className="mr-2 h-5 w-5 text-primary" />
                                Statement for {stmt.account_name || 'N/A'} ({stmt.account_number || '****'})
                            </CardTitle>
                            <CardDescription>
                                Statement Date: {new Date(stmt.statement_date).toLocaleDateString()} | Period: {new Date(stmt.period_start_date).toLocaleDateString()} - {new Date(stmt.period_end_date).toLocaleDateString()}
                            </CardDescription>
                        </div>
                        {stmt.file_url && (
                            <Button asChild size="sm" variant="outline">
                                <a href={stmt.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                                    <DownloadCloud className="mr-2 h-4 w-4" /> Download PDF
                                </a>
                            </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Opening Balance</p>
                            <p className="font-semibold">{Number(stmt.opening_balance).toLocaleString()} FCFA</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Closing Balance</p>
                            <p className="font-semibold">{Number(stmt.closing_balance).toLocaleString()} FCFA</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Total Credits</p>
                            <p className="font-semibold text-green-600">{Number(stmt.total_credits).toLocaleString()} FCFA</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Total Debits</p>
                            <p className="font-semibold text-red-600">{Number(stmt.total_debits).toLocaleString()} FCFA</p>
                        </div>
                    </CardContent>
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

export default Statements;
