import type { IUserRepository } from '@/domain/repositories/interfaces';
import { AppError } from '@/shared/errors/app-error';

export class DeleteAccountUseCase {
    constructor(private readonly userRepository: IUserRepository) { }

    async execute(userId: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);
        await this.userRepository.delete(userId);
    }
}
