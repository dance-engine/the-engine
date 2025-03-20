'use client'
import Link from 'next/link'
import { BasicListProps } from '@dance-engine/ui/types' 
import { labelFromSnake } from '../../../utils/dist/textHelpers'

const BasicList: React.FC<BasicListProps<React.HTMLAttributes<HTMLTableElement>>> = ({ columns, records, ...tableProps}: BasicListProps<React.HTMLAttributes<HTMLTableElement>>) => {
  const firstHeaderClasses = "pr-3 pl-4 sm:pl-4 lg:pl-8"
  const restHeaderClasses = "px-3"
  const allHeaderClasses = "py-3.5 text-left text-sm font-semibold text-gray-900"
  return (
  <div className='w-full'>
    {/* {columns} */}
    <div className="mt-4 flow-root">
      <div className="relative">
        <div className="inline-block min-w-full py-2 align-middle">
          <table className="min-w-full divide-y divide-gray-300 " {...tableProps}>
            <thead className=''>
              <tr className='sticky top-16 '>
                { columns.map((col,idx) => {
                                      
                  return <th key={`${col}-key`} scope="col" className={[(idx == 0 ? firstHeaderClasses : restHeaderClasses), allHeaderClasses,"bg-dark-highlight/90  text-white"].join(' ')} >
                    {/* return <th key={`${col}-key`} scope="col" className="sticky top-0 z-10 border-b border-gray-300 bg-white/75 py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 backdrop-blur-sm backdrop-filter sm:pl-6 lg:pl-8"> */}
                    {labelFromSnake(col)}
                  </th>
                }) }
                <th scope="col" className="py-3.5 pr-4 pl-3l sm:pr-6 lg:pr-8 bg-dark-highlight/90 text-white">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {records.map((record)=>{
                return <tr key={`${record.ksuid}`}>
                  {
                    columns.map((col,idx)=>{
                      return <td key={`${record.ksuid}-${col}`} className={[(idx == 0 ? firstHeaderClasses : restHeaderClasses), allHeaderClasses].join(' ')}>
                        {record[col] || "-"}
                      </td>
                    })
                  }
                  <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6 lg:pr-8 ">
                  <Link href={`/events/${record.ksuid}`} className="text-dark-highlight hover:text-dark-highlight">
                    Edit<span className="sr-only">, {record.name}</span>
                  </Link>
                </td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  )
}

export default BasicList