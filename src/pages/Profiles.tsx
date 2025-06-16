import { useState, useEffect } from "react"; // Added useEffect
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { AlertCircle } from "lucide-react";

const Profiles = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const { user, profile, isLoading: authLoading, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");

  useEffect(() => {
    document.title = "My Profile - CCMC Bank";
  }, []);

  // useEffect to sync local state when profile from context changes
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
    }
  }, [profile]);

  const handleSaveChanges = async () => {
    if (!user || !profile) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "First name and last name cannot be empty." });
      return;
    }

    setIsSubmitting(true);
    try {
      const updates = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null, // Store empty as null if desired by DB schema
        address: address.trim() || null, // Store empty as null
        updated_at: new Date().toISOString(), // Update timestamp
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Success", description: "Profile updated successfully." });
      if (typeof refreshUserData === 'function') {
        await refreshUserData(); // Refresh global profile state
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed to update profile." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <DashboardNav activeTab={activeTab} setActiveTab={setActiveTab} />
          <main className="flex-1 p-6">
            <div className="container mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-destructive flex items-center">
                    <AlertCircle className="mr-2 h-6 w-6" /> Profile Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Sorry, we couldn't load your profile data at this time.</p>
                  <Button onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <div className="flex">
        <DashboardNav activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-6">
          <div className="container mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl font-bold">User Profile</CardTitle>
                <CardDescription>View and update your personal information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={user?.email || ""} disabled />
                  <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                {/* Account Type and Status are usually not directly editable by user */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="accountType">Account Type</Label>
                        <Input id="accountType" value={profile.account_type || "N/A"} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Input id="status" value={profile.status || "N/A"} disabled />
                    </div>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveChanges} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profiles;
