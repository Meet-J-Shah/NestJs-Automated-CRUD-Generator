// shared/decorators/api-standard-response.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import {
  ControllerResDto,
  PaginationResDto,
} from '../utils/global/dto/global.dto';

export function ApiStandardResponse(model: Type, message = 'Success') {
  return applyDecorators(
    ApiExtraModels(ControllerResDto, model),
    ApiOkResponse({
      description: message,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ControllerResDto) },
          {
            properties: {
              statusCode: { type: 'number', example: 200 },
              message: { type: 'string', example: message },
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
}

export function ApiPaginatedResponse(model: Type, message = 'Success') {
  return applyDecorators(
    ApiExtraModels(ControllerResDto, PaginationResDto, model),
    ApiOkResponse({
      description: message,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ControllerResDto) },
          {
            properties: {
              statusCode: { type: 'number', example: 200 },
              message: { type: 'string', example: message },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              pagination: { $ref: getSchemaPath(PaginationResDto) },
            },
          },
        ],
      },
    }),
  );
}
