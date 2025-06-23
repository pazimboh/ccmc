import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { generateAccountNumber } from "@/lib/accountUtils"; // Import the new utility

// Define available account types - this could also come from a config or API
const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking Account" },
  { value: "savings", label: "Savings Account" },
  // { value: "business", label: "Business Account" }, // Assuming schema supports this
];

const addAccountSchema = z.object({
  account_name: z.string().min(3, "Account nickname must be at least 3 characters long."),
  account_type: z.enum(["checking", "savings", "business"], { // Ensure "business" is valid if used
    errorMap: () => ({ message: "Please select a valid account type." }),
  }),
});

type AddAccountFormData = z.infer<typeof addAccountSchema>;

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountAdded: () => void; // Callback to refresh dashboard data
}

export function AddAccountModal({ open, onOpenChange, onAccountAdded }: AddAccountModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddAccountFormData>({
    resolver: zodResolver(addAccountSchema),
    defaultValues: {
      account_name: "",
      account_type: undefined, // No default selection
    },
  });

  const onSubmit = async (data: AddAccountFormData) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to add an account.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const newAccountNumber = generateAccountNumber();
      // IMPORTANT: Assuming 'account_status' column with 'pending_approval' state exists or will be added.
      // And that new accounts should default to this pending status.
      // If the table default isn't 'pending_approval', explicitly set it here.
      const { error } = await supabase.from("accounts").insert([
        {
          user_id: user.id, // In your schema, it's user_id, not customer_id for accounts table
          account_name: data.account_name,
          account_type: data.account_type,
          account_number: newAccountNumber,
          balance: 0, // New accounts start with 0 balance
          currency: 'FCFA', // Default currency from your schema
          // status: 'active', // Default from schema, but we want it pending
          account_status: 'pending_approval', // THIS IS THE CRITICAL PART - NEEDS SCHEMA SUPPORT
                                        // If your schema has just one `status` field that should be pending:
                                        // status: 'pending_approval'
        },
      ]);

      if (error) {
        throw error;
      }

      toast({
        title: "Account Request Submitted",
        description: "Your new account request has been submitted and is pending approval.",
      });
      reset();
      onOpenChange(false); // Close the modal
      onAccountAdded(); // Trigger data refresh on dashboard
    } catch (error: any) {
      console.error("Error adding account:", error);
      toast({
        title: "Error Submitting Request",
        description: error.message || "Could not submit your account request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request New Account</DialogTitle>
          <DialogDescription>
            Fill in the details below to request a new bank account. It will be subject to admin approval.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="account_name">Account Nickname</Label>
            <Controller
              name="account_name"
              control={control}
              render={({ field }) => <Input id="account_name" placeholder="e.g., My Vacation Fund" {...field} />}
            />
            {errors.account_name && <p className="text-sm text-red-500 mt-1">{errors.account_name.message}</p>}
          </div>

          <div>
            <Label htmlFor="account_type">Account Type</Label>
            <Controller
              name="account_type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="account_type">
                    <SelectValue placeholder="Select an account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                     {/* Add business if schema supports it in accounts.account_type CHECK constraint */}
                    <SelectItem value="business">Business Account</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.account_type && <p className="text-sm text-red-500 mt-1">{errors.account_type.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
