export const labelFromSnake = (label: string) => {
  const lowerCase = label.toLowerCase()
  const sentence = lowerCase.split("_")
  const return_sentence = sentence.map((word) => word ? word.replace(word.charAt(0), word.charAt(0).toUpperCase()) : "" ).join(" ") 
  return return_sentence
}