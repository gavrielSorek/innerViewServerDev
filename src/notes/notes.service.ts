// file: src/notes/notes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(@InjectModel(Note.name) private noteModel: Model<NoteDocument>) {}

  // Find all notes for a specific client under a specific user
  async findAll(userId: string, clientId: string): Promise<Note[]> {
    return this.noteModel.find({ userId, clientId }).exec();
  }

  // Find a single note by ID for a specific client under a specific user
  async findOne(id: string, clientId: string, userId: string): Promise<Note> {
    // Use _id for MongoDB's default ID field
    const note = await this.noteModel.findOne({ _id: id, clientId, userId }).exec();
    if (!note) {
      throw new NotFoundException(`Note with ID "${id}" not found for client "${clientId}" and user "${userId}"`);
    }
    return note;
  }

  // Create a new note, including userId and clientId from the DTO
  // The DTO received here already has clientId and userId merged in from the controller
  async create(createNoteDto: CreateNoteDto & { clientId: string; userId: string }): Promise<Note> {
    const createdNote = new this.noteModel(createNoteDto);
    return createdNote.save();
  }

  // Update an existing note by ID for a specific client and user
  async update(id: string, updateNoteDto: UpdateNoteDto & { clientId: string; userId: string }): Promise<Note> {
    // Ensure update is scoped to userId and clientId, and use { new: true } to return the updated document
    const existingNote = await this.noteModel.findOneAndUpdate(
      { _id: id, clientId: updateNoteDto.clientId, userId: updateNoteDto.userId },
      updateNoteDto,
      { new: true }
    ).exec();

    if (!existingNote) {
      throw new NotFoundException(`Note with ID "${id}" not found for client "${updateNoteDto.clientId}" and user "${updateNoteDto.userId}"`);
    }
    return existingNote;
  }

  // Remove a note by ID for a specific client under a specific user
  async remove(id: string, clientId: string, userId: string): Promise<any> {
    // Use findOneAndDelete to also get the deleted document if needed, otherwise deleteOne
    const result = await this.noteModel.findOneAndDelete({ _id: id, clientId, userId }).exec();
    if (!result) { // If result is null, it means no document was found and deleted
      throw new NotFoundException(`Note with ID "${id}" not found for client "${clientId}" and user "${userId}"`);
    }
    return result; // Or return a success message/object
  }
}