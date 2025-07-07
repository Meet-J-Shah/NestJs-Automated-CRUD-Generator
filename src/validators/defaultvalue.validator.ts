import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
  isEmail,
  isPhoneNumber,
  isInt,
  isISO8601,
} from 'class-validator';
import {
  DynamicPasswordValidator,
  // IsDynamicPassword,
} from './passwordVail.validator';

@ValidatorConstraint({ name: 'IsValidDefaultValidator', async: false })
export class IsValidDefaultConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const obj: any = args.object;
    const subType = obj.subType;
    const parentType = obj.parentType;

    if (value === undefined || value === null) return true;

    // Decimal, float, double
    if (['decimal', 'float', 'double'].includes(subType)) {
      return /^-?\d+(\.\d+)?$/.test(String(value));
    }

    // Integer types
    if (['int', 'bigint', 'smallint'].includes(subType)) {
      return isInt(value);
    }

    // Boolean
    if (subType === 'boolean') {
      return typeof value === 'boolean';
    }

    // String types
    if (['varchar', 'char', 'tinytext', 'text'].includes(subType)) {
      return typeof value === 'string';
    }

    // Date formats
    if (subType === 'time') {
      return (
        /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value) ||
        ['NOW()', 'CURRENT_TIME'].includes(value)
      );
    }

    if (subType === 'date') {
      return /^\d{4}-\d{2}-\d{2}$/.test(value) || value === 'CURRENT_DATE';
    }

    if (subType === 'datetime') {
      return (
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ||
        ['NOW()', 'CURRENT_TIMESTAMP'].includes(value)
      );
    }

    if (subType === 'timestamp') {
      return isISO8601(value) || ['NOW()', 'CURRENT_TIMESTAMP'].includes(value);
    }

    // Enum
    if (parentType === 'Enum') {
      return (
        typeof value === 'string' &&
        Array.isArray(obj.values) &&
        obj.values.includes(value)
      );
    }

    // Set (simple-array)
    if (parentType === 'Set') {
      return (
        Array.isArray(value) &&
        Array.isArray(obj.values) &&
        value.every((v: string) => typeof v === 'string') &&
        value.every((v: string) => obj.values.includes(v))
      );
    }

    // Email
    if (subType === 'email') {
      return typeof value === 'string' && isEmail(value);
    }

    // Phone
    if (subType === 'localPhoneNumber') {
      return isPhoneNumber(value, 'IN');
    }

    if (subType === 'internationalPhoneNumber') {
      return isPhoneNumber(value);
    }

    // Password (basic string check, complex rules handled by other validator)
    const validator = new DynamicPasswordValidator();
    return validator.validate(value, {
      value,
      targetName: 'default',
      object: obj,
      property: 'default',
      constraints: [],
    });

    // Default not supported for unknown subType
    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    const subType = (args.object as any).subType;
    return `Invalid default value for subtype "${subType}"`;
  }
}

export function IsValidDefault(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsValidDefault',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsValidDefaultConstraint,
    });
  };
}
