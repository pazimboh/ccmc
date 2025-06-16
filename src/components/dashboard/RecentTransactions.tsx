
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, CreditCard, ShoppingBag, AlertCircle } from "lucide-react";
import { Tables } from "@/integrations/supabase/types"; // Import Supabase types

// Define a type for the transaction prop, using Supabase's Transaction Row type
// and adding necessary icon/color fields if they are to be determined by Dashboard.tsx
// Or, determine icon/color within this component based on transaction_type.
export interface TransactionDisplayItem extends Tables<"transactions"> {
  // These fields were in the original dummy data. We'll need to map them
  // from the fetched `transaction_type` or other data.
  description: string; // Supabase `transactions` doesn't have a direct 'description'. Might use 'transaction_type' or join another table.
  date: string; // Will need to format `created_at`
  type: string; // Corresponds to `transaction_type`
  icon: React.ElementType;
  color: string;
}

interface RecentTransactionsProps {
  limit?: number;
  transactions?: TransactionDisplayItem[]; // Allow transactions to be passed as a prop
  isLoading?: boolean;
  error?: string | null;
}

// Helper to map transaction_type to icon and color
const getTransactionVisuals = (transactionType: string) => {
  switch (transactionType.toLowerCase()) {
    case "deposit":
    case "salary":
      return { icon: ArrowDownRight, color: "text-green-500" };
    case "purchase":
    case "subscription":
      return { icon: ShoppingBag, color: "text-red-500" }; // Or CreditCard
    case "transfer":
      return { icon: ArrowUpRight, color: "text-blue-500" };
    default:
      return { icon: CreditCard, color: "text-gray-500" };
  }
};


const RecentTransactions = ({ limit, transactions: propTransactions, isLoading, error }: RecentTransactionsProps) => {
  // Use propTransactions if provided, otherwise keep the dummy data as fallback for now
  // or handle empty state.
  const transactionsToDisplay = propTransactions || [];

  if (isLoading) {
    return <p>Loading transactions...</p>;
  }

  if (error) {
    return (
      <div className="text-red-500 flex items-center">
        <AlertCircle className="mr-2 h-4 w-4" /> Error loading transactions: {error}
      </div>
    );
  }

  if (transactionsToDisplay.length === 0) {
    return <p>No recent transactions found.</p>;
  }

  const displayItems = transactionsToDisplay
    .map(t => {
      const visuals = getTransactionVisuals(t.transaction_type);
      return {
        ...t,
        description: `${t.transaction_type} ${t.from_account ? `from ${t.from_account}` : ''} ${t.to_account ? `to ${t.to_account}`: ''}`.trim() , // Basic description
        date: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), // Format date
        type: t.transaction_type,
        icon: visuals.icon,
        color: visuals.color,
      };
    })
    .slice(0, limit || transactionsToDisplay.length);

  return (
    <div className="space-y-4">
      {displayItems.map((transaction) => (
        <div
          key={transaction.id} // Assuming Supabase 'id' is the transaction primary key
          className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full bg-gray-100 ${transaction.color}`}>
              <transaction.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">{transaction.description}</p>
              <p className="text-xs text-muted-foreground">{transaction.date}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${Number(transaction.amount) < 0 ? "text-red-500" : "text-green-500"}`}>
              {Number(transaction.amount) < 0 ? "-" : "+"}{Math.abs(Number(transaction.amount)).toLocaleString()} FCFA
            </p>
            <Badge variant="outline" className="text-xs capitalize">
              {transaction.type}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentTransactions;
