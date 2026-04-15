import { forwardRef, HTMLAttributes, ReactNode, useState } from 'react'
import { clsx } from 'clsx'
import { Button } from './Button'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (value: any, row: T) => ReactNode
  sortable?: boolean
  width?: string
}

interface TableProps<T> extends HTMLAttributes<HTMLTableElement> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string
  onSort?: (key: string, direction: 'asc' | 'desc') => void
}

type SortDirection = 'asc' | 'desc' | null

export const Table = forwardRef<HTMLTableElement, TableProps<any>>(
  ({ data, columns, loading, emptyMessage = 'No data available', onSort, className, ...props }, ref) => {
    const [sortColumn, setSortColumn] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>(null)

    const handleSort = (columnKey: string) => {
      let newDirection: SortDirection = 'asc'

      if (sortColumn === columnKey) {
        if (sortDirection === 'asc') newDirection = 'desc'
        else if (sortDirection === 'desc') newDirection = null
        else newDirection = 'asc'
      }

      setSortColumn(newDirection ? columnKey : null)
      setSortDirection(newDirection)

      if (onSort && newDirection) {
        onSort(columnKey, newDirection)
      }
    }

    const getSortIcon = (columnKey: string) => {
      if (sortColumn !== columnKey) return null

      return (
        <svg
          className={clsx(
            "w-4 h-4 ml-1 transition-transform duration-quick",
            sortDirection === 'desc' && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )
    }

    if (loading) {
      return (
        <div className="ix-glass-sovereign rounded-lg overflow-hidden">
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-quantum-white/20 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-quantum-white/20 rounded w-1/2 mx-auto"></div>
              <div className="h-4 bg-quantum-white/20 rounded w-2/3 mx-auto"></div>
            </div>
          </div>
        </div>
      )
    }

    if (data.length === 0) {
      return (
        <div className="ix-glass-sovereign rounded-lg overflow-hidden">
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-quantum-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-quantum-white/60 mb-2">
              {emptyMessage}
            </h3>
            <p className="text-quantum-white/40">
              Try adjusting your filters or check back later.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="ix-glass-sovereign rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table
            ref={ref}
            className={clsx('w-full', className)}
            {...props}
          >
            <thead>
              <tr className="border-b border-quantum-white/8">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={clsx(
                      'px-4 py-3 text-left text-xs font-medium text-quantum-white/64 uppercase tracking-wider',
                      column.sortable && 'cursor-pointer hover:text-quantum-white/80 transition-colors duration-quick',
                      column.width && `w-${column.width}`
                    )}
                    onClick={column.sortable ? () => handleSort(String(column.key)) : undefined}
                  >
                    <div className="flex items-center">
                      {column.header}
                      {column.sortable && getSortIcon(String(column.key))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-quantum-white/6">
              {data.map((row, index) => (
                <tr
                  key={index}
                  className="hover:bg-quantum-white/4 transition-colors duration-quick"
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className="px-4 py-3 text-sm text-quantum-white"
                    >
                      {column.render
                        ? column.render(row[column.key as keyof typeof row], row)
                        : String(row[column.key as keyof typeof row] || '')
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
)

Table.displayName = 'Table'