import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { AlertCircle, ArrowDownRight, ArrowUpRight, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // For success/error messages

// Zod schema for form validation
const paymentFormSchema = z.object({
  fromAccountId: z.string().min(1, "Please select an account to pay from."),
  transferType: z.enum(["internal", "external"], {
    required_error: "Please select a transfer type.",
  }),
  recipientAccountNumber: z.string().min(5, "Recipient account number is required."), // Basic validation
  recipientName: z.string().optional(), // Optional for internal, maybe required for external
  amount: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9.-]+/g, "")), // Clean input
    z.number().positive("Amount must be positive.")
  ),
  description: z.string().optional(),
}).refine(data => !(data.transferType === 'external' && !data.recipientName), {
    message: "Recipient name is required for external transfers.",
    path: ["recipientName"],
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const Transfer = () => { // Renamed component
  const [activeTab, setActiveTab] = useState("transfer"); // Updated activeTab
  const { profile, user, isLoading: authLoading, refreshUserData } = useAuth();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<Tables<"accounts">[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<Tables<"transactions">[]>([]);
  // No longer need selectedAccountId state, react-hook-form will manage formAccountId
  const [isLoading, setIsLoading] = useState(true); // For initial data load
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      fromAccountId: "",
      transferType: "internal",
      recipientAccountNumber: "",
      recipientName: "",
      amount: 0,
      description: "",
    },
  });
  const watchTransferType = form.watch("transferType");

  const fetchPageData = async (isRefresh: boolean = false) => {
    if (!isRefresh) setIsLoading(true); // Only full loading screen on initial load
    setError(null);
    try {
      if (!user || !profile?.id) throw new Error("User not authenticated.");

      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", profile.id); // Changed "customer_id" to "user_id"
      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);
      if (accountsData && accountsData.length > 0 && !form.getValues("fromAccountId")) {
        form.setValue("fromAccountId", accountsData[0].id);
      }

      const paymentTypes = ["payment", "transfer", "withdrawal"];
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("customer_id", profile.id)
        .in("transaction_type", paymentTypes)
        .order("created_at", { ascending: false })
        .limit(20);
      if (transactionsError) throw transactionsError;
      setPaymentTransactions(transactionsData || []);

    } catch (err) {
      console.error("Error fetching payments page data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      if (!isRefresh) setIsLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Transfer - CCMC Bank"; // Updated document title
  }, []);

  useEffect(() => {
    if (!authLoading && user && profile?.id) {
      fetchPageData();
    } else if (!authLoading) {
      setIsLoading(false); // Auth not loading, but no user/profile
    }
  }, [user, profile?.id, authLoading]);


  const onSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      if (!user || !profile?.id) throw new Error("User not authenticated.");

      const fromAccount = accounts.find(acc => acc.id === values.fromAccountId);
      if (!fromAccount) throw new Error("Selected 'from' account not found.");
      if (Number(fromAccount.balance) < values.amount) {
        form.setError("amount", { type: "manual", message: "Insufficient balance." });
        throw new Error("Insufficient balance.");
      }

      const transferAmount = Number(values.amount);
      const commonTransactionDetails = {
        customer_id: profile.id,
        description: values.description || `${values.transferType} to ${values.recipientAccountNumber}`,
        status: "completed", // Assuming direct completion for now
      };

      if (values.transferType === "internal") {
        // Internal Transfer
        const { data: recipientAccount, error: recipientError } = await supabase
          .from("accounts")
          .select("id, balance, customer_id")
          .eq("account_number", values.recipientAccountNumber)
          .single();

        if (recipientError || !recipientAccount) {
          form.setError("recipientAccountNumber", { type: "manual", message: "Recipient account not found." });
          throw new Error("Recipient account not found for internal transfer.");
        }
        if (recipientAccount.id === fromAccount.id) {
            form.setError("recipientAccountNumber", { type: "manual", message: "Cannot transfer to the same account."});
            throw new Error("Cannot transfer to the same account.");
        }


        // Client-side transaction sequence (NOT ATOMIC)
        // 1. Debit sender
        const { error: debitError } = await supabase
          .from("accounts")
          .update({ balance: Number(fromAccount.balance) - transferAmount })
          .eq("id", fromAccount.id);
        if (debitError) throw new Error(`Failed to debit sender: ${debitError.message}`);

        // 2. Credit receiver
        const { error: creditError } = await supabase
          .from("accounts")
          .update({ balance: Number(recipientAccount.balance) + transferAmount })
          .eq("id", recipientAccount.id);
        if (creditError) { /* Attempt to rollback sender's debit - best effort */
            await supabase.from("accounts").update({ balance: fromAccount.balance }).eq("id", fromAccount.id);
            throw new Error(`Failed to credit recipient: ${creditError.message}`);
        }

        // 3. Record sender's transaction
        const { error: senderTxError } = await supabase.from("transactions").insert({
          ...commonTransactionDetails,
          transaction_id: crypto.randomUUID(),
          from_account: fromAccount.account_number,
          to_account: recipientAccount.id, // or recipientAccount.account_number
          amount: -transferAmount,
          transaction_type: "transfer_out",
        });
        if (senderTxError) { /* Complex rollback needed */ throw new Error(`Sender transaction record failed: ${senderTxError.message}`); }

        // 4. Record recipient's transaction
        const { error: recipientTxError } = await supabase.from("transactions").insert({
          ...commonTransactionDetails,
          transaction_id: crypto.randomUUID(),
          customer_id: recipientAccount.customer_id, // Recipient's customer_id
          from_account: fromAccount.account_number,
          to_account: recipientAccount.id, // or recipientAccount.account_number
          amount: transferAmount,
          transaction_type: "transfer_in",
        });
        if (recipientTxError) { /* Complex rollback needed */ throw new Error(`Recipient transaction record failed: ${recipientTxError.message}`);}

      } else { // External Transfer / Payment
        const { error: updateError } = await supabase
          .from("accounts")
          .update({ balance: Number(fromAccount.balance) - transferAmount })
          .eq("id", fromAccount.id);
        if (updateError) throw new Error(`Failed to update sender account: ${updateError.message}`);

        const { error: txError } = await supabase.from("transactions").insert({
          ...commonTransactionDetails,
          transaction_id: crypto.randomUUID(),
          from_account: fromAccount.account_number,
          to_account: values.recipientAccountNumber, // External account number
          amount: -transferAmount,
          transaction_type: "payment", // Or 'external_transfer'
          status: "pending", // External might be pending
        });
        if (txError) { /* Attempt to rollback */
            await supabase.from("accounts").update({ balance: fromAccount.balance }).eq("id", fromAccount.id);
            throw new Error(`Transaction record failed: ${txError.message}`);
        }
      }

      toast({ title: "Success", description: "Transfer completed successfully." });
      form.reset();
      fetchPageData(true); // Refresh data
      if (typeof refreshUserData === 'function') refreshUserData(); // Refresh global profile/auth context if needed

    } catch (err) {
      console.error("Transfer/Payment error:", err);
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransactionVisuals = (transactionType: string | null) => {
    switch (transactionType?.toLowerCase()) {
      case "deposit": case "salary": case "transfer_in": return { icon: ArrowDownRight, color: "text-green-500" };
      case "payment": case "withdrawal": case "purchase": case "transfer_out": return { icon: ArrowUpRight, color: "text-red-500" };
      case "transfer": return { icon: CreditCard, color: "text-blue-500" }; // Generic transfer if type is just 'transfer'
      default: return { icon: CreditCard, color: "text-gray-500" };
    }
  };

  if (isLoading) { // Initial loading state
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg text-gray-600">Loading payments data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <DashboardNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6">
          <div className="container mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Payments & Transfers</h1>

            {error && !isSubmitting && ( // Show general page load error if not submitting
              <Card className="border-destructive bg-destructive/10">
                <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Error Fetching Data</CardTitle></CardHeader>
                <CardContent><p className="text-destructive/90">Could not load payments page data: {error}</p>
                  <Button onClick={() => fetchPageData()} className="mt-3" variant="destructive">Try Again</Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Make a Payment / Transfer</CardTitle>
                <CardDescription>Ensure recipient details are correct before submitting.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="fromAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Account</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={accounts.length === 0}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {accounts.length > 0 ? accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name} ({acc.account_number}) - Bal: {Number(acc.balance).toLocaleString()} FCFA
                                </SelectItem>
                              )) : <SelectItem value="no-acc" disabled>No accounts available</SelectItem>}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="transferType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Transfer Type</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="internal" /></FormControl>
                                <FormLabel className="font-normal">Internal (to another CCMC Bank account)</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="external" /></FormControl>
                                <FormLabel className="font-normal">External / Payment (to other banks/services)</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                        control={form.control}
                        name="recipientAccountNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Recipient Account Number</FormLabel>
                            <FormControl><Input placeholder="Enter recipient's account number" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    {watchTransferType === "external" && (
                      <FormField
                        control={form.control}
                        name="recipientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Name</FormLabel>
                            <FormControl><Input placeholder="Enter recipient's full name" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (FCFA)</FormLabel>
                          <FormControl><Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl><Input placeholder="E.g., Monthly rent, payment for services" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Processing..." : "Submit Payment"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment & Transfer History</CardTitle>
                <CardDescription>Your recent outgoing and incoming transfer transactions.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && paymentTransactions.length === 0 && <p>Loading history...</p>}
                {!isLoading && paymentTransactions.length === 0 && !error && <p>No payment or transfer transactions found.</p>}
                {paymentTransactions.length > 0 && (
                  <ul className="space-y-3">
                    {paymentTransactions.map(tx => {
                      const visuals = getTransactionVisuals(tx.transaction_type);
                      const description = `${tx.transaction_type} ${tx.from_account ? `from ${tx.from_account.slice(-4)}` : ''} ${tx.to_account ? `to ${tx.to_account.slice(-4)}`: ''}`.trim();
                      const date = new Date(tx.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      return (
                        <li key={tx.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2.5 rounded-full bg-gray-100 ${visuals.color}`}>
                              <visuals.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{description}</p>
                              <p className="text-xs text-muted-foreground">{date} &bull; Status: {tx.status}</p>
                            </div>
                          </div>
                          <div className={`font-semibold text-sm ${Number(tx.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {Number(tx.amount) < 0 ? '-' : '+'}
                            {Math.abs(Number(tx.amount)).toLocaleString()} FCFA
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Transfer; // Updated export
