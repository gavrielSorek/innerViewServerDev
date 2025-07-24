import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note } from './entities/note.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotesService {
  private notes: Note[] = [
    { id: '1', clientId: '1', title: 'First Meeting', content: 'Discussed project requirements.' },
    { id: '2', clientId: '1', title: 'Follow-up', content: 'Finalized the design.' },
  ];

  create(createNoteDto: CreateNoteDto): Note {
    const newNote: Note = {
      id: uuidv4(),
      ...createNoteDto,
    };
    this.notes.push(newNote);
    return newNote;
  }

  findAll(clientId: string): Note[] {
    return this.notes.filter(note => note.clientId === clientId);
  }

  findOne(id: string): Note {
    const note = this.notes.find(note => note.id === id);
    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }
    return note;
  }

  update(id: string, updateNoteDto: UpdateNoteDto): Note {
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }
    const originalNote = this.notes[noteIndex];
    const updatedNote = { ...originalNote, ...updateNoteDto };
    this.notes[noteIndex] = updatedNote;
    return updatedNote;
  }
}