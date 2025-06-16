-- Create public.accounts table
CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    customer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name character varying NOT NULL,
    type character varying NOT NULL, -- e.g., 'checking', 'savings'
    account_number character varying UNIQUE NOT NULL,
    balance numeric(15,2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0), -- Ensure balance is not negative
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.accounts IS 'Stores customer bank accounts information.';
CREATE INDEX IF NOT EXISTS idx_accounts_customer_id ON public.accounts(customer_id);

-- Create public.transfers table
-- This table is for recording the intent and details of a transfer operation.
-- Actual balance changes and transaction ledger entries are separate.
CREATE TABLE public.transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    from_account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    to_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL, -- Internal transfer
    to_external_account_number character varying, -- External transfer
    recipient_name character varying, -- For external transfers or just for record
    transfer_type character varying NOT NULL, -- 'internal', 'external_bank', 'payment_gateway'
    amount numeric(15,2) NOT NULL CHECK (amount > 0),
    description text,
    status character varying DEFAULT 'pending'::character varying NOT NULL, -- 'pending', 'completed', 'failed', 'cancelled'
    initiated_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- User who initiated
    transaction_date timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.transfers IS 'Stores information about fund transfer operations.';
CREATE INDEX IF NOT EXISTS idx_transfers_from_account_id ON public.transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_account_id ON public.transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_initiated_by_user_id ON public.transfers(initiated_by_user_id);


-- Create public.statements table
CREATE TABLE public.statements (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    customer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Denormalized for easier RLS, but account_id also links to customer
    statement_date date NOT NULL,
    period_start_date date NOT NULL,
    period_end_date date NOT NULL,
    opening_balance numeric(15,2) NOT NULL,
    closing_balance numeric(15,2) NOT NULL,
    total_credits numeric(15,2) DEFAULT 0.00 NOT NULL,
    total_debits numeric(15,2) DEFAULT 0.00 NOT NULL,
    file_url character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.statements IS 'Stores account statement information and links to statement files.';
CREATE INDEX IF NOT EXISTS idx_statements_account_id ON public.statements(account_id);
CREATE INDEX IF NOT EXISTS idx_statements_customer_id ON public.statements(customer_id);

-- Alter public.transactions table (as specified in the issue)
-- Add new columns: description, balance_after_transaction, transfer_id
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS balance_after_transaction numeric(15,2),
    ADD COLUMN IF NOT EXISTS transfer_id uuid REFERENCES public.transfers(id) ON DELETE SET NULL; -- Link to the transfers table

COMMENT ON COLUMN public.transactions.transfer_id IS 'Links to the specific transfer operation, if this transaction is part of one.';

-- Sample Data
-- Ensure you have at least one profile to link to:
-- INSERT INTO public.profiles (id, first_name, last_name) VALUES ('auth_user_id_placeholder', 'Test', 'User') ON CONFLICT (id) DO NOTHING;
-- Replace 'auth_user_id_placeholder' with an actual auth.uid() for testing if needed, or use subqueries if profiles exist.

DO $$
DECLARE
    test_customer_id uuid;
    account1_id uuid;
    account2_id uuid;
    transfer1_id uuid;
BEGIN
    -- Attempt to get an existing profile's ID, or use a fixed one for testing if your local setup has it.
    SELECT id INTO test_customer_id FROM public.profiles LIMIT 1;

    IF test_customer_id IS NULL THEN
        -- Insert a dummy profile if none exist, for sample data to work.
        -- In a real scenario, users would already exist.
        INSERT INTO public.profiles (id, first_name, last_name, status) VALUES (gen_random_uuid(), 'Sample', 'User', 'approved') RETURNING id INTO test_customer_id;
    END IF;

    -- Sample Accounts
    INSERT INTO public.accounts (customer_id, name, type, account_number, balance) VALUES
        (test_customer_id, 'Primary Checking', 'checking', 'CHK' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), 12500.75),
        (test_customer_id, 'Savings Deluxe', 'savings', 'SAV' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), 55600.25)
    RETURNING id INTO account1_id, account2_id; -- This only works if inserting exactly two rows and your PG version supports it.
    -- More robust:
    SELECT id INTO account1_id FROM public.accounts WHERE customer_id = test_customer_id AND type = 'checking' LIMIT 1;
    SELECT id INTO account2_id FROM public.accounts WHERE customer_id = test_customer_id AND type = 'savings' LIMIT 1;


    -- Sample Transfer (will be linked by a transaction)
    INSERT INTO public.transfers (from_account_id, to_external_account_number, transfer_type, amount, description, status, initiated_by_user_id) VALUES
        (account1_id, 'EXTACC98765', 'external_bank', 150.00, 'Utility Bill Payment', 'completed', test_customer_id)
    RETURNING id INTO transfer1_id;

    -- Sample Transactions
    INSERT INTO public.transactions (customer_id, from_account, amount, transaction_type, status, description, transaction_id, transfer_id, balance_after_transaction) VALUES
        (test_customer_id, account1_id::text, -150.00, 'payment', 'completed', 'Utility Bill Payment via Transfer', gen_random_uuid(), transfer1_id, 12350.75),
        (test_customer_id, account1_id::text, 2000.00, 'deposit', 'completed', 'Salary Deposit', gen_random_uuid(), NULL, 14350.75),
        (test_customer_id, account2_id::text, -50.25, 'withdrawal', 'completed', 'ATM Withdrawal', gen_random_uuid(), NULL, 55550.00);

    -- Sample Statement
    INSERT INTO public.statements (account_id, customer_id, statement_date, period_start_date, period_end_date, opening_balance, closing_balance, total_credits, total_debits, file_url) VALUES
        (account1_id, test_customer_id, CURRENT_DATE, CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE, 10000.00, 14350.75, 4350.75, 0.00, 'https://example.com/statement_jan_2024.pdf');
END $$;


-- RLS Policies

-- Enable RLS for all relevant tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;
-- Assuming transactions table already has RLS enabled, if not:
-- ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies for public.accounts
CREATE POLICY "Users can view their own accounts" ON public.accounts
    FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can create accounts for themselves" ON public.accounts
    FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can update their own account names" ON public.accounts
    FOR UPDATE USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id); -- Example: Allow updating only 'name' or 'type'

-- Policies for public.transfers
CREATE POLICY "Users can view their own initiated transfers" ON public.transfers
    FOR SELECT USING (auth.uid() = initiated_by_user_id);
-- To see transfers where user is recipient (internal), a more complex policy or view might be needed.
-- Example: Allow viewing if user is owner of from_account_id or to_account_id (if internal)
-- CREATE POLICY "Users can view their related transfers" ON public.transfers
--    FOR SELECT USING (
--        auth.uid() = initiated_by_user_id OR
--        EXISTS (SELECT 1 FROM public.accounts acc WHERE acc.id = public.transfers.from_account_id AND acc.customer_id = auth.uid()) OR
--        EXISTS (SELECT 1 FROM public.accounts acc WHERE acc.id = public.transfers.to_account_id AND acc.customer_id = auth.uid())
--    );

CREATE POLICY "Users can create transfers from their accounts" ON public.transfers
    FOR INSERT WITH CHECK (
        auth.uid() = initiated_by_user_id AND
        EXISTS (SELECT 1 FROM public.accounts acc WHERE acc.id = from_account_id AND acc.customer_id = auth.uid())
    );
-- Note: For internal transfers, ensure the recipient to_account_id is valid, perhaps via function logic.

-- Policies for public.statements
CREATE POLICY "Users can view their own statements" ON public.statements
    FOR SELECT USING (auth.uid() = customer_id);

-- Updated RLS Policies for public.transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions; -- Drop old policy by its name
DROP POLICY IF EXISTS "Users can insert transactions related to their actions" ON public.transactions; -- Drop new policy name (good practice)
CREATE POLICY "Users can insert transactions related to their actions" ON public.transactions
    FOR INSERT WITH CHECK (
        (
            -- Case 1: User is the direct customer for the transaction (e.g., their own debit, their own deposit)
            auth.uid() = customer_id AND
            (from_account IS NULL OR EXISTS (SELECT 1 FROM public.accounts acc WHERE acc.account_number = from_account AND acc.customer_id = auth.uid()))
        ) OR (
            -- Case 2: Specific case for inserting recipient's 'transfer_in' record during an internal transfer.
            -- The transaction is a 'transfer_in', the 'customer_id' on the transaction is the recipient's,
            -- and the sender (auth.uid()) owns the 'from_account' specified in the transaction.
            transaction_type = 'transfer_in' AND
            EXISTS (SELECT 1 FROM public.accounts acc WHERE acc.account_number = from_account AND acc.customer_id = auth.uid())
        )
    );

-- Policy for users to update status of transactions they own (e.g. cancel a pending one, if applicable by app logic)
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions" ON public.transactions
    FOR UPDATE USING (auth.uid() = customer_id)
    WITH CHECK (auth.uid() = customer_id);

-- Ensure no default public access if RLS is intended to be restrictive
REVOKE ALL ON TABLE public.accounts FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.transfers FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.statements FROM public, anon, authenticated;
-- For transactions, if it's already set up, review existing REVOKE statements.
-- REVOKE ALL ON TABLE public.transactions FROM public, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transfers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.statements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO authenticated;

-- For service_role (used by backend functions or direct admin access, bypasses RLS)
-- GRANT ALL ON TABLE public.accounts TO service_role;
-- GRANT ALL ON TABLE public.transfers TO service_role;
-- GRANT ALL ON TABLE public.statements TO service_role;
-- GRANT ALL ON TABLE public.transactions TO service_role;
-- GRANT USAGE ON SCHEMA public TO service_role;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Note: Specific column grants can further restrict what authenticated users can do,
-- e.g., only allow updating certain columns on `accounts` or `transactions`.
-- E.g., GRANT UPDATE (name) ON TABLE public.accounts TO authenticated;
-- E.g., GRANT UPDATE (status) ON TABLE public.transactions TO authenticated;
