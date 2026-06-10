import { AlertTriangle, Loader2 } from "lucide-react";

type Props = {
  loading?: boolean;
  error?: string;
  message?: string;
};

export function AiDataBanner({ loading = false, error = "" }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <Loader2 size={16} className="animate-spin" />
        Đang đọc dữ liệu từ CSDL và chạy phân tích dự đoán...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Không tải được dữ liệu AI từ CSDL.</p>
          <p className="mt-0.5 text-xs text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return null;
}
