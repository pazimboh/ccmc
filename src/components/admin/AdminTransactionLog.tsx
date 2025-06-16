
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  transaction_id: string;
  customer_id: string | null;
  transaction_type: string;
  from_account: string | null;
  to_account: string | null;
  amount: number;
  status: string;
  created_at: string;
  customer?: {
    first_name: string;
    last_name: string;
  } | null;
}

const AdminTransactionLog = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customer:profiles!customer_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching transactions:', error);
        toast({
          title: "Error",
          description: "Failed to fetch transactions",
          variant: "destructive",
        });
        return;
      }

      setTransactions(data || []);
      setFilteredTransactions(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredTransactions(transactions);
      return;
    }

    const filtered = transactions.filter(transaction =>
      transaction.transaction_id.toLowerCase().includes(term.toLowerCase()) ||
      transaction.transaction_type.toLowerCase().includes(term.toLowerCase()) ||
      (transaction.customer && 
        `${transaction.customer.first_name} ${transaction.customer.last_name}`
          .toLowerCase().includes(term.toLowerCase())) ||
      (transaction.from_account && transaction.from_account.toLowerCase().includes(term.toLowerCase())) ||
      (transaction.to_account && transaction.to_account.toLowerCase().includes(term.toLowerCase()))
    );
    setFilteredTransactions(filtered);
  };

  const exportLog = () => {
    const csvData = filteredTransactions.map(transaction => ({
      'Transaction ID': transaction.transaction_id,
      'Customer': transaction.customer ? 
        `${transaction.customer.first_name} ${transaction.customer.last_name}` : 'N/A',
      'Type': transaction.transaction_type,
      'From Account': transaction.from_account || 'N/A',
      'To Account': transaction.to_account || 'N/A',
      'Amount (FCFA)': transaction.amount,
      'Status': transaction.status,
      'Date': new Date(transaction.created_at).toLocaleString()
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `${filteredTransactions.length} transactions exported`,
    });
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeColors = {
      transfer: "bg-blue-100 text-blue-800",
      withdrawal: "bg-orange-100 text-orange-800",
      deposit: "bg-green-100 text-green-800",
      payment: "bg-purple-100 text-purple-800",
      fee: "bg-gray-100 text-gray-800",
      refund: "bg-cyan-100 text-cyan-800"
    };
    
    const colorClass = typeColors[type as keyof typeof typeColors] || "bg-gray-100 text-gray-800";
    
    return <Badge className={colorClass}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
  };

  if (isLoading) {
    return <div className="p-4">Loading transactions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={exportLog} disabled={filteredTransactions.length === 0}>
          Export Log ({filteredTransactions.length})
        </Button>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          {searchTerm ? `No transactions found matching "${searchTerm}"` : "No transactions found."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-mono text-sm">
                  {transaction.transaction_id}
                </TableCell>
                <TableCell>
                  {transaction.customer ? 
                    `${transaction.customer.first_name} ${transaction.customer.last_name}` : 
                    'N/A'
                  }
                </TableCell>
                <TableCell>{getTypeBadge(transaction.transaction_type)}</TableCell>
                <TableCell className="text-sm">
                  {transaction.from_account || 'N/A'}
                </TableCell>
                <TableCell className="text-sm">
                  {transaction.to_account || 'N/A'}
                </TableCell>
                <TableCell className="font-medium">
                  {transaction.amount.toLocaleString()} FCFA
                </TableCell>
                <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                <TableCell className="text-sm">
                  {new Date(transaction.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AdminTransactionLog;
