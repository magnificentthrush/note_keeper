'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mic, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        router.push('/dashboard');
      } else {
        setIsLoading(false);
      }
    };
    
    checkUser();
  }, [router]);

  if (isLoading) {
    return null;
  }

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-neutral-950 to-neutral-950" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
      
      {/* Glassmorphism Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-neutral-950/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <Image
                src="/darkmode_logo.svg"
                alt="NoteKeeper Logo"
                width={62}
                height={62}
                className="w-[62px] h-[62px]"
              />
              <span className="text-2xl md:text-3xl font-black tracking-tight text-white" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', letterSpacing: '-0.02em' }}>NoteKeeper</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link href="/auth">
                <button className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105">
                  Get Started
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 text-center">
        {/* Hero Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-sm text-slate-300 mb-8"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>AI-Powered Note Taking v1.0</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-tight mb-6"
        >
          Transform lectures into
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-pink-600 bg-clip-text text-transparent">
            study-ready notes
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl sm:text-2xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed px-4"
        >
          Record your lectures, add key points in real-time, and let AI generate comprehensive study notes automatically.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link href="/auth">
            <button className="group px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60 transition-all duration-300 hover:scale-105 flex items-center gap-2 text-lg">
              Start for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </motion.div>
      </div>

      {/* Features Section - Bento Grid */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {/* Feature Card 1 */}
          <motion.div
            variants={fadeIn}
            className="group p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300 flex flex-col gap-4"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <Mic className="w-7 h-7 text-purple-400" />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-bold text-white">One-Click Recording</h3>
              <p className="text-slate-400 leading-relaxed">
                Start recording with a single click. Works right in your browser with no setup needed.
              </p>
            </div>
          </motion.div>

          {/* Feature Card 2 */}
          <motion.div
            variants={fadeIn}
            className="group p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 hover:border-pink-500/50 transition-all duration-300 flex flex-col gap-4"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-pink-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <Sparkles className="w-7 h-7 text-pink-400" />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-bold text-white">Real-Time Key Points</h3>
              <p className="text-slate-400 leading-relaxed">
                Mark important moments during the lecture. Your notes will be highlighted in the final output.
              </p>
            </div>
          </motion.div>

          {/* Feature Card 3 */}
          <motion.div
            variants={fadeIn}
            className="group p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300 md:col-span-2 lg:col-span-1 flex flex-col gap-4"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <FileText className="w-7 h-7 text-purple-400" />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-bold text-white">AI-Generated Notes</h3>
              <p className="text-slate-400 leading-relaxed">
                Advanced AI transcribes and transforms your lecture into structured, study-ready notes.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-white/10 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-500 text-sm">
            © 2025 NoteKeeper. AI-powered lecture notes.
          </p>
        </div>
      </footer>
    </div>
  );
}
