import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Mapeo central equivalente a `bootstrap/app.php`:
 * 422 validación, 409 negocio, 404/403/401/429 con mensajes en español y sin
 * traza hacia el cliente. La forma de salida es siempre `{ message, errors? }`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      message: 'Error interno del servidor.',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        body = { message: res };
      } else if (res && typeof res === 'object') {
        const payload = res as {
          message?: unknown;
          errors?: unknown;
          retryAfter?: unknown;
        };
        const rawMessage = payload.message ?? exception.message;
        body = {
          message: Array.isArray(rawMessage)
            ? rawMessage.join(' ')
            : rawMessage,
        };
        if (payload.errors) {
          body.errors = payload.errors;
        }
        if (payload.retryAfter !== undefined) {
          response.setHeader('Retry-After', String(payload.retryAfter));
        }
      }
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }
}
