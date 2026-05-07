export interface User {
  id: string
  name: string
  email: string
  role: "patient" | "provider" | "admin"
  createdAt: string
  updatedAt: string
}

export interface Patient extends User {
  role: "patient"
  dateOfBirth: string
  medicalHistory: string[]
  allergies: string[]
  medications: string[]
  address: Address
  preferredPharmacy: Pharmacy
}

export interface Provider extends User {
  role: "provider"
  specialty: string
  credentials: string[]
  licenseNumber: string
  licenseState: string
  licenseExpiration: string
  education: string[]
  yearsOfExperience: number
  bio: string
  address: Address
  availability: Availability | string // Allow flexible availability format
  consultationFee: number
  rating: number
  reviewCount: number
  isVerified: boolean
  verificationStatus: "pending" | "approved" | "rejected"
  acceptedInsurance: string[]
  acceptedCryptocurrencies: string[]
  services: string[]
  walletAddress?: string
  source?: "NPI" | "AI"
  phone?: string
  website?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  // Search-related optional properties
  relevanceScore?: number
  distance?: number | null
  distanceNote?: string
  isNearby?: boolean
  npi?: string
  npiNumber?: string
  zip?: string
  gender?: string
  languages?: string[]
  insurance?: string[]
  acceptingPatients?: boolean
}

export interface Admin extends User {
  role: "admin"
  permissions: string[]
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  full?: string
}

export interface Availability {
  days: string[]
  hours: {
    start: string
    end: string
  }
}

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  providerId: string
  providerName: string
  date: string
  startTime: string
  endTime: string
  status: string
  type: string
  notes?: string
  symptoms?: string[]
  diagnosis?: string[]
  meetingLink?: string
  payment_method?: "credit_card" | "insurance" | "cash" | "blockchain"
  payment_amount?: number
  blockchain_tx_hash?: string
}

export interface Prescription {
  id: string
  patientId: string
  providerId: string
  appointmentId: string
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  issuedDate: string
  expiryDate: string
  status: string
  refillsAllowed: number
  refillsRemaining: number
  pharmacyName: string
  pharmacyAddress: string
}

export interface LabOrder {
  id: string
  patientId: string
  providerId: string
  appointmentId: string
  testName: string
  testCode: string
  instructions: string
  issuedDate: string
  status: string
  labFacilityName: string
  labFacilityAddress: string
}

export interface ImagingOrder {
  id: string
  patientId: string
  providerId: string
  appointmentId: string
  imagingType: string
  bodyPart: string
  instructions: string
  issuedDate: string
  status: string
  imagingFacilityName: string
  imagingFacilityAddress: string
}

export interface Referral {
  id: string
  patientId: string
  referringProviderId: string
  referredToProviderId: string
  appointmentId: string
  reason: string
  notes: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface Review {
  id: string
  patientId: string
  providerId: string
  appointmentId: string
  rating: number
  comment: string
  createdAt: string
}

export interface ScreeningRecommendation {
  id: string
  name: string
  description: string
  ageRange: {
    min: number
    max: number
  }
  gender: "male" | "female" | "all"
  frequency: string
  riskFactors?: string[]
  specialtyNeeded: string
  importance: "essential" | "recommended" | "routine"
  grade?: string
  recommendedAge?: { min?: number; max?: number; recommended?: number }
  specialistTypes?: string[]
}

export interface Pharmacy {
  id: string
  name: string
  address: Address
  phone: string
  email: string
  hours: {
    Monday: { open: string; close: string }
    Tuesday: { open: string; close: string }
    Wednesday: { open: string; close: string }
    Thursday: { open: string; close: string }
    Friday: { open: string; close: string }
    Saturday: { open: string; close: string }
    Sunday: { open: string; close: string }
  }
}

export interface LabFacility {
  id: string
  name: string
  address: Address
  phone: string
  email: string
  services: string[]
  hours: {
    Monday: { open: string; close: string }
    Tuesday: { open: string; close: string }
    Wednesday: { open: string; close: string }
    Thursday: { open: string; close: string }
    Friday: { open: string; close: string }
    Saturday: { open: string; close: string }
    Sunday: { open: string; close: string }
  }
}

export interface ImagingFacility {
  id: string
  name: string
  address: Address
  phone: string
  email: string
  services: string[]
  hours: {
    Monday: { open: string; close: string }
    Tuesday: { open: string; close: string }
    Wednesday: { open: string; close: string }
    Thursday: { open: string; close: string }
    Friday: { open: string; close: string }
    Saturday: { open: string; close: string }
    Sunday: { open: string; close: string }
  }
}
