import { useEffect, useState } from "react";
import { assets } from "../assets/greencart/greencart_assets/assets";

// Since assets.main_banner_bg was used before, we'll create a local reference for our new images
const slides = [
  {
    image: "/hero_banner.png"
  }
];

export default function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 md:px-6 pt-4 pb-2 md:pt-6">
        {/* Container keeps the artwork's native aspect ratio (1659×948),
            so the complete banner is always visible — never cropped,
            never stretched — at every viewport width. */}
        <div
          className="relative w-full overflow-hidden rounded-2xl shadow-md ring-1 ring-gray-100 bg-white"
          style={{ aspectRatio: "1659 / 948" }}
        >
          {slides.map((slide, idx) => (
            <img
              key={idx}
              src={slide.image}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                idx === current ? "opacity-100 z-10" : "opacity-0 z-0 invisible"
              }`}
              onError={(e) => {
                e.currentTarget.src = assets.main_banner_bg;
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
