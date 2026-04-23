// Read env lazily inside calls — module-level reads happen before tsx/Next.js
// have a chance to inject .env values, which strands both vars as undefined.
const getApiUrl = () => process.env.SMOOVE_API_URL || "https://rest.smoove.io/v1";
const getApiKey = () => process.env.SMOOVE_API_KEY || "";

interface SmooveContact {
  email: string;
  firstName?: string;
  lastName?: string;
  cellPhone?: string;
  [key: string]: unknown;
}

interface SmooveResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  limitExceeded?: boolean;
}

// Detect "contact limit exceeded" for free-tier (100 contacts)
function isLimitError(msg: string): boolean {
  const s = msg.toLowerCase();
  return (
    s.includes("limit") ||
    s.includes("quota") ||
    s.includes("exceeded") ||
    s.includes("תקרה") ||
    s.includes("מגבל") ||
    s.includes("maximum")
  );
}

async function smooveRequest(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown
): Promise<SmooveResponse> {
  try {
    console.log(`[Smoove] ${method} ${endpoint}`, body ? JSON.stringify(body).slice(0, 500) : "");
    const res = await fetch(`${getApiUrl()}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Some Smoove endpoints return empty body (e.g. BulkImport)
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // Non-JSON response — treat raw text as data
        data = text;
      }
    }

    if (!res.ok) {
      console.error(`[Smoove] ${method} ${endpoint} → ${res.status}`, JSON.stringify(data));
      const errMsg =
        (data && typeof data === "object" && "message" in data
          ? (data as { message: string }).message
          : null) ||
        (typeof data === "string" ? data : null) ||
        `Smoove API error: ${res.status}`;
      return {
        success: false,
        error: errMsg,
        limitExceeded: res.status === 402 || res.status === 403 || isLimitError(errMsg),
      };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: `Smoove request failed: ${error}` };
  }
}

export async function createOrUpdateContact(contact: SmooveContact): Promise<SmooveResponse> {
  if (!contact.email) return { success: false, error: "no email — skipped" };
  return smooveRequest("/Contacts", "POST", {
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    cellPhone: contact.cellPhone,
    updateIfExists: true,
    restoreIfDeleted: true,
  });
}

// Updates an existing Smoove contact by its Smoove-side ID.
// Prefer this over createOrUpdateContact when the email itself is changing —
// POST /Contacts upserts by email, so a changed email creates a new contact
// and orphans the old one. PUT /Contacts/{id} keeps the same contact record.
export async function updateContactById(
  contactId: number,
  updates: Partial<SmooveContact>
): Promise<SmooveResponse> {
  const body: Record<string, unknown> = {};
  if (updates.email !== undefined) body.email = updates.email;
  if (updates.firstName !== undefined) body.firstName = updates.firstName;
  if (updates.lastName !== undefined) body.lastName = updates.lastName;
  if (updates.cellPhone !== undefined) body.cellPhone = updates.cellPhone;
  return smooveRequest(`/Contacts/${contactId}`, "PUT", body);
}

export async function bulkImportContacts(
  contacts: SmooveContact[],
  listId?: number
): Promise<SmooveResponse> {
  const withEmail = contacts.filter((c) => c.email);
  if (withEmail.length === 0) return { success: true, data: { skipped: contacts.length } };
  return smooveRequest("/Contacts_BulkImport", "POST", {
    contacts: withEmail.map((c) => ({
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      cellPhone: c.cellPhone,
    })),
    ...(listId != null && { lists_ToSubscribe: [listId] }),
  });
}

export async function createCampaign(params: {
  subject: string;
  body: string;
  listIds?: number[];
  recipientEmails?: string[];
  sendNow?: boolean;
}) {
  const sendNow = params.sendNow ?? true;
  const endpoint = sendNow ? "/Campaigns?sendNow=true" : "/Campaigns";

  const body: Record<string, unknown> = {
    subject: params.subject,
    body: params.body,
  };

  // Prefer sending to specific emails over entire list
  if (params.recipientEmails?.length) {
    body.toMembersByEmail = params.recipientEmails;
  } else if (params.listIds?.length) {
    body.toListsById = params.listIds;
  }

  return smooveRequest(endpoint, "POST", body);
}

export async function getCampaignStats(campaignId: number) {
  return smooveRequest(`/Campaigns/${campaignId}/Statistics`);
}

export async function unsubscribeContact(contactId: number) {
  return smooveRequest(`/Contacts/${contactId}/Unsubscribe`, "POST");
}

export async function getLists() {
  return smooveRequest("/Lists");
}
