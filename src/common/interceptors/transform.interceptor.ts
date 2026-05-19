import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';

export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

const PASSTHROUGH_KEYS = new Set(['data', 'meta']);

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((payload) => {
        // Pass through already-shaped paginated responses { data, meta }
        if (
          payload !== null &&
          typeof payload === 'object' &&
          Object.keys(payload as object).some((k) => PASSTHROUGH_KEYS.has(k))
        ) {
          return payload;
        }
        return {
          success: true as const,
          data: payload,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
