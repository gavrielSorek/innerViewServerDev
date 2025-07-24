import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';

@Controller('users/:userId/clients/:clientId/meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  findAll(@Param('clientId') clientId: string) {
    return this.meetingsService.findAll(clientId);
  }

  @Get(':id')
  findOne(@Param('clientId') clientId: string, @Param('id') id: string) {
    return this.meetingsService.findOne(id, clientId);
  }

  @Post()
  create(@Param('clientId') clientId: string, @Body() createMeetingDto: CreateMeetingDto) {
    return this.meetingsService.create({ ...createMeetingDto, clientId });
  }

  @Put(':id')
  update(@Param('clientId') clientId: string, @Param('id') id: string, @Body() updateMeetingDto: CreateMeetingDto) {
    return this.meetingsService.update(id, { ...updateMeetingDto, clientId });
  }

  @Delete(':id')
  remove(@Param('clientId') clientId: string, @Param('id') id: string) {
    return this.meetingsService.remove(id, clientId);
  }
}