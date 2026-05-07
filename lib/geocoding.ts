// Geocoding and distance calculation utilities
export interface Coordinates {
  latitude: number
  longitude: number
}

export interface LocationData {
  city?: string
  state?: string
  country?: string
  coordinates?: Coordinates
}

// Haversine formula to calculate distance between two points on Earth
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRadians(coord2.latitude - coord1.latitude)
  const dLon = toRadians(coord2.longitude - coord1.longitude)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Optimized ZIP code range lookup using binary search approach
function getStateFromZipRange(zipNum: number): string | undefined {
  // Sorted ZIP code ranges for efficient lookup
  const zipRanges = [
    { min: 1001, max: 5544, state: 'MA' },
    { min: 6001, max: 6928, state: 'CT' },
    { min: 7001, max: 8989, state: 'NJ' },
    { min: 10001, max: 14975, state: 'NY' },
    { min: 15001, max: 19640, state: 'PA' },
    { min: 20001, max: 20599, state: 'DC' },
    { min: 21001, max: 21930, state: 'MD' },
    { min: 22001, max: 24658, state: 'VA' },
    { min: 25001, max: 26886, state: 'WV' },
    { min: 27001, max: 28909, state: 'NC' },
    { min: 29001, max: 29948, state: 'SC' },
    { min: 30001, max: 31999, state: 'GA' },
    { min: 32001, max: 34997, state: 'FL' },
    { min: 35001, max: 36925, state: 'AL' },
    { min: 37001, max: 38589, state: 'TN' },
    { min: 39001, max: 39776, state: 'MS' },
    { min: 40001, max: 42788, state: 'KY' },
    { min: 43001, max: 45999, state: 'OH' },
    { min: 46001, max: 47997, state: 'IN' },
    { min: 48001, max: 49971, state: 'MI' },
    { min: 50001, max: 52809, state: 'IA' },
    { min: 53001, max: 54990, state: 'WI' },
    { min: 55001, max: 56763, state: 'MN' },
    { min: 57001, max: 57799, state: 'SD' },
    { min: 58001, max: 58856, state: 'ND' },
    { min: 59001, max: 59937, state: 'MT' },
    { min: 60001, max: 62999, state: 'IL' },
    { min: 63001, max: 65899, state: 'MO' },
    { min: 66001, max: 67954, state: 'KS' },
    { min: 68001, max: 69367, state: 'NE' },
    { min: 70001, max: 71497, state: 'LA' },
    { min: 72001, max: 72959, state: 'AR' },
    { min: 73001, max: 74966, state: 'OK' },
    { min: 75001, max: 79999, state: 'TX' },
    { min: 80001, max: 81658, state: 'CO' },
    { min: 82001, max: 83414, state: 'WY' },
    { min: 83001, max: 83876, state: 'ID' },
    { min: 84001, max: 84784, state: 'UT' },
    { min: 85001, max: 86556, state: 'AZ' },
    { min: 87001, max: 88441, state: 'NM' },
    { min: 89001, max: 89883, state: 'NV' },
    { min: 90001, max: 96162, state: 'CA' },
    { min: 96701, max: 96898, state: 'HI' },
    { min: 97001, max: 97920, state: 'OR' },
    { min: 98001, max: 99403, state: 'WA' },
    { min: 99501, max: 99950, state: 'AK' }
  ]
  
  // Binary search for efficient lookup
  let left = 0
  let right = zipRanges.length - 1
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const range = zipRanges[mid]
    
    if (zipNum >= range.min && zipNum <= range.max) {
      return range.state
    } else if (zipNum < range.min) {
      right = mid - 1
    } else {
      left = mid + 1
    }
  }
  
  return undefined
}

// Major US cities and states coordinates database
export const locationCoordinates: Record<string, Coordinates> = {
  // California cities
  'los angeles, california': { latitude: 34.0522, longitude: -118.2437 },
  'san francisco, california': { latitude: 37.7749, longitude: -122.4194 },
  'san diego, california': { latitude: 32.7157, longitude: -117.1611 },
  'sacramento, california': { latitude: 38.5816, longitude: -121.4944 },
  'fresno, california': { latitude: 36.7378, longitude: -119.7871 },
  'irvine, california': { latitude: 33.6846, longitude: -117.8265 },
  'california': { latitude: 36.7783, longitude: -119.4179 }, // Center of California
  
  // Other major cities
  'new york, new york': { latitude: 40.7128, longitude: -74.0060 },
  'chicago, illinois': { latitude: 41.8781, longitude: -87.6298 },
  'houston, texas': { latitude: 29.7604, longitude: -95.3698 },
  'phoenix, arizona': { latitude: 33.4484, longitude: -112.0740 },
  'philadelphia, pennsylvania': { latitude: 39.9526, longitude: -75.1652 },
  'san antonio, texas': { latitude: 29.4241, longitude: -98.4936 },
  'dallas, texas': { latitude: 32.7767, longitude: -96.7970 },
  'austin, texas': { latitude: 30.2672, longitude: -97.7431 },
  'jacksonville, florida': { latitude: 30.3322, longitude: -81.6557 },
  'fort worth, texas': { latitude: 32.7555, longitude: -97.3308 },
  'columbus, ohio': { latitude: 39.9612, longitude: -82.9988 },
  'charlotte, north carolina': { latitude: 35.2271, longitude: -80.8431 },
  'seattle, washington': { latitude: 47.6062, longitude: -122.3321 },
  'denver, colorado': { latitude: 39.7392, longitude: -104.9903 },
  'boston, massachusetts': { latitude: 42.3601, longitude: -71.0589 },
  'detroit, michigan': { latitude: 42.3314, longitude: -83.0458 },
  'nashville, tennessee': { latitude: 36.1627, longitude: -86.7816 },
  'memphis, tennessee': { latitude: 35.1495, longitude: -90.0490 },
  'portland, oregon': { latitude: 45.5152, longitude: -122.6784 },
  'las vegas, nevada': { latitude: 36.1699, longitude: -115.1398 },
  'louisville, kentucky': { latitude: 38.2527, longitude: -85.7585 },
  'baltimore, maryland': { latitude: 39.2904, longitude: -76.6122 },
  'milwaukee, wisconsin': { latitude: 43.0389, longitude: -87.9065 },
  'albuquerque, new mexico': { latitude: 35.0844, longitude: -106.6504 },
  'tucson, arizona': { latitude: 32.2226, longitude: -110.9747 },
  'atlanta, georgia': { latitude: 33.7490, longitude: -84.3880 },
  'miami, florida': { latitude: 25.7617, longitude: -80.1918 },
  'mobile, alabama': { latitude: 30.6954, longitude: -88.0399 },
  'birmingham, alabama': { latitude: 33.5186, longitude: -86.8104 },
  'huntsville, alabama': { latitude: 34.7304, longitude: -86.5861 },
  'montgomery, alabama': { latitude: 32.3668, longitude: -86.3000 },
  'orlando, florida': { latitude: 28.5383, longitude: -81.3792 },
  'tampa, florida': { latitude: 27.9506, longitude: -82.4572 },
  'fort lauderdale, florida': { latitude: 26.1224, longitude: -80.1373 },
  'st. petersburg, florida': { latitude: 27.7676, longitude: -82.6403 },
  'tallahassee, florida': { latitude: 30.4518, longitude: -84.2807 },
  'gainesville, florida': { latitude: 29.6516, longitude: -82.3248 },
  
  // States (center coordinates)
  'alabama': { latitude: 32.3617, longitude: -86.2792 },
  'alaska': { latitude: 64.0685, longitude: -152.2782 },
  'arizona': { latitude: 34.2744, longitude: -111.2847 },
  'arkansas': { latitude: 34.8938, longitude: -92.4426 },
  'colorado': { latitude: 39.0646, longitude: -105.3272 },
  'connecticut': { latitude: 41.5834, longitude: -72.7622 },
  'delaware': { latitude: 39.1612, longitude: -75.5264 },
  'florida': { latitude: 27.7663, longitude: -81.6868 },
  'georgia': { latitude: 33.2490, longitude: -83.4426 },
  'hawaii': { latitude: 21.1098, longitude: -157.5311 },
  'idaho': { latitude: 44.2394, longitude: -114.5103 },
  'illinois': { latitude: 40.3363, longitude: -89.0022 },
  'indiana': { latitude: 39.8647, longitude: -86.2604 },
  'iowa': { latitude: 42.0046, longitude: -93.2140 },
  'kansas': { latitude: 38.5111, longitude: -96.8005 },
  'kentucky': { latitude: 37.6690, longitude: -84.6514 },
  'louisiana': { latitude: 31.1801, longitude: -91.8749 },
  'maine': { latitude: 44.6074, longitude: -69.3977 },
  'maryland': { latitude: 39.0724, longitude: -76.7902 },
  'massachusetts': { latitude: 42.2373, longitude: -71.5314 },
  'michigan': { latitude: 43.3266, longitude: -84.5361 },
  'minnesota': { latitude: 45.7326, longitude: -93.9196 },
  'mississippi': { latitude: 32.7364, longitude: -89.6678 },
  'missouri': { latitude: 38.4623, longitude: -92.3020 },
  'montana': { latitude: 47.0527, longitude: -110.2148 },
  'nebraska': { latitude: 41.1289, longitude: -98.2883 },
  'nevada': { latitude: 38.4199, longitude: -117.1219 },
  'new hampshire': { latitude: 43.4108, longitude: -71.5653 },
  'new jersey': { latitude: 40.3140, longitude: -74.5089 },
  'new mexico': { latitude: 34.8375, longitude: -106.2371 },
  'new york': { latitude: 42.1497, longitude: -74.9384 },
  'north carolina': { latitude: 35.6411, longitude: -79.8431 },
  'north dakota': { latitude: 47.5362, longitude: -99.7930 },
  'ohio': { latitude: 40.3736, longitude: -82.7755 },
  'oklahoma': { latitude: 35.5376, longitude: -96.9247 },
  'oregon': { latitude: 44.5672, longitude: -122.1269 },
  'pennsylvania': { latitude: 40.5773, longitude: -77.2640 },
  'rhode island': { latitude: 41.6772, longitude: -71.5101 },
  'south carolina': { latitude: 33.8191, longitude: -80.9066 },
  'south dakota': { latitude: 44.2853, longitude: -99.4632 },
  'tennessee': { latitude: 35.7449, longitude: -86.7489 },
  'texas': { latitude: 31.1060, longitude: -97.6475 },
  'utah': { latitude: 40.1135, longitude: -111.8535 },
  'vermont': { latitude: 44.0407, longitude: -72.7093 },
  'virginia': { latitude: 37.7680, longitude: -78.2057 },
  'washington': { latitude: 47.3917, longitude: -121.5708 },
  'west virginia': { latitude: 38.4680, longitude: -80.9696 },
  'wisconsin': { latitude: 44.2619, longitude: -89.6165 },
  'wyoming': { latitude: 42.7475, longitude: -107.2085 }
}

// ZIP code to city/state mapping for common ZIP codes
export const zipCodeMapping: Record<string, { city: string, state: string }> = {
  // California
  '90210': { city: 'Beverly Hills', state: 'CA' },
  '94102': { city: 'San Francisco', state: 'CA' },
  '94103': { city: 'San Francisco', state: 'CA' },
  '94104': { city: 'San Francisco', state: 'CA' },
  '94105': { city: 'San Francisco', state: 'CA' },
  '94107': { city: 'San Francisco', state: 'CA' },
  '94108': { city: 'San Francisco', state: 'CA' },
  '94109': { city: 'San Francisco', state: 'CA' },
  '94110': { city: 'San Francisco', state: 'CA' },
  '94111': { city: 'San Francisco', state: 'CA' },
  '94112': { city: 'San Francisco', state: 'CA' },
  '94114': { city: 'San Francisco', state: 'CA' },
  '94115': { city: 'San Francisco', state: 'CA' },
  '94116': { city: 'San Francisco', state: 'CA' },
  '94117': { city: 'San Francisco', state: 'CA' },
  '94118': { city: 'San Francisco', state: 'CA' },
  '94121': { city: 'San Francisco', state: 'CA' },
  '94122': { city: 'San Francisco', state: 'CA' },
  '94123': { city: 'San Francisco', state: 'CA' },
  '94124': { city: 'San Francisco', state: 'CA' },
  '94127': { city: 'San Francisco', state: 'CA' },
  '94131': { city: 'San Francisco', state: 'CA' },
  '94132': { city: 'San Francisco', state: 'CA' },
  '94133': { city: 'San Francisco', state: 'CA' },
  '94134': { city: 'San Francisco', state: 'CA' },
  '90001': { city: 'Los Angeles', state: 'CA' },
  '90002': { city: 'Los Angeles', state: 'CA' },
  '90003': { city: 'Los Angeles', state: 'CA' },
  '90004': { city: 'Los Angeles', state: 'CA' },
  '90005': { city: 'Los Angeles', state: 'CA' },
  '90006': { city: 'Los Angeles', state: 'CA' },
  '90007': { city: 'Los Angeles', state: 'CA' },
  '90008': { city: 'Los Angeles', state: 'CA' },
  '90010': { city: 'Los Angeles', state: 'CA' },
  '90011': { city: 'Los Angeles', state: 'CA' },
  '90012': { city: 'Los Angeles', state: 'CA' },
  '90013': { city: 'Los Angeles', state: 'CA' },
  '90014': { city: 'Los Angeles', state: 'CA' },
  '90015': { city: 'Los Angeles', state: 'CA' },
  '90016': { city: 'Los Angeles', state: 'CA' },
  '90017': { city: 'Los Angeles', state: 'CA' },
  '90018': { city: 'Los Angeles', state: 'CA' },
  '90019': { city: 'Los Angeles', state: 'CA' },
  '90020': { city: 'Los Angeles', state: 'CA' },
  '90021': { city: 'Los Angeles', state: 'CA' },
  '90022': { city: 'Los Angeles', state: 'CA' },
  '90023': { city: 'Los Angeles', state: 'CA' },
  '90024': { city: 'Los Angeles', state: 'CA' },
  '90025': { city: 'Los Angeles', state: 'CA' },
  '90026': { city: 'Los Angeles', state: 'CA' },
  '90027': { city: 'Los Angeles', state: 'CA' },
  '90028': { city: 'Los Angeles', state: 'CA' },
  '90029': { city: 'Los Angeles', state: 'CA' },
  '90031': { city: 'Los Angeles', state: 'CA' },
  '90032': { city: 'Los Angeles', state: 'CA' },
  '90033': { city: 'Los Angeles', state: 'CA' },
  '90034': { city: 'Los Angeles', state: 'CA' },
  '90035': { city: 'Los Angeles', state: 'CA' },
  '90036': { city: 'Los Angeles', state: 'CA' },
  '90037': { city: 'Los Angeles', state: 'CA' },
  '90038': { city: 'Los Angeles', state: 'CA' },
  '90039': { city: 'Los Angeles', state: 'CA' },
  '90040': { city: 'Los Angeles', state: 'CA' },
  '90041': { city: 'Los Angeles', state: 'CA' },
  '90042': { city: 'Los Angeles', state: 'CA' },
  '90043': { city: 'Los Angeles', state: 'CA' },
  '90044': { city: 'Los Angeles', state: 'CA' },
  '90045': { city: 'Los Angeles', state: 'CA' },
  '90046': { city: 'Los Angeles', state: 'CA' },
  '90047': { city: 'Los Angeles', state: 'CA' },
  '90048': { city: 'Los Angeles', state: 'CA' },
  '90049': { city: 'Los Angeles', state: 'CA' },
  '90056': { city: 'Los Angeles', state: 'CA' },
  '90057': { city: 'Los Angeles', state: 'CA' },
  '90058': { city: 'Los Angeles', state: 'CA' },
  '90059': { city: 'Los Angeles', state: 'CA' },
  '90061': { city: 'Los Angeles', state: 'CA' },
  '90062': { city: 'Los Angeles', state: 'CA' },
  '90063': { city: 'Los Angeles', state: 'CA' },
  '90064': { city: 'Los Angeles', state: 'CA' },
  '90065': { city: 'Los Angeles', state: 'CA' },
  '90066': { city: 'Los Angeles', state: 'CA' },
  '90067': { city: 'Los Angeles', state: 'CA' },
  '90068': { city: 'Los Angeles', state: 'CA' },
  '90069': { city: 'Los Angeles', state: 'CA' },
  '90071': { city: 'Los Angeles', state: 'CA' },
  '90073': { city: 'Los Angeles', state: 'CA' },
  '90077': { city: 'Los Angeles', state: 'CA' },
  '90089': { city: 'Los Angeles', state: 'CA' },
  '90094': { city: 'Los Angeles', state: 'CA' },
  '90095': { city: 'Los Angeles', state: 'CA' },
  
  // New York
  '10001': { city: 'New York', state: 'NY' },
  '10002': { city: 'New York', state: 'NY' },
  '10003': { city: 'New York', state: 'NY' },
  '10004': { city: 'New York', state: 'NY' },
  '10005': { city: 'New York', state: 'NY' },
  '10006': { city: 'New York', state: 'NY' },
  '10007': { city: 'New York', state: 'NY' },
  '10008': { city: 'New York', state: 'NY' },
  '10009': { city: 'New York', state: 'NY' },
  '10010': { city: 'New York', state: 'NY' },
  '10011': { city: 'New York', state: 'NY' },
  '10012': { city: 'New York', state: 'NY' },
  '10013': { city: 'New York', state: 'NY' },
  '10014': { city: 'New York', state: 'NY' },
  '10016': { city: 'New York', state: 'NY' },
  '10017': { city: 'New York', state: 'NY' },
  '10018': { city: 'New York', state: 'NY' },
  '10019': { city: 'New York', state: 'NY' },
  '10020': { city: 'New York', state: 'NY' },
  '10021': { city: 'New York', state: 'NY' },
  '10022': { city: 'New York', state: 'NY' },
  '10023': { city: 'New York', state: 'NY' },
  '10024': { city: 'New York', state: 'NY' },
  '10025': { city: 'New York', state: 'NY' },
  '10026': { city: 'New York', state: 'NY' },
  '10027': { city: 'New York', state: 'NY' },
  '10028': { city: 'New York', state: 'NY' },
  '10029': { city: 'New York', state: 'NY' },
  '10030': { city: 'New York', state: 'NY' },
  '10031': { city: 'New York', state: 'NY' },
  '10032': { city: 'New York', state: 'NY' },
  '10033': { city: 'New York', state: 'NY' },
  '10034': { city: 'New York', state: 'NY' },
  '10035': { city: 'New York', state: 'NY' },
  '10036': { city: 'New York', state: 'NY' },
  '10037': { city: 'New York', state: 'NY' },
  '10038': { city: 'New York', state: 'NY' },
  '10039': { city: 'New York', state: 'NY' },
  '10040': { city: 'New York', state: 'NY' },
  
  // Texas
  '77001': { city: 'Houston', state: 'TX' },
  '77002': { city: 'Houston', state: 'TX' },
  '77003': { city: 'Houston', state: 'TX' },
  '77004': { city: 'Houston', state: 'TX' },
  '77005': { city: 'Houston', state: 'TX' },
  '77006': { city: 'Houston', state: 'TX' },
  '77007': { city: 'Houston', state: 'TX' },
  '77008': { city: 'Houston', state: 'TX' },
  '77009': { city: 'Houston', state: 'TX' },
  '77010': { city: 'Houston', state: 'TX' },
  '77011': { city: 'Houston', state: 'TX' },
  '77012': { city: 'Houston', state: 'TX' },
  '77013': { city: 'Houston', state: 'TX' },
  '77014': { city: 'Houston', state: 'TX' },
  '77015': { city: 'Houston', state: 'TX' },
  '77016': { city: 'Houston', state: 'TX' },
  '77017': { city: 'Houston', state: 'TX' },
  '77018': { city: 'Houston', state: 'TX' },
  '77019': { city: 'Houston', state: 'TX' },
  '77020': { city: 'Houston', state: 'TX' },
  '77021': { city: 'Houston', state: 'TX' },
  '77022': { city: 'Houston', state: 'TX' },
  '77023': { city: 'Houston', state: 'TX' },
  '77024': { city: 'Houston', state: 'TX' },
  '77025': { city: 'Houston', state: 'TX' },
  '77026': { city: 'Houston', state: 'TX' },
  '77027': { city: 'Houston', state: 'TX' },
  '77028': { city: 'Houston', state: 'TX' },
  '77029': { city: 'Houston', state: 'TX' },
  '77030': { city: 'Houston', state: 'TX' },
  '77031': { city: 'Houston', state: 'TX' },
  '77032': { city: 'Houston', state: 'TX' },
  '77033': { city: 'Houston', state: 'TX' },
  '77034': { city: 'Houston', state: 'TX' },
  '77035': { city: 'Houston', state: 'TX' },
  '77036': { city: 'Houston', state: 'TX' },
  '77037': { city: 'Houston', state: 'TX' },
  '77038': { city: 'Houston', state: 'TX' },
  '77039': { city: 'Houston', state: 'TX' },
  '77040': { city: 'Houston', state: 'TX' },
  '77041': { city: 'Houston', state: 'TX' },
  '77042': { city: 'Houston', state: 'TX' },
  '77043': { city: 'Houston', state: 'TX' },
  '77044': { city: 'Houston', state: 'TX' },
  '77045': { city: 'Houston', state: 'TX' },
  '77046': { city: 'Houston', state: 'TX' },
  '77047': { city: 'Houston', state: 'TX' },
  '77048': { city: 'Houston', state: 'TX' },
  '77049': { city: 'Houston', state: 'TX' },
  '77050': { city: 'Houston', state: 'TX' },
  '77051': { city: 'Houston', state: 'TX' },
  '77052': { city: 'Houston', state: 'TX' },
  '77053': { city: 'Houston', state: 'TX' },
  '77054': { city: 'Houston', state: 'TX' },
  '77055': { city: 'Houston', state: 'TX' },
  '77056': { city: 'Houston', state: 'TX' },
  '77057': { city: 'Houston', state: 'TX' },
  '77058': { city: 'Houston', state: 'TX' },
  '77059': { city: 'Houston', state: 'TX' },
  '77060': { city: 'Houston', state: 'TX' },
  '77061': { city: 'Houston', state: 'TX' },
  '77062': { city: 'Houston', state: 'TX' },
  '77063': { city: 'Houston', state: 'TX' },
  '77064': { city: 'Houston', state: 'TX' },
  '77065': { city: 'Houston', state: 'TX' },
  '77066': { city: 'Houston', state: 'TX' },
  '77067': { city: 'Houston', state: 'TX' },
  '77068': { city: 'Houston', state: 'TX' },
  '77069': { city: 'Houston', state: 'TX' },
  '77070': { city: 'Houston', state: 'TX' },
  '77071': { city: 'Houston', state: 'TX' },
  '77072': { city: 'Houston', state: 'TX' },
  '77073': { city: 'Houston', state: 'TX' },
  '77074': { city: 'Houston', state: 'TX' },
  '77075': { city: 'Houston', state: 'TX' },
  '77076': { city: 'Houston', state: 'TX' },
  '77077': { city: 'Houston', state: 'TX' },
  '77078': { city: 'Houston', state: 'TX' },
  '77079': { city: 'Houston', state: 'TX' },
  '77080': { city: 'Houston', state: 'TX' },
  '77081': { city: 'Houston', state: 'TX' },
  '77082': { city: 'Houston', state: 'TX' },
  '77083': { city: 'Houston', state: 'TX' },
  '77084': { city: 'Houston', state: 'TX' },
  '77085': { city: 'Houston', state: 'TX' },
  '77086': { city: 'Houston', state: 'TX' },
  '77087': { city: 'Houston', state: 'TX' },
  '77088': { city: 'Houston', state: 'TX' },
  '77089': { city: 'Houston', state: 'TX' },
  '77090': { city: 'Houston', state: 'TX' },
  '77091': { city: 'Houston', state: 'TX' },
  '77092': { city: 'Houston', state: 'TX' },
  '77093': { city: 'Houston', state: 'TX' },
  '77094': { city: 'Houston', state: 'TX' },
  '77095': { city: 'Houston', state: 'TX' },
  '77096': { city: 'Houston', state: 'TX' },
  '77097': { city: 'Houston', state: 'TX' },
  '77098': { city: 'Houston', state: 'TX' },
  '77099': { city: 'Houston', state: 'TX' },
  
  // Illinois
  '60601': { city: 'Chicago', state: 'IL' },
  '60602': { city: 'Chicago', state: 'IL' },
  '60603': { city: 'Chicago', state: 'IL' },
  '60604': { city: 'Chicago', state: 'IL' },
  '60605': { city: 'Chicago', state: 'IL' },
  '60606': { city: 'Chicago', state: 'IL' },
  '60607': { city: 'Chicago', state: 'IL' },
  '60608': { city: 'Chicago', state: 'IL' },
  '60609': { city: 'Chicago', state: 'IL' },
  '60610': { city: 'Chicago', state: 'IL' },
  '60611': { city: 'Chicago', state: 'IL' },
  '60612': { city: 'Chicago', state: 'IL' },
  '60613': { city: 'Chicago', state: 'IL' },
  '60614': { city: 'Chicago', state: 'IL' },
  '60615': { city: 'Chicago', state: 'IL' },
  '60616': { city: 'Chicago', state: 'IL' },
  '60617': { city: 'Chicago', state: 'IL' },
  '60618': { city: 'Chicago', state: 'IL' },
  '60619': { city: 'Chicago', state: 'IL' },
  '60620': { city: 'Chicago', state: 'IL' },
  '60621': { city: 'Chicago', state: 'IL' },
  '60622': { city: 'Chicago', state: 'IL' },
  '60623': { city: 'Chicago', state: 'IL' },
  '60624': { city: 'Chicago', state: 'IL' },
  '60625': { city: 'Chicago', state: 'IL' },
  '60626': { city: 'Chicago', state: 'IL' },
  '60628': { city: 'Chicago', state: 'IL' },
  '60629': { city: 'Chicago', state: 'IL' },
  '60630': { city: 'Chicago', state: 'IL' },
  '60631': { city: 'Chicago', state: 'IL' },
  '60632': { city: 'Chicago', state: 'IL' },
  '60633': { city: 'Chicago', state: 'IL' },
  '60634': { city: 'Chicago', state: 'IL' },
  '60636': { city: 'Chicago', state: 'IL' },
  '60637': { city: 'Chicago', state: 'IL' },
  '60638': { city: 'Chicago', state: 'IL' },
  '60639': { city: 'Chicago', state: 'IL' },
  '60640': { city: 'Chicago', state: 'IL' },
  '60641': { city: 'Chicago', state: 'IL' },
  '60642': { city: 'Chicago', state: 'IL' },
  '60643': { city: 'Chicago', state: 'IL' },
  '60644': { city: 'Chicago', state: 'IL' },
  '60645': { city: 'Chicago', state: 'IL' },
  '60646': { city: 'Chicago', state: 'IL' },
  '60647': { city: 'Chicago', state: 'IL' },
  '60649': { city: 'Chicago', state: 'IL' },
  '60651': { city: 'Chicago', state: 'IL' },
  '60652': { city: 'Chicago', state: 'IL' },
  '60653': { city: 'Chicago', state: 'IL' },
  '60654': { city: 'Chicago', state: 'IL' },
  '60655': { city: 'Chicago', state: 'IL' },
  '60656': { city: 'Chicago', state: 'IL' },
  '60657': { city: 'Chicago', state: 'IL' },
  '60659': { city: 'Chicago', state: 'IL' },
  '60660': { city: 'Chicago', state: 'IL' },
  '60661': { city: 'Chicago', state: 'IL' },
  '60664': { city: 'Chicago', state: 'IL' },
  '60666': { city: 'Chicago', state: 'IL' },
  '60668': { city: 'Chicago', state: 'IL' },
  '60669': { city: 'Chicago', state: 'IL' },
  '60670': { city: 'Chicago', state: 'IL' },
  '60673': { city: 'Chicago', state: 'IL' },
  '60674': { city: 'Chicago', state: 'IL' },
  '60675': { city: 'Chicago', state: 'IL' },
  '60677': { city: 'Chicago', state: 'IL' },
  '60678': { city: 'Chicago', state: 'IL' },
  '60680': { city: 'Chicago', state: 'IL' },
  '60681': { city: 'Chicago', state: 'IL' },
  '60682': { city: 'Chicago', state: 'IL' },
  '60684': { city: 'Chicago', state: 'IL' },
  '60685': { city: 'Chicago', state: 'IL' },
  '60686': { city: 'Chicago', state: 'IL' },
  '60687': { city: 'Chicago', state: 'IL' },
  '60688': { city: 'Chicago', state: 'IL' },
  '60689': { city: 'Chicago', state: 'IL' },
  '60690': { city: 'Chicago', state: 'IL' },
  '60691': { city: 'Chicago', state: 'IL' },
  '60693': { city: 'Chicago', state: 'IL' },
  '60694': { city: 'Chicago', state: 'IL' },
  '60695': { city: 'Chicago', state: 'IL' },
  '60696': { city: 'Chicago', state: 'IL' },
  '60697': { city: 'Chicago', state: 'IL' },
  '60699': { city: 'Chicago', state: 'IL' },
  
  // Washington State (Seattle area)
  '98101': { city: 'Seattle', state: 'WA' },
  '98102': { city: 'Seattle', state: 'WA' },
  '98103': { city: 'Seattle', state: 'WA' },
  '98104': { city: 'Seattle', state: 'WA' },
  '98105': { city: 'Seattle', state: 'WA' },
  '98106': { city: 'Seattle', state: 'WA' },
  '98107': { city: 'Seattle', state: 'WA' },
  '98108': { city: 'Seattle', state: 'WA' },
  '98109': { city: 'Seattle', state: 'WA' },
  '98110': { city: 'Bainbridge Island', state: 'WA' },
  '98111': { city: 'Seattle', state: 'WA' },
  '98112': { city: 'Seattle', state: 'WA' },
  '98113': { city: 'Seattle', state: 'WA' },
  '98114': { city: 'Seattle', state: 'WA' },
  '98115': { city: 'Seattle', state: 'WA' },
  '98116': { city: 'Seattle', state: 'WA' },
  '98117': { city: 'Seattle', state: 'WA' },
  '98118': { city: 'Seattle', state: 'WA' },
  '98119': { city: 'Seattle', state: 'WA' },
  '98121': { city: 'Seattle', state: 'WA' },
  '98122': { city: 'Seattle', state: 'WA' },
  '98125': { city: 'Seattle', state: 'WA' },
  '98126': { city: 'Seattle', state: 'WA' },
  '98133': { city: 'Seattle', state: 'WA' },
  '98134': { city: 'Seattle', state: 'WA' },
  '98136': { city: 'Seattle', state: 'WA' },
  '98144': { city: 'Seattle', state: 'WA' },
  '98146': { city: 'Burien', state: 'WA' },
  '98148': { city: 'Burien', state: 'WA' },
  '98154': { city: 'Seattle', state: 'WA' },
  '98155': { city: 'Shoreline', state: 'WA' },
  '98158': { city: 'Tukwila', state: 'WA' },
  '98160': { city: 'Vashon', state: 'WA' },
  '98164': { city: 'Seattle', state: 'WA' },
  '98166': { city: 'Burien', state: 'WA' },
  '98168': { city: 'Tukwila', state: 'WA' },
  '98174': { city: 'Seattle', state: 'WA' },
  '98177': { city: 'Seattle', state: 'WA' },
  '98178': { city: 'Tukwila', state: 'WA' },
  '98188': { city: 'SeaTac', state: 'WA' },
  '98195': { city: 'Seattle', state: 'WA' },
  '98199': { city: 'Seattle', state: 'WA' },
  
  // More Washington cities
  '98001': { city: 'Auburn', state: 'WA' },
  '98002': { city: 'Auburn', state: 'WA' },
  '98003': { city: 'Federal Way', state: 'WA' },
  '98004': { city: 'Bellevue', state: 'WA' },
  '98005': { city: 'Bellevue', state: 'WA' },
  '98006': { city: 'Bellevue', state: 'WA' },
  '98007': { city: 'Bellevue', state: 'WA' },
  '98008': { city: 'Bellevue', state: 'WA' },
  '98009': { city: 'Bellevue', state: 'WA' },
  '98010': { city: 'Black Diamond', state: 'WA' },
  '98011': { city: 'Bothell', state: 'WA' },
  '98012': { city: 'Bothell', state: 'WA' },
  '98013': { city: 'Bothell', state: 'WA' },
  '98014': { city: 'Carnation', state: 'WA' },
  '98015': { city: 'Bellevue', state: 'WA' },
  '98019': { city: 'Duvall', state: 'WA' },
  '98020': { city: 'Edmonds', state: 'WA' },
  '98021': { city: 'Bothell', state: 'WA' },
  '98022': { city: 'Enumclaw', state: 'WA' },
  '98023': { city: 'Federal Way', state: 'WA' },
  '98024': { city: 'Fall City', state: 'WA' },
  '98025': { city: 'Hobart', state: 'WA' },
  '98026': { city: 'Edmonds', state: 'WA' },
  '98027': { city: 'Issaquah', state: 'WA' },
  '98028': { city: 'Kenmore', state: 'WA' },
  '98029': { city: 'Issaquah', state: 'WA' },
  '98030': { city: 'Kent', state: 'WA' },
  '98031': { city: 'Kent', state: 'WA' },
  '98032': { city: 'Kent', state: 'WA' },
  '98033': { city: 'Kirkland', state: 'WA' },
  '98034': { city: 'Kirkland', state: 'WA' },
  '98035': { city: 'Kent', state: 'WA' },
  '98036': { city: 'Lynnwood', state: 'WA' },
  '98037': { city: 'Lynnwood', state: 'WA' },
  '98038': { city: 'Maple Valley', state: 'WA' },
  '98039': { city: 'Medina', state: 'WA' },
  '98040': { city: 'Mercer Island', state: 'WA' },
  '98041': { city: 'Newcastle', state: 'WA' },
  '98042': { city: 'Kent', state: 'WA' },
  '98043': { city: 'Mountlake Terrace', state: 'WA' },
  '98045': { city: 'North Bend', state: 'WA' },
  '98047': { city: 'Pacific', state: 'WA' },
  '98050': { city: 'Preston', state: 'WA' },
  '98051': { city: 'Ravensdale', state: 'WA' },
  '98052': { city: 'Redmond', state: 'WA' },
  '98053': { city: 'Redmond', state: 'WA' },
  '98055': { city: 'Renton', state: 'WA' },
  '98056': { city: 'Renton', state: 'WA' },
  '98057': { city: 'Renton', state: 'WA' },
  '98058': { city: 'Renton', state: 'WA' },
  '98059': { city: 'Renton', state: 'WA' },
  '98061': { city: 'Tukwila', state: 'WA' },
  '98062': { city: 'Tukwila', state: 'WA' },
  '98063': { city: 'Federal Way', state: 'WA' },
  '98064': { city: 'Kent', state: 'WA' },
  '98065': { city: 'Snoqualmie', state: 'WA' },
  '98068': { city: 'Snoqualmie Pass', state: 'WA' },
  '98070': { city: 'Vashon', state: 'WA' },
  '98071': { city: 'Auburn', state: 'WA' },
  '98072': { city: 'Woodinville', state: 'WA' },
  '98073': { city: 'Redmond', state: 'WA' },
  '98074': { city: 'Sammamish', state: 'WA' },
  '98075': { city: 'Sammamish', state: 'WA' },
  '98077': { city: 'Woodinville', state: 'WA' },
  '98092': { city: 'Auburn', state: 'WA' },
  '98093': { city: 'Federal Way', state: 'WA' },
  
  // Texas (major cities)
  '75001': { city: 'Addison', state: 'TX' },
  '75002': { city: 'Allen', state: 'TX' },
  '75006': { city: 'Carrollton', state: 'TX' },
  '75007': { city: 'Carrollton', state: 'TX' },
  '75010': { city: 'Carrollton', state: 'TX' },
  '75019': { city: 'Coppell', state: 'TX' },
  '75020': { city: 'Denison', state: 'TX' },
  '75023': { city: 'Plano', state: 'TX' },
  '75024': { city: 'Plano', state: 'TX' },
  '75025': { city: 'Plano', state: 'TX' },
  '75026': { city: 'Plano', state: 'TX' },
  '75030': { city: 'Rowlett', state: 'TX' },
  '75034': { city: 'Frisco', state: 'TX' },
  '75035': { city: 'Frisco', state: 'TX' },
  '75038': { city: 'Irving', state: 'TX' },
  '75039': { city: 'Irving', state: 'TX' },
  '75040': { city: 'Garland', state: 'TX' },
  '75041': { city: 'Garland', state: 'TX' },
  '75042': { city: 'Garland', state: 'TX' },
  '75043': { city: 'Garland', state: 'TX' },
  '75044': { city: 'Garland', state: 'TX' },
  '75048': { city: 'Sachse', state: 'TX' },
  '75050': { city: 'Grand Prairie', state: 'TX' },
  '75051': { city: 'Grand Prairie', state: 'TX' },
  '75052': { city: 'Grand Prairie', state: 'TX' },
  '75054': { city: 'Grand Prairie', state: 'TX' },
  '75056': { city: 'The Colony', state: 'TX' },
  '75057': { city: 'Lewisville', state: 'TX' },
  '75060': { city: 'Irving', state: 'TX' },
  '75061': { city: 'Irving', state: 'TX' },
  '75062': { city: 'Irving', state: 'TX' },
  '75063': { city: 'Irving', state: 'TX' },
  '75067': { city: 'Lewisville', state: 'TX' },
  '75068': { city: 'Little Elm', state: 'TX' },
  '75069': { city: 'McKinney', state: 'TX' },
  '75070': { city: 'McKinney', state: 'TX' },
  '75071': { city: 'McKinney', state: 'TX' },
  '75074': { city: 'Plano', state: 'TX' },
  '75075': { city: 'Plano', state: 'TX' },
  '75080': { city: 'Richardson', state: 'TX' },
  '75081': { city: 'Richardson', state: 'TX' },
  '75082': { city: 'Richardson', state: 'TX' },
  '75083': { city: 'Richardson', state: 'TX' },
  '75085': { city: 'Richardson', state: 'TX' },
  '75086': { city: 'Wylie', state: 'TX' },
  '75087': { city: 'Rockwall', state: 'TX' },
  '75088': { city: 'Rowlett', state: 'TX' },
  '75089': { city: 'Rowlett', state: 'TX' },
  '75093': { city: 'Plano', state: 'TX' },
  '75094': { city: 'Plano', state: 'TX' },
  
  // Dallas proper
  '75201': { city: 'Dallas', state: 'TX' },
  '75202': { city: 'Dallas', state: 'TX' },
  '75203': { city: 'Dallas', state: 'TX' },
  '75204': { city: 'Dallas', state: 'TX' },
  '75205': { city: 'Dallas', state: 'TX' },
  '75206': { city: 'Dallas', state: 'TX' },
  '75207': { city: 'Dallas', state: 'TX' },
  '75208': { city: 'Dallas', state: 'TX' },
  '75209': { city: 'Dallas', state: 'TX' },
  '75210': { city: 'Dallas', state: 'TX' },
  '75211': { city: 'Dallas', state: 'TX' },
  '75212': { city: 'Dallas', state: 'TX' },
  '75214': { city: 'Dallas', state: 'TX' },
  '75215': { city: 'Dallas', state: 'TX' },
  '75216': { city: 'Dallas', state: 'TX' },
  '75217': { city: 'Dallas', state: 'TX' },
  '75218': { city: 'Dallas', state: 'TX' },
  '75219': { city: 'Dallas', state: 'TX' },
  '75220': { city: 'Dallas', state: 'TX' },
  '75221': { city: 'Dallas', state: 'TX' },
  '75222': { city: 'Dallas', state: 'TX' },
  '75223': { city: 'Dallas', state: 'TX' },
  '75224': { city: 'Dallas', state: 'TX' },
  '75225': { city: 'Dallas', state: 'TX' },
  '75226': { city: 'Dallas', state: 'TX' },
  '75227': { city: 'Dallas', state: 'TX' },
  '75228': { city: 'Dallas', state: 'TX' },
  '75229': { city: 'Dallas', state: 'TX' },
  '75230': { city: 'Dallas', state: 'TX' },
  '75231': { city: 'Dallas', state: 'TX' },
  '75232': { city: 'Dallas', state: 'TX' },
  '75233': { city: 'Dallas', state: 'TX' },
  '75234': { city: 'Dallas', state: 'TX' },
  '75235': { city: 'Dallas', state: 'TX' },
  '75236': { city: 'Dallas', state: 'TX' },
  '75237': { city: 'Dallas', state: 'TX' },
  '75238': { city: 'Dallas', state: 'TX' },
  '75240': { city: 'Dallas', state: 'TX' },
  '75241': { city: 'Dallas', state: 'TX' },
  '75243': { city: 'Dallas', state: 'TX' },
  '75244': { city: 'Dallas', state: 'TX' },
  '75246': { city: 'Dallas', state: 'TX' },
  '75247': { city: 'Dallas', state: 'TX' },
  '75248': { city: 'Dallas', state: 'TX' },
  '75249': { city: 'Dallas', state: 'TX' },
  '75250': { city: 'Dallas', state: 'TX' },
  '75251': { city: 'Dallas', state: 'TX' },
  '75252': { city: 'Dallas', state: 'TX' },
  '75253': { city: 'Dallas', state: 'TX' },
  '75254': { city: 'Dallas', state: 'TX' },
  '75270': { city: 'Dallas', state: 'TX' },
  '75275': { city: 'Dallas', state: 'TX' },
  '75277': { city: 'Dallas', state: 'TX' },
  '75283': { city: 'Dallas', state: 'TX' },
  '75284': { city: 'Dallas', state: 'TX' },
  '75285': { city: 'Dallas', state: 'TX' },
  '75287': { city: 'Dallas', state: 'TX' },
  '75390': { city: 'Dallas', state: 'TX' },
  '75391': { city: 'Dallas', state: 'TX' },
  '75392': { city: 'Dallas', state: 'TX' },
  '75393': { city: 'Dallas', state: 'TX' },
  '75394': { city: 'Dallas', state: 'TX' },
  '75395': { city: 'Dallas', state: 'TX' },
  '75396': { city: 'Dallas', state: 'TX' },
  '75397': { city: 'Dallas', state: 'TX' },
  '75398': { city: 'Dallas', state: 'TX' },
  
  // Oregon (Portland area)
  '97201': { city: 'Portland', state: 'OR' },
  '97202': { city: 'Portland', state: 'OR' },
  '97203': { city: 'Portland', state: 'OR' },
  '97204': { city: 'Portland', state: 'OR' },
  '97205': { city: 'Portland', state: 'OR' },
  '97206': { city: 'Portland', state: 'OR' },
  '97207': { city: 'Portland', state: 'OR' },
  '97208': { city: 'Portland', state: 'OR' },
  '97209': { city: 'Portland', state: 'OR' },
  '97210': { city: 'Portland', state: 'OR' },
  '97211': { city: 'Portland', state: 'OR' },
  '97212': { city: 'Portland', state: 'OR' },
  '97213': { city: 'Portland', state: 'OR' },
  '97214': { city: 'Portland', state: 'OR' },
  '97215': { city: 'Portland', state: 'OR' },
  '97216': { city: 'Portland', state: 'OR' },
  '97217': { city: 'Portland', state: 'OR' },
  '97218': { city: 'Portland', state: 'OR' },
  '97219': { city: 'Portland', state: 'OR' },
  '97220': { city: 'Portland', state: 'OR' },
  '97221': { city: 'Portland', state: 'OR' },
  '97222': { city: 'Portland', state: 'OR' },
  '97223': { city: 'Portland', state: 'OR' },
  '97224': { city: 'Portland', state: 'OR' },
  '97225': { city: 'Portland', state: 'OR' },
  '97227': { city: 'Portland', state: 'OR' },
  '97228': { city: 'Portland', state: 'OR' },
  '97229': { city: 'Portland', state: 'OR' },
  '97230': { city: 'Portland', state: 'OR' },
  '97231': { city: 'Portland', state: 'OR' },
  '97232': { city: 'Portland', state: 'OR' },
  '97233': { city: 'Portland', state: 'OR' },
  '97236': { city: 'Portland', state: 'OR' },
  '97239': { city: 'Portland', state: 'OR' },
  '97240': { city: 'Portland', state: 'OR' },
  '97266': { city: 'Portland', state: 'OR' },
  '97035': { city: 'Lake Oswego', state: 'OR' },
  '97034': { city: 'Lake Oswego', state: 'OR' },
  '97068': { city: 'West Linn', state: 'OR' },
  '97045': { city: 'Oregon City', state: 'OR' },
  '97005': { city: 'Beaverton', state: 'OR' },
  '97006': { city: 'Beaverton', state: 'OR' },
  '97007': { city: 'Beaverton', state: 'OR' },
  '97008': { city: 'Beaverton', state: 'OR' },
  '97003': { city: 'Beaverton', state: 'OR' },
  '97123': { city: 'Hillsboro', state: 'OR' },
  '97124': { city: 'Hillsboro', state: 'OR' },
  '97133': { city: 'North Plains', state: 'OR' },
  '97080': { city: 'Gresham', state: 'OR' },
  '97030': { city: 'Gresham', state: 'OR' },
  '97060': { city: 'Troutdale', state: 'OR' },
  '97024': { city: 'Fairview', state: 'OR' },
  '97015': { city: 'Clackamas', state: 'OR' },
  '97086': { city: 'Happy Valley', state: 'OR' },
  '97089': { city: 'Damascus', state: 'OR' },
  '97070': { city: 'Wilsonville', state: 'OR' },
  '97062': { city: 'Tualatin', state: 'OR' },
  '97140': { city: 'Sherwood', state: 'OR' },
  '97113': { city: 'Cornelius', state: 'OR' },
  '97116': { city: 'Forest Grove', state: 'OR' },
  '97128': { city: 'McMinnville', state: 'OR' },
  '97301': { city: 'Salem', state: 'OR' },
  '97302': { city: 'Salem', state: 'OR' },
  '97303': { city: 'Salem', state: 'OR' },
  '97304': { city: 'Salem', state: 'OR' },
  '97317': { city: 'Salem', state: 'OR' },
  '97401': { city: 'Eugene', state: 'OR' },
  '97402': { city: 'Eugene', state: 'OR' },
  '97403': { city: 'Eugene', state: 'OR' },
  '97404': { city: 'Eugene', state: 'OR' },
  '97405': { city: 'Eugene', state: 'OR' },
  '97501': { city: 'Medford', state: 'OR' },
  '97520': { city: 'Ashland', state: 'OR' },
  '97701': { city: 'Bend', state: 'OR' },
  '97702': { city: 'Bend', state: 'OR' },

  // Florida
  '33101': { city: 'Miami', state: 'FL' },
  '33102': { city: 'Miami', state: 'FL' },
  '33109': { city: 'Miami', state: 'FL' },
  '33111': { city: 'Miami', state: 'FL' },
  '33112': { city: 'Miami', state: 'FL' },
  '33114': { city: 'Miami', state: 'FL' },
  '33116': { city: 'Miami', state: 'FL' },
  '33119': { city: 'Miami', state: 'FL' },
  '33122': { city: 'Miami', state: 'FL' },
  '33124': { city: 'Miami', state: 'FL' },
  '33125': { city: 'Miami', state: 'FL' },
  '33126': { city: 'Miami', state: 'FL' },
  '33127': { city: 'Miami', state: 'FL' },
  '33128': { city: 'Miami', state: 'FL' },
  '33129': { city: 'Miami', state: 'FL' },
  '33130': { city: 'Miami', state: 'FL' },
  '33131': { city: 'Miami', state: 'FL' },
  '33132': { city: 'Miami', state: 'FL' },
  '33133': { city: 'Miami', state: 'FL' },
  '33134': { city: 'Miami', state: 'FL' },
  '33135': { city: 'Miami', state: 'FL' },
  '33136': { city: 'Miami', state: 'FL' },
  '33137': { city: 'Miami', state: 'FL' },
  '33138': { city: 'Miami', state: 'FL' },
  '33139': { city: 'Miami', state: 'FL' },
  '33140': { city: 'Miami', state: 'FL' },
  '33141': { city: 'Miami', state: 'FL' },
  '33142': { city: 'Miami', state: 'FL' },
  '33143': { city: 'Miami', state: 'FL' },
  '33144': { city: 'Miami', state: 'FL' },
  '33145': { city: 'Miami', state: 'FL' },
  '33146': { city: 'Miami', state: 'FL' },
  '33147': { city: 'Miami', state: 'FL' },
  '33149': { city: 'Miami', state: 'FL' },
  '33150': { city: 'Miami', state: 'FL' },
  '33151': { city: 'Miami', state: 'FL' },
  '33152': { city: 'Miami', state: 'FL' },
  '33153': { city: 'Miami', state: 'FL' },
  '33154': { city: 'Miami', state: 'FL' },
  '33155': { city: 'Miami', state: 'FL' },
  '33156': { city: 'Miami', state: 'FL' },
  '33157': { city: 'Miami', state: 'FL' },
  '33158': { city: 'Miami', state: 'FL' },
  '33159': { city: 'Miami', state: 'FL' },
  '33160': { city: 'Miami', state: 'FL' },
  '33161': { city: 'Miami', state: 'FL' },
  '33162': { city: 'Miami', state: 'FL' },
  '33163': { city: 'Miami', state: 'FL' },
  '33164': { city: 'Miami', state: 'FL' },
  '33165': { city: 'Miami', state: 'FL' },
  '33166': { city: 'Miami', state: 'FL' },
  '33167': { city: 'Miami', state: 'FL' },
  '33168': { city: 'Miami', state: 'FL' },
  '33169': { city: 'Miami', state: 'FL' },
  '33170': { city: 'Miami', state: 'FL' },
  '33172': { city: 'Miami', state: 'FL' },
  '33173': { city: 'Miami', state: 'FL' },
  '33174': { city: 'Miami', state: 'FL' },
  '33175': { city: 'Miami', state: 'FL' },
  '33176': { city: 'Miami', state: 'FL' },
  '33177': { city: 'Miami', state: 'FL' },
  '33178': { city: 'Miami', state: 'FL' },
  '33179': { city: 'Miami', state: 'FL' },
  '33180': { city: 'Miami', state: 'FL' },
  '33181': { city: 'Miami', state: 'FL' },
  '33182': { city: 'Miami', state: 'FL' },
  '33183': { city: 'Miami', state: 'FL' },
  '33184': { city: 'Miami', state: 'FL' },
  '33185': { city: 'Miami', state: 'FL' },
  '33186': { city: 'Miami', state: 'FL' },
  '33187': { city: 'Miami', state: 'FL' },
  '33188': { city: 'Miami', state: 'FL' },
  '33189': { city: 'Miami', state: 'FL' },
  '33190': { city: 'Miami', state: 'FL' },
  '33193': { city: 'Miami', state: 'FL' },
  '33194': { city: 'Miami', state: 'FL' },
  '33195': { city: 'Miami', state: 'FL' },
  '33196': { city: 'Miami', state: 'FL' },
  '33197': { city: 'Miami', state: 'FL' },
  '33199': { city: 'Miami', state: 'FL' },
}

// Optimized ZIP code to city/state conversion with improved accuracy
export function convertZipToLocation(input: string): { city?: string, state?: string } {
  const trimmed = input.trim()
  
  // Check if it's a ZIP code (5 digits, optionally with +4)
  const zipMatch = trimmed.match(/^(\d{5})(?:-\d{4})?$/)
  if (zipMatch) {
    const zipCode = zipMatch[1]
    const zipData = zipCodeMapping[zipCode]
    if (zipData) {
      return { city: zipData.city, state: zipData.state }
    }
    
    // Optimized ZIP code range detection using array lookup
    const zipNum = parseInt(zipCode)
    const state = getStateFromZipRange(zipNum)
    
    if (state) {
      return { state }
    }
    
    // If we can't determine the state, return the ZIP as is for the search
    return { city: zipCode }
  }
  
  // Improved parsing for non-ZIP code locations
  return parseLocationString(trimmed)
}

// Enhanced location string parsing with better accuracy
function parseLocationString(input: string): { city?: string, state?: string } {
  const trimmed = input.trim()
  
  // Handle comma-separated format (City, State)
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(part => part.trim())
    if (parts.length >= 2) {
      const city = parts[0]
      const stateInput = parts[1].toUpperCase()
      
      // Convert full state names to abbreviations if needed
      const state = normalizeState(stateInput)
      return { city: properCase(city), state }
    }
  }
  
  // Handle space-separated format with known multi-word cities
  const result = parseMultiWordCityState(trimmed)
  if (result.city || result.state) {
    return result
  }
  
  // Handle single word or simple space-separated format
  const parts = trimmed.split(/\s+/)
  
  if (parts.length === 1) {
    const input = parts[0]
    
    // Check if it's a state abbreviation
    if (input.length === 2 && /^[A-Z]{2}$/.test(input.toUpperCase())) {
      return { state: input.toUpperCase() }
    }
    
    // Check if it's a known major city
    const cityState = getMajorCityState(input)
    if (cityState) {
      return cityState
    }
    
    // Default to treating as city name
    return { city: properCase(input) }
  } else if (parts.length === 2) {
    // Assume "City State" format
    const cityPart = parts[0]
    const statePart = parts[1]
    
    const state = normalizeState(statePart.toUpperCase())
    return { city: properCase(cityPart), state }
  } else {
    // Multiple words - likely all part of city name
    return { city: properCase(trimmed) }
  }
}

// Parse multi-word cities with state detection
function parseMultiWordCityState(input: string): { city?: string, state?: string } {
  const multiWordCities = [
    'new york', 'los angeles', 'san francisco', 'san diego', 'san antonio', 'san jose',
    'fort worth', 'el paso', 'las vegas', 'virginia beach', 'colorado springs',
    'santa ana', 'santa monica', 'long beach', 'baton rouge', 'new orleans',
    'kansas city', 'oklahoma city', 'salt lake city', 'jersey city', 'saint louis',
    'st louis', 'st paul', 'st petersburg', 'corpus christi', 'chula vista',
    'north las vegas', 'colorado springs', 'winston salem'
  ]
  
  const lowerInput = input.toLowerCase()
  
  for (const city of multiWordCities) {
    if (lowerInput.startsWith(city)) {
      const remaining = input.substring(city.length).trim()
      const properCity = properCase(city)
      
      if (remaining) {
        // Extract state from remaining text
        const state = normalizeState(remaining.toUpperCase())
        return { city: properCity, state }
      } else {
        // Just the city name
        return { city: properCity }
      }
    }
  }
  
  return {}
}

// Get state for major cities
function getMajorCityState(cityName: string): { city: string, state: string } | undefined {
  const cityStateMapping: Record<string, string> = {
    'seattle': 'WA', 'portland': 'OR', 'denver': 'CO', 'phoenix': 'AZ', 'tucson': 'AZ',
    'vegas': 'NV', 'miami': 'FL', 'tampa': 'FL', 'orlando': 'FL', 'atlanta': 'GA',
    'charlotte': 'NC', 'raleigh': 'NC', 'chicago': 'IL', 'detroit': 'MI', 
    'milwaukee': 'WI', 'minneapolis': 'MN', 'houston': 'TX', 'dallas': 'TX', 
    'austin': 'TX', 'philadelphia': 'PA', 'pittsburgh': 'PA', 'boston': 'MA',
    'baltimore': 'MD', 'nashville': 'TN', 'memphis': 'TN', 'louisville': 'KY',
    'cleveland': 'OH', 'columbus': 'OH', 'cincinnati': 'OH', 'indianapolis': 'IN',
    'omaha': 'NE', 'albuquerque': 'NM', 'sacramento': 'CA', 'fresno': 'CA',
    'oakland': 'CA', 'riverside': 'CA', 'anaheim': 'CA', 'bakersfield': 'CA'
  }
  
  const lowerCity = cityName.toLowerCase()
  const state = cityStateMapping[lowerCity]
  
  if (state) {
    return { city: properCase(cityName), state }
  }
  
  return undefined
}

// Normalize state names and abbreviations
function normalizeState(state: string): string {
  const stateMap: Record<string, string> = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
    'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
    'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
    'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
    'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH',
    'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC',
    'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA',
    'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN',
    'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA',
    'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY'
  }
  
  return stateMap[state] || (state.length === 2 ? state : state)
}

// Convert string to proper case
function properCase(str: string): string {
  return str.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Get coordinates for a location string
export function getLocationCoordinates(locationString: string): Coordinates | null {
  if (!locationString) return null
  
  const normalized = locationString.toLowerCase().trim()
  
  // Try exact match first
  if (locationCoordinates[normalized]) {
    return locationCoordinates[normalized]
  }
  
  // Try to find partial matches - prioritize city matches over state matches
  let bestMatch: Coordinates | null = null
  let bestMatchScore = 0
  
  for (const [key, coords] of Object.entries(locationCoordinates)) {
    let score = 0
    
    // Exact match gets highest score
    if (key === normalized) {
      return coords
    }
    
    // City name matches get high score
    if (key.includes(normalized) || normalized.includes(key)) {
      // Prefer city matches over state matches
      if (key.includes(',')) {
        score = 10 // City match
      } else {
        score = 5  // State match
      }
      
      // Prefer longer matches
      score += Math.min(normalized.length, key.length)
      
      if (score > bestMatchScore) {
        bestMatchScore = score
        bestMatch = coords
      }
    }
  }
  
  return bestMatch
}

// Parse location from clinical trial data
export function parseTrialLocation(location: { city?: string, state?: string, country?: string }): string {
  const parts = []
  if (location.city) parts.push(location.city.toLowerCase())
  if (location.state) parts.push(location.state.toLowerCase())
  if (location.country && location.country.toLowerCase() !== 'united states') {
    parts.push(location.country.toLowerCase())
  }
  return parts.join(', ')
}

// Calculate distance between user location and trial location
export function calculateTrialDistance(userLocation: string, trialLocation: { city?: string, state?: string, country?: string }): number | null {
  const userCoords = getLocationCoordinates(userLocation)
  if (!userCoords) return null
  
  const trialLocationString = parseTrialLocation(trialLocation)
  const trialCoords = getLocationCoordinates(trialLocationString)
  if (!trialCoords) return null
  
  return calculateDistance(userCoords, trialCoords)
} 