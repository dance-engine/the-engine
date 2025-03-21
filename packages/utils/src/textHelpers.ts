export const labelFromSnake = (label: string) => {
  const lowerCase = label.toLowerCase()
  const sentence = lowerCase.split("_")
  const return_sentence = sentence.map((word) => word ? word.replace(word.charAt(0), word.charAt(0).toUpperCase()) : "" ).join(" ") 
  return return_sentence
}

export const formatField = (fieldValue: string | string | number | boolean | null, formatAs = "default") => {
  const timestamp = Date.parse(fieldValue as unknown as string)
  const isDateTimeString = !isNaN(timestamp)
  const isArray = Array.isArray(fieldValue)
  if(isDateTimeString) {
    return formatAs == 'time' ? new Date(timestamp).toLocaleTimeString() : new Date(timestamp).toLocaleDateString()
  }
  else if(isArray) {
    return fieldValue.join(', ')
  } else {
    return fieldValue
  }
}