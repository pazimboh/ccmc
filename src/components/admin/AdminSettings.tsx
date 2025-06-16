import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SystemSettings {
  bank_name: string;
  admin_email: string;
  support_phone: string;
  bank_address: string;
  min_credit_score: number;
  max_loan_amount: number;
  default_interest_rate: number;
  auto_approval_limit: number;
  auto_backup: boolean;
  backup_time: string;
  loan_notifications: boolean;
  customer_notifications: boolean;
  security_alerts: boolean;
  daily_reports: boolean;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    bank_name: '',
    admin_email: '',
    support_phone: '',
    bank_address: '',
    min_credit_score: 600,
    max_loan_amount: 200000000,
    default_interest_rate: 5.0,
    auto_approval_limit: 1000000,
    auto_backup: true,
    backup_time: '02:00',
    loan_notifications: true,
    customer_notifications: true,
    security_alerts: true,
    daily_reports: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsMap: Partial<SystemSettings> = {};
      
      data?.forEach(setting => {
        const key = setting.setting_key as keyof SystemSettings;
        let value = setting.setting_value;
        
        // Parse JSON values and convert types as needed
        if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1); // Remove quotes
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          // Keep as is
        } else if (value === 'true' || value === 'false') {
          value = value === 'true';
        } else if (typeof value === 'string' && !isNaN(Number(value))) {
          value = Number(value);
        }
        
        (settingsMap as any)[key] = value;
      });

      setSettings(prev => ({ ...prev, ...settingsMap }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Convert settings to array of updates
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: typeof value === 'string' ? `"${value}"` : value,
        updated_at: new Date().toISOString()
      }));

      // Update each setting
      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({
            setting_value: update.setting_value,
            updated_at: update.updated_at
          })
          .eq('setting_key', update.setting_key);

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "All system settings have been updated successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save system settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key: keyof SystemSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (isLoading) {
    return <div className="p-4">Loading system settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Configure system parameters and preferences</p>
        </div>
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bank Information</CardTitle>
            <CardDescription>Basic information about your financial institution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={settings.bank_name}
                  onChange={(e) => handleInputChange('bank_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_email">Admin Email</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={settings.admin_email}
                  onChange={(e) => handleInputChange('admin_email', e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="support_phone">Support Phone</Label>
                <Input
                  id="support_phone"
                  value={settings.support_phone}
                  onChange={(e) => handleInputChange('support_phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_address">Bank Address</Label>
                <Input
                  id="bank_address"
                  value={settings.bank_address}
                  onChange={(e) => handleInputChange('bank_address', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Configuration</CardTitle>
            <CardDescription>Configure loan approval criteria and limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_credit_score">Minimum Credit Score</Label>
                <Input
                  id="min_credit_score"
                  type="number"
                  value={settings.min_credit_score}
                  onChange={(e) => handleInputChange('min_credit_score', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_loan_amount">Maximum Loan Amount (FCFA)</Label>
                <Input
                  id="max_loan_amount"
                  type="number"
                  value={settings.max_loan_amount}
                  onChange={(e) => handleInputChange('max_loan_amount', Number(e.target.value))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_interest_rate">Default Interest Rate (%)</Label>
                <Input
                  id="default_interest_rate"
                  type="number"
                  step="0.1"
                  value={settings.default_interest_rate}
                  onChange={(e) => handleInputChange('default_interest_rate', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auto_approval_limit">Auto-Approval Limit (FCFA)</Label>
                <Input
                  id="auto_approval_limit"
                  type="number"
                  value={settings.auto_approval_limit}
                  onChange={(e) => handleInputChange('auto_approval_limit', Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Operations</CardTitle>
            <CardDescription>Configure automated system operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Automatic Database Backup</div>
                <div className="text-sm text-muted-foreground">
                  Enable daily automatic database backups
                </div>
              </div>
              <Switch
                checked={settings.auto_backup}
                onCheckedChange={(value) => handleInputChange('auto_backup', value)}
              />
            </div>

            {settings.auto_backup && (
              <div className="space-y-2">
                <Label htmlFor="backup_time">Backup Time (24-hour format)</Label>
                <Input
                  id="backup_time"
                  type="time"
                  value={settings.backup_time}
                  onChange={(e) => handleInputChange('backup_time', e.target.value)}
                  className="w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure system notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Loan Application Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Get notified about new loan applications
                </div>
              </div>
              <Switch
                checked={settings.loan_notifications}
                onCheckedChange={(value) => handleInputChange('loan_notifications', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Customer Registration Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Get notified about new customer registrations
                </div>
              </div>
              <Switch
                checked={settings.customer_notifications}
                onCheckedChange={(value) => handleInputChange('customer_notifications', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Security Alerts</div>
                <div className="text-sm text-muted-foreground">
                  Receive immediate security alerts and warnings
                </div>
              </div>
              <Switch
                checked={settings.security_alerts}
                onCheckedChange={(value) => handleInputChange('security_alerts', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Daily Summary Reports</div>
                <div className="text-sm text-muted-foreground">
                  Receive daily email summaries of system activity
                </div>
              </div>
              <Switch
                checked={settings.daily_reports}
                onCheckedChange={(value) => handleInputChange('daily_reports', value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
