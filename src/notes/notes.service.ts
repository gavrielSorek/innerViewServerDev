// src/notes/notes.service.ts
// Service refactored to extend base service with proper typing

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { BaseCrudService } from '../common/services/base-crud.service';
import { ResourceNotFoundError } from '../common/errors/custom-errors';

interface NoteFilter extends FilterQuery<NoteDocument> {
  userId: string;
  clientId: string;
}

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
   * Find all notes for a user and client
   */
  async findAll(userId: string, clientId: string): Promise<Note[]> {
    const filter: NoteFilter = { userId, clientId };
    return super.findAll(filter, { sortBy: '-updatedAt' });
  }

  /**
   * Find one note with user/client validation
   */
  async findOne(id: string, clientId: string, userId: string): Promise<Note> {
    const filter: NoteFilter = { clientId, userId };
    const note = await super.findOne(id, filter);
    if (!note) {
      throw new ResourceNotFoundError('Note', id);
    }
    return note;
  }

  /**
   * Create a new note with proper typing
   */
  async create(
    createNoteDto: CreateNoteDto & { clientId: string; userId: string },
  ): Promise<Note> {
    const noteData = {
      ...createNoteDto,
      createdAt: createNoteDto.createdAt || new Date().toISOString(),
      updatedAt: createNoteDto.updatedAt || new Date().toISOString(),
    };
    return super.create(noteData);
  }

  /**
   * Update a note with validation
   */
  async update(
    id: string,
    updateNoteDto: UpdateNoteDto & { clientId: string; userId: string },
  ): Promise<Note> {
    const { clientId, userId, ...updateData } = updateNoteDto;
    const filter: NoteFilter = { clientId, userId };
    
    // Update the updatedAt timestamp
    const noteData = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    
    const note = await super.update(id, noteData, filter);
    if (!note) {
      throw new ResourceNotFoundError('Note', id);
    }
    return note;
  }

  /**
   * Remove a note with validation
   */
  async remove(id: string, clientId: string, userId: string): Promise<Note> {
    const filter: NoteFilter = { clientId, userId };
    const note = await super.remove(id, filter);
    if (!note) {
      throw new ResourceNotFoundError('Note', id);
    }
    return note;
  }

  /**
   * Search notes by content
   */
  async searchByContent(
    userId: string,
    clientId: string,
    searchTerm: string,
  ): Promise<Note[]> {
    const filter: NoteFilter = {
      userId,
      clientId,
      content: { $regex: searchTerm, $options: 'i' },
    };
    return super.findAll(filter, { sortBy: '-updatedAt' });
  }

  /**
   * Get recent notes
   */
  async getRecentNotes(
    userId: string,
    clientId: string,
    limit: number = 5,
  ): Promise<Note[]> {
    const filter: NoteFilter = { userId, clientId };
    const notes = await this.model
      .find(filter)
      .sort('-updatedAt')
      .limit(limit)
      .exec();
    
    return notes.map(note => note.toObject() as Note);
  }

  /**
   * Count notes for a client
   */
  async countForClient(userId: string, clientId: string): Promise<number> {
    const filter: NoteFilter = { userId, clientId };
    return super.count(filter);
  }
}