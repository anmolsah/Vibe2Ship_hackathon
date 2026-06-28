import { Task } from '../types';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
}

/**
 * Lists the user's primary calendar events.
 */
export async function listGoogleCalendarEvents(accessToken: string): Promise<any[]> {
  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' +
        new Date().toISOString() +
        '&maxResults=50&singleEvents=true&orderBy=startTime',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`Google Calendar API list error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error listing Google Calendar events:', error);
    throw error;
  }
}

/**
 * Creates a new event in the primary Google Calendar for a Task.
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  task: Task
): Promise<string | null> {
  try {
    const startTime = new Date(task.dueDate);
    const endTime = new Date(startTime.getTime() + (task.durationMinutes || 30) * 60 * 1000);

    const event: CalendarEvent = {
      summary: `[Priora] ${task.title}`,
      description: task.description || 'Priora scheduled action item.',
      start: {
        dateTime: startTime.toISOString(),
      },
      end: {
        dateTime: endTime.toISOString(),
      },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API insert error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id || null;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
}

/**
 * Updates an existing calendar event.
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  task: Task
): Promise<void> {
  try {
    const startTime = new Date(task.dueDate);
    const endTime = new Date(startTime.getTime() + (task.durationMinutes || 30) * 60 * 1000);

    const event: CalendarEvent = {
      summary: `[Priora] ${task.title}`,
      description: task.description || 'Priora scheduled action item.',
      start: {
        dateTime: startTime.toISOString(),
      },
      end: {
        dateTime: endTime.toISOString(),
      },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API update error: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    throw error;
  }
}

/**
 * Deletes a Google Calendar event.
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API delete error: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    throw error;
  }
}
