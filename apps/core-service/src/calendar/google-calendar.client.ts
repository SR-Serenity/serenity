import { BadRequestException, Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleCalendarClient {
  async listEvents(refreshToken: string, from?: string, to?: string) {
    const calendar = this.calendarClient(refreshToken);
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: from ?? new Date().toISOString(),
      timeMax: to,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 500,
    });
    return response.data.items ?? [];
  }

  private calendarClient(refreshToken: string) {
    const oauth = this.oauthClient();
    oauth.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: 'v3', auth: oauth });
  }

  private oauthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Google OAuth is not configured');
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }
}
