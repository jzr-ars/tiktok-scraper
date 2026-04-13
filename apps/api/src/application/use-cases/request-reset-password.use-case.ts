import type { IUserRepository, IAuthTokenRepository } from '@/domain/repositories/interfaces';
import { AppError } from '@/shared/errors/app-error';

export class RequestResetPasswordUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly tokenRepository: IAuthTokenRepository
    ) { }

    async execute(email: string): Promise<string | null> {
        const user = await this.userRepository.findByEmail(email);
        if (!user || !user.id) return null;
        const rawToken = crypto.randomUUID() + crypto.randomUUID();
        const tokenHash = new Bun.CryptoHasher("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await this.tokenRepository.createResetToken(user.id, tokenHash, expiresAt);
        console.log(`\n==========================================`);
        console.log(`EMAIL SIMULATION: Password Reset`);
        console.log(`To: ${user.email}`);
        console.log(`Subject: Reset Your Password`);
        console.log(`Link: http://localhost:3000/reset-password?token=${rawToken}`);
        console.log(`==========================================\n`);

        return rawToken;
    }
}
