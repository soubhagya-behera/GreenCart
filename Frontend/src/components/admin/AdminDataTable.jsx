export default function AdminDataTable({
  columns,
  rows,
  keyField = "id",
  loading = false,
  error = null,
  emptyTitle = "Nothing here yet",
  emptyMessage = "Data will appear once the marketplace has activity.",
  onRetry,
  onRowClick,
}) {
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-10 text-center">
        <p className="text-sm font-black text-red-500 uppercase tracking-widest">
          {error}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-gray-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap ${
                    col.align === "right" ? "text-right" : ""
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-4">
                      <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && (rows || []).length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-300 italic">
                    {emptyTitle}
                  </p>
                  {emptyMessage && (
                    <p className="text-xs text-gray-400 mt-2">{emptyMessage}</p>
                  )}
                </td>
              </tr>
            )}

            {!loading &&
              (rows || []).map((row, idx) => (
                <tr
                  key={row[keyField] ?? idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`${
                    onRowClick ? "cursor-pointer " : ""
                  }hover:bg-emerald-50/40 transition-colors`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 align-middle ${
                        col.align === "right" ? "text-right" : ""
                      }`}
                    >
                      {col.render
                        ? col.render(row)
                        : row[col.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
