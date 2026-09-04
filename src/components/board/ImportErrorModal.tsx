import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Modal } from "./Modal";
import type { ImportIssue } from "@/lib/import-validate";

interface ImportErrorModalProps {
  fileName: string;
  ok: boolean;
  issues: ImportIssue[];
  onClose: () => void;
}

export const ImportErrorModal = ({ fileName, ok, issues, onClose }: ImportErrorModalProps) => {
  const errors = issues.filter((i) => i.severity === "error");
  const fixes = issues.filter((i) => i.severity === "fixed");

  return (
    <Modal
      title={ok ? "Import finished with warnings" : "Import failed"}
      onClose={onClose}
      baseWidth={680}
      footer={
        <button className="btn-primary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2 text-sm">
          {ok ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success-strong" />
          ) : (
            <XCircle size={18} className="mt-0.5 shrink-0 text-destructive" />
          )}
          <p className="text-muted-foreground">
            {ok
              ? "The board was restored, but some entries had to be repaired."
              : "Nothing was changed — the file could not be read."}
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-elevated p-4 font-mono text-xs leading-relaxed">
          <p className="text-muted-foreground">Traceback (most recent problem last):</p>
          {[...fixes, ...errors].map((issue, i) => (
            <div key={i} className="mt-3">
              <p className="text-muted-foreground">
                {"  "}File &quot;{fileName}&quot;, line {issue.line}
                {issue.column ? `, column ${issue.column}` : ""}
              </p>
              {issue.snippet ? (
                <pre className="whitespace-pre-wrap break-words pl-4 text-foreground">
                  {issue.snippet.trim().slice(0, 200)}
                </pre>
              ) : null}
              <p
                className={
                  issue.severity === "error"
                    ? "font-bold text-destructive"
                    : "font-bold text-warning-strong"
                }
              >
                {issue.message}
              </p>
            </div>
          ))}
        </div>

        {fixes.length ? (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning-strong" />
            {fixes.length} entr{fixes.length === 1 ? "y was" : "ies were"} repaired automatically
            (duplicate tags merged, unknown values reset).
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
