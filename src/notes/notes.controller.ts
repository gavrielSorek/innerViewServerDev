// file: src/notes/notes.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Patch } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { AuthGuard } from '../auth/auth.guard'; // Assuming you have an AuthGuard

@Controller('users/:userId/clients/:clientId/notes')
@UseGuards(AuthGuard) // Apply AuthGuard consistently
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  findAll(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
  ) {
    // Service method would now filter by both userId and clientId
    return this.notesService.findAll(userId, clientId);
  }

  @Get(':id')
  findOne(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
  ) {
    // Service method needs all parameters for proper scoping and security
    return this.notesService.findOne(id, clientId, userId);
  }

  @Post()
  create(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Body() createNoteDto: CreateNoteDto,
  ) {
    // Add userId and clientId to the DTO before passing to service for creation context
    return this.notesService.create({ ...createNoteDto, clientId, userId });
  }

  @Patch(':id') // Using Patch as per your original code
  update(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    // Add userId and clientId to the DTO before passing to service for update context
    return this.notesService.update(id, { ...updateNoteDto, clientId, userId });
  }

  // Assuming you'd want a delete operation as well, consistent with meetings
  @Delete(':id')
  remove(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
  ) {
    // Service method needs all parameters for proper scoping and security
    return this.notesService.remove(id, clientId, userId);
  }
}