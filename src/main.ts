import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { VersioningType, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { ApiResponseInterceptor } from './interceptors/apiResponse.interceptor';
import {
  ControllerResDto,
  PaginationResDto,
} from './utils/global/dto/global.dto';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // allow specific method and origin for api request
  app.enableCors({
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    origin: '*',
    //  (
    //   requestOrigin: string,
    //   next: (err: Error | null, origin?: string[]) => void,
    // ) => {
    //   const origins: string = process.env.CORS_ORIGIN;
    //   const originArray: string[] = origins.split(',');
    //   next(null, originArray);
    // },
  });
  // for requests security
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          upgradeInsecureRequests: null, // disables HTTPS upgrade
        },
      },
    }),
  );
  // set prefix for all api
  app.setGlobalPrefix('api');
  // for api versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });
  // for request validation
  app.useGlobalPipes(new ValidationPipe());
  // update api response format
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  // swagger setup
  const config = new DocumentBuilder()
    .setTitle('Boilerplate APIs')
    .setVersion('1.0')
    // .addTag('Boilerplate')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT', // Optional
      },
      'access-token', // This name is important for @ApiBearerAuth('access-token')
    )
    .addServer('http://192.168.11.160:3000')
    // .addServer('http://localhost:3000')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ControllerResDto, PaginationResDto],
  });
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      url: '/swagger-json', // tells Swagger UI what to load, relative to current host
    },
  });
  app.use('/swagger-json', (req, res) => {
    res.json(document);
  });
  // start server
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
