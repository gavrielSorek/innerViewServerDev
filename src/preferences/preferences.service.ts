import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserPreference, UserPreferenceDocument } from './schemas/user-preference.schema';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

/**
 * Service to manage user preferences.  Provides upsert behaviour via
 * update() and a convenience method to get or create a default
 * preference document.  All methods return strongly typed
 * UserPreference instances.
 */
@Injectable()
export class PreferencesService {
  constructor(
    @InjectModel(UserPreference.name)
    private userPreferenceModel: Model<UserPreferenceDocument>,
  ) {}

  /**
   * Find a preference document by the owning user id.  Returns null
   * when nothing exists.
   */
  async findByUserId(userId: string): Promise<UserPreference | null> {
    return this.userPreferenceModel.findOne({ userId }).exec();
  }

  /**
   * Create a preference document.  If a record already exists for the
   * user, this method delegates to update().
   */
  async create(createPreferenceDto: CreatePreferenceDto): Promise<UserPreference> {
    const existingPreference = await this.findByUserId(createPreferenceDto.userId);
    if (existingPreference) {
      return this.update(createPreferenceDto.userId, createPreferenceDto);
    }
    const createdPreference = new this.userPreferenceModel(createPreferenceDto);
    return createdPreference.save();
  }

  /**
   * Update a preference document or create one if it doesn't exist
   * (upsert behaviour).  Returns the updated or newly created record.
   */
  async update(userId: string, updatePreferenceDto: UpdatePreferenceDto): Promise<UserPreference> {
  const existingPreference = await this.userPreferenceModel
    .findOneAndUpdate({ userId }, updatePreferenceDto, {
      new: true,            // return the updated document
      upsert: true,
    })
    .exec();

  if (!existingPreference) {
    throw new NotFoundException(`Unable to find or create preference for user "${userId}"`);
  }

  return existingPreference.toObject();
}

  /**
   * Remove a preference document by userId.  Throws when no record
   * exists.
   */
  async remove(userId: string): Promise<UserPreference> {
  const result = await this.userPreferenceModel
    .findOneAndDelete({ userId }, { new: true })
    .exec();

  if (!result) {
    throw new NotFoundException(`User preferences for user "${userId}" not found`);
  }

  return result.toObject();
}

  /**
   * Convenience method to fetch the user's preferences or create a
   * default record if one does not exist.  Defaults the language to
   * 'en'.
   */
  async getOrCreateDefault(userId: string): Promise<UserPreference> {
    let preference = await this.findByUserId(userId);
    if (!preference) {
      // Create a minimal CreatePreferenceDto on the fly.  The class
      // only defines readonly properties so cast to any before
      // assigning.
      const defaultPreference = {} as CreatePreferenceDto;
      Object.assign(defaultPreference, { userId, languageCode: 'en' });
      preference = await this.create(defaultPreference);
    }
    return preference;
  }
}