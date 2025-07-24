import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Meeting, MeetingDocument } from './schemas/meeting.schema';
import { CreateMeetingDto } from './dto/create-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(@InjectModel(Meeting.name) private meetingModel: Model<MeetingDocument>) {}

  async findAll(clientId: string): Promise<Meeting[]> {
    return this.meetingModel.find({ clientId }).exec();
  }

  async findOne(id: string, clientId: string): Promise<Meeting> {
    const meeting = await this.meetingModel.findOne({ _id: id, clientId }).exec();
    if (!meeting) {
      throw new NotFoundException(`Meeting with ID "${id}" not found`);
    }
    return meeting;
  }

  async create(createMeetingDto: CreateMeetingDto): Promise<Meeting> {
    const createdMeeting = new this.meetingModel(createMeetingDto);
    return createdMeeting.save();
  }

  async update(id: string, updateMeetingDto: CreateMeetingDto): Promise<Meeting> {
    const existingMeeting = await this.meetingModel.findOneAndUpdate({ _id: id, clientId: updateMeetingDto.clientId }, updateMeetingDto, { new: true }).exec();
    if (!existingMeeting) {
      throw new NotFoundException(`Meeting with ID "${id}" not found`);
    }
    return existingMeeting;
  }

  async remove(id: string, clientId: string): Promise<any> {
    const result = await this.meetingModel.findOneAndDelete({ _id: id, clientId }).exec();
    if (!result) {
      throw new NotFoundException(`Meeting with ID "${id}" not found`);
    }
    return result;
  }
}