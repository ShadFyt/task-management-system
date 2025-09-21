import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { z } from 'zod';

/**
 * Creates an Angular validator from a Zod schema
 */
export function zodValidator(schema: z.ZodSchema): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (
      control.value === null ||
      control.value === undefined ||
      control.value === ''
    ) {
      return null;
    }

    const result = schema.safeParse(control.value);

    if (result.success) {
      return null;
    }

    // Convert Zod errors to Angular validation errors
    const errors: ValidationErrors = {};
    result.error.errors.forEach((error) => {
      const key = error.path.join('.') || 'validation';
      errors[key] = {
        message: error.message,
        code: error.code,
        actualValue: control.value,
      };
    });

    return errors;
  };
}
