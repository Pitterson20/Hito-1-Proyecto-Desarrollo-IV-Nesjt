import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';

/**
 * Configuración única de la base de datos para la app, el CLI de seed y los
 * tests e2e. En `test` usa SQLite en memoria; en desarrollo un archivo
 * compartido (`data/database.sqlite`) para poder reutilizar los mismos datos
 * que Laravel/.NET.
 */
export function buildDataSourceOptions(): DataSourceOptions {
  const isTest = process.env.NODE_ENV === 'test';
  const database = isTest
    ? ':memory:'
    : (process.env.DB_DATABASE ?? 'data/database.sqlite');

  if (!isTest && database !== ':memory:') {
    mkdirSync(dirname(database), { recursive: true });
  }

  return {
    type: 'better-sqlite3',
    database,
    entities: ENTITIES,
    synchronize: true,
    dropSchema: isTest,
  };
}
