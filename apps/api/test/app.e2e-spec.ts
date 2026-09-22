import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import cookieParser from "cookie-parser";
import { AppModule } from "./../src/app.module";
import { AppExceptionFilter } from "./../src/common/filters/app-exception.filter";
import { ResponseEnvelopeInterceptor } from "./../src/common/interceptors/response-envelope.interceptor";

describe("Auth API (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    app.useGlobalFilters(new AppExceptionFilter());
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    await app.init();
  });

  it("GET /api/auth/me without cookie returns UNAUTHORIZED envelope", () => {
    return request(app.getHttpServer())
      .get("/api/auth/me")
      .expect(401)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("UNAUTHORIZED");
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
