import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as ejs from 'ejs';
import { promises as fsPromises, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as pluralize from 'pluralize';
import { snakeCase, camelCase, upperFirst } from 'lodash';
import { getApiProperty, applyValidation } from '../../utils/dto.helper';

import { execSync } from 'child_process';

interface Field {
  Type: string;
  type?: string;
  dtype?: string;
  subTypeOptions?: {
    subType?: string;
    default?: any;
    length?: number;
    values?: string[];
  };
  name?: string;
  dbName?: string;
  unique?: boolean;
  length?: number;
  default?: any;
  enum?: string[];
  relation?: {
    target: string;
    type: 'OneToOne' | 'OneToMany' | 'ManyToOne' | 'ManyToMany';
    inverseSide?: string;
    joinColumn?: { name?: string; referencedColumnName?: string };
    cascade?: boolean;
    onDelete?: string;
    onUpdate?: string;
    nullable?: boolean;
    uniDirectional?: boolean;
  };
}

interface JobData {
  name: string;
  fields: Field[];
  creationConfig: any;
  primaryFields: Field[];
  indices: any[];
}

@Processor('generate-queue')
export class GenerateProcessor {
  private readonly typeMap: Record<string, string> = {
    string: 'varchar',
    number: 'decimal(10,2)',
    boolean: 'tinyint',
    Date: 'timestamp',
    int: 'int',
    float: 'float',
    text: 'text',
    uuid: 'char(36)',
  };

  private readonly appPath = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'src',
    'api',
  );
  private readonly templates = [
    {
      subDir: 'entities',
      fileName: 'module.entity',
      outputName: (fileName: string) => `${fileName}.entity.ts`,
    },
    {
      subDir: '',
      fileName: 'module.controller',
      outputName: (fileName: string) => `${fileName}.controller.ts`,
    },
    {
      subDir: '',
      fileName: 'module.service',
      outputName: (fileName: string) => `${fileName}.service.ts`,
    },
    {
      subDir: '',
      fileName: 'module.module',
      outputName: (fileName: string) => `${fileName}.module.ts`,
    },
    {
      subDir: 'dto',
      fileName: 'module.dto',
      outputName: (fileName: string) => `${fileName}.dto.ts`,
    },
    {
      subDir: 'constants',
      fileName: 'permission.constant',
      outputName: () => `permission.constant.ts`,
    },
    {
      subDir: '',
      fileName: 'module.migration',
      outputName: (fileName: string, timestamp: number) =>
        `${timestamp}-create${fileName}Table.ts`,
    },
    {
      subDir: '',
      fileName: 'updatePermission.seeder',
      outputName: (fileName: string, timestamp: number) =>
        `${timestamp}-updatePermissionsTable.seeder.ts`,
    },
  ];

  @Process('generate-crud')
  async handleGenerate(job: Job<JobData>) {
    console.log('GenerateProcessor received job:', job.id, job.data);

    try {
      const templateData = this.prepareTemplateData(job.data);
      const modulePath = join(this.appPath, templateData.fileName);
      await this.ensureDirectory(modulePath);

      // Process templates in parallel
      await Promise.all(
        this.templates.map((tpl) =>
          this.processTemplate(tpl, templateData, modulePath),
        ),
      );

      // Update configuration files
      await Promise.all([
        this.updateApiModule(templateData),
        this.updateEntityConfig(templateData),
        this.processRelationFields(templateData),
      ]);

      // Run build and migration commands
      await this.runBuildAndMigrationCommands(templateData);

      console.log('Job processed successfully:', job.id);
      await job.moveToCompleted('done', true);
      return { status: 'done' };
    } catch (err) {
      console.error('Error in GenerateProcessor:', err);
      await job.moveToFailed(err as Error);
      throw err;
    }
  }

  private prepareTemplateData(data: JobData) {
    const { name, fields, creationConfig, primaryFields, indices } = data;
    const className = upperFirst(name);
    const camelName = camelCase(className);
    const fileName = name.toLowerCase();
    const fileNamePlural = pluralize(fileName);
    const dbTableName = fileName;
    const entityName = className;
    const tableName = className;
    const entityFileName = fileName;
    const entityVar = fileName;
    const timestamp = Date.now();
    const constantName = className.toUpperCase();
    const constantFileName = `${camelName}PermissionsConstant`;

    this.normalizeFields(fields);

    return {
      name,
      fields,
      primaryFields,
      indices,
      className,
      tableName,
      dbTableName,
      typeMap: this.typeMap,
      creationConfig,
      timestamp,
      camelName,
      constantFileName,
      fileName,
      fileNamePlural,
      entityName,
      entityFileName,
      entityVar,
      constantName,
      useBcrypt: false,
      relatedEntityClass: '',
      relatedEntityFileName: '',
      hasRoleRelation: false,
      hasUtilsModule: true,
      hasAuthModule: true,
      pluralize,
      snakeCase,
      camelCase,
      getApiProperty,
      applyValidation,
    };
  }

  private normalizeFields(fields: Field[]) {
    for (const field of fields) {
      const { Type, subTypeOptions = {} } = field;
      const setFieldProps = (
        type: string,
        dtype: string,
        additional?: Partial<Field>,
      ) => {
        field.type = type;
        field.dtype = dtype;
        Object.assign(field, additional);
      };

      switch (Type) {
        case 'String':
          setFieldProps('string', subTypeOptions.subType || 'varchar');
          break;
        case 'Text':
          setFieldProps('string', subTypeOptions.subType || 'text');
          break;
        case 'Boolean':
          setFieldProps('boolean', subTypeOptions.subType || 'tinyint');
          break;
        case 'Json':
          setFieldProps(
            'Record<string, any>',
            subTypeOptions.subType || 'json',
          );
          break;
        case 'Enum':
          setFieldProps('string', subTypeOptions.subType || 'enum', {
            enum: subTypeOptions.values,
          });
          break;
        case 'Set':
          setFieldProps('string[]', subTypeOptions.subType || 'simple-array', {
            enum: subTypeOptions.values,
          });
          break;
        case 'Uid':
          field.unique = true;
          if (subTypeOptions.subType === 'uuid') {
            setFieldProps('string', 'char', { length: 36 });
          } else if (subTypeOptions.subType === 'bigint') {
            setFieldProps('string', 'bigint', {
              length: subTypeOptions.length || 20,
            });
          } else if (subTypeOptions.subType === 'string') {
            setFieldProps('string', 'varchar', {
              length: subTypeOptions.length || 20,
            });
          }
          break;
        case 'DateTime':
          if (
            ['date', 'datetime', 'timestamp'].includes(
              subTypeOptions.subType || '',
            )
          ) {
            setFieldProps('Date', subTypeOptions.subType || 'timestamp');
          } else if (subTypeOptions.subType === 'time') {
            setFieldProps('string', subTypeOptions.subType || 'time');
          }
          break;
        case 'Number':
          if (['bigint', 'decimal'].includes(subTypeOptions.subType || '')) {
            setFieldProps('string', subTypeOptions.subType);
          } else if (
            ['smallint', 'int', 'float', 'double'].includes(
              subTypeOptions.subType || '',
            )
          ) {
            setFieldProps('number', subTypeOptions.subType || 'float');
          }
          break;
        case 'Email':
        case 'Password':
        case 'PhoneNumber':
          setFieldProps('string', 'varchar', {
            length:
              subTypeOptions.length || (Type === 'PhoneNumber' ? 20 : 255),
          });
          break;
      }

      if (Type !== 'Relation' && subTypeOptions.default !== undefined) {
        field.default = subTypeOptions.default;
      }
      if (Type !== 'Relation' && subTypeOptions.length !== undefined) {
        field.length = subTypeOptions.length;
      }
    }
  }

  private async ensureDirectory(path: string) {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
      console.log('Created directory:', path);
    }
  }

  private async processTemplate(
    template: {
      subDir: string;
      fileName: string;
      outputName: (fileName: string, timestamp?: number) => string;
    },
    templateData: any,
    modulePath: string,
  ) {
    const templatePath = join(
      __dirname,
      'templates',
      'module',
      template.subDir,
      `${template.fileName}.ejs`,
    );
    console.log('Rendering template:', templatePath);

    try {
      const output = await ejs.renderFile(templatePath, templateData);
      const outputPath =
        template.fileName === 'module.migration'
          ? join(
              'src',
              'db',
              'migrations',
              template.outputName(
                templateData.fileName,
                templateData.timestamp,
              ),
            )
          : template.fileName === 'updatePermission.seeder'
            ? join(
                'src',
                'db',
                'seeders',
                template.outputName(
                  templateData.fileName,
                  templateData.timestamp,
                ),
              )
            : join(
                modulePath,
                template.subDir,
                template.outputName(templateData.fileName),
              );

      await this.ensureDirectory(join(modulePath, template.subDir));
      await fsPromises.writeFile(outputPath, output);
      console.log('Wrote file:', outputPath);

      if (template.fileName === 'module.migration') {
        await this.updateMigrationConfig(
          templateData,
          `${templateData.timestamp}-create${templateData.fileName}Table`,
        );
      }
    } catch (err) {
      console.error('Template/render error with', templatePath, err);
      throw err;
    }
  }

  private async updateMigrationConfig(
    templateData: any,
    migrationFileName: string,
  ) {
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
    const className = `Create${templateData.name}Table${templateData.timestamp}`;
    const importLine = `import { ${className} } from '../db/migrations/${migrationFileName}';`;

    let configText = await fsPromises.readFile(configPath, 'utf-8');

    if (!configText.includes(className)) {
      // Add import at the top
      configText = `${importLine}\n${configText}`;

      // Append className at the end of the default array
      configText = configText.replace(
        /export default\s*\[\s*([\s\S]*?)\s*\]/,
        (match, items) => {
          const trimmed = items.trim();
          const needsComma = trimmed && !trimmed.endsWith(',');
          return `export default [\n  ${items}${needsComma ? ',' : ''}\n  ${className},\n]`;
        },
      );
      await fsPromises.writeFile(configPath, configText);
      console.log(
        `Migration class "${className}" added to migration.config.ts`,
      );
    } else {
      console.log('Migration already exists in config.');
    }
  }

  private async updateApiModule(templateData: any) {
    const path = join(this.appPath, 'api.module.ts');
    let content = await fsPromises.readFile(path, 'utf-8');
    const className = `${templateData.className}Module`;
    const importPath = `./${templateData.fileName}/${templateData.fileName}.module`;

    if (!content.includes(importPath)) {
      content = `import { ${className} } from '${importPath}';\n${content}`;
      content = content.replace(
        /imports:\s*\[/,
        `imports: [\n    ${className},`,
      );
      await fsPromises.writeFile(path, content);
    }
  }

  private async updateEntityConfig(templateData: any) {
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
    let content = await fsPromises.readFile(entityPath, 'utf-8');
    const importLine = `import { ${templateData.name} } from '../api/${templateData.fileName}/entities/${templateData.fileName}.entity';`;

    if (!content.includes(importLine)) {
      content = `${importLine}\n${content}`;
      const exportRegex = /export\s+default\s+\[\s*([\s\S]*?)\s*\];/m;
      const match = exportRegex.exec(content);
      if (match) {
        const currentEntities = match[1];
        if (!currentEntities.includes(templateData.entityName)) {
          const newEntities = currentEntities.trim()
            ? `${currentEntities.trim()},\n  ${templateData.entityName}`
            : `  ${templateData.entityName}`;
          content = content.replace(
            exportRegex,
            `export default [\n  ${newEntities}\n];`,
          );
        }
      }
      await fsPromises.writeFile(entityPath, content);
    }
  }

  private async processRelationFields(templateData: any) {
    for (const field of templateData.fields) {
      if (
        field.relation &&
        (!field.relation.uniDirectional ||
          field.relation.type === 'OneToMany' ||
          field.relation.type === 'ManyToMany')
      ) {
        await this.handleRelationField(field, templateData);
      }
    }
  }

  private async handleRelationField(field: Field, templateData: any) {
    const moduleName = field.relation!.target.toLowerCase();
    const relationModulePath = join(
      this.appPath,
      moduleName,
      'entities',
      `${moduleName}.entity.ts`,
    );
    let content = await fsPromises.readFile(relationModulePath, 'utf-8');

    const importLine = `import { ${templateData.name} } from '../../${templateData.fileName}/entities/${templateData.fileName}.entity';\n`;
    if (!content.includes(templateData.name)) {
      content = importLine + content;
    }

    const inverseName =
      field.relation!.inverseSide ||
      `${templateData.fileName}${upperFirst(field.name!)}`;
    let propertyBlock = '';

    if (field.relation!.type === 'OneToOne') {
      propertyBlock = `
        @OneToOne(() => ${templateData.name}, (${templateData.fileName}) => ${templateData.fileName}.${field.name})
        ${inverseName}: ${templateData.name};`;
    } else if (field.relation!.type === 'OneToMany') {
      propertyBlock = this.generateOneToManyPropertyBlock(field, templateData);
      await this.updateDtoForOneToMany(field, templateData);
    } else if (field.relation!.type === 'ManyToOne') {
      propertyBlock = `
        @OneToMany(() => ${templateData.name}, (${templateData.fileName}) => ${templateData.fileName}.${field.name})
        ${inverseName}: ${templateData.name}[];`;
    } else if (field.relation!.type === 'ManyToMany') {
      propertyBlock = `
        @ManyToMany(() => ${templateData.name}, (${templateData.fileName}) => ${templateData.fileName}.${field.name})
        ${inverseName}: ${templateData.name}[];`;
      await this.updateModuleAndControllerForManyToMany(field, templateData);
    }

    content =
      content.slice(0, content.lastIndexOf('}')) +
      propertyBlock +
      '\n' +
      content.slice(content.lastIndexOf('}'));

    // Update relationalFields
    const relationalFieldsMatch = content.match(
      /static\s+relationalFields\s*=\s*{([\s\S]*?)}\s+as\s+const;/,
    );
    if (!relationalFieldsMatch) {
      content =
        content.slice(0, content.lastIndexOf('}')) +
        `\n  static relationalFields = {\n    ${inverseName}: true\n  } as const;\n` +
        content.slice(content.lastIndexOf('}'));
    } else {
      const fieldsBlock = relationalFieldsMatch[1].trim().replace(/,?\s*$/, '');
      content = content.replace(
        /static\s+relationalFields\s*=\s*{[\s\S]*?}\s*as\s+const\s*;/,
        `static relationalFields = {\n  ${fieldsBlock},\n   ${inverseName} : true\n} as const;`,
      );
    }

    if (field.relation!.type === 'OneToMany') {
      const oneToManyForeignKeys = this.getOneToManyForeignKeys(
        field,
        templateData,
      );
      const selectFieldsMatch = content.match(
        /static\s+selectFields\s*=\s*{([\s\S]*?)}\s+as\s+const;/,
      );
      if (!selectFieldsMatch) {
        const fieldsString = oneToManyForeignKeys
          .map((name) => `  ${name}: true`)
          .join(',\n');
        content =
          content.slice(0, content.lastIndexOf('}')) +
          `\n  static selectFields = {\n${fieldsString}\n  } as const;\n` +
          content.slice(content.lastIndexOf('}'));
      } else {
        const fieldsBlock = selectFieldsMatch[1].trim().replace(/,?\s*$/, '');
        const existingFields = new Set(
          fieldsBlock
            .split(',')
            .map((line) => line.trim().split(':')[0])
            .filter(Boolean),
        );
        const newFields = oneToManyForeignKeys
          .filter((name) => !existingFields.has(name))
          .map((name) => `  ${name}: true`);
        content = content.replace(
          /static\s+selectFields\s*=\s*{[\s\S]*?}\s*as\s+const\s*;/,
          `static selectFields = {\n${[fieldsBlock, ...newFields].join(',\n')}\n} as const;`,
        );
      }
    }

    await fsPromises.writeFile(relationModulePath, content);
  }

  private generateOneToManyPropertyBlock(field: Field, templateData: any) {
    const options: string[] = [];
    if (field.relation!.cascade !== undefined)
      options.push(`cascade: ${field.relation!.cascade}`);
    if (field.relation!.onDelete)
      options.push(`onDelete: '${field.relation!.onDelete}'`);
    if (field.relation!.onUpdate)
      options.push(`onUpdate: '${field.relation!.onUpdate}'`);
    if (field.relation!.nullable !== undefined)
      options.push(`nullable: ${field.relation!.nullable}`);

    const primaryFields = templateData.primaryFields;
    const dbTableName = templateData.dbTableName;
    const inverseName =
      field.relation!.inverseSide ||
      `${templateData.fileName}${upperFirst(field.name!)}`;

    if (primaryFields && primaryFields.length > 1) {
      const referencedColumns = primaryFields.map((pf: Field) => pf.name);
      const referencedColumns2 = primaryFields.map(
        (pf: Field) => `${dbTableName}_${pf.dbName || snakeCase(pf.name)}`,
      );
      const columnBlock = primaryFields
        .map((pf: Field) => {
          const columnName = `${dbTableName}_${pf.dbName || snakeCase(pf.name)}`;
          const typeBlock =
            pf.dtype === 'uuid'
              ? `'char', length: 36`
              : `'${pf.dtype || 'bigint'}'`;
          const aliasName = `${dbTableName}${upperFirst(camelCase(pf.name))}`;
          return `@Column({ name: '${columnName}', type: ${typeBlock}, nullable: true })
          ${aliasName}?: ${pf.type || 'string'};`;
        })
        .join('\n\n');

      const joinColumnsBlock = referencedColumns
        .map(
          (refCol, index) =>
            `{ name: '${referencedColumns2[index]}', referencedColumnName: '${refCol}' }`,
        )
        .join(',\n  ');

      return `@ManyToOne(() => ${templateData.name}, (${templateData.fileName}) => ${templateData.fileName}.${field.name}${options.length ? `, {\n  ${options.join(',\n  ')}\n}` : ''})
        @JoinColumn([ ${joinColumnsBlock} ]) ${inverseName}: ${templateData.name}; ${columnBlock}`;
    } else {
      const typeBlock =
        primaryFields?.[0]?.dtype === 'uuid'
          ? `'char', length: 36`
          : `'${primaryFields?.[0]?.dtype || 'bigint'}'`;
      const joinColumnName =
        field.relation!.joinColumn?.name ||
        `${dbTableName}_${snakeCase(primaryFields?.[0]?.name || 'id')}`;
      const joinColumnBlock = `{ name: '${joinColumnName}', referencedColumnName: '${primaryFields?.[0]?.name || 'id'}' }`;
      return `@ManyToOne(() => ${templateData.name}, (${templateData.fileName}) => ${templateData.fileName}.${field.name}${options.length ? `, {\n  ${options.join(',\n  ')}\n}` : ''})
        @JoinColumn(${joinColumnBlock}) ${inverseName}: ${templateData.name};
        @Column({ name: '${joinColumnName}', type: ${typeBlock}, nullable: true })
        ${inverseName}Id?: ${primaryFields?.[0]?.type || 'string'};`;
    }
  }

  private getOneToManyForeignKeys(field: Field, templateData: any) {
    const primaryFields = templateData.primaryFields;
    const dbTableName = templateData.dbTableName;
    const inverseName =
      field.relation!.inverseSide ||
      `${templateData.fileName}${upperFirst(field.name!)}`;
    const keys: string[] = [];

    if (primaryFields && primaryFields.length > 1) {
      primaryFields.forEach((pf: Field) => {
        const aliasName = `${dbTableName}${upperFirst(camelCase(pf.name))}`;
        keys.push(aliasName);
      });
    } else {
      keys.push(`${inverseName}Id`);
    }
    return keys;
  }

  private async updateDtoForOneToMany(field: Field, templateData: any) {
    const moduleName = field.relation!.target.toLowerCase();
    const dtoPath = join(
      this.appPath,
      moduleName,
      'dto',
      `${moduleName}.dto.ts`,
    );
    let content = await fsPromises.readFile(dtoPath, 'utf-8');

    const oneToManyForeignKeys = this.getOneToManyForeignKeys(
      field,
      templateData,
    );
    const oneToManyForeignKeyTypes = oneToManyForeignKeys.map(
      (_, i) => templateData.primaryFields[i]?.type || 'string',
    );
    const oneToManyForeignKeyDtypes = oneToManyForeignKeys.map(
      (_, i) => templateData.primaryFields[i]?.dtype || 'bigint',
    );

    const injectProperties = (classType: 'Create' | 'Update') => {
      const regex = new RegExp(
        `export\\s+class\\s+${classType}${upperFirst(moduleName)}BodyReqDto\\b(?:\\s+extends\\s+\\w+)?\\s*{`,
      );
      const classMatch = content.match(regex);
      if (!classMatch) {
        console.warn(
          `[injectProperties] Class ${classType}${upperFirst(moduleName)}BodyReqDto not found`,
        );
        return;
      }

      const matchIndex = content.indexOf(classMatch[0]);
      const openBraceIndex = content.indexOf('{', matchIndex);
      let braceCount = 1;
      let closeBraceIndex = openBraceIndex + 1;

      while (braceCount > 0 && closeBraceIndex < content.length) {
        const char = content[closeBraceIndex];
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        closeBraceIndex++;
      }

      const propertyBlock = oneToManyForeignKeys
        .map((name, i) => {
          const type = oneToManyForeignKeyDtypes[i];
          let typeDecorator = '@IsString()';
          if (type === 'bigint') {
            typeDecorator = `@ApiProperty({ example: '9223372036854775807', description: 'BigInt primary key field (as string)', type: 'string' })
            @IsString()
            @Matches(/^\\d+$/, { message: "ID must be a string of digits"})`;
          } else if (type === 'uuid') {
            typeDecorator = `@IsUUID()
            @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'UUID primary key field', type: 'string', format: 'uuid' })`;
          } else if (type === 'int') {
            typeDecorator = `@Type(() => Number)
            @ApiProperty({ example: 123, description: 'Integer primary key', type: 'integer', format: 'int32' })
            @IsInt()`;
          }

          return `${typeDecorator}
          ${classType === 'Create' ? '@IsNotEmpty()' : '@IsOptional()'}
          ${name}${classType === 'Create' ? '' : '?'}: ${oneToManyForeignKeyTypes[i]};`;
        })
        .join('\n');

      content =
        content.slice(0, closeBraceIndex - 1) +
        propertyBlock +
        '\n}' +
        content.slice(closeBraceIndex);
    };

    injectProperties('Create');
    injectProperties('Update');
    await fsPromises.writeFile(dtoPath, content);
  }

  private async updateModuleAndControllerForManyToMany(
    field: Field,
    templateData: any,
  ) {
    const moduleName = field.relation!.target.toLowerCase();
    const className = templateData.className;

    // Update module
    const modulePath = join(
      this.appPath,
      moduleName,
      `${moduleName}.module.ts`,
    );
    let moduleContent = await fsPromises.readFile(modulePath, 'utf-8');

    if (!moduleContent.includes(className)) {
      const importLine = `import { ${className} } from '../${templateData.fileName}/entities/${templateData.fileName}.entity';\n`;
      const importRegex = /^import\s.*?;$/gm;
      const matches = [...moduleContent.matchAll(importRegex)];
      const lastImport = matches[matches.length - 1];
      if (lastImport) {
        moduleContent =
          moduleContent.slice(0, lastImport.index! + lastImport[0].length) +
          `\n${importLine}` +
          moduleContent.slice(lastImport.index! + lastImport[0].length);
      } else {
        moduleContent = importLine + moduleContent;
      }

      moduleContent = moduleContent.replace(
        /TypeOrmModule\.forFeature\(\[\s*([^\]]*)\]/,
        (match, p1) =>
          p1.includes(className)
            ? match
            : `TypeOrmModule.forFeature([${p1.trim() ? p1.trim() + ', ' : ''}${className}]`,
      );

      await fsPromises.writeFile(modulePath, moduleContent);
    }

    // Update controller
    const controllerPath = join(
      this.appPath,
      moduleName,
      `${moduleName}.controller.ts`,
    );
    let controllerContent = await fsPromises.readFile(controllerPath, 'utf-8');

    if (!controllerContent.includes(`MultiplePrimaryKeys${className}Dto`)) {
      const importLine = `import { MultiplePrimaryKeys${className}Dto } from '../${templateData.fileName}/dto/${templateData.fileName}.dto';\n`;
      const importRegex = /^import\s.*?;$/gm;
      const matches = [...controllerContent.matchAll(importRegex)];
      const lastImport = matches[matches.length - 1];
      if (lastImport) {
        controllerContent =
          controllerContent.slice(0, lastImport.index! + lastImport[0].length) +
          `\n${importLine}` +
          controllerContent.slice(lastImport.index! + lastImport[0].length);
      } else {
        controllerContent = importLine + controllerContent;
      }
    }

    const methodName = `modify${upperFirst(field.name!)}`;
    if (!controllerContent.includes(methodName)) {
      const methodToAdd = `
        @Post('modify${upperFirst(field.name!)}')
        @HttpCode(HttpStatus.OK)
        @PermissionDecorator(${moduleName}PermissionsConstant.ADMIN_${moduleName.toUpperCase()}_CREATE)
        @ApiOperation({ summary: 'Modify ${upperFirst(field.name!)} (connect/disconnect IDs)' })
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
          description: 'modify${upperFirst(field.name!)} updated successfully.',
          schema: {
            example: {
              statusCode: 200,
              message: 'Modified ${upperFirst(field.name!)} successfully.',
              data: { isAdded: true },
            },
          },
        })
        async ${methodName}(
          @Body('connectIds') connectIds: MultiplePrimaryKeys${className}Dto,
          @Body('disconnectIds') disconnectIds: MultiplePrimaryKeys${className}Dto,
          @Query() primaryKeyDto: PrimaryKeys${upperFirst(moduleName)}Dto,
        ): Promise<ControllerResDto<{ isAdded: boolean }>> {
          const result = await this.${moduleName}Service.${methodName}(
            connectIds,
            disconnectIds,
            primaryKeyDto,
          );
          return this.globalService.setControllerResponse(
            { isAdded: !!result },
            'Many ${field.name} modified successfully.',
          );
        }`;

      controllerContent =
        controllerContent.slice(0, controllerContent.lastIndexOf('}')) +
        `\n${methodToAdd}\n` +
        controllerContent.slice(controllerContent.lastIndexOf('}'));
      await fsPromises.writeFile(controllerPath, controllerContent);
    }

    // Update service
    const servicePath = join(
      this.appPath,
      moduleName,
      `${moduleName}.service.ts`,
    );
    let serviceContent = await fsPromises.readFile(servicePath, 'utf-8');

    let importContent = '';
    if (!serviceContent.includes(`MultiplePrimaryKeys${className}Dto`)) {
      importContent += `import { MultiplePrimaryKeys${className}Dto } from '../${templateData.fileName}/dto/${templateData.fileName}.dto';\n`;
    }
    if (!serviceContent.includes(`PrimaryKeys${upperFirst(moduleName)}Dto`)) {
      importContent += `import { PrimaryKeys${upperFirst(moduleName)}Dto } from '../${moduleName}/dto/${moduleName}.dto';\n`;
    }
    if (!serviceContent.includes(`syncManyToManyRelation`)) {
      importContent += `import { syncManyToManyRelation } from '../../utils/relation-utils';\n`;
    }
    if (!serviceContent.includes('NotFoundException')) {
      importContent += `import { NotFoundException } from '@nestjs/common';\n`;
    }
    if (!serviceContent.includes(className)) {
      importContent += `import { ${className} } from '../${templateData.fileName}/entities/${templateData.fileName}.entity';\n`;
    }

    if (importContent) {
      const importRegex = /^import\s.*?;$/gm;
      const matches = [...serviceContent.matchAll(importRegex)];
      const lastImport = matches[matches.length - 1];
      if (lastImport) {
        serviceContent =
          serviceContent.slice(0, lastImport.index! + lastImport[0].length) +
          `\n${importContent}` +
          serviceContent.slice(lastImport.index! + lastImport[0].length);
      } else {
        serviceContent = importContent + serviceContent;
      }
    }

    if (
      !serviceContent.includes(
        `${templateData.className.toLowerCase()}Repository`,
      )
    ) {
      const repoLine = `@InjectRepository(${className})\n    private ${templateData.className.toLowerCase()}Repository: Repository<${className}>,\n`;
      serviceContent = serviceContent.replace(
        /constructor\s*\(\s*([\s\S]*?)\)/,
        (match, params) => `constructor(\n${repoLine}${params})`,
      );
    }

    if (!serviceContent.includes(methodName)) {
      const serviceToAdd = `
        async ${methodName}(
          connectIds: MultiplePrimaryKeys${className}Dto,
          disconnectIds: MultiplePrimaryKeys${className}Dto,
          primaryKeyFields: PrimaryKeys${upperFirst(moduleName)}Dto,
        ) {
          const where${upperFirst(moduleName)}Conditions = primaryKeyFields as unknown as FindOptionsWhere<${upperFirst(moduleName)}>[];
          const ${moduleName} = await this.${moduleName}Repository.findOne({
            where: where${upperFirst(moduleName)}Conditions,
            relations: ['${className.toLowerCase() + upperFirst(field.name!)}'],
          });

          if (!${moduleName}) throw new NotFoundException('${moduleName} not found');

          const whereConditions = disconnectIds.items as FindOptionsWhere<${className}>[];
          let ${className.toLowerCase()}sToRemove: ${className}[] = [];
          if (Array.isArray(whereConditions) && whereConditions.length > 0) {
            ${className.toLowerCase()}sToRemove = await this.${className.toLowerCase()}Repository.find({
              where: whereConditions,
            });
          }

          if (${className.toLowerCase()}sToRemove?.length !== disconnectIds.items.length) {
            throw new NotFoundException('In the disconnectIds some or all ${className} not found');
          }

          const whereConditionsToAdd = connectIds.items as FindOptionsWhere<${className}>[];
          let ${className.toLowerCase()}sToAdd: ${className}[] = [];
          if (Array.isArray(whereConditionsToAdd) && whereConditionsToAdd.length > 0) {
            ${className.toLowerCase()}sToAdd = await this.${className.toLowerCase()}Repository.find({
              where: whereConditionsToAdd,
            });
          }

          if (${className.toLowerCase()}sToAdd?.length !== connectIds.items.length) {
            throw new NotFoundException('In the connectIds some or all ${className} not found');
          }

          const ${className.toLowerCase()}Meta = this.${className.toLowerCase()}Repository.metadata;
          ${moduleName}['${className.toLowerCase() + upperFirst(field.name!)}'] = syncManyToManyRelation(
            ${moduleName}['${className.toLowerCase() + upperFirst(field.name!)}'],
            ${className.toLowerCase()}sToAdd,
            ${className.toLowerCase()}sToRemove,
            ${className.toLowerCase()}Meta,
          );

          return await this.${moduleName}Repository.save(${moduleName});
        }`;

      serviceContent =
        serviceContent.slice(0, serviceContent.lastIndexOf('}')) +
        `\n${serviceToAdd}\n` +
        serviceContent.slice(serviceContent.lastIndexOf('}'));
      await fsPromises.writeFile(servicePath, serviceContent);
    }
  }

  private async runBuildAndMigrationCommands(templateData: any) {
    const commands = [
      'npm run build',
      'npm run format',
      `npx typeorm-ts-node-commonjs migration:run -d dist/src/data-source.js`,
      'npm run seed:config',
      `npm run seed:run -- --seed=${templateData.className}Seeder`,
    ];

    for (const cmd of commands) {
      await execSync(cmd, { stdio: 'inherit' });
    }
  }
}
