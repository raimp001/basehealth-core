// Admin Portal Types
export interface ApplicationBase {
  id: string
  submittedAt: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_info'
  reviewedAt?: string
  reviewedBy?: string
  notes?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export interface CaregiverApplication extends ApplicationBase {
  type: 'caregiver'
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
    }
    emergencyContact: {
      name: string
      relationship: string
      phone: string
    }
  }
  professionalInfo: {
    experience: string
    specialties: string[]
    certifications: string[]
    education: string
    previousEmployment: Array<{
      employer: string
      position: string
      duration: string
      reason: string
    }>
    availableSchedule: {
      fullTime: boolean
      partTime: boolean
      weekends: boolean
      nights: boolean
      holidays: boolean
    }
    hourlyRate: number
    serviceAreas: string[]
  }
  documentation: {
    resume?: string
    licenses: string[]
    certifications: string[]
    backgroundCheck?: string
    references: Array<{
      name: string
      relationship: string
      phone: string
      email: string
    }>
  }
  preferences: {
    clientTypes: string[]
    specialNeeds: string[]
    languagesSpoken: string[]
    ownTransportation: boolean
    willingToTravel: boolean
    maxTravelDistance: number
  }
}

export interface ProviderApplication extends ApplicationBase {
  type: 'provider'
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    npiNumber?: string
  }
  practiceInfo: {
    practiceName: string
    specialty: string
    subSpecialties: string[]
    boardCertifications: string[]
    medicalSchool: string
    residency: string
    fellowship?: string
    yearsOfExperience: number
  }
  licenseInfo: {
    medicalLicense: string
    licenseState: string
    licenseExpiration: string
    deaNumber?: string
    otherLicenses: Array<{
      type: string
      number: string
      state: string
      expiration: string
    }>
  }
  practiceDetails: {
    address: {
      street: string
      city: string
      state: string
      zipCode: string
    }
    phoneNumber: string
    website?: string
    acceptingNewPatients: boolean
    insuranceAccepted: string[]
    telemedicineOffered: boolean
    languagesSpoken: string[]
  }
  documentation: {
    medicalLicense: string
    boardCertifications: string[]
    cv?: string
    malpracticeInsurance: string
    references: Array<{
      name: string
      institution: string
      phone: string
      email: string
    }>
    resume?: string
    licenses?: string[]
    certifications?: string[]
  }
  verificationStatus: {
    npiVerified: boolean
    licenseVerified: boolean
    boardCertificationVerified: boolean
    malpracticeVerified: boolean
    backgroundCheckCompleted: boolean
  }
}

export type Application = CaregiverApplication | ProviderApplication

export interface ReviewAction {
  type: 'approve' | 'reject' | 'request_info' | 'schedule_interview'
  notes: string
  requestedDocuments?: string[]
  followUpDate?: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'super_admin' | 'reviewer'
  permissions: string[]
  department: 'operations' | 'clinical' | 'compliance' | 'quality'
}

export interface ApplicationStats {
  total: number
  pending: number
  underReview: number
  approved: number
  rejected: number
  requiresInfo: number
  averageReviewTime: number // in hours
  approvalRate: number // percentage
}

export interface ApplicationFilters {
  status?: Application['status'][]
  type?: Application['type'][]
  priority?: Application['priority'][]
  dateRange?: {
    start: string
    end: string
  }
  reviewer?: string
  specialty?: string
  location?: string
  search?: string
}
