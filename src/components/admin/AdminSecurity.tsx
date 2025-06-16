import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SecurityEvent {
  id: string;
  event_type: string;
  description: string;
  ip_address: string | null;
  severity: string;
  resolved: boolean;
  created_at: string;
}

interface SecuritySettings {
  two_factor_auth: boolean;
  session_timeout: boolean;
  ip_whitelist: boolean;
  audit_logging: boolean;
}

const AdminSecurity = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    two_factor_auth: false,
    session_timeout: false,
    ip_whitelist: false,
    audit_logging: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSecurityData = async () => {
    try {
      // Fetch security events
      const { data: eventsData, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (eventsError) throw eventsError;

      // Fetch security settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['two_factor_auth', 'session_timeout', 'ip_whitelist', 'audit_logging']);

      if (settingsError) throw settingsError;

      // Transform security events data
      const transformedEvents: SecurityEvent[] = (eventsData || []).map(event => ({
        ...event,
        ip_address: event.ip_address ? String(event.ip_address) : null,
        severity: event.severity || 'medium',
        resolved: event.resolved || false,
      }));

      setSecurityEvents(transformedEvents);
      
      // Parse settings
      const settings: SecuritySettings = {
        two_factor_auth: false,
        session_timeout: false,
        ip_whitelist: false,
        audit_logging: false,
      };

      settingsData?.forEach(setting => {
        const key = setting.setting_key as keyof SecuritySettings;
        settings[key] = setting.setting_value === true || setting.setting_value === 'true';
      });

      setSecuritySettings(settings);
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch security data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSecuritySetting = async (settingKey: keyof SecuritySettings, value: boolean) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: value,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', settingKey);

      if (error) throw error;

      setSecuritySettings(prev => ({
        ...prev,
        [settingKey]: value
      }));

      toast({
        title: "Setting Updated",
        description: `${settingKey.replace('_', ' ')} has been ${value ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating security setting:', error);
      toast({
        title: "Error",
        description: "Failed to update security setting",
        variant: "destructive",
      });
    }
  };

  const resolveSecurityEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .update({ resolved: true })
        .eq('id', eventId);

      if (error) throw error;

      setSecurityEvents(prev => 
        prev.map(event => 
          event.id === eventId ? { ...event, resolved: true } : event
        )
      );

      toast({
        title: "Event Resolved",
        description: "Security event has been marked as resolved",
      });
    } catch (error) {
      console.error('Error resolving security event:', error);
      toast({
        title: "Error",
        description: "Failed to resolve security event",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'failed_login':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'security_scan':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading security data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Security & Monitoring</h1>
          <p className="text-muted-foreground">Monitor system security and configure protection settings</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {securityEvents.filter(e => !e.resolved && e.severity === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">High severity unresolved</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round((Object.values(securitySettings).filter(Boolean).length / 4) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Security features enabled</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityEvents.length}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Events</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {securityEvents.filter(e => e.resolved).length}
            </div>
            <p className="text-xs text-muted-foreground">Successfully handled</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Configure system security features and policies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Two-Factor Authentication</div>
              <div className="text-sm text-muted-foreground">
                Require 2FA for all admin accounts
              </div>
            </div>
            <Switch
              checked={securitySettings.two_factor_auth}
              onCheckedChange={(value) => updateSecuritySetting('two_factor_auth', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Automatic Session Timeout</div>
              <div className="text-sm text-muted-foreground">
                Automatically logout inactive users
              </div>
            </div>
            <Switch
              checked={securitySettings.session_timeout}
              onCheckedChange={(value) => updateSecuritySetting('session_timeout', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">IP Address Whitelisting</div>
              <div className="text-sm text-muted-foreground">
                Restrict access to approved IP addresses
              </div>
            </div>
            <Switch
              checked={securitySettings.ip_whitelist}
              onCheckedChange={(value) => updateSecuritySetting('ip_whitelist', value)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Enhanced Audit Logging</div>
              <div className="text-sm text-muted-foreground">
                Log all administrative actions
              </div>
            </div>
            <Switch
              checked={securitySettings.audit_logging}
              onCheckedChange={(value) => updateSecuritySetting('audit_logging', value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
          <CardDescription>Recent security incidents and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {securityEvents.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No security events found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {securityEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEventIcon(event.event_type)}
                        <span className="font-medium">{event.event_type.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {event.description}
                    </TableCell>
                    <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {event.ip_address || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(event.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {event.resolved ? (
                        <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Open</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!event.resolved && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => resolveSecurityEvent(event.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSecurity;
