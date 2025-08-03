// Fix src/meetings/meetings.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Meeting, MeetingDocument } from './schemas/meeting.schema';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { BaseCrudService } from '../common/services/base-crud.service';
import { ResourceNotFoundError } from '../common/errors/custom-errors';

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
   * Override base methods to match expected signatures
   */
  async findAll(
    filter: FilterQuery<MeetingDocument> = {},
    options?: any,
  ): Promise<MeetingDocument[]> {
    // If called with legacy signature (userId, clientId)
    if (typeof filter === 'string' && typeof options === 'string') {
      const userId = filter;
      const clientId = options;
      return super.findAll({ userId, clientId }, { sortBy: '-date' });
    }
    // Normal call
    return super.findAll(filter, options);
  }

  async findOne(
    id: string,
    filter: FilterQuery<MeetingDocument> = {},
    options?: any,
  ): Promise<MeetingDocument> {
    // If called with legacy signature (id, clientId, userId)
    if (typeof filter === 'string' && typeof options === 'string') {
      const clientId = filter;
      const userId = options;
      return super.findOne(id, { clientId, userId });
    }
    // Normal call
    return super.findOne(id, filter, options);
  }

  async update(
    id: string,
    updateDto: UpdateMeetingDto,
    filter?: FilterQuery<MeetingDocument>,
  ): Promise<MeetingDocument> {
    // Handle the extended DTO with clientId and userId
    const dto = updateDto as any;
    if (dto.clientId && dto.userId) {
      const { clientId, userId, ...updateData } = dto;
      return super.update(id, updateData, { clientId, userId });
    }
    return super.update(id, updateDto, filter);
  }

  async remove(
    id: string,
    filter?: FilterQuery<MeetingDocument>,
  ): Promise<MeetingDocument> {
    return super.remove(id, filter);
  }

  // Add convenience methods that match controller expectations
  async findAllForUserAndClient(userId: string, clientId: string): Promise<Meeting[]> {
    const docs = await this.findAll({ userId, clientId }, { sortBy: '-date' });
    return docs.map(doc => doc.toObject() as Meeting);
  }

  async findOneForUserAndClient(
    id: string,
    clientId: string,
    userId: string,
  ): Promise<Meeting> {
    const doc = await this.findOne(id, { clientId, userId });
    if (!doc) {
      throw new ResourceNotFoundError('Meeting', id);
    }
    return doc.toObject() as Meeting;
  }

  async updateForUserAndClient(
    id: string,
    updateMeetingDto: UpdateMeetingDto & { clientId: string; userId: string },
  ): Promise<Meeting> {
    const { clientId, userId, ...updateData } = updateMeetingDto;
    const doc = await this.update(id, updateData, { clientId, userId });
    if (!doc) {
      throw new ResourceNotFoundError('Meeting', id);
    }
    return doc.toObject() as Meeting;
  }

  async removeForUserAndClient(
    id: string,
    clientId: string,
    userId: string,
  ): Promise<Meeting> {
    const doc = await this.remove(id, { clientId, userId });
    if (!doc) {
      throw new ResourceNotFoundError('Meeting', id);
    }
    return doc.toObject() as Meeting;
  }

  /**
   * Additional methods
   */
  async findByDateRange(
    userId: string,
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Meeting[]> {
    const filter: FilterQuery<MeetingDocument> = {
      userId,
      clientId,
      date: { $gte: startDate.toISOString(), $lte: endDate.toISOString() },
    };
    const docs = await super.findAll(filter, { sortBy: 'date' });
    return docs.map(doc => doc.toObject() as Meeting);
  }

  async countForClient(userId: string, clientId: string): Promise<number> {
    return super.count({ userId, clientId });
  }
}