import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

export const SKIP_ENVELOPE = Symbol("SKIP_ENVELOPE");

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) return data;
        if (data && typeof data === "object" && SKIP_ENVELOPE in data) {
          return (data as { [SKIP_ENVELOPE]: unknown })[SKIP_ENVELOPE];
        }
        return { success: true, data };
      }),
    );
  }
}
