'use client';
import useSWR from 'swr';
import { format } from 'date-fns'
import { generateHTML } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Strike from '@tiptap/extension-strike'
import Italic from '@tiptap/extension-italic'
import Heading  from '@tiptap/extension-heading'
import BulletedList  from '@tiptap/extension-bullet-list'
import OrderedList  from '@tiptap/extension-ordered-list'
import ListItem  from '@tiptap/extension-list-item'


const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function EventList({ fallbackData, org, theme, eventKsuid}: { fallbackData: any, org: string, theme: string, eventKsuid: string}) {
  const { data: events, isLoading, error } = useSWR(
    `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events/${eventKsuid}`,
    fetcher,
    { fallbackData }
  );

  if (isLoading || !eventKsuid || error) return <p>Loading...</p>
  let event = {} as Record<string, string> 
  if(events.length > 1) { return <p>Multiple events</p> } else { 
    event = events[0]
  }
  
  // className='bg-[image:var(--image-url)]'>
  return <>
    
    <div style={{'--image-url': `url(${event.banner})`}}  className="w-full min-h-[400px] bg-center bg-cover bg-[image:var(--image-url)] flex flex-col justify-end items-center text-white p-6">
      <div className='max-w-4xl w-4xl px-4 lg:px-0 py-4 text-shadow-lg text-shadow-black/80'>
        <h1 className='text-6xl '>{event.name}</h1>
        <p>{format(event.starts_at,'h:mm aaa PPP')}</p>
        
        {/* {org}:{theme} */}
        {/* {eventKsuid} */}
        {/* <pre className='text-white max-w-full'>{JSON.stringify(event, null, 2)}</pre> */}
      </div>
    </div>

    <div className='max-w-4xl w-4xl px-4 lg:px-0 py-4 prose' dangerouslySetInnerHTML={{ __html: generateHTML(JSON.parse(event.description), [ Document, Paragraph, Text,  Bold, Strike, Italic, Heading, ListItem, BulletedList, OrderedList],) }} />
  </>
}
