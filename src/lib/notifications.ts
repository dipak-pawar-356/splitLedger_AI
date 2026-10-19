import { Resend } from "resend";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema/schema";

import nodemailer, { type SendMailOptions } from "nodemailer";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface EmailSendResult {
  success: boolean;
  provider?: "smtp" | "resend";
  error?: string;
  isSandboxRestriction?: boolean;
}

export interface EmailSendOptions {
  bcc?: string | string[];
  cc?: string | string[];
  replyTo?: string;
}

function createSmtpTransporter(port: number, secure: boolean) {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || "dipakpawar3747@gmail.com";
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "vughrqdcthyeviys";

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });
  }
  return null;
}

/**
 * Safely converts an HTML email body into clean, human-readable plain text
 * with all CSS styles, scripts, and HTML tags stripped.
 * Prevents MIME formatting spam penalties and CSS leaks in text/plain alternative.
 */
export function cleanHtmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export async function sendEmailWithStatus(
  to: string,
  subject: string,
  html: string,
  text?: string,
  options?: EmailSendOptions
): Promise<EmailSendResult> {
  const cleanTo = to.trim();
  const authUser = process.env.SMTP_USER || process.env.GMAIL_USER || "dipakpawar3747@gmail.com";
  const from = process.env.SMTP_FROM || `SplitLedger AI <${authUser}>`;
  const replyTo = options?.replyTo || authUser;
  const plainText = text ? text.trim() : cleanHtmlToPlainText(html);

  // App domain and messageId configuration
  const appBase = process.env.NEXT_PUBLIC_APP_URL || "https://split-ledger-ai.vercel.app";
  const hostDomain = authUser.includes("@") ? authUser.split("@")[1] : "gmail.com";
  const generatedMessageId = `<sl-${Date.now()}.${Math.random().toString(36).substring(2, 9)}@${hostDomain}>`;

  // Determine primary and secondary ports
  // Port 587 (STARTTLS) is the cloud serverless standard (Vercel, AWS, GCP)
  const configuredPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
  const primaryPort = configuredPort || 587;
  const primarySecure = primaryPort === 465 || process.env.SMTP_SECURE === "true";
  const secondaryPort = primaryPort === 587 ? 465 : 587;
  const secondarySecure = secondaryPort === 465;

  // RFC 8058 & RFC 3834 Deliverability-optimized email headers
  // Removed X-Mailer (prevents SpamAssassin NON_STANDARD_X_MAILER penalty)
  // Added List-Unsubscribe & Auto-Submitted for Google/Yahoo inbox compliance
  const mailOptions: SendMailOptions = {
    from,
    to: cleanTo,
    replyTo,
    bcc: options?.bcc,
    cc: options?.cc,
    subject,
    html,
    text: plainText,
    messageId: generatedMessageId,
    headers: {
      "Auto-Submitted": "auto-generated",
      "X-Auto-Response-Suppress": "All",
      "List-Unsubscribe": `<mailto:${authUser}?subject=unsubscribe>, <${appBase}/dashboard>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "X-Entity-Ref-ID": `sl_${Date.now()}`,
    },
  };

  // 1. Try Primary SMTP transport
  const primarySmtp = createSmtpTransporter(primaryPort, primarySecure);
  if (primarySmtp) {
    try {
      await primarySmtp.sendMail(mailOptions);
      console.log(`[Email] Delivered successfully via SMTP (port ${primaryPort}) to ${cleanTo}`);
      return { success: true, provider: "smtp" };
    } catch (primaryErr: any) {
      console.warn(`[Email] Primary SMTP (port ${primaryPort}) failed:`, primaryErr?.message);

      // Attempt secondary port fallback before giving up on SMTP
      const secondarySmtp = createSmtpTransporter(secondaryPort, secondarySecure);
      if (secondarySmtp) {
        try {
          console.log(`[Email] Retrying via fallback SMTP (port ${secondaryPort})...`);
          await secondarySmtp.sendMail(mailOptions);
          console.log(`[Email] Delivered successfully via fallback SMTP (port ${secondaryPort}) to ${cleanTo}`);
          return { success: true, provider: "smtp" };
        } catch (secondaryErr: any) {
          console.error(`[Email] Fallback SMTP (port ${secondaryPort}) failed:`, secondaryErr?.message);
        }
      }

      // If both SMTP attempts failed and no Resend available, return detailed error
      if (!resend) {
        return {
          success: false,
          error: `SMTP delivery failed (${primaryErr?.message || "connection error"}). Verify SMTP credentials or port.`,
          provider: "smtp",
        };
      }
    }
  }

  // 2. Dispatch via Resend as backup
  if (resend) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "SplitLedger AI <onboarding@resend.dev>";
      const result = await resend.emails.send({
        from: fromEmail,
        to: cleanTo,
        replyTo,
        bcc: Array.isArray(options?.bcc) ? options?.bcc : options?.bcc ? [options.bcc] : undefined,
        cc: Array.isArray(options?.cc) ? options?.cc : options?.cc ? [options.cc] : undefined,
        subject,
        html,
        text: plainText,
        headers: {
          "Auto-Submitted": "auto-generated",
          "List-Unsubscribe": `<mailto:${authUser}?subject=unsubscribe>, <${appBase}/dashboard>`,
        },
      });

      if (result.error) {
        const errorMsg = result.error.message || JSON.stringify(result.error);
        console.error("[Email] Resend API error:", errorMsg);

        const isSandbox = errorMsg.toLowerCase().includes("only send testing emails to your own email address") ||
                          errorMsg.toLowerCase().includes("verify a domain");

        return {
          success: false,
          error: isSandbox
            ? "Resend test domain (onboarding@resend.dev) is restricted to your registered account email (dipakpawar3747@gmail.com). To send to all organizations and email IDs, add and verify a custom domain at resend.com/domains (set RESEND_FROM_EMAIL in .env) OR configure SMTP_USER & SMTP_PASS (or Gmail App Password) in .env."
            : errorMsg,
          isSandboxRestriction: isSandbox,
          provider: "resend",
        };
      }

      console.log(`[Email] Delivered successfully via Resend to ${cleanTo}`);
      return { success: true, provider: "resend" };
    } catch (resendErr: any) {
      console.error("[Email] Resend exception:", resendErr);
      return { success: false, error: resendErr?.message || "Resend delivery error", provider: "resend" };
    }
  }

  return {
    success: false,
    error: "No email service configured. Please configure SMTP credentials (host, user, pass) or RESEND_API_KEY.",
  };
}

export async function sendEmailNotification(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  const res = await sendEmailWithStatus(to, subject, html, text);
  return res.success;
}

export async function createNotification(data: {
  userId: number;
  type: "expense" | "settlement" | "reminder" | "invitation" | "comment";
  title: string;
  message: string;
  metadata?: any;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      ...data,
      status: "pending",
    })
    .returning();

  return notification;
}

export async function sendWhatsAppNotification(
  phoneNumber: string,
  message: string
) {
  // WhatsApp Business API integration
  // This would use the WhatsApp Business API to send messages
  try {
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.warn("WhatsApp credentials not configured, skipping WhatsApp notification");
      return false;
    }
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "text",
          text: { body: message },
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("WhatsApp notification failed:", error);
    return false;
  }
}

// Email templates for different notification types
export function getInvitationEmailTemplate(
  groupName: string,
  inviterName: string,
  inviteLink: string,
  expiresAt: Date
) {
  const subject = `You're invited to join ${groupName}`;
  const text = `Hi there,\n\n${inviterName} has invited you to join the group "${groupName}" on SplitLedger AI.\n\nJoin Group: ${inviteLink}\nThis invitation expires on: ${expiresAt.toLocaleDateString()}\n\n--\nSplitLedger AI • Track expenses, settle up easily.`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You're Invited! 🎉</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p><strong>${inviterName}</strong> has invited you to join the group <strong>${groupName}</strong> on SplitLedger AI.</p>
          <p>SplitLedger AI makes it easy to track shared expenses and settle up with friends, family, and colleagues.</p>
          <p style="text-align: center;">
            <a href="${inviteLink}" class="button">Join Group</a>
          </p>
          <p><strong>This invitation expires on:</strong> ${expiresAt.toLocaleDateString()}</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>SplitLedger AI - Track expenses, settle up easily.</p>
          <p>You received this email because you were invited to join a group on SplitLedger AI.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return {
    subject,
    html,
    text,
  };
}

export function getExpenseAddedEmailTemplate(
  groupName: string,
  expenseDescription: string,
  amount: string,
  addedBy: string
) {
  const subject = `New expense added to ${groupName}`;
  const text = `Hi there,\n\n${addedBy} added a new expense to "${groupName}".\nDescription: ${expenseDescription}\nAmount: ${amount}\n\nLog in to SplitLedger AI to view the details and settle up.\n\n--\nSplitLedger AI • Track expenses, settle up easily.`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .expense-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Expense Added 💰</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p><strong>${addedBy}</strong> added a new expense to <strong>${groupName}</strong>.</p>
          <div class="expense-box">
            <p><strong>Description:</strong> ${expenseDescription}</p>
            <p><strong>Amount:</strong> ${amount}</p>
          </div>
          <p>Log in to SplitLedger AI to view the details and settle up.</p>
        </div>
        <div class="footer">
          <p>SplitLedger AI - Track expenses, settle up easily.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return {
    subject,
    html,
    text,
  };
}

export function getSettlementReminderEmailTemplate(
  groupName: string,
  amount: string,
  owedTo: string
) {
  const subject = `[SplitLedger] Settlement update for ${groupName}`;
  const text = `Hi there,\n\nYou have a pending settlement in "${groupName}".\nYou owe: ${amount}\nTo: ${owedTo}\n\nPlease settle this amount to keep your group balances up to date.\n\n--\nSplitLedger AI • Track expenses, settle up easily.`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .settlement-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f5576c; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Settlement Reminder ⏰</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>You have a pending settlement in <strong>${groupName}</strong>.</p>
          <div class="settlement-box">
            <p><strong>You owe:</strong> ${amount}</p>
            <p><strong>To:</strong> ${owedTo}</p>
          </div>
          <p>Please settle this amount to keep your group balances up to date.</p>
        </div>
        <div class="footer">
          <p>SplitLedger AI - Track expenses, settle up easily.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return {
    subject,
    html,
    text,
  };
}

export interface RichReminderEmailParams {
  groupName?: string;
  recipientName: string;
  senderName?: string;
  amount?: number;
  currency?: string;
  message: string;
  appUrl?: string;
  totalGroupExpense?: number;
  fairShare?: number;
  paidAmount?: number;
  netPosition?: number;
}

export function getRichSettlementReminderHtml(params: RichReminderEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const currencySymbol = params.currency === "USD" ? "$" : "₹";
  const formatAmt = (val?: number) =>
    val !== undefined && val !== null ? `${currencySymbol}${val.toFixed(2)}` : null;

  const formattedAmount = params.amount ? formatAmt(params.amount) : "Pending Share";
  const groupLabel = params.groupName || "Shared Expenses";
  const appLink = params.appUrl || "https://split-ledger-ai.vercel.app";

  const isExtraPaid = params.netPosition && params.netPosition > 0.01;
  const isShortfall = params.netPosition && params.netPosition < -0.01;

  // Inbox-friendly subject line without raw currency signs or urgent spam triggers
  const subject = `[SplitLedger] ${groupLabel}: Balance update from ${params.senderName || "your group"}`;

  const text = [
    `SPLITLEDGER AI — GROUP EXPENSE UPDATE`,
    `========================================`,
    `Group: ${groupLabel}`,
    `Recipient: ${params.recipientName}`,
    params.senderName ? `Sender: ${params.senderName}` : null,
    ``,
    `Message:`,
    params.message,
    ``,
    params.amount ? `Your Share to Settle: ${formatAmt(params.amount)}` : null,
    params.totalGroupExpense ? `Total Group Spending: ${formatAmt(params.totalGroupExpense)}` : null,
    params.fairShare ? `Per Person Share: ${formatAmt(params.fairShare)}` : null,
    params.netPosition !== undefined ? `Net Balance: ${params.netPosition > 0 ? "+" : ""}${formatAmt(params.netPosition)}` : null,
    ``,
    `View group details and settlements in SplitLedger:`,
    appLink,
    ``,
    `========================================`,
    `This reminder was generated automatically using verified ledger calculations in SplitLedger AI.`,
    `You received this email because you are a member of "${groupLabel}".`,
    `Manage notification preferences in your dashboard: ${appLink}/dashboard`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 32px; text-align: left; border-bottom: 2px solid #3b82f6;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: rgba(59, 130, 246, 0.2); color: #60a5fa; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(96, 165, 250, 0.3);">
                      ✨ SplitLedger AI • Balance Update
                    </span>
                    <h1 style="color: #ffffff; margin: 14px 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                      Group Expense Update
                    </h1>
                    <p style="color: #94a3b8; margin: 0; font-size: 13px;">
                      Group: <strong style="color: #e2e8f0;">${groupLabel}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Financial Context Box (If available) -->
          ${
            params.totalGroupExpense || params.fairShare
              ? `
          <tr>
            <td style="padding: 24px 32px 0 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px;">
                <tr>
                  <td width="33%" align="center" style="border-right: 1px solid #e2e8f0; padding: 6px;">
                    <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">Total Spending</span>
                    <strong style="font-size: 14px; color: #0f172a; font-family: monospace; display: block; margin-top: 4px;">${formatAmt(params.totalGroupExpense) || "—"}</strong>
                  </td>
                  <td width="33%" align="center" style="border-right: 1px solid #e2e8f0; padding: 6px;">
                    <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">Per Person Share</span>
                    <strong style="font-size: 14px; color: #0f172a; font-family: monospace; display: block; margin-top: 4px;">${formatAmt(params.fairShare) || "—"}</strong>
                  </td>
                  <td width="33%" align="center" style="padding: 6px;">
                    <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">
                      ${isExtraPaid ? "Extra Paid" : isShortfall ? "Shortfall" : "Status"}
                    </span>
                    <strong style="font-size: 14px; color: ${isExtraPaid ? "#059669" : "#e11d48"}; font-family: monospace; display: block; margin-top: 4px;">
                      ${isExtraPaid ? `+${formatAmt(params.netPosition)}` : isShortfall ? `-${formatAmt(Math.abs(params.netPosition!))}` : formattedAmount}
                    </strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `
              : ""
          }

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0; line-height: 1.6;">
                Hi <strong>${params.recipientName}</strong>,
              </p>
              
              <!-- Formatted Message Box -->
              <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 16px 16px 0; padding: 20px; margin: 16px 0; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                <div style="font-size: 13px; color: #1e293b; line-height: 1.7; white-space: pre-wrap; font-family: inherit;">
${params.message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
                </div>
              </div>

              <!-- Total Amount Highlight Tile -->
              ${
                params.amount
                  ? `
              <div style="margin: 20px 0; padding: 18px 24px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 16px; border: 1px solid #bbf7d0; text-align: center;">
                <span style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block;">
                  Your Share to Settle
                </span>
                <div style="font-size: 28px; font-weight: 900; color: #15803d; margin-top: 4px; font-family: monospace;">
                  ${formatAmt(params.amount)}
                </div>
              </div>
              `
                  : ""
              }

              <!-- Settlement Action Button -->
              <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="${appLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                  View Settlement in SplitLedger ➔
                </a>
              </div>

              <!-- Payment Instructions -->
              <div style="background-color: #f1f5f9; border-radius: 14px; padding: 16px 20px; margin-top: 20px;">
                <strong style="font-size: 12px; color: #334155; display: block; margin-bottom: 8px;">
                  📲 How to Complete Your Settlement:
                </strong>
                <ol style="margin: 0; padding-left: 18px; font-size: 12px; color: #64748b; line-height: 1.6;">
                  <li>Click the button above to view group settlements and scan the instant UPI QR code.</li>
                  <li>Scan using any preferred UPI app (Google Pay, PhonePe, Paytm, BHIM) with pre-filled amounts.</li>
                  <li>Or transfer directly to the payee and confirm payment in the app.</li>
                </ol>
              </div>
            </td>
          </tr>

          <!-- Footer with anti-spam compliance -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0; line-height: 1.5;">
                This reminder was generated using verified ledger calculations in SplitLedger AI.
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0 0 8px 0; line-height: 1.5;">
                You received this notification as a member of group &ldquo;${groupLabel}&rdquo;.
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                <a href="${appLink}" style="color: #64748b; text-decoration: underline;">Open Group</a> &bull;
                <a href="${appLink}/settings" style="color: #64748b; text-decoration: underline;">Notification Preferences</a> &bull;
                <a href="https://split-ledger-ai.vercel.app" style="color: #64748b; text-decoration: underline;">SplitLedger AI</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html, text };
}

export interface RichReceiverReminderParams {
  receiverName: string;
  payerName: string;
  groupName: string;
  amountPaid: number;
  ownShare: number;
  extraPaid: number;
  pendingAmount: number;
  currency?: string;
  subject?: string;
  appUrl?: string;
  groupLink?: string;
  dashboardLink?: string;
  settlementLink?: string;
  customMessage?: string;
}

/**
 * 5 Deliverability-tested, Inbox-optimized Subject Lines
 * Designed without raw currency signs or aggressive debt collection words to prevent spam filtering.
 */
export const RECEIVER_REMINDER_SUBJECT_OPTIONS = [
  (group: string, payer: string) => `[SplitLedger] ${group}: Balance update with ${payer}`,
  (group: string) => `[SplitLedger] Summary of pending balances for ${group}`,
  (group: string, payer: string) => `${group}: Outstanding receivable from ${payer}`,
  (group: string) => `SplitLedger update: Your ledger balance for ${group}`,
  (group: string) => `Pending settlement update for ${group}`,
];

/**
 * Generates the production-ready Receiver Reminder template.
 * Informs the creditor that another member still owes them money without ever asking them to pay.
 * Optimized for primary inbox deliverability (RFC 8058 compliant, anti-phishing verified).
 */
export function getRichReceiverReminderHtml(params: RichReceiverReminderParams) {
  const currencySymbol = params.currency === "USD" ? "$" : params.currency === "EUR" ? "€" : "₹";
  const formatAmt = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return `${currencySymbol}${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Inbox-safe subject line (avoids spam filters triggered by raw currency symbols and demanding phrases)
  const subject = params.subject || `[SplitLedger] ${params.groupName}: Balance update with ${params.payerName}`;

  const appBase = params.appUrl || "https://split-ledger-ai.vercel.app";
  const groupUrl = params.groupLink || `${appBase}/dashboard/groups`;
  const settlementUrl = params.settlementLink || `${groupUrl}/settlements`;
  const dashboardUrl = params.dashboardLink || `${appBase}/dashboard`;

  const text = `Hi ${params.receiverName},

Thank you for contributing toward the expenses in your group.

Based on the current expense calculations, you have paid more than your own share.

Summary
--------------------------------------------------
Group:                   ${params.groupName}
Your Total Contribution: ${formatAmt(params.amountPaid)}
Your Actual Share:       ${formatAmt(params.ownShare)}
Amount You Paid Extra:   ${formatAmt(params.extraPaid)}
Pending From:            ${params.payerName}
Outstanding Amount:      ${formatAmt(params.pendingAmount)}
Current Status:          Waiting for Payment
--------------------------------------------------

Once ${params.payerName} completes the settlement, your group balances will automatically update.
If needed, you may politely remind ${params.payerName} to complete the payment.

View Settlement: ${settlementUrl}
View Group:      ${groupUrl}
Open Dashboard:  ${dashboardUrl}

--
This reminder was generated automatically using verified ledger calculations inside SplitLedger AI.
You received this notification as a member of "${params.groupName}".
Manage your notification preferences: ${dashboardUrl}/settings`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%); padding: 36px 32px; text-align: left; border-bottom: 2px solid #10b981;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.2); color: #a7f3d0; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(167, 243, 208, 0.3);">
                      ✨ SplitLedger AI • Receivable Notice
                    </span>
                    <h1 style="color: #ffffff; margin: 14px 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                      Outstanding Receivable Update
                    </h1>
                    <p style="color: #d1fae5; margin: 0; font-size: 13px;">
                      Group: <strong style="color: #ffffff;">${params.groupName}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="font-size: 15px; color: #334155; margin: 0 0 12px 0; line-height: 1.6;">
                Hi <strong>${params.receiverName}</strong>,
              </p>
              <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0; line-height: 1.6;">
                Thank you for contributing toward the expenses in your group.
              </p>
              <p style="font-size: 14px; color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
                Based on the current expense calculations, you have paid more than your own share.
              </p>

              <!-- Outstanding Receivable Tile -->
              <div style="margin: 0 0 24px 0; padding: 20px 24px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 16px; border: 1px solid #a7f3d0; text-align: center;">
                <span style="font-size: 11px; color: #065f46; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block;">
                  Awaiting Payment From ${params.payerName}
                </span>
                <div style="font-size: 32px; font-weight: 900; color: #047857; margin-top: 6px; font-family: monospace;">
                  ${formatAmt(params.pendingAmount)}
                </div>
                <span style="display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 700; color: #065f46; background-color: #ffffff; padding: 3px 10px; border-radius: 9999px; border: 1px solid #6ee7b7;">
                  ⏳ Current Status: Waiting for Payment
                </span>
              </div>

              <!-- Transparent Ledger Breakdown Table -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; margin-bottom: 24px; font-size: 13px;">
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f1f5f9;">
                  <td colspan="2" style="padding: 12px 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">
                    📊 Financial Summary
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 12px 16px; color: #64748b; font-weight: 500;">Group</td>
                  <td align="right" style="padding: 12px 16px; color: #0f172a; font-weight: 700;">${params.groupName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 12px 16px; color: #64748b; font-weight: 500;">Your Total Contribution</td>
                  <td align="right" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-family: monospace;">${formatAmt(params.amountPaid)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 12px 16px; color: #64748b; font-weight: 500;">Your Actual Share</td>
                  <td align="right" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-family: monospace;">${formatAmt(params.ownShare)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f0fdf4;">
                  <td style="padding: 12px 16px; color: #065f46; font-weight: 600;">Amount You Paid Extra</td>
                  <td align="right" style="padding: 12px 16px; color: #047857; font-weight: 800; font-family: monospace;">+${formatAmt(params.extraPaid)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 12px 16px; color: #64748b; font-weight: 500;">Pending From</td>
                  <td align="right" style="padding: 12px 16px; color: #0f172a; font-weight: 700;">${params.payerName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 12px 16px; color: #64748b; font-weight: 500;">Outstanding Amount</td>
                  <td align="right" style="padding: 12px 16px; color: #047857; font-weight: 800; font-family: monospace;">${formatAmt(params.pendingAmount)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #64748b; font-weight: 500;">Current Status</td>
                  <td align="right" style="padding: 12px 16px; color: #b45309; font-weight: 700;">Waiting for Payment</td>
                </tr>
              </table>

              <!-- Automatic Update Explanation -->
              <p style="font-size: 13px; color: #475569; margin: 0 0 12px 0; line-height: 1.6;">
                Once <strong>${params.payerName}</strong> completes the settlement, your group balances will automatically update.
              </p>
              <p style="font-size: 13px; color: #475569; margin: 0 0 28px 0; line-height: 1.6;">
                If needed, you may politely remind ${params.payerName} to complete the payment.
              </p>

              <!-- Action Buttons (3 Buttons) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 16px 0;">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${settlementUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 24px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
                      View Settlement ➔
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="48%" align="center">
                          <a href="${groupUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #f1f5f9; color: #334155; text-decoration: none; font-size: 13px; font-weight: 600; padding: 11px 16px; border-radius: 10px; text-align: center; border: 1px solid #cbd5e1;">
                            View Group
                          </a>
                        </td>
                        <td width="4%"></td>
                        <td width="48%" align="center">
                          <a href="${dashboardUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #f1f5f9; color: #334155; text-decoration: none; font-size: 13px; font-weight: 600; padding: 11px 16px; border-radius: 10px; text-align: center; border: 1px solid #cbd5e1;">
                            Open Dashboard
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer with anti-spam compliance -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0; line-height: 1.5;">
                This reminder was generated automatically using verified ledger calculations in SplitLedger AI.
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0 0 8px 0; line-height: 1.5;">
                You received this notification as a member of group &ldquo;${params.groupName}&rdquo;.
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                <a href="${dashboardUrl}" style="color: #64748b; text-decoration: underline;">Dashboard</a> &bull;
                <a href="${dashboardUrl}/settings" style="color: #64748b; text-decoration: underline;">Notification Preferences</a> &bull;
                <a href="${appBase}" style="color: #64748b; text-decoration: underline;">SplitLedger AI</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html, text };
}

export function getReceiverPlainTextMessage(params: RichReceiverReminderParams): string {
  const currencySymbol = params.currency === "USD" ? "$" : params.currency === "EUR" ? "€" : "₹";
  const formatAmt = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return `${currencySymbol}${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const appBase = params.appUrl || "https://split-ledger-ai.vercel.app";
  const groupUrl = params.groupLink || `${appBase}/dashboard/groups`;
  const settlementUrl = params.settlementLink || `${groupUrl}/settlements`;
  const dashboardUrl = params.dashboardLink || `${appBase}/dashboard`;

  return `Hi ${params.receiverName},

Thank you for contributing toward the expenses in your group.

Based on the current expense calculations, you have paid more than your own share.

Summary
--------------------------------------------------
Group:                   ${params.groupName}
Your Total Contribution: ${formatAmt(params.amountPaid)}
Your Actual Share:       ${formatAmt(params.ownShare)}
Amount You Paid Extra:   ${formatAmt(params.extraPaid)}
Pending From:            ${params.payerName}
Outstanding Amount:      ${formatAmt(params.pendingAmount)}
Current Status:          Waiting for Payment
--------------------------------------------------

Once ${params.payerName} completes the settlement, your group balances will automatically update.
If needed, you may politely remind ${params.payerName} to complete the payment.

View Settlement: ${settlementUrl}
View Group:      ${groupUrl}
Open Dashboard:  ${dashboardUrl}

--
This reminder was generated automatically using the latest verified ledger calculations inside SplitLedger AI.`;
}

export function getReceiverSmsMessage(params: RichReceiverReminderParams): string {
  const currencySymbol = params.currency === "USD" ? "$" : params.currency === "EUR" ? "€" : "₹";
  const formatAmt = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return `${currencySymbol}${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  return `Hi ${params.receiverName}, You paid ${formatAmt(params.amountPaid)} while your actual share was ${formatAmt(params.ownShare)}. ${params.payerName} still needs to settle ${formatAmt(params.pendingAmount)} with you. Open SplitLedger AI to track the payment.`;
}

export function getReceiverWhatsAppMessage(params: RichReceiverReminderParams): string {
  const currencySymbol = params.currency === "USD" ? "$" : params.currency === "EUR" ? "€" : "₹";
  const formatAmt = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return `${currencySymbol}${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const appBase = params.appUrl || "https://split-ledger-ai.vercel.app";
  const settlementUrl = params.settlementLink || `${appBase}/dashboard/groups`;

  return `✨ ═══════ 💰 ═══════ ✨
⚡ *SPLITLEDGER AI — RECEIVABLE UPDATE*
━━━━━━━━━━━━━━━━━━━━━━━━━
👋 Hi *${params.receiverName}*,

Thank you for contributing toward the expenses in your group. Based on current expense calculations, you have paid more than your own share.

📊 *LEDGER SUMMARY:*
▫️ *Group:* ${params.groupName}
▫️ *Your Total Contribution:* *${formatAmt(params.amountPaid)}*
▫️ *Your Actual Share:* *${formatAmt(params.ownShare)}*
▫️ *Amount You Paid Extra:* *+${formatAmt(params.extraPaid)}*
━━━━━━━━━━━━━━━━━━━━━━━━━
💳 *PENDING RECEIVABLE:*
▫️ *Pending From:* *${params.payerName}*
▫️ *Outstanding Amount:* *${formatAmt(params.pendingAmount)}*
▫️ *Current Status:* ⏳ *Waiting for Payment*

Once *${params.payerName}* completes the settlement, your group balances will automatically update. If needed, you may politely remind them to complete the payment.

👉 *View Settlement:* ${settlementUrl}

🤝 _Generated automatically using the latest verified ledger calculations inside SplitLedger AI._`;
}

export function getReceiverInAppNotification(params: RichReceiverReminderParams): { title: string; message: string } {
  const currencySymbol = params.currency === "USD" ? "$" : params.currency === "EUR" ? "€" : "₹";
  const formatAmt = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return `${currencySymbol}${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  return {
    title: `Waiting to Receive ${formatAmt(params.pendingAmount)}`,
    message: `${params.payerName} still has a pending settlement with you in ${params.groupName}.`,
  };
}

export function getReceiverPushNotification(params: RichReceiverReminderParams): { title: string; body: string } {
  const currencySymbol = params.currency === "USD" ? "$" : params.currency === "EUR" ? "€" : "₹";
  const formatAmt = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return `${currencySymbol}${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  return {
    title: `Waiting to Receive ${formatAmt(params.pendingAmount)}`,
    body: `${params.payerName} still needs to settle ${formatAmt(params.pendingAmount)} with you in ${params.groupName}. Tap to view.`,
  };
}

export function getMemberAddedEmailTemplate(
  groupName: string,
  memberName: string,
  addedBy: string
) {
  const subject = `${memberName} joined ${groupName}`;
  const text = `Hi there,\n\n${memberName} has joined "${groupName}", invited by ${addedBy}.\nWelcome them to the group!\n\n--\nSplitLedger AI • Track expenses, settle up easily.`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Member! 👋</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p><strong>${memberName}</strong> has joined <strong>${groupName}</strong>, invited by <strong>${addedBy}</strong>.</p>
          <p>Welcome them to the group!</p>
        </div>
        <div class="footer">
          <p>SplitLedger AI - Track expenses, settle up easily.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return {
    subject,
    html,
    text,
  };
}

export function getSettlementCompletedEmailTemplate(
  groupName: string,
  amount: string,
  settledWith: string
) {
  const subject = `Settlement completed in ${groupName}`;
  const text = `Hi there,\n\nA settlement of ${amount} has been completed in "${groupName}" with ${settledWith}.\nYour group balances have been updated.\n\n--\nSplitLedger AI • Track expenses, settle up easily.`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .settlement-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #38ef7d; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Settlement Completed! ✅</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>A settlement has been completed in <strong>${groupName}</strong>.</p>
          <div class="settlement-box">
            <p><strong>Amount settled:</strong> ${amount}</p>
            <p><strong>With:</strong> ${settledWith}</p>
          </div>
          <p>Your group balances have been updated.</p>
        </div>
        <div class="footer">
          <p>SplitLedger AI - Track expenses, settle up easily.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return {
    subject,
    html,
    text,
  };
}

// WhatsApp message templates
export function getInvitationWhatsAppMessage(
  groupName: string,
  inviterName: string,
  inviteLink: string
) {
  return `🎉 *You're invited to join ${groupName}*

${inviterName} has invited you to join the group "${groupName}" on SplitLedger AI.

Click here to join: ${inviteLink}

SplitLedger AI makes it easy to track shared expenses and settle up with friends, family, and colleagues.`;
}

export function getExpenseAddedWhatsAppMessage(
  groupName: string,
  expenseDescription: string,
  amount: string,
  addedBy: string
) {
  return `💰 *New Expense Added*

${addedBy} added a new expense to "${groupName}":

Description: ${expenseDescription}
Amount: ${amount}

Log in to SplitLedger AI to view details.`;
}

export function getSettlementReminderWhatsAppMessage(
  groupName: string,
  amount: string,
  owedTo: string
) {
  return `⏰ *Settlement Reminder*

You have a pending settlement in "${groupName}":

You owe: ${amount}
To: ${owedTo}

Please settle this amount to keep your group balances up to date.`;
}

export function getPaymentReminderWhatsAppMessage(
  groupName: string,
  amount: string,
  owedBy: string
) {
  return `💳 *Payment Reminder*

${owedBy} owes you ${amount} in "${groupName}".

Remind them to settle this amount on SplitLedger AI.`;
}
