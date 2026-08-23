import { useEffect, useState } from "react";
import { navigate } from "../lib/router";
import { api, getToken, fileUrl } from "../lib/api";
import { upsertOrder } from "../lib/customerOrders";
import { useDialog } from "../components/common/DialogContext";

export default function Cart({
  cart = {},
  onInc,
  onDec,
  onRemove,
  onClearCart,
}) {
  const [productMap, setProductMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    api("/products")
      .then((res) => {
        const map = {};
        (Array.isArray(res) ? res : res.products || []).forEach((p) => {
          map[p.id] = p;
        });
        setProductMap(map);
      })
      .catch(() => setProductMap({}))
      .finally(() => setLoading(false));
  }, []);

  const items = Object.entries(cart)
    .map(([id, qty]) => {
      const p = productMap[id];
      return { p, qty };
    })
    .filter((x) => x.p);

  const subtotal = items.reduce(
    (s, { p, qty }) => s + (p.offerPrice ?? p.price) * qty,
    0
  );
  const savings = items.reduce(
    (s, { p, qty }) =>
      s + ((p.price || 0) - (p.offerPrice ?? p.price)) * qty,
    0
  );
  // Matches the backend checkout total: item prices only, no added fees.
  const total = +subtotal.toFixed(2);
  const [method, setMethod] = useState("Cash On Delivery");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { alert } = useDialog();

  const addr = (() => {
    try {
      return JSON.parse(localStorage.getItem("shippingAddress") || "null");
    } catch {
      return null;
    }
  })();

  function formatAddress(a) {
    if (!a) return "";
    return `${a.firstName || ""} ${a.lastName || ""}, ${a.street || ""}, ${
      a.city || ""
    }, ${a.state || ""} ${a.zipcode || ""}, ${a.country || ""}. Phone: ${
      a.phone || ""
    }`.trim();
  }

  async function handlePlaceOrder() {
    const t = getToken();
    if (!t) {
      navigate("/auth");
      return;
    }
    if (
      !addr ||
      !addr.firstName ||
      !addr.lastName ||
      !addr.street ||
      !addr.city ||
      !addr.state ||
      !addr.zipcode ||
      !addr.country ||
      !addr.phone
    ) {
      await alert({
        title: "Address Required",
        message: "Please complete your delivery address first",
        type: "warning",
      });
      navigate("/address");
      return;
    }
    if (total < 1) {
      await alert({
        title: "Invalid Total",
        message: "Total amount must be at least ₹1",
        type: "warning",
      });
      return;
    }
    const insufficient = items.find(({ p, qty }) => (p.stock ?? 0) < qty);
    if (insufficient) {
      await alert({
        title: "Out of Stock",
        message: `Out of stock for "${insufficient.p.name}". Available: ${
          insufficient.p.stock ?? 0
        }. Please reduce quantity.`,
        type: "warning",
      });
      return;
    }
    const lineItems = items.map(({ p, qty }) => ({
      productId: p.id,
      name: p.name,
      price: p.offerPrice ?? p.price,
      qty,
    }));
    const payload = {
      items: lineItems,
      totalAmount: total,
      address: formatAddress(addr),
    };
    setPlacing(true);
    if (method === "Cash On Delivery") {
      try {
        const created = await api("/orders/checkout", {
          method: "POST",
          body: { address: payload.address, paymentMethod: "COD" },
          auth: true,
        });
        // The backend response is the real persisted order — seed the
        // shared store so My Orders shows it instantly, deduped by id
        // against the ORDER_CREATED event and later refetches.
        if (created?.id != null) upsertOrder(created);
        await alert({
          title: "Order Placed",
          message: "Order placed successfully",
          type: "success",
        });
        onClearCart && onClearCart();
        navigate("/orders");
      } catch (e) {
        await alert({
          title: "Order Failed",
          message: e.message || "Could not place order. Please try again.",
          type: "error",
        });
      } finally {
        setPlacing(false);
      }
      return;
    }
    if (method === "Digital Payment") {
      try {
        setPaymentLoading(true);

        const orderRes = await api("/orders/checkout", {
          method: "POST",
          body: { address: payload.address, paymentMethod: "Online" },
          auth: true,
        });
        const savedOrderId = orderRes.id;
        // Real backend order (Awaiting Payment until the gateway verifies).
        if (orderRes?.id != null) upsertOrder(orderRes);

        const rzpOrder = await api(`/payment/create-order?orderId=${savedOrderId}`, {
          method: "POST",
          auth: true,
        });
        const key = "rzp_test_Spuo8MnK6pD5rO";

        await loadRazorpayAndPay({ key, order: rzpOrder, payload, savedOrderId });
      } catch (e) {
        await alert({
          title: "Payment Failed",
          message: e.message || "Payment initialization failed",
          type: "error",
        });
      } finally {
        setPlacing(false);
        setPaymentLoading(false);
      }
      return;
    }
  }

  async function loadRazorpayAndPay({ key, order, payload, savedOrderId }) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onerror = async () => {
        await alert({
          title: "Payment Gateway Error",
          message:
            "Failed to load payment gateway. Please check your internet connection.",
          type: "error",
        });
        reject(new Error("Script load error"));
      };
      s.onload = () => {
        const options = {
          key,
          amount: order.amount,
          currency: order.currency,
          name: "GreenCart",
          description: "Grocery order payment",
          order_id: order.id,
          handler: async function (response) {
            try {
              setPaymentLoading(true);
              const verifyRes = await api("/payment/verify", {
                method: "POST",
                auth: true,
                body: {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  orderId: savedOrderId,
                },
              });
              // Verified order straight from the backend (Confirmed/Paid).
              if (verifyRes?.order?.id != null) upsertOrder(verifyRes.order);

              onClearCart && onClearCart();
              navigate("/orders");
              resolve();
            } catch (err) {
              await alert({
                title: "Payment Failed",
                message: err.message || "Payment verification failed",
                type: "error",
              });
              reject(err);
            } finally {
              setPaymentLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setPlacing(false);
              setPaymentLoading(false);
            },
          },
          prefill: {
            name: `${addr?.firstName || ""} ${addr?.lastName || ""}`.trim(),
            email: addr?.email || "",
            contact: addr?.phone || "",
          },
          theme: { color: "#10b981" },
        };
        const rz = new window.Razorpay(options);
        rz.open();
      };
      document.body.appendChild(s);
    });
  }

  if (loading)
    return (
      <section className="bg-white py-10 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-5 p-6 rounded-2xl border border-gray-100">
                <div className="w-24 h-24 skeleton rounded-xl shrink-0" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-3.5 skeleton rounded-full w-1/2" />
                  <div className="h-3 skeleton rounded-full w-1/4" />
                  <div className="h-9 skeleton rounded-lg w-40 mt-4" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-96 skeleton rounded-2xl" />
        </div>
      </section>
    );

  return (
    <section className="bg-white py-6 md:py-10 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 md:px-6 flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Items */}
        <div className="flex-1 space-y-7">
          <div>
            <span className="label-pill">Your Cart</span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-3 tracking-tight">
              Shopping Bag
            </h1>
            <p className="text-gray-400 text-sm mt-1.5">
              {items.length} item{items.length === 1 ? "" : "s"} · review before checkout.
            </p>
          </div>

          {items.length > 0 && savings > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-4 py-3 text-sm font-semibold">
              You're saving ₹{savings.toLocaleString("en-IN")} on this order with today's prices.
            </div>
          )}

          <div className="space-y-4">
            {items.map(({ p, qty }) => {
              const price = p.offerPrice ?? p.price;
              const available = p.stock ?? 0;
              const overStock = qty > available;
              return (
                <div
                  key={p.id}
                  className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-100 transition-colors p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 animate-fade-in"
                >
                  <div
                    onClick={() => navigate(`/product/${p.id}`)}
                    className="w-full h-36 sm:w-28 sm:h-28 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 cursor-pointer overflow-hidden"
                  >
                    <img
                      src={fileUrl(p.imageUrl)}
                      alt={p.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3
                          onClick={() => navigate(`/product/${p.id}`)}
                          className="text-[15px] font-bold text-gray-900 hover:text-emerald-700 transition-colors cursor-pointer truncate"
                        >
                          {p.name}
                        </h3>
                        <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                          {p.category}
                          {overStock && (
                            <span className="ml-2 text-orange-500 font-bold uppercase tracking-wide">
                              Only {available} in stock
                            </span>
                          )}
                        </p>
                      </div>

                      <button
                        onClick={() => onRemove(p)}
                        aria-label={`Remove ${p.name}`}
                        className="self-end sm:self-start p-2 -m-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg
                          className="w-4.5 h-4.5 w-[18px] h-[18px]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center justify-between sm:justify-start gap-4">
                      <div className="inline-flex items-center rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => onDec(p)}
                          aria-label="Decrease quantity"
                          className="w-8 h-8 flex items-center justify-center font-bold text-gray-500 hover:bg-gray-50 hover:text-emerald-700 transition-colors"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-bold text-sm text-gray-900 tabular-nums">
                          {qty}
                        </span>
                        <button
                          onClick={async () => {
                            if (qty < available) onInc(p);
                            else
                              await alert({
                                title: "Stock limit reached",
                                message: `Only ${available} unit${available === 1 ? "" : "s"} available.`,
                                type: "warning",
                              });
                          }}
                          aria-label="Increase quantity"
                          className="w-8 h-8 flex items-center justify-center font-bold text-gray-500 hover:bg-gray-50 hover:text-emerald-700 transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right sm:ml-auto">
                        <p className="text-[10px] font-bold text-gray-400 leading-none mb-0.5">
                          ₹{price} each
                        </p>
                        <p className="text-base font-extrabold text-gray-900 tabular-nums">
                          ₹{(price * qty).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div className="py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <div className="text-5xl mb-4">🛒</div>
              <h2 className="text-lg font-bold text-gray-900 mb-1.5">
                Your cart is empty
              </h2>
              <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                Browse fresh groceries and add them to your bag.
              </p>
              <a href="#/all-products" className="btn-primary">
                Browse Products
              </a>
            </div>
          )}

          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-emerald-700 transition-colors py-1 group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Continue shopping
          </a>
        </div>

        {/* Summary */}
        <aside className="w-full lg:w-[380px] lg:shrink-0">
          <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-md border border-gray-100 lg:sticky lg:top-24">
            <h2 className="text-base font-extrabold mb-5 tracking-tight">
              Order Summary
            </h2>

            <dl className="space-y-3 pb-4 border-b border-gray-100">
              <div className="flex justify-between items-center text-sm">
                <dt className="text-gray-500 font-medium">Subtotal</dt>
                <dd className="font-bold tabular-nums">
                  ₹{subtotal.toLocaleString("en-IN")}
                </dd>
              </div>
              {savings > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <dt className="text-gray-500 font-medium">Savings</dt>
                  <dd className="font-bold tabular-nums text-emerald-600">
                    −₹{savings.toLocaleString("en-IN")}
                  </dd>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <dt className="text-gray-500 font-medium">Delivery</dt>
                <dd className="font-bold text-emerald-600">Free</dd>
              </div>
            </dl>

            <div className="flex justify-between items-center py-4">
              <span className="text-sm font-bold text-gray-900">Total</span>
              <span className="text-xl font-extrabold tracking-tight tabular-nums text-gray-900">
                ₹{total.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="space-y-4 mb-5 pt-4 border-t border-gray-100">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Delivery address
                  </span>
                  <a
                    href="/address"
                    className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest hover:text-emerald-800"
                  >
                    Edit
                  </a>
                </div>

                {addr ? (
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {addr.street}, {addr.city}, {addr.state} {addr.zipcode}
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-red-500">
                    No address yet — add one to continue.
                  </p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  Payment method
                </span>
                <div className="grid grid-cols-2 gap-2 items-stretch">
                  {["Cash On Delivery", "Digital Payment"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`px-2 py-3 rounded-lg text-[10px] font-bold uppercase tracking-wide leading-tight transition-colors ${
                        method === m
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-gray-50 text-gray-500 border border-gray-100 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                    >
                      {m === "Digital Payment" ? "Pay Online" : "Cash on Delivery"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing || items.length === 0}
              className={`w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-[0.15em] shadow-sm shadow-emerald-100 transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {placing ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing…
                </>
              ) : method === "Cash On Delivery" ? (
                "Place Order"
              ) : (
                "Proceed to Pay"
              )}
            </button>

            <p className="mt-4 text-center text-[10px] font-semibold text-gray-300 uppercase tracking-widest">
              🔒 Secure checkout · Free delivery
            </p>
          </div>
        </aside>
      </div>

      {/* Payment Loading Overlay */}
      {paymentLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-100 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          </div>
          <h2 className="mt-6 text-lg font-extrabold text-gray-900">
            Processing payment…
          </h2>
          <p className="mt-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
            Please don't refresh this page
          </p>
        </div>
      )}
    </section>
  );
}
