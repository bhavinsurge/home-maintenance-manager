import { PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';
import { validationError } from '../errors/app-error';
import { ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value ?? {});
    } catch (error) {
      if (error instanceof ZodError) {
        throw validationError('Request validation failed', error.flatten());
      }
      throw error;
    }
  }
}

export function ZodBody(schema: ZodType) {
  return new ZodValidationPipe(schema);
}

export function ZodQuery(schema: ZodType) {
  return new ZodValidationPipe(schema);
}
