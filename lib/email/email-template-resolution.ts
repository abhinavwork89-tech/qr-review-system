/**
 * Maps each lifecycle / transactional event to the built-in React Email module.
 * Optional DB row check (table `email_templates`, column `slug` = event trigger) when
 * `EMAIL_TEMPLATE_DB_LOOKUP=true`. If the table/row is missing, built-in templates are used.
 */

import { emailFlowInfo, emailFlowWarn } from "@/lib/email/email-flow-log";

export const EMAIL_EVENT_BUILTIN_TEMPLATE: Record<
  string,
  { modulePath: string; description: string }
> = {
  welcome: {
    modulePath: "emails/templates/WelcomeEmail",
    description: "Welcome after business create",
  },
  review_submitted: {
    modulePath: "emails/templates/ReviewSubmittedEmail",
    description: "Owner notified of new public review",
  },
  business_status: {
    modulePath: "emails/templates/BusinessStatusEmail",
    description: "Business active / inactive change",
  },
  plan_renewed: {
    modulePath: "emails/templates/PlanRenewedEmail",
    description: "Plan upgraded or renewed",
  },
  plan_expired: {
    modulePath: "emails/templates/PlanExpiredEmail",
    description: "Plan downgraded or expired",
  },
};

export type EmailTemplateResolution = {
  eventTrigger: string;
  templateSource: "builtin_default" | "database_row_present";
  builtinModulePath: string;
  dbTemplateId: string | null;
};

const DB_TABLE = "email_templates";

async function tryLoadEmailTemplateRowFromDb(
  eventTrigger: string,
): Promise<{ id: string } | null> {
  if (process.env.EMAIL_TEMPLATE_DB_LOOKUP !== "true") {
    return null;
  }
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from(DB_TABLE)
      .select("id")
      .eq("slug", eventTrigger)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") {
        emailFlowWarn("email_template_db_table_missing", {
          eventTrigger,
          message: "email_templates table not found; using built-in React template.",
        });
        return null;
      }
      emailFlowWarn("email_template_db_lookup_failed", {
        eventTrigger,
        code: error.code,
        message: error.message,
      });
      return null;
    }
    if (
      data &&
      typeof data === "object" &&
      "id" in data &&
      (data as { id: unknown }).id != null
    ) {
      return { id: String((data as { id: unknown }).id) };
    }
    emailFlowInfo("email_template_db_row_missing", {
      eventTrigger,
      message: "No DB row for slug; using built-in React template.",
    });
    return null;
  } catch (e) {
    emailFlowWarn("email_template_db_lookup_exception", {
      eventTrigger,
      message: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

export async function resolveEmailTemplateForEvent(
  eventTrigger: string,
): Promise<EmailTemplateResolution> {
  const builtin = EMAIL_EVENT_BUILTIN_TEMPLATE[eventTrigger];
  const builtinModulePath = builtin?.modulePath ?? "unknown";

  if (!builtin) {
    emailFlowWarn("email_event_unknown_trigger", { eventTrigger, builtinModulePath });
  }

  const dbRow = await tryLoadEmailTemplateRowFromDb(eventTrigger);

  if (dbRow) {
    emailFlowInfo("email_template_resolution", {
      eventTrigger,
      templateSource: "database_row_present",
      builtinModulePath,
      dbTemplateId: dbRow.id,
      note: "Built-in React template is still sent until HTML override from DB is implemented.",
    });
    return {
      eventTrigger,
      templateSource: "database_row_present",
      builtinModulePath,
      dbTemplateId: dbRow.id,
    };
  }

  emailFlowInfo("email_template_resolution", {
    eventTrigger,
    templateSource: "builtin_default",
    builtinModulePath,
    dbTemplateId: null,
  });

  return {
    eventTrigger,
    templateSource: "builtin_default",
    builtinModulePath,
    dbTemplateId: null,
  };
}
