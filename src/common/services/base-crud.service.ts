// src/common/services/base-crud.service.ts
// Base service class to reduce code duplication across CRUD services

import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Model, Document, FilterQuery } from 'mongoose';

export interface CrudOptions {
  populateFields?: string[];
  selectFields?: string[];
  sortBy?: string;
}

@Injectable()
export abstract class BaseCrudService<
  T extends Document,
  CreateDto = any,
  UpdateDto = any
> {
  protected readonly logger: Logger;

  protected constructor(
    protected readonly model: Model<T>,
    protected readonly entityName: string,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Find all documents with optional filtering
   */
  async findAll(
    filter: FilterQuery<T> = {},
    options: CrudOptions = {},
  ): Promise<T[]> {
    try {
      let query = this.model.find(filter);

      if (options.populateFields?.length) {
        options.populateFields.forEach(field => {
          query = query.populate(field) as any;
        });
      }

      if (options.selectFields?.length) {
        query = query.select(options.selectFields.join(' ')) as any;
      }

      if (options.sortBy) {
        query = query.sort(options.sortBy);
      }

      const documents = await query.exec();
      return documents.map(doc => doc.toObject() as T);
    } catch (error) {
      this.handleError(error, 'finding');
    }
  }

  /**
   * Find a single document by ID
   */
  async findOne(
    id: string,
    filter: FilterQuery<T> = {},
    options: CrudOptions = {},
  ): Promise<T> {
    try {
      let query = this.model.findOne({ _id: id, ...filter });

      if (options.populateFields?.length) {
        options.populateFields.forEach(field => {
          query = query.populate(field) as any;
        });
      }

      if (options.selectFields?.length) {
        query = query.select(options.selectFields.join(' ')) as any;
      }

      const document = await query.exec();

      if (!document) {
        throw new NotFoundException(
          `${this.entityName} with ID "${id}" not found`,
        );
      }

      return document.toObject() as T;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleError(error, 'finding');
    }
  }

  /**
   * Create a new document
   */
  async create(createDto: CreateDto): Promise<T> {
    try {
      const document = new this.model(createDto);
      const saved = await document.save();
      return saved.toObject() as T;
    } catch (error) {
      this.handleError(error, 'creating');
    }
  }

  /**
   * Update an existing document
   */
  async update(
    id: string,
    updateDto: UpdateDto,
    filter: FilterQuery<T> = {},
  ): Promise<T> {
    try {
      const document = await this.model
        .findOneAndUpdate(
          { _id: id, ...filter },
          updateDto as any,
          { new: true, runValidators: true },
        )
        .exec();

      if (!document) {
        throw new NotFoundException(
          `${this.entityName} with ID "${id}" not found`,
        );
      }

      return document.toObject() as T;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleError(error, 'updating');
    }
  }

  /**
   * Delete a document
   */
  async remove(id: string, filter: FilterQuery<T> = {}): Promise<T> {
    try {
      const document = await this.model
        .findOneAndDelete({ _id: id, ...filter })
        .exec();

      if (!document) {
        throw new NotFoundException(
          `${this.entityName} with ID "${id}" not found`,
        );
      }

      return document.toObject() as T;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleError(error, 'deleting');
    }
  }

  /**
   * Count documents
   */
  async count(filter: FilterQuery<T> = {}): Promise<number> {
    try {
      return await this.model.countDocuments(filter).exec();
    } catch (error) {
      this.handleError(error, 'counting');
    }
  }

  /**
   * Check if a document exists
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const count = await this.model.countDocuments(filter).exec();
      return count > 0;
    } catch (error) {
      this.handleError(error, 'checking existence');
    }
  }

  /**
   * Find documents with pagination
   */
  async findPaginated(
    filter: FilterQuery<T> = {},
    page: number = 1,
    limit: number = 10,
    options: CrudOptions = {},
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      
      let query = this.model.find(filter).skip(skip).limit(limit);

      if (options.populateFields?.length) {
        options.populateFields.forEach(field => {
          query = query.populate(field) as any;
        });
      }

      if (options.selectFields?.length) {
        query = query.select(options.selectFields.join(' ')) as any;
      }

      if (options.sortBy) {
        query = query.sort(options.sortBy);
      }

      const [data, total] = await Promise.all([
        query.exec(),
        this.count(filter),
      ]);

      return {
        data: data.map(doc => doc.toObject() as T),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.handleError(error, 'paginating');
    }
  }

  /**
   * Handle errors uniformly
   */
  protected handleError(error: any, operation: string): never {
    const message = `Error ${operation} ${this.entityName}`;
    
    if (error.code === 11000) {
      throw new InternalServerErrorException(
        `${this.entityName} already exists`,
      );
    }

    if (error.name === 'ValidationError') {
      throw new InternalServerErrorException(
        `Validation error: ${error.message}`,
      );
    }

    console.error(`${message}:`, error);
    throw new InternalServerErrorException(message);
  }
}

/**
 * Base service for user-scoped resources
 */
export abstract class UserScopedCrudService<
  T extends Document & { userId: string },
  CreateDto = any,
  UpdateDto = any
> extends BaseCrudService<T, CreateDto, UpdateDto> {
  
  /**
   * Find all documents for a specific user
   */
  async findAllForUser(
    userId: string,
    additionalFilter: FilterQuery<T> = {},
    options: CrudOptions = {},
  ): Promise<T[]> {
    return this.findAll({ userId, ...additionalFilter } as FilterQuery<T>, options);
  }

  /**
   * Find one document for a specific user
   */
  async findOneForUser(
    id: string,
    userId: string,
    options: CrudOptions = {},
  ): Promise<T> {
    return this.findOne(id, { userId } as FilterQuery<T>, options);
  }

  /**
   * Update a document for a specific user
   */
  async updateForUser(
    id: string,
    userId: string,
    updateDto: UpdateDto,
  ): Promise<T> {
    return this.update(id, updateDto, { userId } as FilterQuery<T>);
  }

  /**
   * Delete a document for a specific user
   */
  async removeForUser(id: string, userId: string): Promise<T> {
    return this.remove(id, { userId } as FilterQuery<T>);
  }

  /**
   * Count documents for a specific user
   */
  async countForUser(
    userId: string,
    additionalFilter: FilterQuery<T> = {},
  ): Promise<number> {
    return this.count({ userId, ...additionalFilter } as FilterQuery<T>);
  }
}