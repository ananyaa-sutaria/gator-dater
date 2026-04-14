export type PlannerChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  dateOptions?: PlannerDateOption[];
};

export type PlannerDateOption = {
  title: string;
  place: string;
  description: string;
  whyItFits: string;
};

export type PlannerReply = {
  intro: string;
  dateOptions: PlannerDateOption[];
};

type PlannerProfileContext = {
  firstName?: string;
  yearAtUf?: string;
  bio?: string;
  interests?: string[];
  dateBudget?: string;
  dateVibe?: string[];
  availability?: string[];
  distance?: string;
  intention?: string;
};

type GeminiContentPart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiContentPart[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
};

type PlannerReplyShape = {
  intro?: unknown;
  summary?: unknown;
  message?: unknown;
  dateOptions?: unknown;
  options?: unknown;
  ideas?: unknown;
  dates?: unknown;
};

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const isGeminiConfigured = Boolean(geminiApiKey);

const formatPlannerContext = (profile?: PlannerProfileContext) => {
  if (!profile) {
    return 'The user has not completed a profile yet. Offer broad Gainesville date ideas and ask one helpful follow-up when useful.';
  }

  const details = [
    profile.firstName ? `Name: ${profile.firstName}` : '',
    profile.yearAtUf ? `Year at UF: ${profile.yearAtUf}` : '',
    profile.intention ? `Dating intention: ${profile.intention}` : '',
    profile.dateBudget ? `Budget: ${profile.dateBudget}` : '',
    profile.distance ? `Preferred distance: ${profile.distance}` : '',
    profile.bio ? `Bio: ${profile.bio}` : '',
    profile.interests?.length ? `Interests: ${profile.interests.join(', ')}` : '',
    profile.dateVibe?.length ? `Preferred vibes: ${profile.dateVibe.join(', ')}` : '',
    profile.availability?.length ? `Availability: ${profile.availability.join(', ')}` : '',
  ].filter(Boolean);

  return details.join('\n');
};

const extractText = (response: GeminiResponse) =>
  response.candidates
    ?.flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text?.trim() || '')
    .filter(Boolean)
    .join('\n\n') || '';

const getStringValue = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value.trim() : fallback;

const parseJsonSafely = (text: string): unknown => {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // Fall through to looser extraction.
  }

  const withoutCodeFences = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    return JSON.parse(withoutCodeFences) as unknown;
  } catch {
    // Fall through to object extraction.
  }

  const firstBrace = withoutCodeFences.indexOf('{');
  const lastBrace = withoutCodeFences.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(withoutCodeFences.slice(firstBrace, lastBrace + 1)) as unknown;
  }

  throw new Error('Gemini returned invalid JSON.');
};

const normalizePlannerDateOption = (value: unknown): PlannerDateOption | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const option = value as Record<string, unknown>;
  const title = getStringValue(option.title, getStringValue(option.name, getStringValue(option.idea)));
  const place = getStringValue(option.place, getStringValue(option.location, getStringValue(option.spot)));
  const description = getStringValue(
    option.description,
    getStringValue(option.details, getStringValue(option.plan)),
  );
  const whyItFits = getStringValue(
    option.whyItFits,
    getStringValue(option.reason, getStringValue(option.fit)),
  );

  if (!title || !description) {
    return null;
  }

  return {
    title,
    place: place || 'Gainesville',
    description,
    whyItFits: whyItFits || 'This option fits your shared vibe and keeps the date easy to say yes to.',
  };
};

const isPlannerDateOption = (value: unknown): value is PlannerDateOption =>
  typeof value === 'object' &&
  value !== null &&
  'title' in value &&
  'place' in value &&
  'description' in value &&
  'whyItFits' in value;

const normalizePlannerReply = (value: unknown): PlannerReply => {
  const topLevel = (typeof value === 'object' && value !== null ? value : {}) as PlannerReplyShape;
  const rawOptions = Array.isArray(topLevel.dateOptions)
    ? topLevel.dateOptions
    : Array.isArray(topLevel.options)
      ? topLevel.options
      : Array.isArray(topLevel.ideas)
        ? topLevel.ideas
        : Array.isArray(topLevel.dates)
          ? topLevel.dates
          : Array.isArray(value)
            ? value
            : [];

  const intro =
    getStringValue(topLevel.intro) ||
    getStringValue(topLevel.summary) ||
    getStringValue(topLevel.message) ||
    'Here are 3 date ideas that fit the match you selected.';

  const dateOptions = rawOptions
    .map((option) => normalizePlannerDateOption(option))
    .filter((option): option is PlannerDateOption => Boolean(option))
    .filter(isPlannerDateOption)
    .slice(0, 3);

  if (!intro || dateOptions.length !== 3) {
    throw new Error('Gemini did not return exactly 3 usable date options.');
  }

  return {
    intro,
    dateOptions,
  };
};

export const generatePlannerReply = async (
  messages: PlannerChatMessage[],
  profile?: PlannerProfileContext,
) => {
  if (!geminiApiKey) {
    throw new Error('Add VITE_GEMINI_API_KEY to gator-dater-app/.env to use the date planner chat.');
  }

  const requestPlannerReply = async (retryOnFormat = false) => {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: [
                'You are Gator Dater’s date planner assistant for University of Florida students.',
                'Give practical, Gainesville-friendly date ideas that are safe, specific, and easy to act on.',
                'Return exactly 3 different date ideas.',
                'Respond as valid JSON only.',
                'Use this exact shape: {"intro":"short intro","dateOptions":[{"title":"...","place":"...","description":"...","whyItFits":"..."},{"title":"...","place":"...","description":"...","whyItFits":"..."},{"title":"...","place":"...","description":"...","whyItFits":"..."}]}',
                'Every date option must include all 4 fields.',
                'Keep each field concise and specific.',
                'Use the student profile context when it helps personalize the answer.',
                'Avoid claiming reservations, live availability, or current business hours unless the user provides them.',
                retryOnFormat ? 'The previous response was not in the required format. Follow the JSON schema exactly this time.' : '',
                `User profile context:\n${formatPlannerContext(profile)}`,
              ]
                .filter(Boolean)
                .join('\n'),
            },
          ],
        },
        contents: messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.text }],
        })),
        generationConfig: {
          temperature: retryOnFormat ? 0.4 : 0.8,
          topP: 0.9,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini could not generate a response right now.');
    }

    const text = extractText(data);

    if (!text) {
      throw new Error('Gemini returned an empty response. Please try a slightly more specific prompt.');
    }

    return normalizePlannerReply(parseJsonSafely(text));
  };

  try {
    return await requestPlannerReply(false);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('usable date options') ||
        error.message.includes('unexpected format') ||
        error.message.includes('invalid JSON'))
    ) {
      return requestPlannerReply(true);
    }

    throw error;
  }
};
