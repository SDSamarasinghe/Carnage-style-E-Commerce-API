import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, type SettingDocument } from './schemas/setting.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Setting.name) private readonly settingModel: Model<SettingDocument>,
  ) {}

  async get(): Promise<SettingDocument> {
    let setting = await this.settingModel.findOne().exec();
    if (!setting) setting = await this.settingModel.create({});
    return setting;
  }

  async update(data: Partial<SettingDocument>): Promise<SettingDocument> {
    const setting = await this.get();
    Object.assign(setting, data);
    return setting.save();
  }
}
