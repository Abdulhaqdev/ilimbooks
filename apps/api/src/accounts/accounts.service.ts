import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Account, DEFAULT_ACCOUNT, normAccount } from '../common/account';

export type AccountInput = { code?: string; name?: string; active?: boolean };

@Injectable()
export class AccountsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /** Bazada hech bo'lmaganda standart akkaunt turishini kafolatlaydi. */
  async onModuleInit() {
    await this.prisma.account.upsert({
      where: { code: DEFAULT_ACCOUNT },
      create: { code: DEFAULT_ACCOUNT, name: 'Ilimbooks', sortOrder: 0 },
      update: {},
    });
  }

  list() {
    return this.prisma.account.findMany({ orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] });
  }

  /** Kodni tekshiradi: mavjud bo'lmasa standart akkauntga qaytadi. */
  async resolve(raw?: string | null): Promise<Account> {
    const code = normAccount(raw);
    const found = await this.prisma.account.findUnique({ where: { code } });
    return found?.code ?? DEFAULT_ACCOUNT;
  }

  async create(input: AccountInput) {
    const code = normAccount(input.code);
    const name = (input.name || '').trim().slice(0, 80);
    if (!name) throw new BadRequestException('Akkaunt nomini kiriting');
    if (!code || code.length < 2) throw new BadRequestException('Akkaunt kodi kamida 2 belgi (lotin harflari)');
    if (await this.prisma.account.findUnique({ where: { code } })) {
      throw new BadRequestException(`"${code}" kodi band`);
    }
    const last = await this.prisma.account.aggregate({ _max: { sortOrder: true } });
    return this.prisma.account.create({
      data: { code, name, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
  }

  async update(code: string, input: AccountInput) {
    const cur = await this.prisma.account.findUnique({ where: { code: normAccount(code) } });
    if (!cur) throw new NotFoundException('Akkaunt topilmadi');
    const data: { name?: string; active?: boolean } = {};
    if (input.name !== undefined) {
      const name = input.name.trim().slice(0, 80);
      if (!name) throw new BadRequestException('Akkaunt nomini kiriting');
      data.name = name;
    }
    if (input.active !== undefined) {
      if (cur.code === DEFAULT_ACCOUNT && !input.active) {
        throw new BadRequestException('Asosiy akkauntni o‘chirib bo‘lmaydi');
      }
      data.active = !!input.active;
    }
    return this.prisma.account.update({ where: { code: cur.code }, data });
  }
}
