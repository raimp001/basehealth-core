"use client"

/**
 * Saved Items Page
 * View and manage saved providers, clinical trials, and other items
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Heart,
  FlaskConical,
  Bookmark,
  Trash2,
  ExternalLink,
  MapPin,
  Star,
  Clock,
  User,
  ArrowRight,
} from "lucide-react"
import { 
  getSavedItems, 
  SavedItem, 
  SavedProviders, 
  SavedTrials,
  removeSavedItem 
} from "@/lib/saved-items"
import { formatDistanceToNow } from "date-fns"

export default function SavedItemsPage() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadSavedItems()

    // Listen for changes
    const handleUpdate = () => loadSavedItems()
    window.addEventListener('saved-item-added', handleUpdate)
    window.addEventListener('saved-item-removed', handleUpdate)
    window.addEventListener('saved-items-cleared', handleUpdate)

    return () => {
      window.removeEventListener('saved-item-added', handleUpdate)
      window.removeEventListener('saved-item-removed', handleUpdate)
      window.removeEventListener('saved-items-cleared', handleUpdate)
    }
  }, [])

  const loadSavedItems = () => {
    setSavedItems(getSavedItems())
  }

  const handleRemove = (type: SavedItem['type'], itemId: string) => {
    removeSavedItem(type, itemId)
    loadSavedItems()
  }

  const providers = savedItems.filter(item => item.type === 'provider')
  const trials = savedItems.filter(item => item.type === 'trial')

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-stone-50">
      <main className="py-8">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-full text-sm font-semibold mb-4">
              <Bookmark className="h-4 w-4" />
              Saved Items
            </div>
            <h1 className="text-4xl font-bold text-stone-900 mb-2">
              Your Saved Items
            </h1>
            <p className="text-lg text-stone-600">
              Quick access to providers and clinical trials you've saved
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Card className="p-4 border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                  <Heart className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{providers.length}</p>
                  <p className="text-sm text-stone-600">Saved Providers</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FlaskConical className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{trials.length}</p>
                  <p className="text-sm text-stone-600">Saved Trials</p>
                </div>
              </div>
            </Card>
          </div>

          {savedItems.length === 0 ? (
            /* Empty State */
            <Card className="p-12 text-center border-stone-200">
              <div className="w-16 h-16 mx-auto mb-6 bg-stone-100 rounded-full flex items-center justify-center">
                <Bookmark className="h-8 w-8 text-stone-400" />
              </div>
              <h2 className="text-xl font-semibold text-stone-900 mb-2">
                No saved items yet
              </h2>
              <p className="text-stone-600 mb-6 max-w-md mx-auto">
                Start exploring providers and clinical trials, then save them for quick access later.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="bg-stone-900 hover:bg-stone-800">
                  <Link href="/providers/search">
                    Find Providers
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-2">
                  <Link href="/clinical-trials">
                    Explore Trials
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </Card>
          ) : (
            /* Tabs with saved items */
            <Tabs defaultValue="providers" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="providers" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Providers ({providers.length})
                </TabsTrigger>
                <TabsTrigger value="trials" className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Trials ({trials.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="providers" className="space-y-4">
                {providers.length === 0 ? (
                  <Card className="p-8 text-center border-stone-200">
                    <Heart className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                    <h3 className="font-medium text-stone-900 mb-1">No saved providers</h3>
                    <p className="text-sm text-stone-600 mb-4">
                      Find and save providers you're interested in
                    </p>
                    <Button asChild size="sm" className="bg-stone-900 hover:bg-stone-800">
                      <Link href="/providers/search">Find Providers</Link>
                    </Button>
                  </Card>
                ) : (
                  providers.map((item) => (
                    <Card key={item.id} className="p-5 border-stone-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-6 w-6 text-stone-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-stone-900">{item.title}</h3>
                              <p className="text-sm text-stone-600">{item.subtitle}</p>
                            </div>
                            <button
                              onClick={() => handleRemove('provider', item.itemId)}
                              className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label="Remove from saved"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          
                          {Boolean(item.metadata.address) && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-stone-500">
                              <MapPin className="h-4 w-4" />
                              {String(item.metadata.address)}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-stone-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Saved {formatDistanceToNow(item.savedAt, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-stone-100 flex gap-2">
                        <Button asChild size="sm" className="bg-stone-900 hover:bg-stone-800">
                          <Link href={`/appointment/book/${item.itemId}`}>
                            Book Appointment
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="border-stone-300">
                          <Link href={`/providers/${item.itemId}`}>
                            View Profile
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="trials" className="space-y-4">
                {trials.length === 0 ? (
                  <Card className="p-8 text-center border-stone-200">
                    <FlaskConical className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                    <h3 className="font-medium text-stone-900 mb-1">No saved trials</h3>
                    <p className="text-sm text-stone-600 mb-4">
                      Find clinical trials that match your health profile
                    </p>
                    <Button asChild size="sm" className="bg-stone-900 hover:bg-stone-800">
                      <Link href="/clinical-trials">Explore Trials</Link>
                    </Button>
                  </Card>
                ) : (
                  trials.map((item) => (
                    <Card key={item.id} className="p-5 border-stone-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {Boolean(item.metadata.phase) && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                {String(item.metadata.phase)}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-stone-900 mb-1">{item.title}</h3>
                          {item.subtitle && (
                            <p className="text-sm text-stone-600">{item.subtitle}</p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-stone-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Saved {formatDistanceToNow(item.savedAt, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove('trial', item.itemId)}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Remove from saved"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-stone-100 flex gap-2">
                        <Button asChild size="sm" className="bg-stone-900 hover:bg-stone-800">
                          <a 
                            href={`https://clinicaltrials.gov/study/${item.itemId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            View on ClinicalTrials.gov
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  )
}
