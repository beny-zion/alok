"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TipTapEditor } from "@/components/campaigns/tiptap-editor";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { SmooveUsageBanner } from "@/components/smoove-usage-banner";
import { createCampaign } from "@/lib/api";
import { wrapInBrandedTemplate } from "@/lib/email-template";
import { toast } from "sonner";

const STEPS = [
  { number: 1, title: "בחירת נמענים" },
  { number: 2, title: "עריכת מייל" },
  { number: 3, title: "תצוגה מקדימה ושליחה" },
];

function ComposeWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialIds =
    searchParams.get("ids")?.split(",").filter(Boolean) || [];

  const [step, setStep] = useState(initialIds.length > 0 ? 2 : 1);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [sending, setSending] = useState(false);

  // Prevent CandidateTable initial mount from clearing URL-based IDs
  const skipInitialReset = useRef(initialIds.length > 0);

  const canGoToStep2 = selectedIds.length > 0;
  const canGoToStep3 =
    subject.trim() !== "" &&
    htmlContent.trim() !== "" &&
    htmlContent !== "<p></p>";

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      if (skipInitialReset.current && ids.length === 0) {
        skipInitialReset.current = false;
        return;
      }
      skipInitialReset.current = false;
      setSelectedIds(ids);
    },
    []
  );

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await createCampaign({
        subject,
        htmlContent,
        candidateIds: selectedIds,
      });
      if (res.success) {
        toast.success(
          `הקמפיין נשלח בהצלחה ל-${selectedIds.length} מועמדים!`
        );
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

  // Auto-resize iframe to fit content
  const handleIframeLoad = useCallback(
    (e: React.SyntheticEvent<HTMLIFrameElement>) => {
      const iframe = e.currentTarget;
      if (iframe.contentDocument) {
        const height = iframe.contentDocument.documentElement.scrollHeight;
        iframe.style.height = `${height + 32}px`;
      }
    },
    []
  );

  const previewHtml = wrapInBrandedTemplate(htmlContent, {
    logoUrl: "https://alok.co.il/wp-content/uploads/2026/01/לוגו-AL-גיוס-עובדים-והשמה-2.png",
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1B1464]">קמפיין חדש</h1>
        <p className="text-sm text-muted-foreground mt-1">
          צור ושלח מייל ממותג למועמדים נבחרים
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center py-2">
        {STEPS.map((s, i) => {
          const isActive = step === s.number;
          const isCompleted = step > s.number;
          const isClickable =
            s.number === 1 ||
            (s.number === 2 && canGoToStep2) ||
            (s.number === 3 && canGoToStep2 && canGoToStep3);

          return (
            <div key={s.number} className="flex items-center">
              <button
                type="button"
                onClick={() => isClickable && setStep(s.number)}
                disabled={!isClickable}
                className={`
                  flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-medium
                  transition-all duration-200
                  ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}
                  ${
                    isActive
                      ? "bg-[#F7941D] text-white shadow-md"
                      : isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-400"
                  }
                `}
                style={
                  isActive
                    ? { boxShadow: "0 4px 14px rgba(247, 148, 29, 0.3)" }
                    : undefined
                }
              >
                <span
                  className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                    ${
                      isActive
                        ? "bg-white/25 text-white"
                        : isCompleted
                          ? "bg-emerald-200 text-emerald-700"
                          : "bg-gray-200 text-gray-400"
                    }
                  `}
                >
                  {isCompleted ? "\u2713" : s.number}
                </span>
                {s.title}
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-2 ${
                    isCompleted ? "bg-emerald-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ===== Step 1: Select Recipients ===== */}
      {step === 1 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1B1464]">
                  בחירת נמענים
                </h2>
                <p className="text-sm text-muted-foreground">
                  סנן ובחר את המועמדים שיקבלו את המייל
                </p>
              </div>
              {selectedIds.length > 0 && (
                <Badge className="bg-[#F7941D] hover:bg-[#F7941D] text-white text-sm px-3 py-1.5">
                  {selectedIds.length} נבחרו
                </Badge>
              )}
            </div>
            <div className="mb-4 space-y-3">
              <SmooveUsageBanner />
              <p className="text-xs text-gray-500">
                מוצגים רק מועמדים שסונכרנו ל-Smoove. מועמדים ללא מייל או שסנכרון נכשל לא מופיעים.
              </p>
            </div>
            <CandidateTable
              onSelectionChange={handleSelectionChange}
              lockedFilters={{ smooveStatus: "synced" }}
            />
          </CardContent>
        </Card>
      )}

      {/* ===== Step 2: Compose Email ===== */}
      {step === 2 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1B1464]">
                  עריכת המייל
                </h2>
                <p className="text-sm text-muted-foreground">
                  כתוב את נושא ותוכן המייל. השתמש ב&quot;שם נמען&quot;
                  להתאמה אישית.
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-sm px-3 py-1.5 border-[#1B1464]/20"
              >
                {selectedIds.length} נמענים
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                נושא המייל
              </Label>
              <Input
                id="subject"
                placeholder="לדוגמה: הזדמנות תעסוקה חדשה מ-AL"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-base h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">תוכן המייל</Label>
              <TipTapEditor content={htmlContent} onChange={setHtmlContent} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Step 3: Preview & Send ===== */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary Bar */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="bg-[#1B1464] px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50 mb-1">נושא המייל</p>
                  <p className="text-white font-medium">{subject}</p>
                </div>
                <Badge className="bg-[#F7941D] hover:bg-[#F7941D] text-white text-sm px-4 py-1.5">
                  {selectedIds.length} נמענים
                </Badge>
              </div>
            </div>
          </Card>

          {/* Email Preview */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-[#1B1464] mb-1">
                תצוגה מקדימה
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                כך ייראה המייל אצל הנמענים
              </p>
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={previewHtml}
                  onLoad={handleIframeLoad}
                  className="w-full border-0"
                  style={{ minHeight: "500px" }}
                  title="תצוגה מקדימה של המייל"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== Bottom Navigation ===== */}
      <div className="flex items-center justify-between pb-8">
        <div>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
            >
              הקודם
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && step < 3 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} מועמדים נבחרו
            </span>
          )}

          {step === 1 && (
            <Button
              onClick={() => setStep(2)}
              disabled={!canGoToStep2}
              className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white px-6"
            >
              המשך לעריכת מייל
            </Button>
          )}

          {step === 2 && (
            <Button
              onClick={() => setStep(3)}
              disabled={!canGoToStep3}
              className="bg-[#1B1464] hover:bg-[#0D0B3E] text-white px-6"
            >
              תצוגה מקדימה
            </Button>
          )}

          {step === 3 && (
            <Button
              onClick={handleSend}
              disabled={sending}
              size="lg"
              className="bg-[#F7941D] hover:bg-[#e0850f] text-white px-8 text-base"
            >
              {sending
                ? "שולח..."
                : `שלח קמפיין ל-${selectedIds.length} מועמדים`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
          טוען...
        </div>
      }
    >
      <ComposeWizard />
    </Suspense>
  );
}
