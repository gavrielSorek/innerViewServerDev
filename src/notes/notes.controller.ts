import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { AuthGuard } from '../auth/auth.guard';

/**
 * Controller exposing CRUD endpoints for notes.  The routes are nested
 * under both userId and clientId to ensure that notes are always
 * associated with the correct parent resources.  Both full replacement
 * (PUT) and partial update (PATCH) handlers are provided.
 */
@Controller('users/:userId/clients/:clientId/notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  /**
   * List all notes for a user/client pair.
   */
  @Get()
  findAll(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.notesService.findAll(userId, clientId);
  }

  /**
   * Fetch a single note by id for a user/client pair.
   */
  @Get(':id')
  findOne(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
  ) {
    return this.notesService.findOne(id, clientId, userId);
  }

  /**
   * Create a new note.  The incoming DTO does not include userId or
   * clientId, so they are merged in before passing to the service.
   */
  @Post()
  create(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Body() createNoteDto: CreateNoteDto,
  ) {
    return this.notesService.create({ ...createNoteDto, clientId, userId });
  }

  /**
   * Replace an entire note via PUT.  According to the HTTP
   * specification, a PUT request implies the client is supplying the
   * complete new representation of the resource.  We therefore accept
   * a CreateNoteDto here rather than UpdateNoteDto.
   */
  @Put(':id')
  replace(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
    @Body() createNoteDto: CreateNoteDto,
  ) {
    return this.notesService.update(id, {
      ...createNoteDto,
      clientId,
      userId,
    } as any);
  }

  /**
   * Partially update a note via PATCH.  Fields omitted from the DTO
   * will not be modified.  We merge in the routing parameters so the
   * service can scope the operation correctly.
   */
  @Patch(':id')
  update(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(id, {
      ...(updateNoteDto as any),
      clientId,
      userId,
    });
  }

  /**
   * Delete a note.
   */
  @Delete(':id')
  remove(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
  ) {
    return this.notesService.remove(id, clientId, userId);
  }
}