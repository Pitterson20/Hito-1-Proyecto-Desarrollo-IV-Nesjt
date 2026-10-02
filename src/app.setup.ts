import {
  INestApplication,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { VALIDATION_ERROR_MESSAGE } from './common/exceptions/validation.exception';

function formatErrors(
  errors: ValidationError[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    const messages: string[] = [];
    if (error.constraints) {
      for (const [key, message] of Object.entries(error.constraints)) {
        messages.push(
          key === 'whitelistValidation'
            ? `El campo ${error.property} no está permitido.`
            : message,
        );
      }
    }
    if (error.children?.length) {
      Object.assign(result, formatErrors(error.children));
    }
    if (messages.length) {
      result[error.property] = messages;
    }
  }

  return result;
}

/**
 * Prefijo global `api`, validación global (422 con `errors` por campo) y filtro
 * global. Se comparte con los tests para que las respuestas sean idénticas.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          message: VALIDATION_ERROR_MESSAGE,
          errors: formatErrors(errors),
        }),
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}
