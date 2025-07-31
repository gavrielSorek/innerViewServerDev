import { Module, Global, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client, ClientSchema } from './schemas/client.schema';
import { FuturegraphModule } from '../futuregraph/futuregraph.module';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Client.name, schema: ClientSchema }]),
    forwardRef(() => FuturegraphModule), // Use forwardRef to handle circular dependency
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService, MongooseModule],
})
export class ClientsModule {}