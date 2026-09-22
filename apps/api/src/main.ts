import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.enableCors({
    origin: "http://localhost:3005",
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 4005);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Homestead API listening on http://localhost:${port}/api`);
}

bootstrap();
