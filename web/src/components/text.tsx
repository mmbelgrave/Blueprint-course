// Small building blocks for workbook text: paragraphs, bullet lists, fixed tables.
import { paragraphs, type Text } from "@/lib/content";

export function Paragraphs({ text, className }: { text?: Text; className?: string }) {
  return (
    <>
      {paragraphs(text).map((p) => (
        <p key={p} className={className}>
          {p}
        </p>
      ))}
    </>
  );
}

export function Bullets({ items, className = "" }: { items?: string[]; className?: string }) {
  if (!items?.length) return null;
  return (
    <ul className={`list-disc space-y-1 pl-6 ${className}`}>
      {items.map((b) => (
        <li key={b}>{b}</li>
      ))}
    </ul>
  );
}

/** A fixed content table: the first column is shown as a label. */
export function InfoTable({
  columns,
  header,
  rows,
  lead,
  after,
}: {
  columns?: string[];
  header?: string[];
  rows: string[][];
  lead?: string;
  after?: string;
  place?: "before" | "after";
}) {
  const head = header ?? columns;
  return (
    <div className="space-y-2">
      {lead && <p>{lead}</p>}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full border-collapse text-left text-[0.95rem]">
          {head && (
            <thead className="bg-sand/60 text-sm">
              <tr>
                {head.map((c, i) => (
                  <th key={`${c}-${i}`} className="p-2 pl-3 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, r) => (
              <tr key={`${row[0]}-${r}`} className="border-t border-line first:border-t-0">
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="w-1/3 p-2 pl-3 align-top font-semibold text-pine">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="p-2 align-top">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {after && <p>{after}</p>}
    </div>
  );
}
