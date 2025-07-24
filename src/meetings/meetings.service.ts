// file: src/meetings/meetings.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Meeting, MeetingDocument } from './schemas/meeting.schema';
import { CreateMeetingDto } from './dto/create-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(@InjectModel(Meeting.name) private meetingModel: Model<MeetingDocument>) {}

  // Find all meetings for a specific client under a specific user
  async findAll(userId: string, clientId: string): Promise<Meeting[]> {
    return this.meetingModel.find({ userId, clientId }).exec();
  }

  // Find a single meeting by ID for a specific client under a specific user
  async findOne(id: string, clientId: string, userId: string): Promise<Meeting> {
    const meeting = await this.meetingModel.findOne({ _id: id, clientId, userId }).exec();
    if (!meeting) {
      throw new NotFoundException(`Meeting with ID "${id}" not found for client "${clientId}" and user "${userId}"`);
    }
    return meeting;
  }

  // Create a new meeting, including userId and clientId from the DTO
  async create(createMeetingDto: CreateMeetingDto): Promise<Meeting> {
    const createdMeeting = new this.meetingModel(createMeetingDto);
    return createdMeeting.save();
  }

  // Update an existing meeting by ID for a specific client and user
  async update(id: string, updateMeetingDto: CreateMeetingDto): Promise<Meeting> {
    const existingMeeting = await this.meetingModel.findOneAndUpdate(
      { _id: id, clientId: updateMeetingDto.clientId, userId: updateMeetingDto.userId }, // Ensure update is scoped to userId and clientId
      updateMeetingDto,
      { new: true }
    ).exec();
    if (!existingMeeting) {
      throw new NotFoundException(`Meeting with ID "${id}" not found for client "${updateMeetingDto.clientId}" and user "${updateMeetingDto.userId}"`);
    }
    return existingMeeting;
  }

  // Remove a meeting by ID for a specific client under a specific user
  async remove(id: string, clientId: string, userId: string): Promise<any> {
    const result = await this.meetingModel.findOneAndDelete({ _id: id, clientId, userId }).exec();
    if (!result) {
      throw new NotFoundException(`Meeting with ID "${id}" not found for client "${clientId}" and user "${userId}"`);
    }
    return result;
  }
}