import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, profiles, transactions, groups, contacts, settlements } from "@/lib/db/schema/schema";
import { eq, desc, sql, count, gte, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Activity, DollarSign, Settings, Shield, Database, AlertTriangle, TrendingUp, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireAuth();

  // Check if user is admin (in production, this would be a proper role check)
  // For now, we'll use a simple check based on email or add an isAdmin field to users table
  const isAdmin = user.email?.includes("admin") || false;

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-slate-600 dark:text-slate-400">
              You don&apos;t have permission to access the admin panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [userStats, transactionStats, groupStats, recentUsers, recentTransactions] = await Promise.all([
    // User statistics
    db
      .select({
        totalUsers: count(),
      })
      .from(users),
    // Transaction statistics
    db
      .select({
        totalTransactions: count(),
        totalVolume: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions),
    // Group statistics
    db
      .select({
        totalGroups: count(),
      })
      .from(groups),
    // Recent users
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5),
    // Recent transactions
    db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        currency: transactions.currency,
        description: transactions.description,
        date: transactions.date,
        createdAt: transactions.createdAt,
        userName: users.name,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(5),
  ]);

  const usersData = userStats[0];
  const transactionsData = transactionStats[0];
  const groupsData = groupStats[0];

  // Calculate active users (last 30 days)
  const activeUsers = recentUsers.filter(
    (u) => u.createdAt >= thirtyDaysAgo
  ).length;

  // Calculate this month transactions
  const thisMonthTransactions = recentTransactions.filter(
    (t) => t.createdAt >= startOfMonth
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">
            System overview and management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            System Settings
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersData.totalUsers}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {activeUsers} active this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Transactions
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactionsData.totalTransactions}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {thisMonthTransactions} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Volume
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(transactionsData.totalVolume / 100, "INR")}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Groups
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupsData.totalGroups}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Active groups
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Users className="h-6 w-6" />
              <span>Manage Users</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Database className="h-6 w-6" />
              <span>Database</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Shield className="h-6 w-6" />
              <span>Security</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Settings className="h-6 w-6" />
              <span>Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.name || "Unknown"}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="text-center text-slate-600 dark:text-slate-400 py-4">No users yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 flex items-center justify-center">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transaction.description || "Transaction"}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{transaction.userName || "Unknown"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {formatCurrency(transaction.amount / 100, transaction.currency)}
                    </p>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {formatDate(transaction.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <p className="text-center text-slate-600 dark:text-slate-400 py-4">No transactions yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Manage user accounts, roles, and permissions
            </p>
            <Button variant="outline" className="w-full">
              Manage Users
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports & Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              View system reports and activity logs
            </p>
            <Button variant="outline" className="w-full">
              View Reports
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Configure system-wide settings and preferences
            </p>
            <Button variant="outline" className="w-full">
              Configure Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
