import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('users/:userId/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(@Param('userId') userId: string) {
    return this.clientsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('userId') userId: string, @Param('id') id: string) {
    return this.clientsService.findOne(id, userId);
  }

  @Post()
  create(@Param('userId') userId: string, @Body() createClientDto: CreateClientDto) {
    return this.clientsService.create({ ...createClientDto, userId });
  }

  @Put(':id')
  update(@Param('userId') userId: string, @Param('id') id: string, @Body() updateClientDto: CreateClientDto) {
    return this.clientsService.update(id, { ...updateClientDto, userId });
  }

  @Delete(':id')
  remove(@Param('userId') userId: string, @Param('id') id: string) {
    return this.clientsService.remove(id, userId);
  }
}