import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, Activity, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingHero() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-slate-950 font-sans text-white">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260803_192301_9231ed6b-c55c-4a48-909c-4ebe11cf2e11.mp4"
      />

      <div className="relative z-10 flex h-full flex-col">
        {/* Top Bar */}
        <nav className="flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-white" />
            <span className="text-lg font-semibold tracking-tight text-white">
              auratrainer
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-1.5 backdrop-blur-lg">
              <Link to="/dashboard" className="rounded-full px-4 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                Command Center
              </Link>
              <Link to="/food-log" className="rounded-full px-4 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                Food Log
              </Link>
              <Link to="/workouts" className="flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                Workouts <ChevronDown className="h-3.5 w-3.5" />
              </Link>
              <Link to="/pantry-ai" className="rounded-full px-4 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                Pantry AI
              </Link>
            </div>
            
            <Link
              to="/dashboard"
              className="flex items-center self-stretch rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(to bottom, #0052FF, #00F0FF)' }}
            >
              Launch App
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={toggleMenu}
            className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-lg md:hidden"
          >
            <Menu
              className={`absolute h-5 w-5 text-white transition-all duration-300 ${
                isMenuOpen ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'
              }`}
            />
            <X
              className={`absolute h-5 w-5 text-white transition-all duration-300 ${
                isMenuOpen ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 -rotate-90'
              }`}
            />
          </button>
        </nav>

        {/* Mobile Menu Overlay & Drawer */}
        <div
          className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={toggleMenu}
        />
        <div
          className={`fixed right-0 top-0 z-40 flex h-full w-72 flex-col bg-black/90 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col gap-2 px-6 pt-24">
            {['Command Center', 'Food Log', 'Workouts', 'Pantry AI'].map((item, i) => (
              <Link
                key={item}
                to={item === 'Command Center' ? '/dashboard' : `/${item.toLowerCase().replace(' ', '-')}`}
                className="flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                style={{
                  opacity: isMenuOpen ? 1 : 0,
                  transform: isMenuOpen ? 'translateX(0)' : 'translateX(24px)',
                  transition: `opacity 400ms ease ${(i + 1) * 60}ms, transform 400ms ease ${(i + 1) * 60}ms, background-color 150ms`,
                }}
              >
                {item}
                {item === 'Workouts' && <ChevronDown className="h-4 w-4" />}
              </Link>
            ))}
          </div>
          <div className="mt-auto px-6 pb-10">
            <Link
              to="/dashboard"
              className="flex w-full items-center justify-center rounded-full py-3.5 text-sm font-medium text-white"
              style={{
                background: 'linear-gradient(to bottom, #0052FF, #00F0FF)',
                opacity: isMenuOpen ? 1 : 0,
                transform: isMenuOpen ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 400ms ease 300ms, transform 400ms ease 300ms',
              }}
            >
              Launch App
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <main className="mt-auto flex flex-col gap-6 px-5 pb-8 sm:gap-8 sm:px-8 sm:pb-12 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:pb-16">
          
          {/* Left Column */}
          <div className="max-w-xl">
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[3.5rem]">
              Compute protocols that build you while you rest.
            </h1>
            
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:inline-flex sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:bg-white/10 sm:p-1.5 sm:backdrop-blur-md sm:border sm:border-white/10">
              <input
                type="email"
                placeholder="Type your email"
                className="rounded-full bg-white/20 px-5 py-3 text-sm text-white placeholder-white/50 outline-none backdrop-blur-md sm:w-64 sm:rounded-none sm:bg-transparent sm:px-4 sm:py-2"
              />
              <button
                className="rounded-full px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:py-2.5"
                style={{ background: 'linear-gradient(to bottom, #0052FF, #00F0FF)' }}
              >
                Access Alpha
              </button>
            </div>
          </div>

          {/* Right Column (Glass Cards) */}
          <div className="flex w-full flex-col gap-4 sm:flex-row lg:w-auto lg:gap-5">
            
            {/* Stats Card */}
            <div className="flex flex-col justify-between rounded-2xl bg-white/10 p-5 backdrop-blur-lg sm:w-64 sm:p-6 border border-white/5">
              <div className="font-stats text-3xl font-normal tracking-tight text-[#00F0FF] sm:text-4xl" style={{ textShadow: '0 0 20px rgba(0, 240, 255, 0.4)' }}>
                12,500+
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/70 sm:mt-4">
                Elite athletes use AuraTrainer to dial in their macros and execute progressive overload.
              </p>
            </div>

            {/* Testimonial Card */}
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-lg sm:w-64 sm:p-6 border border-white/5">
              <div className="mb-3 flex items-center gap-2 sm:mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-[#00F0FF] text-black">
                  <Activity className="h-4 w-4 stroke-[3]" />
                </div>
                <span className="text-sm font-semibold text-white">Vanguard</span>
              </div>
              <p className="text-sm leading-relaxed text-white/80">
                "With AuraTrainer's AI macro parsing, we went from manually logging every gram to having an automated athletic profile."
              </p>
              <div className="mt-4 flex items-center gap-3 sm:mt-5">
                <div className="h-9 w-9 overflow-hidden rounded-full bg-white/20">
                  <img src="https://i.pravatar.cc/72?img=33" alt="Marcus" className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Marcus Vance</span>
                  <span className="text-xs text-white/60">Head of Strength</span>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </section>
  );
}
