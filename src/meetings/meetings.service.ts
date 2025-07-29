import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Meeting, MeetingDocument } from './schemas/meeting.schema';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

/**
 * Service for CRUD operations on meeting documents. Provides
 * type-safe signatures that ensure only the owning user and client can
 * access or modify a meeting.
 */
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
   * Retrieve a single meeting, ensuring it belongs to the provided
   * user and client. Throws when not found.
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
   * Create a new meeting document. The DTO is expected to include the
   * userId and clientId for proper scoping.
   */
  async create(createMeetingDto: CreateMeetingDto): Promise<Meeting> {
    const createdMeeting = new this.meetingModel(createMeetingDto);
    return createdMeeting.save();
  }

  /**
   * Update an existing meeting. Requires the DTO to include userId
   * and clientId so that the update is scoped correctly.
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
   * Remove a meeting by id, clientId and userId. Throws if the
   * document doesn't exist.
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