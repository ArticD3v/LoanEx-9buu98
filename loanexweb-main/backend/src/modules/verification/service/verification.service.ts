import axios from 'axios';
import { env } from '../../../config/env';
import {
  BadRequestError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { verificationRepository } from '../repository/verification.repository';
import { auditLogService } from './audit-log.service';

// ─── DigiLocker API config ───────────────────────────────────────────────────

const DIGILOCKER_BASE = 'https://javabackend.idspay.in/api/v1/prod';

const DIGILOCKER_ENDPOINT = '/srv2/validation/digilocker-digital-kyc';

const DL_API_ID = process.env['DIGILOCKER_API_ID'] ?? '';
const DL_API_KEY = process.env['DIGILOCKER_API_KEY'] ?? '';
const DL_TOKEN_ID = process.env['DIGILOCKER_TOKEN_ID'] ?? '';

// ─── Service ─────────────────────────────────────────────────────────────────

export class VerificationService {
  // ─── Status ────────────────────────────────────────────────────────────────

  async getStatus(userId: string) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    return verificationRepository.getStatus(userId);
  }

  // ─── Mobile (login = verified, no separate OTP step needed) ────────────────

  async getMobileStatus(userId: string) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    return {
      mobile: user.phone ?? '',
      mobileVerified: true,
    };
  }

  // ─── DigiLocker Aadhaar ────────────────────────────────────────────────────

  /**
   * Step 1 – Generate a DigiLocker URL for Aadhaar verification.
   * Returns { client_id, digilocker_url } to open in browser/redirect.
   */
  async digilockerGenerate(userId: string, aadhaarNumber?: string) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    const profileId = user.profiles?.id;
    if (!profileId) {
      throw new BadRequestError('Please complete your profile before KYC.');
    }

    const redirectUrl = `${process.env['FRONTEND_URL'] ?? 'http://localhost:4200'}/verification`;
    const logoUrl = `${process.env['FRONTEND_URL'] ?? 'http://localhost:4200'}/assets/logo.png`;

    const payload: Record<string, any> = {
      api_id: process.env['DIGILOCKER_API_ID'] || 'APID2523',
      api_key: process.env['DIGILOCKER_API_KEY'] || '7eda7351-a536-46d8-aac5-86fb72ffe341',
      token_id: process.env['DIGILOCKER_TOKEN_ID'] || 'wL86mDhe3DScB97V2969GoBk6G1sTY3h',
      methodName: 'generateToken',
      mobile_number: user.phone ?? '',
      redirectUrl,
      logoUrl,
    };

    if (aadhaarNumber && aadhaarNumber.length === 12) {
      payload['aadhaar_number'] = aadhaarNumber;
    }

    const resp = await axios.post(`${DIGILOCKER_BASE}${DIGILOCKER_ENDPOINT}`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });

    const data = resp.data;
    const clientId = data?.data?.client_id;
    const url = data?.data?.url ?? data?.data?.digilocker_url;

    if (!data?.success && data?.status?.code !== 200) {
      throw new BadRequestError(data?.status?.message ?? 'DigiLocker token generation failed.');
    }

    if (!clientId) {
      throw new BadRequestError('DigiLocker token generation failed: missing client_id');
    }

    // Save client_id to DB so we can fetch later
    await verificationRepository.upsertDigilocker(profileId, {
      clientId,
    });

    await auditLogService.log({
      userId,
      action: 'DIGILOCKER_TOKEN_GENERATED',
      entity: 'digilocker_reports',
      metadata: { client_id: clientId },
    });

    return {
      client_id: clientId,
      digilocker_url: url ?? null,
      message: 'DigiLocker URL generated. Redirect user to complete Aadhaar verification.',
    };
  }

  async digilockerFetch(userId: string, clientId: string) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    const profileId = user.profiles?.id;
    if (!profileId) {
      throw new BadRequestError('Please complete your profile before KYC.');
    }

    const payload = {
      api_id: process.env['DIGILOCKER_API_ID'] || 'APID2523',
      api_key: process.env['DIGILOCKER_API_KEY'] || '7eda7351-a536-46d8-aac5-86fb72ffe341',
      token_id: process.env['DIGILOCKER_TOKEN_ID'] || 'wL86mDhe3DScB97V2969GoBk6G1sTY3h',
      methodName: 'fetchDetails',
      client_id: clientId,
    };

    let resp;
    try {
      resp = await axios.post(`${DIGILOCKER_BASE}${DIGILOCKER_ENDPOINT}`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.status?.message ||
        err.response?.data?.message ||
        'DigiLocker verification incomplete or not yet authorized.';
      throw new BadRequestError(msg);
    }

    const data = resp.data;
    if (!data?.success && data?.status?.code !== 200) {
      throw new BadRequestError(data?.status?.message ?? 'DigiLocker fetch failed.');
    }

    const d = data.data ?? {};
    const xml = d?.aadhaar_xml_data ?? {};
    const meta = d?.digilocker_metadata ?? {};
    const name = xml.full_name ?? meta.name ?? '';

    if (!name && !xml.masked_aadhaar) {
      throw new BadRequestError('DigiLocker authorization pending. Please complete login in the popup window.');
    }

    // Save to digilocker_reports
    await verificationRepository.upsertDigilocker(profileId, {
      clientId: d.client_id ?? clientId,
      name: xml.full_name ?? meta.name ?? '',
      gender: xml.gender ?? meta.gender ?? '',
      dob: xml.dob ?? meta.dob ?? '',
      careOf: xml.care_of ?? '',
      yob: xml.yob ?? '',
      zip: xml.zip ?? '',
      masked_aadhaar: xml.masked_aadhaar ?? '',
      fullAddress: xml.full_address ?? '',
      father_name: xml.father_name ?? '',
      profileImage: xml.profile_image ?? '',
      xml_url: d.xml_url ?? '',
      rawData: d,
    });

    // Save to customer_kyc
    await verificationRepository.upsertKyc(userId, {
      aadharVerified: true,
      aadhar_number: xml.masked_aadhaar ?? '',
      aadharRawData: d,
      fullName: xml.full_name ?? meta.name ?? '',
      dob: xml.dob ?? meta.dob ?? '',
      gender: xml.gender ?? meta.gender ?? '',
      address: xml.address ?? {},
    });

    await auditLogService.log({
      userId,
      action: 'DIGILOCKER_AADHAAR_VERIFIED',
      entity: 'customer_kyc',
      metadata: { masked_aadhaar: xml.masked_aadhaar },
    });

    return {
      verified: true,
      name: xml.full_name ?? meta.name ?? '',
      gender: xml.gender ?? meta.gender ?? '',
      dob: xml.dob ?? meta.dob ?? '',
      masked_aadhaar: xml.masked_aadhaar ?? '',
      father_name: xml.father_name ?? '',
      address: xml.address ?? {},
      profile_image: xml.profile_image ?? '',
      message: 'Aadhaar verified successfully via DigiLocker.',
    };
  }

  /**
   * Get Aadhaar verification status + already-fetched data for this user.
   */
  async getAadhaarStatus(userId: string) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    const profileId = user.profiles?.id;
    const kyc = await verificationRepository.findKycByUserId(userId);
    const digilocker = profileId
      ? await verificationRepository.findDigilockerByProfileId(profileId)
      : null;

    return {
      aadhaarVerified: Boolean(kyc?.aadharVerified),
      masked_aadhaar: kyc?.aadhar_number ?? digilocker?.masked_aadhaar ?? null,
      name: kyc?.fullName ?? digilocker?.name ?? null,
      gender: kyc?.gender ?? digilocker?.gender ?? null,
      dob: kyc?.dob ?? digilocker?.dob ?? null,
      client_id: digilocker?.clientId ?? null,
      profileImage: digilocker?.profileImage ?? null,
    };
  }
  /**
   * Fetch Experian Credit Score and Verify PAN
   */
  async verifyPanAndCreditScore(userId: string, payload: any) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    const kyc = await verificationRepository.findKycByUserId(userId);
    if (!kyc?.aadharVerified) {
      throw new BadRequestError('Aadhaar must be verified before fetching credit report.');
    }

    const { api_id, api_key, token_id, mobile_no, pan, first_name, last_name, dob } = payload;
    
    if (!pan) {
      throw new BadRequestError('PAN is required.');
    }

    const requestPayload = {
      api_id: api_id || 'APID2523',
      api_key: api_key || '7eda7351-a536-46d8-aac5-86fb72ffe341',
      token_id: token_id || 'wL86mDhe3DScB97V2969GoBk6G1sTY3h',
      mobile_no: mobile_no ? mobile_no.replace(/\D/g, '').slice(-10) : '',
      pan: pan,
      first_name: first_name,
      last_name: last_name,
      dob: dob,
    };

    let resp;
    try {
      // The user explicitly provided PRODUCTION credentials, so we must use the prod endpoint.
      const endpoint = 'https://javabackend.idspay.in/api/v1/prod/srv2/credit-report/experian';
        
      resp = await axios.post(endpoint, requestPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000,
      });
    } catch (err: any) {
      throw new BadRequestError(err.response?.data?.message ?? 'Experian API failed');
    }

    const data = resp.data;
    
    // Check various possible success formats from IDSPay
    const isSuccess = 
      data?.status?.code === 200 || 
      data?.statuscode === '200' || 
      data?.statusCode === 200 || 
      data?.status === true;

    if (!isSuccess) {
      console.error('Experian API Error Response:', data);
      const errorMessage = data?.statusMessage || data?.message || data?.status?.message || JSON.stringify(data);
      throw new BadRequestError(`Experian Error: ${errorMessage}`);
    }

    // Helper to find BureauScore anywhere in the complex JSON response
    const findScore = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.BureauScore) return String(obj.BureauScore);
      for (const key in obj) {
        const found = findScore(obj[key]);
        if (found) return found;
      }
      return null;
    };

    const extractedScore = findScore(data.data?.result_json) || data.data?.BureauScore || '0';
    const score = parseInt(extractedScore, 10);

    await verificationRepository.upsertKyc(userId, {
      pan_verified: true,
      panNumber: pan,
      cibil_score: score,
      experianRawData: data,
    });

    return {
      verified: true,
      score: score,
      message: 'PAN verified and credit score fetched successfully.',
      data: data.data,
    };
  }

  async verifyFaceMatch(userId: string, capturedImage: string) {
    const kyc = await verificationRepository.findKycByUserId(userId);
    if (!kyc || !kyc.aadharRawData) {
      throw new BadRequestError('Aadhaar verification must be completed first.');
    }

    // Extract Aadhaar photo
    const d: any = kyc.aadharRawData;
    const aadhaarPhoto = d?.aadhaar_xml_data?.profile_image || d?.digilocker_metadata?.profile_image;
    if (!aadhaarPhoto) {
      throw new BadRequestError('No photo found in Aadhaar data.');
    }

    // Strip base64 headers if present
    const cleanCaptured = capturedImage.replace(/^data:image\/[a-z]+;base64,/, '');
    const cleanAadhaar = aadhaarPhoto.replace(/^data:image\/[a-z]+;base64,/, '');

    const requestPayload = {
      api_id: process.env['DIGILOCKER_API_ID'] || 'APID2523',
      api_key: process.env['DIGILOCKER_API_KEY'] || '7eda7351-a536-46d8-aac5-86fb72ffe341',
      token_id: process.env['DIGILOCKER_TOKEN_ID'] || 'wL86mDhe3DScB97V2969GoBk6G1sTY3h',
      person: cleanCaptured,
      card: cleanAadhaar,
    };

    let resp;
    try {
      const endpoint = 'https://javabackend.idspay.in/api/v1/prod/srv2/face-api/match';
      resp = await axios.post(endpoint, requestPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45_000,
      });
    } catch (err: any) {
      throw new BadRequestError(err.response?.data?.message ?? 'Face verification failed');
    }

    const data = resp.data;
    if (data?.status !== 'success' && data?.statusCode !== '200') {
      throw new BadRequestError(data?.message ?? 'Failed to verify face');
    }

    const result = data?.result;
    if (!result?.is_same_face) {
      throw new BadRequestError('Face mismatch. Please try again in better lighting.');
    }

    await verificationRepository.upsertKyc(userId, {
      face_verified: true,
      faceMatchScore: result.same_face_confidence,
      faceRawData: data,
    });

    return { verified: true, score: result.same_face_confidence, message: 'Face verified successfully' };
  }
}

export const verificationService = new VerificationService();

