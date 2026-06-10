import type { ReactNode } from "react";
import { Trash2, X } from "lucide-react";

type DeleteConfirmModalProps = {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmModal({
  title,
  description,
  confirmLabel = "Xoa",
  cancelLabel = "Huy",
  busy = false,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={busy ? undefined : onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 size={19} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>{title}</h2>
            <div style={{ fontSize: "13.5px", color: "#6B7280", marginTop: "6px", lineHeight: 1.55 }}>
              {description}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            style={{ fontSize: "13.5px" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-5 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-60"
            style={{ fontSize: "13.5px" }}
          >
            {busy ? "Dang xoa..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
