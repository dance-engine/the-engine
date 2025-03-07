import useSWR from 'swr'
import { useAuth } from '@clerk/nextjs'

export default function useClerkSWR(url: string) {
  const { getToken } = useAuth()

  const fetcher = async (...args) => {
    return fetch(...args, {
      headers: { Authorization: `Bearer ${await getToken()}` },
    }).then((res) => res.json())
  }

  return useSWR(url, fetcher)
}