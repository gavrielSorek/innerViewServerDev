// src/common/common.module.ts
// Common module for shared services and providers

import { Module, Global } from '@nestjs/common';
import { ErrorHandlerService } from './errors/error-handler.service';
import { LanguageService } from './language.service';

@Global()
@Module({
  providers: [
    ErrorHandlerService,
    LanguageService,
  ],
  exports: [
    ErrorHandlerService,
    LanguageService,
  ],
})
export class CommonModule {}
