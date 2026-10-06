"use server";

import { db, withDbRetry } from "@/lib/db";
import { contactRequests, users } from "@/lib/db/schema/schema";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { headers } from "next/headers";
import { ValidationError, DatabaseError, NotFoundError } from "@/lib/errors";
import { sendEmailNotification } from "@/lib/notifications";

const SUPPORT_EMAIL = "dipakpawar3747@gmail.com";
const SUPPORT_PHONE = "+91 8669233747";

export interface SubmitContactInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  category: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  message: string;
  attachmentUrl?: string;
}

export interface GetContactRequestsFilters {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Validates, records in database, dispatches notification email to support,
 * and sends confirmation email to customer.
 */
export async function submitContactRequest(data: SubmitContactInput) {
  try {
    // 1. Validation
    if (!data.name || data.name.trim().length < 2) {
      throw new ValidationError("Please provide a valid name (at least 2 characters).");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email.trim())) {
      throw new ValidationError("Please provide a valid email address.");
    }

    if (data.phone && data.phone.trim()) {
      const cleanPhone = data.phone.replace(/[\s\-\(\)]/g, "");
      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        throw new ValidationError("Please provide a valid phone number (7-15 digits).");
      }
    }

    if (!data.subject || data.subject.trim().length < 3) {
      throw new ValidationError("Subject is required (at least 3 characters).");
    }

    if (!data.message || data.message.trim().length < 10) {
      throw new ValidationError("Message is required (at least 10 characters).");
    }

    // 2. Generate unique Ticket ID: SL-XXXXXX
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const ticketNumber = `SL-${randomDigits}`;

    // 3. Extract request metadata safely
    let ipAddress = "unknown";
    let userAgent = "unknown";
    try {
      const reqHeaders = await headers();
      ipAddress =
        reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        reqHeaders.get("x-real-ip") ||
        "127.0.0.1";
      userAgent = reqHeaders.get("user-agent") || "unknown";
    } catch (_) {}

    // 4. Save to database
    const [requestRecord] = await withDbRetry(async () =>
      db
        .insert(contactRequests)
        .values({
          ticketNumber,
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: data.phone?.trim() || null,
          subject: data.subject.trim(),
          category: data.category || "General",
          priority: data.priority || "Medium",
          message: data.message.trim(),
          attachmentUrl: data.attachmentUrl || null,
          status: "open",
          ipAddress,
          userAgent,
        })
        .returning()
    );

    const timestampStr = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    // 5. Email 1: Send full details to official support (dipakpawar3747@gmail.com)
    const supportSubject = `[Ticket #${ticketNumber}] [${data.priority || "Medium"}] ${data.subject.trim()}`;
    const supportHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 22px;">New Support Enquiry Received</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">SplitLedger AI Customer Support Pipeline</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; font-weight: bold; width: 30%; border: 1px solid #e2e8f0;">Ticket Number:</td>
            <td style="padding: 10px; font-family: monospace; font-size: 14px; font-weight: bold; color: #2563eb; border: 1px solid #e2e8f0;">#${ticketNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Customer Name:</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${data.name.trim()}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Email:</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="mailto:${data.email.trim()}" style="color: #2563eb;">${data.email.trim()}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Phone / Mobile:</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${data.phone?.trim() || "Not provided"}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Category:</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${data.category || "General"}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Priority:</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="background-color: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">${data.priority || "Medium"}</span></td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Submitted At:</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${timestampStr}</td>
          </tr>
        </table>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #0f172a; font-size: 14px; margin-bottom: 8px;">Customer Message:</h3>
          <div style="background-color: #f1f5f9; border-radius: 10px; padding: 16px; border: 1px solid #cbd5e1; font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${data.message.trim()}</div>
        </div>

        ${
          data.attachmentUrl
            ? `<p style="font-size: 13px;"><strong>Attachment:</strong> <a href="${data.attachmentUrl}" target="_blank" style="color: #2563eb;">View Uploaded File</a></p>`
            : ""
        }

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
          IP: ${ipAddress} | User Agent: ${userAgent}
        </div>
      </div>
    `;

    // Attempt support email
    try {
      await sendEmailNotification(SUPPORT_EMAIL, supportSubject, supportHtml);
    } catch (mailErr) {
      console.error("Non-fatal: Failed to send email to support address:", mailErr);
    }

    // 6. Email 2: Auto-reply confirmation to customer
    const customerSubject = `We've received your request - Ticket #${ticketNumber}`;
    const customerHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="margin-bottom: 24px;">
          <span style="background-color: #eff6ff; color: #2563eb; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; border: 1px solid #dbeafe;">SplitLedger AI Support</span>
        </div>
        <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">We've received your request, ${data.name.trim()}</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Thank you for reaching out to SplitLedger AI Support. We have logged your request under ticket reference:
        </p>

        <div style="margin: 20px 0; padding: 18px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
          <span style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Ticket Reference Number</span>
          <div style="font-size: 26px; font-weight: 900; color: #2563eb; margin-top: 4px; font-family: monospace;">#${ticketNumber}</div>
        </div>

        <div style="background-color: #f0fdf4; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
          <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">
            ✓ Expected Response Time: Within 24–48 Hours
          </p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #15803d;">
            Our support engineers are actively reviewing your inquiry.
          </p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px; font-size: 12px; color: #64748b; line-height: 1.6;">
          <p style="margin: 0 0 4px 0;"><strong>Official Support Contacts:</strong></p>
          <p style="margin: 0 0 4px 0;">Email: <a href="mailto:${SUPPORT_EMAIL}" style="color: #2563eb;">${SUPPORT_EMAIL}</a></p>
          <p style="margin: 0 0 4px 0;">Phone: <a href="tel:8669233747" style="color: #2563eb;">${SUPPORT_PHONE}</a></p>
          <p style="margin: 0;">Business Hours: Monday – Saturday, 10:00 AM – 7:00 PM IST</p>
        </div>
      </div>
    `;

    try {
      await sendEmailNotification(data.email.trim(), customerSubject, customerHtml);
    } catch (custMailErr) {
      console.error("Non-fatal: Failed to send auto-reply to customer:", custMailErr);
    }

    return {
      success: true,
      ticketNumber,
      requestId: requestRecord.id,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    console.error("[submitContactRequest Error]:", error);
    const detailMsg = error instanceof Error ? error.message : "Internal database error";
    throw new DatabaseError(`Failed to submit contact request: ${detailMsg}`, { originalError: error });
  }
}

/**
 * Retrieve contact requests (Admin utility).
 */
export async function getContactRequests(filters: GetContactRequestsFilters = {}) {
  try {
    return await withDbRetry(async () => {
      const conditions = [] as any[];

      if (filters.status) {
        conditions.push(eq(contactRequests.status, filters.status));
      }
      if (filters.category) {
        conditions.push(eq(contactRequests.category, filters.category));
      }
      if (filters.priority) {
        conditions.push(eq(contactRequests.priority, filters.priority));
      }
      if (filters.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            ilike(contactRequests.ticketNumber, term),
            ilike(contactRequests.name, term),
            ilike(contactRequests.email, term),
            ilike(contactRequests.subject, term)
          )
        );
      }

      const list = await db
        .select()
        .from(contactRequests)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(contactRequests.createdAt))
        .limit(filters.limit || 50)
        .offset(filters.offset || 0);

      return list;
    });
  } catch (error) {
    console.error("[getContactRequests Error]:", error);
    throw new DatabaseError("Failed to fetch contact requests", { originalError: error });
  }
}
