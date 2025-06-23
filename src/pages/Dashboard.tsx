import { useState, useEffect, useCallback } from "react"; // Import useCallback
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
// import { Progress } from "@/components/ui/progress"; // Progress not used directly for KPIs here
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardNav from "@/components/dashboard/DashboardNav";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import AccountSummary from "@/components/dashboard/AccountSummary";
import { ArrowUpRight, CreditCard, /*DollarSign,*/ PiggyBank, Plus, AlertCircle } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom"; // Import useNavigate
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { getItemWithExpiry, setItemWithExpiry } from "@/lib/localStorageWithExpiry";
import { AddAccountModal } from "@/components/dashboard/AddAccountModal";
import { CreditAccountModal } from "@/components/dashboard/CreditAccountModal"; // Import the new modal

// Define a type for Account, matching AccountSummaryProps and Supabase accounts table
// interface Account extends Tables<"accounts"> { // Inherit from Supabase type
//   accountNumber: string; // This is 'account_number' in Supabase - this interface might be redundant if AccountSummary adapts
// }

interface DashboardKPIs {
  totalBalance: number;
  monthlySpending: number;
  savingsGoalProgress?: number;
  savingsGoalAmount?: number;
  savingsCurrentAmount?: number;
}

const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;
const DASHBOARD_ACCOUNTS_KEY = "dashboardAccounts";
const DASHBOARD_TRANSACTIONS_KEY = "dashboardTransactions";

const Dashboard = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [activeTab, setActiveTab] = useState("overview");
  const { profile, user } = useAuth();
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isCreditAccountModalOpen, setIsCreditAccountModalOpen] = useState(false);
  const [selectedAccountForCredit, setSelectedAccountForCredit] = useState<Tables<'accounts'> | null>(null);

  // State for data
  const [accountsData, setAccountsData] = useState<Tables<"accounts">[]>([]);
  const [transactionsData, setTransactionsData] = useState<Tables<"transactions">[]>([]);
  const [kpis, setKpis] = useState<DashboardKPIs>({ totalBalance: 0, monthlySpending: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Dashboard - CCMC Bank";
  }, []);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const tabFromQuery = searchParams.get("tab");
    setActiveTab(tabFromQuery === "accounts" ? "accounts" : "overview");
  }, [searchParams]);

  const calculateKPIs = (accData: Tables<"accounts">[], transData: Tables<"transactions">[]) => {
    const totalBalanceFromData = accData.reduce((sum, acc) => sum + Number(acc.balance), 0);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const monthlySpendingFromData = transData
      .filter(t => new Date(t.created_at) > oneMonthAgo && Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    setKpis({
      totalBalance: totalBalanceFromData,
      monthlySpending: monthlySpendingFromData,
    });
  };


  // Wrap loadData in useCallback to keep its reference stable unless profile.id changes
  // And make it callable for refreshing data after adding an account.
  const loadData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    if (!profile?.id) {
      setError("User profile not found. Cannot fetch data.");
      setIsLoading(false);
      return;
    }

    if (!forceRefresh) {
      const cachedAccounts = getItemWithExpiry<Tables<"accounts">[]>(DASHBOARD_ACCOUNTS_KEY);
      const cachedTransactions = getItemWithExpiry<Tables<"transactions">[]>(DASHBOARD_TRANSACTIONS_KEY);

      if (cachedAccounts && cachedTransactions) {
        setAccountsData(cachedAccounts);
        setTransactionsData(cachedTransactions);
        calculateKPIs(cachedAccounts, cachedTransactions);
        setIsLoading(false);
        return;
      }
    }

    // console.log("Fetching dashboard data from Supabase (cache miss, expired, or forced refresh)...");
    try {
      const { data: fetchedAccounts, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", profile.id);

      if (accountsError) throw accountsError;
      setAccountsData(fetchedAccounts || []);
      setItemWithExpiry(DASHBOARD_ACCOUNTS_KEY, fetchedAccounts || [], TWENTY_FOUR_HOURS_IN_MS);

      const { data: fetchedTransactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("customer_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (transactionsError) throw transactionsError;
      setTransactionsData(fetchedTransactions || []);
      setItemWithExpiry(DASHBOARD_TRANSACTIONS_KEY, fetchedTransactions || [], TWENTY_FOUR_HOURS_IN_MS);

      calculateKPIs(fetchedAccounts || [], fetchedTransactions || []);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]); // Dependency: profile.id

  useEffect(() => {
    loadData(); // Initial load
  }, [loadData]); // useEffect depends on loadData


  const handleAccountAdded = () => {
    loadData(true); // Force refresh data from Supabase after adding an account
  };

  const handleOpenCreditAccountModal = (account: Tables<'accounts'>) => {
    setSelectedAccountForCredit(account);
    setIsCreditAccountModalOpen(true);
  };

  const handleCreditRequestSubmitted = () => {
    // Optionally, refresh transactions or show a specific global notification
    // For now, the modal handles its own success toast.
    // We might want to refresh all dashboard data if pending deposits affect summaries.
    loadData(true); // Refresh all dashboard data for simplicity
    console.log("Credit request submitted, dashboard data refreshed.");
  };

  if (isLoading && accountsData.length === 0) { // Show loader if loading and no data yet
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !isLoading) { // Only show main error if not loading (avoid brief error flash)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive flex items-center">
              <AlertCircle className="mr-2 h-6 w-6" /> Dashboard Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Sorry, we couldn't load your dashboard data at this time.</p>
            <p className="text-sm text-muted-foreground mt-2">Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <div className="flex">
        <DashboardNav activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 p-6">
          <div className="container mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2"> {/* Changed grid-cols-3 to grid-cols-2 */}
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="accounts">Accounts</TabsTrigger>
                {/* Removed Transfers tab trigger */}
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <h1 className="text-3xl font-bold">Welcome back, {profile?.first_name}</h1>
                <p className="text-muted-foreground">Here's an overview of your finances</p>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Balance
                      </CardTitle>
                      {/* <DollarSign className="h-4 w-4 text-muted-foreground" /> */}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{kpis.totalBalance.toLocaleString()} FCFA</div>
                      <p className="text-xs text-muted-foreground">
                        {/* TODO: Fetch last month's change data - placeholder retained */}
                        +{(892.00).toLocaleString()} FCFA from last month
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                        Monthly Spending
                      </CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{kpis.monthlySpending.toLocaleString()} FCFA</div>
                      {/* TODO: Budget related text needs data source */}
                      <p className="text-xs text-muted-foreground">
                        Track your monthly budget
                      </p>
                      {/* <Progress value={68} className="mt-2 h-1" /> */}
                    </CardContent>
                  </Card>
                  <Card>
                    {/* Savings Goal Card - Omitted for now as data source is unclear */}
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                        Savings Goal
                      </CardTitle>
                      <PiggyBank className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">N/A</div>
                      <p className="text-xs text-muted-foreground">
                        Feature coming soon
                      </p>
                      {/* <Progress value={78} className="mt-2 h-1" /> */}
                    </CardContent>
                  </Card>
                  <Card className="border-dashed border-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="justify-start" onClick={() => setIsAddAccountModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Account
                      </Button>
                      <Link to="/transfer">
                        <Button variant="outline" size="sm" className="justify-start w-full"> {/* Ensure button takes full width of link if needed */}
                          <ArrowUpRight className="mr-2 h-4 w-4" /> Make Transfer
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Your Accounts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isLoading && accountsData.length === 0 ? (
                        <p>Loading accounts...</p>
                      ) : accountsData.length > 0 ? (
                        accountsData.map((account) => (
                          // Map Supabase account fields to AccountSummaryProps
                          <AccountSummary
                            key={account.id}
                            account={{
                              id: account.id,
                              name: account.name,
                              type: account.type,
                              balance: Number(account.balance),
                              accountNumber: account.account_number
                            }}
                          />
                        ))
                      ) : (
                        <p>No accounts found.</p>
                      )}
                      <div className="pt-4">
                        <Link to="/accounts">
                          <Button variant="outline" className="w-full">
                            View All Accounts
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RecentTransactions
                        transactions={transactionsData} // Pass raw Supabase transaction data
                        isLoading={isLoading && transactionsData.length === 0}
                        error={error}
                        limit={5}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="accounts" className="space-y-6">
                <h1 className="text-3xl font-bold">Your Accounts</h1>
                <p className="text-muted-foreground">Manage all your accounts in one place</p>
                
                <div className="grid gap-6">
                  {isLoading && accountsData.length === 0 ? (
                     <p>Loading accounts...</p>
                  ) : accountsData.length > 0 ? (
                    accountsData.map((account) => (
                      <Card key={account.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>{account.name}</CardTitle>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => navigate('/transfer', { state: { fromAccount: account } })}
                             >
                               Manage
                             </Button>
                          </div>
                          <CardDescription>Account Number: {account.account_number}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-muted-foreground">Available Balance</p>
                              <p className="text-3xl font-bold">{Number(account.balance).toLocaleString()} FCFA</p>
                            </div>
                            <div className="space-x-2">
                              {/* TODO: The "Transfer" button here could also use navigate('/transfer', { state: { fromAccount: account } }) */}
                              <Button
                                size="sm"
                                onClick={() => navigate('/transfer', { state: { fromAccount: account } })}
                              >
                                Transfer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCreditAccountModal(account)}
                              >
                                Credit Account
                              </Button>
                            </div>
                          </div>
                          <Separator className="my-4" />
                          <h4 className="font-semibold mb-2">Recent Activity</h4>
                          <RecentTransactions
                            transactions={transactionsData.filter(t => t.from_account === account.account_number || t.to_account === account.account_number)}
                            limit={3}
                          />
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                     <p>No accounts found.</p>
                  )}
                  
                  <Card className="border-dashed border-2">
                    <CardContent className="flex items-center justify-center p-6">
                      <Button onClick={() => setIsAddAccountModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Open New Account
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Removed TabsContent for value="transfers" */}
            </Tabs>
          </div>
        </main>
      </div>
      <AddAccountModal
        open={isAddAccountModalOpen}
        onOpenChange={setIsAddAccountModalOpen}
        onAccountAdded={handleAccountAdded}
      />
      <CreditAccountModal
        open={isCreditAccountModalOpen}
        onOpenChange={setIsCreditAccountModalOpen}
        account={selectedAccountForCredit}
        onCreditRequestSubmitted={handleCreditRequestSubmitted}
      />
    </div>
  );
};

export default Dashboard;
