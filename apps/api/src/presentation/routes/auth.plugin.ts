import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export const authPlugin = new Elysia()
  .use(
    jwt({
       name: 'jwt',
       secret: process.env.JWT_SECRET || 'supersafesecretkey_for_tiktok_clone_dev',
    })
  )
  .macro({
    isAuth(value: boolean) {
      if (!value) return {};
      return {
        async beforeHandle(context: any) {
          const auth = context.request.headers.get('authorization');
          const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
          
          if (!token) {
              context.set.status = 401;
              return { success: false, message: 'Unauthorized' };
          }

          const payload = await context.jwt.verify(token);
          if (!payload || !payload.id) {
              context.set.status = 401;
              return { success: false, message: 'Unauthorized' };
          }
          
          context.userPayload = payload;
        }
      };
    }
  });
