import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as pactum from 'pactum';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthDto } from 'src/auth/dto';
import { EditUserDto } from 'src/user/dto';
import { CreateBookmarkDto, EditBookmarkDto } from 'src/bookmark/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();
    await app.listen(3333);

    prisma = app.get(PrismaService);
    await prisma.cleandb();

    pactum.request.setBaseUrl('http://localhost:3333');
  });

  afterAll(async () => {
    app.close();
  });

  describe('Auth', () => {
    const authDto: AuthDto = {
      email: 'aditya15goyal@gmail.com',
      password: '1234',
    };

    describe('Signup', () => {
      it('should throw if email empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({ password: authDto.password })
          .expectStatus(400)
          .inspect();
      });

      it('should throw if password empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({ email: authDto.email })
          .expectStatus(400)
          .inspect();
      });

      it('should signup', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(authDto)
          .expectStatus(201)
          .inspect();
      });

      it('should throw if user is already signed up', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(authDto)
          .expectStatus(403)
          .inspect();
      });
    });

    describe('Signin', () => {
      it('should throw if email empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ password: authDto.password })
          .expectStatus(400)
          .inspect();
      });

      it('should throw if password empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: authDto.email })
          .expectStatus(400)
          .inspect();
      });

      it('should throw if password is incorrect', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: authDto.email, password: '12345' })
          .expectStatus(403)
          .inspect();
      });

      it('should signin', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(authDto)
          .expectStatus(200)
          .stores('userJwtToken', 'access_token')
          .inspect();
      });
    });
  });

  describe('Users', () => {
    it('should get user information', () => {
      return pactum
        .spec()
        .get('/users/me')
        .withHeaders({
          Authorization: 'Bearer $S{userJwtToken}',
        })
        .expectStatus(200)
        .inspect();
    });

    it('should edit user information', () => {
      const dto: EditUserDto = {
        firstName: 'Aditya',
        lastName: 'Goyal',
      };

      return pactum
        .spec()
        .patch('/users')
        .withHeaders({
          Authorization: 'Bearer $S{userJwtToken}',
        })
        .withBody(dto)
        .expectStatus(200)
        .expectBodyContains(dto.firstName)
        .expectBodyContains(dto.lastName)
        .inspect();
    });
  });

  describe('Bookmarks', () => {
    describe('Get boomarks', () => {
      it('should return empty', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userJwtToken}',
          })
          .expectStatus(200)
          .expectBody([]);
      });
    });

    describe('Add bookmark', () => {
      const dto: CreateBookmarkDto = {
        title: 'First Bookmark',
        link: 'https://www.youtube.com/watch?v=d6WC5n9G_sM',
      };

      it('should create bookmark', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userJwtToken}',
          })
          .withBody(dto)
          .expectStatus(201)
          .stores('bookmarkId', 'id')
          .inspect();
      });
    });

    describe('Get boomarks', () => {
      it('should return bookmarks', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userJwtToken}',
          })
          .expectStatus(200)
          .expectJsonLength(1)
          .inspect();
      });
    });

    describe('Find bookmark by id', () => {
      it('should return bookmark', () => {
        return pactum
          .spec()
          .get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userJwtToken}',
          })
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}')
          .inspect();
      });
    });

    describe('Edit bookmark by id', () => {
      const dto: EditBookmarkDto = {
        title:
          'Kubernetes Course - Full Beginners Tutorial (Containerize Your Apps!)',
        description:
          'Learn how to use Kubernetes in this complete course. Kubernetes makes it possible to containerize applications and simplifies app deployment to production.',
      };

      it('should throw if bookmark not found', () => {
        return pactum
          .spec()
          .patch('/bookmarks/{id}')
          .withPathParams('id', 99999999)
          .withHeaders({ Authorization: 'Bearer $S{userJwtToken}' })
          .withBody(dto)
          .expectStatus(403)
          .inspect();
      });

      it('should edit bookmark', () => {
        return pactum
          .spec()
          .patch('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userJwtToken}' })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.title)
          .expectBodyContains(dto.description)
          .inspect();
      });
    });

    describe('Delete bookmark by id', () => {
      it('should throw if bookmark not found', () => {
        return pactum
          .spec()
          .delete('/bookmarks/{id}')
          .withPathParams('id', 99999999)
          .withHeaders({ Authorization: 'Bearer $S{userJwtToken}' })
          .expectStatus(403)
          .inspect();
      });

      it('should delete bookmark by id', () => {
        return pactum
          .spec()
          .delete('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userJwtToken}' })
          .expectStatus(204)
          .inspect();
      });
    });
  });
});
