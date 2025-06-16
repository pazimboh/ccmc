
import { Link } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  DollarSign,
  Home,
  Landmark,
  PiggyBank,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  {
    id: "overview",
    label: "Overview",
    icon: Home,
    href: "/dashboard?tab=overview", // Added query param
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: CreditCard,
    href: "/dashboard?tab=accounts", // Changed href and added query param
  },
  // Removed the "Transfers" item that pointed to a Dashboard tab (id: "transfers")
  {
    id: "transfer",
    label: "Transfer",
    icon: Landmark,
    href: "/transfer",
  },
  {
    id: "loans",
    label: "Loans",
    icon: PiggyBank,
    href: "/loans",
  },
  {
    id: "statements",
    label: "Statements",
    icon: BarChart3,
    href: "/statements",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

const DashboardNav = ({ activeTab, setActiveTab }: DashboardNavProps) => {
  return (
    <nav className="hidden md:block w-64 bg-white border-r border-gray-200 p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              activeTab === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            onClick={() => {
              // If the item is one of the dashboard tabs, call setActiveTab for immediate UI update.
              // Navigation is now handled by the Link component via href with query params.
              if (item.id === "overview" || item.id === "accounts") {
                setActiveTab(item.id);
              } else {
                // For other links that navigate away from the main dashboard's tab system,
                // still call setActiveTab to highlight them if they are top-level pages.
                setActiveTab(item.id);
              }
              // No e.preventDefault() needed here anymore for overview/accounts,
              // as Link component will handle navigation.
            }}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="absolute bottom-4 w-56">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-sm mb-2">Need Help?</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Contact our customer support team for assistance with your banking needs.
          </p>
          <Link to="/contact">
            <button className="text-xs text-primary hover:underline">
              Contact Support
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNav;
