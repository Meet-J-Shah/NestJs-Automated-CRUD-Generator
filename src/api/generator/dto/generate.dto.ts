import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsInt,
  ValidateNested,
  IsObject,
  IsIn,
  ValidateIf,
  ArrayMaxSize,
  IsDefined,
  IsNotEmpty,
  Min,
  Max,
  IsEmpty,
  ArrayUnique,
  ArrayNotEmpty,
  ArrayMinSize,
  // Matches,
  // ArrayUnique,
  // ArrayNotEmpty,
  // IsEmail,
  // Validate,
  // IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsValidEntityTarget,
  IsValidInverseSide,
} from '../../../decorators/relationValid.decorator';
import { AllowOnlyForSubTypes } from '../../../validators/allowSubtypes.validator';
import { IsValidDefault } from '../../../validators/defaultvalue.validator';

import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class JoinColumnOptionsDto {
  @ApiPropertyOptional({
    description:
      'Name of the join column in this entity (i.e., foreign key column)',
    example: 'author_id',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description:
      'Name of the referenced column in the target entity (usually the primary key)',
    example: 'id',
  })
  @IsOptional()
  @IsString()
  referencedColumnName?: string;
}

export class JoinTableOptionsDto {
  @ApiPropertyOptional({
    description:
      'Name of the join table. If not provided, TypeORM will auto-generate one.',
    example: 'user_roles',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description:
      'Options for the join column referencing the owning side of the relation.',
    type: () => JoinColumnOptionsDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => JoinColumnOptionsDto)
  joinColumn?: JoinColumnOptionsDto;

  @ApiPropertyOptional({
    description:
      'Options for the inverse join column referencing the related entity.',
    type: () => JoinColumnOptionsDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => JoinColumnOptionsDto)
  inverseJoinColumn?: JoinColumnOptionsDto;
}

export class RelationDto {
  @ApiProperty({
    description: 'Type of the relationship',
    enum: ['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'],
    example: 'ManyToOne',
  })
  @IsString()
  @IsIn(['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'])
  type: 'OneToOne' | 'OneToMany' | 'ManyToOne' | 'ManyToMany';

  @ApiProperty({
    description: 'Target entity name for the relation (must exist)',
    example: 'User',
  })
  @IsString()
  @IsValidEntityTarget({ message: 'Target entity does not exist.' })
  target: string;

  @ApiPropertyOptional({
    description:
      'Inverse side property name in the target entity (for bidirectional relation)',
    example: 'posts',
  })
  @IsOptional()
  @IsString()
  @IsValidInverseSide({ message: 'Invalid inverseSide for target entity.' })
  inverseSide?: string;

  @ApiPropertyOptional({
    description: 'Set to true for uni-directional relation',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  uniDirectional?: boolean = false;

  @ApiPropertyOptional({
    description:
      'Indicates if this relation is an array (used for ManyToMany or OneToMany)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isArray?: boolean = false;

  @ApiPropertyOptional({
    description:
      'Join column configuration (only for OneToOne, OneToMany, ManyToOne)',
    type: () => JoinColumnOptionsDto,
  })
  @ValidateIf((o) => ['OneToOne', 'OneToMany', 'ManyToOne'].includes(o.type))
  @IsOptional()
  @ValidateNested()
  @Type(() => JoinColumnOptionsDto)
  joinColumn?: JoinColumnOptionsDto;

  @ApiPropertyOptional({
    description: 'Join table configuration (only for ManyToMany)',
    type: () => JoinTableOptionsDto,
  })
  @ValidateIf((o) => o.type === 'ManyToMany')
  @IsOptional()
  @ValidateNested()
  @Type(() => JoinTableOptionsDto)
  joinTable?: JoinTableOptionsDto;

  // Explicitly throw error when joinTable is defined for types != ManyToMany
  @ApiHideProperty()
  @ValidateIf((o) => o.type !== 'ManyToMany' && o.joinTable)
  @IsEmpty({
    message:
      'joinTable must not be defined unless relation type is "ManyToMany"',
  })
  private _invalidJoinTable?: any;

  @ApiPropertyOptional({
    description: 'Cascade inserts/updates',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  cascade?: boolean = false;

  @ApiPropertyOptional({
    description: 'ON DELETE rule for foreign key',
    enum: ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'],
    example: 'SET NULL',
  })
  @IsOptional()
  @IsString()
  @IsIn(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'])
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

  @ApiPropertyOptional({
    description: 'ON UPDATE rule for foreign key',
    enum: ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'],
    example: 'CASCADE',
  })
  @IsOptional()
  @IsString()
  @IsIn(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'])
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

  @ApiPropertyOptional({
    description: 'Is this column nullable?',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  nullable?: boolean = true;
}

const allowedSubTypesMap = {
  String: ['varchar', 'char'],
  Text: ['tinytext', 'mediumtext', 'text'],
  Json: ['json'],
  Boolean: ['boolean'],
  Enum: ['enum'],
  Set: ['simple-array'],
  Uid: ['uuid', 'bigint', 'string'],
  DateTime: ['date', 'datetime', 'timestamp', 'time'],
  Number: ['smallint', 'int', 'bigint', 'float', 'double', 'decimal'],
  Email: ['email'],
  Password: ['password'],
  PhoneNumber: ['localPhoneNumber', 'internationalPhoneNumber'],
};
export class SubTypeOptionsDto {
  // Needed for conditional validation
  @ApiPropertyOptional({
    description: 'The parent data type to which subType belongs',
    example: 'String',
    enum: Object.keys(allowedSubTypesMap),
  })
  @IsOptional()
  @IsString()
  parentType?: string;

  @ApiPropertyOptional({
    description: 'The specific subType used in the database layer',
    example: 'varchar',
    enum: Object.values(allowedSubTypesMap).flat(),
  })
  @ValidateIf((o) => {
    const allowed = allowedSubTypesMap[o.parentType] ?? [];
    return allowed.length > 0;
  })
  @IsIn(Object.values(allowedSubTypesMap).flat(), {
    message: (args) => {
      const parentType = (args.object as any).parentType;
      const allowed = allowedSubTypesMap[parentType] ?? [];
      return `subType must be one of [${allowed.join(', ')}] for parentType "${parentType}"`;
    },
  })
  subType: string;

  @ApiPropertyOptional({
    description: 'Length for string-based types like varchar or char',
    example: 255,
  })
  @ValidateIf((o) => o.parentType === 'String')
  @IsOptional()
  @IsInt()
  length?: number;

  @AllowOnlyForSubTypes(['char', 'varchar'], ['length'])
  private __stringFieldsOnly__: any;

  @ApiPropertyOptional({
    description: 'Precision (M) for decimal subType (e.g., decimal(10, 2))',
    example: 10,
  })
  @ValidateIf((o) => o.subType === 'decimal')
  @IsOptional()
  @IsInt()
  m?: number;

  @ApiPropertyOptional({
    description: 'Scale (D) for decimal subType (e.g., decimal(10, 2))',
    example: 2,
  })
  @ValidateIf((o) => o.subType === 'decimal')
  @IsOptional()
  @IsInt()
  d?: number;

  @AllowOnlyForSubTypes(['decimal'], ['m', 'd'])
  private __decimalFieldsOnly__: any;

  @ApiPropertyOptional({
    description: 'Minimum length for password type',
    example: 6,
  })
  @ValidateIf((o) => o.subType === 'password')
  @IsOptional()
  @IsInt({ message: 'minLength must be an integer' })
  @Min(4, { message: 'minLength must be at least 4 characters' })
  @Max(20, { message: 'minLength must not exceed 20 characters' })
  minLength?: number;

  @ApiPropertyOptional({
    description: 'Maximum length for password type',
    example: 12,
  })
  @ValidateIf((o) => o.subType === 'Password')
  @IsOptional()
  @IsInt()
  @Max(20, { message: 'maxLength must not exceed 20 characters' })
  @Min(4, { message: 'maxLength must be at least 4 characters' })
  maxLength?: number;

  @ApiPropertyOptional({
    description: 'Whether password must include numbers',
    example: true,
    default: true,
  })
  @ValidateIf((o) => o.subType === 'password')
  @IsOptional()
  @IsBoolean()
  Numeric?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether password must include special characters',
    example: true,
    default: true,
  })
  @ValidateIf((o) => o.subType === 'password')
  @IsOptional()
  @IsBoolean()
  specialCharaters?: boolean = true;

  // @AllowOnlyForSubTypes(
  //   ['password'],
  //   ['minLength', 'maxLength', 'Numeric', 'specialCharaters'],
  // )
  // private __passwordFieldsOnly__: any;

  @ApiPropertyOptional({
    description: 'Allowed values for Enum or Set (simple-array)',
    example: ['PENDING', 'ACTIVE', 'DISABLED'],
  })
  @ValidateIf((o) => o.parentType === 'Enum' || o.parentType === 'Set')
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsDefined()
  @IsString({ each: true })
  values?: string[];

  @AllowOnlyForSubTypes(['enum', 'simple-array'], ['values'])
  private __valueFieldsOnly__: any;

  @ApiPropertyOptional({
    description:
      'Default value depending on subType. Must match allowed type and values.',
    example: 'ACTIVE',
  })

  // @ValidateIf((o) => ['decimal', 'float', 'double'].includes(o.subType))
  // @Matches(/^-?\d+(\.\d+)?$/, {
  //   message: 'Default must be a valid decimal/float string',
  // })

  // // Integer types
  // @ValidateIf((o) => ['int', 'bigint', 'smallint'].includes(o.subType))
  // @IsInt()

  // // Boolean
  // @ValidateIf((o) => o.subType === 'boolean')
  // @IsBoolean()

  // // String types
  // @ValidateIf((o) =>
  //   ['varchar', 'char', 'tinytext', 'text'].includes(o.subType),
  // )
  // @IsString()

  // // Date types
  // @ValidateIf((o) => o.subType === 'time')
  // @Matches(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$|^NOW\(\)$|^CURRENT_TIME$/, {
  //   message:
  //     'Default for TIME must be in HH:mm:ss format or NOW() or CURRENT_TIME',
  // })
  // @ValidateIf((o) => o.subType === 'date')
  // @Matches(/^\d{4}-\d{2}-\d{2}$|^CURRENT_DATE$/, {
  //   message: 'Default for DATE must be in YYYY-MM-DD format or CURRENT_DATE',
  // })
  // @ValidateIf((o) => o.subType === 'datetime')
  // @Matches(
  //   /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$|^NOW\(\)$|^CURRENT_TIMESTAMP$/,
  //   {
  //     message:
  //       'Default for DATETIME must be in YYYY-MM-DD HH:mm:ss format, NOW() or CURRENT_TIMESTAMP',
  //   },
  // )
  // @ValidateIf((o) => o.subType === 'timestamp')
  // @Matches(
  //   /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$|^NOW\(\)$|^CURRENT_TIMESTAMP$/,
  //   {
  //     message:
  //       'Default for TIMESTAMP must be in ISO 8601 format (UTC) or NOW() or CURRENT_TIMESTAMP',
  //   },
  // )

  // // Enum
  // @ValidateIf((o) => o.parentType === 'Enum' && Array.isArray(o.values))
  // @IsString()
  // @ValidateIf((o) => Array.isArray(o.values) && o.values.includes(o.default))

  // // Set (simple-array)
  // @ValidateIf((o) => o.parentType === 'Set' && Array.isArray(o.values))
  // @IsArray()
  // @ArrayNotEmpty()
  // @ArrayUnique()
  // @IsString({ each: true })
  // @ValidateIf(
  //   (o) =>
  //     Array.isArray(o.default) &&
  //     Array.isArray(o.values) &&
  //     o.default.every((val: string) => o.values.includes(val)),
  // )

  // // for email
  // @ValidateIf((o) => o.subType === 'email')
  // @IsEmail({}, { message: 'Default must be a valid email address' })

  // // for local phone number
  // @ValidateIf((o) => o.subType === 'localPhoneNumber')
  // @IsPhoneNumber('IN', {
  //   message: 'Default must be a valid Indian phone number',
  // })
  // @ValidateIf((o) => o.subType === 'internationalPhoneNumber')
  // @IsPhoneNumber(null, { message: 'Default must be a valid phone number' })

  // // for password
  // @ValidateIf((o) => o.subType === 'password')
  // @Validate(DynamicPasswordValidator)

  // // Disallow for all others
  // @ValidateIf(
  //   (o) =>
  //     ![
  //       'decimal',
  //       'float',
  //       'double',
  //       'int',
  //       'bigint',
  //       'smallint',
  //       'boolean',
  //       'varchar',
  //       'char',
  //       'tinytext',
  //       'text',
  //       'date',
  //       'datetime',
  //       'timestamp',
  //       'time',
  //       'enum',
  //       'simple-array',
  //       'email',
  //       'localPhoneNumber',
  //       'internationalPhoneNumber',
  //       'password',
  //     ].includes(o.subType),
  // )
  // @IsEmpty({ message: 'Default not supported for this subtype' })
  // default?: string | number | boolean | string[] | Date;
  @IsValidDefault({ message: 'Invalid default value for the given subType' })
  default?: string | number | boolean | string[] | Date;
}

export class FieldDto {
  @ApiProperty({
    description: 'Field name used in code',
    example: 'email',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description:
      'Custom database column name (defaults to name if not provided)',
    example: 'user_email',
  })
  @IsString()
  @IsOptional()
  dbName?: string;

  @ApiProperty({
    description:
      'High-level type category used to infer database or validation logic',
    enum: [
      'String',
      'Text',
      'Boolean',
      'Json',
      'Enum',
      'Set',
      'Uid',
      'DateTime',
      'Number',
      'Relation',
      'Email',
      'Password',
      'PhoneNumber',
    ],
    example: 'String',
  })
  @IsString()
  @IsIn([
    'String',
    'Text',
    'Boolean',
    'Json',
    'Enum',
    'Set',
    'Uid',
    'DateTime',
    'Number',
    'Relation',
    'Email',
    'Password',
    'PhoneNumber',
  ])
  @IsNotEmpty()
  @IsDefined()
  Type:
    | 'String'
    | 'Text'
    | 'Boolean'
    | 'Json'
    | 'Enum'
    | 'Set'
    | 'Uid'
    | 'DateTime'
    | 'Number'
    | 'Relation'
    | 'Email'
    | 'Password'
    | 'PhoneNumber';

  @ApiPropertyOptional({
    description:
      'Options specific to the subType, required for non-relation fields',
    type: () => SubTypeOptionsDto,
  })
  @ValidateIf((o) => o.Type !== 'Relation')
  @ValidateNested()
  @Type(() => SubTypeOptionsDto)
  @IsDefined()
  subTypeOptions: SubTypeOptionsDto;

  // @ApiPropertyOptional({
  //   description:
  //     'Optional override for database column type (for advanced use)',
  //   example: 'varchar',
  // })
  @IsOptional()
  @IsString()
  type?: string;

  // @ApiPropertyOptional({
  //   description: 'Optional override for database dialect-specific type',
  //   example: 'uuid',
  // })
  @IsOptional()
  @IsString()
  dtype?: string;

  // @IsOptional()
  // @IsInt()
  // length?: number;

  @ApiPropertyOptional({
    description: 'Indicates if the column can be null',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  nullable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this field should be unique across records',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  unique?: boolean;

  // @IsOptional()
  // @IsArray()
  // @IsString({ each: true })
  // enum?: string[];

  // @IsOptional()
  // @ValidateIf((o) => typeof o.default === 'number')
  // @IsNumber()
  // @ValidateIf((o) => typeof o.default === 'string')
  // @IsString()
  // default?: number | string;

  @ApiPropertyOptional({
    description: 'Relation definition, required when Type is "Relation"',
    type: () => RelationDto,
  })
  @ValidateIf((o) => o.Type === 'Relation')
  @IsDefined({ message: 'relation must be defined when Type is "Relation"' })
  @ValidateNested()
  @Type(() => RelationDto)
  relation?: RelationDto;
}
// This DTO is used for defining primary fields in the entity generation process.
export class primaryFieldDto {
  @ApiProperty({
    description: 'The logical name of the primary key field',
    example: 'id',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Custom database column name for the primary field (optional)',
    example: 'user_id',
  })
  @IsString()
  @IsOptional()
  dbName?: string;

  @ApiPropertyOptional({
    description:
      'The general data type (used for runtime or validation decisions)',
    enum: ['string', 'number'],
    example: 'string',
  })
  @IsOptional()
  @IsString()
  @IsIn(['string', 'number'])
  type?: 'string' | 'number';

  @ApiPropertyOptional({
    description: 'Specific database type for the primary key',
    enum: ['int', 'bigint', 'uuid'],
    example: 'uuid',
  })
  @IsOptional()
  @IsString()
  @IsIn(['int', 'bigint', 'uuid'])
  dtype?: 'int' | 'bigint' | 'uuid';
}

export class CreationConfigDto {
  @ApiPropertyOptional({
    description: 'Whether to include createdAt and updatedAt timestamp columns',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  withTimestamps?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to include a soft delete column (deletedAt)',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  withSoftDelete?: boolean;

  @ApiPropertyOptional({
    description:
      'Whether to include createdBy and updatedBy operator tracking columns',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  operator?: boolean;
}

export class IndicesDto {
  @ApiPropertyOptional({
    description: 'Optional name of the index (defaults to generated name)',
    example: 'user_email_index',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Field names (in DTO) that should be part of the index',
    type: [String],
    example: ['email', 'isActive'],
  })
  @IsDefined({ message: 'indicesFields must be defined' })
  @ArrayMinSize(1)
  @IsArray()
  @IsString({ each: true })
  indicesFields: string[];

  @ApiProperty({
    description: 'Corresponding field names in the entity that are indexed',
    type: [String],
    example: ['email', 'is_active'],
  })
  @IsDefined({ message: 'indicesFieldsEntity must be defined' })
  @ArrayMinSize(1)
  @IsArray()
  @IsString({ each: true })
  indicesFieldsEntity: string[];

  @ApiPropertyOptional({
    description: 'Whether this index should enforce uniqueness',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  unique?: boolean;
}

export class GenerateDto {
  @ApiProperty({
    description: 'Name of the entity/resource being generated',
    example: 'User',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'List of all fields to include in the entity and DTOs',
    type: [FieldDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDto)
  fields: FieldDto[];

  @ApiPropertyOptional({
    description:
      'Optional definition of primary field(s), limited to one for now',
    maxItems: 1,
    type: [primaryFieldDto],
    example: [{ name: 'id', type: 'string', dtype: 'uuid' }],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => primaryFieldDto)
  primaryFields?: primaryFieldDto[];

  @ApiPropertyOptional({
    description:
      'Configuration options such as timestamps, soft deletes, and operators',
    type: () => CreationConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreationConfigDto)
  creationConfig?: CreationConfigDto;

  @ApiPropertyOptional({
    description: 'List of custom indices to be created on this entity',
    type: [IndicesDto],
    example: [
      {
        name: 'user_email_index',
        indicesFields: ['email'],
        indicesFieldsEntity: ['email'],
        unique: true,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IndicesDto)
  indices?: IndicesDto[];
}
