"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TipTapEditor } from "@/components/campaigns/tiptap-editor";
import { createCampaign } from "@/lib/api";
import { toast } from "sonner";

function ComposeForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const candidateIds = searchParams.get("ids")?.split(",").filter(Boolean) || [];

  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("יש להזין נושא למייל");
      return;
    }
    if (!htmlContent.trim() || htmlContent === "<p></p>") {
      toast.error("יש להזין תוכן למייל");
      return;
    }
    if (candidateIds.length === 0) {
      toast.error("לא נבחרו מועמדים. חזור לדף המועמדים ובחר מועמדים.");
      return;
    }

    setSending(true);
    try {
      const res = await createCampaign({ subject, htmlContent, candidateIds });
      if (res.success) {
        toast.success(`הקמפיין נשלח בהצלחה ל-${candidateIds.length} מועמדים!`);
        router.push("/campaigns");
      } else {
        toast.error(res.error || "שגיאה בשליחת הקמפיין");
      }
    } catch {
      toast.error("שגיאה בשליחת הקמפיין");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B1464]">קמפיין חדש</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {candidateIds.length > 0
            ? `שליחה ל-${candidateIds.length} מועמדים נבחרים`
            : "בחר מועמדים מדף המועמדים לפני שליחה"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי הקמפיין</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">נושא המייל</Label>
            <Input
              id="subject"
              placeholder="לדוגמה: הזדמנות תעסוקה חדשה מ-AL"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>תוכן המייל</Label>
            <TipTapEditor content={htmlContent} onChange={setHtmlContent} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSend}
              disabled={sending || candidateIds.length === 0}
              className="bg-[#F7941D] hover:bg-[#e0850f] text-white"
            >
              {sending ? "שולח..." : `שלח קמפיין ל-${candidateIds.length} מועמדים`}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              ביטול
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div>טוען...</div>}>
      <ComposeForm />
    </Suspense>
  );
}
