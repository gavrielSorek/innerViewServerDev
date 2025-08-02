// src/common/interceptors/logging.interceptor.ts
// Interceptor for logging requests and responses

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = (request as any).user?.uid || 'anonymous';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = ctx.getResponse();
          const statusCode = response.statusCode;
          const contentLength = response.get('content-length') || 0;
          const responseTime = Date.now() - now;

          this.logger.log(
            `${method} ${url} ${statusCode} ${responseTime}ms ${contentLength} - ${userId} - ${ip} - ${userAgent}`,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          const statusCode = error.status || 500;

          this.logger.error(
            `${method} ${url} ${statusCode} ${responseTime}ms - ${userId} - ${ip} - ${userAgent}`,
          );
        },
      }),
    );
  }
}