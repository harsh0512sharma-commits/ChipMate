import { config } from '../config';

export interface SendOtpOptions {
  email: string;
  code: string;
  displayName?: string;
}

export async function sendOtpEmail(options: SendOtpOptions): Promise<{ success: boolean; error?: string; devOtp?: string }> {
  const { email, code, displayName } = options;

  console.log(`\n========================================`);
  console.log(`📧 [ChipMate OTP Service]`);
  console.log(`To: ${email}`);
  console.log(`Recipient Name: ${displayName || 'User'}`);
  console.log(`Verification OTP: [ ${code} ]`);
  console.log(`Valid for: ${config.otpExpiryMinutes} minutes`);
  console.log(`========================================\n`);

  // If Brevo key is provided, handle either REST API or SMTP Relay
  if (config.brevoApiKey && config.brevoApiKey.trim().length > 0) {
    const isSmtpKey = config.brevoApiKey.startsWith('xsmtpsib-');

    if (isSmtpKey) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          auth: {
            user: config.senderEmail,
            pass: config.brevoApiKey
          }
        });

        await transporter.sendMail({
          from: `"${config.senderName}" <${config.senderEmail}>`,
          to: displayName ? `"${displayName}" <${email}>` : email,
          subject: `${code} is your ChipMate verification code`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #0f172a; margin-top: 0;">ChipMate Verification</h2>
              <p style="color: #475569; font-size: 16px;">Use the verification code below to complete your registration:</p>
              <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a;">${code}</span>
              </div>
              <p style="color: #64748b; font-size: 14px;">This code will expire in ${config.otpExpiryMinutes} minutes. If you did not request this, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">ChipMate • Private Home Game Chip Ledger & Settlement</p>
            </div>
          `
        });

        console.log(`[Brevo SMTP] Verification email dispatched to ${email}`);
        return { success: true };
      } catch (smtpErr: any) {
        console.error('[Brevo SMTP Error]:', smtpErr.message);
        return {
          success: false,
          error: smtpErr.message,
          devOtp: config.nodeEnv !== 'production' ? code : undefined
        };
      }
    } else {
      // REST API (xkeysib-...)
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': config.brevoApiKey,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: {
              name: config.senderName,
              email: config.senderEmail
            },
            to: [
              {
                email: email,
                name: displayName || email.split('@')[0]
              }
            ],
            subject: `${code} is your ChipMate verification code`,
            htmlContent: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #0f172a; margin-top: 0;">ChipMate Verification</h2>
                <p style="color: #475569; font-size: 16px;">Use the verification code below to complete your registration:</p>
                <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a;">${code}</span>
                </div>
                <p style="color: #64748b; font-size: 14px;">This code will expire in ${config.otpExpiryMinutes} minutes. If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">ChipMate • Private Home Game Chip Ledger & Settlement</p>
              </div>
            `
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Brevo API Error:', response.status, errorText);
          return {
            success: false,
            error: `Brevo API error: ${response.status}`,
            devOtp: config.nodeEnv !== 'production' ? code : undefined
          };
        }

        console.log(`[Brevo REST] Verification email dispatched to ${email}`);
        return { success: true };
      } catch (err: any) {
        console.error('Failed to send email via Brevo REST:', err);
        return {
          success: false,
          error: err.message || 'Failed to dispatch email',
          devOtp: config.nodeEnv !== 'production' ? code : undefined
        };
      }
    }
  }

  // Development mode: No Brevo key provided yet, return success with devOtp logged
  return {
    success: true,
    devOtp: config.nodeEnv !== 'production' ? code : undefined
  };
}
