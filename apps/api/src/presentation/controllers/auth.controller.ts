import { DrizzleUserRepository, DrizzleAccountRepository, DrizzleSaasRepository, DrizzleAuthTokenRepository } from '@/infrastructure/repositories/drizzle-repositories';
import { RegisterUserUseCase } from '@/application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '@/application/use-cases/login-user.use-case';
import { GetCurrentUserUseCase } from '@/application/use-cases/get-current-user.use-case';
import { UpdateProfileUseCase } from '@/application/use-cases/update-profile.use-case';
import { ChangePasswordUseCase } from '@/application/use-cases/change-password.use-case';
import { RequestResetPasswordUseCase } from '@/application/use-cases/request-reset-password.use-case';
import { ResetPasswordUseCase } from '@/application/use-cases/reset-password.use-case';
import { DeleteAccountUseCase } from '@/application/use-cases/delete-account.use-case';

const userRepo = new DrizzleUserRepository();
const accountRepo = new DrizzleAccountRepository();
const saasRepo = new DrizzleSaasRepository();
const tokenRepo = new DrizzleAuthTokenRepository();

const registerUser = new RegisterUserUseCase(userRepo, accountRepo, saasRepo);
const loginUser = new LoginUserUseCase(userRepo);
const getCurrentUser = new GetCurrentUserUseCase(userRepo, accountRepo, saasRepo);
const updateProfile = new UpdateProfileUseCase(userRepo);
const changePassword = new ChangePasswordUseCase(userRepo);
const requestResetPassword = new RequestResetPasswordUseCase(userRepo, tokenRepo);
const resetPassword = new ResetPasswordUseCase(userRepo, tokenRepo);
const deleteAccount = new DeleteAccountUseCase(userRepo);

export class AuthController {
    
    async register(body: any) {
        const { user, account, subscription } = await registerUser.execute(body);
        const { password, ...userWithoutPassword } = user;
        return {
            success: true,
            message: 'Registration successful',
            data: { user: userWithoutPassword, account, subscription }
        };
    }

    async login(body: any, jwt: any, authCookie: any) {
        const user = await loginUser.execute(body.email, body.password);
        
        const token = await jwt.sign({
            id: user.id,
            email: user.email,
        });

        if (authCookie) {
            authCookie.set({
                value: token,
                httpOnly: true,
                maxAge: 7 * 86400,
            });
        }

        return {
            success: true,
            message: 'Login successful',
            token
        };
    }

    async getMe(userPayload: any) {
        const data = await getCurrentUser.execute(userPayload.id as string);
        return { success: true, data };
    }

    async updateProfile(userPayload: any, body: any) {
        const updatedUser = await updateProfile.execute(userPayload.id as string, body);
        return { success: true, message: 'Profile updated successfully', data: updatedUser };
    }

    async changePassword(userPayload: any, body: any) {
        await changePassword.execute(userPayload.id as string, body.currentPassword, body.newPassword);
        return { success: true, message: 'Password changed successfully. Please login again.' };
    }

    async forgotPassword(body: any) {
        await requestResetPassword.execute(body.email);
        return { success: true, message: 'If that account exists, a reset link has been sent.' };
    }

    async resetPassword(body: any) {
        await resetPassword.execute(body.token, body.newPassword);
        return { success: true, message: 'Password has been reset successfully.' };
    }

    async logout(authCookie: any) {
        if (authCookie) authCookie.remove();
        return { success: true, message: 'Logged out successfully' };
    }

    async deleteAccount(userPayload: any, authCookie: any) {
        await deleteAccount.execute(userPayload.id as string);
        if (authCookie) authCookie.remove();
        return { success: true, message: 'Account permanently deleted' };
    }
}
