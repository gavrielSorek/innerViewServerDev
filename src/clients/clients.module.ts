import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client, ClientSchema } from './schemas/client.schema';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Client.name, schema: ClientSchema }])],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService, MongooseModule],
})
export class ClientsModule {}