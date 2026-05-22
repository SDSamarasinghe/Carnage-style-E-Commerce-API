import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, type NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(input: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
  }): Promise<NotificationDocument> {
    return this.notificationModel.create({
      user: new Types.ObjectId(input.userId),
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
    });
  }

  findByUser(userId: string, limit = 20): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async markRead(userId: string, notifId: string): Promise<void> {
    await this.notificationModel.updateOne(
      { _id: notifId, user: new Types.ObjectId(userId) },
      { isRead: true },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { user: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );
  }
}
