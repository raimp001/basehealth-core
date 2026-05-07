"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Shield,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Search,
  Filter,
  Download,
  Eye,
  ExternalLink,
  Gavel,
  Database,
  Activity,
  Calculator,
  Users
} from "lucide-react"

export function CMSCompliantBilling() {
  const [selectedClaim, setSelectedClaim] = useState("")
  const [selectedCptCode, setSelectedCptCode] = useState("")
  const [isUninsured, setIsUninsured] = useState(false)
  const [estimateAmount, setEstimateAmount] = useState("")

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CMS Compliance Center</h1>
          <p className="text-muted-foreground">
            Medicare & Medicaid Services compliance and transparency tools
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            HIPAA Compliant
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Gavel className="h-3 w-3" />
            CMS Certified
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="coverage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="estimates">Estimates</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="transparency">Transparency</TabsTrigger>
          <TabsTrigger value="rights">Patient Rights</TabsTrigger>
        </TabsList>

        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Medicare Coverage Database
              </CardTitle>
              <CardDescription>
                Check coverage rules and requirements for medical services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cpt-code">CPT/HCPCS Code</Label>
                  <Input
                    id="cpt-code"
                    placeholder="Enter CPT code (e.g., 99213)"
                    value={selectedCptCode}
                    onChange={(e) => setSelectedCptCode(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="diagnosis">Diagnosis Code (ICD-10)</Label>
                  <Input
                    id="diagnosis"
                    placeholder="Enter ICD-10 code"
                  />
                </div>
              </div>
              <Button>Check Coverage</Button>
              
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter a CPT code to check coverage</p>
                <p className="text-sm">Coverage information will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Good Faith Estimate Generator
              </CardTitle>
              <CardDescription>
                Required by the No Surprises Act for uninsured patients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="uninsured" 
                    checked={isUninsured}
                    onCheckedChange={(checked) => setIsUninsured(checked === true)}
                  />
                  <Label htmlFor="uninsured">I am uninsured or self-pay</Label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="service">Service/Procedure</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Office Consultation</SelectItem>
                        <SelectItem value="physical">Annual Physical</SelectItem>
                        <SelectItem value="labwork">Lab Work</SelectItem>
                        <SelectItem value="imaging">Imaging Studies</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estimated-amount">Estimated Amount</Label>
                    <Input
                      id="estimated-amount"
                      placeholder="$0.00"
                      value={estimateAmount}
                      onChange={(e) => setEstimateAmount(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button disabled={!isUninsured}>
                  Generate Good Faith Estimate
                </Button>
              </div>
              
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No estimates generated</p>
                <p className="text-sm">Good faith estimates will appear here when created</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Claims Status Tracking
              </CardTitle>
              <CardDescription>
                Real-time updates on your insurance claims
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="claim-number">Claim Number</Label>
                  <Input
                    id="claim-number"
                    placeholder="Enter claim number"
                    value={selectedClaim}
                    onChange={(e) => setSelectedClaim(e.target.value)}
                  />
                </div>
                <Button>Track Claim</Button>
                
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No claims to track</p>
                  <p className="text-sm">Enter a claim number to check status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transparency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Price Transparency
              </CardTitle>
              <CardDescription>
                Hospital and provider pricing information as required by CMS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pricing data available</p>
                <p className="text-sm">Price transparency information will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Patient Rights & Protections
              </CardTitle>
              <CardDescription>
                Your rights under federal healthcare laws
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>No Surprises Act Protection</AlertTitle>
                  <AlertDescription>
                    You have the right to receive a Good Faith Estimate for healthcare services 
                    if you are uninsured or choose not to use your insurance.
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>HIPAA Privacy Rights</AlertTitle>
                  <AlertDescription>
                    Your health information is protected and cannot be shared without your consent, 
                    except as required by law.
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <Gavel className="h-4 w-4" />
                  <AlertTitle>Medicare/Medicaid Rights</AlertTitle>
                  <AlertDescription>
                    If you are a Medicare or Medicaid beneficiary, you have specific rights 
                    regarding coverage and appeals.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 