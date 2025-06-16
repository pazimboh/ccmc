
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CreditCard, Banknote, Users } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Secure Banking",
    description: "Bank with confidence knowing your money and personal information are protected with industry-leading security."
  },
  {
    icon: CreditCard,
    title: "Digital Banking",
    description: "Manage your accounts, make transfers, and pay bills from anywhere with our easy-to-use online platform."
  },
  {
    icon: Banknote,
    title: "Personal Loans",
    description: "Get the funds you need with competitive rates and flexible repayment options tailored to your situation."
  },
  {
    icon: Users,
    title: "Business Services",
    description: "Solutions designed to help businesses of all sizes manage cash flow, accept payments, and grow."
  }
];

const BankFeatures = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Banking Services Designed for You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-none shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BankFeatures;
