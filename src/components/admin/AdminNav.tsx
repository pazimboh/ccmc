
import {
  Users,
  PiggyBank,
  BarChart3,
  Clock,
  Settings,
  ShieldAlert,
  FileText,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  {
    id: "overview",
    label: "Dashboard",
    icon: BarChart3,
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
  },
  {
    id: "loans",
    label: "Loan Applications",
    icon: PiggyBank,
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: Calculator,
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
  },
  {
    id: "audit",
    label: "Audit Log",
    icon: Clock,
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldAlert,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
];

const AdminNav = ({ activeTab, setActiveTab }: AdminNavProps) => {
  return (
    <nav className="hidden md:block w-64 bg-white border-r border-gray-200 p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left",
              activeTab === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="absolute bottom-4 w-56">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-blue-800">
          <h3 className="font-medium text-sm mb-2">Admin Help Center</h3>
          <p className="text-xs mb-3">
            Need assistance with administrative tasks? Check the admin documentation.
          </p>
          <button className="text-xs text-blue-600 font-medium hover:underline">
            View Documentation
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminNav;
