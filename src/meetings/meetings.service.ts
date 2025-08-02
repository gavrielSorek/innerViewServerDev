// src/meetings/meetings.service.ts
// Service refactored to extend base service with proper typing

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Meeting, MeetingDocument } from './schemas/meeting.schema';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { BaseCrudService } from '../common/services/base-crud.service';
import { ResourceNotFoundError } from '../common/errors/custom-errors';

interface MeetingFilter extends FilterQuery<MeetingDocument> {
  userId: string;
  clientId: string;
}

@Injectable()
export class MeetingsService extends BaseCrudService<
  MeetingDocument,
  CreateMeetingDto,
  UpdateMeetingDto
> {
  constructor(
    @InjectModel(Meeting.name)
    meetingModel: Model<MeetingDocument>,
  ) {
    super(meetingModel, 'Meeting');
  }

  /**
   * Find all meetings for a user and client
   */
  async findAll(userId: string, clientId: string): Promise<Meeting[]> {
    const filter: MeetingFilter = { userId, clientId };
    return super.findAll(filter, { sortBy: '-date' });
  }

  /**
   * Find one meeting with user/client validation
   */
  async findOne(id: string, clientId: string, userId: string): Promise<Meeting> {
    const filter: MeetingFilter = { clientId, userId };
    const meeting = await super.findOne(id, filter);
    if (!meeting) {
      throw new ResourceNotFoundError('Meeting', id);
    }
    return meeting;
  }

  /**
   * Update a meeting with validation
   */
  async update(
    id: string,
    updateMeetingDto: UpdateMeetingDto & { clientId: string; userId: string },
  ): Promise<Meeting> {
    const { clientId, userId, ...updateData } = updateMeetingDto;
    const filter: MeetingFilter = { clientId, userId };
    
    const meeting = await super.update(id, updateData, filter);
    if (!meeting) {
      throw new ResourceNotFoundError('Meeting', id);
    }
    return meeting;
  }

  /**
   * Remove a meeting with validation
   */
  async remove(id: string, clientId: string, userId: string): Promise<Meeting> {
    const filter: MeetingFilter = { clientId, userId };
    const meeting = await super.remove(id, filter);
    if (!meeting) {
      throw new ResourceNotFoundError('Meeting', id);
    }
    return meeting;
  }

  /**
   * Get meetings for a specific date range
   */
  async findByDateRange(
    userId: string,
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Meeting[]> {
    const filter: MeetingFilter = {
      userId,
      clientId,
      date: { $gte: startDate.toISOString(), $lte: endDate.toISOString() },
    };
    return super.findAll(filter, { sortBy: 'date' });
  }

  /**
   * Count meetings for a client
   */
  async countForClient(userId: string, clientId: string): Promise<number> {
    const filter: MeetingFilter = { userId, clientId };
    return super.count(filter);
  }
}