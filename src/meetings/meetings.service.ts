// src/meetings/meetings.service.ts
// Service with proper typing but not extending base due to signature conflicts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Meeting, MeetingDocument } from './schemas/meeting.schema';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectModel(Meeting.name)
    private meetingModel: Model<MeetingDocument>,
  ) {}

  /**
   * Retrieve all meetings for a given user and client.
   */
  async findAll(userId: string, clientId: string): Promise<Meeting[]> {
    return this.meetingModel.find({ userId, clientId }).exec();
  }

  /**
   * Retrieve a single meeting
   */
  async findOne(id: string, clientId: string, userId: string): Promise<Meeting> {
    const meeting = await this.meetingModel.findOne({ _id: id, clientId, userId }).exec();
    if (!meeting) {
      throw new NotFoundException(
        `Meeting with ID "${id}" not found for client "${clientId}" and user "${userId}"`,
      );
    }
    return meeting;
  }

  /**
   * Create a new meeting document.
   */
  async create(createMeetingDto: CreateMeetingDto): Promise<Meeting> {
    const createdMeeting = new this.meetingModel(createMeetingDto);
    return createdMeeting.save();
  }

  /**
   * Update an existing meeting.
   */
  async update(
    id: string,
    updateMeetingDto: UpdateMeetingDto & { clientId: string; userId: string },
  ): Promise<Meeting> {
    const existingMeeting = await this.meetingModel
      .findOneAndUpdate(
        { _id: id, clientId: updateMeetingDto.clientId, userId: updateMeetingDto.userId },
        updateMeetingDto,
        { new: true },
      )
      .exec();

    if (!existingMeeting) {
      throw new NotFoundException(
        `Meeting with ID "${id}" not found for client "${updateMeetingDto.clientId}" and user "${updateMeetingDto.userId}"`,
      );
    }

    return existingMeeting.toObject();
  }

  /**
   * Remove a meeting
   */
  async remove(id: string, clientId: string, userId: string): Promise<Meeting> {
    const result = await this.meetingModel
      .findOneAndDelete({ _id: id, clientId, userId }, { new: true })
      .exec();

    if (!result) {
      throw new NotFoundException(
        `Meeting with ID "${id}" not found for client "${clientId}" and user "${userId}"`,
      );
    }

    return result.toObject();
  }
}