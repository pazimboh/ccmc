
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminNav from "@/components/admin/AdminNav";
import AdminCustomerTable from "@/components/admin/AdminCustomerTable";
import AdminLoanRequests from "@/components/admin/AdminLoanRequests";
import AdminTransactionLog from "@/components/admin/AdminTransactionLog";
import AdminReports from "@/components/admin/AdminReports";
import AdminAuditLog from "@/components/admin/AdminAuditLog";
import AdminSecurity from "@/components/admin/AdminSecurity";
import AdminSettings from "@/components/admin/AdminSettings";
import AddCustomerModal from "@/components/admin/AddCustomerModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalCustomers: 0,
    pendingApplications: 0,
    activeLoans: 0,
    systemStatus: 'Operational'
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      // Fetch customer count
      const { count: customerCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch pending loan applications
      const { count: pendingCount } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch active loans
      const { count: activeLoansCount } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Fetch recent applications
      const { data: recentLoans } = await supabase
        .from('loans')
        .select(`
          *,
          customer:profiles!customer_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setDashboardStats({
        totalCustomers: customerCount || 0,
        pendingApplications: pendingCount || 0,
        activeLoans: activeLoansCount || 0,
        systemStatus: 'Operational'
      });

      setRecentApplications(recentLoans || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    document.title = "Admin Dashboard - CCMC Bank";
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <div className="flex">
        <AdminNav activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 p-6">
          <div className="container mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsContent value="overview" className="space-y-6">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, Administrator</p>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats.totalCustomers}</div>
                      <p className="text-xs text-muted-foreground">
                        Registered users
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats.pendingApplications}</div>
                      <p className="text-xs text-muted-foreground">
                        Require review
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats.activeLoans}</div>
                      <p className="text-xs text-muted-foreground">
                        Currently approved
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold flex items-center">
                        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                          {dashboardStats.systemStatus}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        All systems normal
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="col-span-1">
                    <CardHeader className="flex justify-between items-center">
                      <CardTitle>Recent Applications</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('loans')}>
                        View All
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recentApplications.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No recent applications</p>
                        ) : (
                          recentApplications.map((loan) => (
                            <div key={loan.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                              <div>
                                <p className="font-medium">
                                  {loan.customer?.first_name} {loan.customer?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {loan.loan_type} - {loan.amount.toLocaleString()} FCFA
                                </p>
                              </div>
                              <Badge className={
                                loan.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                loan.status === 'approved' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {loan.status}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="col-span-1">
                    <CardHeader className="flex justify-between items-center">
                      <CardTitle>System Alerts</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('security')}>
                        Manage Alerts
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {dashboardStats.pendingApplications > 0 && (
                          <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                            <p className="text-sm font-medium text-yellow-800">
                              {dashboardStats.pendingApplications} loan applications require review
                            </p>
                          </div>
                        )}
                        <div className="p-3 bg-green-50 border border-green-100 rounded-md">
                          <p className="text-sm font-medium text-green-800">
                            System running normally - all services operational
                          </p>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                          <p className="text-sm font-medium text-blue-800">
                            Daily backup completed successfully
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="customers" className="space-y-6">
                <h1 className="text-3xl font-bold">Customer Management</h1>
                <p className="text-muted-foreground">View and manage all customer accounts</p>
                
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <div className="flex items-center relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search customers..." className="pl-10" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Filter</Button>
                    <Button onClick={() => setShowAddCustomer(true)}>Add Customer</Button>
                  </div>
                </div>
                
                <Separator />
                
                <AdminCustomerTable />
                <AddCustomerModal open={showAddCustomer} onOpenChange={setShowAddCustomer} />
              </TabsContent>
              
              <TabsContent value="loans" className="space-y-6">
                <h1 className="text-3xl font-bold">Loan Request Management</h1>
                <p className="text-muted-foreground">Review and manage loan applications</p>
                
                <AdminLoanRequests />
              </TabsContent>
              
              <TabsContent value="transactions" className="space-y-6">
                <h1 className="text-3xl font-bold">Transaction Monitoring</h1>
                <p className="text-muted-foreground">Monitor and audit all financial transactions</p>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Audit Log</CardTitle>
                    <CardDescription>
                      Recent financial transactions across all accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AdminTransactionLog />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reports" className="space-y-6">
                <AdminReports />
              </TabsContent>

              <TabsContent value="audit" className="space-y-6">
                <AdminAuditLog />
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <AdminSecurity />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <AdminSettings />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
