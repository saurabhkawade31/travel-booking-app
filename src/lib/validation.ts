import { logger } from '../lib/logger';
export const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'icloud.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'example.com', 'yuvrajtravels.com'];

export const validateEmail = (email: string, restrictDomains: boolean = true): string | null => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email format';
  
  if (restrictDomains) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
      return `Email must end with one of: ${ALLOWED_EMAIL_DOMAINS.map(d => '@' + d).join(', ')}`;
    }
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) return 'Phone number is required';
  if (!/^\d{10}$/.test(phone)) {
    return 'Please enter exactly 10 digits';
  }
  return null;
};

export const validateName = (name: string): string | null => {
  if (!name || name.trim().length < 3) {
    return 'Name must be at least 3 characters long';
  }
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    return 'Name can only contain letters and spaces (no special characters or numbers)';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  return null;
};

export const validateVehicleNumber = (number: string): string | null => {
  if (!number || number.trim().length < 4) {
    return 'Vehicle number must be at least 4 characters';
  }
  if (!/^[A-Z0-9\s-]+$/i.test(number)) {
    return 'Vehicle number can only contain letters, numbers, spaces, and hyphens';
  }
  return null;
};

export const parseRideDate = (rideDateStr: string): Date => {
  if (!rideDateStr) return new Date(NaN);
  let rideDate = new Date(rideDateStr);
  
  if (isNaN(rideDate.getTime())) {
    try {
      let match = rideDateStr.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i);
      if (match) {
        const [_, datePart, hourStr, minStr, ampm] = match;
        let hour = parseInt(hourStr, 10);
        if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
        if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
        rideDate = new Date(`${datePart}T${hour.toString().padStart(2, '0')}:${minStr}:00`);
      } else {
        match = rideDateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i);
        if (match) {
          const [_, month, day, year, hourStr, minStr, ampm] = match;
          let hour = parseInt(hourStr, 10);
          if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
          if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
          rideDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minStr}:00`);
        }
      }
    } catch (e) {
      logger.error('Error parsing date:', e);
    }
  }
  
  if (!isNaN(rideDate.getTime()) && rideDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = rideDateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  return rideDate;
};

import { format } from 'date-fns';

export const safeFormatDate = (dateStr: string | undefined | null, formatStr: string, fallback: string = 'N/A'): string => {
  if (!dateStr) return fallback;
  const date = parseRideDate(dateStr);
  if (isNaN(date.getTime())) return fallback;
  try {
    return format(date, formatStr);
  } catch (e) {
    return fallback;
  }
};
