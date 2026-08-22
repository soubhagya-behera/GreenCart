const ROLE_STYLES = {
  admin: "bg-purple-50 text-purple-600 border-purple-100",
  seller: "bg-emerald-50 text-emerald-600 border-emerald-100",
  delivery: "bg-blue-50 text-blue-600 border-blue-100",
  user: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function RoleBadge({ role }) {
  const key = String(role ?? "user").toLowerCase();
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${
        ROLE_STYLES[key] || ROLE_STYLES.user
      }`}
    >
      {key}
    </span>
  );
}
