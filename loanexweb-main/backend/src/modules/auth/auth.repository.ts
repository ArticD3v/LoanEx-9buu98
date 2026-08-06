import { query, queryOne, transaction } from '../../config/database';

export class AuthRepository {
  private async formatUserWithProfile(user: any) {
    if (!user) return null;
    const profile = await queryOne('SELECT * FROM profiles WHERE id = $1', [user.id]);
    return {
      ...user,
      profiles: profile ? [profile] : [],
    };
  }

  async findByEmail(email: string) {
    const user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
    return this.formatUserWithProfile(user);
  }

  async findByMobile(mobile: string) {
    const user = await queryOne('SELECT * FROM users WHERE phone = $1', [mobile]);
    return this.formatUserWithProfile(user);
  }

  async findById(id: string) {
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [id]);
    return this.formatUserWithProfile(user);
  }

  async findByUuid(uuid: string) {
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [uuid]);
    return this.formatUserWithProfile(user);
  }

  async findByIdentifier(identifier: string) {
    const value = identifier.trim().toLowerCase();
    const isMobile = /^[6-9]\d{9}$/.test(identifier.trim());

    if (isMobile) {
      return this.findByMobile(identifier.trim());
    }

    return this.findByEmail(value);
  }

  async createUser(data: { fullName: string; email: string; mobile: string; password?: string; status?: any }) {
    return transaction(async (client) => {
      const userRes = await client.query(`
        INSERT INTO users (phone, email, "encryptedPassword", role)
        VALUES ($1, $2, $3, 'authenticated')
        RETURNING *
      `, [data.mobile, data.email, data.password ?? '']);

      const user = userRes.rows[0];

      const profileRes = await client.query(`
        INSERT INTO profiles (id, mobile_number, "fullName", email)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [user.id, data.mobile, data.fullName, data.email]);

      return {
        ...user,
        profiles: [profileRes.rows[0]],
      };
    });
  }

  async updateUser(id: string, data: any) {
    const keys = Object.keys(data);
    if (keys.length === 0) return this.findById(id);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = keys.map((k) => data[k]);

    const user = await queryOne(`
      UPDATE users
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `, [...values, id]);

    return this.formatUserWithProfile(user);
  }

  async activateUser(id: string) {
    const user = await queryOne(`
      UPDATE users
      SET "created_at" = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    return this.formatUserWithProfile(user);
  }

  async invalidateOtps(_mobile: string, _purpose: any) {
    /* No-op or native implementation if OTP table is present */
  }

  async createOtp(_data: any) {
    return null;
  }

  async findValidOtp(_mobile: string, _purpose: any, _otp: string) {
    return null;
  }

  async markOtpUsed(_id: string) {
    /* No-op */
  }

  async createRefreshToken(_data: any) {
    return null;
  }

  async findRefreshToken(_tokenHash: string) {
    return null;
  }

  async deleteRefreshToken(_tokenHash: string) {
    /* No-op */
  }

  async deleteUserRefreshTokens(_userId: string) {
    /* No-op */
  }
}

export const authRepository = new AuthRepository();
