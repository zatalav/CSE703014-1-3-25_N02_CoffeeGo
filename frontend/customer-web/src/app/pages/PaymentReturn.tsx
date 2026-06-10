import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { apiRequest } from "../api";
import { clearPendingVnpayOrder, readPendingVnpayOrder } from "../paymentFlow";
import { useApp } from "../store";

type VnpayVerificationResponse = {
  validSignature: boolean;
  paid: boolean;
  responseCode?: string;
  transactionStatus?: string;
  transactionRef?: string;
  amount?: number;
  message?: string;
};

type CustomerOrderResponse = {
  id?: string;
  orderId?: number;
  orderNumber?: string;
};

type PaymentReturnState = {
  status: "checking" | "success" | "failed";
  message: string;
  orderNumber?: string;
};

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const queryParams = useMemo(() => Object.fromEntries(new URLSearchParams(queryString).entries()), [queryString]);
  const { clearCart } = useApp();
  const processedRef = useRef(false);
  const [state, setState] = useState<PaymentReturnState>({
    status: "checking",
    message: "Dang xac nhan ket qua thanh toan VNPAY...",
  });

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    let cancelled = false;
    const token = localStorage.getItem("customerAccessToken") || undefined;

    async function finalizePayment() {
      const pending = readPendingVnpayOrder();
      if (!pending) {
        throw new Error("Khong tim thay thong tin don hang dang thanh toan.");
      }
      if (!queryParams.vnp_SecureHash) {
        throw new Error("VNPAY khong tra ve chu ky xac thuc.");
      }
      if (queryParams.vnp_TxnRef && queryParams.vnp_TxnRef !== pending.transactionRef) {
        throw new Error("Ma giao dich VNPAY khong khop voi don hang dang thanh toan.");
      }

      const verification = await apiRequest<VnpayVerificationResponse>("/api/payments/sandbox/vnpay/verify", {
        method: "POST",
        body: JSON.stringify(queryParams),
      }, token);

      if (!verification.validSignature) {
        throw new Error("Ket qua thanh toan VNPAY khong hop le.");
      }
      if (!verification.paid) {
        clearPendingVnpayOrder();
        throw new Error("Thanh toan VNPAY khong thanh cong. Don hang chua duoc tao.");
      }
      if (verification.amount != null && verification.amount !== pending.amount) {
        throw new Error("So tien thanh toan khong khop voi don hang.");
      }

      const order = await apiRequest<CustomerOrderResponse>("/api/orders/customer", {
        method: "POST",
        body: JSON.stringify(pending.orderPayload),
      }, token);

      if (cancelled) return;
      clearPendingVnpayOrder();
      clearCart();
      const orderNumber = order.orderNumber || order.id || String(order.orderId || "");
      setState({
        status: "success",
        orderNumber,
        message: "Thanh toan thanh cong. Don hang da duoc tao.",
      });
    }

    finalizePayment().catch((error) => {
      if (cancelled) return;
      setState({
        status: "failed",
        message: error instanceof Error ? error.message : "Thanh toan that bai. Don hang chua duoc tao.",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const success = state.status === "success";
  const checking = state.status === "checking";
  const Icon = checking ? Loader2 : success ? CheckCircle2 : XCircle;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-lg w-full text-center p-10 rounded-3xl" style={{ background: "white", border: "1px solid var(--border-line)", boxShadow: "0 12px 40px rgba(92,51,23,0.1)" }}>
        <Icon size={80} className={`mx-auto mb-6 ${checking ? "animate-spin" : ""}`} style={{ color: success || checking ? "var(--brand-brown)" : "var(--error)" }} />
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>
          {checking ? "Dang xu ly thanh toan" : success ? "Dat hang thanh cong" : "Dat hang that bai"}
        </h1>
        {state.orderNumber && (
          <div className="mt-4 mb-6">
            <div className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>MA DON HANG</div>
            <div className="font-mono font-bold text-xl mt-1" style={{ color: "var(--brand-brown)" }}>{state.orderNumber}</div>
          </div>
        )}
        <p className="mt-4" style={{ color: "var(--text-secondary)" }}>{state.message}</p>
        {!checking && (
          <div className="flex gap-3 mt-8">
            {success ? (
              <>
                <Link to="/profile?tab=orders" className="flex-1 py-3 rounded-xl ui-text font-semibold" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>Theo doi don</Link>
                <Link to="/" className="flex-1 py-3 rounded-xl ui-text font-semibold" style={{ border: "1.5px solid var(--brand-brown)", color: "var(--brand-brown)" }}>Ve trang chu</Link>
              </>
            ) : (
              <>
                <Link to="/checkout" className="flex-1 py-3 rounded-xl ui-text font-semibold" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>Thu lai</Link>
                <Link to="/products" className="flex-1 py-3 rounded-xl ui-text font-semibold" style={{ border: "1.5px solid var(--brand-brown)", color: "var(--brand-brown)" }}>Chon mon</Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
