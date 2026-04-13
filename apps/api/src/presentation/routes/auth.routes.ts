import { Elysia, t } from 'elysia';
import { AuthController } from '../controllers/auth.controller';
import { authPlugin } from './auth.plugin';

const authController = new AuthController();

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(authPlugin)
  .post('/register', ({ body }) => authController.register(body), {
    body: t.Object({
      name: t.String(),
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 })
    }),
    detail: { tags: ['Auth'], summary: 'Register a new user' }
  })
  .post('/login', ({ body, jwt, cookie: { auth } }) => authController.login(body, jwt, auth), {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String()
    }),
    detail: { tags: ['Auth'], summary: 'Login user and get token' }
  })
  .get('/me', ({ userPayload }: any) => authController.getMe(userPayload), {
    isAuth: true,
    detail: { tags: ['Auth'], summary: 'Get current authorized user payload' }
  })
  .patch('/profile', ({ body, userPayload }: any) => authController.updateProfile(userPayload, body), {
    isAuth: true,
    body: t.Object({
      name: t.Optional(t.String()),
      email: t.Optional(t.String({ format: 'email' }))
    }),
    detail: { tags: ['Auth'], summary: 'Update user profile details' }
  })
  .patch('/password', ({ body, userPayload }: any) => authController.changePassword(userPayload, body), {
    isAuth: true,
    body: t.Object({
      currentPassword: t.String(),
      newPassword: t.String({ minLength: 6 })
    }),
    detail: { tags: ['Auth'], summary: 'Change password' }
  })
  .post('/forgot-password', ({ body }) => authController.forgotPassword(body), {
    body: t.Object({ email: t.String({ format: 'email' }) }),
    detail: { tags: ['Auth'], summary: 'Request password reset token' }
  })
  .post('/reset-password', ({ body }) => authController.resetPassword(body), {
    body: t.Object({
      token: t.String(),
      newPassword: t.String({ minLength: 6 })
    }),
    detail: { tags: ['Auth'], summary: 'Reset password using token' }
  })
  .post('/logout', ({ cookie: { auth } }) => authController.logout(auth), {
    isAuth: true,
    detail: { tags: ['Auth'], summary: 'Logout and clear session token' }
  })
  .delete('/account', ({ userPayload, cookie: { auth } }: any) => authController.deleteAccount(userPayload, auth), {
    isAuth: true,
    detail: { tags: ['Auth'], summary: 'Permanently delete user account and all associations' }
  });
