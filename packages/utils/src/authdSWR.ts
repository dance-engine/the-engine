// import useSWR from 'swr'
// import { withAuth } from '@workos-inc/authkit-nextjs';

// export default async function useAuthdSWR(url: string) {
//   const { accessToken } = await withAuth()
//   console.log("JWT:", accessToken)
  
//   const fetcher = async (url: string, config?: RequestInit): Promise<any> => {

//     // Merge the Authorization header into the config object
//     const headers = {
//       ...config?.headers, // Preserve any existing headers in the config
//       Authorization: `Bearer ${accessToken}`,
//     }

//     // Make the fetch call with the merged config
//     const response = await fetch(url, { ...config, headers })
//     return response.json()
//   }

//   return useSWR(url, fetcher)
// }