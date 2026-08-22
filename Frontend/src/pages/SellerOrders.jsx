import { useEffect, useState } from "react";
import { api, fileUrl } from "../lib/api";
import { useDialog } from "../components/common/DialogContext";

export default function SellerOrders() {
  const { alert } = useDialog();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignOrderId, setAssignOrderId] = useState("");
  const [assignEmail, setAssignEmail] = useState("");
  const [statusOrderId, setStatusOrderId] = useState("");
  const [statusValue, setStatusValue] = useState("Processing");

  useEffect(() => {
    api("/seller/orders", { auth: true })
      .then((res) => setOrders(Array.isArray(res) ? res : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  function focusOrder(id) {
    setAssignOrderId(id);
    setStatusOrderId(id);
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 p-6 shadow-sm bg-white mb-8">
        <div className="text-xl font-black text-gray-900 mb-6 italic tracking-tighter">
          Order Operations
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              api(`/seller/orders/${assignOrderId}/assign`, {
                method: "PUT",
                body: { deliveryEmail: assignEmail },
                auth: true,
              })
                .then(async () => {
                  await alert({
                    title: "Delivery Assigned",
                    message: "Assigned delivery successfully",
                    type: "success",
                  });
                  setAssignOrderId("");
                  setAssignEmail("");
                })
                .catch(async (err) =>
                  await alert({
                    title: "Assignment Failed",
                    message: err.message || "Failed to assign: check email/role.",
                    type: "error",
                  })
                );
            }}
            className="space-y-2 bg-blue-50/30 p-4 rounded-xl border border-blue-100"
          >
            <div className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Assign Delivery
            </div>
            <input
              className="w-full border rounded-lg px-3 py-2 bg-white"
              placeholder="Order ID"
              value={assignOrderId}
              onChange={(e) => setAssignOrderId(e.target.value)}
              required
            />
            <input
              className="w-full border rounded-lg px-3 py-2 bg-white"
              placeholder="Delivery partner email"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              required
            />
            <button className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
              Confirm Assignment
            </button>
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              api(`/seller/orders/${statusOrderId}/status`, {
                method: "PUT",
                body: { status: statusValue },
                auth: true,
              })
                .then(async () => {
                  await alert({
                    title: "Status Updated",
                    message: "Status updated",
                    type: "success",
                  });
                  setStatusOrderId("");
                })
                .catch(async () =>
                  await alert({
                    title: "Update Failed",
                    message: "Failed to update status",
                    type: "error",
                  })
                );
            }}
            className="space-y-2"
          >
            <div className="text-sm font-semibold text-gray-800">
              Update Order Status
            </div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Order ID"
              value={statusOrderId}
              onChange={(e) => setStatusOrderId(e.target.value)}
              required
            />
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
            >
              {[
                "Processing",
                "Packed",
                "Shipped",
                "OutForDelivery",
                "Delivered",
                "Cancelled",
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">
              Update
            </button>
          </form>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const title = e.target.title.value;
              const msg = e.target.msg.value;
              try {
                await api("/newsletter/announce", {
                  method: "POST",
                  body: { title, message: msg },
                  auth: true,
                });
                await alert({
                  title: "Announcement Sent",
                  message: "Announcement sent to subscribers!",
                  type: "success",
                });
                e.target.reset();
              } catch (err) {
                await alert({
                  title: "Send Failed",
                  message: err.message || "Failed to send",
                  type: "error",
                });
              }
            }}
            className="space-y-2"
          >
            <div className="text-sm font-semibold text-gray-800">
              Send Announcement to Subscribers
            </div>
            <input
              name="title"
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Subject/Title"
              required
            />
            <textarea
              name="msg"
              rows="3"
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Your message..."
              required
            />
            <button className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm">
              Send Announcement
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-6 bg-white mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter italic">
            My Orders — Fulfilment View
          </h2>
          <span className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full italic shadow-lg shadow-emerald-100">
            Your items only
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Order & Date
                </th>
                <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  My Items
                </th>
                <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Customer
                </th>
                <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Courier Partner
                </th>
                <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Status
                </th>
                <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                  Evidence & Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="group hover:bg-emerald-50/20 transition-colors"
                >
                  <td className="py-5 pr-4">
                    <div
                      className="text-xs font-black text-gray-900 italic cursor-pointer hover:text-emerald-600 transition-colors"
                      onClick={() => focusOrder(o.id)}
                      title="Click to manage this order"
                    >
                      #{String(o.id).padStart(8, "0")}
                    </div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-5 pr-4">
                    <div className="flex -space-x-1.5 items-center">
                      {o.items?.slice(0, 3).map((it, idx) => (
                        <div
                          key={idx}
                          className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm"
                          title={`${it.name} × ${it.qty}`}
                        >
                          <img
                            src={
                              it.image
                                ? fileUrl(it.image)
                                : "/placeholder.png"
                            }
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        </div>
                      ))}
                      {o.items?.length > 3 && (
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-900 text-[8px] font-bold text-white flex items-center justify-center shadow-sm">
                          +{o.items.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-5 pr-4">
                    <div className="text-xs font-black text-gray-900">
                      {o.user?.name || "-"}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {o.user?.email || "-"}
                    </div>
                  </td>
                  <td className="py-5 pr-4">
                    {o.assignedDelivery ? (
                      <>
                        <div className="text-xs font-black text-indigo-600 italic uppercase">
                          {o.assignedDelivery.name}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {o.assignedDelivery.email}
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="py-5 pr-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        o.orderStatus === "Delivered"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : o.orderStatus === "Cancelled"
                            ? "bg-red-50 text-red-600 border-red-100"
                            : "bg-blue-50 text-blue-600 border-blue-100"
                      }`}
                    >
                      {o.orderStatus}
                    </span>
                  </td>
                  <td className="py-5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {o.deliveryProofImages?.length > 0 && (
                        <div className="flex -space-x-2">
                          {o.deliveryProofImages.slice(0, 2).map((img, i) => (
                            <img
                              key={i}
                              src={fileUrl(img)}
                              className="w-8 h-8 rounded-lg border-2 border-white object-cover shadow-sm bg-white cursor-pointer hover:scale-110 transition-transform"
                              alt="Evidence"
                              onClick={() =>
                                window.open(fileUrl(img), "_blank")
                              }
                            />
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => focusOrder(o.id)}
                        className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                        title="Manage Status / Assign Partner"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={async () =>
                          await alert({
                            title: "Delivery Logs",
                            message: o.deliveryNotes
                              ?.map(
                                (n) =>
                                  `[${n.role}] ${n.message} (@ ${new Date(n.at).toLocaleString()})`
                              )
                              .join("\n") || "No logs available",
                            type: "info",
                          })
                        }
                        className="p-2 bg-gray-900 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm"
                        title="View Logs"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && orders.length === 0 && (
            <div className="py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest italic">
              No orders containing your products yet
            </div>
          )}
        </div>
      </div>
    </>
  );
}
