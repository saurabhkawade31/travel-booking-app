import express from 'express';
import axios from 'axios';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSheets, getDoc, getCachedRows, invalidateCache, startCacheWarmer } from './server/sheets.ts';
import { setupFleetRoutes } from './server/fleet.ts';
import cityAutocompleteRouter from './server/cityAutocomplete.ts';
import PDFDocument from 'pdfkit';
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import jwt from 'jsonwebtoken';
import { JWT_SECRET, authenticateToken, requireAdmin, requireOwnershipOrAdmin } from './server/auth.ts';
import rateLimit from 'express-rate-limit';

dotenv.config();

async function startServer() {
  const app = express();
  
  // See https://express-rate-limit.github.io/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/
  app.set('trust proxy', 1);

  // Rate limiter setup
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: { error: 'Too many requests, please try again later' },
    validate: { xForwardedForHeader: false, trustProxy: false }
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 20, 
    message: { error: 'Too many auth attempts, please try again later' },
    validate: { xForwardedForHeader: false, trustProxy: false }
  });
  
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  app.use(cors());
  app.use(express.json());
  
  // Prevent Google Sheets Injection
  const sanitizeForSheets = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        const val = obj[key] as string;
        if (/^[=+\-@]/.test(val)) {
          obj[key] = "'" + val;
        }
      } else if (typeof obj[key] === 'object') {
        sanitizeForSheets(obj[key]);
      }
    }
  };

  app.use((req, res, next) => {
    sanitizeForSheets(req.body);
    sanitizeForSheets(req.query);
    next();
  });
  
  app.use('/api/', apiLimiter);
  app.use('/api/auth/', authLimiter);
  app.use('/calculate-distance', apiLimiter);
  
  app.use('/api', cityAutocompleteRouter);

  // Initialize Google Sheets in the background to prevent blocking server startup
  initSheets().then(() => {
    startCacheWarmer();
  }).catch(console.error);

  // Socket.io for real-time updates
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // API Routes
  setupFleetRoutes(app, io);

  // Unblockable Image Proxy (Bypasses Nginx by dropping the .png extension from the request)
  app.get('/api/raw-image/:name', (req, res) => {
    const name = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // Check every single possible location the image could mathematically be sitting in
    const searchPaths = [
      path.join(process.cwd(), 'src', 'assets', 'images', `${name}.png`),
      path.join(process.cwd(), 'public', 'images', `${name}.png`),
      `/home/ec2-user/Vishal-Tours-Travelers/src/assets/images/${name}.png`,
      `/var/www/html/images/${name}.png` // We check the exact folder we copied it to
    ];

    for (const imgPath of searchPaths) {
      if (fs.existsSync(imgPath)) {
        res.setHeader('Content-Type', 'image/png');
        return res.sendFile(imgPath);
      }
    }
    
    res.status(404).end();
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', sheetsReady: !!getDoc() });
  });

  app.get('/api/test-resize', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    try {
      const sheet = doc.sheetsByTitle['Users'];
      await sheet.autoResizeDimensions('COLUMNS', { startIndex: 0, endIndex: sheet.columnCount });
      res.json({ status: 'ok' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    let { name, email, phone, password, role, acceptedTerms } = req.body;
    
    // Prevent unauthenticated elevation to staff
    if (role === 'staff' || role === 'admin') {
      return res.status(403).json({ error: 'Forbidden: Cannot register as staff' });
    }
    const userRole: string = 'customer';
    
    if (!name || name.length > 100) return res.status(400).json({ error: 'Invalid name' });
    if (!email || email.length > 100 || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });
    if (!password || password.length < 6 || password.length > 100) return res.status(400).json({ error: 'Invalid password (must be 6-100 characters)' });
    
    try {
      const targetSheetName = userRole === 'staff' ? 'Staff' : 'Users';
      const sheet = doc.sheetsByTitle[targetSheetName];
      const rows = await getCachedRows(targetSheetName);
      const existingUser = rows.find(r => r.get('email') === email);
      
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const id = Date.now().toString();
      await sheet.addRow({
        id,
        name,
        email,
        phone: phone || '',
        password, // Storing plain text as requested
        role: userRole,
        acceptedTerms: acceptedTerms ? 'Yes' : 'No',
        createdAt: new Date().toISOString()
      });
      invalidateCache(targetSheetName);

      const token = jwt.sign({ id, role: userRole }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ id, name, email, phone: phone || '', role: userRole, token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to register' });
    }
  });

  app.post('/api/auth/verify-reset', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { name, email, phone } = req.body;
    
    try {
      const userRows = await getCachedRows('Users');
      let user = userRows.find(r => 
        r.get('email') === email && 
        r.get('name') === name && 
        r.get('phone') === phone
      );
      
      if (!user) {
        const staffRows = await getCachedRows('Staff');
        user = staffRows.find(r => 
          r.get('email') === email && 
          r.get('name') === name && 
          r.get('phone') === phone
        );
      }
      
      if (!user) {
        return res.status(404).json({ error: 'No matching account found with these details.' });
      }

      res.json({ success: true, userId: user.get('id'), isStaff: user.get('role') === 'staff' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to verify details' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { userId, newPassword, isStaff } = req.body;
    
    try {
      const rows = await getCachedRows(isStaff ? 'Staff' : 'Users');
      
      const user = rows.find(r => r.get('id') === userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      user.set('password', newPassword);
      await user.save();
      invalidateCache(isStaff ? 'Staff' : 'Users');

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { email, password } = req.body;
    
    try {
      const userRows = await getCachedRows('Users');
      let user = userRows.find(r => r.get('email') === email && r.get('password') === password);
      
      if (!user) {
        const staffRows = await getCachedRows('Staff');
        user = staffRows.find(r => r.get('email') === email && r.get('password') === password);
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: user.get('id'), role: user.get('role') }, JWT_SECRET, { expiresIn: '1d' });
      res.json({
        id: user.get('id'),
        name: user.get('name'),
        email: user.get('email'),
        phone: user.get('phone') || '',
        role: user.get('role'),
        token
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to login' });
    }
  });

  // User Profile Routes
  app.get('/api/users/:id', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    try {
      const userRows = await getCachedRows('Users');
      let user = userRows.find(r => r.get('id') === req.params.id);
      
      if (!user) {
        const staffRows = await getCachedRows('Staff');
        user = staffRows.find(r => r.get('id') === req.params.id);
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.get('id'),
        name: user.get('name'),
        email: user.get('email'),
        phone: user.get('phone') || '',
        role: user.get('role')
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.put('/api/users/:id', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { name, email, phone } = req.body;
    
    try {
      const usersSheet = doc.sheetsByTitle['Users'];
      const staffSheet = doc.sheetsByTitle['Staff'];
      
      // Ensure headers include phone
      await usersSheet.setHeaderRow(['id', 'name', 'email', 'phone', 'password', 'role', 'createdAt']);
      await staffSheet.setHeaderRow(['id', 'name', 'email', 'phone', 'password', 'role', 'createdAt']);
      
      const userRows = await getCachedRows('Users');
      let user = userRows.find(r => r.get('id') === req.params.id);
      let isStaff = false;
      
      if (!user) {
        const staffRows = await getCachedRows('Staff');
        user = staffRows.find(r => r.get('id') === req.params.id);
        isStaff = true;
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const oldEmail = user.get('email');
      user.set('name', name);
      user.set('email', email);
      user.set('phone', phone || '');
      await user.save();
      invalidateCache(isStaff ? 'Staff' : 'Users');

      // If it's a staff member, also try to update their corresponding driver record
      if (isStaff) {
        try {
          const driversSheet = doc.sheetsByTitle['drivers'];
          if (driversSheet) {
            const driverRows = await getCachedRows('drivers');
            // Try to find by old email
            const driverRow = driverRows.find(r => r.get('email') === oldEmail);
            if (driverRow) {
              driverRow.set('name', name);
              driverRow.set('email', email);
              driverRow.set('phone', phone || '');
              await driverRow.save();
              invalidateCache('drivers');
            }
          }
          
          // Update assignedDriverEmail in Bookings if email changed
          if (oldEmail !== email) {
            const bookingsSheet = doc.sheetsByTitle['Bookings'];
            if (bookingsSheet) {
              const bookingRows = await getCachedRows('Bookings');
              let updatedBookings = false;
              for (const row of bookingRows) {
                if (row.get('assignedDriverEmail') === oldEmail) {
                  row.set('assignedDriverEmail', email);
                  await row.save();
                  updatedBookings = true;
                }
              }
              if (updatedBookings) {
                invalidateCache('Bookings');
              }
            }
          }
        } catch (err) {
          console.error('Failed to update corresponding driver record:', err);
        }
      }

      res.json({
        id: user.get('id'),
        name: user.get('name'),
        email: user.get('email'),
        phone: user.get('phone'),
        role: user.get('role')
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Bookings Routes
  app.post('/api/bookings', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const { 
      userId, userName, userEmail, fromLocation, toLocation, rideDate, rideType, numberOfPeople, fareAmount,
      tripType, returnDate, weddingDetails, intercityDetails, airportDetails, customRequirements,
      destinations, numberOfDays, numberOfCars, estimatedKM, suggestedVehicle, isAC, routeGeometry
    } = req.body;
    
    try {
      const sheet = doc.sheetsByTitle['Bookings'];
      const id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      
      // Format the date to ISO format with IST offset
      let formattedDate = rideDate;
      if (rideDate) {
        try {
          // Expected format: "YYYY-MM-DD HH:MM AM/PM"
          const match = rideDate.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
          if (match) {
            const [_, datePart, hourStr, minStr, ampm] = match;
            let hour = parseInt(hourStr, 10);
            if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
            if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
            formattedDate = `${datePart}T${String(hour).padStart(2, '0')}:${minStr}:00+05:30`;
          } else {
            // Fallback for other formats
            const dateObj = new Date(rideDate);
            if (!isNaN(dateObj.getTime())) {
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              const hours = String(dateObj.getHours()).padStart(2, '0');
              const minutes = String(dateObj.getMinutes()).padStart(2, '0');
              const seconds = String(dateObj.getSeconds()).padStart(2, '0');
              formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
            }
          }
        } catch (e) {
          console.error('Error formatting date:', e);
        }
      }
      
      const newBooking = {
        id,
        userId,
        userName,
        userEmail: userEmail || '',
        fromLocation,
        toLocation,
        rideDate: formattedDate,
        rideType: rideType || 'Other',
        numberOfPeople: numberOfPeople || 1,
        rideStatus: 'Pending',
        paymentStatus: 'Not Paid',
        fareAmount,
        timestamp: new Date().toISOString(),
        tripType: tripType || 'One-way',
        returnDate: returnDate || 'N/A',
        destinations: destinations || 'N/A',
        numberOfDays: numberOfDays || 'N/A',
        numberOfCars: numberOfCars || 'N/A',
        estimatedKM: estimatedKM || 'N/A',
        suggestedVehicle: suggestedVehicle || 'N/A',
        isAC: isAC ? 'Yes' : 'No',
        routeGeometry: routeGeometry || '[]',
        weddingDetails: weddingDetails ? JSON.stringify(weddingDetails) : 'N/A',
        intercityDetails: intercityDetails ? JSON.stringify(intercityDetails) : 'N/A',
        airportDetails: airportDetails ? JSON.stringify(airportDetails) : 'N/A',
        customRequirements: customRequirements || 'N/A',
        assignedDriverEmail: '',
        assignedVehicleId: '',
        assignments: '[]',
        refundStatus: '',
        refundAmount: ''
      };

      await sheet.addRow(newBooking);
      invalidateCache('Bookings');
      
      // Notify all clients about the new booking
      io.emit('booking:created', newBooking);
      
      res.json(newBooking);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  });

  app.get('/api/bookings', authenticateToken, async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const authUser = (req as any).user;
    const isUserAdmin = authUser.role === 'admin' || authUser.role === 'staff';
    
    const { userId, forceRefresh, page = 1, limit = 50 } = req.query;
    
    // If not admin, force the userId to be their own id
    const finalUserId = isUserAdmin ? userId : authUser.id;

    const isForceRefresh = forceRefresh === 'true';
    const parsedPage = parseInt(page as string);
    const parsedLimit = parseInt(limit as string);
    
    try {
      const sheet = doc.sheetsByTitle['Bookings'];
      const usersSheet = doc.sheetsByTitle['Users'];
      
      const vehiclesSheet = doc.sheetsByTitle['vehicles'];
      const driversSheet = doc.sheetsByTitle['drivers'];
      
      const [rows, userRows, vehicleRows, driverRows] = await Promise.all([
        getCachedRows('Bookings', isForceRefresh),
        getCachedRows('Users', isForceRefresh),
        vehiclesSheet ? getCachedRows('vehicles', isForceRefresh) : Promise.resolve([]),
        driversSheet ? getCachedRows('drivers', isForceRefresh) : Promise.resolve([])
      ]);
      
      const userPhones: Record<string, string> = {};
      userRows.forEach(r => {
        userPhones[r.get('id')] = r.get('phone') || '';
      });
      
      const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

      let bookings = rows
        .filter(r => r.get('id'))
        .map(r => {
          const rideDateStr = r.get('rideDate');
          const rideStatus = r.get('rideStatus');
          const assignedDriverEmail = r.get('assignedDriverEmail');
          const assignedVehicleId = r.get('assignedVehicleId');
          const assignmentsStr = r.get('assignments');
          
          let assignments: any[] = [];
          if (assignmentsStr) {
            try { assignments = JSON.parse(assignmentsStr); } catch(e) {}
          } else if (assignedDriverEmail || assignedVehicleId) {
            assignments = [{ driverEmail: assignedDriverEmail, vehicleId: assignedVehicleId }];
          }
          
          let driverDetails = null;
          let vehicleDetails = null;
          let visibilityMessage = null;
          let showDetails = isUserAdmin;

          if (assignments.length > 0) {
            if (rideDateStr && (rideStatus === 'Assigned' || rideStatus === 'Ongoing' || rideStatus === 'Completed')) {
              showDetails = true;
            }
            
            if (showDetails) {
              assignments = assignments.map(a => {
                let dDetails = null;
                let vDetails = null;
                if (a.driverEmail) {
                  const driver = driverRows.find(d => d.get('email') === a.driverEmail);
                  if (driver) dDetails = { name: driver.get('name'), phone: driver.get('phone') };
                }
                if (a.vehicleId) {
                  const vehicle = vehicleRows.find(v => v.get('vehicleId') === a.vehicleId);
                  if (vehicle) vDetails = { name: vehicle.get('vehicleName'), number: vehicle.get('vehicleNumber') };
                }
                return { ...a, driverDetails: dDetails, vehicleDetails: vDetails };
              });
              
              if (assignments[0]) {
                driverDetails = assignments[0].driverDetails;
                vehicleDetails = assignments[0].vehicleDetails;
              }
            } else {
              assignments = assignments.map(a => ({ driverEmail: a.driverEmail, vehicleId: a.vehicleId }));
            }
          }

          if (!isUserAdmin && rideStatus === 'Confirmed') {
            if (r.get('tripType') === 'Car Renting') {
              if (!vehicleDetails) {
                visibilityMessage = "Vehicle information will be given to you before 1 hour of the start time.";
              }
            } else if (!driverDetails) {
              visibilityMessage = "Driver & vehicle information will be given to you once the admin assigns these details to your ride.";
            }
          }

          return {
            id: r.get('id'),
            userId: r.get('userId'),
            userName: r.get('userName'),
            userPhone: userPhones[r.get('userId')] || '',
            userEmail: r.get('userEmail'),
            fromLocation: r.get('fromLocation'),
            toLocation: r.get('toLocation'),
            destinations: (() => { try { return r.get('destinations') ? JSON.parse(r.get('destinations')) : undefined; } catch(e) { return r.get('destinations'); } })(),
            rideDate: rideDateStr,
            returnDate: r.get('returnDate'),
            tripType: r.get('tripType'),
            rideType: r.get('rideType'),
            numberOfPeople: r.get('numberOfPeople'),
            numberOfDays: r.get('numberOfDays'),
            numberOfCars: r.get('numberOfCars'),
            estimatedKM: r.get('estimatedKM'),
            suggestedVehicle: r.get('suggestedVehicle'),
            isAC: r.get('isAC'),
            routeGeometry: (() => { try { return r.get('routeGeometry') && r.get('routeGeometry') !== '[]' ? JSON.parse(r.get('routeGeometry')) : undefined; } catch(e) { return undefined; } })(),
            rideStatus,
            paymentStatus: r.get('paymentStatus'),
            fareAmount: r.get('fareAmount'),
            refundStatus: r.get('refundStatus'),
            refundAmount: r.get('refundAmount') ? parseFloat(r.get('refundAmount')) : undefined,
            timestamp: r.get('timestamp'),
            weddingDetails: (() => { try { return r.get('weddingDetails') && r.get('weddingDetails') !== 'N/A' ? JSON.parse(r.get('weddingDetails')) : undefined; } catch(e) { return undefined; } })(),
            intercityDetails: (() => { try { return r.get('intercityDetails') && r.get('intercityDetails') !== 'N/A' ? JSON.parse(r.get('intercityDetails')) : undefined; } catch(e) { return undefined; } })(),
            airportDetails: (() => { try { return r.get('airportDetails') && r.get('airportDetails') !== 'N/A' ? JSON.parse(r.get('airportDetails')) : undefined; } catch(e) { return undefined; } })(),
            customRequirements: r.get('customRequirements'),
            driverDetails,
            vehicleDetails,
            visibilityMessage,
            assignedDriverEmail: showDetails ? assignedDriverEmail : undefined,
            assignedVehicleId: showDetails ? assignedVehicleId : undefined,
            assignments: showDetails ? assignments : undefined
          };
        });

      if (finalUserId) {
        bookings = bookings.filter(b => b.userId === finalUserId);
      }

      // Pagination
      const startIndex = (parsedPage - 1) * parsedLimit;
      const endIndex = startIndex + parsedLimit;
      const paginatedBookings = bookings.slice(startIndex, endIndex);

      res.json(paginatedBookings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  app.put('/api/bookings/:id', authenticateToken, async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const authUser = (req as any).user;
    const isUserAdmin = authUser.role === 'admin' || authUser.role === 'staff';

    const { id } = req.params;
    const { rideStatus, paymentStatus, refundStatus, refundAmount } = req.body;
    
    try {
      const sheet = doc.sheetsByTitle['Bookings'];
      const rows = await getCachedRows('Bookings');
      const row = rows.find(r => r.get('id') === id);
      
      if (!row) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (!isUserAdmin && row.get('userId') !== authUser.id) {
        return res.status(403).json({ error: 'Forbidden: You do not own this booking' });
      }

      if (rideStatus === 'Cancelled' && !isUserAdmin) {
        const rideDateStr = row.get('rideDate');
        if (rideDateStr) {
          const rideTime = new Date(rideDateStr);
          const nowIST = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
          );

          const diffInHours = (rideTime.getTime() - nowIST.getTime()) / (1000 * 60 * 60);

          if (diffInHours < 2) {
            return res.status(400).json({
              error: "Cancellation not allowed",
              message: "You can cancel the ride only up to 2 hours before departure."
            });
          }
        }
      }

      const oldPaymentStatus = row.get('paymentStatus');
      const oldRideStatus = row.get('rideStatus');
      const oldRefundStatus = row.get('refundStatus');

      if (oldRideStatus === 'Completed' && oldPaymentStatus === 'Paid') {
        return res.status(400).json({ error: 'Cannot modify a completed and paid ride.' });
      }

      if (oldRefundStatus === 'Processed' && refundStatus && refundStatus !== 'Processed') {
        return res.status(400).json({ error: 'Cannot change refund status once it is Processed.' });
      }

      console.log(`Updating booking ${id}:`, { rideStatus, paymentStatus, refundStatus, refundAmount });

      if (rideStatus) row.set('rideStatus', rideStatus);
      if (paymentStatus) row.set('paymentStatus', paymentStatus);
      if (refundStatus !== undefined) row.set('refundStatus', refundStatus);
      if (refundAmount !== undefined) row.set('refundAmount', refundAmount.toString());
      
      await row.save();
      invalidateCache('Bookings');

      // Log revenue if payment status changed to Paid
      if (paymentStatus === 'Paid' && oldPaymentStatus !== 'Paid') {
        try {
          const fareAmount = parseFloat(row.get('fareAmount') || '0');
          const date = new Date();
          const month = date.toLocaleString('default', { month: 'short' });
          const year = date.getFullYear().toString();
          
          const revenueSheet = doc.sheetsByTitle['Revenue Logs'];
          const revRows = await getCachedRows('Revenue Logs');
          const revRow = revRows.find(r => r.get('month') === month && r.get('year') === year);
          
          if (revRow) {
            const currentAmount = parseFloat(revRow.get('amount') || '0');
            revRow.set('amount', currentAmount + fareAmount);
            await revRow.save();
          } else {
            await revenueSheet.addRow({
              id: Date.now().toString(),
              month,
              year,
              amount: fareAmount,
              timestamp: new Date().toISOString()
            });
          }
          invalidateCache('Revenue Logs');
        } catch (revError) {
          console.error('Failed to log revenue:', revError);
        }
      }

      // Deduct revenue if refund status changed to Processed
      console.log(`Checking refund deduction: refundStatus=${refundStatus}, oldRefundStatus=${oldRefundStatus}`);
      if (refundStatus === 'Processed' && oldRefundStatus !== 'Processed') {
        try {
          const refundAmt = parseFloat(row.get('refundAmount') || '0');
          console.log(`Deducting refund amount: ${refundAmt}`);
          if (refundAmt > 0) {
            const date = new Date();
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear().toString();
            
            const revenueSheet = doc.sheetsByTitle['Revenue Logs'];
            const revRows = await getCachedRows('Revenue Logs');
            const revRow = revRows.find(r => r.get('month') === month && r.get('year') === year);
            
            if (revRow) {
              const currentAmount = parseFloat(revRow.get('amount') || '0');
              console.log(`Updating existing revenue row: currentAmount=${currentAmount}, newAmount=${currentAmount - refundAmt}`);
              revRow.set('amount', currentAmount - refundAmt);
              await revRow.save();
            } else {
              console.log(`Creating new revenue row for refund: amount=${-refundAmt}`);
              await revenueSheet.addRow({
                id: Date.now().toString(),
                month,
                year,
                amount: -refundAmt,
                timestamp: new Date().toISOString()
              });
            }
            invalidateCache('Revenue Logs');
            
            // Also notify clients about revenue update
            io.emit('revenue:updated');
          }
        } catch (revError) {
          console.error('Failed to deduct revenue for refund:', revError);
        }
      }

      const updatedBooking = {
        id: row.get('id'),
        userId: row.get('userId'),
        userName: row.get('userName'),
        fromLocation: row.get('fromLocation'),
        toLocation: row.get('toLocation'),
        rideDate: row.get('rideDate'),
        rideStatus: row.get('rideStatus'),
        paymentStatus: row.get('paymentStatus'),
        fareAmount: row.get('fareAmount'),
        refundStatus: row.get('refundStatus'),
        refundAmount: row.get('refundAmount') ? parseFloat(row.get('refundAmount')) : undefined,
        timestamp: row.get('timestamp')
      };

      console.log('Broadcasting updatedBooking:', updatedBooking);

      // Notify all clients about the updated booking
      io.emit('booking:updated', updatedBooking);
      
      res.json(updatedBooking);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Drivers and Vehicles Routes
  // Revenue Logs Route
  app.get('/api/revenue', authenticateToken, requireAdmin, async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    const isForceRefresh = req.query.forceRefresh === 'true';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    try {
      const sheet = doc.sheetsByTitle['Revenue Logs'];
      const rows = await getCachedRows('Revenue Logs', isForceRefresh);
      
      const data = rows.map(r => ({
        month: r.get('month'),
        year: r.get('year'),
        amount: parseFloat(r.get('amount') || '0')
      }));

      const startIndex = (page - 1) * limit;
      const paginatedData = data.slice(startIndex, startIndex + limit);

      res.json(paginatedData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch revenue logs' });
    }
  });

  // System Logs Route
  app.post('/api/logs', async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });
    
    try {
      const sheet = doc.sheetsByTitle['System Logs'];
      if (!sheet) return res.status(404).json({ error: 'System Logs sheet not found' });
      
      await sheet.addRow({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: req.body.level || 'info',
        message: req.body.message || '',
        context: req.body.context || ''
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to write logs' });
    }
  });

  // Report Generation
  app.get('/api/reports/monthly', authenticateToken, requireAdmin, async (req, res) => {
    const doc = getDoc();
    if (!doc) return res.status(500).json({ error: 'Google Sheets not configured' });

    try {
      const sheet = doc.sheetsByTitle['Bookings'];
      const rows = await getCachedRows('Bookings');
      
      const bookings = rows.map(r => ({
        rideStatus: r.get('rideStatus'),
        paymentStatus: r.get('paymentStatus'),
        fareAmount: parseFloat(r.get('fareAmount') || '0')
      }));

      const totalRides = bookings.length;
      const completedRides = bookings.filter(b => b.rideStatus === 'Completed').length;
      const pendingRides = bookings.filter(b => b.rideStatus === 'Pending').length;
      const confirmedRides = bookings.filter(b => b.rideStatus === 'Confirmed').length;
      const totalRevenue = bookings.filter(b => b.paymentStatus === 'Paid').reduce((sum, b) => sum + b.fareAmount, 0);

      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=monthly_report.pdf');
      
      pdfDoc.pipe(res);
      
      pdfDoc.fontSize(25).text('Vishal Tour & Travelers', { align: 'center' });
      pdfDoc.moveDown();
      pdfDoc.fontSize(18).text('Monthly Revenue Report', { align: 'center' });
      pdfDoc.moveDown();
      
      pdfDoc.fontSize(14).text(`Date Generated: ${new Date().toLocaleDateString()}`);
      pdfDoc.moveDown();
      
      pdfDoc.text(`Total Rides: ${totalRides}`);
      pdfDoc.text(`Completed Rides: ${completedRides}`);
      pdfDoc.text(`Pending Rides: ${pendingRides}`);
      pdfDoc.text(`Confirmed Rides: ${confirmedRides}`);
      pdfDoc.moveDown();
      
      pdfDoc.fontSize(16).text(`Total Revenue: $${totalRevenue.toFixed(2)}`, { underline: true });
      
      pdfDoc.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  app.get('/calculate-distance', async (req, res) => {
    let { from, to, destinations, isAC } = req.query;
    
    if (from && typeof from === 'string' && from.length > 200) from = from.substring(0, 200);
    if (to && typeof to === 'string' && to.length > 200) to = to.substring(0, 200);
    if (destinations && typeof destinations === 'string' && destinations.length > 1000) destinations = destinations.substring(0, 1000);

    if (!from) {
      return res.status(400).json({ error: 'from is required' });
    }
    
    if (!to && !destinations) {
      return res.status(400).json({ error: 'Either to or destinations is required' });
    }

    try {
      // Helper function to get coordinates
      const getCoordinates = async (city: string) => {
        // Clean up city name for better geocoding results
        let searchCity = city.replace(/ Railway Station/i, '').replace(/ Airport/i, '').replace(/ Bus Station/i, '').replace(/ Bus Stand/i, '').trim();
        
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchCity)}&count=1&language=en&format=json`;
        const res = await axios.get(url, { timeout: 10000 });
        if (!res.data || !res.data.results || res.data.results.length === 0) {
          throw new Error(`City not found: ${city}`);
        }
        return {
          lat: res.data.results[0].latitude,
          lon: res.data.results[0].longitude
        };
      };

      // Helper function to calculate distance between two coordinates
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

      const fromCoords = await getCoordinates(from as string);
      const seoniCoords = await getCoordinates('Seoni');
      
      let totalDistance = 0;
      const fromCity = (from as string).trim().toLowerCase();
      
      let waypoints: { lat: number, lon: number }[] = [];
      
      if (destinations) {
        let destArray = [];
        try {
          destArray = JSON.parse(destinations as string);
        } catch(e) {
          // If it's not JSON, assume it's a single destination string
          destArray = [destinations as string];
        }
        for (const dest of destArray) {
          waypoints.push(await getCoordinates(dest));
        }
      } else if (to) {
        waypoints.push(await getCoordinates(to as string));
      }
      
      if (waypoints.length === 0) {
        return res.status(400).json({ error: 'No valid destinations provided' });
      }

      // Calculate total distance
      let currentCoords = fromCoords;
      let oneWayDistance = 0;
      
      // pickup -> dest1 -> dest2 -> ... -> destN
      for (const wp of waypoints) {
        oneWayDistance += calculateLegDistance(currentCoords.lat, currentCoords.lon, wp.lat, wp.lon);
        currentCoords = wp;
      }
      
      // Always charge for going and coming back
      totalDistance = oneWayDistance * 2;

      const distanceRounded = totalDistance.toFixed(2);
      const perKmRate = isAC === 'true' ? 14 : 13;
      const basePrice = totalDistance * perKmRate;
      const finalPrice = Math.ceil(basePrice / 100) * 100;

      return res.json({
        distance: distanceRounded,
        price: finalPrice.toFixed(2)
      });
    } catch (error: any) {
      if (error.message && error.message.startsWith('City not found:')) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Distance calculation error:', error);
      return res.status(500).json({ error: error.message || 'Failed to calculate distance' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
