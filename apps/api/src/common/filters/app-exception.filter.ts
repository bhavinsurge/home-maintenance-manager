import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const requestId =
      (typeof request.headers?.['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : undefined) ?? undefined;

    if (exception instanceof AppError) {
      if (exception.status >= 500) {
        this.logger.error(exception.message, exception.stack);
      }
      return this.send(
        response,
        exception.status,
        {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
        requestId,
      );
    }

    if (exception instanceof ZodError) {
      return this.send(
        response,
        400,
        {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: exception.flatten(),
        },
        requestId,
      );
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && body && 'message' in body
            ? Array.isArray(body.message)
              ? (body as { message: string[] }).message.join(', ')
              : String(body.message)
            : exception.message;
      return this.send(
        response,
        status,
        {
          code:
            status === 401
              ? 'UNAUTHORIZED'
              : status === 403
                ? 'FORBIDDEN'
                : 'BAD_REQUEST',
          message,
          details: null,
        },
        requestId,
      );
    }

    this.logger.error(
      exception instanceof Error ? exception.message : 'Unhandled error',
      exception instanceof Error ? exception.stack : undefined,
    );
    return this.send(
      response,
      HttpStatus.INTERNAL_SERVER_ERROR,
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: null,
      },
      requestId,
    );
  }

  private send(
    response: Response,
    status: number,
    error: { code: string; message: string; details: unknown },
    requestId?: string,
  ) {
    if (requestId) {
      response.setHeader('x-request-id', requestId);
    }
    response.status(status).json({
      success: false,
      error,
    });
  }
}
