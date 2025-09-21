import { ArgumentsHost, Catch, HttpException, Logger, BadRequestException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ZodSerializationException } from 'nestjs-zod';
import { ZodError } from 'zod';

@Catch(HttpException, ZodError)
export class HttpExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException | ZodError, host: ArgumentsHost) {
    if (exception instanceof ZodError) {
      this.logger.error(`ZodError: ${exception.message}`);
      this.logger.error('Zod validation issues:', exception.issues);
      
      // Convert ZodError to BadRequestException for proper HTTP response
      const badRequestException = new BadRequestException({
        message: 'Validation failed',
        errors: exception.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      });
      
      super.catch(badRequestException, host);
      return;
    }

    if (exception instanceof ZodSerializationException) {
      const zodError = exception.getZodError();
      if (zodError instanceof ZodError) {
        this.logger.error(`ZodSerializationException: ${zodError.message}`);
      }
    }

    super.catch(exception, host);
  }
}
