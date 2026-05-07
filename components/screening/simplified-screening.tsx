"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export function SimplifiedScreening() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    riskFactors: [] as string[],
    zipCode: "",
  })
  const [recommendations, setRecommendations] = useState<any[]>([])

  const commonRiskFactors = [
    "Family history of cancer",
    "Smoking",
    "High blood pressure",
    "Diabetes",
    "High cholesterol",
    "Obesity",
    "Alcohol consumption",
    "Previous abnormal test results",
  ]

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleRiskFactorChange = (factor: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, riskFactors: [...formData.riskFactors, factor] })
    } else {
      setFormData({ ...formData, riskFactors: formData.riskFactors.filter((rf) => rf !== factor) })
    }
  }

  const handleSubmit = async () => {
    if (!formData.age) {
      setError("Please enter your age")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        age: formData.age,
        gender: formData.gender || "all",
      })

      if (formData.riskFactors.length > 0) {
        queryParams.append("riskFactors", formData.riskFactors.join(","))
      }

      // Fetch recommendations
      const response = await fetch(`/api/screening/recommendations?${queryParams.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch recommendations")
      }

      const data = await response.json()
      setRecommendations(data.recommendations || [])
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case "essential":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Essential</Badge>
      case "recommended":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Recommended</Badge>
      case "routine":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Routine</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Health Screening Recommendations</CardTitle>
        <CardDescription>
          Get personalized screening recommendations based on your age, gender, and risk factors
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                  placeholder="Enter your age"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleChange("gender", value)}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Prefer not to say</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Risk Factors (Optional)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {commonRiskFactors.map((factor) => (
                  <div key={factor} className="flex items-center space-x-2">
                    <Checkbox
                      id={`risk-${factor}`}
                      checked={formData.riskFactors.includes(factor)}
                      onCheckedChange={(checked) => handleRiskFactorChange(factor, checked === true)}
                    />
                    <Label htmlFor={`risk-${factor}`} className="text-sm font-normal">
                      {factor}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {recommendations.length > 0 ? (
              <>
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <p className="text-green-700">
                    Based on your information, we've generated {recommendations.length} screening recommendations for
                    you.
                  </p>
                </div>

                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="border rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{rec.name}</h3>
                        {getImportanceBadge(rec.importance)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                      <div className="text-sm">
                        <p>
                          <span className="font-medium">Frequency:</span> {rec.frequency}
                        </p>
                        <p>
                          <span className="font-medium">Recommended for:</span> Ages {rec.ageRange.min}
                          {rec.ageRange.max ? ` to ${rec.ageRange.max}` : "+"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recommendations found for your profile.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {step === 1 && (
          <Button onClick={handleSubmit} disabled={isLoading || !formData.age} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Recommendations...
              </>
            ) : (
              "Get Recommendations"
            )}
          </Button>
        )}

        {step === 2 && (
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button asChild className="flex-1">
              <Link href={`/providers/search${formData.zipCode ? `?location=${formData.zipCode}` : ''}`}>Find Providers</Link>
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
