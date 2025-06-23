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
import { Textarea } from "@/components/ui/textarea"; // For description
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types"; // Supabase generated types

// Schema for the credit account form
const creditAccountSchema = z.object({
  amount: z.coerce // Use coerce for number conversion from string input
    .number({ invalid_type_error: "Amount must be a number." })
    .positive("Amount must be positive.")
    .finite("Amount must be a finite number."),
  description: z.string().optional(),
});

type CreditAccountFormData = z.infer<typeof creditAccountSchema>;

interface CreditAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Tables<'accounts'> | null; // The account to credit
  onCreditRequestSubmitted: () => void; // Callback to potentially refresh transactions or give feedback
}

// Helper to generate a unique reference number (placeholder)
// In a real app, this should be more robust or backend-generated
function generateReferenceNumber(): string {
  return `DEP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
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
      amount: '', // Initialize with an empty string
      description: "",
    },
  });

  useEffect(() => {
    // Reset form when the account changes or modal opens/closes with no account
    if (open && account) {
      reset({ amount: undefined, description: "" });
    } else if (!open) {
      reset({ amount: undefined, description: "" });
    }
  }, [open, account, reset]);


  const onSubmit = async (data: CreditAccountFormData) => {
    if (!user || !account) {
      toast({ title: "Error", description: "User or account information is missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const depositPayload = {
        user_id: user.id,
        account_id: account.id,
        amount: data.amount,
        currency: account.currency || 'FCFA', // Use account's currency or default
        description: data.description,
        reference_number: generateReferenceNumber(),
        status: 'pending', // This is the default in `deposits` table, but explicit is good
        // deposit_method, receipt_url, admin_notes can be added if needed
      };

      const { error } = await supabase.from("deposits").insert([depositPayload]);

      if (error) {
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
      console.error("Error submitting credit request:", error);
      toast({
        title: "Error Submitting Request",
        description: error.message || "Could not submit your credit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) return null; // Don't render if no account is provided

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) reset(); // Reset form if dialog is closed via 'x' or overlay click
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
                  value={field.value === undefined || field.value === null ? '' : String(field.value)} // Ensure value is a string and not undefined
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
              render={({ field }) => <Textarea id="description" placeholder="e.g., Funds from savings, Monthly allowance" {...field} />}
            />
            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <p className="text-xs text-muted-foreground">
            Note: This credit request will be processed by an administrator. Funds will appear in your account upon approval.
          </p>

          <DialogFooter>
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
