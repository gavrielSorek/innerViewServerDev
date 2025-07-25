// file: src/preferences/preferences.controller.ts 
import { Controller, Get, Put, Body, Param, UseGuards, NotFoundException } from '@nestjs/common'; 
import { PreferencesService } from './preferences.service'; 
import { UpdatePreferenceDto } from './dto/update-preference.dto'; 
import { AuthGuard } from '../auth/auth.guard'; 
 
@Controller('users/:userId/preferences') 
@UseGuards(AuthGuard) // Apply AuthGuard consistently 
export class PreferencesController { 
  constructor(private readonly preferencesService: PreferencesService) {} 
 
  @Get() 
  async findOne(@Param('userId') userId: string) { 
    const preference = await this.preferencesService.findByUserId(userId); 
 
    if (!preference) { 
      // Return 404 as expected by the client, which will create default preferences 
      throw new NotFoundException(`User preferences for user "${userId}" not found`); 
    } 
 
    return preference; 
  } 
 
  @Put() 
  async update( 
    @Param('userId') userId: string, 
    @Body() updatePreferenceDto: UpdatePreferenceDto, 
  ) { 
    // Use upsert behavior - create if doesn't exist, update if it does 
    return this.preferencesService.update(userId, updatePreferenceDto); 
  } 
} 
