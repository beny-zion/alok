const SMOOVE_API_URL = process.env.SMOOVE_API_URL || "https://rest.smoove.io/v1";
const SMOOVE_API_KEY = process.env.SMOOVE_API_KEY!;

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
}

async function smooveRequest(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown
): Promise<SmooveResponse> {
  try {
    console.log(`[Smoove] ${method} ${endpoint}`, body ? JSON.stringify(body).slice(0, 500) : "");
    const res = await fetch(`${SMOOVE_API_URL}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${SMOOVE_API_KEY}`,
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
      return { success: false, error: errMsg };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: `Smoove request failed: ${error}` };
  }
}

export async function createOrUpdateContact(contact: SmooveContact) {
  return smooveRequest("/Contacts", "POST", {
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    cellPhone: contact.cellPhone,
    updateIfExists: true,
    restoreIfDeleted: true,
  });
}

export async function bulkImportContacts(
  contacts: SmooveContact[],
  listId?: number
) {
  return smooveRequest("/Contacts_BulkImport", "POST", {
    contacts: contacts.map((c) => ({
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
