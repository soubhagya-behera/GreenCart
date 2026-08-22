import { useState } from "react";
import { fileUrl } from "../lib/api";
import { navigate } from "../lib/router";

export default function ProductCard({ p, onAdd }) {
  const price = p.offerPrice ?? p.price;

  const [idx, setIdx] = useState(0);
  const [qty, setQty] = useState(1);

  let src = "";

  if (p.imageUrl) {
    src = fileUrl(p.imageUrl);
  } else if (p.images?.length) {
    src = fileUrl(p.images[idx]);
  } else if (Array.isArray(p.image) && p.image.length) {
    src = fileUrl(p.image[idx]);
  }

  const available = typeof p.stock === "number" ? p.stock : p.inStock ? 999 : 0;
  const discount =
    p.offerPrice && p.price
      ? Math.max(0, Math.round(100 - (price / p.price) * 100))
      : 0;

  return (
    <div
      onClick={(e) => {
        if (e.target.closest("button")) return;
        navigate(`/product/${p.id}`);
      }}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-emerald-100 hover:-translate-y-0.5 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      <a
        href={`#/product/${p.id}`}
        className="relative block aspect-square bg-gray-50 overflow-hidden"
      >
        {src ? (
          <img
            src={src}
            alt={p.name}
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
            className="w-full h-full object-contain p-4 group-hover:scale-[1.04] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-gray-300 uppercase tracking-widest">
            No image
          </div>
        )}

        {discount > 0 && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
            -{discount}%
          </div>
        )}

        {available <= 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-20">
            <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest">
              Out of Stock
            </span>
          </div>
        )}
      </a>

      <div className="flex-1 flex flex-col p-3.5 pt-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 uppercase tracking-widest truncate max-w-[60%]">
            {p.category || "Grocery"}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            <svg
              className="w-3 h-3 text-amber-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-[10px] font-bold text-gray-500 tabular-nums">
              {p.averageRating?.toFixed(1) || "0.0"}
            </span>
            <span className="text-[9px] text-gray-300">
              ({p.reviewCount || 0})
            </span>
          </div>
        </div>

        <a
          href={`#/product/${p.id}`}
          className="text-[13px] font-bold text-gray-900 leading-snug mb-2 group-hover:text-emerald-700 transition-colors line-clamp-1"
        >
          {p.name}
        </a>

        <div className="mt-auto">
          <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-1 mb-2.5">
            <span className="text-base font-extrabold text-gray-900 tracking-tight tabular-nums">
              ₹{price}
            </span>
            {p.offerPrice && (
              <span className="text-[11px] font-semibold text-gray-300 line-through">
                ₹{p.price}
              </span>
            )}
            {available > 0 && available <= 5 && (
              <span className="ml-auto text-[9px] font-extrabold text-orange-500 uppercase tracking-wide whitespace-nowrap">
                Only {available} left
              </span>
            )}
          </div>

          <div className="flex items-stretch gap-2">
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden shrink-0">
              <button
                disabled={available <= 0}
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-7 h-full flex items-center justify-center font-bold text-gray-500 hover:bg-gray-50 hover:text-emerald-700 transition-colors disabled:opacity-40"
              >
                −
              </button>
              <span className="w-6 text-center font-bold text-xs text-gray-900 tabular-nums">
                {qty}
              </span>
              <button
                disabled={available <= 0}
                aria-label="Increase quantity"
                onClick={() =>
                  setQty((q) => Math.min(available || Infinity, q + 1))
                }
                className="w-7 h-full flex items-center justify-center font-bold text-gray-500 hover:bg-gray-50 hover:text-emerald-700 transition-colors disabled:opacity-40"
              >
                +
              </button>
            </div>

            <button
              onClick={() => onAdd(p, qty, false)}
              disabled={available <= 0}
              className={`flex-1 py-2 rounded-lg font-extrabold text-[10px] uppercase tracking-widest inline-flex items-center justify-center gap-1.5 transition-colors ${
                available <= 0
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800"
              }`}
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
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
