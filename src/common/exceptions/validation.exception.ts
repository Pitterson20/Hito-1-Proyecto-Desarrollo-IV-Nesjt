import { UnprocessableEntityException } from '@nestjs/common';

export const VALIDATION_ERROR_MESSAGE = 'Los datos enviados no son válidos.';

/**
 * Construye la misma forma que Laravel: `{ message, errors: { campo: [msgs] } }`.
 */
export function validationException(
  errors: Record<string, string[]>,
): UnprocessableEntityException {
  return new UnprocessableEntityException({
    message: VALIDATION_ERROR_MESSAGE,
    errors,
  });
}
