// src/clients/clients.service.ts
// Refactored with proper typing but not extending base service due to signature conflicts

import { Injectable, Inject, forwardRef, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';
import { FuturegraphService } from '../futuregraph/futuregraph.service';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectModel(Client.name)
    private clientModel: Model<ClientDocument>,
    @Inject(forwardRef(() => FuturegraphService))
    private futuregraphService: FuturegraphService,
  ) {}

  /**
   * Fetch all clients for a given user.
   */
  async findAll(userId: string): Promise<Client[]> {
    return this.clientModel.find({ userId }).exec();
  }

  /**
   * Locate a single client by its id and owning user.
   */
  async findOne(id: string, userId: string): Promise<Client> {
    const client = await this.clientModel.findOne({ _id: id, userId }).exec();
    if (!client) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }
    return client;
  }

  /**
   * Create a new client document.
   */
  async create(createClientDto: CreateClientDto): Promise<Client> {
    const createdClient = new this.clientModel(createClientDto);
    return createdClient.save();
  }

  /**
   * Update an existing client.
   */
  async update(
    id: string,
    updateClientDto: CreateClientDto & { userId: string },
  ): Promise<Client> {
    const existingClient = await this.clientModel
      .findOneAndUpdate(
        { _id: id, userId: updateClientDto.userId },
        updateClientDto,
        { new: true },
      )
      .exec();

    if (!existingClient) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }

    return existingClient.toObject();
  }

  /**
   * Remove a client and all associated FutureGraph data
   */
  async remove(id: string, userId: string): Promise<{
    client: Client;
    futuregraphDeletion?: {
      sessionsDeleted: number;
      imagesDeleted: number;
      focusReportsDeleted: number;
      errors: string[];
    };
  }> {
    // First check if client exists
    const client = await this.clientModel.findOne({ _id: id, userId }).exec();
    
    if (!client) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }

    // Delete all FutureGraph sessions for this client
    let futuregraphDeletion;
    try {
      futuregraphDeletion = await this.futuregraphService.deleteClientSessions(
        id,
        userId,
      );
      
      this.logger.log(
        `Deleted FutureGraph data for client ${id}: ` +
        `${futuregraphDeletion.sessionsDeleted} sessions, ` +
        `${futuregraphDeletion.imagesDeleted} images, ` +
        `${futuregraphDeletion.focusReportsDeleted} focus reports`,
      );
    } catch (error) {
      this.logger.error(`Error deleting FutureGraph data for client ${id}:`, error);
      futuregraphDeletion = {
        sessionsDeleted: 0,
        imagesDeleted: 0,
        focusReportsDeleted: 0,
        errors: [error.message],
      };
    }

    // Delete the client
    await this.clientModel.deleteOne({ _id: id, userId }).exec();

    return {
      client: client.toObject(),
      futuregraphDeletion,
    };
  }
}