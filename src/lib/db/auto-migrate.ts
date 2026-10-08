import { neon } from "@neondatabase/serverless";

let migrationPromise: Promise<void> | null = null;

export async function ensureDatabaseSchema(): Promise<void> {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      const connStr = process.env.DATABASE_URL;
      if (!connStr) return;
      const sqlClient = neon(connStr);

      // Group Members table extensions
      await sqlClient`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'active' NOT NULL`;
      await sqlClient`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS historical_inclusion_decision TEXT`;
      await sqlClient`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP`;
      await sqlClient`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS delegated_permissions JSONB DEFAULT '{}'::jsonb`;
      await sqlClient`CREATE INDEX IF NOT EXISTS group_member_status_idx ON group_members(membership_status)`;

      // Users table extensions
      await sqlClient`ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id TEXT`;
      await sqlClient`ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id TEXT`;
      await sqlClient`CREATE INDEX IF NOT EXISTS user_public_id_idx ON users(public_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS user_upi_id_idx ON users(upi_id)`;

      // Profiles table extensions
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS upi_id TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMP`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India'`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_code TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_email TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_phone TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN DEFAULT false`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active'`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_email TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_phone TEXT`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_codes JSONB`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_settings JSONB`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_sessions JSONB`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trusted_devices JSONB`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_history JSONB`;
      await sqlClient`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb`;

      // Notifications table extensions
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS public_id TEXT`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'transaction'`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread'`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_id INTEGER`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS transaction_id INTEGER`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id INTEGER`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`;
      await sqlClient`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
      await sqlClient`CREATE INDEX IF NOT EXISTS notification_public_id_idx ON notifications(public_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS notification_priority_idx ON notifications(priority)`;

      // Soft delete & publicId extensions for groups, transactions, settlements, contacts
      await sqlClient`ALTER TABLE groups ADD COLUMN IF NOT EXISTS public_id TEXT`;
      await sqlClient`ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`;
      await sqlClient`ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`;
      await sqlClient`ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_by INTEGER`;

      await sqlClient`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS public_id TEXT`;
      await sqlClient`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`;
      await sqlClient`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`;
      await sqlClient`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_by INTEGER`;
      await sqlClient`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1`;
      await sqlClient`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS parent_transaction_id INTEGER`;

      await sqlClient`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS public_id TEXT`;
      await sqlClient`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`;
      await sqlClient`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`;
      await sqlClient`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS deleted_by INTEGER`;

      await sqlClient`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS public_id TEXT`;
      await sqlClient`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`;
      await sqlClient`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`;
      await sqlClient`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_by INTEGER`;

      // Create Audit Logs if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          public_id TEXT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id INTEGER NOT NULL,
          entity_public_id TEXT,
          changes JSONB,
          before_data JSONB,
          after_data JSONB,
          reason TEXT,
          status TEXT DEFAULT 'success' NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          browser TEXT,
          device TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Transaction Versions if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS transaction_versions (
          id SERIAL PRIMARY KEY,
          public_id TEXT NOT NULL,
          transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
          version_number INTEGER NOT NULL,
          edited_by INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
          reason TEXT,
          changes JSONB NOT NULL,
          snapshot JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Budgets if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS budgets (
          id SERIAL PRIMARY KEY,
          public_id TEXT NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          description TEXT,
          amount BIGINT NOT NULL,
          currency TEXT DEFAULT 'INR' NOT NULL,
          period TEXT DEFAULT 'monthly' NOT NULL,
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          alert_threshold INTEGER DEFAULT 80 NOT NULL,
          status TEXT DEFAULT 'active' NOT NULL,
          notes TEXT,
          is_deleted BOOLEAN DEFAULT false NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Note Categories if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS note_categories (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#6366f1' NOT NULL,
          icon TEXT DEFAULT 'Folder' NOT NULL,
          description TEXT DEFAULT '' NOT NULL,
          is_default BOOLEAN DEFAULT false NOT NULL,
          is_archived BOOLEAN DEFAULT false NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Notes if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS notes (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          category_id INTEGER REFERENCES note_categories(id) ON DELETE SET NULL,
          title TEXT DEFAULT 'Untitled Note' NOT NULL,
          content TEXT DEFAULT '' NOT NULL,
          plain_text TEXT DEFAULT '' NOT NULL,
          rich_text_json JSONB,
          is_draft BOOLEAN DEFAULT false NOT NULL,
          is_pinned BOOLEAN DEFAULT false NOT NULL,
          is_favorite BOOLEAN DEFAULT false NOT NULL,
          is_archived BOOLEAN DEFAULT false NOT NULL,
          is_deleted BOOLEAN DEFAULT false NOT NULL,
          deleted_at TIMESTAMP,
          deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          delete_reason TEXT,
          restored_at TIMESTAMP,
          color TEXT DEFAULT 'default' NOT NULL,
          tags JSONB DEFAULT '[]'::jsonb NOT NULL,
          version INTEGER DEFAULT 1 NOT NULL,
          word_count INTEGER DEFAULT 0 NOT NULL,
          character_count INTEGER DEFAULT 0 NOT NULL,
          reading_time INTEGER DEFAULT 0 NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Note Versions if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS note_versions (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
          version_number INTEGER NOT NULL,
          edited_by INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          summary TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Note Links if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS note_links (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id INTEGER NOT NULL,
          entity_public_id TEXT,
          snapshot JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Note Checklists if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS note_checklists (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          is_completed BOOLEAN DEFAULT false NOT NULL,
          completed_at TIMESTAMP,
          completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          priority TEXT DEFAULT 'medium' NOT NULL,
          due_date TIMESTAMP,
          "order" INTEGER DEFAULT 0 NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Note Reminders if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS note_reminders (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          reminder_date TIMESTAMP NOT NULL,
          repeat TEXT DEFAULT 'none' NOT NULL,
          priority TEXT DEFAULT 'medium' NOT NULL,
          status TEXT DEFAULT 'pending' NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Note Attachments if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS note_attachments (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          file_name TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          url TEXT NOT NULL,
          is_voice_note BOOLEAN DEFAULT false NOT NULL,
          duration_seconds INTEGER,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Note Shares if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS note_shares (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          permission TEXT DEFAULT 'view' NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Note Comments if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS note_comments (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          content TEXT NOT NULL,
          parent_id INTEGER,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Create Note Activity Logs if not exists
      await sqlClient`
        CREATE TABLE IF NOT EXISTS note_activity_logs (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          action TEXT NOT NULL,
          details TEXT,
          changes JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;

      // Reminders table extensions
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS title TEXT`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS recipient_name TEXT`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS recipient_phone TEXT`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS recipient_email TEXT`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMP`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' NOT NULL`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS repeat_type TEXT DEFAULT 'once' NOT NULL`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS repeat_interval INTEGER DEFAULT 1`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS repeat_end TIMESTAMP`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'whatsapp' NOT NULL`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false NOT NULL`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false NOT NULL`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false NOT NULL`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false NOT NULL`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS deleted_by INTEGER`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS created_by INTEGER`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS updated_by INTEGER`;
      await sqlClient`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL`;
      await sqlClient`CREATE INDEX IF NOT EXISTS reminder_group_idx ON reminders(group_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS reminder_tx_idx ON reminders(transaction_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS reminder_contact_idx ON reminders(contact_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS reminder_del_idx ON reminders(is_deleted)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS reminder_priority_idx ON reminders(priority)`;

      // Contact Requests table
      await sqlClient`
        CREATE TABLE IF NOT EXISTS contact_requests (
          id SERIAL PRIMARY KEY,
          ticket_number TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          subject TEXT NOT NULL,
          category TEXT NOT NULL,
          priority TEXT DEFAULT 'Medium' NOT NULL,
          message TEXT NOT NULL,
          attachment_url TEXT,
          status TEXT DEFAULT 'open' NOT NULL,
          assigned_to INTEGER REFERENCES users(id),
          admin_reply TEXT,
          replied_at TIMESTAMP,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      await sqlClient`CREATE INDEX IF NOT EXISTS contact_req_ticket_idx ON contact_requests(ticket_number)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS contact_req_email_idx ON contact_requests(email)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS contact_req_status_idx ON contact_requests(status)`;

      // Settlement Verifications table
      await sqlClient`
        CREATE TABLE IF NOT EXISTS settlement_verifications (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          settlement_id INTEGER REFERENCES settlements(id) ON DELETE CASCADE,
          group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
          sender_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          sender_contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
          receiver_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          receiver_contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
          amount BIGINT NOT NULL,
          currency TEXT DEFAULT 'INR' NOT NULL,
          payment_date TIMESTAMP DEFAULT NOW() NOT NULL,
          payment_method TEXT NOT NULL,
          transaction_reference TEXT,
          reason TEXT NOT NULL,
          notes TEXT,
          verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
          verified_by_name TEXT NOT NULL,
          verified_at TIMESTAMP DEFAULT NOW() NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_verif_public_id_idx ON settlement_verifications(public_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_verif_group_idx ON settlement_verifications(group_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_verif_settlement_idx ON settlement_verifications(settlement_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_verif_verified_by_idx ON settlement_verifications(verified_by)`;

      // Settlement History table
      await sqlClient`
        CREATE TABLE IF NOT EXISTS settlement_history (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          settlement_id INTEGER REFERENCES settlements(id) ON DELETE CASCADE,
          verification_id INTEGER REFERENCES settlement_verifications(id) ON DELETE SET NULL,
          group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
          from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          from_contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
          from_name TEXT NOT NULL,
          to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          to_contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
          to_name TEXT NOT NULL,
          amount BIGINT NOT NULL,
          currency TEXT DEFAULT 'INR' NOT NULL,
          payment_method TEXT NOT NULL,
          transaction_reference TEXT,
          reason TEXT NOT NULL,
          notes TEXT,
          approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
          approved_by_name TEXT NOT NULL,
          approved_date TIMESTAMP DEFAULT NOW() NOT NULL,
          previous_balance BIGINT DEFAULT 0 NOT NULL,
          new_balance BIGINT DEFAULT 0 NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_hist_public_id_idx ON settlement_history(public_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_hist_group_idx ON settlement_history(group_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_hist_approved_by_idx ON settlement_history(approved_by)`;

      // Settlement Reminder Settings table
      await sqlClient`
        CREATE TABLE IF NOT EXISTS settlement_reminder_settings (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL UNIQUE,
          is_enabled BOOLEAN DEFAULT false NOT NULL,
          frequency TEXT DEFAULT 'daily' NOT NULL,
          custom_interval_days INTEGER DEFAULT 1,
          reminder_time TEXT DEFAULT '09:00' NOT NULL,
          timezone TEXT DEFAULT 'Asia/Kolkata' NOT NULL,
          start_date TIMESTAMP,
          end_date TIMESTAMP,
          max_reminder_count INTEGER DEFAULT 5 NOT NULL,
          is_paused BOOLEAN DEFAULT false NOT NULL,
          last_run_at TIMESTAMP,
          next_scheduled_at TIMESTAMP,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_remind_set_public_id_idx ON settlement_reminder_settings(public_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_remind_set_group_idx ON settlement_reminder_settings(group_id)`;

      // Settlement Email Logs table
      await sqlClient`
        CREATE TABLE IF NOT EXISTS settlement_email_logs (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
          recipient_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          recipient_contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
          recipient_name TEXT NOT NULL,
          recipient_email TEXT NOT NULL,
          recipient_type TEXT NOT NULL,
          subject TEXT NOT NULL,
          amount_due BIGINT NOT NULL,
          currency TEXT DEFAULT 'INR' NOT NULL,
          reminder_count INTEGER DEFAULT 1 NOT NULL,
          sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
          status TEXT DEFAULT 'delivered' NOT NULL,
          failure_reason TEXT,
          next_scheduled_at TIMESTAMP,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_email_log_public_id_idx ON settlement_email_logs(public_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_email_log_group_idx ON settlement_email_logs(group_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS settlement_email_log_status_idx ON settlement_email_logs(status)`;

      // Admin Actions table
      await sqlClient`
        CREATE TABLE IF NOT EXISTS admin_actions (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
          admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          admin_name TEXT NOT NULL,
          action_type TEXT NOT NULL,
          target_entity TEXT NOT NULL,
          target_entity_id INTEGER,
          details JSONB,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      await sqlClient`CREATE INDEX IF NOT EXISTS admin_action_public_id_idx ON admin_actions(public_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS admin_action_group_idx ON admin_actions(group_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS admin_action_admin_idx ON admin_actions(admin_id)`;

      // ==========================================
      // GROUP JOIN REQUESTS (QR & APPROVAL FLOW)
      // ==========================================
      await sqlClient`
        CREATE TABLE IF NOT EXISTS group_join_requests (
          id SERIAL PRIMARY KEY,
          public_id TEXT UNIQUE NOT NULL,
          group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          status TEXT DEFAULT 'pending' NOT NULL,
          include_in_historical_expenses BOOLEAN DEFAULT false,
          approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          approved_at TIMESTAMP,
          rejected_at TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      await sqlClient`CREATE INDEX IF NOT EXISTS join_request_group_idx ON group_join_requests(group_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS join_request_user_idx ON group_join_requests(user_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS join_request_status_idx ON group_join_requests(status)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS join_request_public_id_idx ON group_join_requests(public_id)`;

      // ==========================================
      // GROUP MEMBERS (STATUS & DELEGATED PERMISSIONS)
      // ==========================================
      await sqlClient`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'active' NOT NULL`;
      await sqlClient`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS historical_inclusion_decision TEXT`;
      await sqlClient`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP`;
      await sqlClient`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS delegated_permissions JSONB DEFAULT '{}'::jsonb`;
      await sqlClient`CREATE INDEX IF NOT EXISTS group_member_status_idx ON group_members(membership_status)`;

      // ==========================================
      // HIGH-PERFORMANCE COMPOSITE INDEXES
      // ==========================================
      await sqlClient`CREATE INDEX IF NOT EXISTS idx_tx_group_del_created ON transactions(group_id, is_deleted, created_at DESC)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS idx_tx_payer_del ON transactions(paid_by, is_deleted)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS idx_settlements_grp_status ON settlements(group_id, is_deleted, status)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS idx_settlements_payer_rcvr ON settlements(from_user_id, to_user_id, is_deleted)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS idx_grp_members_usr_grp ON group_members(user_id, group_id)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS idx_notif_usr_read_created ON notifications(user_id, is_read, is_deleted, created_at DESC)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS idx_audit_grp_created ON audit_logs(entity_id, created_at DESC)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS idx_audit_usr_created ON audit_logs(user_id, created_at DESC)`;
      await sqlClient`CREATE INDEX IF NOT EXISTS idx_budgets_usr_del ON budgets(user_id, is_deleted)`;
    } catch (err: any) {
      console.warn("Schema auto-migration warning:", err?.message || err);
    }
  })();

  return migrationPromise;
}
