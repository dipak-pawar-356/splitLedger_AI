import { Resend } from "resend";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema/schema";

import nodemailer from "nodemailer";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface EmailSendResult {
  success: boolean;
  provider?: "smtp" | "resend";
  error?: string;
  isSandboxRestriction?: boolean;
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (user && pass) {
    if (process.env.GMAIL_USER || (host && host.includes("gmail"))) {
      return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      });
    }
    return nodemailer.createTransport({
      host: host || "smtp.gmail.com",
      port,
      secure,
      auth: { user, pass },
    });
  }
  return null;
}

export async function sendEmailWithStatus(
  to: string,
  subject: string,
  html: string
): Promise<EmailSendResult> {
  const cleanTo = to.trim();
  const smtp = getSmtpTransporter();

  // 1. If SMTP is configured, use SMTP (delivers to ANY organization/domain)
  if (smtp) {
    try {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "SplitLedger AI <no-reply@splitledger.ai>";
      await smtp.sendMail({
        from,
        to: cleanTo,
        subject,
        html,
      });
      console.log(`[Email] Delivered successfully via SMTP to ${cleanTo}`);
      return { success: true, provider: "smtp" };
    } catch (smtpErr: any) {
      console.error("[Email] SMTP send failed:", smtpErr?.message);
      if (!resend) {
        return { success: false, error: smtpErr?.message || "SMTP delivery failed", provider: "smtp" };
      }
    }
  }

  // 2. Dispatch via Resend
  if (resend) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "SplitLedger AI <onboarding@resend.dev>";
      const result = await resend.emails.send({
        from: fromEmail,
        to: cleanTo,
        subject,
        html,
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
    error: "No email service configured. Please set RESEND_API_KEY or SMTP credentials in .env.",
  };
}

export async function sendEmailNotification(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const res = await sendEmailWithStatus(to, subject, html);
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
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Invited to Join ${groupName}</title>
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
    subject: `You're invited to join ${groupName}`,
    html,
  };
}

export function getExpenseAddedEmailTemplate(
  groupName: string,
  expenseDescription: string,
  amount: string,
  addedBy: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Expense Added to ${groupName}</title>
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
    subject: `New expense added to ${groupName}`,
    html,
  };
}

export function getSettlementReminderEmailTemplate(
  groupName: string,
  amount: string,
  owedTo: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Settlement Reminder for ${groupName}</title>
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
    subject: `Settlement reminder for ${groupName}`,
    html,
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
} {
  const currencySymbol = params.currency === "USD" ? "$" : "₹";
  const formatAmt = (val?: number) =>
    val !== undefined && val !== null ? `${currencySymbol}${val.toFixed(2)}` : null;

  const formattedAmount = params.amount ? formatAmt(params.amount) : "Pending Dues";
  const groupLabel = params.groupName || "Shared Expenses";
  const appLink = params.appUrl || "https://split-ledger-ai.vercel.app";

  const isExtraPaid = params.netPosition && params.netPosition > 0.01;
  const isShortfall = params.netPosition && params.netPosition < -0.01;

  const subject = `🔔 Settlement Reminder: ${formattedAmount} for ${groupLabel}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
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
                      ✨ SplitLedger AI • Settlement Reminder
                    </span>
                    <h1 style="color: #ffffff; margin: 14px 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                      Payment Settlement Notice
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
                  Amount Due
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
                  Open Group &amp; Settle via UPI QR ➔
                </a>
              </div>

              <!-- Payment Instructions -->
              <div style="background-color: #f1f5f9; border-radius: 14px; padding: 16px 20px; margin-top: 20px;">
                <strong style="font-size: 12px; color: #334155; display: block; margin-bottom: 8px;">
                  📲 How to Complete Your Payment:
                </strong>
                <ol style="margin: 0; padding-left: 18px; font-size: 12px; color: #64748b; line-height: 1.6;">
                  <li>Click the button above to view group settlements and scan the instant dynamic NPCI UPI QR code.</li>
                  <li>Scan using any UPI app (Google Pay, PhonePe, Paytm, BHIM) with pre-filled amounts.</li>
                  <li>Or transfer directly to the payee and confirm payment in the app.</li>
                </ol>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6;">
                🔒 Secured with 256-Bit Bank-Grade Encryption • Standard NPCI Dynamic UPI<br>
                Sent via <a href="https://split-ledger-ai.vercel.app" style="color: #3b82f6; text-decoration: none; font-weight: 600;">SplitLedger AI</a> • Smart Group Expense Ledger
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

  return { subject, html };
}

export function getMemberAddedEmailTemplate(
  groupName: string,
  memberName: string,
  addedBy: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Member Joined ${groupName}</title>
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
    subject: `${memberName} joined ${groupName}`,
    html,
  };
}

export function getSettlementCompletedEmailTemplate(
  groupName: string,
  amount: string,
  settledWith: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Settlement Completed in ${groupName}</title>
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
    subject: `Settlement completed in ${groupName}`,
    html,
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
