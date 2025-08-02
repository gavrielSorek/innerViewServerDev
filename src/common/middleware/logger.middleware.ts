// src/common/middleware/logger.middleware.ts
// Request logging middleware

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      
      console.log(
        `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} ${duration}ms`,
      );
    });

    next();
  }
}