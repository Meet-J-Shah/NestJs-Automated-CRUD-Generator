// allow-only-for-subtypes.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function AllowOnlyForSubTypes(
  allowedSubTypes: string[], // array of allowed subtypes
  fields: string[],
  validationOptions?: ValidationOptions,
) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'AllowOnlyForSubTypes',
      target: object.constructor,
      propertyName,
      constraints: [allowedSubTypes, fields],
      options: validationOptions,
      validator: {
        validate(_: any, args: ValidationArguments) {
          const [allowedSubTypes, fields] = args.constraints;
          const obj: any = args.object;

          if (allowedSubTypes.includes(obj.subType)) return true;

          return fields.every((field: string) => obj[field] === undefined);
        },

        defaultMessage(args: ValidationArguments) {
          const [allowedSubTypes, fields] = args.constraints;
          return `Fields [${fields.join(
            ', ',
          )}] must only be defined when subType is one of [${allowedSubTypes.join(', ')}]`;
        },
      },
    });
  };
}
