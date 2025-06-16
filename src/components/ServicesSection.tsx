
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const ServicesSection = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Financial Solutions for Every Need</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Discover our range of banking products and services designed to help you achieve your financial goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Personal Banking */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="h-48 bg-gradient-to-r from-blue-500 to-blue-700"></div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">Personal Banking</h3>
              <p className="text-muted-foreground mb-4">
                Checking and savings accounts with features that make everyday banking easy and rewarding.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-primary mr-2"></span>
                  Free online and mobile banking
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-primary mr-2"></span>
                  No minimum balance requirements
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-primary mr-2"></span>
                  Competitive interest rates
                </li>
              </ul>
              <Link to="/personal-banking">
                <Button variant="ghost" className="flex items-center gap-2">
                  Learn More <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Loans & Mortgages */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="h-48 bg-gradient-to-r from-green-500 to-green-700"></div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">Loans & Mortgages</h3>
              <p className="text-muted-foreground mb-4">
                Flexible lending options to help you purchase a home, refinance, or access funds for your needs.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-primary mr-2"></span>
                  Competitive interest rates
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-primary mr-2"></span>
                  Fast application process
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-primary mr-2"></span>
                  Flexible repayment options
                </li>
              </ul>
              <Link to="/loans">
                <Button variant="ghost" className="flex items-center gap-2">
                  Learn More <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Business Banking */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="h-48 bg-gradient-to-r from-purple-500 to-purple-700"></div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">Business Banking</h3>
              <p className="text-muted-foreground mb-4">
                Solutions to help businesses manage finances, optimize cash flow, and support growth.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-primary mr-2"></span>
                  Business checking accounts
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-primary mr-2"></span>
                  Merchant services
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-primary mr-2"></span>
                  Business loans and lines of credit
                </li>
              </ul>
              <Link to="/business-banking">
                <Button variant="ghost" className="flex items-center gap-2">
                  Learn More <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
