// src/notes/notes.service.ts
// Service with proper typing but not extending base due to signature conflicts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name)
    private noteModel: Model<NoteDocument>,
  ) {}

  /**
   * List all notes for a given user and client.
   */
  async findAll(userId: string, clientId: string): Promise<Note[]> {
    return this.noteModel.find({ userId, clientId }).sort('-updatedAt').exec();
  }

  /**
   * Fetch a single note
   */
  async findOne(id: string, clientId: string, userId: string): Promise<Note> {
    const note = await this.noteModel.findOne({ _id: id, clientId, userId }).exec();
    if (!note) {
      throw new NotFoundException(
        `Note with ID "${id}" not found for client "${clientId}" and user "${userId}"`,
      );
    }
    return note;
  }

  /**
   * Create a new note.
   */
  async create(
    createNoteDto: CreateNoteDto & { clientId: string; userId: string },
  ): Promise<Note> {
    const createdNote = new this.noteModel(createNoteDto);
    return createdNote.save();
  }

  /**
   * Update an existing note
   */
  async update(
    id: string,
    updateNoteDto: UpdateNoteDto & { clientId: string; userId: string },
  ): Promise<Note> {
    const existingNote = await this.noteModel
      .findOneAndUpdate(
        { _id: id, clientId: updateNoteDto.clientId, userId: updateNoteDto.userId },
        updateNoteDto,
        { new: true },
      )
      .exec();

    if (!existingNote) {
      throw new NotFoundException(
        `Note with ID "${id}" not found for client "${updateNoteDto.clientId}" and user "${updateNoteDto.userId}"`,
      );
    }

    return existingNote.toObject();
  }

  /**
   * Delete a note
   */
  async remove(id: string, clientId: string, userId: string): Promise<Note> {
    const result = await this.noteModel
      .findOneAndDelete({ _id: id, clientId, userId }, { new: true })
      .exec();

    if (!result) {
      throw new NotFoundException(
        `Note with ID "${id}" not found for client "${clientId}" and user "${userId}"`,
      );
    }

    return result.toObject();
  }
}