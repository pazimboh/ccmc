
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminReports = () => {
  const [monthlyLoanData, setMonthlyLoanData] = useState<any[]>([]);
  const [loanTypeData, setLoanTypeData] = useState<any[]>([]);
  const [monthlyTransactionData, setMonthlyTransactionData] = useState<any[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalRevenue: 0,
    activeLoans: 0,
    defaultRate: 0,
    avgCreditScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchReportsData = async () => {
    try {
      // Fetch loans data
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*');

      if (loansError) throw loansError;

      // Fetch transactions data
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*');

      if (transactionsError) throw transactionsError;

      // Process monthly loan applications
      const monthlyLoans = processMonthlyLoanData(loansData || []);
      setMonthlyLoanData(monthlyLoans);

      // Process loan type distribution
      const loanTypes = processLoanTypeData(loansData || []);
      setLoanTypeData(loanTypes);

      // Process monthly transaction volume
      const monthlyTransactions = processMonthlyTransactionData(transactionsData || []);
      setMonthlyTransactionData(monthlyTransactions);

      // Calculate total stats
      const stats = calculateTotalStats(loansData || [], transactionsData || []);
      setTotalStats(stats);

    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reports data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processMonthlyLoanData = (loans: any[]) => {
    const monthCounts: { [key: string]: number } = {};
    const last6Months = [];
    const now = new Date();

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      monthCounts[monthKey] = 0;
      last6Months.push(monthKey);
    }

    // Count loans by month
    loans.forEach(loan => {
      const loanDate = new Date(loan.created_at);
      const monthKey = loanDate.toLocaleString('default', { month: 'short' });
      if (monthCounts.hasOwnProperty(monthKey)) {
        monthCounts[monthKey]++;
      }
    });

    return last6Months.map(month => ({
      month,
      loans: monthCounts[month]
    }));
  };

  const processLoanTypeData = (loans: any[]) => {
    const typeCounts: { [key: string]: number } = {};
    
    loans.forEach(loan => {
      const type = loan.loan_type || 'Other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];
    
    return Object.entries(typeCounts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  };

  const processMonthlyTransactionData = (transactions: any[]) => {
    const monthVolumes: { [key: string]: number } = {};
    const last6Months = [];
    const now = new Date();

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      monthVolumes[monthKey] = 0;
      last6Months.push(monthKey);
    }

    // Sum transaction amounts by month
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.created_at);
      const monthKey = transactionDate.toLocaleString('default', { month: 'short' });
      if (monthVolumes.hasOwnProperty(monthKey)) {
        monthVolumes[monthKey] += Number(transaction.amount) || 0;
      }
    });

    return last6Months.map(month => ({
      month,
      transactions: Math.round(monthVolumes[month] / 1000) // Convert to thousands
    }));
  };

  const calculateTotalStats = (loans: any[], transactions: any[]) => {
    const approvedLoans = loans.filter(loan => loan.status === 'approved');
    const rejectedLoans = loans.filter(loan => loan.status === 'rejected');
    
    const totalRevenue = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const activeLoans = approvedLoans.length;
    const totalProcessedLoans = approvedLoans.length + rejectedLoans.length;
    const defaultRate = totalProcessedLoans > 0 ? (rejectedLoans.length / totalProcessedLoans) * 100 : 0;
    
    const loansWithCreditScore = loans.filter(loan => loan.credit_score);
    const avgCreditScore = loansWithCreditScore.length > 0 
      ? loansWithCreditScore.reduce((sum, loan) => sum + loan.credit_score, 0) / loansWithCreditScore.length
      : 0;

    return {
      totalRevenue: Math.round(totalRevenue),
      activeLoans,
      defaultRate: Number(defaultRate.toFixed(1)),
      avgCreditScore: Math.round(avgCreditScore)
    };
  };

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      totalStats,
      monthlyLoanApplications: monthlyLoanData,
      loanTypeDistribution: loanTypeData,
      monthlyTransactionVolume: monthlyTransactionData
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report Exported",
      description: "Comprehensive report has been exported successfully",
    });
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  if (isLoading) {
    return <div className="p-4">Loading reports data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive business intelligence and reporting</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="last-6-months">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              <SelectItem value="last-6-months">Last 6 Months</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport}>Export Report</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₣{totalStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From all transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.activeLoans}</div>
            <p className="text-xs text-muted-foreground">Currently approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.defaultRate}%</div>
            <p className="text-xs text-muted-foreground">Rejected applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Credit Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.avgCreditScore}</div>
            <p className="text-xs text-muted-foreground">Across all applications</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Loan Applications</CardTitle>
            <CardDescription>Number of loan applications over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyLoanData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="loans" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Distribution</CardTitle>
            <CardDescription>Breakdown by loan type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={loanTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {loanTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Volume</CardTitle>
          <CardDescription>Monthly transaction trends (in thousands FCFA)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTransactionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}k FCFA`, 'Volume']} />
              <Line type="monotone" dataKey="transactions" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;
