import type { IUserRepository, IAuthTokenRepository } from '@/domain/repositories/interfaces';
import { AppError } from '@/shared/errors/app-error';

export class ResetPasswordUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly tokenRepository: IAuthTokenRepository
    ) { }

    async execute(rawToken: string, newPasswordPlain: string): Promise<void> {
        const tokenHash = new Bun.CryptoHasher("sha256").update(rawToken).digest("hex");
        const userId = await this.tokenRepository.verifyAndConsumeToken(tokenHash);

        if (!userId) {
            throw new AppError('Invalid or expired password reset token', 400);
        }
        const newPasswordHash = await Bun.password.hash(newPasswordPlain);
        await this.userRepository.update(userId, { password: newPasswordHash });
    }
}
