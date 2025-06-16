
-- Fix the user_roles table to reference profiles instead of auth.users
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure loans table has proper foreign key to profiles
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_customer_id_fkey;
ALTER TABLE public.loans ADD CONSTRAINT loans_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure loans reviewed_by references profiles
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_reviewed_by_fkey;
ALTER TABLE public.loans ADD CONSTRAINT loans_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);

-- Ensure transactions table has proper foreign key to profiles  
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
