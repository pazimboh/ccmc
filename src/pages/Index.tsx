import { useEffect } from "react"; // Added useEffect
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import BankFeatures from "@/components/BankFeatures";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import Footer from "@/components/Footer";

const Index = () => {
  useEffect(() => {
    document.title = "Welcome - CCMC Bank";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary-foreground">CCMC Bank</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/auth">
              <Button variant="secondary" className="font-medium">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button className="font-medium">Open an Account</Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main>
        <HeroSection />
        <BankFeatures />
        <ServicesSection />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
