import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface RequirementDetail {
  name: string;
  category?: string;
  what: string;
  why: string;
  who_issues?: string;
  where_get: string;
  where_submit: string;
  cost?: string;
  time?: string;
  mandatory?: string;
  mistakes?: string;
  processing_time?: string;
  validity?: string;
}

export interface LivingCost {
  accommodation: number;
  food: number;
  transport: number;
  insurance: number;
  misc: number;
}

export interface CityCost {
  name: string;
  rent_center: number;
  rent_outside: number;
  transport: number;
  meals: number;
}

export interface Scholarship {
  name: string;
  amount: string;
  eligibility: string;
  deadline: string;
  link: string;
}

export interface PostArrivalStep {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface InterviewTip {
  question: string;
  answer: string;
  dont_say: string;
}

export interface UserApplication {
  id: string;
  university: string;
  course: string;
  deadline: string;
  status: 'Draft' | 'Applied' | 'Documents Pending' | 'Offer Received' | 'Rejected' | 'Visa Stage';
}

export interface Country {
  id: number;
  name: string;
  exams: RequirementDetail[];
  documents: RequirementDetail[];
  visa_steps: string[];
  financial_requirement: string;
  work_rights: string;
  pr_possibility: string;
  timeline: { month: number; step: string; explanation: string }[];
  living_costs: LivingCost;
  city_costs?: CityCost[];
  scholarships?: Scholarship[];
  post_arrival_guide?: PostArrivalStep[];
  visa_prep?: InterviewTip[];
  part_time_info?: {
    hours_per_week: string;
    avg_wage: string;
    notes: string;
  };
  comparison_data: {
    tuition: number;
    livingCost: number;
    visaTime: string;
    workHours: string;
    prChance: string;
    visaDifficulty: 'Easy' | 'Moderate' | 'Competitive';
  };
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'admin';
}

export interface UserProgress {
  checklist: Record<string, string[]>; // countryName -> list of completed doc names
  timeline: Record<string, number[]>; // countryName -> list of completed month indices
  calculations: any[];
  applications: UserApplication[];
}
