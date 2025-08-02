// src/usage-tracking/usage-tracking.service.spec.ts
// Unit tests for usage tracking service

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { UsageTrackingService } from './usage-tracking.service';
import { UsersService } from '../users/users.service';
import { UsageType } from './schemas/usage-tracking.schema';
import { SubscriptionPlan } from '../users/schemas/user.schema';

describe('UsageTrackingService', () => {
  let service: UsageTrackingService;
  let usersService: UsersService;
  let mockUsageModel: any;

  const mockUser = {
    firebaseUid: 'test-user-id',
    email: 'test@example.com',
    subscription: SubscriptionPlan.FREE,
  };

  beforeEach(async () => {
    mockUsageModel = {
      countDocuments: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageTrackingService,
        {
          provide: getModelToken('UsageTracking'),
          useValue: mockUsageModel,
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockUser),
          },
        },
      ],
    }).compile();

    service = module.get<UsageTrackingService>(UsageTrackingService);
    usersService = module.get<UsersService>(UsersService);
  });

  describe('checkUsageLimit', () => {
    it('should allow usage when under limit', async () => {
      mockUsageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });
      mockUsageModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        }),
      });

      const result = await service.checkUsageLimit(
        'test-user-id',
        UsageType.FUTUREGRAPH_ANALYZE,
      );

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(2);
      expect(result.limit).toBe(3); // Free plan limit
      expect(result.remaining).toBe(1);
    });

    it('should deny usage when limit exceeded', async () => {
      mockUsageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(3),
      });

      const result = await service.checkUsageLimit(
        'test-user-id',
        UsageType.FUTUREGRAPH_ANALYZE,
      );

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('limit reached');
    });

    it('should provide upgrade prompt for free users at limit', async () => {
      mockUsageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(3),
      });

      const result = await service.checkUsageLimit(
        'test-user-id',
        UsageType.FUTUREGRAPH_ANALYZE,
      );

      expect(result.upgradePrompt).toContain('FREE to BASIC');
    });
  });

  describe('enforceUsageLimit', () => {
    it('should track usage when allowed', async () => {
      mockUsageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });
      mockUsageModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const saveMock = jest.fn().mockResolvedValue({});
      mockUsageModel.prototype.save = saveMock;

      await service.enforceUsageLimit(
        'test-user-id',
        UsageType.AI_CHAT,
        { test: 'metadata' },
      );

      expect(saveMock).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when limit exceeded', async () => {
      mockUsageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(10), // Free plan AI chat limit
      });

      await expect(
        service.enforceUsageLimit('test-user-id', UsageType.AI_CHAT),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserUsageStats', () => {
    it('should return comprehensive usage statistics', async () => {
      mockUsageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });
      mockUsageModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getUserUsageStats('test-user-id');

      expect(result.subscription).toBe(SubscriptionPlan.FREE);
      expect(result.limits).toBeDefined();
      expect(result.usage.futuregraphAnalyze).toBeDefined();
      expect(result.usage.aiChat).toBeDefined();
    });
  });
});

// src/futuregraph/futuregraph.service.spec.ts
// Unit tests for FutureGraph service

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { FuturegraphService } from './futuregraph.service';
import { AiService } from './ai.service';
import { LanguageService } from '../common/language.service';

describe('FuturegraphService', () => {
  let service: FuturegraphService;
  let aiService: AiService;
  let mockSessionModel: any;
  let mockImageModel: any;
  let mockFocusReportModel: any;

  const mockAnalysis = {
    coreIdentity: {
      name: 'Test Identity',
      narrative: 'Test narrative',
    },
    personalityLayers: {
      visible: { patterns: [], insights: [] },
      conscious: { patterns: [], insights: [] },
      subconscious: { patterns: [], insights: [] },
      hidden: { patterns: [], insights: [] },
    },
  };

  beforeEach(async () => {
    mockSessionModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn(),
      countDocuments: jest.fn(),
      distinct: jest.fn(),
    };

    mockImageModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn(),
    };

    mockFocusReportModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FuturegraphService,
        {
          provide: getModelToken('FuturegraphSession'),
          useValue: mockSessionModel,
        },
        {
          provide: getModelToken('FuturegraphImage'),
          useValue: mockImageModel,
        },
        {
          provide: getModelToken('FuturegraphFocusReport'),
          useValue: mockFocusReportModel,
        },
        {
          provide: AiService,
          useValue: {
            analyzeComplete: jest.fn().mockResolvedValue(mockAnalysis),
            getFocusedAnalysis: jest.fn().mockResolvedValue(mockAnalysis),
          },
        },
        {
          provide: LanguageService,
          useValue: {
            validate: jest.fn().mockReturnValue('en'),
            getPhrase: jest.fn().mockReturnValue('test phrase'),
          },
        },
      ],
    }).compile();

    service = module.get<FuturegraphService>(FuturegraphService);
    aiService = module.get<AiService>(AiService);
  });

  describe('startAndCompleteAnalysis', () => {
    it('should create session and analyze successfully', async () => {
      const dto = {
        userId: 'user-123',
        clientId: 'client-123',
        handwritingImage: 'base64-image',
        language: 'en',
      };

      const saveMock = jest.fn().mockResolvedValue({});
      mockSessionModel.prototype.save = saveMock;
      mockImageModel.prototype.save = jest.fn().mockResolvedValue({});

      const result = await service.startAndCompleteAnalysis(dto);

      expect(result.sessionId).toBeDefined();
      expect(result.analysis).toEqual(mockAnalysis);
      expect(result.report).toBeDefined();
      expect(saveMock).toHaveBeenCalled();
    });

    it('should mark session as failed on error', async () => {
      const dto = {
        userId: 'user-123',
        clientId: 'client-123',
        handwritingImage: 'base64-image',
      };

      const saveMock = jest.fn().mockResolvedValue({});
      mockSessionModel.prototype.save = saveMock;
      
      jest.spyOn(aiService, 'analyzeComplete').mockRejectedValue(
        new Error('AI analysis failed'),
      );

      await expect(service.startAndCompleteAnalysis(dto)).rejects.toThrow();
      
      // Check that save was called to persist the failed status
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe('getAnalysisSession', () => {
    it('should retrieve session without image by default', async () => {
      const mockSession = {
        sessionId: 'test-123',
        completeAnalysis: mockAnalysis,
        report: {},
      };

      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      const result = await service.getAnalysisSession('test-123');

      expect(result.session).toEqual(mockSession);
      expect(result.handwritingImage).toBeUndefined();
      expect(mockImageModel.findOne).not.toHaveBeenCalled();
    });

    it('should include image when requested', async () => {
      const mockSession = {
        sessionId: 'test-123',
        completeAnalysis: mockAnalysis,
      };
      const mockImage = { image: 'base64-data' };

      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });
      mockImageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockImage),
      });

      const result = await service.getAnalysisSession('test-123', true);

      expect(result.handwritingImage).toBe('base64-data');
    });

    it('should throw NotFoundException when session not found', async () => {
      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getAnalysisSession('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteClientSessions', () => {
    it('should delete all client data successfully', async () => {
      mockSessionModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { sessionId: 'session-1' },
          { sessionId: 'session-2' },
        ]),
      });

      mockSessionModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      });
      mockImageModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      });
      mockFocusReportModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await service.deleteClientSessions('client-123', 'user-123');

      expect(result.sessionsDeleted).toBe(2);
      expect(result.imagesDeleted).toBe(2);
      expect(result.focusReportsDeleted).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });
});