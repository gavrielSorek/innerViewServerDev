// file: src/preferences/preferences.service.ts 
import { Injectable, NotFoundException } from '@nestjs/common'; 
import { InjectModel } from '@nestjs/mongoose'; 
import { Model } from 'mongoose'; 
import { UserPreference, UserPreferenceDocument } from './schemas/user-preference.schema'; 
import { CreatePreferenceDto } from './dto/create-preference.dto'; 
import { UpdatePreferenceDto } from './dto/update-preference.dto'; 
 
@Injectable() 
export class PreferencesService { 
  constructor( 
    @InjectModel(UserPreference.name) 
    private userPreferenceModel: Model<UserPreferenceDocument> 
  ) {} 
 
  async findByUserId(userId: string): Promise<UserPreference | null> { 
    return this.userPreferenceModel.findOne({ userId }).exec(); 
  } 
 
  async create(createPreferenceDto: CreatePreferenceDto): Promise<UserPreference> { 
    // Check if preferences already exist for this user 
    const existingPreference = await this.findByUserId(createPreferenceDto.userId); 
    if (existingPreference) { 
      // If they exist, update instead of creating 
      return this.update(createPreferenceDto.userId, createPreferenceDto); 
    } 
 
    const createdPreference = new this.userPreferenceModel(createPreferenceDto); 
    return createdPreference.save(); 
  } 
 
  async update(userId: string, updatePreferenceDto: UpdatePreferenceDto): Promise<UserPreference> { 
    const existingPreference = await this.userPreferenceModel.findOneAndUpdate( 
      { userId }, 
      updatePreferenceDto, 
      { new: true, upsert: true } // upsert: true creates if doesn't exist 
    ).exec(); 
 
    return existingPreference; 
  } 
 
  async remove(userId: string): Promise<any> { 
    const result = await this.userPreferenceModel.findOneAndDelete({ userId }).exec(); 
    if (!result) { 
      throw new NotFoundException(`User preferences for user "${userId}" not found`); 
    } 
    return result; 
  } 
 
  // Helper method to get preferences with default values if not found 
  async getOrCreateDefault(userId: string): Promise<UserPreference> { 
    let preference = await this.findByUserId(userId); 
 
    if (!preference) { 
      // Create default preferences if they don't exist 
      const defaultPreference = new CreatePreferenceDto(); 
      Object.assign(defaultPreference, { userId, languageCode: 'en' }); 
      preference = await this.create(defaultPreference); 
    } 
 
    return preference; 
  } 
} 
