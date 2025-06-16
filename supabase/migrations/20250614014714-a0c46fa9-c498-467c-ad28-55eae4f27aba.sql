
-- Create audit log table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create security events table
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  ip_address INET,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  severity TEXT DEFAULT 'medium',
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('bank_name', '"CCMC Bank"', 'Name of the financial institution'),
('admin_email', '"admin@ccmcbank.com"', 'Primary administrator email'),
('support_phone', '"(237) 653-225-597"', 'Customer support phone number'),
('bank_address', '"123 Financial District, Douala, Cameroon"', 'Physical address of the bank'),
('min_credit_score', '600', 'Minimum credit score for loan approval'),
('max_loan_amount', '200000000', 'Maximum loan amount in FCFA'),
('default_interest_rate', '5.0', 'Default interest rate percentage'),
('auto_approval_limit', '1000000', 'Auto-approval limit for loans in FCFA'),
('two_factor_auth', 'true', 'Enable two-factor authentication'),
('session_timeout', 'true', 'Enable automatic session timeout'),
('ip_whitelist', 'false', 'Enable IP address whitelisting'),
('audit_logging', 'true', 'Enable enhanced audit logging'),
('auto_backup', 'true', 'Enable automatic database backups'),
('backup_time', '"02:00"', 'Daily backup time'),
('loan_notifications', 'true', 'Enable loan application notifications'),
('customer_notifications', 'true', 'Enable customer registration notifications'),
('security_alerts', 'true', 'Enable security alerts'),
('daily_reports', 'false', 'Enable daily summary reports')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert sample security events
INSERT INTO public.security_events (event_type, description, ip_address, severity, created_at) VALUES
('failed_login', 'Multiple failed login attempts', '192.168.1.50', 'high', now() - interval '2 hours'),
('password_change', 'Admin password changed', '192.168.1.100', 'medium', now() - interval '1 day'),
('security_scan', 'Security scan completed - no threats detected', NULL, 'low', now() - interval '2 hours')
ON CONFLICT DO NOTHING;

-- Insert sample audit log entries
INSERT INTO public.audit_logs (action, table_name, record_id, new_values, created_at) VALUES
('CREATE', 'loans', gen_random_uuid(), '{"amount": 50000, "status": "pending"}', now() - interval '1 hour'),
('UPDATE', 'loans', gen_random_uuid(), '{"status": "approved"}', now() - interval '30 minutes'),
('CREATE', 'profiles', gen_random_uuid(), '{"first_name": "John", "last_name": "Doe"}', now() - interval '2 hours')
ON CONFLICT DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs (admin only)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create policies for system settings (admin only)
CREATE POLICY "Admins can view system settings" ON public.system_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update system settings" ON public.system_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create policies for security events (admin only)
CREATE POLICY "Admins can view security events" ON public.security_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update security events" ON public.security_events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
