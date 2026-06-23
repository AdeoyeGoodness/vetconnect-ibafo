// Shared domain types — mirror backend schema.sql. Single source of truth for the UI.

export type UserRole = 'OWNER' | 'CLINIC_ADMIN' | 'SUPER_ADMIN';
export type ClinicStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type VetStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type AnimalSpecies = 'DOG' | 'CAT' | 'POULTRY' | 'GOAT' | 'SHEEP' | 'CATTLE' | 'RABBIT' | 'OTHER';
export type AnimalGender = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type VaccinationStatus = 'DUE' | 'UPCOMING' | 'COMPLETED' | 'OVERDUE';
export type EmergencyStatus = 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'CANCELLED';
export type UrgencyLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type ReviewStatus = 'PUBLISHED' | 'PENDING' | 'HIDDEN' | 'FLAGGED';
export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
export type NotificationStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'READ';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  avatar_url?: string | null;
  location?: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export interface OperatingHours {
  [day: string]: { open: string; close: string } | null;
}

export interface Clinic {
  id: string;
  owner_id?: string | null;
  name: string;
  slug?: string;
  description?: string | null;
  address: string;
  town?: string | null;
  phone?: string | null;
  email?: string | null;
  operating_hours?: OperatingHours;
  services_offered: string[];
  animal_types: AnimalSpecies[];
  emergency_available: boolean;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string | null;
  cover_url?: string | null;
  rating_avg: number;
  rating_count: number;
  status: ClinicStatus;
  distance_km?: number; // populated by nearby/geo queries
  created_at: string;
}

export interface Veterinarian {
  id: string;
  clinic_id: string;
  full_name: string;
  license_number?: string | null;
  specialization?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  status: VetStatus;
}

export interface Animal {
  id: string;
  owner_id: string;
  name: string;
  species: AnimalSpecies;
  breed?: string | null;
  gender: AnimalGender;
  date_of_birth?: string | null;
  age_years?: number | null;
  weight_kg?: number | null;
  color?: string | null;
  vaccination_status?: string | null;
  medical_notes?: string | null;
  photo_url?: string | null;
  created_at: string;
}

export interface AppointmentSlot {
  id: string;
  clinic_id: string;
  vet_id?: string | null;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  owner_id: string;
  animal_id: string;
  vet_id?: string | null;
  service: string;
  scheduled_date: string;
  start_time: string;
  end_time?: string | null;
  status: AppointmentStatus;
  notes?: string | null;
  reject_reason?: string | null;
  created_at: string;
  // joined extras
  clinic?: Pick<Clinic, 'id' | 'name' | 'town' | 'phone'>;
  animal?: Pick<Animal, 'id' | 'name' | 'species'>;
}

export interface Review {
  id: string;
  clinic_id: string;
  user_id: string;
  appointment_id?: string | null;
  rating: number;
  body?: string | null;
  images: string[];
  status: ReviewStatus;
  created_at: string;
  author_name?: string;
  response?: ReviewResponse | null;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  responder_id: string;
  body: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  species?: AnimalSpecies | null;
  description?: string | null;
}

export interface Article {
  id: string;
  category_id?: string | null;
  title: string;
  slug: string;
  excerpt?: string | null;
  body: string;
  cover_url?: string | null;
  tags: string[];
  is_published: boolean;
  views: number;
  created_at: string;
  category?: Category;
}

export interface Vaccination {
  id: string;
  animal_id: string;
  vaccine_name: string;
  due_date: string;
  reminder_date?: string | null;
  administered_date?: string | null;
  status: VaccinationStatus;
  notes?: string | null;
}

export interface EmergencyRequest {
  id: string;
  user_id?: string | null;
  assigned_clinic_id?: string | null;
  animal_type: AnimalSpecies;
  symptoms: string;
  location_text?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone: string;
  urgency: UrgencyLevel;
  status: EmergencyStatus;
  resolved_note?: string | null;
  created_at: string;
}

// ── API envelopes ──────────────────────────────────────────────────────────
export interface ApiSuccess<T> { success: true; data: T; meta?: PageMeta }
export interface ApiFailure { success: false; error: string; details?: { path: string; message: string }[] }
export interface PageMeta { page: number; limit: number; total: number; totalPages: number }

export interface AuthResponse { token: string; user: User }
