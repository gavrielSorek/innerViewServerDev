// Fix src/notes/notes.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { BaseCrudService } from '../common/services/base-crud.service';
import { ResourceNotFoundError } from '../common/errors/custom-errors';

@Injectable()
export class NotesService extends BaseCrudService<
  NoteDocument,
  CreateNoteDto,
  UpdateNoteDto
> {
  constructor(
    @InjectModel(Note.name)
    noteModel: Model<NoteDocument>,
  ) {
    super(noteModel, 'Note');
  }

  /**
   * Override base methods to match expected signatures
   */
  async findAll(
    filter: FilterQuery<NoteDocument> = {},
    options?: any,
  ): Promise<NoteDocument[]> {
    // If called with legacy signature (userId, clientId)
    if (typeof filter === 'string' && typeof options === 'string') {
      const userId = filter;
      const clientId = options;
      return super.findAll({ userId, clientId }, { sortBy: '-updatedAt' });
    }
    // Normal call
    return super.findAll(filter, options);
  }

  async findOne(
    id: string,
    filter: FilterQuery<NoteDocument> = {},
    options?: any,
  ): Promise<NoteDocument> {
    // If called with legacy signature (id, clientId, userId)
    if (typeof filter === 'string' && typeof options === 'string') {
      const clientId = filter;
      const userId = options;
      return super.findOne(id, { clientId, userId });
    }
    // Normal call
    return super.findOne(id, filter, options);
  }

  async create(createDto: CreateNoteDto): Promise<NoteDocument> {
    // Handle extended DTO with timestamps
    const dto = createDto as any;
    const noteData = {
      ...dto,
      createdAt: dto.createdAt || new Date().toISOString(),
      updatedAt: dto.updatedAt || new Date().toISOString(),
    };
    return super.create(noteData);
  }

  async update(
    id: string,
    updateDto: UpdateNoteDto,
    filter?: FilterQuery<NoteDocument>,
  ): Promise<NoteDocument> {
    // Handle the extended DTO with clientId and userId
    const dto = updateDto as any;
    if (dto.clientId && dto.userId) {
      const { clientId, userId, ...updateData } = dto;
      const noteData = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      return super.update(id, noteData, { clientId, userId });
    }
    return super.update(id, { ...updateDto, updatedAt: new Date().toISOString() }, filter);
  }

  async remove(
    id: string,
    filter?: FilterQuery<NoteDocument>,
  ): Promise<NoteDocument> {
    // Handle legacy signature (id, clientId, userId)
    if (arguments.length === 3) {
      const clientId = arguments[1];
      const userId = arguments[2];
      return super.remove(id, { clientId, userId });
    }
    return super.remove(id, filter);
  }

  // Add convenience methods that match controller expectations
  async findAllForUserAndClient(userId: string, clientId: string): Promise<Note[]> {
    const docs = await this.findAll({ userId, clientId }, { sortBy: '-updatedAt' });
    return docs.map(doc => doc.toObject() as Note);
  }

  async findOneForUserAndClient(
    id: string,
    clientId: string,
    userId: string,
  ): Promise<Note> {
    const doc = await this.findOne(id, { clientId, userId });
    if (!doc) {
      throw new ResourceNotFoundError('Note', id);
    }
    return doc.toObject() as Note;
  }

  async createForUserAndClient(
    createNoteDto: CreateNoteDto & { clientId: string; userId: string },
  ): Promise<Note> {
    const doc = await this.create(createNoteDto);
    return doc.toObject() as Note;
  }

  async updateForUserAndClient(
    id: string,
    updateNoteDto: UpdateNoteDto & { clientId: string; userId: string },
  ): Promise<Note> {
    const { clientId, userId, ...updateData } = updateNoteDto;
    const noteData = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    const doc = await this.update(id, noteData, { clientId, userId });
    if (!doc) {
      throw new ResourceNotFoundError('Note', id);
    }
    return doc.toObject() as Note;
  }

  async removeForUserAndClient(
    id: string,
    clientId: string,
    userId: string,
  ): Promise<Note> {
    const doc = await this.remove(id, { clientId, userId });
    if (!doc) {
      throw new ResourceNotFoundError('Note', id);
    }
    return doc.toObject() as Note;
  }

  /**
   * Additional methods
   */
  async searchByContent(
    userId: string,
    clientId: string,
    searchTerm: string,
  ): Promise<Note[]> {
    const filter: FilterQuery<NoteDocument> = {
      userId,
      clientId,
      content: { $regex: searchTerm, $options: 'i' },
    };
    const docs = await super.findAll(filter, { sortBy: '-updatedAt' });
    return docs.map(doc => doc.toObject() as Note);
  }

  async getRecentNotes(
    userId: string,
    clientId: string,
    limit: number = 5,
  ): Promise<Note[]> {
    const filter: FilterQuery<NoteDocument> = { userId, clientId };
    const notes = await this.model
      .find(filter)
      .sort('-updatedAt')
      .limit(limit)
      .exec();
    
    return notes.map(note => note.toObject() as Note);
  }

  async countForClient(userId: string, clientId: string): Promise<number> {
    return super.count({ userId, clientId });
  }
}