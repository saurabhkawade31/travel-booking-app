import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-123!!!';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if (!token && req.query.token) {
    token = req.query.token as string;
  }
  
  if (token == null) return res.sendStatus(401);
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    (req as any).user = user;
    next();
  });
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

export const requireOwnershipOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const targetId = req.params.id;
  
  if (!user) return res.status(403).json({ error: 'Forbidden' });
  
  if (user.id === targetId || user.role === 'admin' || user.role === 'staff') {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden: You do not have access to this resource' });
  }
};
