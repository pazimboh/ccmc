
-- Create loans table for loan applications
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  loan_type TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  term_months INTEGER NOT NULL,
  purpose TEXT,
  credit_score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on loans table
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Create policies for loans table
CREATE POLICY "Admins can view all loans" 
  ON public.loans 
  FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert loans" 
  ON public.loans 
  FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update loans" 
  ON public.loans 
  FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view their own loans" 
  ON public.loans 
  FOR SELECT 
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can insert their own loan applications"
  ON public.loans
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Create transactions table for transaction logging
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('transfer', 'withdrawal', 'deposit', 'payment', 'fee', 'refund')),
  from_account TEXT,
  to_account TEXT,
  amount DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('pending', 'complete', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions table
CREATE POLICY "Admins can view all transactions" 
  ON public.transactions 
  FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert transactions" 
  ON public.transactions 
  FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view their own transactions" 
  ON public.transactions 
  FOR SELECT 
  USING (customer_id = auth.uid());

-- Insert some sample loan data
INSERT INTO public.loans (customer_id, loan_type, amount, term_months, purpose, credit_score) 
SELECT 
  p.id,
  CASE 
    WHEN random() < 0.33 THEN 'Personal Loan'
    WHEN random() < 0.66 THEN 'Auto Loan'
    ELSE 'Home Loan'
  END,
  CASE 
    WHEN random() < 0.33 THEN 9000000
    WHEN random() < 0.66 THEN 13500000
    ELSE 192000000
  END,
  CASE 
    WHEN random() < 0.33 THEN 36
    WHEN random() < 0.66 THEN 48
    ELSE 360
  END,
  CASE 
    WHEN random() < 0.33 THEN 'Home renovation'
    WHEN random() < 0.66 THEN 'New vehicle purchase'
    ELSE 'Home purchase'
  END,
  FLOOR(random() * 200 + 600)::INTEGER
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'customer'
)
LIMIT 3;

-- Insert some sample transaction data
INSERT INTO public.transactions (transaction_id, customer_id, transaction_type, from_account, to_account, amount, status)
SELECT 
  'TXN-' || LPAD((ROW_NUMBER() OVER())::TEXT, 5, '0'),
  p.id,
  CASE 
    WHEN random() < 0.2 THEN 'transfer'
    WHEN random() < 0.4 THEN 'withdrawal'
    WHEN random() < 0.6 THEN 'deposit'
    WHEN random() < 0.8 THEN 'payment'
    ELSE 'fee'
  END,
  p.first_name || ' ' || p.last_name || ' (ID: ' || p.id || ')',
  CASE 
    WHEN random() < 0.5 THEN 'External Account'
    ELSE 'ATM #' || FLOOR(random() * 9999 + 1000)::TEXT
  END,
  FLOOR(random() * 1000000 + 10000)::DECIMAL(15,2),
  CASE 
    WHEN random() < 0.9 THEN 'complete'
    ELSE 'pending'
  END
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'customer'
)
LIMIT 10;
