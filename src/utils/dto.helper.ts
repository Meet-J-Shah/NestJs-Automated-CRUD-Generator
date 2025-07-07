// Helper function to generate ApiProperty for fields
export const getApiProperty = (field: any) => {
  const base = {
    required: !field.nullable,
    description: '',
  };
  switch (field.Type) {
    case 'String':
    case 'Text':
      return {
        ...base,
        type: String,
        example:
          field.default ||
          (field.Type === 'Text'
            ? field.subTypeOptions.subType === 'tinytext'
              ? 'This is a tiny text'
              : field.subTypeOptions.subType === 'mediumtext'
                ? 'This is a long text that can be very lengthy'
                : 'This is a medium text'
            : 'username123'),
        description:
          field.Type === 'Text'
            ? field.subTypeOptions.subType === 'tinytext'
              ? 'A short text with length constraints'
              : field.subTypeOptions.subType === 'mediumtext'
                ? 'A medium text with length constraints'
                : 'A text with length constraints'
            : 'A short string with length constraints',
        maxLength:
          field.length ||
          (field.Type === 'Text'
            ? field.subTypeOptions.subType === 'tinytext'
              ? 255
              : field.subTypeOptions.subType === 'mediumtext'
                ? 16777215
                : 65535
            : 255),
        ...(field.default && { default: field.default }),
      };
    case 'Boolean':
      return {
        ...base,
        type: Boolean,
        description: 'A boolean value',
        example: field.default ?? true,
        ...(field.default && { default: field.default }),
      };
    case 'Json':
      return {
        ...base,
        type: 'object',
        description: 'JSON object containing arbitrary key-value pairs',
        example: { key: 'value' },
      };
    case 'Uid':
      return {
        ...base,
        type: String,
        description:
          field.subTypeOptions.subType === 'uuid'
            ? 'UUID field'
            : field.subTypeOptions.subType === 'bigint'
              ? 'BigInt field (as string)'
              : 'Unique String field',
        example:
          field.subTypeOptions.subType === 'uuid'
            ? 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
            : field.subTypeOptions.subType === 'bigint'
              ? '9223372036854775807'
              : 'example-string',
      };
    case 'DateTime':
      return {
        ...base,
        type: String,
        description:
          field.subTypeOptions.subType === 'date'
            ? 'Date in YYYY-MM-DD format'
            : field.subTypeOptions.subType === 'time'
              ? 'Time in HH:mm:ss format'
              : field.subTypeOptions.subType === 'timestamp'
                ? 'Timestamp in ISO 8601 format (YYYY-MM-DDTHH:mm:ss+HH:mm)'
                : 'Date and time in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)',
        format:
          field.subTypeOptions.subType === 'date'
            ? 'date'
            : field.subTypeOptions.subType === 'time'
              ? 'time'
              : 'date-time',
        example:
          field.subTypeOptions.subType === 'date'
            ? '2025-07-02'
            : field.subTypeOptions.subType === 'time'
              ? '15:30:00'
              : field.subTypeOptions.subType === 'timestamp'
                ? '2025-07-02T14:30:00+05:30'
                : '2025-07-02T14:30:00Z',
        ...(field.default && { default: field.default }),
      };
    case 'Number':
      return {
        ...base,
        type:
          field.subTypeOptions.subType === 'bigint' ||
          field.subTypeOptions.subType === 'decimal'
            ? String
            : Number,
        description:
          field.subTypeOptions.subType === 'smallint'
            ? 'Small integer value (e.g., 16-bit)'
            : field.subTypeOptions.subType === 'int'
              ? 'Standard 32-bit integer'
              : field.subTypeOptions.subType === 'decimal'
                ? `Decimal field with ${field.subTypeOptions.m - field.subTypeOptions.d} digits before and ${field.subTypeOptions.d} digits after the dot`
                : field.subTypeOptions.subType === 'bigint'
                  ? 'BigInt field (as string)'
                  : field.subTypeOptions.subType === 'float'
                    ? 'Single-precision float (32-bit)'
                    : 'Double-precision float (64-bit)',
        example:
          field.subTypeOptions.subType === 'decimal'
            ? '12345.67'
            : field.subTypeOptions.subType === 'bigint'
              ? '9223372036854775807'
              : field.subTypeOptions.subType === 'float'
                ? 1234.56
                : field.subTypeOptions.subType === 'double'
                  ? 1234.56789
                  : 1234,
        ...(field.subTypeOptions.subType === 'smallint' && {
          minimum: -32768,
          maximum: 32767,
        }),
        ...(field.subTypeOptions.subType === 'int' && {
          minimum: -2147483648,
          maximum: 2147483647,
        }),
        ...(field.subTypeOptions.subType === 'float' && {
          format: 'float',
        }),
        ...(field.subTypeOptions.subType === 'double' && {
          format: 'double',
        }),
        ...(field.subTypeOptions.subType === 'decimal' && {
          description: `Decimal with up to ${field.subTypeOptions.m - field.subTypeOptions.d} digits before and ${field.subTypeOptions.d} digits after the dot`,
        }),
        ...(field.default && { default: field.default }),
      };
    case 'Email':
      return {
        ...base,
        type: String,
        format: 'email',
        description: 'Valid email address',
        example: field.default || 'user@example.com',
        ...(field.default && { default: field.default }),
      };
    case 'Password':
      return {
        ...base,
        type: String,
        format: 'password',
        example: 'P@ssw0rd123',
        minLength: field.subTypeOptions.minLength || 6,
        maxLength: field.subTypeOptions.maxLength || 20,
        description: `Password with one lowercase, one uppercase,${field.subTypeOptions.Numeric ? ', one numeric' : ''}${field.subTypeOptions.specialCharaters ? ', one special character' : ''} with a minimum length of ${field.subTypeOptions.minLength || 6} and a maximum length of ${field.subTypeOptions.maxLength || 20}`,
        ...(field.default && { default: field.default }),
      };
    case 'PhoneNumber':
      return {
        ...base,
        type: String,
        example:
          field.subTypeOptions.subType === 'localPhoneNumber'
            ? '9876543210'
            : '+919876543210',
        description:
          field.subTypeOptions.subType === 'localPhoneNumber'
            ? 'Indian phone number in 10-digit local format'
            : 'Phone number in valid international format (E.164)',
        ...(field.default && { default: field.default }),
      };
    case 'Enum':
      return {
        ...base,
        enum: field.enum,
        example: field.enum[0],
        description: 'Allowed values for this enum field',
        ...(field.default && { default: field.default }),
      };
    case 'Set':
      return {
        ...base,
        type: [String],
        enum: field.enum,
        example: field.enum.slice(0, 2),
        description: 'Array of allowed values for this set field',
        isArray: true,
        ...(field.default && { default: field.default }),
      };
    default:
      return { ...base, type: String, example: field.default || field.name };
  }
};

// Helper function for validation decorators
export const applyValidation = (field: any, isUpdate = false) => {
  const decorators: string[] = [];
  if (!isUpdate && !field.nullable)
    decorators.push('@IsDefined()', '@IsNotEmpty()');
  if (isUpdate || field.nullable) decorators.push('@IsOptional()');

  switch (field.Type) {
    case 'String':
    case 'Text':
      decorators.push(
        `@IsString()`,
        `@MaxLength(${field.length || (field.Type === 'Text' ? (field.subTypeOptions.subType === 'tinytext' ? 255 : field.subTypeOptions.subType === 'mediumtext' ? 16777215 : 65535) : 255)})`,
      );
      if (field.default)
        decorators.push(
          `@Transform(({ value }) => value || ${JSON.stringify(field.default)})`,
        );
      break;
    case 'Boolean':
      decorators.push('@IsBoolean()');
      if (field.default)
        decorators.push(`@Transform(({ value }) => value || ${field.default})`);
      break;
    case 'Json':
      decorators.push(
        `@Transform(({ value }) => typeof value === 'string' ? JSON.parse(value) : value, { toClassOnly: true })`,
        '@IsObject()',
      );
      break;
    case 'Uid':
      if (field.subTypeOptions.subType === 'uuid') decorators.push('@IsUUID()');
      else if (field.subTypeOptions.subType === 'bigint')
        decorators.push(
          '@IsString()',
          '@Matches(/^\\d+$/, { message: "ID must be a string of digits" })',
        );
      else decorators.push('@IsString()');
      break;
    case 'DateTime':
      if (
        ['date', 'datetime', 'timestamp'].includes(field.subTypeOptions.subType)
      ) {
        decorators.push('@IsISO8601()');
        decorators.push(
          field.default
            ? `@Transform(({ value }) => (value ? new Date(value) : undefined))`
            : `@Transform(({ value }) => value ?? new Date().toISOString())`,
        );
      } else if (field.subTypeOptions.subType === 'time') {
        decorators.push(
          '@IsString()',
          '@Matches(/^([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$/, { message: "Time must be in HH:mm:ss format" })',
        );
        if (field.default)
          decorators.push(
            `@Transform(({ value }) => value ?? "${field.default}")`,
          );
      }
      break;
    case 'Number':
      if (field.subTypeOptions.subType === 'smallint')
        decorators.push('@IsInt()', '@Min(-32768)', '@Max(32767)');
      else if (field.subTypeOptions.subType === 'int')
        decorators.push('@IsInt()', '@Min(-2147483648)', '@Max(2147483647)');
      else if (field.subTypeOptions.subType === 'bigint')
        decorators.push(
          '@IsString()',
          '@Matches(/^-?\\d+$/, { message: "Must be a valid bigint string" })',
        );
      else if (['float', 'double'].includes(field.subTypeOptions.subType))
        decorators.push('@IsNumber({ maxDecimalPlaces: 8 })');
      else if (field.subTypeOptions.subType === 'decimal') {
        const P = field.subTypeOptions.m || 10;
        const S = field.subTypeOptions.d || 2;
        decorators.push(
          '@IsString()',
          `@Matches(/^\\d{1,${P - S}}(\\.\\d{1,${S}})?$/, { message: "Must be a decimal with up to ${P - S} digits before and ${S} digits after the dot" })`,
        );
      }
      if (field.default)
        decorators.push(`@Transform(({ value }) => value || ${field.default})`);
      break;
    case 'Email':
      decorators.push('@IsEmail({}, { message: "Invalid email address" })');
      if (field.default)
        decorators.push(
          `@Transform(({ value }) => value || "${field.default}")`,
        );
      break;
    case 'Password':
      decorators.push(
        `@IsDynamicPassword({ minLength: ${field.subTypeOptions.minLength || 6}, maxLength: ${field.subTypeOptions.maxLength || 20}, Numeric: ${field.subTypeOptions.Numeric ?? true}, specialCharaters: ${field.subTypeOptions.specialCharaters ?? true} })`,
      );
      if (field.default)
        decorators.push(
          `@Transform(({ value }) => value || "${field.default}")`,
        );
      break;
    case 'PhoneNumber':
      if (field.subTypeOptions.subType === 'localPhoneNumber')
        decorators.push(
          '@IsPhoneNumber("IN", { message: "Invalid Indian phone number" })',
        );
      else
        decorators.push(
          '@IsPhoneNumber(null, { message: "Phone number must be in valid international format (E.164)" })',
        );
      if (field.default)
        decorators.push(
          `@Transform(({ value }) => value || "${field.default}")`,
        );
      break;
    case 'Enum':
      decorators.push(
        `@IsIn(${JSON.stringify(field.enum)})`,
        `@Transform(({ value }) => value || "${field.default || field.enum[0]}")`,
      );
      break;
    case 'Set':
      decorators.push(
        '@IsArray()',
        '@ArrayNotEmpty()',
        `@IsIn(${JSON.stringify(field.enum)}, { each: true })`,
      );
      if (field.default)
        decorators.push(
          `@Transform(({ value }) => value ?? ${JSON.stringify(field.default)})`,
        );
      break;
  }
  return decorators.join('\n');
};
