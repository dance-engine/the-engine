import useSWR from 'swr'
import { useAuth } from '@clerk/nextjs'

export default function useClerkSWR(url: string) {
  const { getToken } = useAuth()

  const fetcher = async (url: string, config?: RequestInit): Promise<any> => {
    const token = await getToken()

    // Merge the Authorization header into the config object
    const headers = {
      ...config?.headers, // Preserve any existing headers in the config
      Authorization: `Bearer ${token}`,
    }

    // Make the fetch call with the merged config
    const response = await fetch(url, { ...config, headers })
    return response.json()
  }

  return useSWR(url, fetcher)
}