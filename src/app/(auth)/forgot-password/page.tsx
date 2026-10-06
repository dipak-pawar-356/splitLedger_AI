import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
  const user = await currentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Enter your email to receive a reset link
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            Password reset is handled through Clerk. Please use the sign-in page to reset your password.
          </p>
        </div>
      </div>
    </div>
  );
}
