// src/common/middleware/correlation-id.middleware.ts
// Correlation ID middleware for request tracking

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    
    next();
  }
}