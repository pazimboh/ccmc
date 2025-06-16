import { useState, useEffect } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerSettingsData {
  // user_id is part of the table but not part of the data object we edit directly in the form
  email_transaction_alerts: boolean;
  email_promotional_offers: boolean;
  allow_phone_contact_for_support: boolean;
  allow_phone_contact_for_offers: boolean;
}

const Settings = () => {
  const [activeTab, setActiveTab] = useState("settings");
  const [settings, setSettings] = useState<CustomerSettingsData>({
    email_transaction_alerts: true,
    email_promotional_offers: false,
    allow_phone_contact_for_support: true,
    allow_phone_contact_for_offers: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Settings - CCMC Bank";
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) {
        setIsLoading(false); // Not logged in, nothing to fetch
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('customer_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Explicitly map to ensure only defined fields are set
          setSettings({
            email_transaction_alerts: data.email_transaction_alerts,
            email_promotional_offers: data.email_promotional_offers,
            allow_phone_contact_for_support: data.allow_phone_contact_for_support,
            allow_phone_contact_for_offers: data.allow_phone_contact_for_offers,
          });
        }
        // If no data, initial default state is used.
      } catch (err) {
        console.error("Error fetching settings:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load your settings." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [user, toast]);

  const handleSettingChange = (key: keyof CustomerSettingsData, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveChanges = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to save settings." });
      return;
    }
    setIsSaving(true);
    try {
      const updates = {
        ...settings,
        user_id: user.id, // Ensure user_id is included for upsert
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('customer_settings')
        .upsert(updates, { onConflict: 'user_id' });

      if (error) throw error;

      toast({ title: "Settings Saved", description: "Your preferences have been updated successfully." });
    } catch (err) {
      console.error("Error saving settings:", err);
      toast({ variant: "destructive", title: "Error", description: "Could not save your settings." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-gray-50">
          <DashboardHeader />
          <div className="flex">
            <DashboardNav activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="flex-1 p-6">
              <div className="container mx-auto">
                <p>Loading settings...</p>
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
          <div className="container mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Your Settings</h1>
                <p className="text-muted-foreground">
                  Manage your notification and contact preferences.
                </p>
              </div>
              <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you receive notifications from us.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="email_transaction_alerts" className="font-medium">Email Transaction Alerts</Label>
                    <p className="text-sm text-muted-foreground">Receive email alerts for all transactions on your account.</p>
                  </div>
                  <Switch
                    id="email_transaction_alerts"
                    checked={settings.email_transaction_alerts}
                    onCheckedChange={(value) => handleSettingChange('email_transaction_alerts', value)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="email_promotional_offers" className="font-medium">Email Promotional Offers</Label>
                    <p className="text-sm text-muted-foreground">Receive emails about new products, features, and special offers.</p>
                  </div>
                  <Switch
                    id="email_promotional_offers"
                    checked={settings.email_promotional_offers}
                    onCheckedChange={(value) => handleSettingChange('email_promotional_offers', value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Preferences</CardTitle>
                <CardDescription>Manage how we can contact you by phone.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="allow_phone_contact_for_support" className="font-medium">Allow Phone Contact for Support</Label>
                    <p className="text-sm text-muted-foreground">Permit us to contact you by phone for account support issues.</p>
                  </div>
                  <Switch
                    id="allow_phone_contact_for_support"
                    checked={settings.allow_phone_contact_for_support}
                    onCheckedChange={(value) => handleSettingChange('allow_phone_contact_for_support', value)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="allow_phone_contact_for_offers" className="font-medium">Allow Phone Contact for Offers</Label>
                    <p className="text-sm text-muted-foreground">Permit us to contact you by phone regarding promotional offers.</p>
                  </div>
                  <Switch
                    id="allow_phone_contact_for_offers"
                    checked={settings.allow_phone_contact_for_offers}
                    onCheckedChange={(value) => handleSettingChange('allow_phone_contact_for_offers', value)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end mt-6">
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
