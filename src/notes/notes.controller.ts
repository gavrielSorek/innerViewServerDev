import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Controller('users/:userId/clients/:clientId/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  findAll(@Param('clientId') clientId: string) {
    return this.notesService.findAll(clientId);
  }

  @Get(':id')
  findOne(@Param('clientId') clientId: string, @Param('id') id: string) {
    return this.notesService.findOne(id, clientId);
  }

  @Post()
  create(@Param('clientId') clientId: string, @Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create({ ...createNoteDto, clientId });
  }

  @Put(':id')
  update(@Param('clientId') clientId: string, @Param('id') id: string, @Body() updateNoteDto: CreateNoteDto) {
    return this.notesService.update(id, { ...updateNoteDto, clientId });
  }

  @Delete(':id')
  remove(@Param('clientId') clientId: string, @Param('id') id: string) {
    return this.notesService.remove(id, clientId);
  }
}