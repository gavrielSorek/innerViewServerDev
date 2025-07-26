import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';

/**
 * Service encapsulating all client CRUD operations.  Typings have been
 * strengthened so that the injected Mongoose model carries the
 * appropriate document interface and each public method advertises its
 * return type.  This improves type-safety across the codebase and
 * assists tooling such as auto-completion.
 */
@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name)
    private clientModel: Model<ClientDocument>,
  ) {}

  /**
   * Fetch all clients for a given user.
   * @param userId The owning user's identifier
   */
  async findAll(userId: string): Promise<Client[]> {
    return this.clientModel.find({ userId }).exec();
  }

  /**
   * Locate a single client by its id and owning user.  Throws
   * NotFoundException if the document does not exist.
   * @param id The client's identifier
   * @param userId The owning user's identifier
   */
  async findOne(id: string, userId: string): Promise<Client> {
    const client = await this.clientModel.findOne({ _id: id, userId }).exec();
    if (!client) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }
    return client;
  }

  /**
   * Create a new client document.  The DTO must include the owning
   * userId so that the record is correctly scoped.
   */
  async create(createClientDto: CreateClientDto): Promise<Client> {
    const createdClient = new this.clientModel(createClientDto);
    return createdClient.save();
  }

  /**
   * Update an existing client.  The DTO must include the owning userId
   * to scope the update to the correct user.  Throws NotFoundException
   * if the document cannot be found.
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
    return existingClient;
  }

  /**
   * Remove a client by id and userId.  Throws NotFoundException when
   * there is no document to delete.
   */
  async remove(id: string, userId: string): Promise<Client> {
    const result = await this.clientModel.findOneAndDelete({ _id: id, userId }).exec();
    if (!result) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }
    return result;
  }
}