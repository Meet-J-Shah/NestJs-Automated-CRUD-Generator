import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'DynamicPasswordValidator', async: false })
export class DynamicPasswordValidator implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    const options = args.constraints[0] || {};
    const min = options.minLength ?? 8;
    const max = options.maxLength ?? 15;
    const numeric = options.Numeric !== false;
    const special = options.specialCharaters !== false;

    if (typeof value !== 'string') return false;
    if (value.length < min || value.length > max) return false;

    const lowercase = /[a-z]/.test(value);
    const uppercase = /[A-Z]/.test(value);
    if (!lowercase || !uppercase) return false;
    if (numeric && !/\d/.test(value)) return false;
    if (special && !/[@$!%*#?&]/.test(value)) return false;

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const options = args.constraints[0] || {};
    const parts = [
      `between ${options.minLength ?? 8}-${options.maxLength ?? 15} characters`,
      `one lowercase`,
      `one uppercase`,
    ];
    if (options.Numeric !== false) parts.push('one number');
    if (options.specialCharaters !== false) parts.push('one special character');
    return `Password must contain ${parts.join(', ')}`;
  }
}

import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsDynamicPassword(
  options?: {
    minLength?: number;
    maxLength?: number;
    Numeric?: boolean;
    specialCharaters?: boolean;
  },
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsDynamicPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [options],
      validator: DynamicPasswordValidator,
    });
  };
}
