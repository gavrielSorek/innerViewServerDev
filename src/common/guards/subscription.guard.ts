// src/common/guards/subscription.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../../users/users.service';
import { SubscriptionPlan } from '../../users/schemas/user.schema';

export const RequireSubscription = (plan: SubscriptionPlan) =>
  SetMetadata('requiredSubscription', plan);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.get<SubscriptionPlan>(
      'requiredSubscription',
      context.getHandler(),
    );

    if (!requiredPlan) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user.uid;

    const hasAccess = await this.usersService.checkSubscriptionAccess(
      userId,
      requiredPlan,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `This feature requires at least ${requiredPlan} subscription`,
      );
    }

    return true;
  }
}