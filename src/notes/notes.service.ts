import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

/**
 * Service for managing note documents.  Includes strongly typed
 * signatures for better developer experience and correctness.
 */
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
    return this.noteModel.find({ userId, clientId }).exec();
  }

  /**
   * Fetch a single note scoped to the supplied user and client.  Throws
   * when no document exists.
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
   * Create a new note.  The DTO passed in should already contain
   * userId and clientId properties.
   */
  async create(
    createNoteDto: CreateNoteDto & { clientId: string; userId: string },
  ): Promise<Note> {
    const createdNote = new this.noteModel(createNoteDto);
    return createdNote.save();
  }

  /**
   * Update an existing note by id and scope.  Both PUT and PATCH
   * operations funnel through this method.  Throws if the document
   * cannot be found.
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
    return existingNote;
  }

  /**
   * Delete a note by id, client and user.  Throws when the document is
   * not present.
   */
  async remove(id: string, clientId: string, userId: string): Promise<Note> {
    const result = await this.noteModel.findOneAndDelete({ _id: id, clientId, userId }).exec();
    if (!result) {
      throw new NotFoundException(
        `Note with ID "${id}" not found for client "${clientId}" and user "${userId}"`,
      );
    }
    return result;
  }
}