import { Processor, Process } from '@nestjs/bull';
import * as fs from 'fs';
import { Job } from 'bull';
import { execSync } from 'child_process';
import * as ejs from 'ejs';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as pluralize from 'pluralize';
import { snakeCase, camelCase, upperFirst } from 'lodash';
@Processor('generate-queue')
export class GenerateProcessor {
  @Process('generate-crud')
  async handleGenerate(job: Job) {
    console.log('GenerateProcessor received job:', job.id, job.data);

    try {
      const { name, fields, creationConfig, primaryFields, indices } = job.data;
      const className = name.charAt(0).toUpperCase() + name.slice(1);
      const camelName = className.charAt(0).toLowerCase() + className.slice(1);
      const fileName = name.toLowerCase();
      const dbTableName = name.toLowerCase();
      const fileNamePlural = pluralize(fileName);
      const entityName = className;
      const tableName = className;
      const entityFileName = fileName;
      const entityVar = fileName;
      const timestamp = Date.now();
      const constantName = className.toUpperCase(); // <--- add this line
      const constantFileName = `${camelName}PermissionsConstant`;
      const typeMap = {
        string: 'varchar',
        number: 'decimal(10,2)',
        boolean: 'tinyint',
        Date: 'timestamp',
        int: 'int',
        float: 'float',
        text: 'text',
        uuid: 'char(36)',
      };
      for (const field of fields) {
        if (field.Type === 'String') {
          field.type = 'string';
          field.dtype = field.subTypeOptions.subType || 'varchar';
        } else if (field.Type === 'Text') {
          field.type = 'string';
          field.dtype = field.subTypeOptions.subType || 'text';
        } else if (field.Type === 'Boolean') {
          field.type = 'boolean';
          field.dtype = field.subTypeOptions.subType || 'tinyint';
        } else if (field.Type === 'Json') {
          field.type = 'Record<string, any>';
          field.dtype = field.subTypeOptions.subType || 'json';
        } else if (field.Type === 'Enum') {
          field.type = 'string';
          field.dtype = field.subTypeOptions.subType || 'enum';
          field.enum = field.subTypeOptions.values;
        } else if (field.Type === 'Set') {
          field.type = `string []`;
          field.dtype = field.subTypeOptions.subType || 'simple-array';
          field.enum = field.subTypeOptions.values;
        } else if (field.Type === 'Uid') {
          field.unique = true;
          if (field.subTypeOptions.subType === 'uuid') {
            field.dtype = 'char';
            field.length = 36;
          } else if (field.subTypeOptions.subType === 'bigint') {
            field.dtype = 'bigint';
            field.type = 'string';
            field.length = field.subTypeOptions.length || 20;
          } else if (field.subTypeOptions.subType === 'string') {
            field.dtype = 'varchar';
            field.type = 'string';
            field.length = field.subTypeOptions.length || 20;
          }
        } else if (field.Type === 'DateTime') {
          if (
            ['date', 'datetime', 'timestamp'].includes(
              field.subTypeOptions.subType,
            )
          ) {
            field.type = 'Date';
            field.dtype = field.subTypeOptions.subType || 'timestamp';
          } else if (field.subTypeOptions.subType === 'time') {
            field.type = 'string';
            field.dtype = field.subTypeOptions.subType || 'time';
          }
        } else if (field.Type === 'Number') {
          if (['bigint', 'decimal'].includes(field.subTypeOptions.subType)) {
            field.type = 'string';
            field.dtype = field.subTypeOptions.subType;
          } else if (
            ['smallint', 'int', 'float', 'double'].includes(
              field.subTypeOptions.subType,
            )
          ) {
            field.type = 'number';
            field.dtype = field.subTypeOptions.subType || 'float';
          }
        } else if (field.Type === 'Relation') {
        } else if (field.Type === 'Email') {
          field.type = 'string';
          field.dtype = 'varchar';
          field.length = field.subTypeOptions.length || 255;
        } else if (field.Type === 'Password') {
          field.type = 'string';
          field.dtype = 'varchar';
          field.length = field.subTypeOptions.length || 255;
        } else if (field.Type === 'PhoneNumber') {
          field.type = 'string';
          field.dtype = 'varchar';
          field.length = field.subTypeOptions.length || 20;
        }

        if (
          field.Type !== 'Relation' &&
          field.subTypeOptions?.default !== undefined
        ) {
          field.default = field.subTypeOptions.default;
        }
        if (
          field.Type !== 'Relation' &&
          field.subTypeOptions?.length !== undefined
        ) {
          field.length = field.subTypeOptions.length;
        }
      }
      const templateData = {
        name,
        fields,
        primaryFields,
        indices,
        className,
        tableName,
        dbTableName,
        typeMap,
        creationConfig,
        timestamp,
        camelName,
        constantFileName,
        fileName,
        fileNamePlural,
        entityName,
        entityFileName,
        entityVar,
        constantName, // <--- add this line
        useBcrypt: false,
        relatedEntityClass: '',
        relatedEntityFileName: '',
        hasRoleRelation: false,
        hasUtilsModule: true,
        hasAuthModule: true,
        pluralize,
        snakeCase,
        camelCase,
        // ...any more
      };

      const appPath = join(__dirname, '..', '..', '..', '..', 'src', 'api');

      const modulePath = join(appPath, fileName);

      if (!existsSync(modulePath)) {
        mkdirSync(modulePath, { recursive: true });
        console.log('Created directory:', modulePath);
      }

      const templates = [
        {
          subDir: 'entities',
          fileName: 'module.entity',
          outputName: `${fileName}.entity.ts`,
        },
        {
          subDir: '',
          fileName: 'module.controller',
          outputName: `${fileName}.controller.ts`,
        },
        {
          subDir: '',
          fileName: 'module.service',
          outputName: `${fileName}.service.ts`,
        },
        {
          subDir: '',
          fileName: 'module.module',
          outputName: `${fileName}.module.ts`,
        },
        {
          subDir: 'dto',
          fileName: 'module.dto',
          outputName: `${fileName}.dto.ts`,
        },
        {
          subDir: 'constants',
          fileName: 'permission.constant',
          outputName: `permission.constant.ts`,
        },
        {
          subDir: '',
          fileName: 'module.migration',
          outputName: `${timestamp}-create${fileName}Table.ts`,
        },
        {
          subDir: '',
          fileName: 'updatePermission.seeder',
          outputName: `${timestamp}-updatePermissionsTable.seeder.ts`,
        },
      ];
      for (const tpl of templates) {
        const templatePath = join(
          __dirname,
          'templates',
          'module',
          tpl.subDir,
          `${tpl.fileName}.ejs`,
        );
        console.log('Rendering template:', templatePath);

        try {
          const output = await ejs.renderFile(templatePath, templateData);
          if (tpl.fileName == 'module.migration') {
            console.log('Migration is start');
            const outputPath = join('src', 'db', 'migrations', tpl.outputName);
            writeFileSync(outputPath, output);
            console.log('Wrote file:', outputPath);
            const configPath = join(
              __dirname,
              '..',
              '..',
              '..',
              '..',
              'src',
              'configs',
              'migration.config.ts',
            );

            const fileName2 = `${timestamp}-create${fileName}Table`;
            const className = `Create${name}Table${timestamp}`;

            const importLine = `import { ${className} } from '../db/migrations/${fileName2}';`;

            // Read current config
            let configText = readFileSync(configPath, 'utf-8');

            // Prevent duplicate import
            if (!configText.includes(className)) {
              // Add import line at top
              configText = `${importLine}\n${configText}`;

              // Inject into export default array
              configText = configText.replace(
                /export default\s*\[/,
                `export default [\n  ${className},`,
              );

              // Write back
              writeFileSync(configPath, configText);
              console.log(
                ` Migration class "${className}" added to migration.config.ts`,
              );
            } else {
              console.log(' Migration already exists in config.');
            }
          }
          if (tpl.fileName == 'updatePermission.seeder') {
            console.log('Migration is start');
            const outputPath = join('src', 'db', 'seeders', tpl.outputName);
            writeFileSync(outputPath, output);
            console.log('Wrote file:', outputPath);
          } else {
            const subDirPath = join(modulePath, tpl.subDir);
            if (!existsSync(subDirPath)) {
              mkdirSync(subDirPath, { recursive: true });
              console.log('Created directory:', subDirPath);
            }
            const outputPath = join(subDirPath, tpl.outputName);

            writeFileSync(outputPath, output);
            console.log('Wrote file:', outputPath);
          }
        } catch (err) {
          console.error('Template/render error with', templatePath, err);
        }
      }
      try {
        const path = join(
          __dirname,
          '..',
          '..',
          '..',
          '..',
          'src',
          'api',
          'api.module.ts',
        );
        let content = fs.readFileSync(path, 'utf-8');

        const className2 = `${className}Module`;
        const importPath = `./${fileName}/${fileName}.module`;

        // Add import line
        if (!content.includes(importPath)) {
          content =
            `import { ${className2} } from '${importPath}';\n` + content;
        }

        // Insert into imports array
        content = content.replace(
          /imports:\s*\[/,
          `imports: [\n    ${className2},`,
        );

        fs.writeFileSync(path, content);

        // change entity config.ts

        const entityPath = join(
          __dirname,
          '..',
          '..',
          '..',
          '..',
          'src',
          'configs',
          'entity.config.ts',
        );

        let content2 = fs.readFileSync(entityPath, 'utf-8');

        const importLine = `import { ${name} } from '../api/${fileName}/entities/${fileName}.entity';`;
        if (!content2.includes(importLine)) {
          content2 = `${importLine}\n` + content2;
        }

        const exportRegex = /export\s+default\s+\[\s*([\s\S]*?)\s*\];/m;
        const match = exportRegex.exec(content2);
        if (match) {
          const currentEntities = match[1];
          if (!currentEntities.includes(entityName)) {
            const newEntities = currentEntities.trim()
              ? `${currentEntities.trim()},\n  ${entityName}`
              : `  ${entityName}`;
            const newExport = `export default [\n  ${newEntities}\n];`;
            content2 = content2.replace(exportRegex, newExport);
          }
        }

        fs.writeFileSync(entityPath, content2);
      } catch (err) {
        console.error('Error in updating api module', err);
      }
      for (const field of fields) {
        if (
          field.relation &&
          (!field.relation.uniDirectional ||
            field.relation.type == 'OneToMany' ||
            field.relation.type == 'ManyToMany')
        ) {
          const oneToManyForeignKeys: string[] = [];
          const oneToManyForeignKeyTypes: string[] = [];
          const oneToManyForeignKeyDtypes: string[] = [];

          const moduleName = field.relation.target.toLowerCase();
          const relationModulePath = join(
            appPath,
            moduleName,
            'entities',
            `${moduleName}.entity.ts`,
          );

          let content = fs.readFileSync(relationModulePath, 'utf-8');

          const importLine = `import { ${name} } from '../../${fileName}/entities/${fileName}.entity';\n`;
          if (!content.includes(name)) {
            content = importLine + content;
          }
          let propertyBlock = '';
          const inverseName =
            field.relation.inverseSide ||
            `${fileName}${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`;
          //  Create the property block
          if (field.relation.type == 'OneToOne') {
            propertyBlock = `
            @OneToOne(() => ${name}, (${fileName}) => ${fileName}.${field.name})
          ${inverseName}: ${name};`;
          } else if (field.relation.type == 'OneToMany') {
            let joinColumnBlock = '';
            if (
              field.relation.joinColumn?.name ||
              field.relation.joinColumn?.referencedColumnName
            ) {
              joinColumnBlock = `${JSON.stringify(field.relation.joinColumn, null, 2)}\n`;
            }
            const options: string[] = [];
            if (field.relation.cascade !== undefined)
              options.push(`cascade: ${field.relation.cascade}`);
            if (field.relation.onDelete)
              options.push(`onDelete: '${field.relation.onDelete}'`);
            if (field.relation.onUpdate)
              options.push(`onUpdate: '${field.relation.onUpdate}'`);
            if (field.relation.nullable !== undefined)
              options.push(`nullable: ${field.relation.nullable}`);
            if (primaryFields && primaryFields.length > 1) {
              const referencedColumns: string[] = [];
              const referencedColumns2: string[] = [];
              const columnBlock = primaryFields
                .map((primaryField) => {
                  referencedColumns.push(primaryField.name);
                  referencedColumns2.push(
                    `${dbTableName}_${primaryField.dbName || snakeCase(primaryField.name)}`,
                  );
                  const columnName = `${dbTableName}_${primaryField.dbName || snakeCase(primaryField.name)}`;
                  let typeBlock;
                  if (primaryField?.dtype === 'uuid') {
                    const lengthblock2 = ', length: 36';
                    const type = 'char';
                    typeBlock = `'${type}' ${lengthblock2} `;
                  } else {
                    typeBlock = `'${primaryField?.dtype || 'bigint'}'`;
                  }
                  const aliasName = `${dbTableName}${upperFirst(camelCase(primaryField.name))}`;
                  const type = primaryField.type || 'string';
                  oneToManyForeignKeys.push(aliasName);
                  oneToManyForeignKeyTypes.push(type);
                  oneToManyForeignKeyDtypes.push(
                    primaryField.dtype || 'bigint',
                  );
                  return `@Column({ name: '${columnName}', type: ${typeBlock}, nullable: true })
                    ${aliasName}?: ${type};`;
                })
                .join('\n\n'); // Join multiple column blocks
              let joinColumnsBlock = '';

              referencedColumns.forEach((refCol, index) => {
                joinColumnsBlock += `{ name: '${referencedColumns2[index]}', referencedColumnName: '${refCol}' }`;
                if (index < referencedColumns.length - 1) {
                  joinColumnsBlock += ',\n  ';
                }
              });

              propertyBlock = `@ManyToOne(() => ${name}, (${fileName}) => ${fileName}.${field.name} ${options.length ? `, {\n  ${options.join(',\n  ')}\n}` : ''})
              @JoinColumn([ ${joinColumnsBlock} ]) ${inverseName}: ${name}; ${columnBlock}`;
            } else {
              let typeBlock;
              if (primaryFields?.[0]?.dtype === 'uuid') {
                const lengthblock2 = ', length: 36';
                const type = 'char';
                typeBlock = `'${type}' ${lengthblock2} `;
              } else {
                typeBlock = `'${primaryFields?.[0]?.dtype || 'bigint'}'`;
              }
              if (
                field.relation.joinColumn?.referencedColumnName === undefined ||
                field.relation.joinColumn?.referencedColumnName ===
                  primaryFields?.[0]?.name
              ) {
                joinColumnBlock = `{ name: '${field.relation.joinColumn?.name || dbTableName + '_' + snakeCase(primaryFields?.[0]?.name || 'id')}',
                 referencedColumnName: '${primaryFields?.[0]?.name || 'id'}' }`;
              } else {
                let nameBlock = ``;

                console.log(
                  `name: '${field.relation.joinColumn?.name || dbTableName + '_' + snakeCase(primaryFields?.[0]?.name || 'id')}',`,
                  'colName2',
                );
                nameBlock = `name: '${field.relation.joinColumn?.name || dbTableName + '_' + snakeCase(primaryFields?.[0]?.name || 'id')}',`;

                joinColumnBlock = ` { ${nameBlock}
                    referencedColumnName: '${primaryFields?.[0]?.name || 'id'}',
                  }`;
              }
              const type = primaryFields?.[0]?.type || 'string';
              oneToManyForeignKeyTypes.push(type);
              oneToManyForeignKeys.push(inverseName + 'Id');
              oneToManyForeignKeyDtypes.push(
                primaryFields?.[0]?.dtype || 'bigint',
              );
              propertyBlock = `@ManyToOne(() => ${name}, (${fileName}) => ${fileName}.${field.name} ${options.length ? `, {\n  ${options.join(',\n  ')}\n}` : ''})
              @JoinColumn( ${joinColumnBlock} ) ${inverseName}: ${name};
              @Column({ name: '${field.relation.joinColumn?.name || dbTableName + '_' + snakeCase(primaryFields?.[0]?.name || 'id')}', type: ${typeBlock}, nullable: true })
              ${inverseName}Id?: ${type};`;
            }
          } else if (field.relation.type == 'ManyToOne') {
            propertyBlock = `
            @OneToMany(() => ${name}, (${fileName}) => ${fileName}.${field.name})
           ${inverseName}: ${name}[];`;
          } else if (field.relation.type == 'ManyToMany') {
            propertyBlock = `
            @ManyToMany(() => ${name}, (${fileName}) => ${fileName}.${field.name})
         ${inverseName}: ${name}[];`;
          } else {
            console.error('Invalid Relation Type');
          }

          const insertIndex = content.lastIndexOf('}');
          content =
            content.slice(0, insertIndex) +
            propertyBlock +
            '\n}' +
            content.slice(insertIndex + 1);

          // Match the relationalFields block
          const match = content.match(
            /static\s+relationalFields\s*=\s*{([\s\S]*?)}\s+as\s+const;/,
          );
          if (!match) {
            const insertIndex = content.lastIndexOf('}');
            const relationalBlock = `\n  static relationalFields = {\n    ${inverseName}: true\n  } as const;\n`;
            content =
              content.slice(0, insertIndex) +
              relationalBlock +
              content.slice(insertIndex);
          } else {
            const fieldsBlock = match[1].trim().replace(/,?\s*$/, '');
            const newRelationalFields = `static relationalFields = {\n  ${fieldsBlock},\n   ${inverseName} : true\n} as const;`;

            content = content.replace(
              /static\s+relationalFields\s*=\s*{[\s\S]*?}\s*as\s+const\s*;/,
              newRelationalFields,
            );
          }

          if (field.relation.type === 'OneToMany') {
            // Match the selectionFields block
            const match = content.match(
              /static\s+selectFields\s*=\s*{([\s\S]*?)}\s+as\s+const;/,
            );
            if (!match) {
              const insertIndex = content.lastIndexOf('}');

              const fieldsString = oneToManyForeignKeys
                .map((name) => `  ${name}: true`)
                .join(',\n');
              const newBlock = `\n  static selectFields = {\n${fieldsString}\n  } as const;\n`;
              content =
                content.slice(0, insertIndex) +
                newBlock +
                content.slice(insertIndex);
            } else {
              // Update existing selectFields
              const fieldsBlock = match[1].trim().replace(/,?\s*$/, '');

              // Build new fields to append (skip duplicates)
              const existingFields = new Set(
                fieldsBlock
                  .split(',')
                  .map((line) => line.trim().split(':')[0])
                  .filter(Boolean),
              );

              const newFields = oneToManyForeignKeys
                .filter((name) => !existingFields.has(name))
                .map((name) => `  ${name}: true`);

              const allFields = [fieldsBlock, ...newFields].join(',\n');
              const newSelectFields = `static selectFields = {\n${allFields}\n} as const;`;

              content = content.replace(
                /static\s+selectFields\s*=\s*{[\s\S]*?}\s*as\s+const\s*;/,
                newSelectFields,
              );
            }
          }

          fs.writeFileSync(relationModulePath, content);

          // write the updated dtos for one to many relations
          if (field.relation.type === 'OneToMany') {
            const dtoPath = join(
              appPath,
              moduleName,
              'dto',
              `${moduleName}.dto.ts`,
            );
            let originalContent = fs.readFileSync(dtoPath, 'utf-8');

            const moduleClass =
              field.relation.target.charAt(0).toUpperCase() +
              field.relation.target.slice(1);

            const injectProperties = (classType: 'Create' | 'Update') => {
              const regex = new RegExp(
                `export\\s+class\\s+${classType}${moduleClass}BodyReqDto\\b(?:\\s+extends\\s+\\w+)?\\s*{`,
              );
              // const match = regex.exec(originalContent);
              const classMatch = originalContent.match(regex);
              if (!classMatch) {
                console.warn(
                  `[injectProperties] Class match not found for ${classType}${moduleClass}BodyReqDto`,
                );
                return;
              }
              const matchIndex = originalContent.indexOf(classMatch[0]);
              const openBraceIndex = originalContent.indexOf('{', matchIndex);

              // Now find matching closing brace from openBraceIndex
              let braceCount = 1;
              let closeBraceIndex = openBraceIndex + 1;

              while (
                braceCount > 0 &&
                closeBraceIndex < originalContent.length
              ) {
                const char = originalContent[closeBraceIndex];
                if (char === '{') braceCount++;
                else if (char === '}') braceCount--;
                closeBraceIndex++;
              }
              if (!match) return;

              const classStartIndex = match.index;
              // Find where class ends (first `}` after class start)
              const classEndIndex = content.indexOf('}', classStartIndex);

              if (classEndIndex === -1) return content;
              const propertyBlock = oneToManyForeignKeys
                .map((name, i) => {
                  const type = oneToManyForeignKeyDtypes[i];
                  let typeDecorator = '@IsString()';
                  if (type === 'bigint') {
                    typeDecorator = ` @ApiProperty({
                        example: '9223372036854775807',
                        description: 'BigInt primary key field (as string)',
                        type: 'string',
                      })
                      @IsString()\n  
                      @Matches(/^\\d+$/, { message: "ID must be a string of digits"})`;
                  } else if (type === 'uuid') {
                    typeDecorator = `@IsUUID()
                      @ApiProperty({
                      example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                      description: 'UUID primary key field',
                      type: 'string',
                      format: 'uuid',
                      })`;
                  } else if (type === 'int') {
                    typeDecorator = `
                    @Type(() => Number)  
                    @ApiProperty({
                      example: 123,
                      description: 'Integer primary key',
                      type: 'integer',
                      format: 'int32',
                    })
                      @IsInt()`;
                  }

                  return `
                      ${typeDecorator}
                      ${classType === 'Create' ? '@IsNotEmpty()' : '@IsOptional()'}
                      ${name}${classType === 'Create' ? '' : '?'}: ${oneToManyForeignKeyTypes[i]};`;
                })
                .join('\n');

              originalContent =
                originalContent.slice(0, closeBraceIndex - 1) +
                propertyBlock +
                '\n}' +
                originalContent.slice(closeBraceIndex);
            };

            injectProperties('Create');
            injectProperties('Update');

            fs.writeFileSync(dtoPath, originalContent);
          }

          if (field.relation.type === 'ManyToMany') {
            const modulePath = join(
              appPath,
              moduleName,
              `${moduleName}.module.ts`,
            );
            let moduleContent = fs.readFileSync(modulePath, 'utf-8');

            //  Add import new Module if not already present
            if (!moduleContent.includes(`${className}`)) {
              const importRegex = /^import\s.*?;$/gm;
              const matches = [...moduleContent.matchAll(importRegex)];
              const lastImport = matches[matches.length - 1];

              if (lastImport) {
                const indexAfterLastImport =
                  lastImport.index! + lastImport[0].length;
                const entityImport = `import { ${className} } from '../${fileName}/entities/${fileName}.entity';\n`;
                moduleContent =
                  moduleContent.slice(0, indexAfterLastImport) +
                  `\n${entityImport}` +
                  moduleContent.slice(indexAfterLastImport);
              } else {
                // fallback: no imports found
                const entityImport = `import { ${className} } from '../${fileName}/entities/${fileName}.entity';\n\n`;
                moduleContent = entityImport + moduleContent;
              }
            }

            // Add new Entity to forFeature
            moduleContent = moduleContent.replace(
              /TypeOrmModule\.forFeature\(\[\s*([^\]]*)\]/,
              (match, p1) => {
                if (p1.includes(`${className}`)) return match; // already added
                return `TypeOrmModule.forFeature([${p1.trim() ? p1.trim() + ', ' : ''}${className}]`;
              },
            );

            // Write back the module file
            fs.writeFileSync(modulePath, moduleContent, 'utf-8');

            const controllerPath = join(
              appPath,
              moduleName,
              `${moduleName}.controller.ts`,
            );

            const methodToAdd = `
                @Post('modify${field.name.charAt(0).toUpperCase() + field.name.slice(1)}')
                @HttpCode(HttpStatus.OK)
                @PermissionDecorator(${moduleName}PermissionsConstant.ADMIN_${moduleName.toUpperCase()}_CREATE)
                  @ApiOperation({ summary: 'Modify ${field.name.charAt(0).toUpperCase() + field.name.slice(1)} (connect/disconnect IDs)' })
                  @ApiExtraModels(MultiplePrimaryKeys${className}Dto)
                  @ApiBody({
                    schema: {
                      type: 'object',
                      properties: {
                        connectIds: { $ref: getSchemaPath(MultiplePrimaryKeys${className}Dto) },
                        disconnectIds: { $ref: getSchemaPath(MultiplePrimaryKeys${className}Dto) },
                      },
                    },
                  })
                  @ApiResponse({
                    status: 200,
                    description: 'modify${field.name.charAt(0).toUpperCase() + field.name.slice(1)}updated successfully.',
                    schema: {
                      example: {
                        statusCode: 200,
                        message: 'Modified ${field.name.charAt(0).toUpperCase() + field.name.slice(1)}  successfully.',
                        data: { isAdded: true },
                      },
                    },
                  })
                async modify${field.name.charAt(0).toUpperCase() + field.name.slice(1)}(
                  @Body('connectIds') connectIds: MultiplePrimaryKeys${className}Dto,
                  @Body('disconnectIds') disconnectIds: MultiplePrimaryKeys${className}Dto,
                  @Query() primaryKeyDto: PrimaryKeys${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Dto,
                ): Promise<ControllerResDto<{ isAdded: boolean }>> {
                  const result = await this.${moduleName}Service.modify${field.name.charAt(0).toUpperCase() + field.name.slice(1)}(
                    connectIds,
                    disconnectIds,
                    primaryKeyDto,
                  );
                  return this.globalService.setControllerResponse(
                    { isAdded: !!result },
                    'Many ${field.name} modified successfully.',
                  );
                }
              `;

            // Read file
            let controllerContent = fs.readFileSync(controllerPath, 'utf-8');

            //  Add import new Module if not already present
            if (
              !controllerContent.includes(`MultiplePrimaryKeys${className}Dto`)
            ) {
              const entityPrimaryKeyDtoImport = `import {MultiplePrimaryKeys${className}Dto } from '../${fileName}/dto/${fileName}.dto';\n`;

              // Find all import statements
              const importRegex = /^import\s.*?;$/gm;
              const matches = [...controllerContent.matchAll(importRegex)];

              if (matches.length === 0) {
                // No import statements, add to top
                controllerContent =
                  `${entityPrimaryKeyDtoImport}\n` + controllerContent;
              } else {
                // Insert after the last import
                const lastImport = matches[matches.length - 1];
                const indexAfterLastImport =
                  lastImport.index! + lastImport[0].length;

                controllerContent =
                  controllerContent.slice(0, indexAfterLastImport) +
                  `\n${entityPrimaryKeyDtoImport}` +
                  controllerContent.slice(indexAfterLastImport);
              }
            }
            // Check if method already exists
            if (
              controllerContent.includes(
                `modify${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`,
              )
            ) {
              console.log(' Method already exists. Skipping...');
            }

            // Find last closing brace of the controller class
            const classEndIndex = controllerContent.lastIndexOf('}');

            if (classEndIndex === -1) {
              console.error(
                ' Could not find closing brace of controller class.',
              );
            }

            // Insert method before last closing brace
            const updatedContent =
              controllerContent.slice(0, classEndIndex) +
              `\n${methodToAdd}\n` +
              controllerContent.slice(classEndIndex);

            // Write back to file
            fs.writeFileSync(controllerPath, updatedContent, 'utf-8');

            const serviceToAdd = `
           
                async modify${field.name.charAt(0).toUpperCase() + field.name.slice(1)}(
                  connectIds: MultiplePrimaryKeys${className}Dto,
                  disconnectIds: MultiplePrimaryKeys${className}Dto,
                  primaryKeyFields:PrimaryKeys${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Dto,
                ) {
                  const where${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Conditions = primaryKeyFields as unknown as FindOptionsWhere<${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}>[];
                  const ${moduleName} = await this.${moduleName}Repository.findOne({
                    where: where${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Conditions,
                    relations: ['${className.toLowerCase() + field.name.charAt(0).toUpperCase() + field.name.slice(1)}'], 
                  });

                  if (!${moduleName}) throw new NotFoundException('${moduleName} not found');

                  // get  the  entities for removing from relation
                  const whereConditions = disconnectIds.items as FindOptionsWhere<${className}>[];
                  let ${className.toLowerCase()}sToRemove: ${className}[] = [];
                  if (Array.isArray(whereConditions) && whereConditions.length > 0) {
                    ${className.toLowerCase()}sToRemove = await this.${className.toLowerCase()}Repository.find({
                      where: whereConditions,
                    });
                  }

                  if (${className.toLowerCase()}sToRemove?.length !== disconnectIds.items.length) {
                    throw new NotFoundException(
                      ' In the disconnectIds  some or all ${className} not found',
                    );
                  }

                  // get  the  entities for adding to relation
                  const whereConditionsToAdd = connectIds.items as FindOptionsWhere<${className}>[];
                  let ${className.toLowerCase()}sToAdd: ${className}[] = [];
                  if (
                    Array.isArray(whereConditionsToAdd) &&
                    whereConditionsToAdd.length > 0
                  ) {
                    ${className.toLowerCase()}sToAdd = await this.${className.toLowerCase()}Repository.find({
                      where: whereConditionsToAdd,
                    });
                  }

                  if (${className.toLowerCase()}sToAdd?.length !== connectIds.items.length) {
                    throw new NotFoundException(
                      'In the connectIds  some or all ${className} not found',
                    );
                  }
                  const ${className.toLowerCase()}Meta = this.${className.toLowerCase()}Repository.metadata;

                  ${moduleName}['${className.toLowerCase() + field.name.charAt(0).toUpperCase() + field.name.slice(1)}'] = syncManyToManyRelation(
                    ${moduleName}['${className.toLowerCase() + field.name.charAt(0).toUpperCase() + field.name.slice(1)}'],
                    ${className.toLowerCase()}sToAdd,
                    ${className.toLowerCase()}sToRemove,
                    ${className.toLowerCase()}Meta,
                  );

                  return await this.${moduleName}Repository.save(${moduleName});
                } 
          `;

            const servicePath = join(
              appPath,
              moduleName,
              `${moduleName}.service.ts`,
            );

            // Read file
            let serviceContent = fs.readFileSync(servicePath, 'utf-8');

            let importContent = ``;

            if (
              !serviceContent.includes(`MultiplePrimaryKeys${className}Dto`)
            ) {
              const entityMultiplePrimaryKeyDtoImport = `import {MultiplePrimaryKeys${className}Dto } from '../${fileName}/dto/${fileName}.dto';\n`;

              importContent = importContent + entityMultiplePrimaryKeyDtoImport;
            }
            if (
              !serviceContent.includes(
                `PrimaryKeys${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Dto`,
              )
            ) {
              const entityPrimaryKeyDtoImport = `import {PrimaryKeys${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Dto } from '../${moduleName}/dto/${moduleName}.dto';\n`;

              importContent = importContent + entityPrimaryKeyDtoImport;
            }
            if (!serviceContent.includes(`syncManyToManyRelation`)) {
              const syncManyToManyRelationImport = `import {syncManyToManyRelation} from '../../utils/relation-utils';\n`;

              importContent = importContent + syncManyToManyRelationImport;
            }
            if (!serviceContent.includes('NotFoundException')) {
              const notFoundExceptionImport = `import {NotFoundException} from '@nestjs/common';\n`;

              importContent = importContent + notFoundExceptionImport;
            }
            if (!serviceContent.includes(`${className}`)) {
              const entityImport = `import { ${className} } from '../${fileName}/entities/${fileName}.entity';\n`;

              importContent = importContent + entityImport;
            }
            if (
              !serviceContent.includes(`MultiplePrimaryKeys${className}Dto`) ||
              !serviceContent.includes(
                `PrimaryKeys${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Dto`,
              ) ||
              !serviceContent.includes(`syncManyToManyRelation`) ||
              !serviceContent.includes('NotFoundException') ||
              !serviceContent.includes(`${className}`)
            ) {
              // Find all import statements
              const importRegex = /^import\s.*?;$/gm;
              const matches = [...serviceContent.matchAll(importRegex)];

              if (matches.length === 0) {
                // No import statements, add to top
                serviceContent = `${importContent}\n` + serviceContent;
              } else {
                // Insert after the last import
                const lastImport = matches[matches.length - 1];
                const indexAfterLastImport =
                  lastImport.index! + lastImport[0].length;

                serviceContent =
                  serviceContent.slice(0, indexAfterLastImport) +
                  `\n${importContent}` +
                  serviceContent.slice(indexAfterLastImport);
              }
            }
            const RepoLine = `@InjectRepository(${className})\n    private ${className.toLowerCase()}Repository: Repository<${className}>,\n`;

            if (
              !serviceContent.includes(`${className.toLowerCase()}Repository`)
            ) {
              serviceContent = serviceContent.replace(
                /constructor\s*\(\s*([\s\S]*?)\)/,
                (match, params) => {
                  return `constructor(\n${RepoLine}${params})`;
                },
              );
            }

            if (
              serviceContent.includes(
                `modify${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`,
              )
            ) {
              console.log(' Method already exists. Skipping...');
            }

            // Find last closing brace of the controller class
            const serviceClassEndIndex = serviceContent.lastIndexOf('}');

            if (serviceClassEndIndex === -1) {
              console.error(
                ' Could not find closing brace of controller class.',
              );
            }

            // Insert method before last closing brace
            const updatedServiceContent =
              serviceContent.slice(0, serviceClassEndIndex) +
              `\n${serviceToAdd}\n` +
              serviceContent.slice(serviceClassEndIndex);
            // Write back to file
            fs.writeFileSync(servicePath, updatedServiceContent, 'utf-8');
          }
        }
      }
      execSync('npm run build');
      execSync('npm run format');
      execSync(
        `npx typeorm-ts-node-commonjs migration:run -d dist/src/data-source.js`,
        {
          stdio: 'inherit',
        },
      );
      execSync('npm run seed:config');
      execSync(`npm run seed:run -- -- seed=${className}Seeder`);

      console.log('Job processed successfully:', job.id);
      await job.moveToCompleted('done', true);
      return { status: 'done' };
    } catch (err) {
      console.error('Error in GenerateProcessor:', err);
      await job.moveToFailed(err);
      throw err;
    }
  }
}
