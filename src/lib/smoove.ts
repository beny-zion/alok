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
    const res = await fetch(`${SMOOVE_API_URL}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${SMOOVE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data?.message || `Smoove API error: ${res.status}` };
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

export async function bulkImportContacts(contacts: SmooveContact[]) {
  return smooveRequest("/Contacts_BulkImport", "POST", {
    contactsRequest: contacts.map((c) => ({
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      cellPhone: c.cellPhone,
    })),
    overrideNullableValue: false,
    updateOnlyExistingContacts: false,
  });
}

export async function createCampaign(params: {
  subject: string;
  body: string;
  listIds: number[];
  sendNow?: boolean;
}) {
  return smooveRequest("/Campaigns", "POST", {
    subject: params.subject,
    body: params.body,
    toListsById: params.listIds,
    sendNow: params.sendNow ?? true,
  });
}

export async function getCampaignStats(campaignId: number) {
  return smooveRequest(`/Campaigns/${campaignId}/Statistics`);
}

export async function getLists() {
  return smooveRequest("/Lists");
}
