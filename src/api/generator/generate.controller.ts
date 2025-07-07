import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { GenerateService } from './generate.service';
import { GenerateDto } from './dto/generate.dto';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { snakeCase } from 'lodash';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../../guards/adminAuth.guard';

function extractErrors(errors: ValidationError[], parentPath = ''): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const propertyPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const constraintMsg of Object.values(error.constraints)) {
        messages.push(`${propertyPath}: ${constraintMsg}`);
      }
    }

    if (error.children && error.children.length > 0) {
      messages.push(...extractErrors(error.children, propertyPath));
    }
  }

  return messages;
}
@ApiTags('Generator')
@Controller({ path: 'admin/generate', version: '1' })
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('access-token')
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}
  @ApiBody({
    type: GenerateDto,
    examples: {
      pizzaExample: {
        summary: 'Full example for Pizza entity generation',
        value: {
          name: 'Pizza',
          creationConfig: {
            withTimestamps: true,
            withSoftDelete: true,
            operator: true,
          },
          primaryFields: [
            {
              name: 'secondId',
              type: 'string',
              dtype: 'uuid',
            },
          ],
          indices: [
            {
              name: 'ownerName',
              indicesFields: ['owner_id', 'phone'],
            },
            {
              indicesFields: ['customer_birth_date', 'email'],
              unique: true,
            },
          ],
          fields: [
            {
              name: 'name',
              Type: 'String',
              nullable: false,
              subTypeOptions: {
                subType: 'varchar',
                length: 255,
              },
            },
            {
              name: 'email',
              Type: 'Email',
              nullable: false,
              unique: true,
              subTypeOptions: {
                subType: 'email',
                default: 'meet@gmail.com',
              },
            },
            {
              name: 'age',
              Type: 'Number',
              nullable: true,
              subTypeOptions: {
                subType: 'int',
                default: 0,
              },
            },
            {
              name: 'price',
              Type: 'Number',
              nullable: true,
              subTypeOptions: {
                subType: 'decimal',
                m: 10,
                d: 2,
                default: '12345678.99',
              },
            },
            {
              name: 'size',
              Type: 'Enum',
              nullable: true,
              subTypeOptions: {
                subType: 'enum',
                values: ['SMALL', 'MEDIUM', 'LARGE'],
                default: 'MEDIUM',
              },
            },
            {
              name: 'spice',
              Type: 'Set',
              nullable: false,
              subTypeOptions: {
                subType: 'simple-array',
                values: ['LOW', 'MILD', 'HIGH'],
                default: ['LOW', 'HIGH'],
              },
            },
            {
              name: 'customerId',
              Type: 'Uid',
              nullable: true,
              subTypeOptions: {
                subType: 'bigint',
              },
            },
            {
              name: 'customerData',
              Type: 'Json',
              nullable: true,
              subTypeOptions: {
                subType: 'json',
              },
            },
            {
              name: 'greedy',
              Type: 'Boolean',
              nullable: true,
              subTypeOptions: {
                subType: 'boolean',
              },
            },
            {
              name: 'customerBirthDate',
              Type: 'DateTime',
              nullable: true,
              subTypeOptions: {
                subType: 'datetime',
              },
            },
            {
              name: 'customerActiveTime',
              Type: 'DateTime',
              nullable: true,
              subTypeOptions: {
                subType: 'time',
              },
            },
            {
              name: 'description',
              Type: 'Text',
              nullable: true,
              subTypeOptions: {
                subType: 'tinytext',
              },
            },
            {
              name: 'phone',
              Type: 'PhoneNumber',
              nullable: true,
              subTypeOptions: {
                subType: 'localPhoneNumber',
                default: '+919054508327',
              },
            },
            {
              name: 'securePassword',
              Type: 'Password',
              nullable: true,
              subTypeOptions: {
                subType: 'password',
                minLength: 6,
                maxLength: 10,
                Numeric: true,
                specialCharaters: true,
                default: 'Secure@12123',
              },
            },
            {
              name: 'owner',
              Type: 'Relation',
              relation: {
                type: 'OneToOne',
                target: 'User',
                inverseSide: 'upiza',
                isArray: false,
              },
            },
            {
              name: 'assignedRoles',
              Type: 'Relation',
              relation: {
                type: 'OneToMany',
                target: 'Role',
                inverseSide: 'rolePiza',
                isArray: true,
                joinColumn: {
                  name: 'created_by_role_id',
                  referencedColumnName: 'secondId',
                },
                cascade: true,
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
              },
            },
            {
              name: 'createdByRole',
              Type: 'Relation',
              relation: {
                type: 'ManyToOne',
                target: 'Role',
                uniDirectional: true,
                isArray: false,
                joinColumn: {
                  name: 'created_by_role_id2',
                  referencedColumnName: 'id',
                },
                cascade: true,
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
              },
            },
            {
              name: 'Pizzapermissions',
              Type: 'Relation',
              relation: {
                type: 'ManyToMany',
                target: 'Permission',
                inverseSide: 'permissionPizza',
                isArray: true,
                joinTable: {
                  name: 'role_permission_map123',
                  joinColumn: {
                    name: 'pizza_id',
                    referencedColumnName: 'secondId',
                  },
                  inverseJoinColumn: {
                    name: 'permission_id',
                    referencedColumnName: 'id',
                  },
                },
              },
            },
            {
              name: 'relatedRoles',
              Type: 'Relation',
              relation: {
                type: 'OneToMany',
                target: 'Role',
                isArray: true,
              },
            },
            {
              name: 'lastEditedBy',
              Type: 'Relation',
              relation: {
                type: 'OneToOne',
                target: 'User',
                isArray: false,
              },
            },
          ],
        },
      },
      minimalExample: {
        summary: 'Minimal example for entity generation',
        value: {
          name: 'Pizza',
          fields: [
            {
              name: 'name',
              Type: 'String',
            },
            {
              name: 'price',
              Type: 'Number',
            },
          ],
        },
      },
    },
  })
  @Post()
  @ApiOperation({
    summary: 'Generate a resource (entity, DTOs, migration, etc.)',
  })
  @ApiResponse({
    status: 201,
    description: 'Generation completed successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Okay',
        jobId: '576',
        devResObj: {
          responseTime: '35 ms',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validaion errors in the request body',
    // type: BadRequestException,
    schema: {
      example: {
        message: [
          'fields.5.subTypeOptions.default: Invalid default value for the given subType',
        ],
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  async generate(@Body() dto: any) {
    for (const field of dto.fields ?? []) {
      if (field.subTypeOptions) {
        field.subTypeOptions.parentType = field.Type;
      }
    }
    // dto.fields.slice(0, 7).forEach((f, i) => {
    //   console.log(`Field ${i}`, f.subTypeOptions);
    // });

    // check for indices
    const allNames = [];
    const allNamesOfEntites = [];
    if (dto.primaryFields) {
      for (const primaryField of dto.primaryFields ?? []) {
        allNames.push(primaryField.dbName || snakeCase(primaryField.name));
        allNamesOfEntites.push(primaryField.name);
      }
    } else {
      allNames.push('id');
      allNamesOfEntites.push('id');
    }
    for (const field of dto.fields ?? []) {
      if (field.Type === 'Relation') {
        if (
          field.relation.type === 'OneToOne' ||
          field.relation.type === 'ManyToOne'
        ) {
          allNames.push(
            field.relation.joinColumn?.name || snakeCase(field.name) + '_id',
          );
          allNamesOfEntites.push(field.name + 'Id');
        }
      } else {
        allNames.push(field.dbName || snakeCase(field.name));
        allNamesOfEntites.push(field.name);
      }
    }

    for (const index of dto.indices ?? []) {
      const invalid = index.indicesFields.filter(
        (field) => !allNames.includes(field),
      );

      if (invalid.length > 0) {
        throw new BadRequestException(
          `Invalid index fields: ${invalid.join(', ')}. Allowed values are: ${allNames.join(', ')}`,
        );
      }
    }

    for (const Index of dto.indices ?? []) {
      Index.indicesFieldsEntity = [];
      Index.indicesFields.forEach((element) => {
        const position = allNames.findIndex((name) => name === element);
        if (position !== -1) {
          Index.indicesFieldsEntity.push(allNamesOfEntites[position]);
        }
      });
    }
    const dto2 = plainToInstance(GenerateDto, dto);

    const errors = await validate(dto2, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const flatMessages = extractErrors(errors);
      console.error('Validation Errors:\n', flatMessages.join('\n'));
      throw new BadRequestException(flatMessages);
    }

    return this.generateService.enqueue(dto2);
  }
}
