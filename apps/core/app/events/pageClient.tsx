'use client'
import dynamic from "next/dynamic";
const BasicList = dynamic(() => import('@dance-engine/ui/list/BasicList'), {
  ssr: false, // ⬅ Disables SSR for this component
});
const PageClient = ({ entity }: { entity?: string }) => {

  const getEntity = (entityType: string) => {
    const cached = window.localStorage.getItem(entityType)
    return cached ? JSON.parse(cached)?.map((entry: any)=>{
      return JSON.parse(window.localStorage.getItem(`${entityType}#${entry}`) || '{}')
    }) : []
  }

  const entities = typeof window !== "undefined" && entity ? getEntity(entity): []

  return <BasicList columns={["name","start_date","category"]} records={entities}/>
}

export default PageClient