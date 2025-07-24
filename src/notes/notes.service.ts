import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';

@Injectable()
export class NotesService {
  constructor(@InjectModel(Note.name) private noteModel: Model<NoteDocument>) {}

  async findAll(clientId: string): Promise<Note[]> {
    return this.noteModel.find({ clientId }).exec();
  }

  async findOne(id: string, clientId: string): Promise<Note> {
    const note = await this.noteModel.findOne({ _id: id, clientId }).exec();
    if (!note) {
      throw new NotFoundException(`Note with ID "${id}" not found`);
    }
    return note;
  }

  async create(createNoteDto: CreateNoteDto): Promise<Note> {
    const createdNote = new this.noteModel(createNoteDto);
    return createdNote.save();
  }

  async update(id: string, updateNoteDto: CreateNoteDto): Promise<Note> {
    const existingNote = await this.noteModel.findOneAndUpdate({ _id: id, clientId: updateNoteDto.clientId }, updateNoteDto, { new: true }).exec();
    if (!existingNote) {
      throw new NotFoundException(`Note with ID "${id}" not found`);
    }
    return existingNote;
  }

  async remove(id: string, clientId: string): Promise<any> {
    const result = await this.noteModel.findOneAndDelete({ _id: id, clientId }).exec();
    if (!result) {
      throw new NotFoundException(`Note with ID "${id}" not found`);
    }
    return result;
  }
}