"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StandardizedButton, PrimaryActionButton, DangerButton } from "@/components/ui/standardized-button"
import { FormError, SuccessMessage } from "@/components/ui/error-boundary"
import { StandardizedInput, StandardizedTextarea } from "@/components/ui/standardized-form"
import { components } from "@/lib/design-system"
import type { Application, CaregiverApplication, ProviderApplication, ReviewAction } from "@/types/admin"
import { 
  User, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  Download,
  Eye,
  Star,
  Award,
  Shield,
  Heart,
  Stethoscope,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import Link from "next/link"

interface ApplicationReviewCardProps {
  application: Application
  onReview: (applicationId: string, action: ReviewAction) => void
  className?: string
}

export function ApplicationReviewCard({ application, onReview, className }: ApplicationReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewAction, setReviewAction] = useState<ReviewAction['type'] | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'pending': return components.badge.warning
      case 'under_review': return components.badge.primary  
      case 'approved': return components.badge.success
      case 'rejected': return components.badge.error
      case 'requires_info': return components.badge.gray
      default: return components.badge.gray
    }
  }

  const getPriorityColor = (priority: Application['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return components.badge.gray
    }
  }

  const handleReviewSubmit = async () => {
    if (!reviewAction || !reviewNotes.trim()) return
    
    setIsReviewing(true)
    
    try {
      await onReview(application.id, {
        type: reviewAction,
        notes: reviewNotes
      })
      
      setShowSuccess(true)
      setReviewAction(null)
      setReviewNotes("")
      
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Review submission failed:', error)
    } finally {
      setIsReviewing(false)
    }
  }

  const renderPersonalInfo = () => {
    const info = application.personalInfo
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <User className="h-4 w-4" />
          Personal Information
        </h4>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Name:</span>
            <p className="font-medium">{info.firstName} {info.lastName}</p>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <p className="font-medium">{info.email}</p>
          </div>
          <div>
            <span className="text-gray-500">Phone:</span>
            <p className="font-medium">{info.phone}</p>
          </div>
          {application.type === 'provider' && (application as ProviderApplication).personalInfo.npiNumber && (
            <div>
              <span className="text-gray-500">NPI Number:</span>
              <p className="font-medium">{(application as ProviderApplication).personalInfo.npiNumber}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderCaregiverDetails = (app: CaregiverApplication) => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
          <Heart className="h-4 w-4" />
          Professional Experience
        </h4>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Experience:</span>
            <p className="font-medium">{app.professionalInfo.experience}</p>
          </div>
          <div>
            <span className="text-gray-500">Hourly Rate:</span>
            <p className="font-medium">${app.professionalInfo.hourlyRate}/hour</p>
          </div>
        </div>
      </div>
      
      <div>
        <span className="text-gray-500 text-sm">Specialties:</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {app.professionalInfo.specialties.map((specialty, index) => (
            <Badge key={index} className={components.badge.primary}>
              {specialty}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <span className="text-gray-500 text-sm">Certifications:</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {app.professionalInfo.certifications.map((cert, index) => (
            <Badge key={index} className={components.badge.success}>
              <Award className="h-3 w-3 mr-1" />
              {cert}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <span className="text-gray-500 text-sm">Service Areas:</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {app.professionalInfo.serviceAreas.map((area, index) => (
            <Badge key={index} className={components.badge.gray}>
              <MapPin className="h-3 w-3 mr-1" />
              {area}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <span className="text-gray-500 text-sm">Languages:</span>
        <p className="font-medium text-sm">{app.preferences.languagesSpoken.join(", ")}</p>
      </div>
    </div>
  )

  const renderProviderDetails = (app: ProviderApplication) => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
          <Stethoscope className="h-4 w-4" />
          Practice Information
        </h4>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Practice Name:</span>
            <p className="font-medium">{app.practiceInfo.practiceName}</p>
          </div>
          <div>
            <span className="text-gray-500">Specialty:</span>
            <p className="font-medium">{app.practiceInfo.specialty}</p>
          </div>
          <div>
            <span className="text-gray-500">Experience:</span>
            <p className="font-medium">{app.practiceInfo.yearsOfExperience} years</p>
          </div>
          <div>
            <span className="text-gray-500">Medical School:</span>
            <p className="font-medium">{app.practiceInfo.medicalSchool}</p>
          </div>
        </div>
      </div>

      <div>
        <span className="text-gray-500 text-sm">Board Certifications:</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {app.practiceInfo.boardCertifications.map((cert, index) => (
            <Badge key={index} className={components.badge.success}>
              <Award className="h-3 w-3 mr-1" />
              {cert}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4" />
          Verification Status
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {Object.entries(app.verificationStatus).map(([key, verified]) => (
            <div key={key} className="flex items-center gap-1">
              {verified ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <XCircle className="h-3 w-3 text-red-600" />
              )}
              <span className={verified ? "text-green-700" : "text-red-700"}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-gray-500 text-sm">Insurance Accepted:</span>
        <p className="font-medium text-sm">{app.practiceDetails.insuranceAccepted.join(", ")}</p>
      </div>
    </div>
  )

  return (
    <Card className={`p-6 ${components.card.base} hover:shadow-md transition-all duration-300 ${className}`}>
      {showSuccess && (
        <div className="mb-4">
          <SuccessMessage 
            message="Application review submitted successfully"
            title="Review Complete"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            application.type === 'caregiver' ? 'bg-pink-100' : 'bg-blue-100'
          }`}>
            {application.type === 'caregiver' ? (
              <Heart className={`h-6 w-6 ${application.type === 'caregiver' ? 'text-pink-600' : 'text-blue-600'}`} />
            ) : (
              <Stethoscope className="h-6 w-6 text-blue-600" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {application.personalInfo.firstName} {application.personalInfo.lastName}
            </h3>
            <p className="text-gray-600 capitalize">
              {application.type === 'caregiver' 
                ? (application as CaregiverApplication).professionalInfo.specialties[0]
                : (application as ProviderApplication).practiceInfo.specialty
              } • {application.type}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={getPriorityColor(application.priority)}>
            {application.priority}
          </Badge>
          <Badge className={getStatusColor(application.status)}>
            {application.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="h-4 w-4" />
          <span>Applied {new Date(application.submittedAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Mail className="h-4 w-4" />
          <span>{application.personalInfo.email}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="h-4 w-4" />
          <span>{application.personalInfo.phone}</span>
        </div>
      </div>

      {/* Expandable Details */}
      <div className="border-t border-gray-200 pt-4">
        <StandardizedButton
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-2 hover:bg-gray-50"
        >
          <span className="font-medium">
            {isExpanded ? 'Hide Details' : 'View Details'}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </StandardizedButton>

        {isExpanded && (
          <div className="mt-4 space-y-6">
            {renderPersonalInfo()}
            
            {application.type === 'caregiver' 
              ? renderCaregiverDetails(application as CaregiverApplication)
              : renderProviderDetails(application as ProviderApplication)
            }

            {/* Documentation */}
            <div>
              <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4" />
                Documentation
              </h4>
              <div className="grid md:grid-cols-2 gap-2">
                {application.documentation.resume && (
                  <StandardizedButton variant="ghost" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                    Resume/CV
                  </StandardizedButton>
                )}
                {application.documentation.licenses?.map((_: string, index: number) => (
                  <StandardizedButton key={index} variant="ghost" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                    License {index + 1}
                  </StandardizedButton>
                ))}
                {application.documentation.certifications?.map((_: string, index: number) => (
                  <StandardizedButton key={index} variant="ghost" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                    Certification {index + 1}
                  </StandardizedButton>
                ))}
              </div>
            </div>

            {/* Review Section */}
            {application.status === 'pending' || application.status === 'under_review' ? (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Review Application</h4>
                
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <StandardizedButton
                      variant={reviewAction === 'approve' ? 'success' : 'secondary'}
                      size="sm"
                      onClick={() => setReviewAction('approve')}
                      leftIcon={<CheckCircle className="h-4 w-4" />}
                    >
                      Approve
                    </StandardizedButton>
                    <StandardizedButton
                      variant={reviewAction === 'reject' ? 'error' : 'secondary'}
                      size="sm"
                      onClick={() => setReviewAction('reject')}
                      leftIcon={<XCircle className="h-4 w-4" />}
                    >
                      Reject
                    </StandardizedButton>
                    <StandardizedButton
                      variant={reviewAction === 'request_info' ? 'warning' : 'secondary'}
                      size="sm"
                      onClick={() => setReviewAction('request_info')}
                      leftIcon={<AlertCircle className="h-4 w-4" />}
                    >
                      Request Info
                    </StandardizedButton>
                    <StandardizedButton
                      variant={reviewAction === 'schedule_interview' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setReviewAction('schedule_interview')}
                      leftIcon={<Calendar className="h-4 w-4" />}
                    >
                      Schedule Interview
                    </StandardizedButton>
                  </div>

                  {reviewAction && (
                    <div className="space-y-3">
                      <StandardizedTextarea
                        label="Review Notes"
                        placeholder={`Add notes about your ${reviewAction} decision...`}
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        required
                      />
                      
                      <div className="flex gap-2">
                        <PrimaryActionButton
                          onClick={handleReviewSubmit}
                          loading={isReviewing}
                          loadingText="Submitting review..."
                          disabled={!reviewNotes.trim()}
                          size="sm"
                        >
                          Submit Review
                        </PrimaryActionButton>
                        <StandardizedButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReviewAction(null)
                            setReviewNotes("")
                          }}
                        >
                          Cancel
                        </StandardizedButton>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              application.notes && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Review Notes</h4>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                    {application.notes}
                  </p>
                  {application.reviewedBy && (
                    <p className="text-xs text-gray-500 mt-2">
                      Reviewed by {application.reviewedBy} on {application.reviewedAt && new Date(application.reviewedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
