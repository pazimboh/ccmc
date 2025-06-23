import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

const creditAccountSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be a number." })
    .positive("Amount must be positive.")
    .finite("Amount must be a finite number."),
  description: z.string().optional(),
});

type CreditAccountFormData = z.infer<typeof creditAccountSchema>;

interface CreditAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Tables<'accounts'> | null;
  onCreditRequestSubmitted: () => void;
}

// Using the more unique reference number generation
function generateModalReferenceNumber(): string {
  return `DEP-MOD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

export function CreditAccountModal({ open, onOpenChange, account, onCreditRequestSubmitted }: CreditAccountModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreditAccountFormData>({
    resolver: zodResolver(creditAccountSchema),
    defaultValues: {
      amount: '',
      description: "",
    },
  });

  useEffect(() => {
    if (open && account) {
      reset({ amount: '', description: "" });
    } else if (!open) {
      reset({ amount: '', description: "" });
    }
  }, [open, account, reset]);

  const onSubmit = async (data: CreditAccountFormData) => {
    if (!user || !account) {
      toast({ title: "Error", description: "User or account information is missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    console.log("Form submitted. Data:", data);
    console.log("Type of data.amount:", typeof data.amount, "Value:", data.amount);

    try {
      const depositPayload = {
        user_id: user.id,
        account_id: account.id,
        amount: Number(data.amount), // Ensure it's a number, though Zod coerce should handle it
        currency: account.currency || 'FCFA',
        description: data.description || "", // Send empty string if undefined/null
        reference_number: generateModalReferenceNumber(),
        // status: 'pending', // Relying on DB default for 'deposits' table
      };
      console.log("Submitting deposit payload to Supabase:", depositPayload);

      const { error } = await supabase.from("deposits").insert([depositPayload]).select(); // Keep .select() for now

      console.log("Supabase insert response. Error:", error);

      if (error) {
        console.error("Supabase insert error object:", error);
        throw error;
      }

      toast({
        title: "Credit Request Submitted",
        description: "Your request to credit the account is pending admin approval.",
      });
      reset();
      onOpenChange(false);
      onCreditRequestSubmitted();
    } catch (error: any) {
      console.error("Error in onSubmit for credit request:", error);
      toast({
        title: "Error Submitting Request",
        description: error.message || "Could not submit your credit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log("onSubmit finally block. Setting isSubmitting to false.");
      setIsSubmitting(false);
    }
  };

  const handleTestInsert = async () => { // Keeping this for sanity checks if needed
    console.log("Attempting direct Supabase test insert...");
    if (!user || !account) { // user from useAuth() might be slightly stale, but account must be present
      console.error("Test Insert: Account prop missing");
      alert("Test Insert: Account prop missing. Cannot perform test.");
      return;
    }
    try {
      const { data: { user: currentUserForTest }, error: userCheckError } = await supabase.auth.getUser();
      console.log('Current user for test insert:', currentUserForTest, 'User Check Error:', userCheckError);

      if (userCheckError || !currentUserForTest) {
        alert('Cannot get current user before test insert. Aborting. Error: ' + (userCheckError?.message || 'No current user'));
        console.error("Test Insert: Failed to get current user", userCheckError);
        return;
      }
      // Optional: Compare context user with freshly fetched user if needed
      // if (user?.id !== currentUserForTest.id) {
      //     console.warn('User context mismatch during test insert. Context user:', user?.id, 'Fetched user:', currentUserForTest.id);
      //     // Decide if this is critical enough to stop, or proceed with currentUserForTest.id
      // }

      const { data: testData, error: testError } = await supabase.from('deposits').insert({
        user_id: currentUserForTest.id, // Use freshly fetched user ID
        account_id: account.id,
        amount: 1.00,
        reference_number: `TESTDIRECT-${Date.now()}-${Math.random().toString(36).substring(2,9).toUpperCase()}`, // slightly more unique
        description: "Direct Supabase Client Test from Modal",
        currency: account.currency || 'FCFA',
        // status will default to 'pending' as per DB schema for deposits
      }); // .select() REMOVED

      if (testError) {
        console.error('Direct Supabase Test Insert ERROR:', testError);
        alert('Direct Test Failed: ' + testError.message);
      } else {
        console.log('Direct Supabase Test Insert SUCCESS:', testData);
        alert('Direct Test Succeeded! Check the console and database.');
      }
    } catch (e) {
      console.error('Direct Supabase Test Insert CATCH:', e);
      alert('Direct Test CATCH: ' + (e as any).message);
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) reset();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Credit Account: {account.name}</DialogTitle>
          <DialogDescription>
            Request a deposit into account <span className="font-semibold">{account.account_number}</span>.
            This transaction will be pending admin approval.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="amount">Amount ({account.currency || 'FCFA'})</Label>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g., 50000"
                  {...field}
                  value={field.value === undefined || field.value === null ? '' : String(field.value)}
                />
              )}
            />
            {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <Textarea id="description" placeholder="e.g., Funds from savings, Monthly allowance" {...field} value={field.value || ''} />}
            />
            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <p className="text-xs text-muted-foreground">
            Note: This credit request will be processed by an administrator. Funds will appear in your account upon approval.
          </p>

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="destructive" onClick={handleTestInsert} className="mr-auto">Test Direct Insert</Button>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Credit Request"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
