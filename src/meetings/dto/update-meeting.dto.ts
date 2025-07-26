import { PartialType } from '@nestjs/mapped-types';
import { CreateMeetingDto } from './create-meeting.dto';

/**
 * DTO used for partial updates of Meeting entities.  Extends
 * PartialType so all fields from CreateMeetingDto become optional.
 */
export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {}