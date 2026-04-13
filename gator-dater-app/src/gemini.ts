export type PlannerChatMessage = {
  role: 'user' | 'assistant';
  text: string;
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

export const generatePlannerReply = async (
  messages: PlannerChatMessage[],
  profile?: PlannerProfileContext,
) => {
  if (!geminiApiKey) {
    throw new Error('Add VITE_GEMINI_API_KEY to gator-dater-app/.env to use the date planner chat.');
  }

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
              'Prefer concise recommendations with 2-4 concrete options, a short reasoning note, and a simple follow-up question when needed.',
              'Use the student profile context when it helps personalize the answer.',
              'Avoid claiming reservations, live availability, or current business hours unless the user provides them.',
              `User profile context:\n${formatPlannerContext(profile)}`,
            ].join('\n'),
          },
        ],
      },
      contents: messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.text }],
      })),
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        responseMimeType: 'text/plain',
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

  return text;
};
