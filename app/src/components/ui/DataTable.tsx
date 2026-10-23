import React from 'react';

interface Column<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyState,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <div className="p-8 text-center text-[#6B7A72] text-[14px]">{emptyState}</div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse text-[14px]">
        <thead>
          <tr className="border-b border-[#E5E9E7] text-[12px] font-medium text-[#6B7A72] tracking-normal">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`py-3 px-4 font-medium select-none ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E9E7]/60">
          {data.map((item, rowIndex) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={`transition-colors duration-150 rounded-lg hover:bg-[#E3F2EA]/40 ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={`py-3.5 px-4 text-[#14201A] ${col.className || ''}`}>
                  {col.cell
                    ? col.cell(item, rowIndex)
                    : col.accessorKey
                    ? (item[col.accessorKey] as React.ReactNode)
                    : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
