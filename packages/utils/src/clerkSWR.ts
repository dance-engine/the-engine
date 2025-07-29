import useSWR from 'swr'
import { useAuth } from '@clerk/nextjs'

export class CorsError extends Error {
  constructor(message = "CORS error") {
    super(message);
    this.name = "CorsError";
  }
}

export default function useClerkSWR(url: string, swrConfig = {}) {
  const { getToken } = useAuth()

  // const fetcher = async (url: string, config?: RequestInit): Promise<any> => {
  const fetcher = async (url: string): Promise<any> => {
    const token = await getToken()

    // Merge the Authorization header into the config object
    const headers = {
      // ...config?.headers, // Preserve any existing headers in the config
      Authorization: `Bearer ${token}`,
    }

    // Make the fetch call with the merged config
    try {
      const response = await fetch(url, {headers})
      if (!response.ok) {
        if(response.status == 404 ) {
          console.log("Not Found response:", response.status)
        } else {
          console.log("Non-OK response:", response.status)
          throw new Error(`Bad status: ${response.status}`);
        }
      }
      return await response.json()
    } catch (err: any) {
      if (err instanceof TypeError && /NetworkError/.test(err.message)) {
        console.error("Possibly a CORS or network issue", err, err.message);
        throw new CorsError();
      }
      throw err
    }
  }

  const Brokefetcher = async () => {
    throw new CorsError("Fake CORS")
  }

  const response = useSWR(url, fetcher, swrConfig)
  return response
}