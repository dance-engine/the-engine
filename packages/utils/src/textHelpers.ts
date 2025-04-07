import { createElement } from 'react'
import { IoCloudDoneSharp, IoCloudOffline, IoCloudUpload } from "react-icons/io5";

export const labelFromSnake = (label: string) => {
  const lowerCase = label.toLowerCase()
  const sentence = lowerCase.split("_")
  const return_sentence = sentence.map((word) => word ? word.replace(word.charAt(0), word.charAt(0).toUpperCase()) : "" ).join(" ") 
  return return_sentence
}

export const nameFromHypenated = (name: string) => {
  const lowerCase = name.toLowerCase()
  const sentence = lowerCase.split("-")
  const return_sentence = sentence.map((word) => word ? word.replace(word.charAt(0), word.charAt(0).toUpperCase()) : "" ).join(" ") 
  return return_sentence
}

export const getIcon = (fieldValue: string | string | number | boolean | null ) => {
  switch (fieldValue) {
    case 'saved':
      return createElement('span',{ className: ''},
        createElement(IoCloudDoneSharp, { className: 'w-6 h-6' }, ''),
        createElement('span', { className: 'sr-only' }, 'Saved')
      )
    case 'failed':
      return createElement('span',{ className: ''},
        createElement(IoCloudOffline, { className: 'w-6 h-6' }, ''),
        createElement('span', { className: 'sr-only' }, 'Failed')
      )
    case 'saving':
      return createElement('span',{ className: ''},
        createElement(IoCloudUpload, { className: 'w-6 h-6 animate-pulse' }, ''),
        createElement('span', { className: 'sr-only' }, 'Sent')
      )      
    default:
      break;
  }
}

export const formatField = (fieldValue: string | string | number | boolean | null, formatAs = "default") => {
  const isTimeRelated = formatAs == 'time' || formatAs == 'date'
  const timestamp = Date.parse(fieldValue as unknown as string)
  const isDateTimeString = !isNaN(timestamp)
  const isArray = Array.isArray(fieldValue)

  if(formatAs == 'icon')
    return getIcon(fieldValue)
  else if(isTimeRelated && isDateTimeString) {
    return formatAs == 'time' ? new Date(timestamp).toLocaleTimeString() : new Date(timestamp).toLocaleDateString()
  }
  else if(isArray) {
    return fieldValue.join(', ')
  } else {
    return fieldValue
  }
}