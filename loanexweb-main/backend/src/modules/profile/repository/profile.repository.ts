import { query, queryOne, transaction } from '../../../config/database';
import type { AddressBody } from '../dto/profile.dto';

export class ProfileRepository {
  async findUserById(userId: string) {
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) return null;
    const profile = await queryOne('SELECT * FROM profiles WHERE id = $1', [userId]);
    return {
      id: user.id,
      fullName: profile?.fullName ?? 'Customer',
      email: user.email ?? profile?.email ?? '',
      mobile: user.phone ?? profile?.mobile_number ?? '',
    };
  }

  async findProfile(userId: string) {
    return queryOne('SELECT * FROM profiles WHERE id = $1', [userId]);
  }

  async findAddresses(userId: string) {
    const res = await query(`
      SELECT * FROM addresses
      WHERE "profileId" = $1 OR "userId" = $1
      ORDER BY is_default DESC, "createdAt" ASC
    `, [userId]);

    const seen = new Set<string>();
    const unique = res.rows.filter((r: any) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    return unique.map((r: any) => ({
      id: r.id,
      addressLine1: r.house_number ? `${r.house_number}` : r.fullAddress ?? '',
      addressLine2: r.street ?? r.apartment ?? r.area ?? '',
      landmark: r.landmark,
      city: r.city ?? '',
      state: r.state ?? '',
      pincode: r.pincode ?? '',
      country: 'India',
      isDefault: r.is_default ?? false,
      addressType: r.label ?? 'SHIPPING',
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }));
  }

  async findAddressByType(userId: string, addressType: string) {
    const addresses = await this.findAddresses(userId);
    return addresses.find((a) => a.addressType === addressType) ?? null;
  }

  async findAddressByIdForUser(addressId: string, userId: string) {
    const addresses = await this.findAddresses(userId);
    return addresses.find((a) => a.id === addressId) ?? null;
  }

  async countShippingAddresses(userId: string) {
    const addresses = await this.findAddresses(userId);
    return addresses.filter((a) => a.addressType === 'SHIPPING').length;
  }

  async createAddress(
    userId: string,
    address: AddressBody,
    options: { isDefault?: boolean; addressType?: string } = {},
  ) {
    const addressType = options.addressType ?? 'SHIPPING';
    const shippingCount = addressType === 'SHIPPING' ? await this.countShippingAddresses(userId) : 0;
    const makeDefault = Boolean(options.isDefault) || (addressType === 'SHIPPING' && shippingCount === 0);

    const existing = await queryOne(`
      SELECT * FROM addresses
      WHERE ("profileId" = $1 OR "userId" = $1)
        AND house_number = $2
        AND street = $3
        AND city = $4
        AND state = $5
        AND pincode = $6
        AND label = $7
    `, [userId, address.addressLine1, address.addressLine2, address.city, address.state, address.pincode, addressType]);

    if (existing) {
      return { id: existing.id, isDefault: existing.is_default ?? false };
    }

    const created = await queryOne(`
      INSERT INTO addresses (
        "profileId", "userId", house_number, street, landmark, city, state, pincode, label, is_default, "fullAddress"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      userId,
      userId,
      address.addressLine1,
      address.addressLine2,
      address.landmark?.trim() ? address.landmark.trim() : null,
      address.city,
      address.state,
      address.pincode,
      addressType,
      makeDefault,
      `${address.addressLine1}, ${address.addressLine2}, ${address.city}, ${address.state} - ${address.pincode}`,
    ]);

    return {
      id: created.id,
      isDefault: makeDefault,
    };
  }

  async updateAddress(
    addressId: string,
    _userId: string,
    address: AddressBody,
    _options: { isDefault?: boolean; addressType?: string } = {},
  ) {
    const updated = await queryOne(`
      UPDATE addresses
      SET
        house_number = $1,
        street = $2,
        landmark = $3,
        city = $4,
        state = $5,
        pincode = $6,
        "fullAddress" = $7
      WHERE id = $8
      RETURNING *
    `, [
      address.addressLine1,
      address.addressLine2,
      address.landmark?.trim() ? address.landmark.trim() : null,
      address.city,
      address.state,
      address.pincode,
      `${address.addressLine1}, ${address.addressLine2}, ${address.city}, ${address.state} - ${address.pincode}`,
      addressId,
    ]);

    return { id: updated.id };
  }

  async deleteAddress(addressId: string, _userId: string) {
    return query('DELETE FROM addresses WHERE id = $1', [addressId]);
  }

  async setDefaultAddress(addressId: string, userId: string) {
    await query('UPDATE addresses SET is_default = false WHERE "profileId" = $1 OR "userId" = $1', [userId]);
    const updated = await queryOne('UPDATE addresses SET is_default = true WHERE id = $1 RETURNING id', [addressId]);
    return { id: updated.id };
  }

  async upsertProfile(input: {
    userId: string;
    fullName: string;
    email: string;
    mobile: string;
    dob: Date;
    gender: any;
  }) {
    return queryOne(`
      INSERT INTO profiles (id, "fullName", email, mobile_number, dob, gender)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE
      SET 
        "fullName" = EXCLUDED."fullName",
        email = EXCLUDED.email,
        mobile_number = EXCLUDED.mobile_number,
        dob = EXCLUDED.dob,
        gender = EXCLUDED.gender
      RETURNING *
    `, [input.userId, input.fullName, input.email, input.mobile, input.dob, input.gender]);
  }

  async syncUserIdentity(userId: string, fullName: string, email: string) {
    await query('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);
    return queryOne('UPDATE profiles SET "fullName" = $1, email = $2 WHERE id = $3 RETURNING *', [fullName, email, userId]);
  }

  async saveProfileWithAddresses(input: {
    userId: string;
    fullName: string;
    email: string;
    mobile: string;
    dob: Date;
    gender: any;
    shipping: AddressBody;
    billingSameAsShipping: boolean;
    billing?: AddressBody;
  }) {
    const profile = await this.upsertProfile({
      userId: input.userId,
      fullName: input.fullName,
      email: input.email,
      mobile: input.mobile,
      dob: input.dob,
      gender: input.gender,
    });

    const shippingResult = await this.createAddress(input.userId, input.shipping, {
      isDefault: true,
      addressType: 'SHIPPING',
    });

    return {
      profile,
      shipping: shippingResult,
      billingSameAsShipping: input.billingSameAsShipping,
    };
  }
}

export const profileRepository = new ProfileRepository();
