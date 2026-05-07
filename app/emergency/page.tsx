"use client"

import { useState, useEffect } from "react"
import { getCurrentLocation } from "@/lib/geolocation-service"
import { searchProviders } from "@/lib/provider-search-service"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Locate, Phone, Star } from "lucide-react"
import type { Provider } from "@/types/user"

export default function EmergencyPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [mapApiKey, setMapApiKey] = useState<string>("")
  const [mapError, setMapError] = useState<string | null>(null)
  const [nearbyProviders, setNearbyProviders] = useState<Provider[]>([])
  const [showMap, setShowMap] = useState(false)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

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
        // Error handled by error state
        setMapError("Failed to load Google Maps")
      }
    }

    fetchMapApiKey()
  }, [])

  // Load Google Maps script
  useEffect(() => {
    if (!mapApiKey || window.google) return

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapApiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setShowMap(true)
    script.onerror = () => setMapError("Failed to load Google Maps script")
    document.head.appendChild(script)
  }, [mapApiKey])

  const findNearbyProviders = async () => {
    setIsLoading(true)
    try {
      const location = await getCurrentLocation()
      if (!location) {
        throw new Error("Unable to get your location")
      }

      setUserLocation(location)

      // Search for providers using the NPI service
      const providers = await searchProviders({
        coordinates: location,
        radius: 25, // 25 mile radius
      })

      setNearbyProviders(providers)
    } catch (error) {
      // Error handled by error state
      setMapError(error instanceof Error ? error.message : "Failed to find nearby providers")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Emergency Assistance</h1>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-alert-triangle"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          Emergency Warning
        </div>
        <p className="text-red-600">
          If you are experiencing a life-threatening emergency, please call 911 immediately or go to your nearest
          emergency room.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Emergency Services</h2>
          <p className="mb-4">For immediate emergency assistance:</p>
          <a
            href="tel:911"
            className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded text-center mb-4"
          >
            Call 911
          </a>
          <p className="text-sm text-gray-600">
            Call 911 for life-threatening emergencies requiring immediate medical attention.
          </p>
        </div>

        <div className="border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Find Nearby Providers</h2>
          <p className="mb-4">Locate healthcare providers in your area:</p>
          <button
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded text-center mb-4"
            onClick={findNearbyProviders}
            disabled={isLoading}
          >
            {isLoading ? "Searching..." : "Find Nearby Providers"}
          </button>
          <p className="text-sm text-gray-600">Search for the closest healthcare providers and emergency care centers.</p>
        </div>
      </div>

      {mapError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{mapError}</p>
        </div>
      )}

      {nearbyProviders.length > 0 && (
        <div className="mt-6 border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Nearby Healthcare Providers</h2>
          <div className="space-y-4">
            {nearbyProviders.map((provider) => (
              <Card key={provider.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{provider.name}</h3>
                    <p className="text-sm text-gray-600">{provider.specialty}</p>
                    {provider.address.full && (
                      <p className="text-sm text-gray-600 mt-1">{provider.address.full}</p>
                    )}
                    {provider.credentials && (
                      <p className="text-sm text-gray-600">{provider.credentials}</p>
                    )}
                  </div>
                  {provider.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium">{provider.rating}</span>
                      {provider.reviewCount && (
                        <span className="text-sm text-gray-500">({provider.reviewCount})</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  {provider.phone && (
                    <a
                      href={`tel:${provider.phone}`}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <Phone className="h-4 w-4" />
                      Call Provider
                    </a>
                  )}
                  {provider.coordinates && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${provider.coordinates.latitude},${provider.coordinates.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <MapPin className="h-4 w-4" />
                      Get Directions
                    </a>
                  )}
                </div>
                {provider.services && provider.services.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Services: {provider.services.join(", ")}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">When to Use Emergency Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Call 911 for:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Chest pain or difficulty breathing</li>
              <li>Severe bleeding or head trauma</li>
              <li>Loss of consciousness</li>
              <li>Severe burns or injuries</li>
              <li>Signs of stroke (face drooping, arm weakness, speech difficulty)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Visit Urgent Care for:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Minor cuts requiring stitches</li>
              <li>Sprains and minor broken bones</li>
              <li>Fever without rash</li>
              <li>Moderate asthma</li>
              <li>Vomiting, diarrhea, or dehydration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

