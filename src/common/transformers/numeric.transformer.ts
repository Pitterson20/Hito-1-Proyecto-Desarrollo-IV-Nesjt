import { ValueTransformer } from 'typeorm';

/**
 * SQLite devuelve las columnas `decimal` como string. Laravel hace cast a
 * `decimal:2` y expone valores numéricos, así que normalizamos la lectura a
 * `number` para mantener paridad en las respuestas.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};
