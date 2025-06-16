
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface AccountSummaryProps {
  account: {
    id: string;
    name: string;
    type: string;
    balance: number;
    accountNumber: string;
  };
}

const AccountSummary = ({ account }: AccountSummaryProps) => {
  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">{account.name}</h3>
          <p className="text-sm text-muted-foreground">{account.accountNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{account.balance.toLocaleString()} FCFA</p>
          <p className="text-sm text-muted-foreground">Available</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Link to={`/accounts/${account.id}`}>
          <Button variant="ghost" size="sm" className="text-primary">
            Details <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default AccountSummary;
