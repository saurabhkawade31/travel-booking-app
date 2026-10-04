import { logger } from '../lib/logger';
import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { api, socket } from '../lib/api';
import { validateEmail, validateName, validatePhone, parseRideDate, safeFormatDate } from '../lib/validation';
import { format } from 'date-fns';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useDragControls } from 'motion/react';
import { CheckCircle, Calendar, Clock, Car, Users, MapPin, Grid, RefreshCw, Info, ChevronDown, ChevronUp, CreditCard, ChevronRight, ChevronLeft, Moon, Sun, Crown, Star, Shield, Radar, Snowflake, ArrowUpDown, Home, List, User } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import debounce from 'lodash.debounce';
import InteractiveMap from '../components/InteractiveMap';
import SlideToBookButton from '../components/SlideToBookButton';
import { toast } from 'sonner';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface LocationData {
  name: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  displayName: string;
  primaryText?: string;
  secondaryText?: string;
}

const AVAILABLE_VEHICLES = [
  { name: 'Swift Dzire', capacity: 4, quantity: 1, lottieUrl: 'https://lottie.host/a3fc0f6f-20c3-434a-897e-34be96418de4/QxfkOjC2kd.lottie' },
  { name: 'Ertiga', capacity: 7, quantity: 2, lottieUrl: 'https://lottie.host/75a3a692-ae50-4dc3-8012-e684598abb73/zzjksJNlHK.lottie' },
  { name: 'Force Traveller (18 Seater)', capacity: 18, quantity: 1, lottieUrl: 'https://lottie.host/98f55fa3-cdc6-4ac9-ad8a-8ccd5e4ddeab/O5vGj1aR50.lottie' },
  { name: 'Force Traveller (22 Seater)', capacity: 22, quantity: 1, lottieUrl: 'https://lottie.host/98f55fa3-cdc6-4ac9-ad8a-8ccd5e4ddeab/O5vGj1aR50.lottie' },
];

const getInitialDateTime = () => {
  const now = new Date();
  now.setHours(now.getHours() + 1); // Default to 1 hour from now

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  let hour = now.getHours();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  const hourStr = String(hour).padStart(2, '0');

  let minute = now.getMinutes();
  let minuteStr = '00';
  if (minute <= 15) minuteStr = '15';
  else if (minute <= 30) minuteStr = '30';
  else if (minute <= 45) minuteStr = '45';
  else {
    minuteStr = '00';
    now.setHours(now.getHours() + 1);
    let newHour = now.getHours();
    const newAmPm = newHour >= 12 ? 'PM' : 'AM';
    newHour = newHour % 12;
    newHour = newHour ? newHour : 12;
    return {
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      hour: String(newHour).padStart(2, '0'),
      minute: minuteStr,
      ampm: newAmPm
    };
  }

  return { date: dateStr, hour: hourStr, minute: minuteStr, ampm };
};

const AbstractMiniMap = ({ from, to, status }: { from: string, to: string, status?: string }) => {
  let initialLeft: string | number = 0;
  let animateLeft: string | number = '100%';
  let transitionProps: any = { duration: 3, repeat: Infinity, ease: "linear" };

  if (status === 'Completed') {
    initialLeft = '100%';
    animateLeft = '100%';
    transitionProps = { duration: 0 };
  } else if (!status || status === 'Ongoing') {
    // If no status is provided (e.g., in step 2 preview) or if it's ongoing, animate it continuously
    initialLeft = 0;
    animateLeft = '100%';
    transitionProps = { duration: 3, repeat: Infinity, ease: "linear" };
  } else {
    // Pending, Confirmed, Assigned, Cancelled
    initialLeft = 0;
    animateLeft = 0;
    transitionProps = { duration: 0 };
  }

  return (
    <div className={`h-24 w-full rounded-xl relative overflow-hidden bg-indigo-50/50 border border-indigo-100 flex items-center justify-center p-4 mb-4`}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(99,102,241,0.4) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
      <div className="relative w-full max-w-xs flex items-center justify-between">
        <div className="flex flex-col items-center gap-1 z-10">
          <div className={`w-4 h-4 rounded-full bg-indigo-600 border-2 border-white`}></div>
          <span className={`text-[10px] font-medium truncate w-20 text-center text-gray-600`}>{from.split(',')[0]}</span>
        </div>
        <div className="flex-1 h-0 border-t-2 border-dashed border-indigo-300/50 mx-2 relative">
          <motion.div 
            initial={{ left: initialLeft }}
            animate={{ left: animateLeft }}
            transition={transitionProps}
            className="absolute -top-2 -ml-2 w-4 h-4 text-indigo-500"
          >
            <Car className="w-4 h-4" />
          </motion.div>
        </div>
        <div className="flex flex-col items-center gap-1 z-10">
          <div className={`w-4 h-4 rounded-full bg-purple-600 border-2 border-white`}></div>
          <span className={`text-[10px] font-medium truncate w-20 text-center text-gray-600`}>{to.split(',')[0]}</span>
        </div>
      </div>
    </div>
  );
};

const LoyaltyCard = ({ bookingsCount }: { bookingsCount: number,  }) => {
  const tier = bookingsCount >= 6 ? 'Black' : bookingsCount >= 3 ? 'Gold' : 'Silver';
  const nextTier = tier === 'Silver' ? 'Gold' : tier === 'Gold' ? 'Black' : null;
  const progress = tier === 'Silver' ? (bookingsCount / 3) * 100 : tier === 'Gold' ? ((bookingsCount - 3) / 3) * 100 : 100;
  
  const getTierStyles = () => {
    if (tier === 'Black') return 'from-gray-900 via-gray-800 to-black border-gray-700 text-gray-900 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border';
    if (tier === 'Gold') return 'from-amber-700 via-yellow-600 to-amber-800 border-yellow-500/50 text-gray-900 shadow-[0_4px_15px_rgba(217,119,6,0.3)] border';
    return 'from-slate-700 via-slate-600 to-slate-800 border-slate-500/30 text-gray-900 shadow-[0_4px_15px_rgba(71,85,105,0.3)] border';
  };

  const Icon = tier === 'Black' ? Crown : tier === 'Gold' ? Star : Shield;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border bg-gradient-to-br ${getTierStyles()} opacity-90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
      <div className="relative z-10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 text-white">
            {tier} Member
          </h3>
          <p className="text-xs tracking-wider opacity-80 text-white mt-0.5">{bookingsCount} Total Rides</p>
        </div>
      </div>
      
      {nextTier ? (
        <div className="relative z-10 w-full sm:w-1/3 min-w-[200px]">
          <div className="flex justify-between text-xs mb-1.5 text-white/90 font-medium">
            <span>Next Tier: {nextTier}</span>
            <span>{tier === 'Silver' ? 3 - bookingsCount : 6 - bookingsCount} rides left</span>
          </div>
          <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
            />
          </div>
        </div>
      ) : (
        <div className="relative z-10 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-white uppercase tracking-wider">
          Top Tier Reached
        </div>
      )}
    </motion.div>
  );
};

const VehicleShowroomCard = ({ vehicle, isSelected, isUnavailable,  onClick }: any) => {
  return (
    <div
      onClick={onClick}
      className={`relative py-3 px-4 rounded-xl cursor-pointer transition-all duration-300 flex items-center gap-4 ${
        isSelected 
          ? 'bg-indigo-500/10 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
          : isUnavailable 
            ? 'opacity-40 cursor-not-allowed bg-transparent border border-transparent'
            : 'bg-white/5 border border-gray-200 border-opacity-50 hover:bg-white/10 hover:border-gray-200 border-opacity-50'
      }`}
    >
      {/* Car Icon Box */}
      <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
        {vehicle.lottieUrl ? (
          <DotLottieReact
            src={vehicle.lottieUrl}
            loop
            autoplay
            className="w-full h-full object-contain pointer-events-none"
            renderConfig={{ autoResize: true, devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2 }}
          />
        ) : (
          <Car className={`w-8 h-8 ${isSelected ? 'text-indigo-400' : 'text-gray-900/50'}`} />
        )}
      </div>

      {/* Details */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className={`font-semibold text-base ${isSelected ? 'text-gray-900' : 'text-gray-900/80'}`}>
            {vehicle.name.replace(/ \(\d+ Seater\)/, '')}
          </h4>
          <div className="flex items-center text-xs text-gray-900/40 gap-1 bg-gray-100 dark:bg-[#ffffff]/10 px-2 py-0.5 rounded-full border border-gray-200 border-opacity-50">
            <Users className="w-3 h-3" /> {vehicle.capacity}
          </div>
        </div>
        {isUnavailable && (
          <p className="text-xs text-red-400 mt-1">
            Currently Unavailable
          </p>
        )}
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="flex-shrink-0">
           <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.5)]">
             <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_5px_rgba(99,102,241,1)]" />
           </div>
        </div>
      )}
    </div>
  );
};

const ConciergeLoading = () => (
  <motion.div 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    exit={{ opacity: 0 }}
    className={`absolute inset-0 z-[60] flex flex-col items-center justify-center rounded-t-[2.5rem] sm:rounded-[2.5rem] backdrop-blur-xl bg-white/80 dark:bg-[#060608]/90 overflow-hidden`}
  >
    <div className="relative w-full max-w-xs h-32 flex flex-col items-center justify-center mb-6 overflow-hidden">
      <motion.div 
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        className="relative z-10 flex items-center"
      >
        <div className="w-32 h-32 scale-x-[-1]">
          <DotLottieReact
            src="https://lottie.host/0c72bf38-adf9-4b08-b51c-6566aed4c60d/JpUdeM1tWH.lottie"
            loop
            autoplay
            className="w-full h-full object-contain pointer-events-none"
            renderConfig={{ autoResize: true, devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2 }}
          />
        </div>
      </motion.div>
      <div className="absolute bottom-4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
    </div>
    <h3 className={`text-xl font-bold mb-2 text-gray-900 dark:text-white tracking-tight`}>Curating your route...</h3>
    <p className={`text-sm text-gray-900/50 dark:text-gray-400`}>Preparing your premium vehicle</p>
  </motion.div>
);

export default function CustomerDashboard() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') as 'dashboard' | 'bookings' | 'profile' | null;
  const activeTab = activeTabParam || 'dashboard';

  const setActiveTab = (tab: 'dashboard' | 'bookings' | 'profile') => {
    setSearchParams({ tab });
    localStorage.setItem('customerActiveTab', tab);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const tab = localStorage.getItem('customerActiveTab') as 'dashboard' | 'bookings' | 'profile';
      if (tab && !activeTabParam) setActiveTab(tab);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [activeTabParam, setSearchParams]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Wizard State
  const [bookingStep, setBookingStep] = useState(1);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const dragControls = useDragControls();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const container = document.getElementById('bottom-sheet-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [bookingStep, activeTab]);
  
  // Theme State
  
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [rideDate, setRideDate] = useState<string>(() => getInitialDateTime().date);
  const [rideTimeHour, setRideTimeHour] = useState<string>(() => getInitialDateTime().hour);
  const [rideTimeMinute, setRideTimeMinute] = useState<string>(() => getInitialDateTime().minute);
  const [rideTimeAmPm, setRideTimeAmPm] = useState<string>(() => getInitialDateTime().ampm);
  const [rideType, setRideType] = useState('Intercity');
  const [numberOfPeople, setNumberOfPeople] = useState<number | ''>(1);
  const setBookingError = (msg: string) => { if (msg) toast.error(msg); };
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);

  // Vehicle Selection State
  const [selectedVehicle, setSelectedVehicle] = useState<string>('Swift Dzire');
  const [confirmCapacity, setConfirmCapacity] = useState(false);

  // New Booking Fields
  const [tripType, setTripType] = useState('One-way');
  const [returnDate, setReturnDate] = useState<string>(() => getInitialDateTime().date);
  const [returnTimeHour, setReturnTimeHour] = useState<string>(() => getInitialDateTime().hour);
  const [returnTimeMinute, setReturnTimeMinute] = useState<string>(() => getInitialDateTime().minute);
  const [returnTimeAmPm, setReturnTimeAmPm] = useState<string>(() => getInitialDateTime().ampm);

  // Tour Fields
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [activeDestinationIndex, setActiveDestinationIndex] = useState<number | null>(null);
  const [destinationSuggestions, setDestinationSuggestions] = useState<{ [key: number]: LocationData[] }>({});
  
  // Car Renting Fields
  const [numberOfDays, setNumberOfDays] = useState<number | ''>(1);
  const [numberOfCars, setNumberOfCars] = useState<number | ''>(1);
  
  // Shared
  const [estimatedKM, setEstimatedKM] = useState(0);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [isAC, setIsAC] = useState(false);

  // Wedding Fields
  const [weddingDate, setWeddingDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [vehiclesRequired, setVehiclesRequired] = useState('1');
  const [decorationRequired, setDecorationRequired] = useState('No');

  // Airport Transfer Fields
  const [pickupType, setPickupType] = useState('Arrival');

  // Other Fields
  const [customRequirements, setCustomRequirements] = useState('');

  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const setProfileError = (msg: string) => { if (msg) toast.error(msg); };
  const setProfileSuccess = (msg: string) => { if (msg) toast.success(msg); };
  const [cancelMessage, setCancelMessage] = useState<{id: string, text: string, type: 'success' | 'error'} | null>(null);
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean, booking: any | null, refundInfo: any | null }>({ isOpen: false, booking: null, refundInfo: null });

  const calculateRefund = (rideDateStr: string, fareAmount: number, numberOfDays: number | string, paymentStatus?: string) => {
    if (paymentStatus !== 'Paid') {
      return { refundPercent: 100, refundAmount: 0, message: "No payment made, cancellation is free." };
    }

    let rideDate = parseRideDate(rideDateStr);
    
    if (isNaN(rideDate.getTime())) {
      return { refundPercent: 0, refundAmount: 0, message: "Could not determine ride date." };
    }
    
    const now = new Date();
    const diffInMs = rideDate.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    const days = typeof numberOfDays === 'number' ? numberOfDays : (parseInt(numberOfDays as string) || 1);
    const isMultiDay = days > 1;

    if (diffInHours < 24) {
      return { refundPercent: 0, refundAmount: 0, message: "No refund for cancellations within 24 hours of departure." };
    } else if (diffInHours >= 24 && diffInHours <= 72) {
      const percent = isMultiDay ? 25 : 50;
      return { refundPercent: percent, refundAmount: (fareAmount * percent) / 100, message: `${percent}% refund applied.` };
    } else {
      const percent = isMultiDay ? 50 : 85;
      return { refundPercent: percent, refundAmount: (fareAmount * percent) / 100, message: `${percent}% refund applied.` };
    }
  };
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [rebookModal, setRebookModal] = useState<{ isOpen: boolean, booking: any | null }>({ isOpen: false, booking: null });
  const [rebookDate, setRebookDate] = useState('');
  const [rebookTimeHour, setRebookTimeHour] = useState('12');
  const [rebookTimeMinute, setRebookTimeMinute] = useState('00');
  const [rebookTimeAmPm, setRebookTimeAmPm] = useState('AM');
  const [rebookLoading, setRebookLoading] = useState(false);
  const setRebookError = (msg: string) => { if (msg) toast.error(msg); };

  // Autocomplete State
  const [fromLocationData, setFromLocationData] = useState<LocationData | null>(null);
  const [toLocationData, setToLocationData] = useState<LocationData | null>(null);
  const [destinationData, setDestinationData] = useState<(LocationData | null)[]>([null]);
  const [fromSuggestions, setFromSuggestions] = useState<LocationData[]>([]);
  const [toSuggestions, setToSuggestions] = useState<LocationData[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Check for pending route from homepage
  useEffect(() => {
    const pendingRouteStr = localStorage.getItem('pendingRoute');
    if (pendingRouteStr) {
      try {
        const pendingRoute = JSON.parse(pendingRouteStr);
        if (pendingRoute.from && pendingRoute.to) {
          setFromLocation(pendingRoute.from.displayName);
          setFromLocationData(pendingRoute.from);
          setToLocation(pendingRoute.to.displayName);
          setToLocationData(pendingRoute.to);
          
          // Clear it so it doesn't auto-fill next time
          localStorage.removeItem('pendingRoute');
        }
      } catch (e) {
        logger.error('Error parsing pending route', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('customerActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchBookings();
    if (user) {
      fetchProfile();
    }

    socket.on('booking:updated', (updatedBooking) => {
      if (updatedBooking.userId === user?.id) {
        setBookings(prev => prev.map(b => b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b));
      }
    });

    socket.on('booking:created', (newBooking) => {
      if (newBooking.userId === user?.id) {
        setBookings(prev => [...prev, newBooking]);
      }
    });

    return () => {
      socket.off('booking:updated');
      socket.off('booking:created');
    };
  }, [user?.id]);

  const fetchLocationSuggestions = useMemo(
    () =>
      debounce(async (input: string, setter: (s: LocationData[]) => void, currentRideType: string) => {
        if (!input || input.length < 2) {
          setter([]);
          return;
        }
        try {
          const res = await fetch(`/api/location?q=${encodeURIComponent(input)}&rideType=${encodeURIComponent(currentRideType)}`);
          if (res.ok) {
            const data = await res.json();
            setter(data);
          }
        } catch (e) {
          logger.error('Failed to fetch location suggestions', e);
        }
      }, 300),
    []
  );

  useEffect(() => {
    if (showFromSuggestions) fetchLocationSuggestions(fromLocation, setFromSuggestions, rideType);
  }, [fromLocation, showFromSuggestions, fetchLocationSuggestions, rideType]);

  useEffect(() => {
    if (showToSuggestions) fetchLocationSuggestions(toLocation, setToSuggestions, rideType);
  }, [toLocation, showToSuggestions, fetchLocationSuggestions, rideType]);

  useEffect(() => {
    if (activeDestinationIndex !== null) {
      fetchLocationSuggestions(destinations[activeDestinationIndex], (suggestions) => {
        setDestinationSuggestions(prev => ({ ...prev, [activeDestinationIndex]: suggestions }));
      }, rideType);
    }
  }, [destinations, activeDestinationIndex, fetchLocationSuggestions, rideType]);

  useEffect(() => {
    if (tripType === 'Car Renting') {
      const days = Number(numberOfDays) || 1;
      const cars = Number(numberOfCars) || 1;
      setEstimatedPrice(days * 2000 * cars);
      return;
    }

    if (!fromLocation || fromLocation.trim().length < 2) {
      setEstimatedKM(0);
      setEstimatedPrice(0);
      return;
    }

    if (tripType !== 'Tour' && (!toLocation || toLocation.trim().length < 2)) {
      setEstimatedKM(0);
      setEstimatedPrice(0);
      return;
    }

    const validDestinations = destinations.filter(d => d.trim().length >= 2);
    if (tripType === 'Tour' && validDestinations.length === 0) {
      setEstimatedKM(0);
      setEstimatedPrice(0);
      return;
    }

    const calculateDistance = () => {
      setIsCalculatingDistance(true);
      try {
        const calculateLegDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371; // Radius of the earth in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
          const straightLineDistance = R * c;
          return straightLineDistance * 1.3; // Add 30% for road curves
        };

        const seoniCoords = { lat: 22.0869, lng: 79.5433 };
        let totalDistance = 0;
        
        if (!fromLocationData) {
          setEstimatedKM(0);
          setEstimatedPrice(0);
          setIsCalculatingDistance(false);
          return;
        }

        let currentCoords = fromLocationData;

        let waypoints: LocationData[] = [];
        if (tripType === 'Tour') {
          waypoints = destinationData.filter((d): d is LocationData => d !== null);
          if (waypoints.length === 0) {
            setEstimatedKM(0);
            setEstimatedPrice(0);
            setIsCalculatingDistance(false);
            return;
          }
        } else {
          if (!toLocationData) {
            setEstimatedKM(0);
            setEstimatedPrice(0);
            setIsCalculatingDistance(false);
            return;
          }
          waypoints = [toLocationData];
        }

        let oneWayDistance = 0;
        for (const wp of waypoints) {
          const legDist = calculateLegDistance(currentCoords.lat, currentCoords.lng, wp.lat, wp.lng);
          oneWayDistance += legDist;
          currentCoords = wp;
        }

        // Always charge for going and coming back (Pickup to Drop * 2)
        totalDistance = oneWayDistance * 2;

        let perKmRate = 13;
        if (selectedVehicle === 'Swift Dzire') perKmRate = 13;
        else if (selectedVehicle === 'Ertiga') perKmRate = 14;
        else if (selectedVehicle.includes('Force Traveller') || selectedVehicle.includes('Force Van')) perKmRate = 28;

        const basePrice = totalDistance * perKmRate;
        let finalPrice = Math.ceil(basePrice / 100) * 100;

        if (tripType === 'Wedding') {
          finalPrice *= parseInt(vehiclesRequired) || 1;
        } else if (tripType === 'Tour') {
          finalPrice *= Number(numberOfCars) || 1;
        }

        setEstimatedKM(parseFloat(oneWayDistance.toFixed(2)));
        setEstimatedPrice(finalPrice);
      } catch (error) {
        logger.error('Failed to calculate distance:', error);
        setEstimatedKM(0);
        setEstimatedPrice(0);
      } finally {
        setIsCalculatingDistance(false);
      }
    };

    const timeoutId = setTimeout(calculateDistance, 500);
    return () => clearTimeout(timeoutId);
  }, [fromLocationData, toLocationData, destinationData, tripType, numberOfDays, numberOfCars, isAC, vehiclesRequired, selectedVehicle]);

  useEffect(() => {
    let recommended = '';
    if (numberOfPeople >= 1 && numberOfPeople <= 4) recommended = 'Swift Dzire';
    else if (numberOfPeople >= 5 && numberOfPeople <= 7) recommended = 'Ertiga';
    else if (numberOfPeople >= 8 && numberOfPeople <= 18) recommended = 'Force Traveller (18 Seater)';
    else if (numberOfPeople >= 19 && numberOfPeople <= 22) recommended = 'Force Traveller (22 Seater)';
    
    if (recommended) {
      setSelectedVehicle(recommended);
    }
    setConfirmCapacity(false);
  }, [numberOfPeople]);

  const fetchBookings = async (forceRefresh: boolean = false) => {
    try {
      if (user) {
        const data = await api.getBookings(user.id, false, forceRefresh);
        setBookings(data);
      }
    } catch (error: any) {
      if (error?.message === 'Failed to fetch') {
        console.warn('Network connection to server temporarily lost. Retrying later...');
      } else {
        logger.error('Failed to fetch bookings:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      if (user) {
        const data = await api.getUser(user.id);
        setProfileName(data.name);
        setProfileEmail(data.email);
        setProfilePhone(data.phone || '');
      }
    } catch (error: any) {
       if (error?.message === 'Failed to fetch') {
        console.warn('Network connection to server temporarily lost. Retrying later...');
      } else {
        logger.error('Failed to fetch profile:', error);
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const nameError = validateName(profileName);
    if (nameError) {
      setProfileError(nameError);
      return;
    }

    const emailError = validateEmail(profileEmail, true);
    if (emailError) {
      setProfileError(emailError);
      return;
    }

    const phoneError = validatePhone(profilePhone);
    if (phoneError) {
      setProfileError(phoneError);
      return;
    }

    setProfileLoading(true);

    try {
      if (!user) return;
      await api.updateUser(user.id, {
        name: profileName,
        email: profileEmail,
        phone: profilePhone
      });
      
      // Update the user context so the Navbar reflects the new name
      login({
        ...user,
        name: profileName,
        email: profileEmail,
        phone: profilePhone
      });
      
      setProfileSuccess('Profile updated successfully');
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const calculateHaltCharge = () => {
    if (tripType !== 'Round-trip' || !rideDate || !returnDate || !selectedVehicle) return 0;
    
    const start = parseRideDate(rideDate);
    const end = parseRideDate(returnDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - start.getTime();
    if (diffTime <= 0) return 0;
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let rate = 0;
    if (selectedVehicle === 'Swift Dzire') rate = 1000;
    else if (selectedVehicle === 'Ertiga') rate = 1500;
    else if (selectedVehicle.includes('Force Traveller') || selectedVehicle.includes('Force Van')) rate = 3000;
    
    return diffDays * rate;
  };

  const resetForm = () => {
    setBookingStep(1);
    setIsSheetExpanded(false);
    setTripType('One-way');
    setFromLocation('');
    setFromLocationData(null);
    setToLocation('');
    setToLocationData(null);
    setDestinations(['']);
    setDestinationData([null]);
    setRideDate('');
    setRideTimeHour('12');
    setRideTimeMinute('00');
    setRideTimeAmPm('AM');
    setRideType('Intercity');
    setReturnDate('');
    setReturnTimeHour('12');
    setReturnTimeMinute('00');
    setReturnTimeAmPm('AM');
    setNumberOfDays(1);
    setNumberOfCars(1);
    setEstimatedKM(0);
    setWeddingDate('');
    setEventLocation('');
    setVehiclesRequired('1');
    setNumberOfPeople(1);
    setSelectedVehicle('Swift Dzire');
    setCustomRequirements('');
    setDecorationRequired('No');
    setPickupType('Arrival');
    setAcceptedTerms(false);
  };

  const handleBookRide = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (bookingStep < 3) {
      setBookingStep(bookingStep + 1);
      return;
    }

    setBookingError('');
    setBookingLoading(true);

    if (tripType === 'Wedding') {
      if (!weddingDate || !eventLocation) {
        setBookingError('Please fill in all wedding details (date and location).');
        setBookingLoading(false);
        return;
      }
      const wDate = parseRideDate(weddingDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (wDate < now) {
        setBookingError('Wedding date cannot be in the past.');
        setBookingLoading(false);
        return;
      }
      const vehicles = parseInt(vehiclesRequired);
      if (isNaN(vehicles) || vehicles < 1 || vehicles > 10) {
        setBookingError('Number of vehicles must be between 1 and 10.');
        setBookingLoading(false);
        return;
      }
    } else if (tripType === 'Car Renting') {
      if (!rideDate) {
        setBookingError('Please fill in the date.');
        setBookingLoading(false);
        return;
      }
    } else {
      if (!fromLocation || (!toLocation && tripType !== 'Tour') || !rideDate) {
        setBookingError('Please fill in pickup, dropoff, and date.');
        setBookingLoading(false);
        return;
      }
      if (!fromLocationData || (!toLocationData && tripType !== 'Tour')) {
        setBookingError('Please select locations from the dropdown suggestions to calculate the fare.');
        setBookingLoading(false);
        return;
      }
      if (tripType === 'Round-trip' && !returnDate) {
        setBookingError('Please select a return date for round trip.');
        setBookingLoading(false);
        return;
      }
      if (tripType === 'Tour' && destinations.some(d => !d)) {
        setBookingError('Please fill in all destination cities.');
        setBookingLoading(false);
        return;
      }
      if (tripType === 'Tour' && destinationData.some(d => !d)) {
        setBookingError('Please select all destinations from the dropdown suggestions.');
        setBookingLoading(false);
        return;
      }
    }

    if (tripType === 'Car Renting') {
      const days = Number(numberOfDays) || 1;
      const cars = Number(numberOfCars) || 1;
      if (days < 1 || days > 30) {
        setBookingError('Number of days must be between 1 and 30.');
        setBookingLoading(false);
        return;
      }
      if (cars < 1 || cars > 10) {
        setBookingError('Number of vehicles must be between 1 and 10.');
        setBookingLoading(false);
        return;
      }
    }

    if (numberOfPeople < 1) {
      setBookingError('Number of people must be at least 1.');
      setBookingLoading(false);
      return;
    }

    try {
      if (!user) return;
      
      if (numberOfPeople > 22) {
        setBookingError('Please contact admin for custom arrangement.');
        setBookingLoading(false);
        return;
      }

      const vehicleObj = AVAILABLE_VEHICLES.find(v => v.name === selectedVehicle);
      if (vehicleObj) {
        if (vehicleObj.quantity <= 0) {
          setBookingError('The selected vehicle is currently unavailable.');
          setBookingLoading(false);
          return;
        }
        
        const requestedCars = tripType === 'Wedding' ? parseInt(vehiclesRequired) || 1 : (tripType === 'Tour' || tripType === 'Car Renting' ? Number(numberOfCars) || 1 : 1);
        if (requestedCars > vehicleObj.quantity) {
          setBookingError(`Only ${vehicleObj.quantity} ${vehicleObj.name}(s) available.`);
          setBookingLoading(false);
          return;
        }
      }
      
      if (vehicleObj && vehicleObj.capacity < numberOfPeople && !confirmCapacity && tripType !== 'Car Renting') {
        setBookingError('Please confirm that you want to proceed with a vehicle that may not accommodate all passengers.');
        setBookingLoading(false);
        return;
      }
      
      let finalEstimatedPrice = 0;
      const days = Number(numberOfDays) || 1;
      const cars = Number(numberOfCars) || 1;
      
      if (tripType === 'Car Renting') {
        finalEstimatedPrice = (days * 2000 * cars);
      } else {
        let perKmRate = 13;
        if (selectedVehicle === 'Swift Dzire') perKmRate = 13;
        else if (selectedVehicle === 'Ertiga') perKmRate = 14;
        else if (selectedVehicle.includes('Force Traveller') || selectedVehicle.includes('Force Van')) perKmRate = 28;

        let fallbackPrice = estimatedKM * perKmRate;
        if (tripType === 'Wedding') {
          fallbackPrice *= parseInt(vehiclesRequired) || 1;
        } else if (tripType === 'Tour') {
          fallbackPrice *= cars;
        }
        finalEstimatedPrice = estimatedPrice || fallbackPrice;
      }

      let formattedRideDate = '';
      if (tripType === 'Wedding') {
        formattedRideDate = weddingDate;
      } else {
        formattedRideDate = `${rideDate} ${rideTimeHour}:${rideTimeMinute} ${rideTimeAmPm}`;
      }
      
      if (rideDate && tripType !== 'Wedding') {
        const depDate = parseRideDate(formattedRideDate);
        const now = new Date();
        if (depDate < now) {
          setBookingError('Departure date and time cannot be in the past.');
          setBookingLoading(false);
          return;
        }
      }

      let formattedReturnDate = '';

      if (tripType === 'Round-trip') {
        if (!returnDate) {
          setBookingError('Return date is required for round-trip');
          setBookingLoading(false);
          return;
        }
        const depDate = parseRideDate(`${rideDate} ${rideTimeHour}:${rideTimeMinute} ${rideTimeAmPm}`);
        const retDate = parseRideDate(`${returnDate} ${returnTimeHour}:${returnTimeMinute} ${returnTimeAmPm}`);
        if (retDate.getTime() === depDate.getTime()) {
          setBookingError('Departure Time cannot be same as Return Time, choose different Time');
          setBookingLoading(false);
          return;
        } else if (retDate < depDate) {
          setBookingError('Return date must be later than departure date');
          setBookingLoading(false);
          return;
        }
        formattedReturnDate = `${returnDate} ${returnTimeHour}:${returnTimeMinute} ${returnTimeAmPm}`;
        
        // Add halt charge for round-trip
        const haltCharge = calculateHaltCharge();
        finalEstimatedPrice += haltCharge;
      }

      const validDestinations = destinations.filter(d => d.trim() !== '');
      
      const [newBooking] = await Promise.all([
        api.createBooking({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          fromLocation,
          toLocation: tripType === 'Tour' ? 'N/A' : toLocation,
          destinations: tripType === 'Tour' ? validDestinations.join(', ') : 'N/A',
          rideDate: formattedRideDate,
          tripType,
          returnDate: formattedReturnDate,
          rideType,
          numberOfPeople,
          fareAmount: finalEstimatedPrice,
          numberOfDays: tripType === 'Car Renting' ? days : 'N/A',
          numberOfCars: tripType === 'Car Renting' ? cars : (tripType === 'Tour' ? cars : 'N/A'),
          estimatedKM: tripType !== 'Car Renting' ? estimatedKM : 'N/A',
          suggestedVehicle: selectedVehicle,
          isAC,
          weddingDetails: tripType === 'Wedding' ? { weddingDate, eventLocation, vehiclesRequired, decorationRequired } : undefined,
          airportDetails: rideType === 'Airport Transfer' ? { pickupType } : undefined,
          customRequirements: rideType === 'Other' ? customRequirements : undefined
        }),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);

      setFromLocation('');
      setFromLocationData(null);
      setToLocation('');
      setToLocationData(null);
      setRideDate('');
      setRideTimeHour('12');
      setRideTimeMinute('00');
      setRideTimeAmPm('AM');
      setRideType('Intercity');
      setNumberOfPeople(1);
      
      // Reset new fields
      setTripType('One-way');
      setReturnDate('');
      setReturnTimeHour('12');
      setReturnTimeMinute('00');
      setReturnTimeAmPm('AM');
      setDestinations(['']);
      setDestinationData([null]);
      setNumberOfDays(1);
      setNumberOfCars(1);
      setEstimatedKM(0);
      setWeddingDate('');
      setEventLocation('');
      setVehiclesRequired('1');
      setDecorationRequired('No');
      setPickupType('Arrival');
      setCustomRequirements('');
      setAcceptedTerms(false);
      
      setBookingSuccessData(newBooking);
      
      // Refresh bookings
      fetchBookings();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book ride');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleRebookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rebookModal.booking || !rebookDate) return;

    setRebookLoading(true);
    setRebookError('');

    try {
      const b = rebookModal.booking;
      const rideDate = parseRideDate(`${rebookDate} ${rebookTimeHour}:${rebookTimeMinute} ${rebookTimeAmPm}`);
      
      const now = new Date();
      if (rideDate < now) {
        setRebookError('New date and time cannot be in the past.');
        setRebookLoading(false);
        return;
      }

      const newBooking = {
        userId: user?.id,
        userName: user?.name,
        userEmail: user?.email,
        userPhone: user?.phone,
        tripType: b.tripType,
        fromLocation: b.fromLocation,
        toLocation: b.toLocation,
        destinations: b.destinations,
        rideDate: rideDate.toISOString(),
        numberOfPeople: b.numberOfPeople,
        suggestedVehicle: b.suggestedVehicle,
        isAC: b.isAC,
        distance: b.distance,
        fareAmount: b.fareAmount,
        rideStatus: 'Pending',
        paymentStatus: 'Pending',
      };

      const response = await api.createBooking(newBooking);
      setBookingSuccessData(response);
      setRebookModal({ isOpen: false, booking: null });
      setRebookDate('');
      setRebookTimeHour('12');
      setRebookTimeMinute('00');
      setRebookTimeAmPm('AM');
      setActiveTab('dashboard'); // Switch to dashboard to show success message
    } catch (error) {
      logger.error('Failed to rebook:', error);
      setRebookError('Failed to rebook ride. Please try again.');
    } finally {
      setRebookLoading(false);
    }
  };

  const handleCancel = async (id: string, refundInfo: any) => {
    setCancelMessage(null);
    
    // 1. Optimistic UI Update: Save previous state in case we need to revert
    const previousBookings = [...bookings];
    
    const payload: any = { rideStatus: "Cancelled" };
    payload.refundStatus = "No Refund";
    
    if (refundInfo && refundInfo.refundAmount > 0) {
      payload.refundAmount = refundInfo.refundAmount;
    } else {
      payload.refundAmount = 0;
    }

    // Instantly update the UI
    setBookings(prevBookings => prevBookings.map(b => {
      if (b.id === id) {
        return { ...b, rideStatus: "Cancelled", refundStatus: payload.refundStatus, refundAmount: payload.refundAmount };
      }
      return b;
    }));

    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
          // Revert Optimistic Update
          setBookings(previousBookings);
          setCancelMessage({ id, text: data.message || data.error || "Failed to cancel ride", type: 'error' });
          return;
        }
      } else {
        const text = await response.text();
        if (!response.ok) {
          logger.error("Non-JSON error response:", text);
          // Revert Optimistic Update
          setBookings(previousBookings);
          setCancelMessage({ id, text: "Failed to cancel ride. Server returned an invalid response.", type: 'error' });
          return;
        }
      }

      setCancelMessage({ id, text: "Ride cancelled successfully", type: 'success' });
      
      // Automatically update to Pending after 10 seconds if refund is applicable
      if (refundInfo && refundInfo.refundAmount > 0) {
        setTimeout(async () => {
          // Optimistic UI for the Pending update
          setBookings(prevBookings => prevBookings.map(b => {
            if (b.id === id) {
              return { ...b, refundStatus: "Pending" };
            }
            return b;
          }));
          
          try {
            await fetch(`/api/bookings/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refundStatus: "Pending" })
            });
          } catch (err) {
            logger.error("Failed to automatically update refund status to Pending:", err);
            // We could revert here, but it's a background task, so we'll just fetch fresh data later
          }
        }, 10000);
      }

      setTimeout(() => {
        setCancelMessage(null);
      }, 3000);
    } catch (error) {
      logger.error("Error cancelling ride:", error);
      // Revert Optimistic Update
      setBookings(previousBookings);
      setCancelMessage({ id, text: "An error occurred while cancelling the ride. Please try again.", type: 'error' });
    }
  };

  const canCancelRide = (rideDateStr: string, status: string) => {
    if (status === 'Cancelled' || status === 'Completed' || status === 'Ongoing') return false;
    
    let rideDate = parseRideDate(rideDateStr);

    if (isNaN(rideDate.getTime())) return false;
    
    const now = new Date();
    const diffInMs = rideDate.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours > 2;
  };

  const getStatusColor = (status: string, refundStatus?: string) => {
    if (status === 'Cancelled' && refundStatus === 'Processed') {
      return 'bg-purple-50 text-purple-600 border border-purple-100';
    }
    switch (status) {
      case 'Pending': return 'bg-yellow-50 text-yellow-600 border border-yellow-100';
      case 'Confirmed': return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
      case 'Assigned': return 'bg-purple-50 text-purple-600 border border-purple-100';
      case 'Ongoing': return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'Completed': return 'bg-green-50 text-green-600 border border-green-100';
      case 'Cancelled': return 'bg-red-50 text-red-600 border border-red-100';
      default: return 'bg-gray-50 text-gray-600 border border-gray-100';
    }
  };

  const getPaymentColor = (status: string) => {
    return status === 'Paid' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = profileName ? profileName.split(' ')[0] : 'Guest';
    if (hour < 12) return { greeting: `Good morning, ${firstName}.`, sub: `Traffic is light today.`, gradient: 'from-orange-500/10 via-rose-500/5 to-transparent' };
    if (hour < 18) return { greeting: `Good afternoon, ${firstName}.`, sub: `Ready for your next journey?`, gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent' };
    return { greeting: `Good evening, ${firstName}.`, sub: `Need a safe ride home?`, gradient: 'from-indigo-500/10 via-purple-500/5 to-transparent' };
  };

  const greetingData = getGreeting();

  const handleInputFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (window.innerWidth > 640) return; // Only process on mobile screens

    // Allow keyboard to fully slide up before calculating viewport bounds
    setTimeout(() => {
      const container = document.getElementById('bottom-sheet-container');
      const target = e.target as HTMLElement;
      if (!container || !target) return;
      
      const targetRect = target.getBoundingClientRect();
      // visualViewport accurately reflects the screen height AFTER the software keyboard appears
      const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      
      // Maintain a comfortable, small 60px gap between the keyboard and the input field
      // (This reduces the "flying up" behavior significantly while preventing keyboard overlap)
      const paddingAboveKeyboard = 60; 
      
      // Only scroll if the input is actively hidden behind the keyboard, or too close to it
      if (targetRect.bottom > (viewportHeight - paddingAboveKeyboard)) {
        // Calculate exactly how many pixels to scroll down
        const amountToScroll = targetRect.bottom - (viewportHeight - paddingAboveKeyboard);
        
        container.scrollBy({
          top: amountToScroll,
          behavior: 'smooth'
        });
      }
    }, 300); // 300ms matches standard iOS/Android keyboard slide-up animations
  };

  const isNextDisabled = useMemo(() => {
    if (bookingStep !== 1) return false;
    
    // Number of people must be a positive integer
    if (!numberOfPeople || Number(numberOfPeople) < 1 || !Number.isInteger(Number(numberOfPeople))) return true;

    if (tripType === 'Car Renting') {
      return !rideDate || !numberOfDays || !numberOfCars;
    } else if (tripType === 'Wedding') {
      return !weddingDate || !eventLocation || !vehiclesRequired;
    } else if (tripType === 'Tour') {
      if (!fromLocationData) return true;
      if (destinationData.length === 0 || destinationData.some(d => d === null)) return true;
      
      // Check for duplicate locations in tour
      const allLocations = [fromLocationData.displayName, ...destinationData.map(d => d?.displayName)];
      const uniqueLocations = new Set(allLocations);
      if (uniqueLocations.size !== allLocations.length) return true;

      if (!rideDate) return true;
      return false;
    } else {
      // One-way or Round-trip
      if (!fromLocationData || !toLocationData) return true;
      if (fromLocationData.displayName === toLocationData.displayName) return true;
      if (!rideDate) return true;
      if (tripType === 'Round-trip' && !returnDate) return true;
      return false;
    }
  }, [bookingStep, tripType, fromLocationData, toLocationData, destinationData, rideDate, returnDate, numberOfDays, numberOfCars, weddingDate, eventLocation, vehiclesRequired, numberOfPeople]);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, filter: 'blur(10px)' }}
        className={`h-[100dvh] w-full overflow-hidden transition-colors duration-500 bg-[#F5F5F7] dark:bg-[#060608] text-gray-900 overscroll-none`}
      >
      {/* Dynamic Background Mesh (Viktor Oddy Dark Style) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#F5F5F7] dark:bg-[#060608] transition-colors duration-500">
        <div className={`absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 opacity-60 mix-blend-screen`}></div>
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob"></div>
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob animation-delay-4000"></div>
        
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      {/* Map Component as Background */}
      <div className={`fixed inset-0 z-0 w-full h-full pt-16 transition-opacity duration-1000 mix-blend-multiply dark:mix-blend-normal ${
        activeTab === 'dashboard' && bookingStep === 1 
          ? 'opacity-0 sm:opacity-100 pointer-events-none sm:pointer-events-auto' 
          : 'opacity-100 dark:opacity-100'
      }`}>
        <InteractiveMap 
          fromLocation={fromLocationData || (showFromSuggestions && fromSuggestions.length > 0 ? fromSuggestions[0] : null)} 
          toLocation={toLocationData || (showToSuggestions && toSuggestions.length > 0 ? toSuggestions[0] : null)} 
          destinations={destinationData.map((d, i) => d || (activeDestinationIndex === i && destinationSuggestions[i] && destinationSuggestions[i].length > 0 ? destinationSuggestions[i][0] : null))} 
          isSheetExpanded={isSheetExpanded}
        />
      </div>

      <div className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-gray-200 shadow-sm transition-colors duration-500">
        <Navbar />
      </div>

      {/* Bottom Sheet Container */}
      <motion.div 
        initial={false}
        drag={activeTab === 'dashboard' && bookingStep > 1 ? "y" : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.y < -50) setIsSheetExpanded(true);
          if (info.offset.y > 50) setIsSheetExpanded(false);
        }}
        animate={{ 
          height: activeTab === 'dashboard' && bookingStep > 1 
            ? (isSheetExpanded ? '90dvh' : '50dvh') 
            : 'calc(100dvh - 64px)' 
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.8 }}
        className={`fixed bottom-0 sm:bottom-6 left-0 right-0 mx-auto w-full sm:w-[calc(100%-3rem)] max-w-5xl z-40 bg-white dark:bg-[#060608] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-2xl sm:border border-gray-200 dark:border-[#ffffff]/10 flex flex-col transition-colors duration-500 ${
          activeTab === 'dashboard' && bookingStep > 1 ? 'rounded-t-[2.5rem] sm:rounded-[2.5rem]' : 'rounded-none sm:rounded-[2.5rem]'
        }`}
      >
        <AnimatePresence>
          {bookingLoading && <ConciergeLoading />}
        </AnimatePresence>
        
        {/* Filler for overscroll to prevent map from peeking through without ruining rounded corners */}
        <div className="absolute top-full left-0 w-full h-[100dvh] bg-[#F5F5F7] dark:bg-[#0F0F13] pointer-events-none sm:hidden transition-colors duration-500" />

        <div className="flex-1 overflow-y-auto pb-24 overscroll-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" id="bottom-sheet-container">
          <div className={`sticky top-0 z-40 bg-white dark:bg-[#060608] pb-2 transition-colors duration-500 ${
            activeTab === 'dashboard' && bookingStep > 1 ? 'rounded-t-[2.5rem] sm:rounded-[2.5rem]' : ''
          }`}>
          {/* Drag Handle */}
          {activeTab === 'dashboard' && bookingStep > 1 && (
            <div 
              className="w-full py-4 cursor-grab active:cursor-grabbing flex justify-center touch-none"
              onPointerDown={(e) => dragControls.start(e)}
              onClick={() => setIsSheetExpanded(!isSheetExpanded)}
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full pointer-events-none"></div>
            </div>
          )}

          <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${activeTab === 'dashboard' && bookingStep > 1 ? '' : 'pt-6'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-bold capitalize text-gray-900 tracking-tight break-words transition-colors duration-500`}>
                    {greetingData.greeting}
                  </h1>
                  <p className={`text-sm mt-1 text-gray-600 tracking-wide transition-colors duration-500`}>
                    {greetingData.sub}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4 w-full sm:w-auto">
                <div className="flex p-1 bg-gray-100 dark:bg-[#ffffff]/10 border border-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-lg w-full sm:w-auto relative transition-colors duration-500" role="tablist" aria-label="Dashboard Options">
                  {[{ id: 'dashboard', label: 'Dashboard' }, { id: 'bookings', label: 'My Bookings' }].map((tab) => {
                    const isSelected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => setActiveTab(tab.id as 'dashboard' | 'bookings')}
                        className={`relative flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors z-10 ${
                          isSelected ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-900/80'
                        }`}
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="customerTabs"
                            className="absolute inset-0 bg-white dark:bg-[#ffffff]/5 shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)] border border-gray-200 rounded-md z-[-1] transition-colors duration-500"
                            initial={false}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 30,
                              mass: 0.8
                            }}
                          />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6`}>
          <div className="py-2 sm:px-0">
          
          {activeTab === 'profile' ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <LoyaltyCard bookingsCount={bookings.filter(b => b.rideStatus === 'Completed').length}  />
              <div className="relative overflow-hidden bg-white/50 dark:bg-[#ffffff]/5 rounded-3xl p-6 border border-gray-200 dark:border-[#ffffff]/10 shadow-sm backdrop-blur-xl">
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isEditingProfile ? 'mb-6 pb-6 border-b border-gray-200 dark:border-[#ffffff]/10' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-[0_4px_15px_rgba(99,102,241,0.5)] bg-gradient-to-br from-indigo-500 to-indigo-700 ring-2 ring-white dark:ring-[#060608]`}>
                      {profileName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold text-gray-900 tracking-tight`}>{profileName}</h3>
                      <p className={`text-xs text-gray-900/50 tracking-wider uppercase font-semibold mt-0.5`}>Customer</p>
                    </div>
                  </div>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className={`text-xs font-semibold uppercase tracking-wider px-5 py-2 rounded-lg transition-all text-gray-900 border border-gray-200 border-opacity-50 bg-white/50 hover:bg-white/80 shadow-sm transform active:scale-95 w-full sm:w-auto mt-2 sm:mt-0`}
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
                
                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="profileName" className="block text-[10px] font-bold mb-1.5 text-gray-900/50 tracking-wider uppercase">Name</label>
                        <input
                          type="text"
                          id="profileName"
                          required
                          value={profileName}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[a-zA-Z\s]*$/.test(val)) {
                              setProfileName(val);
                            }
                          }}
                          onFocus={handleInputFocus}
                          className="block w-full border border-gray-200 border-opacity-50 bg-white dark:bg-[#ffffff]/5 text-gray-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 sm:text-sm transition-all"
                        />
                      </div>
                      <div>
                        <label htmlFor="profilePhone" className="block text-[10px] font-bold mb-1.5 text-gray-900/50 tracking-wider uppercase">Phone</label>
                        <input
                          type="tel"
                          id="profilePhone"
                          value={profilePhone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 10) {
                              setProfilePhone(val);
                            }
                          }}
                          onFocus={handleInputFocus}
                          className="block w-full border border-gray-200 border-opacity-50 bg-white dark:bg-[#ffffff]/5 text-gray-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 sm:text-sm transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="profileEmail" className="block text-[10px] font-bold mb-1.5 text-gray-900/50 tracking-wider uppercase">Email</label>
                      <input
                        type="email"
                        id="profileEmail"
                        required
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        onFocus={handleInputFocus}
                        className="block w-full border border-gray-200 border-opacity-50 bg-white dark:bg-[#ffffff]/5 text-gray-900 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 sm:text-sm transition-all text-gray-900/50 cursor-not-allowed"
                        disabled
                      />
                    </div>
                    <div className="flex space-x-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="flex-1 py-2 px-4 border border-gray-200 border-opacity-50 rounded-lg shadow-sm text-sm font-medium text-gray-900/80 bg-white/50 hover:bg-white transition-all transform active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="flex-1 py-2 px-4 border border-indigo-400/30 rounded-lg shadow-[0_4px_15px_rgba(99,102,241,0.3)] text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none transform active:scale-95 transition-all disabled:opacity-50"
                      >
                        {profileLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 mt-6">
                    <div>
                      <p className="text-[10px] font-bold text-gray-900/50 tracking-wider uppercase mb-1">Email</p>
                      <p className="text-sm text-gray-900 font-medium">{profileEmail}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-900/50 tracking-wider uppercase mb-1">Phone</p>
                      <p className="text-sm text-gray-900 font-medium">{profilePhone || 'Not provided'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'dashboard' ? (
            <div className="flex flex-col gap-8">
                
                {/* Book a Ride Form */}
                <div className="relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <h3 className={`text-xl font-bold text-gray-900 tracking-tight`}>Book a Ride</h3>
                  
                  {/* Stepper Indicator */}
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          bookingStep === step 
                            ? ('bg-indigo-500 text-white dark:text-[#ffffff] shadow-[0_0_15px_rgba(99,102,241,0.5)]')
                            : bookingStep > step 
                              ? ('bg-white/10 text-indigo-400')
                              : ('bg-white/5 text-gray-500')
                        }`}>
                          {bookingStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                        </div>
                        {step < 3 && (
                          <div className={`w-8 h-1 mx-1 rounded-full ${
                            bookingStep > step 
                              ? ('bg-indigo-500/50')
                              : ('bg-white/5')
                          }`}></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.form 
                      id="booking-form"
                      key={`form-step-${bookingStep}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      onSubmit={handleBookRide} 
                      className="space-y-6"
                    >
                      
                      {bookingStep === 1 && (
                        <>
                          <div className="flex flex-wrap gap-2 mb-6 p-1 bg-white/5 rounded-2xl w-fit">
                            {['One-way', 'Round-trip', 'Tour', 'Car Renting', 'Wedding'].map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setTripType(type)}
                                className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors z-10 ${
                                  tripType === type 
                                    ? ('text-gray-900') 
                                    : ('text-gray-900/50 hover:text-gray-900/80')
                                }`}
                              >
                                {tripType === type && (
                                  <motion.div
                                    layoutId="tripType"
                                    className="absolute inset-0 bg-indigo-500 rounded-xl z-[-1] shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                  />
                                )}
                                <span className="relative z-10">{type}</span>
                              </button>
                            ))}
                          </div>

                      {tripType !== 'Car Renting' && (
                        <div className="relative flex flex-col sm:flex-row gap-4">
                          <div className="relative flex-1">
                            <label htmlFor="fromLocation" className={`block text-xs font-semibold mb-1.5 text-gray-900/50 tracking-wider uppercase`}>Pick-up Location</label>
                            <input
                              type="text"
                              id="fromLocation"
                              required={tripType !== 'Car Renting'}
                              value={fromLocation}
                              onChange={(e) => {
                                setFromLocation(e.target.value);
                                setFromLocationData(null);
                                setShowFromSuggestions(true);
                              }}
                              onFocus={(e) => {
                                setShowFromSuggestions(true);
                                handleInputFocus(e);
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  if (!fromLocationData && fromSuggestions.length > 0 && fromLocation.length > 0) {
                                    setFromLocation(fromSuggestions[0].displayName);
                                    setFromLocationData(fromSuggestions[0]);
                                  }
                                  setShowFromSuggestions(false);
                                }, 200);
                              }}
                              className={`mt-1 block w-full bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 pl-4 ${tripType !== 'Tour' ? 'pr-12' : 'pr-4'} sm:pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm`}
                              placeholder="Source City"
                              autoComplete="off"
                            />
                            {showFromSuggestions && fromSuggestions.length > 0 && (
                              <ul className="absolute z-50 mt-2 w-full bg-gray-50/95 backdrop-blur-xl border border-gray-200 border-opacity-50 shadow-2xl max-h-60 rounded-xl py-2 text-base overflow-auto focus:outline-none sm:text-sm">
                                {fromSuggestions.map((loc, idx) => (
                                  <li
                                    key={idx}
                                    className="text-gray-900/80 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-white/10 transition-colors"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setFromLocation(loc.displayName);
                                      setFromLocationData(loc);
                                      setShowFromSuggestions(false);
                                    }}
                                  >
                                    <div className="flex items-center">
                                      <MapPin className="h-4 w-4 text-indigo-400 mr-2 flex-shrink-0" />
                                      <div className="flex flex-col">
                                        <span className="font-medium truncate text-gray-900">{loc.primaryText || loc.displayName}</span>
                                        {loc.secondaryText && (
                                          <span className="text-xs text-gray-900/40 truncate">{loc.secondaryText}</span>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          
                          {tripType !== 'Tour' && (
                            <>
                              <div className="relative z-10 flex items-center justify-end sm:justify-center pointer-events-none -my-5 sm:my-0 sm:mt-[26px] pr-4 sm:pr-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const tempLoc = fromLocation;
                                    const tempData = fromLocationData;
                                    setFromLocation(toLocation);
                                    setFromLocationData(toLocationData);
                                    setToLocation(tempLoc);
                                    setToLocationData(tempData);
                                  }}
                                  className="pointer-events-auto bg-white dark:bg-[#1a1a24] text-gray-900 p-2 rounded-full hover:bg-gray-50 dark:hover:bg-[#ffffff]/10 transition-colors shadow-md border border-gray-200 dark:border-[#ffffff]/10 flex items-center justify-center transform active:scale-95 sm:mx-0 sm:self-center"
                                  title="Swap locations"
                                >
                                  <ArrowUpDown className="h-4 w-4 rotate-0 sm:rotate-90 transition-transform duration-300" />
                                </button>
                              </div>
                              <div className="relative flex-1">
                                <label htmlFor="toLocation" className="block text-xs font-semibold mb-1.5 text-gray-900/50 tracking-wider uppercase">Drop-off Location</label>
                                <input
                                  type="text"
                                  id="toLocation"
                                  required={tripType !== 'Tour' && tripType !== 'Car Renting'}
                                  value={toLocation}
                                  onChange={(e) => {
                                    setToLocation(e.target.value);
                                    setToLocationData(null);
                                    setShowToSuggestions(true);
                                  }}
                                  onFocus={(e) => {
                                    setShowToSuggestions(true);
                                    handleInputFocus(e);
                                  }}
                                  onBlur={() => {
                                    setTimeout(() => {
                                      if (!toLocationData && toSuggestions.length > 0 && toLocation.length > 0) {
                                        setToLocation(toSuggestions[0].displayName);
                                        setToLocationData(toSuggestions[0]);
                                      }
                                      setShowToSuggestions(false);
                                    }, 200);
                                  }}
                                  className="mt-1 block w-full bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 pl-4 pr-12 sm:pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm"
                                  placeholder="Destination City"
                                  autoComplete="off"
                                />
                                {showToSuggestions && toSuggestions.length > 0 && (
                                  <ul className="absolute z-50 mt-2 w-full bg-gray-50/95 backdrop-blur-xl border border-gray-200 border-opacity-50 shadow-2xl max-h-60 rounded-xl py-2 text-base overflow-auto focus:outline-none sm:text-sm">
                                    {toSuggestions.map((loc, idx) => (
                                      <li
                                        key={idx}
                                        className="text-gray-900/80 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-white/10 transition-colors"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setToLocation(loc.displayName);
                                          setToLocationData(loc);
                                          setShowToSuggestions(false);
                                        }}
                                      >
                                        <div className="flex items-center">
                                          <MapPin className="h-4 w-4 text-indigo-400 mr-2 flex-shrink-0" />
                                          <div className="flex flex-col">
                                            <span className="font-medium truncate text-gray-900">{loc.primaryText || loc.displayName}</span>
                                            {loc.secondaryText && (
                                              <span className="text-xs text-gray-900/40 truncate">{loc.secondaryText}</span>
                                            )}
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              {fromLocationData && toLocationData && fromLocationData.displayName === toLocationData.displayName && (
                                <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                                  <Info className="w-4 h-4" /> Pickup and drop-off locations cannot be the same.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}

                  <AnimatePresence>
                    {tripType === 'Tour' && (
                      <motion.div
                        key="tour-destinations"
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        {destinations.map((dest, index) => (
                          <div key={index} className="flex flex-col gap-1">
                            <div className="flex gap-2 items-end">
                              <div className="flex-grow relative">
                                <label className="block text-xs font-semibold mb-2 text-gray-900/50 tracking-wider uppercase">Destination {index + 1}</label>
                                <input
                                type="text"
                                required
                                value={dest}
                                onChange={(e) => {
                                  const newDests = [...destinations];
                                  newDests[index] = e.target.value;
                                  setDestinations(newDests);
                                  
                                  const newData = [...destinationData];
                                  newData[index] = null;
                                  setDestinationData(newData);
                                  
                                  setActiveDestinationIndex(index);
                                }}
                                onFocus={(e) => {
                                  setActiveDestinationIndex(index);
                                  handleInputFocus(e);
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    if (!destinationData[index] && destinationSuggestions[index] && destinationSuggestions[index].length > 0 && destinations[index].length > 0) {
                                      const newDestinations = [...destinations];
                                      newDestinations[index] = destinationSuggestions[index][0].displayName;
                                      setDestinations(newDestinations);
                                      
                                      const newData = [...destinationData];
                                      newData[index] = destinationSuggestions[index][0];
                                      setDestinationData(newData);
                                    }
                                    setActiveDestinationIndex(null);
                                  }, 200);
                                }}
                                className="mt-1 block w-full bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm"
                                placeholder={`Destination ${index + 1}`}
                                autoComplete="off"
                              />
                              {activeDestinationIndex === index && destinationSuggestions[index] && destinationSuggestions[index].length > 0 && (
                                <ul className="absolute z-50 mt-2 w-full bg-gray-50/95 backdrop-blur-xl border border-gray-200 border-opacity-50 shadow-2xl max-h-60 rounded-xl py-2 text-base overflow-auto focus:outline-none sm:text-sm">
                                  {destinationSuggestions[index].map((loc, idx) => (
                                    <li
                                      key={idx}
                                      className="text-gray-900/80 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-white/10 transition-colors"
                                      onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent input from losing focus immediately
                                        const newDests = [...destinations];
                                        newDests[index] = loc.displayName;
                                        setDestinations(newDests);
                                        
                                        const newData = [...destinationData];
                                        newData[index] = loc;
                                        setDestinationData(newData);
                                        
                                        setActiveDestinationIndex(null);
                                      }}
                                    >
                                      <div className="flex items-center">
                                        <MapPin className="h-4 w-4 text-indigo-400 mr-2 flex-shrink-0" />
                                        <div className="flex flex-col">
                                          <span className="font-medium truncate text-gray-900">{loc.primaryText || loc.displayName}</span>
                                          {loc.secondaryText && (
                                            <span className="text-xs text-gray-900/40 truncate">{loc.secondaryText}</span>
                                          )}
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDestinations(destinations.filter((_, i) => i !== index));
                                  setDestinationData(destinationData.filter((_, i) => i !== index));
                                  const newSuggestions: { [key: number]: LocationData[] } = {};
                                  Object.keys(destinationSuggestions).forEach((key) => {
                                    const k = parseInt(key);
                                    if (k < index) {
                                      newSuggestions[k] = destinationSuggestions[k];
                                    } else if (k > index) {
                                      newSuggestions[k - 1] = destinationSuggestions[k];
                                    }
                                  });
                                  setDestinationSuggestions(newSuggestions);
                                }}
                                className="mb-1 px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/20 text-sm font-medium transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                        <button
                          type="button"
                          onClick={() => {
                            setDestinations([...destinations, '']);
                            setDestinationData([...destinationData, null]);
                          }}
                          className="mt-2 text-sm text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
                        >
                          + Add another destination
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="pt-2">
                    <label htmlFor="rideDate" className="block text-xs font-semibold mb-2 text-gray-900/50 tracking-wider uppercase">
                      {tripType === 'Car Renting' ? 'When do you want the vehicle? (Date & Time)' : tripType === 'Round-trip' ? 'Departure Date & Time' : 'Date & Time'}
                    </label>
                    <div className="mt-1 flex flex-wrap gap-3">
                      <input
                        type="date"
                        id="rideDate"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={rideDate}
                        onChange={(e) => setRideDate(e.target.value)}
                        onFocus={handleInputFocus}
                        className="block w-full sm:flex-1 min-w-[150px] bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm [color-scheme:dark]"
                      />
                      <div className="flex gap-2 items-center flex-1 min-w-[240px]">
                        <select
                          value={rideTimeHour}
                          onChange={(e) => setRideTimeHour(e.target.value)}
                          className="block w-full flex-1 bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm appearance-none text-center"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <option key={h} value={h.toString().padStart(2, '0')} className="bg-white text-gray-900">{h.toString().padStart(2, '0')}</option>
                          ))}
                        </select>
                        <span className="flex items-center text-gray-900/30 font-bold">:</span>
                        <select
                          value={rideTimeMinute}
                          onChange={(e) => setRideTimeMinute(e.target.value)}
                          className="block w-full flex-1 bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm appearance-none text-center"
                        >
                          {['00', '15', '30', '45'].map(m => (
                            <option key={m} value={m} className="bg-white text-gray-900">{m}</option>
                          ))}
                        </select>
                        <select
                          value={rideTimeAmPm}
                          onChange={(e) => setRideTimeAmPm(e.target.value)}
                          className="block w-full flex-1 bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm appearance-none text-center"
                        >
                          <option value="AM" className="bg-white text-gray-900">AM</option>
                          <option value="PM" className="bg-white text-gray-900">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {tripType === 'Round-trip' && (
                      <motion.div
                        key="round-trip-return"
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="overflow-hidden"
                      >
                        <label htmlFor="returnDate" className="block text-xs font-semibold mt-4 mb-2 text-gray-900/50 tracking-wider uppercase">Return Date & Time</label>
                        <div className="mt-1 flex flex-wrap gap-3">
                          <input
                            type="date"
                            id="returnDate"
                            required={tripType === 'Round-trip'}
                            min={rideDate || new Date().toISOString().split('T')[0]}
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            onFocus={handleInputFocus}
                            className="block w-full sm:flex-1 min-w-[150px] bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm [color-scheme:dark]"
                          />
                          <div className="flex gap-2 items-center flex-1 min-w-[240px]">
                            <select
                              value={returnTimeHour}
                              onChange={(e) => setReturnTimeHour(e.target.value)}
                              className="block w-full flex-1 bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm appearance-none text-center"
                            >
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                <option key={h} value={h.toString().padStart(2, '0')} className="bg-white text-gray-900">{h.toString().padStart(2, '0')}</option>
                              ))}
                            </select>
                            <span className="flex items-center font-bold text-gray-900/30">:</span>
                            <select
                              value={returnTimeMinute}
                              onChange={(e) => setReturnTimeMinute(e.target.value)}
                              className="block w-full flex-1 bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm appearance-none text-center"
                            >
                              {['00', '15', '30', '45'].map(m => (
                                <option key={m} value={m} className="bg-white text-gray-900">{m}</option>
                              ))}
                            </select>
                            <select
                              value={returnTimeAmPm}
                              onChange={(e) => setReturnTimeAmPm(e.target.value)}
                              className="block w-full flex-1 bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm appearance-none text-center"
                            >
                              <option value="AM" className="bg-white text-gray-900">AM</option>
                              <option value="PM" className="bg-white text-gray-900">PM</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {tripType === 'Car Renting' && (
                      <motion.div
                        key="car-renting-fields"
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="space-y-4 overflow-hidden mt-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="numberOfDays" className="block text-xs font-semibold mb-2 text-gray-900/50 tracking-wider uppercase">Number of Days</label>
                            <input
                              type="number"
                              id="numberOfDays"
                              required={tripType === 'Car Renting'}
                              min="1"
                              max="30"
                              value={numberOfDays}
                              onChange={(e) => setNumberOfDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                              onFocus={handleInputFocus}
                              className="mt-1 block w-full bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm"
                            />
                          </div>
                          <div>
                            <label htmlFor="numberOfCars" className="block text-xs font-semibold mb-2 text-gray-900/50 tracking-wider uppercase">Number of Vehicles</label>
                            <input
                              type="number"
                              id="numberOfCars"
                              required={tripType === 'Car Renting'}
                              min="1"
                              max={AVAILABLE_VEHICLES.find(v => v.name === selectedVehicle)?.quantity || 10}
                              value={numberOfCars}
                              onChange={(e) => setNumberOfCars(e.target.value === '' ? '' : parseInt(e.target.value))}
                              onFocus={handleInputFocus}
                              className="mt-1 block w-full bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}


                    {tripType === 'Wedding' && (
                      <motion.div
                        key="wedding-fields"
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="space-y-4 overflow-hidden mt-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="weddingDate" className="block text-xs font-semibold mb-2 text-gray-900/50 tracking-wider uppercase">Wedding Date</label>
                            <input
                              type="date"
                              id="weddingDate"
                              required={tripType === 'Wedding'}
                              min={new Date().toISOString().split('T')[0]}
                              value={weddingDate}
                              onChange={(e) => setWeddingDate(e.target.value)}
                              onFocus={handleInputFocus}
                              className="mt-1 block w-full bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm [color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label htmlFor="eventLocation" className="block text-xs font-semibold mb-2 text-gray-900/50 tracking-wider uppercase">Event Location</label>
                            <input
                              type="text"
                              id="eventLocation"
                              required={tripType === 'Wedding'}
                              value={eventLocation}
                              onChange={(e) => setEventLocation(e.target.value)}
                              onFocus={handleInputFocus}
                              placeholder="e.g., Grand Hotel, City Center"
                              className="mt-1 block w-full bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="vehiclesRequired" className="block text-xs font-semibold mb-2 text-gray-900/50 tracking-wider uppercase">Vehicles Required</label>
                            <input
                              type="number"
                              id="vehiclesRequired"
                              required={tripType === 'Wedding'}
                              min="1"
                              max="10"
                              value={vehiclesRequired}
                              onChange={(e) => setVehiclesRequired(e.target.value)}
                              onFocus={handleInputFocus}
                              className="mt-1 block w-full bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm"
                            />
                          </div>
                          <div>
                            <label htmlFor="decorationRequired" className="block text-xs font-semibold mb-2 text-gray-900/50 tracking-wider uppercase">Decoration Required?</label>
                            <select
                              id="decorationRequired"
                              value={decorationRequired}
                              onChange={(e) => setDecorationRequired(e.target.value)}
                              className="mt-1 block w-full bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm appearance-none"
                            >
                              <option value="No" className="bg-white text-gray-900">No</option>
                              <option value="Yes" className="bg-white text-gray-900">Yes</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                  
                  {tripType !== 'Car Renting' && tripType !== 'Wedding' && (
                    <div className="pt-2">
                      <label htmlFor="rideType" className="block text-xs font-semibold mb-2 text-gray-900/50 tracking-wider uppercase">Ride Type</label>
                      <select
                        id="rideType"
                        required
                        value={rideType}
                        onChange={(e) => setRideType(e.target.value)}
                        onFocus={handleInputFocus}
                        className="mt-1 block w-full bg-white dark:bg-[#0a0f12] border border-gray-200 border-opacity-50 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm appearance-none text-left"
                      >
                        <option value="Intercity" className="bg-white text-gray-900">Intercity</option>
                        <option value="Airport Transfer" className="bg-white text-gray-900">Airport Transfer</option>
                        <option value="Other" className="bg-white text-gray-900">Other</option>
                      </select>
                    </div>
                  )}

                  {tripType !== 'Car Renting' && (
                    <div className="space-y-4 pt-2">
                      <div>
                        <label htmlFor="numberOfPeople" className="block text-xs font-semibold mb-2 text-gray-900/50 tracking-wider uppercase">Number of People</label>
                        <input
                          type="number"
                          id="numberOfPeople"
                          required
                          min="1"
                          max="50"
                          value={numberOfPeople}
                          onChange={(e) => setNumberOfPeople(e.target.value === '' ? '' : parseInt(e.target.value))}
                          onFocus={handleInputFocus}
                          className="mt-1 block w-full bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm"
                        />
                      </div>
                    </div>
                  )}

                        </>
                      )}

                      {bookingStep === 2 && (
                        <div className="space-y-6">
                          {/* Vehicle Selection Step */}
                          <div className="">
                            <div className="flex items-center gap-2 mb-4 px-2">
                              <h4 className="text-xl font-bold text-gray-900 tracking-tight">Choose Your Vehicle</h4>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                              {AVAILABLE_VEHICLES.map(v => {
                                const isSelected = selectedVehicle === v.name;
                                const isUnavailable = v.quantity <= 0;
                                return (
                                  <VehicleShowroomCard
                                    key={v.name}
                                    vehicle={v}
                                    isSelected={isSelected}
                                    isUnavailable={isUnavailable}
                                    
                                    onClick={() => {
                                      if (!isUnavailable) {
                                        setSelectedVehicle(v.name);
                                        setConfirmCapacity(false);
                                      }
                                    }}
                                  />
                                );
                              })}
                            </div>
                            
                            {AVAILABLE_VEHICLES.find(v => v.name === selectedVehicle)?.capacity! < numberOfPeople && (
                              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mt-4 mx-2">
                                <p className="text-sm font-medium text-yellow-400 mb-2">
                                  ⚠️ Exceeds vehicle capacity (Max: {AVAILABLE_VEHICLES.find(v => v.name === selectedVehicle)?.capacity}).
                                </p>
                                <label className="flex items-center gap-2 text-sm text-yellow-200/80 cursor-pointer pt-1">
                                  <input
                                    type="checkbox"
                                    checked={confirmCapacity}
                                    onChange={(e) => setConfirmCapacity(e.target.checked)}
                                    className="rounded bg-gray-50 border-gray-200 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 focus:ring-offset-transparent"
                                  />
                                  I confirm I want to proceed with this vehicle
                                </label>
                              </div>
                            )}

                            {tripType === 'Tour' && (
                              <div className="mt-6 mx-2">
                                <label className={`block text-xs font-semibold mb-2 text-gray-900/50 tracking-wider uppercase`}>Number of Vehicles</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={AVAILABLE_VEHICLES.find(v => v.name === selectedVehicle)?.quantity || 10}
                                  value={numberOfCars}
                                  onChange={(e) => setNumberOfCars(e.target.value === '' ? '' : parseInt(e.target.value))}
                                  className={`block w-full border rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] py-3 px-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm bg-white dark:bg-[#ffffff]/5 border-gray-200 border-opacity-50 text-gray-900`}
                                />
                              </div>
                            )}

                            {/* AC Selection */}
                            {tripType !== 'Car Renting' && (
                              <div className="mt-6 mx-2 border rounded-2xl p-4 shadow-sm flex items-center gap-4 bg-gray-50 dark:bg-[#0a0f12] border-gray-200 dark:border-white/10 border-opacity-50">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)] flex items-center justify-center flex-shrink-0">
                                  <Snowflake className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-base text-gray-900">Air Conditioning</h4>
                                  <p className="text-xs text-gray-900/50 dark:text-gray-400">Cooler cabin · Ideal for summer</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setIsAC(!isAC)}
                                  className={`relative w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#9353d3]/50 focus:ring-offset-1 dark:focus:ring-offset-[#0a0f12] ${
                                    isAC ? 'bg-[#9353d3]' : 'bg-gray-300 dark:bg-[#3f3f46]'
                                  }`}
                                >
                                  <motion.div
                                    layout
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="bg-white w-5 h-5 rounded-full shadow-sm"
                                    initial={false}
                                    animate={{ x: isAC ? 20 : 0 }}
                                  />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {bookingStep === 3 && (
                        <div className="space-y-6">
                          {/* Review Step */}
                          <div className={`rounded-3xl p-6 sm:p-8 bg-white/50 dark:bg-[#ffffff]/5 border border-gray-200 dark:border-[#ffffff]/10 shadow-xl`}>
                            {tripType === 'Car Renting' ? (
                              <h4 className={`text-xl font-bold mb-6 text-gray-900 tracking-tight`}>Review Your Rental Car for {user?.name}</h4>
                            ) : (
                              <h4 className={`text-xl font-bold mb-6 text-gray-900 tracking-tight`}>Review Your Trip</h4>
                            )}
                            <div className="space-y-6">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30">
                                  <MapPin className={`w-5 h-5 text-indigo-400`} />
                                </div>
                                <div>
                                  <p className={`text-xs text-gray-900/50 uppercase tracking-wider font-semibold mb-1`}>{tripType === 'Car Renting' ? 'Booking Type' : 'Route'}</p>
                                  <p className={`text-base font-medium text-gray-900`}>
                                    {tripType === 'Car Renting' ? 'Car Rental' : 
                                     tripType === 'Tour' ? `${fromLocation} → ${destinations.join(' → ')}` :
                                     `${fromLocation} → ${toLocation}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-fuchsia-500/20 border border-fuchsia-500/30">
                                  <Calendar className={`w-5 h-5 text-fuchsia-400`} />
                                </div>
                                <div>
                                  <p className={`text-xs text-gray-900/50 uppercase tracking-wider font-semibold mb-1`}>Date & Time</p>
                                  <p className={`text-base font-medium text-gray-900`}>
                                    {rideDate && !isNaN(parseRideDate(rideDate).getTime()) 
                                      ? `${safeFormatDate(rideDate, 'MMM d, yyyy')} at ${rideTimeHour}:${rideTimeMinute} ${rideTimeAmPm}`
                                      : (tripType === 'Wedding' && weddingDate && !isNaN(parseRideDate(weddingDate).getTime()) 
                                          ? `${safeFormatDate(weddingDate, 'MMM d, yyyy')}` 
                                          : 'Date not selected')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-blue-500/20 border border-blue-500/30">
                                  <Car className={`w-5 h-5 text-blue-400`} />
                                </div>
                                <div>
                                  <p className={`text-xs text-gray-900/50 uppercase tracking-wider font-semibold mb-1`}>Vehicle</p>
                                  <p className={`text-base font-medium text-gray-900`}>
                                    {selectedVehicle.replace(/ \(\d+ Seater\)/, '')} {isAC ? '(AC)' : '(Non-AC)'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Trip Summary and Slide to Book merged directly under Review */}
                          <div className="bg-white/50 dark:bg-[#ffffff]/5 border border-gray-200 dark:border-[#ffffff]/10 rounded-3xl shadow-xl p-6 sm:p-8">
                            <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-6 flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                                <CreditCard className="h-5 w-5 text-indigo-400" />
                              </div>
                              Trip Summary
                            </h3>
                            <div className="space-y-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-900/50">Trip Type</span>
                                <span className="font-medium text-gray-900">{tripType}</span>
                              </div>
                              {tripType !== 'Car Renting' && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-900/50">Total Distance</span>
                                  <span className="font-medium text-gray-900">{estimatedKM} km</span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-900/50">Vehicle</span>
                                <span className="font-medium text-gray-900">{selectedVehicle.replace(/ \(\d+ Seater\)/, '')}</span>
                              </div>
                              {tripType === 'Round-trip' && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-900/50">Halt Charges</span>
                                  <span className="font-medium text-gray-900">₹{calculateHaltCharge()}</span>
                                </div>
                              )}
                              <div className="border-t border-gray-200 border-opacity-50 pt-6 mt-6">
                                <div className="flex justify-between items-center">
                                  <span className="text-base font-bold text-gray-900">Total Estimated Fare</span>
                                  <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">₹{
                                    tripType === 'Car Renting' 
                                      ? (Number(numberOfDays) || 1) * 2000 * (Number(numberOfCars) || 1)
                                      : (estimatedPrice || (estimatedKM * (selectedVehicle === 'Swift Dzire' ? 13 : selectedVehicle === 'Ertiga' ? 14 : 28) * (tripType === 'Wedding' ? (parseInt(vehiclesRequired) || 1) : (tripType === 'Tour' ? (Number(numberOfCars) || 1) : 1)))) + (tripType === 'Round-trip' ? calculateHaltCharge() : 0)
                                  }</span>
                                </div>
                                <p className="text-xs text-gray-900/30 mt-2 text-right">*Final fare may vary based on actual distance and tolls.</p>
                                
                                {/* Slide to Book moved inside Trip Summary under the price */}
                                <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-[#ffffff]/10">
                                  <SlideToBookButton 
                                    text={tripType === 'Car Renting' ? 'Slide to Rent' : 'Slide to Book'}
                                    onConfirm={() => {
                                      const btn = document.getElementById('hidden-submit-btn') as HTMLButtonElement;
                                      if (btn) {
                                        btn.click();
                                      }
                                    }}
                                    isLoading={bookingLoading}
                                    disabled={bookingLoading || (numberOfPeople > 22 && !confirmCapacity)}
                                  />
                                  <button
                                    id="hidden-submit-btn"
                                    type="submit"
                                    className="hidden"
                                  ></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Wizard Navigation */}
                      <div className="flex justify-between pt-6 border-t border-gray-200 border-opacity-50 mt-8">
                        {bookingStep > 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setBookingStep(bookingStep - 1);
                              if (bookingStep === 2) setIsSheetExpanded(false);
                            }}
                            className={`flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                              'text-gray-900/70 hover:text-gray-900 hover:bg-white/10 active:scale-95'
                            }`}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Back
                          </button>
                        ) : <div></div>}
                        
                        {bookingStep < 3 && (
                          <button
                            type="button"
                            onClick={() => {
                              const btn = document.getElementById('hidden-next-btn');
                              if (btn) btn.click();
                            }}
                            disabled={isNextDisabled}
                            className={`flex items-center px-8 py-3 text-sm font-medium rounded-2xl text-gray-900 transition-all transform active:scale-95 ${
                              isNextDisabled 
                                ? 'bg-white/5 text-gray-900/30 cursor-not-allowed border border-gray-200 border-opacity-50' 
                                : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)] border border-indigo-400/30'
                            }`}
                          >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                          </button>
                        )}
                        <button id="hidden-next-btn" type="submit" className="hidden"></button>
                      </div>
                    </motion.form>
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">My Bookings</h3>
                  <button 
                    onClick={() => {
                      setLoading(true);
                      fetchBookings(true);
                    }}
                    disabled={loading}
                    className="p-2 text-gray-900/50 hover:text-gray-900 hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
                    title="Refresh bookings"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                {loading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white/50 dark:bg-[#ffffff]/5 border border-gray-200 dark:border-[#ffffff]/10 rounded-3xl p-6 animate-pulse">
                        <div className="flex justify-between items-center mb-4">
                          <div className="h-6 bg-white/10 rounded-lg w-1/3"></div>
                          <div className="flex gap-2">
                            <div className="h-6 bg-white/10 rounded-full w-20"></div>
                            <div className="h-6 bg-white/10 rounded-full w-20"></div>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="h-4 bg-white/10 rounded-lg w-24"></div>
                          <div className="h-4 bg-white/10 rounded-lg w-24"></div>
                          <div className="h-4 bg-white/10 rounded-lg w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : bookings.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`rounded-3xl p-12 text-center bg-white/50 dark:bg-[#ffffff]/5 border border-gray-200 dark:border-[#ffffff]/10 shadow-xl`}
                  >
                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-indigo-500/10 border border-indigo-500/20`}
                    >
                      <Car className={`w-12 h-12 text-indigo-400`} />
                    </motion.div>
                    <h3 className={`text-xl font-bold mb-2 text-gray-900 tracking-tight`}>No bookings yet</h3>
                    <p className={`mb-8 max-w-sm mx-auto text-gray-900/50 leading-relaxed`}>You haven't made any bookings yet. Book your premium ride to get started.</p>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveTab('dashboard')}
                      className={`inline-flex items-center justify-center px-8 py-3 text-sm font-medium rounded-2xl text-white dark:text-[#ffffff] shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30`}
                    >
                      Book a Ride
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className={`space-y-4`}>
                    {bookings.map((booking, index) => (
                      <div key={booking.id} className="relative group">
                        <div className={`rounded-2xl overflow-hidden transition-all bg-white/50 dark:bg-[#ffffff]/5 hover:bg-white/80 dark:hover:bg-[#ffffff]/10 border border-gray-200 dark:border-[#ffffff]/10 shadow-sm`}>
                          {/* Always visible header */}
                          <div 
                            className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer`}
                            onClick={() => setExpandedBookingId(expandedBookingId === booking.id ? null : booking.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-gray-200 border-opacity-50 ${booking.rideStatus === 'Cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                  {booking.rideStatus === 'Cancelled' && booking.refundStatus === 'Processed' ? 'Refunded' : booking.rideStatus}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-gray-200 border-opacity-50 ${booking.paymentStatus === 'Paid' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                  {booking.paymentStatus}
                                </span>
                                {booking.timestamp && (
                                  <span className="text-[10px] text-gray-400 hidden sm:inline">
                                    {format(new Date(booking.timestamp), "MMM d, yyyy")}
                                  </span>
                                )}
                              </div>
                              <h4 className={`text-base font-bold text-gray-900 tracking-tight break-words whitespace-pre-wrap`}>
                                {booking.tripType === 'Car Renting'
                                  ? `Car Rental: ${booking.numberOfDays} days, ${booking.numberOfCars} cars`
                                  : booking.tripType === 'Tour' 
                                  ? `${booking.fromLocation} \u2192 ${Array.isArray(booking.destinations) ? booking.destinations.join(', ') : booking.destinations}`
                                  : `${booking.fromLocation} \u2192 ${booking.toLocation}`}
                              </h4>
                              <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-900/60`}>
                                <div className="flex items-center gap-1">
                                  <Calendar className={`w-3.5 h-3.5 text-gray-400`} />
                                  {safeFormatDate(booking.rideDate, 'MMM d, yyyy')}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className={`w-3.5 h-3.5 text-gray-400`} />
                                  {safeFormatDate(booking.rideDate, 'h:mm a')}
                                </div>
                                <div className="font-semibold text-gray-900">
                                  ₹{parseFloat(booking.fareAmount).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex-shrink-0 bg-gray-50 dark:bg-[#ffffff]/5 p-2 rounded-full hidden sm:block">
                              {expandedBookingId === booking.id ? (
                                <ChevronUp className={`w-5 h-5 text-gray-500`} />
                              ) : (
                                <ChevronDown className={`w-5 h-5 text-gray-500`} />
                              )}
                            </div>
                          </div>
                          
                          {/* Expandable Body */}
                          <AnimatePresence>
                            {expandedBookingId === booking.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`border-t border-gray-200 border-opacity-50 bg-white/5`}
                              >
                                <div className="p-4 sm:p-5">
                                  <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-5 p-4 rounded-xl bg-gray-50/50 dark:bg-[#ffffff]/5 border border-gray-200/50`}>
                                    <div>
                                      <p className="text-gray-500 mb-1 flex items-center gap-1"><Car className="w-3.5 h-3.5" /> Vehicle</p>
                                      <p className="font-medium text-gray-900">{booking.suggestedVehicle || 'Sedan'} {booking.isAC === 'Yes' ? '(AC)' : '(Non-AC)'}</p>
                                    </div>
                                    {booking.tripType !== 'Car Renting' && (
                                      <div>
                                        <p className="text-gray-500 mb-1 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Passengers</p>
                                        <p className="font-medium text-gray-900">{booking.numberOfPeople}</p>
                                      </div>
                                    )}
                                    {booking.tripType === 'Tour' && (
                                      <div>
                                        <p className="text-gray-500 mb-1 flex items-center gap-1"><Car className="w-3.5 h-3.5" /> Fleet</p>
                                        <p className="font-medium text-gray-900">{booking.numberOfCars} Vehicles</p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-gray-500 mb-1">Booked On</p>
                                      <p className="font-medium text-gray-900">{booking.timestamp ? format(new Date(booking.timestamp), "MMM d, h:mm a") : 'N/A'}</p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-4 mt-2 pt-2 border-t border-gray-200/50">
                                      <AbstractMiniMap 
                                        from={booking.fromLocation} 
                                        to={booking.tripType === 'Tour' ? (Array.isArray(booking.destinations) ? booking.destinations.join(', ') : booking.destinations) : booking.toLocation || 'Destination'} 
                                        status={booking.rideStatus}
                                      />
                                    </div>
                                  </div>
                                  
                                  {booking.tripType === 'Wedding' && booking.weddingDetails && (
                                    <div className={`mb-5 p-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-50/50 dark:bg-fuchsia-900/10`}>
                                      <h5 className={`text-xs font-bold mb-2 flex items-center gap-1.5 text-fuchsia-600 dark:text-fuchsia-400`}>
                                        <span className="text-sm">💍</span> Wedding Details
                                      </h5>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                        <div>
                                          <span className={`block text-gray-400 mb-0.5`}>Event Location</span>
                                          <span className={`font-medium text-gray-900`}>{booking.weddingDetails.eventLocation}</span>
                                        </div>
                                        <div>
                                          <span className={`block text-gray-400 mb-0.5`}>Vehicles Required</span>
                                          <span className={`font-medium text-gray-900`}>{booking.weddingDetails.vehiclesRequired}</span>
                                        </div>
                                        <div>
                                          <span className={`block text-gray-400 mb-0.5`}>Decoration</span>
                                          <span className={`font-medium text-gray-900`}>{booking.weddingDetails.decorationRequired}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
  
                                  {/* Driver Details Section */}
                                  {booking.assignments && booking.assignments.length > 0 ? (
                                    <div className="mb-6 space-y-4">
                                      {booking.assignments.map((assignment: any, idx: number) => (
                                        <div key={idx} className={`p-4 rounded-2xl border shadow-sm bg-gray-50 border-indigo-500/20`}>
                                          <h5 className={`text-sm font-semibold mb-2 text-indigo-400`}>
                                            {booking.assignments.length > 1 ? `Vehicle ${idx + 1} Details` : 'Driver & Vehicle Details'}
                                          </h5>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {assignment.driverDetails && (
                                              <>
                                                <div>
                                                  <p className={`text-xs uppercase tracking-wider text-gray-900/40`}>Driver Name</p>
                                                  <p className={`text-sm font-medium text-gray-900`}>{assignment.driverDetails.name}</p>
                                                </div>
                                                <div>
                                                  <p className={`text-xs uppercase tracking-wider text-gray-900/40`}>Phone Number</p>
                                                  <p className={`text-sm font-medium text-gray-900`}>{assignment.driverDetails.phone}</p>
                                                </div>
                                              </>
                                            )}
                                            {assignment.vehicleDetails && (
                                              <div className="sm:col-span-2">
                                                <p className={`text-xs uppercase tracking-wider text-gray-900/40`}>Vehicle Assigned</p>
                                                <p className={`text-sm font-medium text-gray-900`}>{assignment.vehicleDetails.name} ({assignment.vehicleDetails.number})</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : booking.driverDetails ? (
                                    <div className={`mb-6 p-4 rounded-2xl border shadow-sm bg-gray-50 border-indigo-500/20`}>
                                      <h5 className={`text-sm font-semibold mb-2 text-indigo-400`}>Driver & Vehicle Details</h5>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                          <p className={`text-xs uppercase tracking-wider text-gray-900/40`}>Driver Name</p>
                                          <p className={`text-sm font-medium text-gray-900`}>{booking.driverDetails.name}</p>
                                        </div>
                                        <div>
                                          <p className={`text-xs uppercase tracking-wider text-gray-900/40`}>Phone Number</p>
                                          <p className={`text-sm font-medium text-gray-900`}>{booking.driverDetails.phone}</p>
                                        </div>
                                        {booking.vehicleDetails && (
                                          <div className="sm:col-span-2">
                                            <p className={`text-xs uppercase tracking-wider text-gray-900/40`}>Vehicle Assigned</p>
                                            <p className={`text-sm font-medium text-gray-900`}>{booking.vehicleDetails.name} ({booking.vehicleDetails.number})</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : booking.visibilityMessage ? (
                                    <div className={`mb-6 p-4 rounded-2xl border shadow-sm bg-blue-500/10 border-blue-500/20`}>
                                      <p className={`text-sm flex items-center gap-2 text-blue-400`}>
                                        <Info className="w-5 h-5 flex-shrink-0" />
                                        {booking.visibilityMessage}
                                      </p>
                                    </div>
                                  ) : null}
  
                                  {booking.rideStatus === 'Cancelled' && (
                                    <div className={`mb-6 p-4 rounded-2xl border shadow-sm bg-red-500/10 border-red-500/20`}>
                                      <h5 className={`text-sm font-semibold mb-2 text-red-400`}>Refund Details</h5>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className={`text-xs uppercase tracking-wider text-gray-900/40`}>Status</p>
                                          <p className={`text-sm font-medium text-gray-900`}>{booking.refundStatus || 'No Refund'}</p>
                                        </div>
                                        <div>
                                          <p className={`text-xs uppercase tracking-wider text-gray-900/40`}>Amount</p>
                                          <p className={`text-sm font-medium text-gray-900`}>₹{booking.refundAmount?.toFixed(2) || '0.00'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
  
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                                    <div className="w-full sm:w-auto overflow-hidden">
                                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-500`}>Booking ID</p>
                                      <p className={`text-xs font-medium text-gray-900 truncate`} title={`#${booking.id}`}>#{booking.id}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                                      <div className="flex gap-3 w-full sm:w-auto">
                                        {booking.rideStatus === 'Completed' && (
                                          <button
                                            onClick={() => setRebookModal({ isOpen: true, booking })}
                                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/20 shadow-sm`}
                                          >
                                            Rebook
                                          </button>
                                        )}
                                        {(booking.rideStatus === 'Pending' || booking.rideStatus === 'Confirmed' || booking.rideStatus === 'Assigned') && (
                                          <button
                                            onClick={() => {
                                              const refundInfo = calculateRefund(booking.rideDate, parseFloat(booking.fareAmount || '0'), booking.numberOfDays, booking.paymentStatus);
                                              setCancelModal({ isOpen: true, booking, refundInfo });
                                            }}
                                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 shadow-sm`}
                                          >
                                            Cancel Ride
                                          </button>
                                        )}
                                      </div>
                                      {cancelMessage && cancelMessage.id === booking.id && (
                                        <p className={`text-xs max-w-[200px] text-right ${cancelMessage.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                                          {cancelMessage.text}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
        </div>
      </motion.div>

    {/* Cancel Modal */}
      <AnimatePresence>
        {cancelModal.isOpen && cancelModal.booking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060608]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
              className={`rounded-3xl shadow-2xl max-w-md w-full overflow-hidden bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50`}
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-xl font-bold text-gray-900 dark:text-white tracking-tight`}>Cancel Ride</h3>
                  <button 
                    onClick={() => setCancelModal({ isOpen: false, booking: null, refundInfo: null })}
                    className={`text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10`}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className={`mb-6 p-4 rounded-xl bg-gray-50 dark:bg-[#ffffff]/5 border border-gray-200 dark:border-[#ffffff]/10`}>
                  <div className="space-y-3">
                    <div>
                      <span className={`block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5`}>Route</span>
                      <p className={`text-sm font-medium text-gray-900 dark:text-white leading-snug`}>
                        {cancelModal.booking.tripType === 'Car Renting' ? `Car Rental: ${cancelModal.booking.numberOfDays} days, ${cancelModal.booking.numberOfCars} cars` : cancelModal.booking.tripType === 'Tour' ? `${cancelModal.booking.fromLocation} \u2192 ${Array.isArray(cancelModal.booking.destinations) ? cancelModal.booking.destinations.join(', ') : cancelModal.booking.destinations}` : `${cancelModal.booking.fromLocation} \u2192 ${cancelModal.booking.toLocation}`}
                      </p>
                    </div>
                    <div>
                      <span className={`block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5`}>Departure</span>
                      <p className={`text-sm font-medium text-gray-900 dark:text-white`}>
                        {cancelModal.booking.rideDate}
                      </p>
                    </div>
                    <div>
                      <span className={`block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5`}>Fare</span>
                      <p className={`text-sm font-medium text-gray-900 dark:text-white`}>
                        ₹{cancelModal.booking.fareAmount}
                      </p>
                    </div>
                  </div>
                </div>

                {cancelModal.refundInfo && (
                  <div className={`mb-6 p-4 rounded-xl border ${cancelModal.refundInfo.refundPercent > 0 ? ('bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30') : ('bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30')}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${cancelModal.refundInfo.refundPercent > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>Cancellation Policy</h4>
                    <p className={`text-xs mb-3 leading-relaxed ${cancelModal.refundInfo.refundPercent > 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>{cancelModal.refundInfo.message}</p>
                    <div className={`flex justify-between items-center font-bold text-sm pt-3 border-t ${cancelModal.refundInfo.refundPercent > 0 ? 'border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300' : 'border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300'}`}>
                      <span>Estimated Refund:</span>
                      <span>₹{cancelModal.refundInfo.refundAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setCancelModal({ isOpen: false, booking: null, refundInfo: null })}
                    className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-all text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-transparent border border-gray-300 dark:border-[#ffffff]/20 hover:bg-gray-50 dark:hover:bg-[#ffffff]/5`}
                  >
                    Keep Ride
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (cancelModal.booking) {
                        handleCancel(cancelModal.booking.id, cancelModal.refundInfo);
                        setCancelModal({ isOpen: false, booking: null, refundInfo: null });
                      }
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-bold text-[#ffffff] rounded-lg transition-all bg-red-600 hover:bg-red-700 border border-transparent shadow-sm`}
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rebook Modal */}
      <AnimatePresence>
        {rebookModal.isOpen && rebookModal.booking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060608]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
              className={`rounded-3xl shadow-2xl max-w-md w-full overflow-hidden bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50`}
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-xl font-bold text-gray-900 tracking-tight`}>Rebook Ride</h3>
                  <button 
                    onClick={() => setRebookModal({ isOpen: false, booking: null })}
                    className={`text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10`}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className={`mb-6 p-4 rounded-xl bg-gray-50 dark:bg-[#ffffff]/5 border border-gray-200 dark:border-[#ffffff]/10`}>
                  <div className="space-y-3">
                    <div>
                      <span className={`block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5`}>Route</span>
                      <p className={`text-sm font-medium text-gray-900 dark:text-white leading-snug`}>
                        {rebookModal.booking.tripType === 'Car Renting' ? `Car Rental: ${rebookModal.booking.numberOfDays} days, ${rebookModal.booking.numberOfCars} cars` : rebookModal.booking.tripType === 'Tour' ? `${rebookModal.booking.fromLocation} \u2192 ${Array.isArray(rebookModal.booking.destinations) ? rebookModal.booking.destinations.join(', ') : rebookModal.booking.destinations}` : `${rebookModal.booking.fromLocation} \u2192 ${rebookModal.booking.toLocation}`}
                      </p>
                    </div>
                    <div>
                      <span className={`block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5`}>Vehicle</span>
                      <p className={`text-sm font-medium text-gray-900 dark:text-white`}>
                        {rebookModal.booking.suggestedVehicle} {rebookModal.booking.isAC === 'Yes' ? '(AC)' : '(Non-AC)'}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleRebookSubmit} className="space-y-5">
                  
                  <div>
                    <label className={`block text-[10px] font-bold mb-1.5 text-gray-500 dark:text-gray-400 tracking-wider uppercase`}>Select New Date</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={rebookDate}
                      onChange={(e) => setRebookDate(e.target.value)}
                      onFocus={handleInputFocus}
                      className={`block w-full border border-gray-200 dark:border-[#ffffff]/20 bg-white dark:bg-[#ffffff]/5 text-gray-900 dark:text-white rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 sm:text-sm transition-all`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-[10px] font-bold mb-1.5 text-gray-500 dark:text-gray-400 tracking-wider uppercase`}>Select New Time</label>
                    <div className="flex gap-2 items-center">
                      <select
                        value={rebookTimeHour}
                        onChange={(e) => setRebookTimeHour(e.target.value)}
                        className={`block w-full flex-1 border border-gray-200 dark:border-[#ffffff]/20 bg-white dark:bg-[#ffffff]/5 text-gray-900 dark:text-white rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 sm:text-sm transition-all appearance-none`}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                          <option key={h} value={h.toString().padStart(2, '0')} className="bg-white dark:bg-[#060608] text-gray-900 dark:text-white">{h.toString().padStart(2, '0')}</option>
                        ))}
                      </select>
                      <span className={`flex items-center font-bold text-gray-500 dark:text-gray-400`}>:</span>
                      <select
                        value={rebookTimeMinute}
                        onChange={(e) => setRebookTimeMinute(e.target.value)}
                        className={`block w-full flex-1 border border-gray-200 dark:border-[#ffffff]/20 bg-white dark:bg-[#ffffff]/5 text-gray-900 dark:text-white rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 sm:text-sm transition-all appearance-none`}
                      >
                        {['00', '15', '30', '45'].map(m => (
                          <option key={m} value={m} className="bg-white dark:bg-[#060608] text-gray-900 dark:text-white">{m}</option>
                        ))}
                      </select>
                      <select
                        value={rebookTimeAmPm}
                        onChange={(e) => setRebookTimeAmPm(e.target.value)}
                        className={`block w-full flex-1 border border-gray-200 dark:border-[#ffffff]/20 bg-white dark:bg-[#ffffff]/5 text-gray-900 dark:text-white rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 sm:text-sm transition-all appearance-none`}
                      >
                        <option value="AM" className="bg-white dark:bg-[#060608] text-gray-900 dark:text-white">AM</option>
                        <option value="PM" className="bg-white dark:bg-[#060608] text-gray-900 dark:text-white">PM</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setRebookModal({ isOpen: false, booking: null })}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all text-gray-700 hover:text-gray-900 bg-white dark:bg-transparent border border-gray-300 dark:border-[#ffffff]/20 hover:bg-gray-50 dark:hover:bg-[#ffffff]/5`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={rebookLoading || !rebookDate}
                      className={`flex-1 sm:flex-[2] px-4 py-2 rounded-lg border border-transparent shadow-sm text-sm font-bold text-[#ffffff] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center transition-all bg-indigo-600 hover:bg-indigo-700`}
                    >
                      {rebookLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        'Confirm Schedule'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Success Modal */}
      <AnimatePresence>
        {bookingSuccessData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060608]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, type: "spring", bounce: 0.5 }}
              className={`rounded-3xl shadow-2xl max-w-md w-full overflow-hidden bg-white dark:bg-[#ffffff]/5 border border-gray-200 border-opacity-50 max-h-[90dvh] flex flex-col`}
            >
              <div className="p-6 text-center overflow-y-auto flex-1 relative">
                <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-400/50`}
                  >
                    <motion.div
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <CheckCircle className="w-8 h-8 text-white" />
                    </motion.div>
                  </motion.div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute inset-0 rounded-full blur-xl bg-emerald-500/30`}
                  />
                </div>
                
                <h2 className={`text-2xl font-bold mb-6 text-gray-900 tracking-tight`}>Booking Confirmed</h2>

                <div className={`rounded-2xl p-4 text-left border mb-6 bg-white dark:bg-[#ffffff]/5 border-gray-200 border-opacity-50 shadow-sm`}>
                  <div className="space-y-3 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                      <span className={'text-gray-900/50 uppercase tracking-wider text-[11px] font-semibold whitespace-nowrap'}>Route</span>
                      <span className={`font-medium text-left sm:text-right text-gray-900 break-words`}>
                        {bookingSuccessData.tripType === 'Car Renting'
                          ? `Car Rental: ${bookingSuccessData.numberOfDays} days, ${bookingSuccessData.numberOfCars} cars`
                          : bookingSuccessData.tripType === 'Tour' 
                          ? `${bookingSuccessData.fromLocation} \u2192 ${bookingSuccessData.destinations}`
                          : `${bookingSuccessData.fromLocation} \u2192 ${bookingSuccessData.toLocation}`}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 pt-3 border-t border-gray-200 border-opacity-50">
                      <span className={'text-gray-900/50 uppercase tracking-wider text-[11px] font-semibold whitespace-nowrap'}>Departure</span>
                      <span className={`font-medium text-left sm:text-right text-gray-900`}>
                        {safeFormatDate(bookingSuccessData.rideDate, 'dd/MM/yyyy hh:mm a')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 mb-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed text-left">
                        We will contact you shortly.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed text-left">
                        You will receive an Email with driver and vehicle information once assigned.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 pt-0 border-t border-gray-200 border-opacity-50 bg-white dark:bg-[#ffffff]/5">
                <div className="flex flex-col sm:flex-row gap-4 w-full mt-6">
                  <button
                    onClick={() => {
                      setActiveTab('bookings');
                      setBookingSuccessData(null);
                      setBookingStep(1);
                    }}
                    className={`flex-1 justify-center py-3 px-6 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] text-sm font-medium text-white dark:text-[#ffffff] transition-all bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 transform active:scale-95`}
                  >
                    Go to My Bookings
                  </button>
                  <button
                    onClick={() => {
                      setBookingSuccessData(null);
                      setBookingStep(1);
                      setIsSheetExpanded(false);
                    }}
                    className={`flex-1 justify-center py-3 px-6 rounded-xl text-sm font-medium transition-all border text-gray-900/80 bg-white/5 hover:bg-white/10 hover:text-gray-900 border-gray-200 border-opacity-50 transform active:scale-95`}
                  >
                    Book Another
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </motion.div>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#060608]/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 flex justify-around items-center p-3 z-50 overflow-hidden pb-safe">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Home className={`w-5 h-5 mb-1 ${activeTab === 'dashboard' ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
          <span className="text-[10px] tracking-wide">Book</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
            activeTab === 'bookings' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <List className={`w-5 h-5 mb-1 ${activeTab === 'bookings' ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
          <span className="text-[10px] tracking-wide">Rides</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
            activeTab === 'profile' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <User className={`w-5 h-5 mb-1 ${activeTab === 'profile' ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
          <span className="text-[10px] tracking-wide">Profile</span>
        </button>
      </div>
    </>
  );
}
