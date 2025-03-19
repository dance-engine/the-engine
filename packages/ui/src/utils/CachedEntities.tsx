'use client'
import Link from 'next/link'
const CachedEntities = ({entityType, className}: {entityType:string, className?:string}) => {
  const getEntity = (entityType: string) => {
    const cached = window.localStorage.getItem(entityType)
    return cached ? JSON.parse(cached)?.map((entry)=>{
      return JSON.parse(window.localStorage.getItem(`${entityType}#${entry}`) || '{}')
    }) : []
  }

  const entities = typeof window !== "undefined" ? getEntity(entityType): []

  return (
    <div {...(className && { className })}>
      <div className="w-full overflow-auto block ">
        <table className='block md:table w-full'>
          <thead className='hidden md:table-header-group'><th>Name</th><th>Date</th><td className='sr-only'>Actions</td></thead>
          <tbody className='grid md:table-row-group grid-col-1 gap-4 '>
          {entities.filter((enty)=>enty.name ? true : false).map((enty) => {
            return (
              <tr key={enty.ksuid} className='grid md:table-row  grid-col-1 gap-3 border border-gray-300 p-3 rounded bg-gray-50'>
                <td className='block md:table-cell p-2'>
                  <div className='md:hidden uppercase text-xs font-bold text-gray-600 dark:text-white/50 tracking-widest'>name</div> 
                  <div className='text-2xl leading-none text-gray-800'>{enty.name}</div>
                </td>
                <td className='block md:table-cell'>
                  <div className='md:hidden uppercase text-xs font-bold text-gray-600 dark:text-white/50 tracking-widest'>Start Date</div> 
                  <div className='text-lg text-gray-800'>{enty.start_date}</div>
                </td>
                <td className='flex justify-end md:table-cell'>
                  <Link href={`/${entityType.toLowerCase()}s/${enty.ksuid}`} className='py-1 px-3 bg-blue-600 text-white dark:text-black dark:bg-white/20 rounded '>Edit</Link>
                </td>
              </tr>
            ) 
          })}
          </tbody>
        </table>
        
        {/* <pre className="max-w-full whitespace-pre-wrap">
          {JSON.stringify(entities,null,2)}
        </pre> */}
      </div>
    </div>
  )
}

export default CachedEntities