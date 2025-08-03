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
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users/:userId/clients/:clientId/meetings')
@UseGuards(AuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  findAll(@Param('userId') userId: string, @Param('clientId') clientId: string) {
    return this.meetingsService.findAllForUserAndClient(userId, clientId);
  }

  @Get(':id')
  findOne(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
  ) {
    return this.meetingsService.findOneForUserAndClient(id, clientId, userId);
  }

  @Post()
  create(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Body() createMeetingDto: CreateMeetingDto,
  ) {
    return this.meetingsService.create({ ...createMeetingDto, clientId, userId });
  }

  @Put(':id')
  update(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
    @Body() updateMeetingDto: CreateMeetingDto,
  ) {
    return this.meetingsService.updateForUserAndClient(id, { 
      ...updateMeetingDto, 
      clientId, 
      userId 
    } as any);
  }

  @Patch(':id')
  partialUpdate(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
  ) {
    return this.meetingsService.updateForUserAndClient(id, { 
      ...updateMeetingDto, 
      clientId, 
      userId 
    } as any);
  }

  @Delete(':id')
  remove(
    @Param('userId') userId: string,
    @Param('clientId') clientId: string,
    @Param('id') id: string,
  ) {
    return this.meetingsService.removeForUserAndClient(id, clientId, userId);
  }

}