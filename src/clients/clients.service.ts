import { Injectable, NotFoundException } from '@nestjs/common'; // Import NotFoundException
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(@InjectModel(Client.name) private clientModel: Model<ClientDocument>) {}

  async findAll(userId: string): Promise<Client[]> {
    return this.clientModel.find({ userId }).exec();
  }

  async findOne(id: string, userId: string): Promise<Client> {
    const client = await this.clientModel.findOne({ _id: id, userId }).exec();
    if (!client) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }
    return client;
  }

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const createdClient = new this.clientModel(createClientDto);
    return createdClient.save();
  }

  async update(id: string, updateClientDto: CreateClientDto): Promise<Client> {
    const existingClient = await this.clientModel.findOneAndUpdate({ _id: id, userId: updateClientDto.userId }, updateClientDto, { new: true }).exec();
    if (!existingClient) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }
    return existingClient;
  }

  async remove(id: string, userId: string): Promise<any> {
    const result = await this.clientModel.findOneAndDelete({ _id: id, userId }).exec();
    if (!result) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }
    return result;
  }
}