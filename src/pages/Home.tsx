import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { MapPin, Calendar, CreditCard, ShieldCheck, Phone, Mail, Instagram, ArrowRight, Clock, Map as MapIcon, Compass, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import GenuineIndiaMap from '../components/GenuineIndiaMap';
import ScrollReveal from '../components/ScrollReveal';
import ParallaxBackground from '../components/ParallaxBackground';
import SlideToBookButton from '../components/SlideToBookButton';
import FleetSection from '../components/FleetSection';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleRouteClick = (destination: string) => {
    const routes: Record<string, any> = {
      'Chhindwara': {
        from: { name: 'Seoni', city: 'Seoni', state: 'Madhya Pradesh', country: 'India', lat: 22.0869, lng: 79.5435, displayName: 'Seoni, Madhya Pradesh, India' },
        to: { name: 'Chhindwara', city: 'Chhindwara', state: 'Madhya Pradesh', country: 'India', lat: 22.0574, lng: 78.9382, displayName: 'Chhindwara, Madhya Pradesh, India' }
      },
      'Nagpur': {
        from: { name: 'Seoni', city: 'Seoni', state: 'Madhya Pradesh', country: 'India', lat: 22.0869, lng: 79.5435, displayName: 'Seoni, Madhya Pradesh, India' },
        to: { name: 'Nagpur', city: 'Nagpur', state: 'Maharashtra', country: 'India', lat: 21.1458, lng: 79.0882, displayName: 'Nagpur, Maharashtra, India' }
      },
      'Jabalpur': {
        from: { name: 'Seoni', city: 'Seoni', state: 'Madhya Pradesh', country: 'India', lat: 22.0869, lng: 79.5435, displayName: 'Seoni, Madhya Pradesh, India' },
        to: { name: 'Jabalpur', city: 'Jabalpur', state: 'Madhya Pradesh', country: 'India', lat: 23.1815, lng: 79.9864, displayName: 'Jabalpur, Madhya Pradesh, India' }
      }
    };

    localStorage.setItem('pendingRoute', JSON.stringify(routes[destination]));
    
    if (user) {
      if (user.role === 'customer') {
        localStorage.setItem('customerActiveTab', 'dashboard');
      }
      navigate(`/dashboard/${user.role}`);
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#060608] flex flex-col transition-colors duration-500 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-[#F5F5F7] to-[#F5F5F7] dark:from-indigo-900/20 dark:via-[#060608]/80 dark:to-[#060608] z-0 pointer-events-none transition-colors duration-500"></div>
      
      {/* GLOBAL BACKGROUND MAP : Stays fixed to the entire document height */}
      <div className="absolute inset-x-0 top-0 bottom-0 z-0 pointer-events-none overflow-hidden opacity-100 dark:opacity-100 transition-opacity duration-1000 mix-blend-multiply dark:mix-blend-normal">
        <GenuineIndiaMap />
      </div>

      <div className="relative z-10 w-full flex flex-col flex-grow">
        <Navbar />
      
      {/* Main Content Wrapper to push footer to bottom if content is short */}
      <div className="flex-grow">
        {/* Hero Section */}
        <div className="relative w-full min-h-[calc(100vh-64px)] flex items-center justify-center lg:justify-start overflow-hidden">
          {/* Text Content */}
          <div className="relative z-20 w-full px-4 sm:px-6 lg:px-24 xl:px-32 flex justify-center lg:justify-start pt-8 lg:pt-0">
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full max-w-2xl rounded-3xl p-8 sm:p-12 text-center lg:text-left shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] dark:shadow-2xl relative overflow-hidden bg-white/40 backdrop-blur-md border border-white/40 transition-colors duration-500"
            >
              {/* Subtle noise overlay for premium glass feel */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
              
              <h1 className="relative z-10 text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl drop-shadow-[0_0_15px_rgba(0,0,0,0.05)] leading-tight transition-colors duration-500">
                <span className="block mb-2 text-gray-900 transition-colors duration-500">Your Journey,</span>
                <span className="block text-indigo-600 mt-2">Our Priority</span>
              </h1>
              <p className="relative z-10 mt-6 text-base text-gray-600 sm:text-lg md:text-xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] leading-relaxed font-light transition-colors duration-500">
                Experience the best touring and traveling services with YuvRaj Tour & Travelers. We offer comfortable, safe, and reliable rides for all your needs.
              </p>
              <div className="relative z-10 mt-10 sm:flex sm:justify-center lg:justify-start gap-4">
                <Link
                  to={user ? `/dashboard/${user.role}` : "/register"}
                  className="group w-full sm:w-auto flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] transform hover:-translate-y-1 transition-all duration-300"
                >
                  {user ? "Book a Ride" : "Book a Ride"}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                {!user && (
                  <Link
                    to="/login"
                    className="mt-4 sm:mt-0 w-full sm:w-auto flex items-center justify-center px-8 py-3.5 text-base font-medium rounded-xl text-gray-900 bg-white/30 transition-all duration-300 hover:bg-white/50 shadow-[0_0_15px_rgba(0,0,0,0.02)] hover:shadow-[0_0_25px_rgba(0,0,0,0.05)] transform hover:-translate-y-1 border border-white/50 backdrop-blur-md"
                  >
                    Login
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Features Section - Bento Grid */}
        <div className="py-24 bg-transparent transition-colors duration-500 relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-sm text-indigo-600 font-bold tracking-widest uppercase mb-3">Why Choose Us</h2>
                <p className="text-4xl leading-tight font-extrabold text-gray-900 sm:text-5xl transition-colors duration-500">
                  A better way to travel
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Large Bento Box */}
              <ScrollReveal delay={0.1} className="md:col-span-2">
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="h-full bg-white/20 backdrop-blur-md rounded-3xl p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/40 relative overflow-hidden group transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-colors duration-500"></div>
                  <div className="relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 border border-indigo-100 transition-colors duration-500">
                      <MapPin className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 transition-colors duration-500">Anywhere, Anytime</h3>
                    <p className="text-gray-600 text-lg leading-relaxed max-w-md transition-colors duration-500">
                      We cover a wide range of locations. Just tell us where you want to go, and we'll get you there safely and comfortably.
                    </p>
                  </div>
                </motion.div>
              </ScrollReveal>

              {/* Small Bento Box 1 */}
              <ScrollReveal delay={0.2}>
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="h-full bg-white/20 backdrop-blur-md rounded-3xl p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/40 relative overflow-hidden group transition-all duration-500"
                >
                  <div className="absolute bottom-0 right-0 w-24 h-24 bg-green-50 rounded-full blur-2xl group-hover:bg-green-100 transition-colors duration-500"></div>
                  <div className="relative z-10">
                    <div className="h-12 w-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-6 border border-green-200 transition-colors duration-500">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 transition-colors duration-500">Easy Booking</h3>
                    <p className="text-gray-600 transition-colors duration-500">
                      Our simple booking process ensures you can reserve your ride in just a few clicks.
                    </p>
                  </div>
                </motion.div>
              </ScrollReveal>

              {/* Small Bento Box 2 */}
              <ScrollReveal delay={0.3}>
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="h-full bg-white/20 backdrop-blur-md rounded-3xl p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/40 relative overflow-hidden group transition-all duration-500"
                >
                  <div className="absolute top-0 left-0 w-24 h-24 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100 transition-colors duration-500"></div>
                  <div className="relative z-10">
                    <div className="h-12 w-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-6 border border-red-200 transition-colors duration-500">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 transition-colors duration-500">Safe & Secure</h3>
                    <p className="text-gray-600 transition-colors duration-500">
                      Your safety is our top priority. All our drivers are verified and vehicles are regularly inspected.
                    </p>
                  </div>
                </motion.div>
              </ScrollReveal>

              {/* Medium Bento Box */}
              <ScrollReveal delay={0.4} className="md:col-span-2">
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="h-full bg-white/20 backdrop-blur-md rounded-3xl p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/40 relative overflow-hidden group flex flex-col md:flex-row items-start md:items-center gap-6 transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                    <CreditCard className="h-8 w-8" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 transition-colors duration-500">Transparent Pricing</h3>
                    <p className="text-gray-600 text-lg transition-colors duration-500">
                      No hidden fees. You know exactly what you'll pay before you book your ride. We believe in fair and honest pricing for all our customers.
                    </p>
                  </div>
                </motion.div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* Popular Intercity Routes Section */}
        <div className="py-16 sm:py-24 bg-transparent transition-colors duration-500 relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <ScrollReveal>
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
                <div className="max-w-2xl">
                  <h2 className="text-sm text-indigo-600 font-bold tracking-widest uppercase mb-3">Top Destinations</h2>
                  <p className="text-3xl leading-tight font-extrabold text-gray-900 sm:text-4xl transition-colors duration-500">
                    Popular Intercity Routes
                  </p>
                </div>
                <Link to="/routes" className="mt-4 md:mt-0 inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-500 transition-colors group">
                  View all routes
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </ScrollReveal>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Seoni to Chhindwara */}
              <ScrollReveal delay={0.1}>
                <motion.div
                  className="relative h-80 rounded-2xl overflow-hidden group shadow-sm hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-900 dark:to-indigo-950 flex flex-col justify-between p-6"
                >
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 text-white/10 group-hover:text-white/20 transition-colors duration-500 pointer-events-none">
                    <MapIcon className="w-64 h-64" />
                  </div>
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-full flex items-center justify-center text-white mb-4">
                      <Compass className="w-6 h-6" />
                    </div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-white text-indigo-600 text-sm font-bold shadow-lg whitespace-nowrap flex-shrink-0">
                      From ₹2200
                    </div>
                  </div>
                  
                  <div className="relative z-10 flex flex-col justify-end mt-auto space-y-4">
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 mb-2">
                        Seoni <ArrowRight className="h-5 w-5 text-indigo-200 flex-shrink-0" /> <span className="truncate">Chhindwara</span>
                      </h3>
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-sm font-medium border border-white/10 whitespace-nowrap">
                        <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        50 Mins
                      </div>
                    </div>
                    
                    <div className="w-full pt-2">
                      <SlideToBookButton 
                        onConfirm={() => handleRouteClick('Chhindwara')} 
                        isLoading={false} 
                        disabled={false} 
                        text="Slide to Book"
                      />
                    </div>
                  </div>
                </motion.div>
              </ScrollReveal>

              {/* Card 2: Seoni to Nagpur */}
              <ScrollReveal delay={0.2}>
                <motion.div
                  className="relative h-80 rounded-2xl overflow-hidden group shadow-sm hover:shadow-xl transition-shadow bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-900 dark:to-teal-950 flex flex-col justify-between p-6"
                >
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 text-white/10 group-hover:text-white/20 transition-colors duration-500 pointer-events-none">
                    <Navigation className="w-64 h-64" />
                  </div>
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-full flex items-center justify-center text-white mb-4">
                      <Compass className="w-6 h-6" />
                    </div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-white text-teal-700 text-sm font-bold shadow-lg whitespace-nowrap flex-shrink-0">
                      From ₹4000
                    </div>
                  </div>
                  
                  <div className="relative z-10 flex flex-col justify-end mt-auto space-y-4">
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 mb-2">
                        Seoni <ArrowRight className="h-5 w-5 text-teal-200 flex-shrink-0" /> <span className="truncate">Nagpur</span>
                      </h3>
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-sm font-medium border border-white/10 whitespace-nowrap">
                        <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        2.0 Hours
                      </div>
                    </div>
                    
                    <div className="w-full pt-2">
                      <SlideToBookButton 
                        onConfirm={() => handleRouteClick('Nagpur')} 
                        isLoading={false} 
                        disabled={false} 
                        text="Slide to Book"
                      />
                    </div>
                  </div>
                </motion.div>
              </ScrollReveal>

              {/* Card 3: Seoni to Jabalpur */}
              <ScrollReveal delay={0.3}>
                <motion.div
                  className="relative h-80 rounded-2xl overflow-hidden group shadow-sm hover:shadow-xl transition-shadow bg-gradient-to-br from-orange-400 to-red-500 dark:from-orange-900 dark:to-red-950 flex flex-col justify-between p-6"
                >
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 text-white/10 group-hover:text-white/20 transition-colors duration-500 pointer-events-none">
                    <MapPin className="w-64 h-64" />
                  </div>

                  <div className="relative z-10 flex justify-between items-start">
                    <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-full flex items-center justify-center text-white mb-4">
                      <Compass className="w-6 h-6" />
                    </div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-white text-red-600 text-sm font-bold shadow-lg whitespace-nowrap flex-shrink-0">
                      From ₹4300
                    </div>
                  </div>
                  
                  <div className="relative z-10 flex flex-col justify-end mt-auto space-y-4">
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 mb-2">
                        Seoni <ArrowRight className="h-5 w-5 text-red-200 flex-shrink-0" /> <span className="truncate">Jabalpur</span>
                      </h3>
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-sm font-medium border border-white/10 whitespace-nowrap">
                        <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        2.6 Hours
                      </div>
                    </div>
                    
                    <div className="w-full pt-2">
                      <SlideToBookButton 
                        onConfirm={() => handleRouteClick('Jabalpur')} 
                        isLoading={false} 
                        disabled={false} 
                        text="Slide to Book"
                      />
                    </div>
                  </div>
                </motion.div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        <FleetSection />
      </div>

      {/* Footer Section */}
      <footer className="bg-white/40 backdrop-blur-lg text-gray-900 py-16 border-t border-white/40 transition-colors duration-500 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* About */}
              <div>
                <h3 className="text-2xl font-bold mb-6 font-heading">YuvRaj Tour & Travelers</h3>
                <p className="text-gray-600 text-sm leading-relaxed max-w-sm transition-colors duration-500">
                  Providing reliable, comfortable, and safe travel experiences. Your journey is our priority. Book with us today for a seamless ride.
                </p>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold mb-6 text-gray-800 transition-colors duration-500">Contact Us</h3>
                <ul className="space-y-4">
                  <li className="flex items-start group">
                    <div className="p-2 bg-gray-50 rounded-lg mr-4 group-hover:bg-indigo-50 transition-colors border border-transparent">
                      <MapPin className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="text-gray-600 text-sm mt-1 transition-colors duration-500">123 Main Street, City Center<br />State, Country 12345</span>
                  </li>
                  <li className="flex items-start group">
                    <div className="p-2 bg-gray-50 rounded-lg mr-4 group-hover:bg-indigo-50 transition-colors border border-transparent">
                      <Phone className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="text-gray-600 text-sm mt-1 transition-colors duration-500">
                      +91 6266440222<br />
                      +91 9589681877
                    </span>
                  </li>
                  <li className="flex items-center group">
                    <div className="p-2 bg-gray-50 rounded-lg mr-4 group-hover:bg-indigo-50 transition-colors border border-transparent">
                      <Mail className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="text-gray-600 text-sm transition-colors duration-500">info@yuvrajtravels.com</span>
                  </li>
                </ul>
              </div>

              {/* Social Media */}
              <div>
                <h3 className="text-lg font-semibold mb-6 text-gray-800 transition-colors duration-500">Follow Us</h3>
                <p className="text-gray-600 text-sm mb-6 transition-colors duration-500">
                  Stay updated with our latest offers and travel stories.
                </p>
                <a 
                  href="https://www.instagram.com/ertiga__love__8952_seoni?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-700 hover:text-pink-600 transition-all duration-300 border border-gray-200 hover:border-pink-500/30 backdrop-blur-sm"
                >
                  <Instagram className="h-5 w-5 mr-3" />
                  <span className="text-sm font-medium">@ertiga__love__8952_seoni</span>
                </a>
              </div>
            </div>
            
            <div className="border-t border-gray-200 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between transition-colors duration-500">
              <p className="text-gray-500 text-sm transition-colors duration-500">
                &copy; {new Date().getFullYear()} YuvRaj Tour & Travelers. All rights reserved.
              </p>
              <div className="mt-4 md:mt-0 flex space-x-6">
                <Link to="/privacy" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">Terms of Service</Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </footer>
      </div>
    </div>
  );
}
