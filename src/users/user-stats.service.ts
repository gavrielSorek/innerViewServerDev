import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserStatsDto } from './dto/user-stats.dto';

@Injectable()
export class UserStatsService {
  constructor(
    @InjectModel('Client') private clientModel: Model<any>,
    @InjectModel('Meeting') private meetingModel: Model<any>,
    @InjectModel('Note') private noteModel: Model<any>,
    @InjectModel('FuturegraphSession') private futuregraphModel: Model<any>,
  ) {}

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const [totalClients, totalMeetings, totalNotes, totalAnalyses] = await Promise.all([
      this.clientModel.countDocuments({ userId }).exec(),
      this.meetingModel.countDocuments({ userId }).exec(),
      this.noteModel.countDocuments({ userId }).exec(),
      this.futuregraphModel.countDocuments({ userId }).exec(),
    ]);

    // Get last activity
    const lastActivities = await Promise.all([
      this.clientModel.findOne({ userId }).sort('-createdAt').select('createdAt').exec(),
      this.meetingModel.findOne({ userId }).sort('-date').select('date').exec(),
      this.noteModel.findOne({ userId }).sort('-updatedAt').select('updatedAt').exec(),
      this.futuregraphModel.findOne({ userId }).sort('-startTime').select('startTime').exec(),
    ]);

    const lastActivityDates = lastActivities
      .filter(activity => activity)
      .map(activity => {
        if (activity.createdAt) return new Date(activity.createdAt);
        if (activity.date) return new Date(activity.date);
        if (activity.updatedAt) return new Date(activity.updatedAt);
        if (activity.startTime) return new Date(activity.startTime);
        return null;
      })
      .filter(date => date !== null) as Date[];

    const lastActivityAt = lastActivityDates.length > 0
      ? new Date(Math.max(...lastActivityDates.map(date => date.getTime())))
      : undefined;

    return {
      userId,
      totalClients,
      totalMeetings,
      totalNotes,
      totalAnalyses,
      lastActivityAt,
    };
  }
}