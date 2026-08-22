import { useEffect, useState } from "react";
import { api, fileUrl } from "../lib/api";
import { assets } from "../assets/greencart/greencart_assets/assets";
import ReviewModal from "../components/ReviewModal";
import { useDialog } from "../components/common/DialogContext";

const steps = ["Processing", "Packed", "Shipped", "OutForDelivery", "Delivered"];

const stepIcons = {
  Processing: "⚙️",
  Packed: "📦",
  Shipped: "🚚",
  OutForDelivery: "🛵",
  Delivered: "✅",
};

function OrderCard({ o, onCancelled, productMap, onReview, reviewedProducts }) {
  const { alert, confirm } = useDialog();
  const isCancelled = o.orderStatus === "Cancelled";
  // "Picked Up" sits between Shipped and OutForDelivery; the tracker has no
  // dedicated step for it, so keep the bar where Shipped left off.
  const currentIndex = isCancelled
    ? -1
    : o.orderStatus === "Picked Up"
    ? steps.indexOf("Shipped")
    : Math.max(0, steps.indexOf(o.orderStatus || "Processing"));
  const partnerName = !isCancelled ? o.assignedDelivery?.name : null;

  async function cancelOrder() {
    const cancelled = await confirm({
      title: "Cancel Order",
      message: "Are you sure you want to cancel this order?",
      confirmText: "Cancel Order",
      cancelText: "Keep Order",
      danger: true,
      loadingText: "Cancelling...",
      onConfirm: async () => {
        await api(`/orders/${o.id}/cancel`, { method: "PUT", auth: true });
      },
    });
    if (!cancelled) return;
    await alert({
      title: "Order Cancelled",
      message: "Order cancelled successfully.",
      type: "success",
    });
    onCancelled && onCancelled();
  }

  return (
    <div
      className={`bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 space-y-8 md:space-y-10 animate-fade-in border-t-4 ${
        o.orderStatus === "Delivered"
          ? "border-t-emerald-500"
          : o.orderStatus === "Cancelled"
          ? "border-t-red-400"
          : "border-t-blue-500"
      }`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b border-gray-100">
        <div>
          <span className="text-emerald-700 font-bold tracking-widest text-[10px] uppercase bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full mb-3 inline-block">
            {isCancelled ? "Cancelled" : currentIndex === steps.length - 1 ? "Completed" : "In progress"}
          </span>
          <h2
            onClick={() => navigator.clipboard.writeText(String(o.id))}
            title="Click to copy order number"
            className="text-xl font-extrabold cursor-pointer hover:text-emerald-700 transition-colors"
          >
            #{String(o.id).padStart(8, "0")}
          </h2>
          <div className="text-[11px] font-semibold text-gray-400 mt-1.5">
            {new Date(o.createdAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Order total
          </p>
          <p className="text-2xl font-extrabold text-gray-900 tracking-tight tabular-nums mb-1">
            ₹{Number(o.total || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
            {o.paymentMethod} · {o.paymentStatus}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-8">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">
              Progress
            </p>
            <div className="relative space-y-8 pl-6">
              <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-gray-100 rounded-full"></div>
              <div
                className={`absolute left-[5px] top-2 w-0.5 rounded-full transition-all duration-1000 ease-out z-10 ${
                  isCancelled ? "bg-red-200" : "bg-emerald-500"
                }`}
                style={{
                  height: isCancelled
                    ? "100%"
                    : `${(currentIndex / (steps.length - 1)) * 100}%`,
                }}
              ></div>

              {steps.map((s, i) => {
                const isCompleted = i < currentIndex;
                const isCurrent = i === currentIndex;
                const isFuture = i > currentIndex;

                return (
                  <div key={s} className="relative flex items-center gap-6 group/step">
                    <div
                      className={`absolute -left-[23px] w-3 h-3 rounded-full border-2 transition-all duration-500 z-20 ${
                        isCancelled
                          ? "bg-white border-red-200"
                          : isCurrent
                          ? "bg-white border-emerald-500 ring-4 ring-emerald-50 animate-pulse"
                          : isCompleted
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-white border-gray-100"
                      }`}
                    >
                      {isCurrent && !isCancelled && (
                        <div className="absolute inset-0 m-auto w-1 h-1 bg-emerald-500 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                          isCancelled ? "text-red-300" : isFuture ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        <span>{stepIcons[s]}</span>
                        <span>{s === "OutForDelivery" ? "Out for Delivery" : s}</span>
                      </span>
                      {isCurrent && !isCancelled && (
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic mt-0.5">
                          Current Phase
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {isCancelled && (
                <div className="relative flex items-center gap-6 animate-bounce-in">
                  <div className="absolute -left-[23px] w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100 z-20"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">
                    Cancelled
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Delivery address
            </p>
            <p className="text-[11px] font-semibold text-gray-600 leading-relaxed">
              {o.address}
            </p>
          </div>

          {partnerName && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-3">
              <span className="w-9 h-9 shrink-0 rounded-lg bg-white border border-emerald-100 flex items-center justify-center text-base">
                🛵
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 leading-none">
                  Delivery Partner
                </p>
                <p className="text-xs font-black text-gray-800 truncate mt-1">
                  {partnerName}
                  {o.orderStatus === "OutForDelivery" && (
                    <span className="text-emerald-600 font-bold"> · On the way</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">
            Items ({o.items.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {o.items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-gray-50 border border-gray-50 hover:bg-white hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-14 h-14 bg-white rounded-xl p-2 flex items-center justify-center shrink-0 shadow-sm border border-gray-50">
                  <img
                    src={fileUrl(productMap[it.productId]?.imageUrl) || assets.product_list_icon}
                    alt={it.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-800 line-clamp-1">{it.name}</p>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1 italic">
                    {it.qty} × ₹{it.price}
                  </p>
                  {o.orderStatus === "Delivered" &&
                    (reviewedProducts?.[it.product.id] ? (
                      <span className="mt-2 inline-block bg-gray-200 text-gray-600 px-3 py-1 rounded text-xs">
                        Reviewed ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => onReview(it.product.id)}
                        className="mt-2 bg-emerald-600 text-white px-3 py-1 rounded text-xs"
                      >
                        Rate Product
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {o.orderStatus !== "Cancelled" && o.orderStatus !== "Delivered" && (
            <button
              onClick={cancelOrder}
              className="mt-8 bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white transition-colors"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productMap, setProductMap] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [reviewedProducts, setReviewedProducts] = useState({});
  const reviewCount = Object.values(reviewedProducts).filter(Boolean).length;

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderRes, prodRes] = await Promise.all([
        api("/orders/my", { auth: true }),
        api("/products"),
      ]);

      const sortedOrders = Array.isArray(orderRes) ? [...orderRes].sort((a, b) => b.id - a.id) : [];
      setOrders(sortedOrders);

      const map = {};
      (Array.isArray(prodRes) ? prodRes : []).forEach((p) => (map[p.id] = p));
      setProductMap(map);

      const reviewedMap = {};
      for (const order of sortedOrders) {
        for (const item of order.items) {
          try {
            const reviewed = await api(`/reviews/check/${item.product.id}`, { auth: true });
            reviewedMap[item.product.id] = reviewed;
          } catch (e) {}
        }
      }
      setReviewedProducts(reviewedMap);
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="bg-[#fcfdfd] min-h-screen py-8 md:py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-7 gap-4 animate-fade-in">
          <div>
            <span className="label-pill">Your Account</span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-3 tracking-tight">
              My Orders
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100 self-start">
            <span className="text-[11px] font-bold text-gray-500 tabular-nums">
              {orders.length} order{orders.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            {
              label: "All orders",
              value: orders.length,
              cls: "text-gray-900",
            },
            {
              label: "Delivered",
              value: orders.filter((o) => o.orderStatus === "Delivered").length,
              cls: "text-emerald-600",
            },
            {
              label: "In progress",
              value: orders.filter(
                (o) =>
                  o.orderStatus !== "Delivered" && o.orderStatus !== "Cancelled"
              ).length,
              cls: "text-blue-600",
            },
            {
              label: "Cancelled",
              value: orders.filter((o) => o.orderStatus === "Cancelled").length,
              cls: "text-red-500",
            },
            {
              label: "Reviews given",
              value: reviewCount,
              cls: "text-amber-500",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-gray-100 px-4 py-3.5"
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                {s.label}
              </p>
              <p className={`text-xl font-extrabold tabular-nums mt-1.5 ${s.cls}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-8 space-y-6">
                <div className="flex justify-between items-start gap-6 pb-5 border-b border-gray-100">
                  <div className="space-y-2">
                    <div className="h-3 skeleton rounded-full w-24" />
                    <div className="h-6 skeleton rounded-lg w-36" />
                  </div>
                  <div className="h-7 skeleton rounded-lg w-24" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 h-36 skeleton rounded-xl" />
                  <div className="lg:col-span-8 grid grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((j) => (
                      <div key={j} className="h-20 skeleton rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="text-5xl mb-4">📦</div>
            <h2 className="text-base font-bold text-gray-900 mb-1.5">
              No orders yet
            </h2>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
              When you place an order it will show up here with live status updates.
            </p>
            <a href="#/all-products" className="btn-primary">
              Browse Products
            </a>
          </div>
        ) : (
          <div className="space-y-12">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                o={o}
                productMap={productMap}
                reviewedProducts={reviewedProducts}
                onCancelled={loadData}
                onReview={(productId) => {
                  setSelectedProductId(productId);
                  setShowReviewModal(true);
                }}
              />
            ))}
          </div>
        )}
        {showReviewModal && (
          <ReviewModal productId={selectedProductId} onClose={() => setShowReviewModal(false)} />
        )}
      </div>
    </div>
  );
}