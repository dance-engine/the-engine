export interface HereGeocodeResult {
  title: string; // Full formatted address
  id: string; // Unique identifier for the location
  resultType: string; // Type of result (e.g., "houseNumber", "street", "place", "locality")
  address: {
    label: string; // Formatted address
    countryCode: string; // Country code (e.g., "US")
    countryName: string; // Country name
    state?: string;
    county?: string;
    city?: string;
    district?: string;
    street?: string;
    postalCode?: string;
    houseNumber?: string;
  };
  position: {
    lat: number; // Latitude
    lng: number; // Longitude
  };
  access?: {
    lat: number;
    lng: number;
  }[]; // Alternative access points if available
}

export interface HereGeocodeResponse {
  items: HereGeocodeResult[]; // Array of geocoded locations
}

export interface LatLng {
  lat: number,
  lng: number
}