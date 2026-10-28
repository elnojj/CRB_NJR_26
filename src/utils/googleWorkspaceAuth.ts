import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.acls',
  'https://www.googleapis.com/auth/calendar.acls.readonly',
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.calendarlist',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.calendars',
  'https://www.googleapis.com/auth/calendar.calendars.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.freebusy',
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/calendar.events.owned.readonly',
  'https://www.googleapis.com/auth/calendar.events.public.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.settings.readonly',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/meetings.space.settings',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
] as const;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'consent',
});

// In-memory access token cache ONLY (never stored in localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface LiveGmailThread {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  unread: boolean;
}

export interface LiveDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  size?: string;
}

export interface LiveCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  hangoutLink?: string;
}

export interface LiveMeetSpace {
  name: string;
  meetingUri: string;
  meetingCode: string;
}

export async function loadGmailThreads(maxResults = 12): Promise<LiveGmailThread[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!listRes.ok) {
    throw new Error(`Gmail API error (${listRes.status})`);
  }
  const listData = await listRes.json();
  const messages: { id: string }[] = listData.messages || [];

  const details = await Promise.all(
    messages.slice(0, 8).map(async (m) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!msgRes.ok) return null;
      const msg = await msgRes.json();
      const headers: { name: string; value: string }[] = msg.payload?.headers || [];
      const getH = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      const labelIds: string[] = msg.labelIds || [];
      return {
        id: msg.id,
        subject: getH('Subject') || '(No subject)',
        from: getH('From') || 'me@nojara.com',
        to: getH('To') || 'me@nojara.com',
        date: getH('Date') || new Date().toISOString(),
        snippet: msg.snippet || '',
        unread: labelIds.includes('UNREAD'),
      } as LiveGmailThread;
    })
  );

  return details.filter((d): d is LiveGmailThread => d !== null);
}

export async function sendGmailMessageApi(
  to: string,
  subject: string,
  body: string
): Promise<{ id: string; threadId: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const mime = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\r\n');

  const base64Url = btoa(unescape(encodeURIComponent(mime)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64Url }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${errText}`);
  }
  return res.json();
}

export async function loadDrive(query?: string): Promise<LiveDriveFile[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const qParam = query && query.trim()
    ? `&q=${encodeURIComponent(`name contains '${query.trim().replace(/'/g, "\\'")}' and trashed = false`)}`
    : '&q=trashed%20%3D%20false';

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=25&fields=files(id,name,mimeType,modifiedTime,webViewLink,size)${qParam}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Google Drive API error (${res.status})`);
  }
  const data = await res.json();
  return data.files || [];
}

export async function loadCalendarEventsApi(): Promise<LiveCalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const nowIso = new Date(Date.now() - 7 * 86400000).toISOString();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=25&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(nowIso)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Google Calendar API error (${res.status})`);
  }
  const data = await res.json();
  return (data.items || []).map((item: Record<string, any>) => ({
    id: item.id,
    summary: item.summary || '(Untitled Event)',
    start: item.start?.dateTime || item.start?.date || '',
    end: item.end?.dateTime || item.end?.date || '',
    location: item.location,
    hangoutLink: item.hangoutLink,
  }));
}

export async function createCalendarEventApi(
  summary: string,
  startIso: string,
  endIso: string,
  description?: string
): Promise<LiveCalendarEvent> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        description: description || 'Scheduled via CEREBRO + CDE Spatial OS',
        start: { dateTime: startIso },
        end: { dateTime: endIso },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Calendar event creation failed (${res.status}): ${errText}`);
  }
  const item = await res.json();
  return {
    id: item.id,
    summary: item.summary || summary,
    start: item.start?.dateTime || startIso,
    end: item.end?.dateTime || endIso,
    hangoutLink: item.hangoutLink,
  };
}

export async function createGoogleMeetSpaceApi(): Promise<LiveMeetSpace> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const res = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Meet API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return {
    name: data.name || 'spaces/cerebro',
    meetingUri: data.meetingUri || '',
    meetingCode: data.meetingCode || '',
  };
}

export async function loadGoogleDocApi(
  documentId: string
): Promise<{ title: string; bodyText: string; documentId: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Google Docs API error (${res.status})`);
  }
  const doc = await res.json();
  const content: any[] = doc.body?.content || [];
  let text = '';
  for (const el of content) {
    const elements = el.paragraph?.elements || [];
    for (const pe of elements) {
      if (pe.textRun?.content) {
        text += pe.textRun.content;
      }
    }
  }
  return {
    documentId: doc.documentId || documentId,
    title: doc.title || 'Untitled Document',
    bodyText: text.trim(),
  };
}

export async function appendGoogleDocTextApi(
  documentId: string,
  textToAppend: string
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              endOfSegmentLocation: { segmentId: '' },
              text: `\n${textToAppend}`,
            },
          },
        ],
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Docs update error (${res.status}): ${errText}`);
  }
}

export async function loadGoogleSheetApi(
  spreadsheetId: string,
  range = 'A1:F20'
): Promise<{ spreadsheetId: string; range: string; values: string[][] }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Google Sheets API error (${res.status})`);
  }
  const data = await res.json();
  return {
    spreadsheetId,
    range: data.range || range,
    values: data.values || [],
  };
}

export async function appendGoogleSheetRowApi(
  spreadsheetId: string,
  range: string,
  rowValues: string[]
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets append error (${res.status}): ${errText}`);
  }
}
