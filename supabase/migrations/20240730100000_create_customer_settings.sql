-- Create customer_settings table
CREATE TABLE public.customer_settings (
  user_id UUID PRIMARY KEY NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_transaction_alerts BOOLEAN DEFAULT TRUE NOT NULL,
  email_promotional_offers BOOLEAN DEFAULT FALSE NOT NULL,
  allow_phone_contact_for_support BOOLEAN DEFAULT TRUE NOT NULL,
  allow_phone_contact_for_offers BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.customer_settings IS 'Stores user-specific settings and preferences.';

-- Enable RLS
ALTER TABLE public.customer_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_settings
CREATE POLICY "Users can view their own settings"
  ON public.customer_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.customer_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.customer_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant usage to authenticated role
-- Note: Supabase default grants might already cover this for the table owner/creator.
-- Explicit grants ensure authenticated users can interact based on RLS.
GRANT SELECT, INSERT, UPDATE ON TABLE public.customer_settings TO authenticated;
-- REVOKE DELETE ON TABLE public.customer_settings FROM authenticated; -- Optional: if delete is not intended for users

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_customer_settings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_settings_updated_at
  BEFORE UPDATE ON public.customer_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_settings_updated_at_column();
