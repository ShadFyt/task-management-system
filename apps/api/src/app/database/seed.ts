import { NestFactory } from '@nestjs/core';
import { DatabaseSeederService } from './database-seeder.service';
import { AppModule } from '../app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(DatabaseSeederService);

  await seeder.seedAll();
  await app.close();
}

bootstrap();
