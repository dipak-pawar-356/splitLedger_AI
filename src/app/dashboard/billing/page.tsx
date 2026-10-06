import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, FileText, Check, AlertCircle, TrendingUp, Settings, Download, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const user = await requireAuth();

  // Mock data - in production, this would come from Stripe or payment provider
  const subscription = {
    plan: "Pro",
    status: "active",
    currentPeriodStart: new Date("2024-01-01"),
    currentPeriodEnd: new Date("2024-02-01"),
    amount: 9.99,
    currency: "INR",
  };

  const invoices = [
    {
      id: "INV-001",
      date: new Date("2024-01-01"),
      amount: 9.99,
      status: "paid",
      downloadUrl: "#",
    },
    {
      id: "INV-002",
      date: new Date("2023-12-01"),
      amount: 9.99,
      status: "paid",
      downloadUrl: "#",
    },
  ];

  const paymentMethods = [
    {
      id: "pm_1",
      type: "card",
      brand: "Visa",
      last4: "4242",
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your subscription and payment methods
          </p>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Billing Settings
        </Button>
      </div>

      {/* Current Subscription */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-2xl font-bold">{subscription.plan} Plan</h3>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                  {subscription.status}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {formatCurrency(subscription.amount, subscription.currency)}/month
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Next billing: {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                Upgrade Plan
              </Button>
              <Button variant="outline">
                Cancel Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <p className="text-3xl font-bold">$0<span className="text-sm font-normal text-slate-600 dark:text-slate-400">/month</span></p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Up to 50 transactions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">5 contacts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">2 groups</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Basic reports</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full">
                  Current Plan
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                Popular
              </div>
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <p className="text-3xl font-bold">$9.99<span className="text-sm font-normal text-slate-600 dark:text-slate-400">/month</span></p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Unlimited transactions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Unlimited contacts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Unlimited groups</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">AI features</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Priority support</span>
                  </li>
                </ul>
                <Button className="w-full">
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <p className="text-3xl font-bold">$29.99<span className="text-sm font-normal text-slate-600 dark:text-slate-400">/month</span></p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Everything in Pro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Team management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Custom integrations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">API access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Dedicated support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">SLA guarantee</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full">
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium capitalize">{method.brand} ending in {method.last4}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </p>
                  </div>
                  {method.isDefault && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            {paymentMethods.length === 0 && (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p>No payment methods added</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    invoice.status === "paid" 
                      ? "bg-green-100 dark:bg-green-900/20 text-green-600" 
                      : "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600"
                  }`}>
                    {invoice.status === "paid" ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{invoice.id}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(invoice.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p>No invoices yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
