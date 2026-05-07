"use client"

import { memo, useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Locate } from "lucide-react"
import type { Provider } from "@/types/user"
import { geocodeZipCode } from "@/lib/geolocation-service"

interface ProviderMapProps {
  providers: Provider[]
  zipCode?: string
  onProviderSelect?: (provider: Provider) => void
}

function ProviderMapComponent({ providers, zipCode, onProviderSelect }: ProviderMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [markers, setMarkers] = useState<google.maps.Marker[]>([])
  const [centerCoordinates, setCenterCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [mapApiKey, setMapApiKey] = useState<string>("")
  const [mapError, setMapError] = useState<string | null>(null)

  // Fetch Maps API key from server
  useEffect(() => {
    async function fetchMapApiKey() {
      try {
        const response = await fetch("/api/maps/script")
        const data = await response.json()
        if (data.apiKey) {
          setMapApiKey(data.apiKey)
        } else {
          setMapError("Google Maps API key not found")
        }
      } catch (error) {
        console.error("Failed to fetch Maps API key:", error)
        setMapError("Failed to load Google Maps")
      }
    }

    fetchMapApiKey()
  }, [])

  // Load Google Maps script
  useEffect(() => {
    if (!mapApiKey || window.google) return

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapApiKey}&libraries=places,geocoding`
    script.async = true
    script.defer = true
    script.onload = () => setMapLoaded(true)
    script.onerror = () => setMapError("Failed to load Google Maps script")
    document.head.appendChild(script)
  }, [mapApiKey])

  // Initialize map when loaded
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapLoaded || !mapRef.current) return

      try {
        // Default coordinates (San Francisco)
        let mapCenter = { lat: 37.7749, lng: -122.4194 }

        // If zipCode is provided, geocode it
        if (zipCode) {
          const coordinates = await geocodeZipCode(zipCode)
          if (coordinates) {
            mapCenter = { lat: coordinates.latitude, lng: coordinates.longitude }
            setCenterCoordinates(mapCenter)
          }
        }

        // Create the map
        const newMap = new window.google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: 11,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        })

        setMap(newMap)
      } catch (error) {
        console.error("Error initializing map:", error)
        setMapError("Failed to initialize map")
      }
    }

    initializeMap()
  }, [mapLoaded, zipCode])

  // Add markers for providers
  useEffect(() => {
    if (!map || !providers.length) return

    try {
      // Clear existing markers
      markers.forEach((marker) => marker.setMap(null))

      // Create new markers
      const newMarkers: google.maps.Marker[] = []
      const bounds = new (window.google as any).maps.LatLngBounds()

      // Add markers for each provider
      providers.forEach(async (provider) => {
        try {
          // Get coordinates for the provider
          let position: google.maps.LatLngLiteral

          if (provider.coordinates) {
            // Use existing coordinates if available
            position = { lat: provider.coordinates.latitude, lng: provider.coordinates.longitude }
          } else {
            // Geocode the provider's address
            const address = `${provider.address.full || provider.address.city}, ${provider.address.state} ${provider.address.zipCode}`
            const geocoder = new window.google.maps.Geocoder()
            
            const result = await geocoder.geocode({ address })
            if (result.results[0]) {
              position = {
                lat: result.results[0].geometry.location.lat(),
                lng: result.results[0].geometry.location.lng(),
              }
            } else {
              console.warn(`Could not geocode address for provider: ${provider.name}`)
              return
            }
          }

          // Create marker
          const marker = new window.google.maps.Marker({
            position,
            map,
            title: provider.name,
            animation: window.google.maps.Animation.DROP,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          })

          // Add info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="max-width: 200px; padding: 8px;">
                <h3 style="font-weight: bold; margin-bottom: 5px; color: #2563eb;">${provider.name}</h3>
                <p style="margin: 0; color: #4b5563;">${provider.specialty}</p>
                <p style="margin: 5px 0; color: #4b5563;">${provider.address.city}, ${provider.address.state}</p>
                <p style="margin: 0; color: #4b5563;">Rating: ${provider.rating?.toFixed(1) || "N/A"} (${provider.reviewCount || 0} reviews)</p>
                ${provider.distance ? `<p style="margin: 5px 0; color: #2563eb">${provider.distance.toFixed(1)} miles away</p>` : ""}
                ${provider.phone ? `<p style="margin: 5px 0; color: #4b5563;">${provider.phone}</p>` : ""}
              </div>
            `,
          })

          marker.addListener("click", () => {
            infoWindow.open(map, marker)
            if (onProviderSelect) {
              onProviderSelect(provider)
            }
          })

          // Extend bounds to include this marker
          bounds.extend(position)
          newMarkers.push(marker)
        } catch (error) {
          console.error(`Error adding marker for provider ${provider.name}:`, error)
        }
      })

      // Fit map to bounds if we have markers
      if (newMarkers.length > 0) {
        map.fitBounds(bounds)

        // Don't zoom in too far
        const listener = window.google.maps.event.addListener(map, "idle", () => {
          if (map.getZoom()! > 16) map.setZoom(16)
          window.google.maps.event.removeListener(listener)
        })
      }

      setMarkers(newMarkers)
    } catch (error) {
      console.error("Error adding markers:", error)
      setMapError("Failed to add provider markers")
    }
  }, [map, providers, onProviderSelect])

  // Get user's current location
  const handleGetCurrentLocation = () => {
    if (!map) return

    setIsLoadingLocation(true)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }

          map.setCenter(userLocation)
          map.setZoom(13)

          // Add a marker for the user's location
          new window.google.maps.Marker({
            position: userLocation,
            map,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            title: "Your Location",
          })

          setCenterCoordinates(userLocation)
          setIsLoadingLocation(false)
        },
        (error) => {
          console.error("Error getting location:", error)
          setIsLoadingLocation(false)
        }
      )
    }
  }

  if (mapError) {
    return (
      <Card className="p-4 text-center">
        <p className="text-red-500">{mapError}</p>
      </Card>
    )
  }

  return (
    <Card className="relative h-[500px] w-full overflow-hidden">
      <div ref={mapRef} className="h-full w-full" />
      <Button
        onClick={handleGetCurrentLocation}
        disabled={isLoadingLocation}
        className="absolute bottom-4 right-4 z-10"
        size="sm"
      >
        <Locate className="mr-2 h-4 w-4" />
        {isLoadingLocation ? "Locating..." : "Use My Location"}
      </Button>
    </Card>
  )
}

export const ProviderMap = memo(
  ProviderMapComponent,
  (prevProps: ProviderMapProps, nextProps: ProviderMapProps) => {
    return (
      prevProps.providers.length === nextProps.providers.length &&
      prevProps.zipCode === nextProps.zipCode &&
      prevProps.providers.every((p, i) => p.id === nextProps.providers[i]?.id)
    )
  },
)
ProviderMap.displayName = "ProviderMap"

// Google Maps types are declared globally in /types/google-maps.d.ts.
