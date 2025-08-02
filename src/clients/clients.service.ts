// src/clients/clients.service.ts
// Service refactored to extend base service with proper typing

import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';
import { FuturegraphService } from '../futuregraph/futuregraph.service';
import { UserScopedCrudService } from '../common/services/base-crud.service';
import { ResourceNotFoundError } from '../common/errors/custom-errors';

@Injectable()
export class ClientsService extends UserScopedCrudService<
  ClientDocument,
  CreateClientDto,
  CreateClientDto
> {
  constructor(
    @InjectModel(Client.name)
    clientModel: Model<ClientDocument>,
    @Inject(forwardRef(() => FuturegraphService))
    private futuregraphService: FuturegraphService,
  ) {
    super(clientModel, 'Client');
  }

  /**
   * Override remove to also delete FutureGraph data
   */
  async removeForUser(id: string, userId: string): Promise<{
    client: Client;
    futuregraphDeletion?: {
      sessionsDeleted: number;
      imagesDeleted: number;
      focusReportsDeleted: number;
      errors: string[];
    };
  }> {
    // First check if client exists
    const client = await this.findOneForUser(id, userId);
    
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
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }

    // Delete the client using base method
    await super.removeForUser(id, userId);

    return {
      client: client as Client,
      futuregraphDeletion,
    };
  }

  // Legacy methods for backward compatibility
  async findAll(userId: string): Promise<Client[]> {
    return this.findAllForUser(userId);
  }

  async findOne(id: string, userId: string): Promise<Client> {
    const client = await this.findOneForUser(id, userId);
    if (!client) {
      throw new ResourceNotFoundError('Client', id);
    }
    return client;
  }

  async create(createClientDto: CreateClientDto): Promise<Client> {
    return super.create(createClientDto);
  }

  async update(
    id: string,
    updateClientDto: CreateClientDto & { userId: string },
  ): Promise<Client> {
    const client = await this.updateForUser(
      id,
      updateClientDto.userId,
      updateClientDto,
    );
    if (!client) {
      throw new ResourceNotFoundError('Client', id);
    }
    return client;
  }

  async remove(id: string, userId: string): Promise<any> {
    return this.removeForUser(id, userId);
  }
}