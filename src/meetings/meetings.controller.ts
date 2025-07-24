// file: src/meetings/meetings.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';

@Controller('users/:userId/clients/:clientId/meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  findAll(@Param('userId') userId: string, @Param('clientId') clientId: string) {
    // Assuming meetingsService.findAll needs userId to scope meetings per user
    return this.meetingsService.findAll(userId, clientId);
  }

  @Get(':id')
  findOne(@Param('userId') userId: string, @Param('clientId') clientId: string, @Param('id') id: string) {
    // Assuming meetingsService.findOne needs userId for proper scoping
    return this.meetingsService.findOne(id, clientId, userId);
  }

  @Post()
  create(@Param('userId') userId: string, @Param('clientId') clientId: string, @Body() createMeetingDto: CreateMeetingDto) {
    // Add both clientId and userId to the DTO before passing to service
    return this.meetingsService.create({ ...createMeetingDto, clientId, userId });
  }

  @Put(':id')
  update(@Param('userId') userId: string, @Param('clientId') clientId: string, @Param('id') id: string, @Body() updateMeetingDto: CreateMeetingDto) {
    // Add both clientId and userId to the DTO before passing to service
    return this.meetingsService.update(id, { ...updateMeetingDto, clientId, userId });
  }

  @Delete(':id')
  remove(@Param('userId') userId: string, @Param('clientId') clientId: string, @Param('id') id: string) {
    // Assuming meetingsService.remove needs userId for proper scoping
    return this.meetingsService.remove(id, clientId, userId);
  }
}