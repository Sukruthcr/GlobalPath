import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("globalpath_v7.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    checklist_progress TEXT DEFAULT '{}',
    timeline_progress TEXT DEFAULT '{}',
    saved_calculations TEXT DEFAULT '[]',
    applications TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS countries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    exams TEXT,
    documents TEXT,
    visa_steps TEXT,
    financial_requirement TEXT,
    work_rights TEXT,
    pr_possibility TEXT,
    timeline TEXT,
    living_costs TEXT,
    city_costs TEXT,
    scholarships TEXT,
    post_arrival_guide TEXT,
    visa_prep TEXT,
    part_time_info TEXT,
    comparison_data TEXT
  );
`);

// Seed initial data if empty
const countryCount = db.prepare("SELECT COUNT(*) as count FROM countries").get() as { count: number };
if (countryCount.count === 0) {
  const commonDocs = [
    {
      category: "Identity Documents",
      items: [
        {
          name: "Passport",
          what: "Your official travel document issued by your government.",
          why: "Required for identity verification and visa stamping.",
          who_issues: "Passport Office / Ministry of External Affairs.",
          where_get: "Apply online at the official passport portal.",
          where_submit: "University application and Visa portal.",
          cost: "₹1,500 - ₹2,000",
          time: "15–30 days",
          mandatory: "Mandatory",
          mistakes: "Incorrect spelling of name; expiry date less than 6 months from travel."
        },
        {
          name: "Birth Certificate",
          what: "Official record of your birth date and place.",
          why: "Proof of age and identity.",
          who_issues: "Municipal Corporation / Registrar of Births.",
          where_get: "Local municipal office where you were born.",
          where_submit: "Visa application (sometimes required for identity).",
          cost: "₹100 - ₹500",
          time: "7–14 days",
          mandatory: "Mandatory",
          mistakes: "Name mismatch with passport; not translated if in regional language."
        },
        {
          name: "Passport Size Photos",
          what: "Recent photographs with specific background and size requirements.",
          why: "Required for visa forms and student ID cards.",
          who_issues: "Professional Photo Studio.",
          where_get: "Any local photo studio.",
          where_submit: "Visa application and University enrollment.",
          cost: "₹100 - ₹300",
          time: "1 day",
          mandatory: "Mandatory",
          mistakes: "Wearing glasses if not allowed; wrong background color (usually white needed)."
        }
      ]
    },
    {
      category: "Academic Documents",
      items: [
        {
          name: "10th & 12th Marksheets",
          what: "Official records of your secondary school grades.",
          why: "To prove your basic educational background.",
          who_issues: "School Board (CBSE/ICSE/State Board).",
          where_get: "From your school or board office.",
          where_submit: "University application.",
          cost: "Free (Originals)",
          time: "Immediate",
          mandatory: "Mandatory",
          mistakes: "Submitting only photocopies without notarization if required."
        },
        {
          name: "Degree Certificate",
          what: "Final certificate issued after completing graduation.",
          why: "Proof of highest qualification.",
          who_issues: "University.",
          where_get: "University registrar office.",
          where_submit: "University and Visa application.",
          cost: "₹500 - ₹2,000",
          time: "30–90 days after graduation",
          mandatory: "Mandatory",
          mistakes: "Losing the original; not having a provisional if final is delayed."
        },
        {
          name: "Transcripts",
          what: "A consolidated document showing all subjects and marks per semester.",
          why: "Universities need to see your detailed academic performance.",
          who_issues: "University / College.",
          where_get: "Request from the Registrar's office.",
          where_submit: "University application portal.",
          cost: "₹500 - ₹5,000",
          time: "15–30 days",
          mandatory: "Mandatory",
          mistakes: "Not getting them in sealed envelopes if requested by the uni."
        }
      ]
    },
    {
      category: "Application Documents",
      items: [
        {
          name: "Statement of Purpose (SOP)",
          what: "An essay explaining your goals and why you chose the course.",
          why: "Helps the admission committee understand your motivation.",
          who_issues: "You (The Student).",
          where_get: "Written by you.",
          where_submit: "University application.",
          cost: "Free",
          time: "2–4 weeks to draft",
          mandatory: "Mandatory",
          mistakes: "Copying from the internet; not mentioning specific university features."
        },
        {
          name: "Letters of Recommendation (LOR)",
          what: "Letters from professors or employers vouching for your skills.",
          why: "Third-party verification of your character and abilities.",
          who_issues: "Professors / Managers.",
          where_get: "Request from your college or workplace.",
          where_submit: "University application.",
          cost: "Free",
          time: "1–2 weeks",
          mandatory: "Mandatory",
          mistakes: "Getting LORs from people who don't know you well."
        },
        {
          name: "Updated Resume / CV",
          what: "A document summarizing your education, skills, and experience.",
          why: "Gives a quick overview of your profile to the admissions team.",
          who_issues: "You (The Student).",
          where_get: "Created by you.",
          where_submit: "University application.",
          cost: "Free",
          time: "1 week",
          mandatory: "Mandatory",
          mistakes: "Including irrelevant personal info; having spelling mistakes."
        },
        {
          name: "Experience Letters",
          what: "Letters from previous employers confirming your work duration and role.",
          why: "Required if you have a study gap or relevant work experience.",
          who_issues: "Previous Employers (HR).",
          where_get: "Request from your old company.",
          where_submit: "University and Visa application.",
          cost: "Free",
          time: "1–2 weeks",
          mandatory: "Mandatory (if you have work experience)",
          mistakes: "Not having the company letterhead or official seal."
        }
      ]
    },
    {
      category: "Financial Documents",
      items: [
        {
          name: "Bank Statements",
          what: "Record of transactions in your or your sponsor's account.",
          why: "Proof of available funds for tuition and living.",
          who_issues: "Bank.",
          where_get: "Your bank branch or online banking.",
          where_submit: "Visa application.",
          cost: "Free / Nominal fee",
          time: "Immediate",
          mandatory: "Mandatory",
          mistakes: "Sudden large deposits without explanation; old statements (must be recent)."
        },
        {
          name: "Income Tax Returns (ITR)",
          what: "Proof of annual income of the sponsor.",
          why: "To show the source of funds is legitimate.",
          who_issues: "Income Tax Department.",
          where_get: "From your CA or ITR portal.",
          where_submit: "Visa application.",
          cost: "Varies",
          time: "Immediate (if filed)",
          mandatory: "Mandatory for most countries",
          mistakes: "Not providing last 3 years of records."
        },
        {
          name: "Loan Sanction Letter",
          what: "Official document from a bank confirming your education loan approval.",
          why: "Primary proof of funds for many students.",
          who_issues: "Bank / NBFC.",
          where_get: "Your loan provider.",
          where_submit: "University and Visa application.",
          cost: "Processing fees apply",
          time: "15–30 days",
          mandatory: "Conditional (if taking a loan)",
          mistakes: "Submitting a 'pre-approval' instead of a final 'sanction' letter."
        }
      ]
    },
    {
      category: "General Requirements",
      items: [
        {
          name: "Notarized Copies",
          what: "Photocopies of your documents verified by a Notary Public.",
          why: "To prove that the photocopy is a true copy of the original.",
          who_issues: "Notary Public / Lawyer.",
          where_get: "Local court or notary office.",
          where_submit: "University application (if requested).",
          cost: "₹50 - ₹100 per page",
          time: "1 day",
          mandatory: "Conditional",
          mistakes: "Notary stamp being blurry or incomplete."
        },
        {
          name: "Certified Translations",
          what: "English translation of documents originally in regional languages.",
          why: "Universities and embassies only accept documents in English or the local language.",
          who_issues: "Certified Translators.",
          where_get: "Authorized translation agencies.",
          where_submit: "University and Visa application.",
          cost: "₹500 - ₹1,500 per document",
          time: "2–5 days",
          mandatory: "Mandatory (if original is not in English)",
          mistakes: "Using a non-certified translator; missing translator's seal."
        },
        {
          name: "Apostille / Legalization",
          what: "International verification of documents by the Ministry of External Affairs.",
          why: "Required by certain countries (like Italy, Spain) to verify document authenticity.",
          who_issues: "Ministry of External Affairs (MEA).",
          where_get: "Via authorized MEA agents.",
          where_submit: "Visa application.",
          cost: "₹500 - ₹2,500 per document",
          time: "7–15 days",
          mandatory: "Conditional (Country specific)",
          mistakes: "Applying for apostille on a laminated document."
        },
        {
          name: "Police Clearance Certificate (PCC)",
          what: "A document issued by the police confirming you have no criminal record.",
          why: "Required for visa processing to ensure safety.",
          who_issues: "Passport Office / Local Police.",
          where_get: "Apply via Passport Seva portal.",
          where_submit: "Visa application.",
          cost: "₹500",
          time: "7–21 days",
          mandatory: "Mandatory for some countries (e.g., Canada, Australia)",
          mistakes: "Applying too early (it has limited validity, usually 6 months)."
        }
      ]
    }
  ];

  const initialCountries = [
    {
      name: "Germany",
      exams: JSON.stringify([
        {
          name: "IELTS",
          what: "English language test.",
          why: "Required for English-taught programs.",
          who_issues: "IDP / British Council.",
          where_get: "Official test centers.",
          where_submit: "University and Visa.",
          cost: "₹17,000",
          time: "13 days",
          mandatory: "Mandatory",
          mistakes: "Not checking the minimum band requirement for each section."
        },
        {
          name: "APS Certificate",
          what: "Verification of Indian academic records.",
          why: "Mandatory for German student visa for Indian students.",
          who_issues: "APS India.",
          where_get: "aps-india.de",
          where_submit: "Visa application.",
          cost: "₹18,000",
          time: "4–6 weeks",
          mandatory: "Mandatory",
          mistakes: "Applying too late; incomplete document submission."
        }
      ]),
      documents: JSON.stringify([
        ...commonDocs.flatMap(c => c.items.map(item => ({ ...item, category: c.category }))),
        {
          category: "Visa Specific",
          name: "Blocked Account Confirmation",
          what: "Proof of €11,208 deposit in a German bank.",
          why: "Proof of living funds for the first year.",
          who_issues: "Expatrio / Fintiba / Deutsche Bank.",
          where_get: "Online portals of these providers.",
          where_submit: "Visa appointment.",
          cost: "€11,208 (Deposit) + Fees",
          time: "1–3 days",
          mandatory: "Mandatory",
          mistakes: "Depositing less than the required amount."
        },
        {
          category: "Visa Specific",
          name: "Health Insurance",
          what: "Travel and student health insurance.",
          why: "Mandatory for visa and university enrollment.",
          who_issues: "TK / AOK / Private providers.",
          where_get: "Online via providers.",
          where_submit: "Visa and University.",
          cost: "€110/month",
          time: "Immediate",
          mandatory: "Mandatory",
          mistakes: "Buying insurance that is not recognized by the embassy."
        }
      ]),
      visa_steps: JSON.stringify(["APS Verification", "University Admission", "Open Blocked Account", "Book Visa Appointment", "Visa Interview"]),
      financial_requirement: "Blocked Account: €11,208/year + Semester Fees",
      work_rights: "120 full days or 240 half days per year",
      pr_possibility: "High (Blue Card after 2 years working)",
      timeline: JSON.stringify([
        { month: 1, step: "IELTS & APS", explanation: "Start English prep and apply for APS verification immediately." },
        { month: 3, step: "University Search", explanation: "Shortlist public universities via DAAD." },
        { month: 5, step: "Applications", explanation: "Submit via Uni-Assist or direct portal." },
        { month: 7, step: "Blocked Account", explanation: "Transfer funds once you get an admission letter." },
        { month: 8, step: "Visa Interview", explanation: "Submit all documents at the VFS/Consulate." }
      ]),
      living_costs: JSON.stringify({
        accommodation: 450,
        food: 250,
        transport: 80,
        insurance: 110,
        misc: 100
      }),
      city_costs: JSON.stringify([
        { name: "Berlin", rent_center: 1100, rent_outside: 800, transport: 86, meals: 12 },
        { name: "Munich", rent_center: 1400, rent_outside: 1000, transport: 95, meals: 15 },
        { name: "Hamburg", rent_center: 1000, rent_outside: 750, transport: 80, meals: 12 }
      ]),
      scholarships: JSON.stringify([
        { name: "DAAD Scholarship", amount: "€934/month", eligibility: "Excellent academic record", deadline: "Varies (usually Oct-Dec)", link: "https://www.daad.de" },
        { name: "Deutschlandstipendium", amount: "€300/month", eligibility: "Top 10% students", deadline: "Varies by University", link: "https://www.deutschlandstipendium.de" }
      ]),
      post_arrival_guide: JSON.stringify([
        { title: "City Registration (Anmeldung)", description: "Register your address at the local Bürgeramt within 14 days.", priority: "High" },
        { title: "Health Insurance", description: "Activate your health insurance to get your social security number.", priority: "High" },
        { title: "Bank Account", description: "Open a local bank account (Girokonto) for daily transactions.", priority: "High" },
        { title: "Residence Permit", description: "Apply for your residence permit at the Ausländerbehörde.", priority: "High" }
      ]),
      visa_prep: JSON.stringify([
        { question: "Why Germany?", answer: "Mention high-quality education, low tuition fees, and specific industry links.", dont_say: "I just want to settle there for a job." },
        { question: "How will you fund your studies?", answer: "Explain the Blocked Account and any additional family support.", dont_say: "I will work part-time to pay my tuition." }
      ]),
      part_time_info: JSON.stringify({
        hours_per_week: "20 hours",
        avg_wage: "€12 - €15",
        notes: "Students can work 120 full days or 240 half days per year."
      }),
      comparison_data: JSON.stringify({ tuition: 500, livingCost: 11000, visaTime: "4-8 weeks", workHours: "20h", prChance: "High", visaDifficulty: "Moderate" })
    },
    {
      name: "United States",
      exams: JSON.stringify([
        {
          name: "GRE/GMAT",
          what: "Standardized tests for grad school.",
          why: "Required for admission ranking.",
          who_issues: "ETS / GMAC.",
          where_get: "Official websites.",
          where_submit: "University application.",
          cost: "₹20,000",
          time: "15 days",
          mandatory: "Conditional (Some unis waive it)",
          mistakes: "Not sending official scores via ETS/GMAC."
        }
      ]),
      documents: JSON.stringify([
        ...commonDocs.flatMap(c => c.items.map(item => ({ ...item, category: c.category }))),
        {
          category: "Visa Specific",
          name: "I-20 Form",
          what: "Certificate of Eligibility for F-1 Student Status.",
          why: "Proof of admission and financial support.",
          who_issues: "US University.",
          where_get: "Issued by the university after admission.",
          where_submit: "Visa interview.",
          cost: "Free (from uni)",
          time: "2–4 weeks",
          mandatory: "Mandatory",
          mistakes: "Incorrect personal details on the form."
        },
        {
          category: "Visa Specific",
          name: "SEVIS Fee Receipt",
          what: "Receipt for the Student and Exchange Visitor Information System fee.",
          why: "Required to maintain your record in the US system.",
          who_issues: "US DHS.",
          where_get: "fmjfee.com",
          where_submit: "Visa interview.",
          cost: "$350",
          time: "Immediate",
          mandatory: "Mandatory",
          mistakes: "Forgetting to pay before the interview."
        }
      ]),
      visa_steps: JSON.stringify(["Get I-20", "Pay SEVIS Fee", "DS-160 Form", "Biometrics Appointment", "Visa Interview"]),
      financial_requirement: "Approx. $40,000 - $60,000 (Tuition + Living)",
      work_rights: "20 hrs/week on-campus; OPT after graduation",
      pr_possibility: "Medium (H1-B to Green Card)",
      timeline: JSON.stringify([
        { month: 1, step: "GRE/TOEFL", explanation: "Take tests early to meet early deadlines." },
        { month: 3, step: "Applications", explanation: "Submit to 6–8 universities." },
        { month: 5, step: "I-20 & SEVIS", explanation: "Pay fees once you accept an offer." },
        { month: 7, step: "Visa Interview", explanation: "The most critical step for US study." }
      ]),
      living_costs: JSON.stringify({
        accommodation: 1000,
        food: 400,
        transport: 150,
        insurance: 200,
        misc: 200
      }),
      city_costs: JSON.stringify([
        { name: "New York", rent_center: 3500, rent_outside: 2200, transport: 127, meals: 25 },
        { name: "Texas (Austin)", rent_center: 1800, rent_outside: 1200, transport: 50, meals: 18 },
        { name: "California (LA)", rent_center: 2500, rent_outside: 1800, transport: 100, meals: 22 }
      ]),
      scholarships: JSON.stringify([
        { name: "Fulbright Foreign Student Program", amount: "Full Tuition + Living", eligibility: "Outstanding academic & leadership", deadline: "Varies by country", link: "https://foreign.fulbrightonline.org" },
        { name: "Hubert Humphrey Fellowship", amount: "Full Funding", eligibility: "Mid-career professionals", deadline: "Varies", link: "https://www.humphreyfellowship.org" }
      ]),
      post_arrival_guide: JSON.stringify([
        { title: "Check-in with DSO", description: "Report to your Designated School Official within 10 days.", priority: "High" },
        { title: "Social Security Number (SSN)", description: "Apply for an SSN if you have a job offer on campus.", priority: "High" },
        { title: "Bank Account", description: "Open a US bank account to manage your funds and pay bills.", priority: "High" },
        { title: "Driver's License", description: "Apply for a state ID or driver's license for identification.", priority: "Medium" }
      ]),
      visa_prep: JSON.stringify([
        { question: "Why this university?", answer: "Focus on specific research, faculty, or unique course curriculum.", dont_say: "It was the only one that accepted me." },
        { question: "What are your plans after graduation?", answer: "Clearly state your intent to return to your home country to apply your skills.", dont_say: "I want to find a job and stay in the US." }
      ]),
      part_time_info: JSON.stringify({
        hours_per_week: "20 hours",
        avg_wage: "$10 - $15",
        notes: "F-1 students are generally only allowed to work on-campus."
      }),
      comparison_data: JSON.stringify({ tuition: 35000, livingCost: 15000, visaTime: "3-5 weeks", workHours: "20h", prChance: "Medium", visaDifficulty: "Competitive" })
    },
    {
      name: "Canada",
      exams: JSON.stringify([
        {
          name: "IELTS Academic",
          what: "English test.",
          why: "SDS visa requires 6.0 in each band.",
          who_issues: "IDP.",
          where_get: "Official centers.",
          where_submit: "University and IRCC.",
          cost: "₹17,000",
          time: "13 days",
          mandatory: "Mandatory",
          mistakes: "Submitting General Training instead of Academic."
        }
      ]),
      documents: JSON.stringify([
        ...commonDocs.flatMap(c => c.items.map(item => ({ ...item, category: c.category }))),
        {
          category: "Visa Specific",
          name: "GIC Certificate",
          what: "Guaranteed Investment Certificate of $20,635 CAD.",
          why: "Proof of living funds for SDS visa.",
          who_issues: "CIBC / Scotiabank.",
          where_get: "Apply online at the bank's portal.",
          where_submit: "Visa application.",
          cost: "$20,635 CAD (Deposit)",
          time: "5–10 days",
          mandatory: "Mandatory for SDS",
          mistakes: "Not transferring the full amount including bank fees."
        },
        {
          category: "Visa Specific",
          name: "Medical Exam (Upfront)",
          what: "Health checkup by an approved doctor.",
          why: "Required for study permit.",
          who_issues: "Panel Physicians.",
          where_get: "Approved clinics.",
          where_submit: "Visa application.",
          cost: "₹5,000 - ₹8,000",
          time: "1 day",
          mandatory: "Mandatory",
          mistakes: "Going to a non-panel doctor."
        },
        {
          category: "Visa Specific",
          name: "Police Clearance Certificate (PCC)",
          what: "Verification of no criminal record.",
          why: "Required for Canadian study permit.",
          who_issues: "Passport Office / PSK.",
          where_get: "Passport Seva portal.",
          where_submit: "IRCC portal.",
          cost: "₹500",
          time: "7–15 days",
          mandatory: "Mandatory",
          mistakes: "Applying for the wrong type of PCC."
        }
      ]),
      visa_steps: JSON.stringify(["Get LOA", "Pay Tuition", "Open GIC", "Medical Exam", "Visa Application"]),
      financial_requirement: "Tuition + GIC ($20,635)",
      work_rights: "20 hrs/week off-campus; PGWP up to 3 years",
      pr_possibility: "Very High (Express Entry / PNP)",
      timeline: JSON.stringify([
        { month: 1, step: "IELTS", explanation: "Score 6.5+ for better chances." },
        { month: 3, step: "Apply DLI", explanation: "Apply only to Designated Learning Institutions." },
        { month: 5, step: "Tuition & GIC", explanation: "Pay first year tuition and open GIC." },
        { month: 7, step: "Visa Submission", explanation: "Submit via SDS for faster processing." }
      ]),
      living_costs: JSON.stringify({
        accommodation: 800,
        food: 350,
        transport: 120,
        insurance: 80,
        misc: 150
      }),
      city_costs: JSON.stringify([
        { name: "Toronto", rent_center: 2400, rent_outside: 1800, transport: 156, meals: 20 },
        { name: "Vancouver", rent_center: 2600, rent_outside: 1900, transport: 100, meals: 22 },
        { name: "Montreal", rent_center: 1500, rent_outside: 1100, transport: 90, meals: 18 }
      ]),
      scholarships: JSON.stringify([
        { name: "Vanier Canada Graduate Scholarships", amount: "$50,000/year", eligibility: "High academic achievement", deadline: "Nov 1", link: "https://vanier.gc.ca" },
        { name: "Ontario Graduate Scholarship (OGS)", amount: "$15,000/year", eligibility: "Merit-based for grad students", deadline: "Varies by Uni", link: "https://osap.gov.on.ca" }
      ]),
      post_arrival_guide: JSON.stringify([
        { title: "Study Permit at Port of Entry", description: "Collect your official study permit from the CBSA officer at the airport.", priority: "High" },
        { title: "Social Insurance Number (SIN)", description: "Apply for a SIN at a Service Canada office to work part-time.", priority: "High" },
        { title: "Provincial Health Insurance", description: "Apply for provincial health coverage (e.g., OHIP in Ontario).", priority: "High" },
        { title: "Student ID Card", description: "Get your university ID card for campus access and student discounts.", priority: "Medium" }
      ]),
      visa_prep: JSON.stringify([
        { question: "Why Canada?", answer: "Highlight the quality of education, post-graduation work permit (PGWP), and multicultural environment.", dont_say: "I want to immigrate permanently." },
        { question: "How will you support yourself?", answer: "Mention your GIC, tuition payment, and any additional family support.", dont_say: "I will work off-campus to pay my tuition." }
      ]),
      part_time_info: JSON.stringify({
        hours_per_week: "20 hours",
        avg_wage: "$15 - $18 CAD",
        notes: "Off-campus work is allowed for 20 hours per week during semesters."
      }),
      comparison_data: JSON.stringify({ tuition: 25000, livingCost: 15000, visaTime: "8-12 weeks", workHours: "20h", prChance: "Very High", visaDifficulty: "Moderate" })
    },
    {
      name: "Australia",
      exams: JSON.stringify([
        {
          name: "PTE Academic",
          what: "Pearson Test of English.",
          why: "Preferred English test for Australian student visa.",
          who_issues: "Pearson.",
          where_get: "Pearson test centers.",
          where_submit: "University and Home Affairs.",
          cost: "₹16,000",
          time: "48 hours",
          mandatory: "Mandatory",
          mistakes: "Not sharing the score report electronically via Pearson portal."
        }
      ]),
      documents: JSON.stringify([
        ...commonDocs.flatMap(c => c.items.map(item => ({ ...item, category: c.category }))),
        {
          category: "Visa Specific",
          name: "eCoE (Electronic Confirmation of Enrolment)",
          what: "Document confirming your enrolment and tuition payment.",
          why: "Mandatory for Subclass 500 visa application.",
          who_issues: "Australian University.",
          where_get: "Issued after you pay tuition and OSHC.",
          where_submit: "ImmiAccount (Visa portal).",
          cost: "Free (after payment)",
          time: "2–7 days",
          mandatory: "Mandatory",
          mistakes: "Applying for visa before receiving the eCoE."
        },
        {
          category: "Visa Specific",
          name: "OSHC (Overseas Student Health Cover)",
          what: "Health insurance for the duration of your stay.",
          why: "Mandatory visa requirement.",
          who_issues: "Bupa / Allianz / Medibank.",
          where_get: "Usually via university or direct online.",
          where_submit: "Visa application.",
          cost: "₹30,000 - ₹50,000/year",
          time: "Immediate",
          mandatory: "Mandatory",
          mistakes: "Not covering the full duration of the visa."
        },
        {
          category: "Visa Specific",
          name: "Police Clearance Certificate (PCC)",
          what: "Verification of no criminal record.",
          why: "Required for Australian student visa.",
          who_issues: "Passport Office / PSK.",
          where_get: "Passport Seva portal.",
          where_submit: "ImmiAccount.",
          cost: "₹500",
          time: "7–15 days",
          mandatory: "Mandatory",
          mistakes: "Not having a PCC that is less than 12 months old."
        }
      ]),
      visa_steps: JSON.stringify(["Apply Uni", "GTE Assessment", "Pay Tuition & OSHC", "Get eCoE", "Visa Application"]),
      financial_requirement: "Tuition + Living ($24,505 AUD)",
      work_rights: "48 hrs per fortnight",
      pr_possibility: "High (Points-based system)",
      timeline: JSON.stringify([
        { month: 1, step: "English Test", explanation: "Take PTE as it's widely accepted and fast." },
        { month: 3, step: "GTE Check", explanation: "Submit documents for Genuine Temporary Entrant check." },
        { month: 5, step: "Payment", explanation: "Pay tuition and OSHC to get eCoE." },
        { month: 6, step: "Visa Lodge", explanation: "Submit Subclass 500 application." }
      ]),
      living_costs: JSON.stringify({
        accommodation: 900,
        food: 400,
        transport: 150,
        insurance: 50,
        misc: 200
      }),
      city_costs: JSON.stringify([
        { name: "Sydney", rent_center: 2800, rent_outside: 2000, transport: 180, meals: 25 },
        { name: "Melbourne", rent_center: 2200, rent_outside: 1600, transport: 160, meals: 22 },
        { name: "Brisbane", rent_center: 1800, rent_outside: 1300, transport: 140, meals: 20 }
      ]),
      scholarships: JSON.stringify([
        { name: "Australia Awards", amount: "Full Tuition + Stipend", eligibility: "Students from partner countries", deadline: "April 30", link: "https://www.dfat.gov.au" },
        { name: "Destination Australia", amount: "$15,000/year", eligibility: "Studying in regional Australia", deadline: "Varies", link: "https://www.education.gov.au" }
      ]),
      post_arrival_guide: JSON.stringify([
        { title: "Apply for TFN", description: "Apply for a Tax File Number (TFN) online via the ATO to work.", priority: "High" },
        { title: "Open Bank Account", description: "Visit a branch of CommBank, ANZ, or Westpac to open an account.", priority: "High" },
        { title: "Get USI", description: "Create your Unique Student Identifier (USI) for your academic records.", priority: "High" },
        { title: "Medicare/OSHC", description: "Register your OSHC details with a local provider.", priority: "Medium" }
      ]),
      visa_prep: JSON.stringify([
        { question: "Why Australia?", answer: "Mention the high standard of living, quality of education, and post-study work opportunities.", dont_say: "I want to work and earn back my fees." },
        { question: "What is GTE?", answer: "Explain that you are a Genuine Temporary Entrant with strong ties to your home country.", dont_say: "I don't know what that is." }
      ]),
      part_time_info: JSON.stringify({
        hours_per_week: "48 hours per fortnight",
        avg_wage: "$23 - $28 AUD",
        notes: "Students can work 48 hours every two weeks while university is in session."
      }),
      comparison_data: JSON.stringify({ tuition: 30000, livingCost: 18000, visaTime: "4-6 weeks", workHours: "24h", prChance: "High", visaDifficulty: "Moderate" })
    },
    {
      name: "United Kingdom",
      exams: JSON.stringify([
        {
          name: "IELTS for UKVI",
          what: "Secure English Language Test (SELT).",
          why: "Required for UK Student Visa.",
          who_issues: "British Council / IDP.",
          where_get: "UKVI approved centers.",
          where_submit: "University and UKVI.",
          cost: "₹18,000",
          time: "13 days",
          mandatory: "Mandatory",
          mistakes: "Taking standard IELTS instead of IELTS for UKVI."
        }
      ]),
      documents: JSON.stringify([
        ...commonDocs.flatMap(c => c.items.map(item => ({ ...item, category: c.category }))),
        {
          category: "Visa Specific",
          name: "CAS Letter",
          what: "Confirmation of Acceptance for Studies.",
          why: "Unique reference number needed for visa.",
          who_issues: "UK University.",
          where_get: "Issued after you accept offer and pay deposit.",
          where_submit: "Visa application.",
          cost: "Free (after deposit)",
          time: "1–2 weeks",
          mandatory: "Mandatory",
          mistakes: "Using an expired CAS (valid for 6 months)."
        },
        {
          category: "Visa Specific",
          name: "TB Test Certificate",
          what: "Medical clearance for Tuberculosis.",
          why: "Mandatory for residents of certain countries including India.",
          who_issues: "UKVI approved clinics.",
          where_get: "Approved hospitals in major cities.",
          where_submit: "Visa application.",
          cost: "₹6,000",
          time: "1 day",
          mandatory: "Mandatory",
          mistakes: "Getting tested at a non-approved clinic."
        }
      ]),
      visa_steps: JSON.stringify(["Apply Uni", "Get CAS", "Pay IHS Fee", "Visa Application", "Biometrics"]),
      financial_requirement: "Tuition + £1,334/month (London) or £1,023/month (Outside)",
      work_rights: "20 hrs/week",
      pr_possibility: "Moderate (Graduate Route visa for 2 years)",
      timeline: JSON.stringify([
        { month: 1, step: "IELTS for UKVI", explanation: "Ensure you take the UKVI version." },
        { month: 3, step: "Applications", explanation: "Apply to 5 universities via UCAS or direct." },
        { month: 5, step: "CAS Request", explanation: "Pay deposit and request CAS letter." },
        { month: 6, step: "Visa & IHS", explanation: "Pay health surcharge and submit visa." }
      ]),
      living_costs: JSON.stringify({
        accommodation: 700,
        food: 300,
        transport: 100,
        insurance: 60,
        misc: 150
      }),
      city_costs: JSON.stringify([
        { name: "London", rent_center: 2200, rent_outside: 1500, transport: 160, meals: 18 },
        { name: "Manchester", rent_center: 1100, rent_outside: 800, transport: 80, meals: 15 },
        { name: "Birmingham", rent_center: 1000, rent_outside: 750, transport: 75, meals: 14 }
      ]),
      scholarships: JSON.stringify([
        { name: "Chevening Scholarships", amount: "Full Funding", eligibility: "Leadership potential", deadline: "November", link: "https://www.chevening.org" },
        { name: "Commonwealth Scholarships", amount: "Full Funding", eligibility: "Students from Commonwealth countries", deadline: "Varies", link: "https://cscuk.fcdo.gov.uk" }
      ]),
      post_arrival_guide: JSON.stringify([
        { title: "Collect BRP", description: "Collect your Biometric Residence Permit from the designated Post Office.", priority: "High" },
        { title: "GP Registration", description: "Register with a local General Practitioner (GP) for health services.", priority: "High" },
        { title: "NI Number", description: "Apply for a National Insurance (NI) number if you plan to work.", priority: "High" },
        { title: "Student Oyster Card", description: "Apply for a student discount card for London transport.", priority: "Medium" }
      ]),
      visa_prep: JSON.stringify([
        { question: "Why the UK?", answer: "Focus on the shorter course durations, world-class universities, and cultural heritage.", dont_say: "It's easier to get into than the US." },
        { question: "How will you pay for your stay?", answer: "Explain your bank statements and CAS financial details.", dont_say: "I will find a job as soon as I land." }
      ]),
      part_time_info: JSON.stringify({
        hours_per_week: "20 hours",
        avg_wage: "£10 - £12",
        notes: "Students on a student visa can usually work up to 20 hours per week during term time."
      }),
      comparison_data: JSON.stringify({ tuition: 20000, livingCost: 12000, visaTime: "3 weeks", workHours: "20h", prChance: "Moderate", visaDifficulty: "Easy" })
    },
    {
      name: "New Zealand",
      exams: JSON.stringify([
        {
          name: "IELTS/PTE",
          what: "English proficiency test.",
          why: "Proof of language skills.",
          who_issues: "Authorized centers.",
          where_get: "Test centers.",
          where_submit: "University portal.",
          cost: "₹16,000",
          time: "13 days",
          mandatory: "Mandatory",
          mistakes: "Not meeting the minimum band score for the specific course."
        }
      ]),
      documents: JSON.stringify([
        ...commonDocs.flatMap(c => c.items.map(item => ({ ...item, category: c.category }))),
        {
          category: "Visa Specific",
          name: "Offer of Place",
          what: "Admission letter from a NZ institution.",
          why: "Proof of enrolment for visa.",
          who_issues: "NZ University.",
          where_get: "From the university.",
          where_submit: "Immigration NZ.",
          cost: "Free",
          time: "2–4 weeks",
          mandatory: "Mandatory",
          mistakes: "Submitting a conditional offer for visa."
        },
        {
          category: "Visa Specific",
          name: "Financial Undertaking Form",
          what: "Form signed by sponsor promising financial support.",
          why: "Mandatory proof of funds.",
          who_issues: "Immigration NZ (Form INZ 1014).",
          where_get: "Immigration NZ website.",
          where_submit: "Visa application.",
          cost: "Free",
          time: "Immediate",
          mandatory: "Mandatory",
          mistakes: "Incomplete details or missing signatures."
        }
      ]),
      visa_steps: JSON.stringify(["Apply Uni", "Get Offer", "Pay Tuition", "Visa Application", "Medical"]),
      financial_requirement: "Tuition + $20,000 NZD per year",
      work_rights: "20 hrs/week",
      pr_possibility: "High (Green List occupations)",
      timeline: JSON.stringify([
        { month: 1, step: "Research", explanation: "Focus on Green List sectors for PR chances." },
        { month: 3, step: "Apply", explanation: "Submit academic transcripts." },
        { month: 5, step: "Visa Prep", explanation: "Arrange $20k NZD living funds." },
        { month: 6, step: "Visa Lodge", explanation: "Submit to Immigration NZ." }
      ]),
      living_costs: JSON.stringify({
        accommodation: 750,
        food: 350,
        transport: 100,
        insurance: 50,
        misc: 150
      }),
      city_costs: JSON.stringify([
        { name: "Auckland", rent_center: 2100, rent_outside: 1600, transport: 150, meals: 20 },
        { name: "Wellington", rent_center: 1900, rent_outside: 1400, transport: 120, meals: 18 },
        { name: "Christchurch", rent_center: 1600, rent_outside: 1200, transport: 100, meals: 16 }
      ]),
      scholarships: JSON.stringify([
        { name: "New Zealand Scholarships", amount: "Full Funding", eligibility: "Students from developing countries", deadline: "Varies", link: "https://www.nzscholarships.govt.nz" },
        { name: "University of Auckland Scholarships", amount: "Varies", eligibility: "Merit-based", deadline: "Varies", link: "https://www.auckland.ac.nz" }
      ]),
      post_arrival_guide: JSON.stringify([
        { title: "IRD Number", description: "Apply for an IRD number online for tax purposes if you plan to work.", priority: "High" },
        { title: "Bank Account", description: "Open an account with ANZ, ASB, or BNZ.", priority: "High" },
        { title: "Student ID", description: "Get your university ID for access and transport discounts.", priority: "Medium" },
        { title: "Health Insurance", description: "Confirm your insurance coverage is active.", priority: "Medium" }
      ]),
      visa_prep: JSON.stringify([
        { question: "Why New Zealand?", answer: "Mention the safe environment, high-quality education, and beautiful nature.", dont_say: "I want to move there permanently for the scenery." },
        { question: "What are your plans after study?", answer: "Explain how the qualification will help your career in your home country.", dont_say: "I will look for a job and stay forever." }
      ]),
      part_time_info: JSON.stringify({
        hours_per_week: "20 hours",
        avg_wage: "$22 - $25 NZD",
        notes: "Most student visas allow you to work up to 20 hours a week during the term."
      }),
      comparison_data: JSON.stringify({ tuition: 22000, livingCost: 14000, visaTime: "4-8 weeks", workHours: "20h", prChance: "High", visaDifficulty: "Moderate" })
    },
    {
      name: "Italy",
      exams: JSON.stringify([
        {
          name: "IELTS/TOEFL",
          what: "English proficiency test.",
          why: "Required for English-taught programs.",
          who_issues: "British Council / ETS.",
          where_get: "Test centers.",
          where_submit: "University portal.",
          cost: "₹17,000",
          time: "13 days",
          mandatory: "Mandatory",
          mistakes: "Not checking if the university accepts MOI (Medium of Instruction) instead."
        }
      ]),
      documents: JSON.stringify([
        ...commonDocs.flatMap(c => c.items.map(item => ({ ...item, category: c.category }))),
        {
          category: "Visa Specific",
          name: "DOV (Declaration of Value)",
          what: "Official document verifying your academic qualifications.",
          why: "Mandatory for enrollment and visa for many Italian universities.",
          who_issues: "Italian Embassy/Consulate.",
          where_get: "Apply via the Italian consulate in your home country.",
          where_submit: "University and Visa.",
          cost: "Varies",
          time: "4–8 weeks",
          mandatory: "Mandatory",
          mistakes: "Starting the DOV process too late."
        },
        {
          category: "Visa Specific",
          name: "Universitaly Summary",
          what: "Summary of your pre-enrollment application.",
          why: "Required for the visa application.",
          who_issues: "Universitaly Portal.",
          where_get: "universitaly.it",
          where_submit: "Visa application.",
          cost: "Free",
          time: "1-2 weeks",
          mandatory: "Mandatory",
          mistakes: "Not completing the pre-enrollment on the portal."
        }
      ]),
      visa_steps: JSON.stringify(["Universitaly Pre-enrollment", "University Admission", "DOV/CIMEA", "Visa Application", "Codice Fiscale"]),
      financial_requirement: "Approx. €6,000 - €10,000 per year",
      work_rights: "20 hrs/week",
      pr_possibility: "Moderate (Permesso di Soggiorno for work after study)",
      timeline: JSON.stringify([
        { month: 1, step: "Research", explanation: "Find English-taught courses on Universitaly." },
        { month: 3, step: "Apply", explanation: "Submit applications to universities." },
        { month: 5, step: "Pre-enroll", explanation: "Complete Universitaly pre-enrollment." },
        { month: 7, step: "Visa", explanation: "Apply for the Type D National Visa." }
      ]),
      living_costs: JSON.stringify({
        accommodation: 500,
        food: 250,
        transport: 50,
        insurance: 150,
        misc: 100
      }),
      city_costs: JSON.stringify([
        { name: "Milan", rent_center: 1200, rent_outside: 800, transport: 35, meals: 15 },
        { name: "Rome", rent_center: 1000, rent_outside: 700, transport: 35, meals: 14 },
        { name: "Florence", rent_center: 800, rent_outside: 600, transport: 30, meals: 12 }
      ]),
      scholarships: JSON.stringify([
        { name: "DSU Regional Scholarship", amount: "Full Tuition + €6,000", eligibility: "Based on family income (ISEE)", deadline: "August/September", link: "Varies by region" },
        { name: "Invest Your Talent in Italy", amount: "€8,000 stipend", eligibility: "Students from specific countries", deadline: "February", link: "https://investyourtalentitaly.esteri.it" }
      ]),
      post_arrival_guide: JSON.stringify([
        { title: "Codice Fiscale", description: "Get your tax code from the Agenzia delle Entrate.", priority: "High" },
        { title: "Permesso di Soggiorno", description: "Apply for your residence permit within 8 days of arrival.", priority: "High" },
        { title: "Health Insurance", description: "Register with the SSN (Servizio Sanitario Nazionale).", priority: "High" },
        { title: "Bank Account", description: "Open a local account for your scholarship payments.", priority: "Medium" }
      ]),
      visa_prep: JSON.stringify([
        { question: "Why Italy?", answer: "Focus on the specific course, the reputation of the university, and Italy's contribution to your field.", dont_say: "I like the food and the weather." },
        { question: "What is your plan after graduation?", answer: "I intend to return to my country to work in [Field].", dont_say: "I want to find a job in Europe." }
      ]),
      part_time_info: JSON.stringify({
        hours_per_week: "20 hours",
        avg_wage: "€8 - €10",
        notes: "Students can work up to 20 hours per week, but jobs can be competitive without Italian language skills."
      }),
      comparison_data: JSON.stringify({ tuition: 3000, livingCost: 9000, visaTime: "4-8 weeks", workHours: "20h", prChance: "Moderate", visaDifficulty: "Moderate" })
    },
    {
      name: "Ireland",
      exams: JSON.stringify([
        {
          name: "IELTS/PTE",
          what: "English proficiency test.",
          why: "Mandatory for Irish student visa.",
          who_issues: "British Council / Pearson.",
          where_get: "Test centers.",
          where_submit: "University and Visa.",
          cost: "₹17,000",
          time: "13 days",
          mandatory: "Mandatory",
          mistakes: "Not checking the specific score requirements for the university."
        }
      ]),
      documents: JSON.stringify([
        ...commonDocs.flatMap(c => c.items.map(item => ({ ...item, category: c.category }))),
        {
          category: "Visa Specific",
          name: "Tuition Fee Receipt",
          what: "Proof of full payment of tuition fees.",
          why: "Mandatory for visa if fees are below €6,000; otherwise, proof of €6,000 payment.",
          who_issues: "Irish University.",
          where_get: "Issued after payment.",
          where_submit: "Visa application.",
          cost: "Varies",
          time: "1 week",
          mandatory: "Mandatory",
          mistakes: "Submitting only a partial payment receipt."
        },
        {
          category: "Visa Specific",
          name: "Private Medical Insurance",
          what: "Comprehensive health insurance.",
          why: "Mandatory for non-EU students.",
          who_issues: "VHI / Laya / Irish Life.",
          where_get: "Online via providers.",
          where_submit: "Visa and IRP.",
          cost: "€160 - €500/year",
          time: "Immediate",
          mandatory: "Mandatory",
          mistakes: "Buying insurance that doesn't meet the minimum coverage requirements."
        }
      ]),
      visa_steps: JSON.stringify(["Apply Uni", "Pay Fees", "Visa Application", "Biometrics", "IRP Registration"]),
      financial_requirement: "€10,000 per year (Proof of access to funds)",
      work_rights: "20 hrs/week (40 hrs during holidays)",
      pr_possibility: "High (Critical Skills Employment Permit)",
      timeline: JSON.stringify([
        { month: 1, step: "Research", explanation: "Identify universities and ITs (Institutes of Technology)." },
        { month: 3, step: "Apply", explanation: "Submit applications via university portals." },
        { month: 5, step: "Visa Prep", explanation: "Pay fees and arrange medical insurance." },
        { month: 7, step: "Visa Lodge", explanation: "Submit application to the Irish Embassy." }
      ]),
      living_costs: JSON.stringify({
        accommodation: 800,
        food: 300,
        transport: 100,
        insurance: 50,
        misc: 150
      }),
      city_costs: JSON.stringify([
        { name: "Dublin", rent_center: 2000, rent_outside: 1500, transport: 120, meals: 18 },
        { name: "Cork", rent_center: 1400, rent_outside: 1100, transport: 80, meals: 15 },
        { name: "Galway", rent_center: 1200, rent_outside: 900, transport: 70, meals: 14 }
      ]),
      scholarships: JSON.stringify([
        { name: "Government of Ireland International Education Scholarship", amount: "€10,000 + Full Tuition", eligibility: "High achieving students", deadline: "March", link: "https://eurireland.ie" },
        { name: "UCD Global Excellence Scholarship", amount: "50% - 100% Tuition", eligibility: "Merit-based", deadline: "Varies", link: "https://www.ucd.ie" }
      ]),
      post_arrival_guide: JSON.stringify([
        { title: "IRP Registration", description: "Register with the Garda National Immigration Bureau for your IRP card.", priority: "High" },
        { title: "PPS Number", description: "Apply for a Personal Public Service (PPS) number to work and access services.", priority: "High" },
        { title: "Bank Account", description: "Open an account with AIB or Bank of Ireland.", priority: "High" },
        { title: "Leap Card", description: "Get a Student Leap Card for discounted public transport.", priority: "Medium" }
      ]),
      visa_prep: JSON.stringify([
        { question: "Why Ireland?", answer: "Highlight the English-speaking environment, the tech hub (Google, Meta HQ), and the 2-year stay-back option.", dont_say: "I couldn't get into the UK." },
        { question: "How will you fund your studies?", answer: "Explain your family's financial standing and the €10,000 proof of funds.", dont_say: "I will work in a pub to pay my rent." }
      ]),
      part_time_info: JSON.stringify({
        hours_per_week: "20 hours",
        avg_wage: "€12.70 (Minimum Wage)",
        notes: "Students can work 20 hours per week during term and 40 hours during June, July, August, and September."
      }),
      comparison_data: JSON.stringify({ tuition: 18000, livingCost: 12000, visaTime: "4-8 weeks", workHours: "20h", prChance: "High", visaDifficulty: "Moderate" })
    }
  ];

  const insert = db.prepare(`
    INSERT OR REPLACE INTO countries (name, exams, documents, visa_steps, financial_requirement, work_rights, pr_possibility, timeline, living_costs, city_costs, scholarships, post_arrival_guide, visa_prep, part_time_info, comparison_data)
    VALUES (@name, @exams, @documents, @visa_steps, @financial_requirement, @work_rights, @pr_possibility, @timeline, @living_costs, @city_costs, @scholarships, @post_arrival_guide, @visa_prep, @part_time_info, @comparison_data)
  `);

  for (const country of initialCountries) {
    insert.run(country);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

  app.use(express.json());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // API Routes
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const result = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)").run(name, email, hashedPassword);
      const token = jwt.sign({ id: result.lastInsertRowid, email, role: 'student' }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, name, email, role: 'student' } });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email, role: user.role } });
  });

  app.get("/api/countries", (req, res) => {
    const countries = db.prepare("SELECT * FROM countries").all();
    res.json(countries.map((c: any) => ({
      ...c,
      exams: JSON.parse(c.exams || '[]'),
      documents: JSON.parse(c.documents || '[]'),
      visa_steps: JSON.parse(c.visa_steps || '[]'),
      timeline: JSON.parse(c.timeline || '[]'),
      living_costs: JSON.parse(c.living_costs || '{}'),
      city_costs: JSON.parse(c.city_costs || '[]'),
      scholarships: JSON.parse(c.scholarships || '[]'),
      post_arrival_guide: JSON.parse(c.post_arrival_guide || '[]'),
      visa_prep: JSON.parse(c.visa_prep || '[]'),
      part_time_info: JSON.parse(c.part_time_info || '{}'),
      comparison_data: JSON.parse(c.comparison_data || '{}')
    })));
  });

  app.get("/api/user/progress", authenticate, (req: any, res) => {
    const user = db.prepare("SELECT checklist_progress, timeline_progress, saved_calculations, applications FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      checklist: JSON.parse(user.checklist_progress || '{}'),
      timeline: JSON.parse(user.timeline_progress || '{}'),
      calculations: JSON.parse(user.saved_calculations || '[]'),
      applications: JSON.parse(user.applications || '[]')
    });
  });

  app.post("/api/user/progress", authenticate, (req: any, res) => {
    const { checklist, timeline, calculations, applications } = req.body;
    const result = db.prepare("UPDATE users SET checklist_progress = ?, timeline_progress = ?, saved_calculations = ?, applications = ? WHERE id = ?")
      .run(JSON.stringify(checklist), JSON.stringify(timeline), JSON.stringify(calculations), JSON.stringify(applications), req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: "User not found" });
    res.json({ success: true });
  });

  // Admin Routes
  app.post("/api/admin/countries", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { 
      name, exams, documents, visa_steps, financial_requirement, 
      work_rights, pr_possibility, timeline, living_costs, 
      city_costs, scholarships, post_arrival_guide, 
      visa_prep, part_time_info, comparison_data 
    } = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO countries (
        name, exams, documents, visa_steps, financial_requirement, 
        work_rights, pr_possibility, timeline, living_costs, 
        city_costs, scholarships, post_arrival_guide, 
        visa_prep, part_time_info, comparison_data
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, JSON.stringify(exams), JSON.stringify(documents), 
      JSON.stringify(visa_steps), financial_requirement, work_rights, 
      pr_possibility, JSON.stringify(timeline), JSON.stringify(living_costs),
      JSON.stringify(city_costs), JSON.stringify(scholarships), 
      JSON.stringify(post_arrival_guide), JSON.stringify(visa_prep), 
      JSON.stringify(part_time_info), JSON.stringify(comparison_data)
    );
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
