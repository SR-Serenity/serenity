import { BadRequestException, Injectable } from '@nestjs/common';
import { google } from 'googleapis';

export interface GoogleEventInput {
  title: string
  description?: string | null
  location?: string | null
  startAt: Date
  endAt: Date
  allDay: boolean
}

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

  async createEvent(refreshToken: string, input: GoogleEventInput): Promise<string> {
    const calendar = this.calendarClient(refreshToken);
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: this.toGoogleEvent(input),
    });
    return response.data.id!;
  }

  async updateEvent(refreshToken: string, googleEventId: string, input: GoogleEventInput) {
    const calendar = this.calendarClient(refreshToken);
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: this.toGoogleEvent(input),
    });
  }

  async deleteEvent(refreshToken: string, googleEventId: string) {
    const calendar = this.calendarClient(refreshToken);
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    });
  }

  private toGoogleEvent(input: GoogleEventInput) {
    if (input.allDay) {
      const dateStr = (d: Date) => d.toISOString().slice(0, 10);
      return {
        summary: input.title,
        description: input.description ?? undefined,
        location: input.location ?? undefined,
        start: { date: dateStr(input.startAt) },
        end: { date: dateStr(input.endAt) },
      };
    }
    return {
      summary: input.title,
      description: input.description ?? undefined,
      location: input.location ?? undefined,
      start: { dateTime: input.startAt.toISOString() },
      end: { dateTime: input.endAt.toISOString() },
    };
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
