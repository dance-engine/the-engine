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
import { EventType } from '@dance-engine/schemas/events';
import PassPicker from './PassPicker';
import { createEvent } from '@dance-engine/schemas/events';

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { OrganisationType } from '@dance-engine/schemas/organisation';
// Dynamically load map



const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Event({ fallbackData, org, theme, eventKsuid}: { fallbackData: EventType[], org: OrganisationType, theme: string, eventKsuid: string}) {

  const MapDisplay = useMemo(() => dynamic(
        () => import('./Map'),
        { 
          loading: () => <p className='flex items-center justify-center h-[300px] bg-gray-500'>Map loading</p>,
          ssr: false 
        }
    ), [])

  const { data: eventData, isLoading, error } = useSWR(
    `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org.organisation}/events/${eventKsuid}`,
    fetcher,
    { fallbackData }
  );

  if (isLoading || !eventKsuid || error) return <p>Loading...{theme} </p>
  let event = {} as EventType
  if(eventData?.events &&  eventData.events.length > 1) { 
    return <p>Multiple events</p> 
  } else if (eventData.event) { 
    console.log(eventData)
    event = createEvent(eventData.event)
  }
  
  // className='bg-[image:var(--image-url)]'>
  return <>
    
    <div style={{'--image-url': `url(${event.banner})`} as React.CSSProperties }  
      className={"w-full min-h-[400px] \
      flex flex-col justify-end items-center bg-de-background-dark"}>

      <div className='hero w-full bg-center bg-cover bg-contain bg-no-repeat bg-[image:var(--image-url)]  min-h-[600px] flex flex-col items-center justify-center text-white text-shadow-de-background-dark text-shadow-lg'>
        <h1 className='text-6xl font-bold uppercase text-center px-6 '>{event.name}</h1>
        <h2 className='text-2xl text-center px-6'>{format(event.starts_at,'PPP, h:mmaaa')} - {format(event.ends_at,'h:mmaaa')}</h2>
      </div>

      <div className='max-w-6xl w-full px-4 lg:px-0 pb-4 pt-12 bg-de-background-dark text-white'>
        
        <div className='grid grid-cols-1 md:grid-cols-2 mb-6 gap-6 items-start'> 

          <div className='max-w-4xl w-full px-4 lg:px-0 py-4 prose prose-invert' dangerouslySetInnerHTML={{ __html: generateHTML(JSON.parse(event.description), [ Document, Paragraph, Text,  Bold, Strike, Italic, Heading, ListItem, BulletedList, OrderedList],) }} />

          {event.location && event.location.lat && event.location.lng && <MapDisplay lat={event.location.lat} lng={event.location.lng} />  }

        </div>
        

        <PassPicker event={event} org={org}/>

        {/* <hr className='mt-6' />
        <h1 className='text-xl mt-6 mb-3'>Debug</h1>
        {org.account_id}:{theme}<br/>
        {eventKsuid}
        <pre className=' max-w-full'>{JSON.stringify(event, null, 2)}</pre> */}
      </div>
    </div>

  </>
}
