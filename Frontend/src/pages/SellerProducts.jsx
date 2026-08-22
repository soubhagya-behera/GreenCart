import { useEffect, useState } from "react";
import { api, apiForm, fileUrl } from "../lib/api";
import { categories } from "../assets/greencart/greencart_assets/assets";
import { useDialog } from "../components/common/DialogContext";
import { subscribeInventory } from "../lib/inventorySocket";

export default function SellerProducts() {
  const { alert, confirm, prompt } = useDialog();
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]?.path || "Vegetables");
  const [price, setPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/products/mine", { auth: true })
      .then((res) => setMyProducts(Array.isArray(res) ? res : []))
      .catch(() => setMyProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return subscribeInventory(({ productId, stock }) => {
      setMyProducts((arr) =>
        arr.map((x) =>
          x.id === productId ? { ...x, stock } : x
        )
      );
    });
  }, []);

  async function addProduct(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("category", category);
      fd.append("price", String(price));
      if (offerPrice) fd.append("offerPrice", String(offerPrice));
      if (description) fd.append("description", description);
      if (weight) fd.append("weight", weight);
      if (stock) fd.append("stock", String(stock));

      if (imageFiles.length > 0) {
        fd.append("file", imageFiles[0]);
      }

      await apiForm("/products", fd, { auth: true });
      setName("");
      setCategory(categories[0]?.path || "Vegetables");
      setPrice("");
      setOfferPrice("");
      setDescription("");
      setWeight("");
      setStock("");
      setImageFiles([]);
      const res = await api("/products/mine", { auth: true });

      setMyProducts(Array.isArray(res) ? res : res.products || []);
      await alert({
        title: "Product Added",
        message: "Product added",
        type: "success",
      });
    } catch (e) {
      await alert({
        title: "Add Failed",
        message: e.message || "Failed to add product",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter">
            My Product Catalog
          </h2>
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black">
            {myProducts.length}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {myProducts.map((p) => (
            <div
              key={p.id}
              className="group bg-white rounded-3xl border border-gray-100 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-5 relative overflow-hidden"
            >
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  className="p-1.5 rounded-lg bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={async () => {
                    await confirm({
                      title: "Delete Product",
                      message: "Erase this listing permanently?",
                      confirmText: "Delete",
                      cancelText: "Cancel",
                      danger: true,
                      loadingText: "Deleting...",
                      onConfirm: async () => {
                        await api(`/products/${p.id}`, {
                          method: "DELETE",
                          auth: true,
                        });
                        setMyProducts((arr) =>
                          arr.filter((x) => x.id !== p.id)
                        );
                      },
                    });
                  }}
                >
                  <svg
                    className="w-3.5 h-3.5"
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
              <div className="w-full h-48 bg-gray-50 rounded-xl mb-4 overflow-hidden flex items-center justify-center p-2">
                <img
                  src={p.imageUrl ? fileUrl(p.imageUrl) : "/placeholder.png"}
                  alt={p.name}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  {p.category}
                </div>
                <div className="font-bold text-gray-900 line-clamp-1">
                  {p.name}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-emerald-700 font-black tracking-tighter italic">
                    ₹{p.offerPrice ?? p.price}
                  </div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">
                    Stock: {p.stock ?? 0}
                  </div>
                </div>
              </div>
              <button
                  onClick={async () => {
                      await prompt({
                        title: "Update Inventory Level",
                        label: "Inventory Level",
                        initialValue: String(p.stock ?? 0),
                        confirmText: "Update",
                        cancelText: "Cancel",
                        loadingText: "Updating...",
                        validate: (val) => {
                          const n = Number(val);
                          if (isNaN(n) || n < 0) {
                            return "Please enter a valid stock level (non-negative number).";
                          }
                          return null;
                        },
                        onConfirm: async (val) => {
                          const r = await api(`/products/${p.id}/stock`, {
                            method: "PUT",
                            auth: true,
                            body: { stock: Number(val) },
                          });
                          setMyProducts((arr) =>
                            arr.map((x) =>
                              x.id === p.id ? { ...x, stock: r.stock } : x
                            )
                          );
                        },
                      });
                    }}
                  className="w-full mt-4 py-2 bg-gray-50 text-gray-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                  Update Inventory
                </button>
            </div>
          ))}
          {!loading && myProducts.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl text-gray-300 font-black uppercase tracking-[0.2em]">
              No Listings Yet — Add Your First Product Below
            </div>
          )}
        </div>
      </div>

      <div
        id="add-product"
        className="rounded-[32px] bg-gradient-to-br from-white to-emerald-50 border border-emerald-100 p-10 shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden relative"
      >
        <div className="mb-10">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">
            Create New Product
          </h2>
          <p className="text-gray-500 mt-3 text-lg">
            Upload and publish products to your store
          </p>
        </div>
        <form
          onSubmit={addProduct}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <input
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 mt-2 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Category</label>
            <select
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 mt-2 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.path} value={c.path}>
                  {c.path}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Price</label>
            <input
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 mt-2 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">
              Offer Price (optional)
            </label>
            <input
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 mt-2 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
              type="number"
              min="0"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Stock Quantity</label>
            <input
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 mt-2 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">
              Weight / Measurement (e.g. 500g)
            </label>
            <input
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 mt-2 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
              placeholder="500g, 1kg, Pack of 6"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Description</label>
            <textarea
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 mt-2 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Images</label>
            <input
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 mt-2 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) =>
                setImageFiles(Array.from(e.target.files || []))
              }
            />
            {imageFiles.length ? (
              <div className="flex items-center gap-2 mt-2">
                {imageFiles.slice(0, 4).map((f, i) => (
                  <div
                    key={i}
                    className="w-16 h-16 rounded border border-gray-200 overflow-hidden"
                  >
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <button
              disabled={saving}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white font-black rounded-2xl py-4 text-lg shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60"
            >
              {saving ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
