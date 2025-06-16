
-- Update the user role to admin for the specified email
UPDATE public.user_roles 
SET role = 'admin'
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'edharrismix@gmail.com'
);

-- Also update the profile status to approved if it's not already
UPDATE public.profiles 
SET status = 'approved'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'edharrismix@gmail.com'
);
