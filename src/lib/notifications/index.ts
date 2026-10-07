import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    if (!resend) {
      console.warn("RESEND_API_KEY not configured, skipping email");
      return null;
    }
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@splitledger.ai",
      to,
      subject,
      html,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Email send failed:", error);
    return null;
  }
}

export async function sendWhatsApp(phone: string, message: string) {
  // Implement WhatsApp Business API integration
  console.log(`WhatsApp to ${phone}: ${message}`);
  return { success: true };
}

export async function createNotification(userId: number, type: "expense" | "settlement" | "reminder" | "invitation" | "comment", title: string, message: string) {
  const { db } = await import("@/lib/db");
  const { notifications } = await import("@/lib/db/schema/schema");

  await db.insert(notifications).values({
    userId,
    type,
    title,
    message,
    status: "pending",
  });
}
