// src/clients/clients.service.ts
// Complete fixed version

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
   * Override removeForUser to also delete FutureGraph data
   * Returns the document type as expected by base class
   */
  async removeForUser(id: string, userId: string): Promise<ClientDocument> {
    // First check if client exists
    const client = await this.findOneForUser(id, userId);
    
    // Delete all FutureGraph sessions for this client
    try {
      const futuregraphDeletion = await this.futuregraphService.deleteClientSessions(
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
    }

    // Delete the client using base method - returns ClientDocument
    return super.removeForUser(id, userId);
  }

  // Legacy methods for backward compatibility
  // These methods have different signatures than the base class
  // so we rename them to avoid conflicts
  
  async findAllClients(userId: string): Promise<Client[]> {
    const docs = await this.findAllForUser(userId);
    return docs.map(doc => doc.toObject() as Client);
  }

  async findOneClient(id: string, userId: string): Promise<Client> {
    const doc = await this.findOneForUser(id, userId);
    if (!doc) {
      throw new ResourceNotFoundError('Client', id);
    }
    return doc.toObject() as Client;
  }

  async createClient(createClientDto: CreateClientDto): Promise<Client> {
    const doc = await super.create(createClientDto);
    return doc.toObject() as Client;
  }

  async updateClient(
    id: string,
    updateClientDto: CreateClientDto & { userId: string },
  ): Promise<Client> {
    const doc = await this.updateForUser(
      id,
      updateClientDto.userId,
      updateClientDto,
    );
    if (!doc) {
      throw new ResourceNotFoundError('Client', id);
    }
    return doc.toObject() as Client;
  }

  async removeClient(id: string, userId: string): Promise<any> {
    const client = await this.findOneForUser(id, userId);
    const clientObj = client.toObject() as Client;
    
    // Delete and get futuregraph info
    let futuregraphDeletion;
    try {
      futuregraphDeletion = await this.futuregraphService.deleteClientSessions(
        id,
        userId,
      );
    } catch (error) {
      futuregraphDeletion = {
        sessionsDeleted: 0,
        imagesDeleted: 0,
        focusReportsDeleted: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }

    // Now delete the client
    await super.removeForUser(id, userId);

    return {
      client: clientObj,
      futuregraphDeletion,
    };
  }
  
  // Add wrapper methods that match the controller expectations
  // These delegate to the renamed methods above
  async findAll(userId: string): Promise<Client[]> {
    return this.findAllClients(userId);
  }

  async findOne(id: string, userId: string): Promise<Client> {
    return this.findOneClient(id, userId);
  }

  async create(createClientDto: CreateClientDto): Promise<Client> {
    return this.createClient(createClientDto);
  }

  async update(
    id: string,
    updateClientDto: CreateClientDto & { userId: string },
  ): Promise<Client> {
    return this.updateClient(id, updateClientDto);
  }

  async remove(id: string, userId: string): Promise<any> {
    return this.removeClient(id, userId);
  }
}