// src/futuregraph/futuregraph.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FuturegraphController } from './futuregraph.controller';
import { FuturegraphService } from './futuregraph.service';
import { FuturegraphSession, FuturegraphSessionSchema } from './schemas/futuregraph-session.schema';
import { AiService } from './ai.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: FuturegraphSession.name, schema: FuturegraphSessionSchema }
    ])
  ],
  controllers: [FuturegraphController],
  providers: [FuturegraphService, AiService],
  exports: [FuturegraphService],
})
export class FuturegraphModule {}

// src/futuregraph/futuregraph.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards,
  BadRequestException 
} from '@nestjs/common';
import { FuturegraphService } from './futuregraph.service';
import { AuthGuard } from '../auth/auth.guard';
import { StartSessionDto } from './dto/start-session.dto';
import { ProcessRoundDto } from './dto/process-round.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Controller('ai/futuregraph')
@UseGuards(AuthGuard)
export class FuturegraphController {
  constructor(private readonly futuregraphService: FuturegraphService) {}

  @Post('start-session')
  async startSession(@Body() startSessionDto: StartSessionDto) {
    const sessionId = await this.futuregraphService.startSession(startSessionDto);
    return { sessionId, status: 'Session created successfully' };
  }

  @Post('process-round')
  async processRound(@Body() processRoundDto: ProcessRoundDto) {
    const result = await this.futuregraphService.processRound(processRoundDto);
    return result;
  }

  @Get('status/:sessionId')
  async getStatus(@Param('sessionId') sessionId: string) {
    return this.futuregraphService.getSessionStatus(sessionId);
  }

  @Get('report/:sessionId')
  async getReport(@Param('sessionId') sessionId: string) {
    return this.futuregraphService.generateReport(sessionId);
  }

  @Post('feedback')
  async submitFeedback(@Body() submitFeedbackDto: SubmitFeedbackDto) {
    return this.futuregraphService.submitFeedback(submitFeedbackDto);
  }
}