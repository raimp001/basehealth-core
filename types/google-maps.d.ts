// Permissive ambient declarations for the Google Maps JS SDK.
//
// We only use a handful of constructors and enums (Map, Marker, InfoWindow,
// Geocoder, places, Animation, SymbolPath, event). Rather than pulling in the
// full @types/google.maps surface, we declare the parts we touch as `any` so
// the existing call sites type-check without a runtime dependency.

declare namespace google {
  namespace maps {
    type LatLng = any
    type LatLngLiteral = any
    type Map = any
    type Marker = any
    type InfoWindow = any
    type Geocoder = any
    type GeocoderResult = any
    type GeocoderStatus = any
    type MapOptions = any
    type MarkerOptions = any
    type Animation = any
    type SymbolPath = any
    type MapMouseEvent = any

    namespace places {
      type PlacesService = any
      type PlaceResult = any
      type PlacesServiceStatus = any
    }
  }
}

interface Window {
  google?: any
  initMap?: () => void
}
