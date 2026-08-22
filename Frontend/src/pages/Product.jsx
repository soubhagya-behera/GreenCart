import { useEffect, useState, useRef } from "react";
import { api, fileUrl } from "../lib/api";
import { subscribeInventory } from "../lib/inventorySocket";
import ProductCard from "../components/ProductCard";

function Stars({ rating = 0 }) {
  const full = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i <= full ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Product({ id, onAdd }) {
  const [p, setP] = useState(null);
  const [list, setList] = useState([]);
  const [sel, setSel] = useState(0);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const reviewRef = useRef(null);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50, active: false });

  const handleMouseMove = (e) => {
    const { left, top, width, height } =
      e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y, active: true });
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api(`/products/${id}`),
      api("/products"),
      api(`/reviews/product/${id}`),
    ])
      .then(([res, all, reviewData]) => {
        setP(res || null);
        setReviews(reviewData || []);
        setList(Array.isArray(all) ? all : all.products || []);
      })
      .catch(() => {
        setP(null);
      })
      .finally(() => setLoading(false));

    setSel(0);
    setQty(1);
  }, [id]);

  useEffect(() => {
    return subscribeInventory(({ productId, stock }) => {
      setP((cur) =>
        cur && cur.id === productId ? { ...cur, stock } : cur
      );
      setList((arr) =>
        arr.map((x) =>
          x.id === productId ? { ...x, stock } : x
        )
      );
    });
  }, []);

  if (loading)
    return (
      <div className="bg-white min-h-screen py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-square skeleton rounded-3xl" />
          <div className="space-y-5 pt-4">
            <div className="h-5 w-24 skeleton rounded-full" />
            <div className="h-9 w-3/4 skeleton rounded-xl" />
            <div className="h-7 w-32 skeleton rounded-xl" />
            <div className="h-16 skeleton rounded-xl" />
            <div className="h-12 skeleton rounded-xl mt-8" />
          </div>
        </div>
      </div>
    );
  if (!p)
    return (
      <div className="bg-white min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl text-gray-300 mb-4">
          🔍
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Product not found</p>
        <p className="text-xs text-gray-400 mb-6">
          It may have been removed from the store.
        </p>
        <a href="#/" className="btn-primary">Back to Home</a>
      </div>
    );

  const price = p.offerPrice ?? p.price;
  const related = list
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 5);
  const available = p.stock ?? 0;
  const productImgs = p.imageUrl ? [p.imageUrl] : [];

  return (
    <div className="bg-white min-h-screen py-6 md:py-8 lg:py-12">
      <div className="mx-auto max-w-7xl px-4">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[11px] font-semibold mb-8 animate-fade-in"
        >
          <a href="#/" className="text-gray-400 hover:text-emerald-700 transition-colors">
            Home
          </a>
          <span className="text-gray-300">/</span>
          <a
            href={`/category/${encodeURIComponent((p.category || "").toLowerCase())}`}
            className="text-gray-400 hover:text-emerald-700 transition-colors"
          >
            {p.category}
          </a>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 truncate max-w-[200px]">{p.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          {/* Gallery Section */}
          <div className="lg:col-span-6 flex flex-col md:flex-row gap-4 md:gap-8">
            <div className="flex md:flex-col gap-4 order-2 md:order-1 shrink-0 overflow-auto pb-4 md:pb-0 px-1">
              {productImgs.map((im, i) => (
                <button
                  key={i}
                  className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[1.5rem] border-2 transition-all p-2 flex items-center justify-center bg-gray-50/50 ${sel === i ? "border-emerald-500 shadow-lg shadow-emerald-50" : "border-transparent hover:border-emerald-200"}`}
                  onClick={() => setSel(i)}
                >
                  <img
                    src={im ? fileUrl(im) : "/placeholder.png"}
                    alt=""
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                  />
                </button>
              ))}
            </div>

            <div className="flex-1 order-1 md:order-2">
              <div
                className="rounded-3xl border border-gray-100 bg-gray-50/60 flex items-center justify-center relative overflow-hidden group cursor-crosshair min-h-[280px] md:min-h-[440px]"
                onMouseMove={handleMouseMove}
                onMouseLeave={() =>
                  setZoomPos((p) => ({ ...p, active: false }))
                }
              >
                <img
                  src={
                    productImgs[sel]
                      ? fileUrl(productImgs[sel])
                      : "/placeholder.png"
                  }
                  alt={p.name}
                  className={`max-h-[20rem] md:max-h-[28rem] w-full object-contain mix-blend-multiply transition-transform duration-200 ease-out ${zoomPos.active ? "scale-[1.8]" : "scale-100"}`}
                  style={{ transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }}
                />
                {!zoomPos.active && (
                  <div className="absolute inset-x-0 bottom-5 flex justify-center pointer-events-none">
                    <span className="hidden md:inline-block text-[9px] font-bold text-gray-400 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full uppercase tracking-widest border border-gray-100">
                      Hover to zoom
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Context Section */}
          <div className="lg:col-span-6 flex flex-col justify-center animate-fade-in">
            <div className="inline-flex items-center gap-3 mb-5">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
                {p.category}
              </span>
              {available > 0 ? (
                <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  In stock
                </span>
              ) : (
                <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest">
                  Out of stock
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
              {p.name}
            </h1>

            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight tabular-nums">
                  ₹{price}
                </span>
                {p.offerPrice && (
                  <span className="text-base font-semibold text-gray-300 line-through">
                    ₹{p.price}
                  </span>
                )}
              </div>
              <div className="h-7 w-px bg-gray-100"></div>
              <button
                onClick={() =>
                  reviewRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className="flex items-center gap-1.5 group cursor-pointer"
              >
                <Stars rating={Number(p.averageRating || 0)} />
                <span className="text-[11px] font-bold text-gray-500 group-hover:text-emerald-700 transition-colors">
                  {Number(p.averageRating || 0).toFixed(1)} ·{" "}
                  {p.reviewCount || 0} Review
                  {(p.reviewCount || 0) === 1 ? "" : "s"}
                </span>
              </button>
            </div>

            <div className="mb-9">
              {p.description && (
                <p className="text-gray-500 font-medium text-sm leading-relaxed max-w-xl">
                  {p.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-4">
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    available <= 0
                      ? "bg-red-50 text-red-500"
                      : available <= 5
                      ? "bg-orange-50 text-orange-600"
                      : "bg-gray-50 text-gray-600"
                  }`}
                >
                  {available <= 0
                    ? "Out of stock"
                    : available <= 5
                    ? `Only ${available} left`
                    : `${available} in stock`}
                </span>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3.5">
                <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-11 h-11 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-gray-700 hover:text-emerald-700 transition-colors disabled:opacity-40"
                    disabled={available <= 0}
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-extrabold text-base text-gray-900 tabular-nums">
                    {qty}
                  </span>
                  <button
                    onClick={() =>
                      setQty((q) => Math.min(available || Infinity, q + 1))
                    }
                    aria-label="Increase quantity"
                    className="w-11 h-11 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-gray-700 hover:text-emerald-700 transition-colors disabled:opacity-40"
                    disabled={available <= 0}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => onAdd(p, qty, false)}
                  disabled={available <= 0}
                  className={`flex-1 min-w-[180px] h-[52px] rounded-xl font-extrabold text-xs uppercase tracking-[0.15em] inline-flex items-center justify-center gap-2 transition-colors ${
                    available <= 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-100"
                  }`}
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
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  Add to Cart
                </button>
              </div>

              <button
                onClick={() => onAdd(p, qty, true)}
                disabled={available <= 0}
                className={`w-full h-[52px] rounded-xl font-extrabold text-xs uppercase tracking-[0.15em] transition-colors border ${
                  available <= 0
                    ? "border-gray-100 text-gray-300 pointer-events-none"
                    : "border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                Buy Now
              </button>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-6 border-t border-gray-100 pt-8">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                <div>
                  <p className="text-gray-900 font-bold text-xs">Home delivery</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    Delivered to your address
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <div>
                  <p className="text-gray-900 font-bold text-xs">Secure checkout</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    Cash on delivery or pay online
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section ref={reviewRef} className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Customer Reviews
          </h2>
          <span className="text-xs font-semibold text-gray-400 tabular-nums">
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
            <p className="text-sm font-bold text-gray-700">No reviews yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Be the first to rate this product after it's delivered.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-emerald-100 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold flex items-center justify-center uppercase">
                      {(r.user?.name || "?").charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {r.user?.name || "Customer"}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <Stars rating={Number(r.rating || 0)} />
                </div>

                <p className="text-gray-600 text-sm leading-relaxed">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Related products */}
      <section className="bg-gray-50 py-12 md:py-16 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex items-end justify-between mb-7 gap-4">
            <div>
              <span className="label-pill">Keep browsing</span>
              <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mt-3 tracking-tight">
                You may also like
              </h2>
            </div>
            <a
              href="#/all-products"
              className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 hover:text-emerald-800 transition-colors shrink-0"
            >
              View all
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-5">
            {related.map((rp) => (
              <ProductCard key={rp.id} p={rp} onAdd={onAdd} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
