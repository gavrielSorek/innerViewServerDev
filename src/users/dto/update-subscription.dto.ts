// src/users/dto/update-subscription.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';
import { SubscriptionPlan } from '../schemas/user.schema';

export class UpdateSubscriptionDto {
  @IsNotEmpty()
  @IsEnum(SubscriptionPlan, {
    message: 'Subscription must be one of: free, basic, pro',
  })
  readonly subscription: SubscriptionPlan;
}