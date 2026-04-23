import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, Calculator, Calendar, BarChart3, CheckCircle2, 
  User as UserIcon, LogOut, Menu, X, ChevronRight, 
  Download, Plus, Trash2, MessageSquare, Shield, Linkedin,
  FileText, Sparkles
} from 'lucide-react';
import { useAuth, AuthProvider } from './AuthContext';
import { Country, RequirementDetail, cn } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { askAssistant, generateSOP } from './services/geminiService';
import { fetchCountries } from './services/countryService';
import { doc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

// --- Components ---

const LiveUsersCounter = () => {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const sessionId = crypto.randomUUID();
    const presenceRef = doc(db, 'presence', sessionId);

    const updatePresence = () => {
      setDoc(presenceRef, { lastActive: Date.now() }).catch(console.error);
    };

    updatePresence();
    const intervalId = setInterval(updatePresence, 30000);

    const handleUnload = () => {
      deleteDoc(presenceRef).catch(console.error);
    };
    window.addEventListener('beforeunload', handleUnload);

    const unsubscribe = onSnapshot(collection(db, 'presence'), (snapshot) => {
      const now = Date.now();
      let activeCount = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.lastActive && now - data.lastActive < 60000) {
          activeCount++;
        } else if (data.lastActive && now - data.lastActive >= 60000) {
          // Cleanup stale sessions
          deleteDoc(docSnap.ref).catch(console.error);
        }
      });
      setCount(Math.max(1, activeCount));
    });

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleUnload);
      unsubscribe();
      deleteDoc(presenceRef).catch(console.error);
    };
  }, []);

  return (
    <div className="hidden sm:flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium border border-green-200 ml-4">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span>{count} {count === 1 ? 'person' : 'people'} viewing</span>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Countries', path: '/countries', icon: Globe },
    { name: 'AI Matcher', path: '/matcher', icon: Sparkles },
    { name: 'Eligibility', path: '/eligibility', icon: CheckCircle2 },
    { name: 'SOP Assistant', path: '/sop-assistant', icon: FileText },
    { name: 'Applications', path: '/applications', icon: Calendar },
    { name: 'Compare', path: '/compare', icon: BarChart3 },
    { name: 'Budget', path: '/budget', icon: Calculator },
    { name: 'Timeline', path: '/timeline', icon: Calendar },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-bottom border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Globe className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                GlobalPath
              </span>
            </Link>
            <LiveUsersCounter />
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-indigo-600 flex items-center space-x-1",
                  location.pathname === link.path ? "text-indigo-600" : "text-zinc-600"
                )}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            ))}
            {user ? (
              <div className="flex items-center space-x-4">
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-sm font-medium text-zinc-600 hover:text-indigo-600 flex items-center space-x-1">
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}
                <div className="h-8 w-px bg-zinc-200" />
                <span className="text-sm font-medium text-zinc-900">{user.name}</span>
                <button onClick={logout} className="p-2 text-zinc-500 hover:text-red-600 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-zinc-600">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-zinc-100 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block text-base font-medium text-zinc-600 hover:text-indigo-600"
                >
                  {link.name}
                </Link>
              ))}
              {!user && (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center bg-indigo-600 text-white px-4 py-2 rounded-lg"
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const LandingPage = () => {
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="grid lg:grid-cols-2 gap-12 items-center py-12">
          <div className="text-center lg:text-left space-y-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900"
            >
              Study Abroad <br />
              <span className="text-indigo-600">Made Super Simple.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-zinc-600 max-w-2xl mx-auto lg:mx-0"
            >
              From eligibility to visa approval, GlobalPath organizes every requirement, cost, and deadline into one structured system.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center lg:items-start gap-4"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full">
                <Link to="/countries" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                  Start Your Journey
                </Link>
                <Link to="/eligibility" className="w-full sm:w-auto px-8 py-4 bg-white text-zinc-900 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all">
                  Check Eligibility
                </Link>
              </div>
              <p className="text-xs text-zinc-400 font-medium tracking-wide uppercase">
                No agents. No hidden fees. Structured clarity.
              </p>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 mt-8">
                <img 
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=600" 
                  alt="Students talking" 
                  className="rounded-2xl shadow-lg object-cover h-48 w-full"
                  referrerPolicy="no-referrer"
                />
                <img 
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600" 
                  alt="Group study" 
                  className="rounded-2xl shadow-lg object-cover h-64 w-full"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-4">
                <img 
                  src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600" 
                  alt="University campus" 
                  className="rounded-2xl shadow-lg object-cover h-64 w-full"
                  referrerPolicy="no-referrer"
                />
                <img 
                  src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=600" 
                  alt="Student smiling" 
                  className="rounded-2xl shadow-lg object-cover h-48 w-full"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Credibility Layer */}
        <div className="py-12 border-y border-zinc-100 bg-zinc-50/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-bold text-zinc-900 text-sm">Official Guidelines</p>
              <p className="text-xs text-zinc-500">Built using embassy data</p>
            </div>
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="font-bold text-zinc-900 text-sm">Updated for 2026</p>
              <p className="text-xs text-zinc-500">Latest intake rules</p>
            </div>
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <p className="font-bold text-zinc-900 text-sm">India-Focused</p>
              <p className="text-xs text-zinc-500">Documentation clarity</p>
            </div>
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
                <CheckCircle2 className="w-6 h-6 text-violet-600" />
              </div>
              <p className="font-bold text-zinc-900 text-sm">Structured Compliance</p>
              <p className="text-xs text-zinc-500">Country-specific logic</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 py-20">
          {[
            { title: 'Clear Guides', desc: 'We explain every requirement like a friend would. No confusing legal words.', icon: Globe },
            { title: 'Smart Checklists', desc: 'Track your progress and download a simple PDF to keep yourself organized.', icon: CheckCircle2 },
            { title: 'Budget Helper', desc: 'See exactly how much money you need in both INR and local currency.', icon: Calculator },
          ].map((f, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="p-8 bg-white border border-zinc-100 rounded-3xl shadow-sm"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                <f.icon className="text-indigo-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">{f.title}</h3>
              <p className="text-zinc-600">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* How It Works Section */}
        <div className="py-20 border-t border-zinc-100">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900">How GlobalPath Works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative max-w-5xl mx-auto">
            {/* Steps */}
            {[
              { num: 1, title: 'Check Your Eligibility', desc: 'Enter your academics and get instant fit scores for universities' },
              { num: 2, title: 'Build Your University List', desc: 'Compare programs, costs, and deadlines in one place' },
              { num: 3, title: 'Generate Your SOP', desc: 'AI writes a personalized Statement of Purpose in minutes' }
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-[#5B50E8] text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold text-zinc-900">{step.title}</h3>
                <p className="text-zinc-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="py-20 border-t border-zinc-100">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900">Students Who Used GlobalPath</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "GlobalPath saved me weeks of research. The SOP generator alone is worth it.",
                initials: "PS",
                name: "Priya S.",
                program: "MS CS at University of Toronto"
              },
              {
                quote: "Finally a tool that explains visa requirements without confusing legal language. Highly recommend.",
                initials: "AM",
                name: "Arjun M.",
                program: "MS Data Science at TU Munich"
              },
              {
                quote: "The budget calculator showed me exact costs in INR. No surprises.",
                initials: "SR",
                name: "Sneha R.",
                program: "MS Finance at NUS Singapore"
              }
            ].map((t, i) => (
              <div key={i} className="p-8 bg-[#F7F7FF] rounded-3xl shadow-sm border border-indigo-50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-[#5B50E8] text-white rounded-full flex items-center justify-center font-bold">
                      {t.initials}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">{t.name}</h4>
                      <p className="text-xs text-zinc-500">{t.program}</p>
                    </div>
                  </div>
                  <p className="text-zinc-700 italic">"{t.quote}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="w-full bg-[#5B50E8] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <p className="text-4xl md:text-5xl font-bold mb-2">500+</p>
              <p className="font-medium text-indigo-100">Students Helped</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold mb-2">50+</p>
              <p className="font-medium text-indigo-100">Universities Listed</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold mb-2">10+</p>
              <p className="font-medium text-indigo-100">Countries Covered</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* FAQ Section */}
        <div className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900">Frequently Asked Questions</h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: "Is GlobalPath free to use?",
                a: "Yes, GlobalPath is completely free during beta. No hidden fees, no agent commissions."
              },
              {
                q: "How is this different from going to an agent?",
                a: "Agents charge ₹50,000–₹2,00,000 and often push universities that pay them commission. GlobalPath gives you unbiased, structured guidance for free."
              },
              {
                q: "Is my data safe?",
                a: "Yes. We use Firebase with industry-standard encryption. We never sell your data."
              },
              {
                q: "Do I need to create an account?",
                a: "You can explore countries and eligibility without signing up. An account is needed to save your application tracker and generated SOPs."
              }
            ].map((faq, i) => (
              <details key={i} className="border border-zinc-200 rounded-2xl overflow-hidden bg-white group">
                <summary className="w-full px-6 py-4 text-left font-bold text-zinc-900 flex justify-between items-center hover:bg-zinc-50 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="text-[#5B50E8] text-xl leading-none group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <div className="px-6 pb-4 text-zinc-600">
                  <p>{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="w-full bg-[#F0EFFE] py-24">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-8">
          <h2 className="text-4xl font-bold text-zinc-900">Ready to Plan Your Future Abroad?</h2>
          <p className="text-xl text-zinc-600">Join hundreds of Indian students planning smarter with GlobalPath.</p>
          <div>
            <Link to="/countries" className="inline-block px-8 py-4 bg-[#5B50E8] text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              Start Free — No Account Needed
            </Link>
            <p className="mt-4 text-sm text-zinc-500">No credit card. No agent. Just clarity.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const EligibilityChecker = () => {
  const [scores, setScores] = useState({
    percentage: 0,
    backlogs: 0,
    ielts: 0,
    experience: 0,
    internships: 0,
    budget: 0
  });
  const [results, setResults] = useState<string[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    fetchCountries().then(setCountries);
  }, []);

  const checkEligibility = () => {
    const res: string[] = [];
    
    // Germany Rules
    if (scores.percentage >= 75 && scores.backlogs === 0 && scores.ielts >= 6.5) {
      res.push("✅ Your profile is strong for public German universities (Tuition Free!).");
    } else if (scores.backlogs > 5) {
      res.push("🔴 High Risk for Germany: Public universities rarely accept more than 5 backlogs.");
    } else if (scores.percentage >= 65 && scores.ielts >= 6.0) {
      res.push("✅ Germany Private Universities are a strong option for your profile.");
    }

    // Canada Rules
    if (scores.ielts >= 6.0) {
      res.push("✅ Canada SDS Category: You meet the IELTS requirement for fast-track visa.");
    } else if (scores.ielts > 0) {
      res.push("⚠️ Canada Non-SDS: Your IELTS is below 6.0. Visa risk is higher; consider retaking.");
    }

    // USA Rules
    if (scores.percentage >= 60 && scores.budget >= 25000) {
      res.push("✅ USA: Your profile and budget fit well. Focus on GRE for top-tier schools.");
    } else if (scores.budget < 15000 && scores.budget > 0) {
      res.push("⚠️ USA Budget Alert: $15k is very low for USA. Consider Germany or scholarships.");
    }

    // Australia Rules
    if (scores.percentage >= 65 && scores.ielts >= 6.5) {
      res.push("✅ Australia: You meet the requirements for most Group of Eight (Go8) universities.");
    }

    // Internship & Experience Rules
    if (scores.experience >= 2) {
      res.push("🌟 Bonus: Your 2+ years of work experience significantly strengthens applications for MBA and specialized Masters.");
    } else if (scores.internships >= 2) {
      res.push("🌟 Bonus: Having 2+ internships shows practical exposure, which is highly valued by German and US universities.");
    }

    if (res.length === 0) {
      res.push("ℹ️ Please enter more details to get a personalized recommendation.");
    }

    setResults(res);
  };

  return (
    <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-zinc-900 mb-4">Profile Strength Analyzer</h2>
        <p className="text-zinc-600">Enter your profile details to see which countries fit you best.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Undergrad Percentage (%) / GPA</label>
            <input 
              type="number" 
              value={scores.percentage} 
              onChange={(e) => setScores({...scores, percentage: Number(e.target.value)})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. 75"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Number of Backlogs</label>
            <input 
              type="number" 
              value={scores.backlogs} 
              onChange={(e) => setScores({...scores, backlogs: Number(e.target.value)})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">IELTS / PTE Score</label>
            <input 
              type="number" 
              step="0.5"
              value={scores.ielts} 
              onChange={(e) => setScores({...scores, ielts: Number(e.target.value)})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. 6.5"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Work Experience (Years)</label>
            <input 
              type="number" 
              value={scores.experience} 
              onChange={(e) => setScores({...scores, experience: Number(e.target.value)})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Number of Internships</label>
            <input 
              type="number" 
              value={scores.internships} 
              onChange={(e) => setScores({...scores, internships: Number(e.target.value)})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Total Budget (in USD)</label>
            <input 
              type="number" 
              value={scores.budget} 
              onChange={(e) => setScores({...scores, budget: Number(e.target.value)})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. 25000"
            />
          </div>
          <button 
            onClick={checkEligibility}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Analyze My Profile
          </button>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-zinc-900">Your Recommendations</h3>
          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((res, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900 font-medium"
                >
                  {res}
                </motion.div>
              ))}
              <div className="p-6 bg-zinc-900 text-white rounded-3xl mt-8">
                <p className="text-sm font-bold uppercase text-zinc-400 mb-2">Agent-Free Mode</p>
                <p className="text-lg leading-relaxed">
                  "This guide is designed to help you apply directly. You don't need an agent if you follow these steps carefully."
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 border-2 border-dashed border-zinc-200 rounded-3xl text-center text-zinc-400">
              Enter your details to see recommendations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ApplicationTracker = () => {
  const { progress, updateProgress, user } = useAuth();
  const [newApp, setNewApp] = useState({ university: '', course: '', deadline: '', status: 'Draft' as any });
  const [isAdding, setIsAdding] = useState(false);

  if (!user) return <div className="pt-32 text-center">Please sign in to track your applications.</div>;

  const applications = progress.applications || [];

  const addApplication = () => {
    const app = { ...newApp, id: Math.random().toString(36).substr(2, 9) };
    updateProgress({ applications: [...applications, app] });
    setNewApp({ university: '', course: '', deadline: '', status: 'Draft' });
    setIsAdding(false);
  };

  const deleteApplication = (id: string) => {
    updateProgress({ applications: applications.filter(a => a.id !== id) });
  };

  const updateStatus = (id: string, status: any) => {
    updateProgress({
      applications: applications.map(a => a.id === id ? { ...a, status } : a)
    });
  };

  return (
    <div className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">University Applications</h2>
          <p className="text-zinc-500">Track your progress for each university you're applying to.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add University</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {applications.map((app) => (
          <div key={app.id} className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-900">{app.university}</h3>
                <p className="text-sm text-zinc-500">{app.course}</p>
              </div>
              <button onClick={() => deleteApplication(app.id)} className="text-zinc-400 hover:text-red-600">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Deadline</span>
                <span className="font-bold text-zinc-900">{new Date(app.deadline).toLocaleDateString()}</span>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">Status</label>
                <select 
                  value={app.status} 
                  onChange={(e) => updateStatus(app.id, e.target.value)}
                  className="w-full p-2 rounded-lg border border-zinc-100 bg-zinc-50 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Applied">Applied</option>
                  <option value="Documents Pending">Documents Pending</option>
                  <option value="Offer Received">Offer Received</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Visa Stage">Visa Stage</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        {applications.length === 0 && !isAdding && (
          <div className="col-span-full p-12 border-2 border-dashed border-zinc-200 rounded-3xl text-center text-zinc-400">
            No applications added yet. Click "Add University" to start tracking.
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-zinc-900 mb-6">Add New Application</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">University Name</label>
                  <input 
                    type="text" 
                    value={newApp.university} 
                    onChange={(e) => setNewApp({...newApp, university: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Technical University of Munich"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Course Name</label>
                  <input 
                    type="text" 
                    value={newApp.course} 
                    onChange={(e) => setNewApp({...newApp, course: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. M.Sc. Data Science"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Deadline</label>
                  <input 
                    type="date" 
                    value={newApp.deadline} 
                    onChange={(e) => setNewApp({...newApp, deadline: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-3 border border-zinc-200 rounded-xl font-bold hover:bg-zinc-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addApplication}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CountryList = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCountries()
      .then(data => {
        setCountries(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="pt-32 text-center">Loading countries...</div>;

  return (
    <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-zinc-900 mb-8">Explore Destinations</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {countries.map((country) => (
          <Link 
            key={country.id} 
            to={`/countries/${country.name.toLowerCase().replace(/\s+/g, '-')}`}
            className="group relative overflow-hidden rounded-3xl bg-white border border-zinc-200 p-6 hover:shadow-xl transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-zinc-900">{country.name}</h3>
              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-600 transition-colors">
                <ChevronRight className="w-5 h-5 text-indigo-600 group-hover:text-white" />
              </div>
            </div>
            <div className="space-y-2 text-sm text-zinc-600">
              <p><strong>Exams:</strong> {country.exams.map(e => e.name).join(', ')}</p>
              <p><strong>Work Rights:</strong> {country.work_rights}</p>
              <p><strong>PR Chance:</strong> {country.comparison_data.prChance}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const CountryDetail = () => {
  const { countryName: slug } = useParams();
  const [country, setCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(true);
  const { progress, updateProgress, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const getVisaRisk = () => {
    if (!country) return { level: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    const diff = country.comparison_data.visaDifficulty;
    if (diff === 'Competitive') return { level: 'High Risk', color: 'text-red-600', bg: 'bg-red-50' };
    if (diff === 'Moderate') return { level: 'Medium Risk', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { level: 'Low Risk', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  };

  const visaRisk = getVisaRisk();

  useEffect(() => {
    setLoading(true);
    fetchCountries()
      .then(data => {
        const found = data.find((c: Country) => 
          c.name.toLowerCase().replace(/\s+/g, '-') === slug?.toLowerCase() ||
          c.name.toLowerCase() === slug?.toLowerCase()?.replace(/-/g, ' ')
        );
        setCountry(found);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="pt-32 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-500 font-medium">Fetching country details...</p>
    </div>
  );

  if (!country) return (
    <div className="pt-32 text-center space-y-4">
      <h2 className="text-2xl font-bold text-zinc-900">Country not found.</h2>
      <p className="text-zinc-500">We couldn't find the details for "{slug}".</p>
      <Link to="/countries" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">
        Back to Destinations
      </Link>
    </div>
  );

  const completedDocs = progress.checklist[country.name] || [];
  const toggleDoc = (doc: string) => {
    const newDocs = completedDocs.includes(doc) 
      ? completedDocs.filter(d => d !== doc)
      : [...completedDocs, doc];
    updateProgress({
      checklist: { ...progress.checklist, [country.name]: newDocs }
    });
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(`${country.name} Study Abroad Roadmap`, 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Student: ${user?.name || 'Guest'}`, 20, 30);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 38);
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text('Document Checklist', 20, 50);

    const tableData = country.documents.map(d => [
      d.category || 'Other',
      d.name,
      d.what || 'N/A',
      d.mandatory || 'Mandatory',
      d.time || d.processing_time || 'N/A',
      d.cost || 'N/A',
      completedDocs.includes(d.name) ? '✓ COMPLETED' : '☐ PENDING'
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Category', 'Document', 'What is it?', 'Type', 'Time', 'Cost', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 25 }, 1: { fontStyle: 'bold' } }
    });

    doc.save(`${country.name}_GlobalPath_Checklist.pdf`);
  };

  return (
    <div className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-zinc-900">{country.name}</h1>
            <div className="px-3 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">
              Agent-Free Mode
            </div>
          </div>
          <p className="text-zinc-600">Complete roadmap for international students</p>
        </div>
        <button 
          onClick={downloadPDF}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all"
        >
          <Download className="w-5 h-5" />
          <span>Download Checklist</span>
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="md:col-span-1 space-y-2">
          {['Overview', 'Checklist', 'Visa Process', 'Financials', 'Timeline', 'Scholarships', 'Visa Prep', 'Post-Arrival'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.toLowerCase() 
                  ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                  : "text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-zinc-900 mb-6">General Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl">
                    <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Required Exams</p>
                    <p className="text-zinc-900 font-medium">{country.exams.map(e => e.name).join(', ')}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl">
                    <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Work Rights</p>
                    <p className="text-zinc-900 font-medium">{country.work_rights}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl">
                    <p className="text-xs text-zinc-500 uppercase font-bold mb-1">PR Possibility</p>
                    <p className="text-zinc-900 font-medium">{country.pr_possibility}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl">
                    <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Visa Time</p>
                    <p className="text-zinc-900 font-medium">{country.comparison_data.visaTime}</p>
                  </div>
                  <div className={cn("p-4 rounded-2xl flex flex-col justify-center", visaRisk.bg)}>
                    <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Visa Risk</p>
                    <p className={cn("font-bold", visaRisk.color)}>{visaRisk.level}</p>
                  </div>
                </div>
              </section>

              {country.part_time_info && (
                <section>
                  <h2 className="text-2xl font-bold text-zinc-900 mb-6">Part-Time Work & Income</h2>
                  <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl">
                    <div className="grid sm:grid-cols-2 gap-8">
                      <div>
                        <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Allowed Hours</p>
                        <p className="text-xl font-bold text-indigo-900">{country.part_time_info.hours_per_week}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Average Wage</p>
                        <p className="text-xl font-bold text-indigo-900">{country.part_time_info.avg_wage}/hour</p>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-indigo-100">
                      <p className="text-sm text-indigo-700 leading-relaxed">
                        <strong>Note:</strong> {country.part_time_info.notes}
                      </p>
                      <p className="text-xs text-indigo-500 mt-4 italic">
                        “Part-time job helps with daily expenses but cannot fully replace financial proof for visa.”
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-2xl font-bold text-zinc-900 mb-6">Required Exams (Explained)</h2>
                <div className="space-y-4">
                  {country.exams.map((exam, i) => (
                    <div key={i} className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50">
                      <h3 className="text-lg font-bold text-indigo-600 mb-3">{exam.name}</h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <p><span className="font-bold text-zinc-700">What is it:</span> {exam.what}</p>
                        <p><span className="font-bold text-zinc-700">Why needed:</span> {exam.why}</p>
                        <p><span className="font-bold text-zinc-700">Where to write:</span> {exam.where_get}</p>
                        <p><span className="font-bold text-zinc-700">Where to submit:</span> {exam.where_submit}</p>
                        {exam.cost && <p><span className="font-bold text-zinc-700">Cost:</span> {exam.cost}</p>}
                        {exam.validity && <p><span className="font-bold text-zinc-700">Validity:</span> {exam.validity}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-zinc-900 mb-6">Average Living Cost</h2>
                <p className="text-zinc-600 mb-6 italic">“This is the average money you will spend to live comfortably as a student.”</p>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Accommodation</span>
                      <span className="font-bold text-zinc-900">{country.living_costs.accommodation} Local</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Food</span>
                      <span className="font-bold text-zinc-900">{country.living_costs.food} Local</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Transport</span>
                      <span className="font-bold text-zinc-900">{country.living_costs.transport} Local</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Health Insurance</span>
                      <span className="font-bold text-zinc-900">{country.living_costs.insurance} Local</span>
                    </div>
                  </div>
                  <div className="bg-indigo-50 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
                    <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Monthly Estimate</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {(country.living_costs.accommodation + country.living_costs.food + country.living_costs.transport + country.living_costs.insurance + country.living_costs.misc)} Local
                    </p>
                    <div className="mt-4 pt-4 border-t border-indigo-100 w-full">
                      <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Yearly Estimate</p>
                      <p className="text-xl font-bold text-indigo-600">
                        {(country.living_costs.accommodation + country.living_costs.food + country.living_costs.transport + country.living_costs.insurance + country.living_costs.misc) * 12} Local
                      </p>
                    </div>
                  </div>
                </div>

                {country.city_costs && country.city_costs.length > 0 && (
                  <div className="mt-12">
                    <h3 className="text-xl font-bold text-zinc-900 mb-6">City-Level Breakdown</h3>
                    <div className="grid sm:grid-cols-3 gap-4">
                      {country.city_costs.map((city, i) => (
                        <div key={i} className="p-6 border border-zinc-100 rounded-3xl bg-white shadow-sm">
                          <h4 className="font-bold text-zinc-900 mb-4">{city.name}</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Rent (Center)</span>
                              <span className="font-medium">Local {city.rent_center}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Rent (Outside)</span>
                              <span className="font-medium">Local {city.rent_outside}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Transport Pass</span>
                              <span className="font-medium">Local {city.transport}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Avg. Meal</span>
                              <span className="font-medium">Local {city.meals}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-zinc-900">Document Checklist</h2>
                <span className="text-sm font-bold text-indigo-600">
                  {Math.round((completedDocs.length / country.documents.length) * 100)}% Complete
                </span>
              </div>
              
              {(Object.entries(
                country.documents.reduce((acc, doc) => {
                  const cat = doc.category || 'Other';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(doc);
                  return acc;
                }, {} as Record<string, RequirementDetail[]>)
              ) as [string, RequirementDetail[]][]).map(([category, docs]) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-zinc-200"></span>
                    {category}
                  </h3>
                  <div className="space-y-4">
                    {docs.map((doc) => (
                      <div 
                        key={doc.name}
                        className={cn(
                          "p-6 rounded-2xl border transition-all",
                          completedDocs.includes(doc.name) 
                            ? "bg-indigo-50 border-indigo-200" 
                            : "bg-white border-zinc-200"
                        )}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-bold text-zinc-900">{doc.name}</h4>
                          <button
                            onClick={() => toggleDoc(doc.name)}
                            className={cn(
                              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                              completedDocs.includes(doc.name)
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "border-zinc-200 text-transparent"
                            )}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-zinc-600">
                          <p><span className="font-bold text-zinc-700">What is it:</span> {doc.what}</p>
                          <p><span className="font-bold text-zinc-700">Why needed:</span> {doc.why}</p>
                          {doc.who_issues && <p><span className="font-bold text-zinc-700">Who issues it:</span> {doc.who_issues}</p>}
                          <p><span className="font-bold text-zinc-700">Where to get:</span> {doc.where_get}</p>
                          <p><span className="font-bold text-zinc-700">Where to submit:</span> {doc.where_submit}</p>
                          {doc.cost && <p><span className="font-bold text-zinc-700">Cost:</span> {doc.cost}</p>}
                          {(doc.time || doc.processing_time) && <p><span className="font-bold text-zinc-700">Processing Time:</span> {doc.time || doc.processing_time}</p>}
                          {doc.mandatory && <p><span className="font-bold text-zinc-700">Status:</span> {doc.mandatory}</p>}
                        </div>
                        {doc.mistakes && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                            <p className="text-xs text-red-800 font-bold mb-1 uppercase flex items-center gap-1">
                              <X className="w-3 h-3" />
                              Common Mistakes
                            </p>
                            <p className="text-sm text-red-700">{doc.mistakes}</p>
                          </div>
                        )}
                        {doc.category === 'Financial Documents' && completedDocs.includes(doc.name) && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <p className="text-xs text-amber-800 font-bold mb-1 uppercase flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Smart Risk Alert
                            </p>
                            <p className="text-sm text-amber-700">
                              Ensure the balance is at least 10% more than the requirement to account for exchange rate changes.
                            </p>
                          </div>
                        )}
                        {doc.validity && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                            <p className="text-xs text-blue-800 font-bold mb-1 uppercase flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Validity Warning
                            </p>
                            <p className="text-sm text-blue-700">
                              This document is valid for <strong>{doc.validity}</strong>. Check the expiry before your visa appointment.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'visa process' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-zinc-900">Visa Steps</h2>
              <div className="space-y-4">
                {country.visa_steps.map((step, i) => (
                  <div key={i} className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                      {i + 1}
                    </div>
                    <div className="pt-1">
                      <p className="text-zinc-900 font-medium">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-zinc-900">Financial Proof Explanation</h2>
              <p className="text-zinc-600 italic">“This is the amount you must show in your bank account to prove you can afford your studies.”</p>
              
              <div className="grid gap-6">
                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase mb-2">Minimum Bank Balance Required</h3>
                  <p className="text-indigo-900 font-bold text-xl">{country.financial_requirement}</p>
                  <p className="text-sm text-indigo-600 mt-2 italic">Usually covers 1st year tuition + living expenses.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase mb-3">Acceptable Documents</h3>
                    <ul className="space-y-2 text-sm text-zinc-600 list-disc pl-4">
                      <li>Savings Bank Balance</li>
                      <li>Fixed Deposits (FDs)</li>
                      <li>Education Loan Sanction Letter</li>
                      <li>Provident Fund (GPF/EPF)</li>
                      <li>Blocked Account (Germany only)</li>
                    </ul>
                  </div>
                  <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase mb-3">Who can Sponsor?</h3>
                    <ul className="space-y-2 text-sm text-zinc-600 list-disc pl-4">
                      <li>Self (The Student)</li>
                      <li>Parents (Father/Mother)</li>
                      <li>Blood Relatives (Grandparents/Siblings)</li>
                      <li>Third-party sponsors (with Affidavit)</li>
                    </ul>
                  </div>
                </div>

                <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase mb-3">Important Rules</h3>
                  <ul className="space-y-2 text-sm text-zinc-600 list-disc pl-4">
                    <li><strong>Fund Maintenance:</strong> Funds should typically be 1-6 months old depending on the country.</li>
                    <li><strong>Liquidity:</strong> Money must be in a liquid state (easily withdrawable).</li>
                    <li><strong>Affidavit:</strong> If someone else is paying, they must sign an 'Affidavit of Support'.</li>
                    <li><strong>ITR:</strong> Sponsors must show last 3 years of Income Tax Returns.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-4">
                <Link to="/budget" className="inline-flex items-center space-x-2 text-indigo-600 font-bold hover:underline">
                  <span>Open Detailed Budget Calculator</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-zinc-900">Application Timeline</h2>
              <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                {country.timeline.map((item, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm" />
                    <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                      <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Month {item.month}</p>
                      <p className="text-zinc-900 font-bold mb-2">{item.step}</p>
                      <p className="text-sm text-zinc-600 leading-relaxed">{item.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'scholarships' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-zinc-900">Scholarships & Funding</h2>
              <div className="grid gap-6">
                {country.scholarships?.map((s, i) => (
                  <div key={i} className="p-6 bg-white border border-zinc-200 rounded-3xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-indigo-600">{s.name}</h3>
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full">{s.amount}</span>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-600"><span className="font-bold text-zinc-900">Eligibility:</span> {s.eligibility}</p>
                      <p className="text-sm text-zinc-600"><span className="font-bold text-zinc-900">Deadline:</span> {s.deadline}</p>
                      <a 
                        href={s.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-indigo-600 text-sm font-bold hover:underline"
                      >
                        <span>Official Website</span>
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
                {(!country.scholarships || country.scholarships.length === 0) && (
                  <div className="p-12 border-2 border-dashed border-zinc-200 rounded-3xl text-center text-zinc-400">
                    No scholarship data available for this country yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'visa prep' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-zinc-900">Visa Interview Preparation</h2>
              <div className="space-y-6">
                {country.visa_prep?.map((tip, i) => (
                  <div key={i} className="space-y-4">
                    <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                      <p className="text-sm font-bold text-zinc-400 uppercase mb-2">Question {i + 1}</p>
                      <p className="text-lg font-bold text-zinc-900 mb-4">{tip.question}</p>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                          <p className="text-xs font-bold text-emerald-600 uppercase mb-1">What to say</p>
                          <p className="text-sm text-emerald-800">{tip.answer}</p>
                        </div>
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                          <p className="text-xs font-bold text-red-600 uppercase mb-1">What NOT to say</p>
                          <p className="text-sm text-red-800">{tip.dont_say}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-8 bg-indigo-600 text-white rounded-3xl">
                  <h4 className="text-lg font-bold mb-4">Pro Interview Tips</h4>
                  <ul className="space-y-3 text-sm text-indigo-100 list-disc pl-4">
                    <li>Maintain eye contact and a confident posture.</li>
                    <li>Be honest and consistent with your application documents.</li>
                    <li>Clearly demonstrate your intent to return to your home country.</li>
                    <li>Know your course curriculum and university details thoroughly.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'post-arrival' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-zinc-900">Post-Arrival Survival Guide</h2>
              <div className="space-y-4">
                {country.post_arrival_guide?.map((step, i) => (
                  <div key={i} className="p-6 bg-white border border-zinc-200 rounded-3xl shadow-sm flex gap-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 font-bold">{i + 1}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-zinc-900">{step.title}</h3>
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase",
                          step.priority === 'High' ? "bg-red-100 text-red-600" : "bg-zinc-100 text-zinc-600"
                        )}>
                          {step.priority} Priority
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BudgetCalculator = () => {
  const [tuition, setTuition] = useState(0);
  const [living, setLiving] = useState(0);
  const [duration, setDuration] = useState(1);
  const [country, setCountry] = useState('United States');
  const [countries, setCountries] = useState<Country[]>([]);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchCountries().then(setCountries);
    
    // Fetch live exchange rates (base USD)
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          setLiveRates(data.rates);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const selectedCountry = countries.find(c => c.name === country);
    if (selectedCountry) {
      const costs = selectedCountry.living_costs;
      const annualLiving = (costs.accommodation + costs.food + costs.transport + costs.insurance + costs.misc) * 12;
      setLiving(annualLiving);
      // Set a default tuition based on comparison data if available
      setTuition(selectedCountry.comparison_data.tuition);
    }
  }, [country, countries]);

  // Calculate INR rate based on live rates if available, otherwise fallback to hardcoded
  const getRate = (code: string, fallback: number) => {
    if (liveRates['INR'] && liveRates[code]) {
      // Convert 1 unit of target currency to INR
      return liveRates['INR'] / liveRates[code];
    }
    return fallback;
  };

  const exchangeRates: Record<string, { rate: number, symbol: string, code: string }> = {
    'United States': { rate: getRate('USD', 94.76), symbol: '$', code: 'USD' },
    'Germany': { rate: getRate('EUR', 109.20), symbol: '€', code: 'EUR' },
    'Canada': { rate: getRate('CAD', 68.36), symbol: 'C$', code: 'CAD' },
    'Australia': { rate: getRate('AUD', 64.90), symbol: 'A$', code: 'AUD' },
    'United Kingdom': { rate: getRate('GBP', 125.87), symbol: '£', code: 'GBP' },
    'New Zealand': { rate: getRate('NZD', 54.54), symbol: 'NZ$', code: 'NZD' },
    'Other': { rate: getRate('USD', 94.76), symbol: '$', code: 'USD' }
  };

  const currentRate = exchangeRates[country] || exchangeRates['Other'];
  
  const totalLocal = (tuition + living) * duration;
  const bufferLocal = totalLocal * 0.1;
  const totalWithBufferLocal = totalLocal + bufferLocal;
  
  const totalINR = totalWithBufferLocal * currentRate.rate;
  
  const minProofLocal = tuition + living;
  const minProofINR = minProofLocal * currentRate.rate;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatLocal = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currentRate.code,
      maximumFractionDigits: 0
    }).format(val);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('GlobalPath - Budget Estimate', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Target Country: ${country}`, 14, 32);
    doc.text(`Duration: ${duration} Year(s)`, 14, 40);
    doc.text(`Exchange Rate Used: 1 ${currentRate.code} = ${formatINR(currentRate.rate)}`, 14, 48);

    autoTable(doc, {
      startY: 55,
      head: [['Expense Category', `Amount (${currentRate.code})`, 'Amount (INR)']],
      body: [
        ['Tuition Fee (Total)', formatLocal(tuition * duration), formatINR(tuition * duration * currentRate.rate)],
        ['Living Cost (Total)', formatLocal(living * duration), formatINR(living * duration * currentRate.rate)],
        ['Emergency Buffer (10%)', formatLocal(bufferLocal), formatINR(bufferLocal * currentRate.rate)],
        ['Total Estimated Budget', formatLocal(totalWithBufferLocal), formatINR(totalINR)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(14);
    doc.text('Visa Requirements', 14, finalY + 15);
    doc.setFontSize(10);
    doc.text(`Minimum Proof of Funds Required: ${formatLocal(minProofLocal)} (≈ ${formatINR(minProofINR)})`, 14, finalY + 25);
    
    doc.save(`Budget_Estimate_${country.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">Budget Calculator</h2>
          <p className="text-zinc-500">Calculate your expenses in both Indian Rupees (₹) and local currency.</p>
          {Object.keys(liveRates).length > 0 && (
            <span className="inline-flex items-center mt-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
              Using Live Exchange Rates
            </span>
          )}
        </div>
        <button 
          onClick={downloadPDF}
          className="flex items-center space-x-2 bg-zinc-900 text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span className="font-medium text-sm">Export PDF</span>
        </button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Target Country</label>
            <select 
              value={country} 
              onChange={(e) => setCountry(e.target.value)}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {Object.keys(exchangeRates).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Tuition Fee (per year in {currentRate.code})</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">{currentRate.symbol}</span>
              <input 
                type="number" 
                value={tuition} 
                onChange={(e) => setTuition(Number(e.target.value))}
                className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="0"
              />
            </div>
            <p className="text-xs text-zinc-400">≈ {formatINR(tuition * currentRate.rate)}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Living Cost (per year in {currentRate.code})</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">{currentRate.symbol}</span>
              <input 
                type="number" 
                value={living} 
                onChange={(e) => setLiving(Number(e.target.value))}
                className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="0"
              />
            </div>
            <p className="text-xs text-zinc-400">≈ {formatINR(living * currentRate.rate)}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Course Duration (Years)</label>
            <input 
              type="number" 
              value={duration} 
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="pt-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
            <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Current Exchange Rate</p>
            <p className="text-sm font-medium text-zinc-600">1 {currentRate.code} = ₹{currentRate.rate}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-600 text-white rounded-3xl p-8 shadow-xl shadow-indigo-100">
            <p className="text-indigo-100 text-xs font-bold uppercase mb-2 tracking-wider">Total Estimated Cost (With 10% Buffer)</p>
            <div className="mb-6">
              <p className="text-4xl font-bold">{formatINR(totalINR)}</p>
              <p className="text-indigo-200 text-lg font-medium">({formatLocal(totalWithBufferLocal)})</p>
              <p className="text-indigo-300 text-xs mt-2 italic">“This is the total estimated money you will need for your entire course, including a 10% safety buffer.”</p>
            </div>
            
            <div className="h-px bg-indigo-500/50 mb-6" />
            
            <p className="text-indigo-100 text-xs font-bold uppercase mb-2 tracking-wider">Min. Financial Proof (1 Year)</p>
            <div>
              <p className="text-2xl font-bold">{formatINR(minProofINR)}</p>
              <p className="text-indigo-200 font-medium">({formatLocal(minProofLocal)})</p>
              <p className="text-indigo-300 text-xs mt-2 italic">“This is the amount you must show in your bank account to prove you can afford your studies.”</p>
            </div>
          </div>

          {country === 'Germany' && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="text-amber-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-amber-800 font-bold mb-1">Germany Blocked Account</p>
                <p className="text-amber-700 text-sm leading-relaxed">
                  You must deposit <strong>€11,208</strong> (≈ {formatINR(11208 * exchangeRates['Germany'].rate)}) into a blocked account before your visa interview.
                </p>
              </div>
            </div>
          )}
          
          <div className="bg-white border border-zinc-200 rounded-3xl p-6">
            <h4 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              Pro Tip
            </h4>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Financial proof requirements vary by country. Most universities require you to show funds for at least the first year of tuition and living expenses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ComparisonTool = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetchCountries().then(setCountries);
  }, []);

  const toggleCountry = (name: string) => {
    if (selected.includes(name)) {
      setSelected(selected.filter(n => n !== name));
    } else if (selected.length < 3) {
      setSelected([...selected, name]);
    }
  };

  const selectedData = countries.filter(c => selected.includes(c.name));

  return (
    <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-zinc-900 mb-8">Compare Countries</h2>
      
      <div className="flex flex-wrap gap-3 mb-12">
        {countries.map(c => (
          <button
            key={c.id}
            onClick={() => toggleCountry(c.name)}
            className={cn(
              "px-6 py-3 rounded-xl text-sm font-bold transition-all border",
              selected.includes(c.name)
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-indigo-600"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {selected.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-3xl overflow-hidden shadow-sm border border-zinc-200">
            <thead>
              <tr className="bg-zinc-50">
                <th className="p-6 text-left text-sm font-bold text-zinc-500 uppercase">Metric</th>
                {selectedData.map(c => (
                  <th key={c.id} className="p-6 text-left text-xl font-bold text-zinc-900">{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {[
                { label: 'Avg Tuition', key: 'tuition', prefix: '$' },
                { label: 'Living Cost', key: 'livingCost', prefix: '$' },
                { label: 'Visa Difficulty', key: 'visaDifficulty' },
                { label: 'Visa Time', key: 'visaTime' },
                { label: 'Work Hours', key: 'workHours' },
                { label: 'PR Chance', key: 'prChance' },
              ].map((metric) => (
                <tr key={metric.label}>
                  <td className="p-6 text-sm font-bold text-zinc-500">{metric.label}</td>
                  {selectedData.map(c => (
                    <td key={c.id} className="p-6 text-zinc-900 font-medium">
                      {(metric as any).prefix || ''} {(c.comparison_data as any)[metric.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
          <p className="text-zinc-500 font-medium">Select up to 3 countries to start comparing.</p>
        </div>
      )}
    </div>
  );
};

const Assistant = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    fetchCountries().then(setCountries);
  }, []);

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const context = JSON.stringify(countries.map(c => ({
      name: c.name,
      exams: c.exams,
      finance: c.financial_requirement,
      visa: c.visa_steps
    })));

    const aiResponse = await askAssistant(userMsg, context);
    setMessages(prev => [...prev, { role: 'ai', text: aiResponse || "Sorry, I couldn't process that." }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <div className="relative">
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute bottom-20 right-0 w-80 md:w-96 bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[500px]"
            >
              <div className="p-4 bg-indigo-600 text-white font-bold flex justify-between items-center">
                <span>GlobalPath AI</span>
                <button onClick={() => setMessages([])}><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
                {messages.map((m, i) => (
                  <div key={i} className={cn(
                    "p-3 rounded-2xl text-sm max-w-[85%]",
                    m.role === 'user' ? "bg-indigo-600 text-white ml-auto" : "bg-white text-zinc-900 shadow-sm"
                  )}>
                    {m.text}
                  </div>
                ))}
                {loading && <div className="text-zinc-400 text-xs animate-pulse">Assistant is thinking...</div>}
              </div>
              <div className="p-4 bg-white border-t border-zinc-100 flex gap-2">
                <input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about visas, docs..."
                  className="flex-1 text-sm outline-none"
                />
                <button onClick={handleSend} className="p-2 bg-indigo-600 text-white rounded-lg">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={() => messages.length === 0 && setMessages([{ role: 'ai', text: 'Hi! I can help you with country requirements and visa steps. What would you like to know?' }])}
          className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

const AuthPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleGoogleSignIn = async () => {
    await login();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Info/Background */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-indigo-950">
          <img 
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=2000" 
            alt="University Campus" 
            className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/40 blur-[120px]"></div>
          <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-fuchsia-500/30 blur-[120px]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/90 via-transparent to-transparent"></div>
        </div>
        
        <div className="relative z-10 p-12 text-white max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          >
            <Globe className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl font-bold mb-6 leading-tight"
          >
            Your journey to a global education starts here.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-indigo-100 mb-12 leading-relaxed"
          >
            Join thousands of students who have successfully navigated their study abroad journey without paying hefty agent fees.
          </motion.p>
          
          <div className="space-y-6">
            {[
              { icon: CheckCircle2, color: "text-emerald-400", title: "Agent-Free Process", desc: "Transparent, step-by-step guidance." },
              { icon: Sparkles, color: "text-amber-400", title: "AI SOP Assistant", desc: "Draft winning statements in seconds." },
              { icon: Calculator, color: "text-blue-400", title: "Accurate Budgets", desc: "Know exactly how much you need." }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + (idx * 0.1) }}
                className="flex items-center gap-4 group"
              >
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-colors">
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{feature.title}</h3>
                  <p className="text-indigo-200 text-sm">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        {/* Mobile Background (visible only on small screens) */}
        <div className="absolute inset-0 z-0 lg:hidden">
          <img 
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=2000" 
            alt="University Campus" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"></div>
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl relative z-10 text-center">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Globe className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-zinc-900">GlobalPath</span>
          </div>

          <h2 className="text-3xl font-bold text-zinc-900 mb-2">Welcome</h2>
          <p className="text-zinc-500 mb-8">Sign in to track your progress and plan your journey</p>
          
          <button 
            onClick={handleGoogleSignIn}
            className="w-full py-4 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold hover:bg-zinc-50 transition-all shadow-sm flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
};

const UniversityMatcher = () => {
  const [grades, setGrades] = useState('');
  const [backlogs, setBacklogs] = useState('0');
  const [englishScore, setEnglishScore] = useState('');
  const [workExp, setWorkExp] = useState('0');
  const [internships, setInternships] = useState('0');
  const [budget, setBudget] = useState('');
  const [course, setCourse] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMatch = async () => {
    if (!grades || !budget || !course) return;
    setLoading(true);
    try {
      const prompt = `Act as an expert study abroad counselor. Based on the following student profile, recommend 3-5 universities globally that are a good fit, and provide a brief "Profile Strength Analysis" (e.g., mentioning specific visa categories they qualify for, like Canada SDS if IELTS is high enough).
      
      Profile:
      - Grades/GPA: ${grades}
      - Number of Backlogs: ${backlogs}
      - IELTS/PTE Score: ${englishScore}
      - Work Experience (Years): ${workExp}
      - Number of Internships: ${internships}
      - Budget (per year): ${budget}
      - Preferred Course/Major: ${course}
      
      For each university, provide:
      1. University Name & Country
      2. Why it's a good match (considering their specific profile, backlogs, and work exp)
      3. Estimated Tuition
      4. Acceptance likelihood (Reach, Target, or Safety)
      Format the response cleanly in Markdown.`;
      
      const response = await askAssistant(prompt, "");
      setRecommendations(response);
    } catch (error) {
      console.error(error);
      setRecommendations('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-zinc-900">AI University Matcher & Profile Strength Analyzer</h2>
        <p className="text-zinc-500">Enter your profile details to see which countries and universities fit you best.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 space-y-6 shadow-sm h-fit">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Grades / GPA</label>
              <input 
                type="text" 
                value={grades} 
                onChange={(e) => setGrades(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., 3.8 or 85%"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Backlogs</label>
              <input 
                type="number" 
                value={backlogs} 
                onChange={(e) => setBacklogs(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">IELTS / PTE Score</label>
              <input 
                type="text" 
                value={englishScore} 
                onChange={(e) => setEnglishScore(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., 7.5"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Work Exp (Years)</label>
              <input 
                type="number" 
                value={workExp} 
                onChange={(e) => setWorkExp(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Internships</label>
              <input 
                type="number" 
                value={internships} 
                onChange={(e) => setInternships(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">Budget (USD)</label>
              <input 
                type="text" 
                value={budget} 
                onChange={(e) => setBudget(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., 30000"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Preferred Course / Major</label>
            <input 
              type="text" 
              value={course} 
              onChange={(e) => setCourse(e.target.value)}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g., MS in Computer Science"
            />
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start space-x-3">
            <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-indigo-900">Agent-Free Mode</h4>
              <p className="text-xs text-indigo-700 mt-1">This guide is designed to help you apply directly. You don't need an agent if you follow these steps carefully.</p>
            </div>
          </div>

          <button 
            onClick={handleMatch}
            disabled={loading || !grades || !budget || !course}
            className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analyzing Profile...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>Analyze My Profile</span>
              </span>
            )}
          </button>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm h-[650px] flex flex-col">
          <h3 className="text-xl font-bold text-zinc-900 mb-4 shrink-0">Your Recommendations</h3>
          {recommendations ? (
            <div className="prose prose-indigo max-w-none text-zinc-700 overflow-y-auto flex-1 pr-4">
              <div dangerouslySetInnerHTML={{ __html: recommendations.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 space-y-4">
              <Globe className="w-12 h-12 opacity-20" />
              <p className="text-center">Enter your details and click "Analyze My Profile" to get personalized university recommendations and visa category insights.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SopAssistant = () => {
  const [degree, setDegree] = useState('');
  const [university, setUniversity] = useState('');
  const [goals, setGoals] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const result = await generateSOP(degree, university, goals);
    setDraft(result || '');
    setLoading(false);
  };

  return (
    <div className="pt-24 pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-zinc-900 mb-4">AI SOP Assistant</h2>
        <p className="text-zinc-600">Generate a strong first draft for your Statement of Purpose.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Degree / Program</label>
            <input 
              value={degree} 
              onChange={e => setDegree(e.target.value)} 
              placeholder="e.g. Master's in Computer Science" 
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Target University</label>
            <input 
              value={university} 
              onChange={e => setUniversity(e.target.value)} 
              placeholder="e.g. Technical University of Munich" 
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Career Goals & Background</label>
            <textarea 
              value={goals} 
              onChange={e => setGoals(e.target.value)} 
              placeholder="e.g. I want to build AI systems for healthcare. I have 2 years of experience as a software engineer..." 
              className="w-full p-3 rounded-xl border border-zinc-200 h-32 resize-none focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <button 
            onClick={handleGenerate} 
            disabled={loading || !degree || !university || !goals} 
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-100"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Generating Draft...' : 'Generate SOP Draft'}
          </button>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm flex flex-col h-full min-h-[500px]">
          <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> 
            Your SOP Draft
          </h3>
          <textarea 
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Your generated SOP will appear here. You can edit it directly."
            className="w-full flex-1 p-4 rounded-xl border border-zinc-200 bg-zinc-50 resize-none focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};

const TimelinePlanner = () => {
  const { progress, updateProgress } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [intake, setIntake] = useState('Fall');
  const [year, setYear] = useState('2026');

  useEffect(() => {
    fetchCountries().then(setCountries);
  }, []);

  const country = countries.find(c => c.name === selected);

  const toggleStep = (index: number) => {
    if (!selected) return;
    const currentTimeline = progress.timeline[selected] || [];
    const newTimeline = currentTimeline.includes(index)
      ? currentTimeline.filter(i => i !== index)
      : [...currentTimeline, index];
    
    updateProgress({
      timeline: { ...progress.timeline, [selected]: newTimeline }
    });
  };

  const downloadPDF = () => {
    if (!country) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('GlobalPath - Timeline Planner', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Target Country: ${country.name}`, 14, 32);
    doc.text(`Target Intake: ${intake} ${year}`, 14, 40);

    const tableData = country.timeline.map((item, i) => {
      const isCompleted = (progress.timeline[selected] || []).includes(i);
      return [
        item.month,
        item.task,
        isCompleted ? 'Completed' : 'Pending'
      ];
    });

    autoTable(doc, {
      startY: 48,
      head: [['Timeframe', 'Task', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        0: { cellWidth: 40 },
        2: { cellWidth: 30 }
      }
    });

    doc.save(`Timeline_${country.name.replace(/\s+/g, '_')}_${intake}_${year}.pdf`);
  };

  return (
    <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-zinc-900">Timeline Planner</h2>
        {country && (
          <button 
            onClick={downloadPDF}
            className="flex items-center space-x-2 bg-zinc-900 text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="font-medium text-sm">Export PDF</span>
          </button>
        )}
      </div>
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-700">Country</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full p-3 rounded-xl border border-zinc-200">
            <option value="">Select Country</option>
            {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-700">Intake</label>
          <select value={intake} onChange={(e) => setIntake(e.target.value)} className="w-full p-3 rounded-xl border border-zinc-200">
            <option>Fall</option>
            <option>Spring</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-700">Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full p-3 rounded-xl border border-zinc-200">
            <option>2026</option>
            <option>2027</option>
          </select>
        </div>
      </div>

      {country ? (
        <div className="space-y-8 relative pl-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
          {country.timeline.map((item, i) => {
            const isCompleted = (progress.timeline[selected] || []).includes(i);
            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "relative p-6 rounded-2xl border transition-all shadow-sm",
                  isCompleted ? "bg-indigo-50 border-indigo-200" : "bg-white border-zinc-100"
                )}
              >
                <div className="absolute -left-[41px] top-6 w-6 h-6 rounded-full bg-indigo-600 border-4 border-white shadow-sm flex items-center justify-center">
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className={cn("text-xs font-bold uppercase mb-1", isCompleted ? "text-indigo-400" : "text-indigo-600")}>Month {item.month}</p>
                    <h4 className={cn("text-lg font-bold mb-2", isCompleted ? "text-indigo-900" : "text-zinc-900")}>{item.step}</h4>
                    <p className={cn("text-sm leading-relaxed", isCompleted ? "text-indigo-700" : "text-zinc-600")}>{item.explanation}</p>
                  </div>
                  <button 
                    onClick={() => toggleStep(i)}
                    className={cn(
                      "p-2 transition-colors",
                      isCompleted ? "text-indigo-600" : "text-zinc-300 hover:text-indigo-600"
                    )}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
          <p className="text-zinc-500 font-medium">Select a country to generate your roadmap.</p>
        </div>
      )}
    </div>
  );
};

const AdminPanel = () => {
  const { user, token } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [editing, setEditing] = useState<Partial<Country> | null>(null);

  useEffect(() => {
    fetchCountries().then(setCountries);
  }, []);

  if (user?.role !== 'admin') return <div className="pt-32 text-center">Unauthorized</div>;

  const handleSave = async () => {
    if (!editing || !editing.name) return;
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      const docId = editing.name.toLowerCase().replace(/\s+/g, '-');
      const docRef = doc(db, 'countries', docId);
      
      await setDoc(docRef, editing, { merge: true });
      
      alert('Country updated successfully');
      setEditing(null);
      fetchCountries().then(setCountries);
    } catch (error) {
      console.error('Error saving country:', error);
      alert('Failed to save country');
    }
  };

  return (
    <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-zinc-900">Admin Control Panel</h2>
        <button 
          onClick={() => setEditing({ name: '', exams: [], documents: [], visa_steps: [], timeline: [], comparison_data: { tuition: 0, livingCost: 0, visaTime: '', workHours: '', prChance: '' } })}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Country</span>
        </button>
      </div>

      <div className="grid gap-4">
        {countries.map(c => (
          <div key={c.id} className="bg-white p-6 rounded-2xl border border-zinc-200 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-zinc-900">{c.name}</h3>
              <p className="text-sm text-zinc-500">{c.exams.map(e => e.name).join(', ')}</p>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => setEditing(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                Edit
              </button>
              <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">Edit Country: {editing.name}</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Country Name</label>
                <input 
                  value={editing.name} 
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-zinc-200"
                />
              </div>
              {/* More fields would go here in a full implementation */}
              <p className="text-xs text-zinc-400 italic">Note: In this demo, only the name field is editable for brevity.</p>
            </div>
            <div className="flex justify-end space-x-4 mt-8">
              <button onClick={() => setEditing(null)} className="px-6 py-3 text-zinc-600 font-bold">Cancel</button>
              <button onClick={handleSave} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#FDFDFD] font-sans text-zinc-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          
          <Route path="/countries" element={<ProtectedRoute><CountryList /></ProtectedRoute>} />
          <Route path="/countries/:countryName" element={<ProtectedRoute><CountryDetail /></ProtectedRoute>} />
          <Route path="/matcher" element={<ProtectedRoute><UniversityMatcher /></ProtectedRoute>} />
          <Route path="/eligibility" element={<ProtectedRoute><EligibilityChecker /></ProtectedRoute>} />
          <Route path="/sop-assistant" element={<ProtectedRoute><SopAssistant /></ProtectedRoute>} />
          <Route path="/applications" element={<ProtectedRoute><ApplicationTracker /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><ComparisonTool /></ProtectedRoute>} />
          <Route path="/budget" element={<ProtectedRoute><BudgetCalculator /></ProtectedRoute>} />
          <Route path="/timeline" element={<ProtectedRoute><TimelinePlanner /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        </Routes>
        <Assistant />
        
        <footer className="bg-zinc-900 border-t border-zinc-800 text-zinc-400 py-12 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#5B50E8] rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight border-b-2 border-[#5B50E8]">
                  GlobalPath
                </span>
              </div>
              <p className="text-sm text-zinc-400 max-w-sm">
                Empowering Indian students to study abroad without paying exorbitant agent fees. 
                Clear guides, smart tools, and zero hidden costs.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Features</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/eligibility" className="hover:text-white transition-colors">Profile Analyzer</Link></li>
                <li><Link to="/countries" className="hover:text-white transition-colors">Country Guides</Link></li>
                <li><Link to="/budget" className="hover:text-white transition-colors">Budget Estimator</Link></li>
                <li><Link to="/timeline" className="hover:text-white transition-colors">Timeline Planner</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://www.linkedin.com/in/sukruth-cr-7061a0257/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 hover:text-white transition-colors">
                    <Linkedin className="w-4 h-4" />
                    <span>Sukruth CR (Founder)</span>
                  </a>
                </li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-zinc-800 text-sm flex flex-col md:flex-row justify-between items-center">
            <p>© 2026 GlobalPath. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
