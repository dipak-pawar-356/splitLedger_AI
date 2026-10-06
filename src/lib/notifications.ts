import { Resend } from "resend";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema/schema";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmailNotification(
  to: string,
  subject: string,
  html: string
) {
  try {
    if (!resend) {
      console.warn("RESEND_API_KEY not configured, skipping email notification");
      return false;
    }
    const fromEmail = process.env.RESEND_FROM_EMAIL || "SplitLedger AI <onboarding@resend.dev>";
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
    if (result.error) {
      console.error("Resend API error sending email:", result.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email notification failed:", error);
    return false;
  }
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
