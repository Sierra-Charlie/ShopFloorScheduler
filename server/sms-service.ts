import twilio from 'twilio';
import type { AndonIssue, AssemblyCard } from '@shared/schema';

interface SMSNotificationData {
  issue: AndonIssue;
  assemblyCard?: AssemblyCard;
  alertPhoneNumber: string;
}

class SMSService {
  private client: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not found in environment variables');
    }

    this.client = twilio(accountSid, authToken);
  }

  async sendAndonAlert(data: SMSNotificationData): Promise<void> {
    try {
      const { issue, assemblyCard, alertPhoneNumber } = data;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!twilioPhoneNumber) {
        throw new Error('Twilio phone number not configured');
      }

      // Format the SMS message
      const message = this.formatAndonAlertMessage(issue, assemblyCard);

      // Send the SMS
      const result = await this.client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: alertPhoneNumber,
      });

      console.log(`SMS sent successfully. SID: ${result.sid}`);
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      throw error;
    }
  }

  private formatAndonAlertMessage(issue: AndonIssue, assemblyCard?: AssemblyCard): string {
    const cardNumber = assemblyCard?.cardNumber || issue.assemblyCardNumber;

    return `🚨 ANDON ALERT

Card: ${cardNumber}
Reporter: ${issue.reporterName || issue.submittedBy}
Description: ${issue.description}`;
  }

  // Test method to verify SMS functionality
  async sendTestMessage(phoneNumber: string): Promise<void> {
    try {
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!twilioPhoneNumber) {
        throw new Error('Twilio phone number not configured');
      }

      const result = await this.client.messages.create({
        body: '📱 Test message from Manufacturing Scheduler. SMS notifications are working correctly!',
        from: twilioPhoneNumber,
        to: phoneNumber,
      });

      console.log(`Test SMS sent successfully. SID: ${result.sid}`);
    } catch (error) {
      console.error('Failed to send test SMS:', error);
      throw error;
    }
  }
}

export const smsService = new SMSService();