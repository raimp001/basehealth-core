import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ScreeningRecommendation } from "@/types/user"

interface ScreeningCardProps {
  recommendation: ScreeningRecommendation
  isDue?: boolean
}

export function ScreeningCard({ recommendation, isDue = false }: ScreeningCardProps) {
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
    <Card className={isDue ? "border-yellow-300 shadow-[0_0_0_1px_rgba(234,179,8,0.3)]" : ""}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle>{recommendation.name}</CardTitle>
          {getImportanceBadge(recommendation.importance)}
        </div>
        <CardDescription>{recommendation.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Recommended Age:</span>
            <span>
              {recommendation.recommendedAge?.min ?? "-"}
              {recommendation.recommendedAge?.max ? ` - ${recommendation.recommendedAge.max}` : "+"} years
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frequency:</span>
            <span>{recommendation.frequency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Specialist Types:</span>
            <span>{recommendation.specialistTypes?.join(", ") ?? "Primary Care"}</span>
          </div>

          {isDue && (
            <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded-md text-sm">
              <p className="font-medium">Due for screening</p>
              <p>Based on your health profile and history, this screening is currently due.</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          asChild 
          variant={isDue ? "default" : "outline"} 
          className="w-full"
        >
          <Link
            href={`/providers/search?specialty=${encodeURIComponent(recommendation.specialistTypes?.[0] ?? "Primary Care")}`}
          >
            Find Provider
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
