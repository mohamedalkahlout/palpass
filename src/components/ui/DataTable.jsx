export function DataTable({ columns = [], rows = [], caption, empty }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="hidden w-full border-collapse text-sm sm:table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-muted text-foreground">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`border-b border-border px-3 py-2 text-start font-semibold ${column.numeric ? "text-end tabular-nums" : ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id || index} className={index % 2 === 1 ? "bg-muted/50" : "bg-card"}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`border-b border-border px-3 py-2 text-start ${column.numeric ? "text-end tabular-nums" : ""}`}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="grid gap-3 p-3 sm:hidden">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
        {rows.map((row, index) => (
          <article key={row.id || index} className="rounded-lg border border-border bg-card p-3">
            {columns.map((column) => (
              <p key={column.key} className="flex items-baseline justify-between gap-3 py-1 text-sm">
                <span className="text-muted-foreground">{column.header}</span>
                <span className={column.numeric ? "tabular-nums font-semibold" : "font-semibold text-end"}>
                  {row[column.key]}
                </span>
              </p>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}
