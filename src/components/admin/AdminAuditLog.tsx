import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuditLogEntry {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: any | null;
  new_values: any | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_id: string | null;
}

const AdminAuditLog = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching audit logs:', error);
        toast({
          title: "Error",
          description: "Failed to fetch audit logs",
          variant: "destructive",
        });
        return;
      }

      // Transform the data to match our interface
      const transformedData: AuditLogEntry[] = (data || []).map(log => ({
        ...log,
        ip_address: log.ip_address ? String(log.ip_address) : null,
      }));

      setAuditLogs(transformedData);
      setFilteredLogs(transformedData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredLogs(auditLogs);
      return;
    }

    const filtered = auditLogs.filter(log =>
      log.action.toLowerCase().includes(term.toLowerCase()) ||
      (log.table_name && log.table_name.toLowerCase().includes(term.toLowerCase())) ||
      (log.user_id && log.user_id.toLowerCase().includes(term.toLowerCase()))
    );
    setFilteredLogs(filtered);
  };

  const exportLogs = () => {
    const csvData = filteredLogs.map(log => ({
      'Timestamp': new Date(log.created_at).toLocaleString(),
      'Action': log.action,
      'Table': log.table_name || 'N/A',
      'Record ID': log.record_id || 'N/A',
      'User ID': log.user_id || 'System',
      'IP Address': log.ip_address || 'N/A',
      'Changes': log.new_values ? JSON.stringify(log.new_values) : 'N/A'
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `${filteredLogs.length} audit entries exported`,
    });
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <Badge className="bg-green-100 text-green-800">CREATE</Badge>;
      case 'update':
        return <Badge className="bg-blue-100 text-blue-800">UPDATE</Badge>;
      case 'delete':
        return <Badge className="bg-red-100 text-red-800">DELETE</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">Track all system activities and user actions</p>
        </div>
        <Button onClick={exportLogs} disabled={filteredLogs.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export Logs ({filteredLogs.length})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>System Activity Log</CardTitle>
              <CardDescription>Complete audit trail of all system activities</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search audit logs..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {searchTerm ? `No audit logs found matching "${searchTerm}"` : "No audit logs found."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="font-mono text-sm">{log.table_name || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-sm">{log.record_id || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-sm">{log.user_id || 'System'}</TableCell>
                    <TableCell className="font-mono text-sm">{log.ip_address || 'N/A'}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {log.new_values ? JSON.stringify(log.new_values) : 'N/A'}
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

export default AdminAuditLog;
