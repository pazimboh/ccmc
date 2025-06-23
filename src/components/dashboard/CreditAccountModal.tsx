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

function generateModalReferenceNumber(): string {
  return `DEP-MOD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

export function CreditAccountModal({ open, onOpenChange, account, onCreditRequestSubmitted }: CreditAccountModalProps) {
  // user from useAuth() is used for initial checks, but a fresh one is fetched for the actual insert.
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
    if (!user || !account) { // Initial check with context user
      toast({ title: "Error", description: "User or account information is missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    console.log("Credit Account Form submitted. Data:", data);

    try {
      // Fetch fresh user session info before the insert
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        console.error("Error fetching current user for deposit:", userError);
        toast({ title: "Session Error", description: "Could not verify user session. Please try again.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const depositPayload = {
        user_id: currentUser.id, // Use ID from freshly fetched user
        account_id: account.id,
        amount: Number(data.amount),
        currency: account.currency || 'FCFA',
        description: data.description || "",
        reference_number: generateModalReferenceNumber(),
        // status: 'pending', // Relying on DB default for 'deposits' table
      };
      console.log("Submitting deposit payload to Supabase:", depositPayload);

      const { error: insertError } = await supabase.from("deposits").insert([depositPayload]);
      // No .select()

      console.log("Supabase insert response. Error:", insertError);

      if (insertError) {
        console.error("Supabase insert error object:", insertError);
        throw insertError;
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
      console.log("Credit Account onSubmit finally block. Setting isSubmitting to false.");
      setIsSubmitting(false);
    }
  };

  // Test insert function and button are now removed.

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

          <DialogFooter> {/* Removed sm:justify-between and test button to simplify */}
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Credit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
