import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';
import { runSeed } from './seed';

async function main(): Promise<void> {
  const dataSource = new DataSource(buildDataSourceOptions());
  await dataSource.initialize();
  await runSeed(dataSource);
  await dataSource.destroy();
  console.log('Seed completado correctamente.');
}

void main();
