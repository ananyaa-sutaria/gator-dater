import { ChangeEvent, FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import gatorImage from '../assets/PLEASE REPLACE.png';
import heartIcon from '../assets/heartIcon.png';
import backArrrow from '../assets/backArrowIcon.png';
import youreAllSet from '../assets/youreAllSet.png';
import calenderIcon from '../assets/calenderIcon.png';
import writeIcon from '../assets/writeIcon.png';
import heartNavIcon from '../assets/heartNavIcon.png';
import chatIcon from '../assets/chatIcon.png';
import userIcon from '../assets/userIcon.png';
import likeIcon from '../assets/likeIcon.png';
import dislikeIcon from '../assets/dislikeIcon.png';
import searchIcon from '../assets/searchIcon.png';
import submitIcon from '../assets/submitIcon.png';
import { generatePlannerReply, isGeminiConfigured, type PlannerChatMessage } from './gemini';
import './index.css';

const gatorImg = gatorImage;
const heartImg = heartIcon;
const youreAllSetImg = youreAllSet;
const calenderImg = calenderIcon;
const writeImg = writeIcon;
const heartNavImg = heartNavIcon;
const chatImg = chatIcon;
const userImg = userIcon;
const likeImg = likeIcon;
const dislikeImg = dislikeIcon;
const searchImg = searchIcon;
const submitImg = submitIcon;
type Screen =
  | 'intro'
  | 'signup-email'
  | 'signup-password'
  | 'signup-verification'
  | 'signin'
  | 'profile'
  | 'preferences'
  | 'all-set'
  | 'home';

type Tab = 'calendar' | 'planner' | 'swipe' | 'chats' | 'profile-tab';
type FirestoreHealth = 'unknown' | 'connected' | 'fallback';
type Dater = {
  id: string;
  name: string;
  age: number;
  yearAtUf: string;
  bio: string;
  compatibility: number;
  vibe: string;
};

type ChatConversation = {
  chatId: string;
  matchId: string;
  matchName: string;
  matchPhotoUrl: string;
  preview: string;
  unread: boolean;
};

type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
};

type PlannerPrompt = {
  id: string;
  label: string;
  prompt: string;
};

type SignUpState = {
  email: string;
  password: string;
};

type SignInState = {
  email: string;
  password: string;
};

type ProfileState = {
  firstName: string;
  lastName: string;
  age: string;
  yearAtUf: string;
  bio: string;
  photoUrl: string;
  intention: string;
  genderIdentity: string;
  genderPreference: string;
  intentionOpenTo: string;
  ageRangeMin: string;
  ageRangeMax: string;
  vibeWords: string[];
  socialEnergy: number;
  dateBudget: string;
  dateVibe: string[];
  distance: string;
  availability: string[];
  interests: string[];
};

type Preferences = {
  intention: string;
  genderIdentity: string;
  genderPreference: string;
  intentionOpenTo: string;
  ageRange: {
    min: number;
    max: number;
  };
  vibeWords: string[];
  socialEnergy: number;
  dateBudget: string;
  dateVibe: string[];
  distance: string;
  availability: string[];
  interests: string[];
};

type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  name: string;
  age: number;
  yearAtUf: string;
  bio: string;
  gender: string;
  genderPreference: string;
  intentionOpenTo: string;
  ageRange: {
    min: number;
    max: number;
  };
  intention: string;
  interests: string[];
  dateBudget: string;
  dateVibe: string[];
  distance: string;
  availability: string[];
  email: string;
  photoUrl: string;
  preferences: Preferences;
  likedUsers: string[];
  passedUsers: string[];
  matches: string[];
  blockedUsers: string[];
  onboardingCompleted: boolean;
  createdAt?: unknown;
};

const initialSignUp: SignUpState = {
  email: '',
  password: '',
};

const initialSignIn: SignInState = {
  email: '',
  password: '',
};

const initialProfile: ProfileState = {
  firstName: '',
  lastName: '',
  age: '',
  yearAtUf: '',
  bio: '',
  photoUrl: '',
  intention: 'either',
  genderIdentity: '',
  genderPreference: 'everyone',
  intentionOpenTo: 'either',
  ageRangeMin: '18',
  ageRangeMax: '26',
  vibeWords: [],
  socialEnergy: 50,
  dateBudget: 'low',
  dateVibe: [],
  distance: 'near',
  availability: ['either'],
  interests: [],
};

const yearOptions = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];
const datingIntentionOptions = [
  { value: 'friendship', label: 'Friendship' },
  { value: 'dating', label: 'Dating' },
  { value: 'either', label: 'Either' },
];
const genderIdentityOptions = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];
const genderPreferenceOptions = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'everyone', label: 'Everyone' },
];
const vibeWordOptions = [
  'Adventurous',
  'Homebody',
  'Foodie',
  'Artsy',
  'Athletic',
  'Night owl',
  'Early bird',
  'Spontaneous',
  'Planner',
  'Chill',
  'Social',
  'Curious',
];
const dateBudgetOptions = [
  { value: 'free', label: 'Free' },
  { value: 'low', label: '$' },
  { value: 'mid', label: '$$' },
];
const dateVibeOptions = [
  'Chill',
  'Active',
  'Foodie',
  'Artsy',
  'Surprise me',
];
const distanceOptions = [
  { value: 'campus', label: 'On campus' },
  { value: 'near', label: 'Near campus (< 2 mi)' },
  { value: 'anywhere', label: 'Anywhere in Gainesville' },
];
const availabilityOptions = [
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'either', label: 'Either' },
];
const interestOptions = [
  'Gym',
  'Football games',
  'Pickleball',
  'Hiking',
  'Running',
  'Board games',
  'Concerts',
  'Trivia nights',
  'Thrifting',
  'Cooking',
  'Coffee shops',
  'Trying new restaurants',
  'Music',
  'Photography',
  'Painting',
  'Film',
  'Reading',
  'Gaming',
  'Coding',
  'Greek life',
  'Club sports',
  'Travel',
  'Volunteering',
];
const sampleDiscoveryProfiles: Array<Partial<UserProfile> & { uid: string }> = [
  {
    uid: 'sample-leah',
    firstName: 'Leah',
    lastName: 'R',
    fullName: 'Leah R',
    age: 21,
    yearAtUf: 'Junior',
    bio: 'Quiet reader who loves coffee shop hangs and movie nights.',
    gender: 'woman',
    intention: 'dating',
    interests: ['Reading', 'Coffee shops', 'Photography', 'Film'],
    dateVibe: ['Artsy', 'Chill'],
    dateBudget: 'low',
    preferences: {
      intention: 'dating',
      genderIdentity: 'woman',
      genderPreference: 'men',
      intentionOpenTo: 'dating',
      ageRange: { min: 20, max: 25 },
      vibeWords: ['Artsy', 'Planner', 'Curious'],
      socialEnergy: 45,
      dateBudget: 'low',
      dateVibe: ['Artsy', 'Chill'],
      distance: 'near',
      availability: ['weekends'],
      interests: ['Reading', 'Coffee shops', 'Photography', 'Film'],
    },
  },
  {
    uid: 'sample-ava',
    firstName: 'Ethan',
    lastName: 'M',
    fullName: 'Ethan M',
    age: 20,
    yearAtUf: 'Sophomore',
    bio: 'Outgoing and social, always down to try a new spot in town.',
    gender: 'man',
    intention: 'dating',
    interests: ['Concerts', 'Thrifting', 'Coffee shops', 'Travel'],
    dateVibe: ['Foodie', 'Surprise me'],
    dateBudget: 'mid',
    preferences: {
      intention: 'dating',
      genderIdentity: 'man',
      genderPreference: 'women',
      intentionOpenTo: 'either',
      ageRange: { min: 18, max: 24 },
      vibeWords: ['Spontaneous', 'Social', 'Foodie'],
      socialEnergy: 80,
      dateBudget: 'mid',
      dateVibe: ['Foodie', 'Surprise me'],
      distance: 'anywhere',
      availability: ['either'],
      interests: ['Concerts', 'Thrifting', 'Coffee shops', 'Travel'],
    },
  },
  {
    uid: 'sample-jordan',
    firstName: 'Jordan',
    lastName: 'T',
    fullName: 'Jordan T',
    age: 22,
    yearAtUf: 'Senior',
    bio: 'Gym regular who likes active first dates and football weekends.',
    gender: 'man',
    intention: 'either',
    interests: ['Gym', 'Football games', 'Pickleball', 'Hiking'],
    dateVibe: ['Active'],
    dateBudget: 'free',
    preferences: {
      intention: 'either',
      genderIdentity: 'man',
      genderPreference: 'women',
      intentionOpenTo: 'either',
      ageRange: { min: 19, max: 25 },
      vibeWords: ['Athletic', 'Spontaneous', 'Adventurous'],
      socialEnergy: 72,
      dateBudget: 'free',
      dateVibe: ['Active'],
      distance: 'near',
      availability: ['weekdays'],
      interests: ['Gym', 'Football games', 'Pickleball', 'Hiking'],
    },
  },
  {
    uid: 'sample-dylan',
    firstName: 'Dylan',
    lastName: 'Cruz',
    fullName: 'Dylan Cruz',
    age: 21,
    yearAtUf: 'Junior',
    bio: 'Low-key gamer and foodie who likes good playlists and better conversation.',
    gender: 'man',
    intention: 'dating',
    interests: ['Board games', 'Coffee shops', 'Trying new restaurants', 'Music', 'Gaming', 'Travel'],
    dateVibe: ['Foodie', 'Surprise me', 'Chill'],
    dateBudget: 'low',
    preferences: {
      intention: 'dating',
      genderIdentity: 'man',
      genderPreference: 'women',
      intentionOpenTo: 'either',
      ageRange: { min: 18, max: 25 },
      vibeWords: ['Foodie', 'Night owl', 'Curious'],
      socialEnergy: 30,
      dateBudget: 'low',
      dateVibe: ['Foodie', 'Surprise me', 'Chill'],
      distance: 'anywhere',
      availability: ['either'],
      interests: ['Board games', 'Coffee shops', 'Trying new restaurants', 'Music', 'Gaming', 'Travel'],
    },
  },
  {
    uid: 'sample-maya',
    firstName: 'Noah',
    lastName: 'S',
    fullName: 'Noah S',
    age: 21,
    yearAtUf: 'Junior',
    bio: 'Creative and thoughtful, happiest with art, film, and chill weekends.',
    gender: 'man',
    intention: 'friendship',
    interests: ['Painting', 'Film', 'Photography', 'Board games'],
    dateVibe: ['Artsy'],
    dateBudget: 'low',
    preferences: {
      intention: 'friendship',
      genderIdentity: 'man',
      genderPreference: 'everyone',
      intentionOpenTo: 'friendship',
      ageRange: { min: 20, max: 24 },
      vibeWords: ['Artsy', 'Homebody', 'Planner'],
      socialEnergy: 38,
      dateBudget: 'low',
      dateVibe: ['Artsy'],
      distance: 'campus',
      availability: ['weekends'],
      interests: ['Painting', 'Film', 'Photography', 'Board games'],
    },
  },
  {
    uid: 'sample-nina',
    firstName: 'Nina',
    lastName: 'K',
    fullName: 'Nina K',
    age: 19,
    yearAtUf: 'Freshman',
    bio: 'Friendly and easygoing, into coffee runs, trivia nights, and games.',
    gender: 'woman',
    intention: 'either',
    interests: ['Coffee shops', 'Reading', 'Gaming', 'Trivia nights'],
    dateVibe: ['Chill', 'Foodie'],
    dateBudget: 'low',
    preferences: {
      intention: 'either',
      genderIdentity: 'woman',
      genderPreference: 'everyone',
      intentionOpenTo: 'either',
      ageRange: { min: 18, max: 22 },
      vibeWords: ['Curious', 'Early bird', 'Chill'],
      socialEnergy: 55,
      dateBudget: 'low',
      dateVibe: ['Chill', 'Foodie'],
      distance: 'campus',
      availability: ['either'],
      interests: ['Coffee shops', 'Reading', 'Gaming', 'Trivia nights'],
    },
  },
  {
    uid: 'sample-sophia',
    firstName: 'Liam',
    lastName: 'L',
    fullName: 'Liam L',
    age: 23,
    yearAtUf: 'Graduate',
    bio: 'Planner with foodie energy who enjoys weekend adventures and live music.',
    gender: 'man',
    intention: 'dating',
    interests: ['Trying new restaurants', 'Travel', 'Music', 'Cooking'],
    dateVibe: ['Foodie', 'Surprise me'],
    dateBudget: 'mid',
    preferences: {
      intention: 'dating',
      genderIdentity: 'man',
      genderPreference: 'women',
      intentionOpenTo: 'dating',
      ageRange: { min: 22, max: 28 },
      vibeWords: ['Foodie', 'Planner', 'Night owl'],
      socialEnergy: 67,
      dateBudget: 'mid',
      dateVibe: ['Foodie', 'Surprise me'],
      distance: 'anywhere',
      availability: ['weekends'],
      interests: ['Trying new restaurants', 'Travel', 'Music', 'Cooking'],
    },
  },
];

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isUflEmail = (email: string) => normalizeEmail(email).endsWith('@ufl.edu');
const defaultPreferences: Preferences = {
  intention: 'either',
  genderIdentity: '',
  genderPreference: 'everyone',
  intentionOpenTo: 'either',
  ageRange: { min: 18, max: 26 },
  vibeWords: [],
  socialEnergy: 50,
  dateBudget: 'low',
  dateVibe: [],
  distance: 'near',
  availability: ['either'],
  interests: [],
};
const normalizeIntentionValue = (value: string | undefined) => {
  if (!value) {
    return 'either';
  }

  if (value === 'open' || value === 'casual' || value === 'serious') {
    return 'dating';
  }

  if (value === 'friends') {
    return 'friendship';
  }

  return value;
};
const genderPreferenceMatchMap: Record<string, string[]> = {
  women: ['woman'],
  men: ['man'],
  everyone: ['woman', 'man', 'nonbinary', 'other', 'prefer-not-to-say'],
  any: ['woman', 'man', 'nonbinary', 'other', 'prefer-not-to-say'],
};
const isGenderAllowed = (seekerPreference: string, candidateGender: string) => {
  if (seekerPreference === 'any' || seekerPreference === 'everyone') {
    return true;
  }

  const allowedGenders = genderPreferenceMatchMap[seekerPreference] || genderPreferenceMatchMap.any;
  return allowedGenders.includes(candidateGender);
};
const isIntentionCompatible = (seekerIntention: string, candidateIntention: string) => {
  if (seekerIntention === 'either' || candidateIntention === 'either') {
    return true;
  }

  return seekerIntention === candidateIntention;
};
const labelForIntention = (value: string) =>
  datingIntentionOptions.find((option) => option.value === value)?.label || 'Open to anything';
const profileToDater = (profileEntry: UserProfile): Dater => {
  const topVibe = profileEntry.preferences.vibeWords[0] || profileEntry.dateVibe[0] || 'Good energy';
  const interestSummary = profileEntry.preferences.interests.slice(0, 3).join(', ');

  // Future Gemini integration can reuse intention, interests, dateBudget, and dateVibe here
  // to generate better date ideas once the planner is connected.
  return {
    id: profileEntry.uid,
    name: profileEntry.fullName || profileEntry.name || 'Anonymous',
    age: profileEntry.age,
    yearAtUf: profileEntry.yearAtUf || 'UF Student',
    bio:
      profileEntry.bio ||
      [
        labelForIntention(profileEntry.intention),
        interestSummary,
        profileEntry.dateBudget ? `Budget: ${profileEntry.dateBudget}` : '',
      ]
        .filter(Boolean)
        .join(' · ') ||
      'New connection at UF',
    compatibility: 0,
    vibe: topVibe,
  };
};
const normalizePreferences = (preferences: Partial<Preferences> | undefined): Preferences => ({
  intention: normalizeIntentionValue(preferences?.intention),
  genderIdentity: preferences?.genderIdentity || defaultPreferences.genderIdentity,
  genderPreference: preferences?.genderPreference === 'any'
    ? 'everyone'
    : preferences?.genderPreference || defaultPreferences.genderPreference,
  intentionOpenTo: normalizeIntentionValue(preferences?.intentionOpenTo),
  ageRange: {
    min: Math.max(18, Number(preferences?.ageRange?.min) || defaultPreferences.ageRange.min),
    max: Math.max(18, Number(preferences?.ageRange?.max) || defaultPreferences.ageRange.max),
  },
  vibeWords: Array.isArray(preferences?.vibeWords)
    ? preferences.vibeWords.filter((word): word is string => typeof word === 'string').slice(0, 3)
    : [],
  socialEnergy: Math.min(100, Math.max(0, Number(preferences?.socialEnergy) || defaultPreferences.socialEnergy)),
  dateBudget: preferences?.dateBudget || defaultPreferences.dateBudget,
  dateVibe: Array.isArray(preferences?.dateVibe)
    ? preferences.dateVibe.filter((vibe): vibe is string => typeof vibe === 'string')
    : [],
  distance: preferences?.distance || defaultPreferences.distance,
  availability: Array.isArray(preferences?.availability)
    ? preferences.availability.filter((option): option is string => typeof option === 'string')
    : ['either'],
  interests: Array.isArray(preferences?.interests)
    ? preferences.interests.filter((interest): interest is string => typeof interest === 'string').slice(0, 10)
    : [],
});
const normalizeUserProfile = (rawProfile: Partial<UserProfile>, uid: string): UserProfile => {
  const preferences = normalizePreferences(rawProfile.preferences);
  const fullName = rawProfile.fullName || rawProfile.name || `${rawProfile.firstName || ''} ${rawProfile.lastName || ''}`.trim();

  return {
    uid: rawProfile.uid || uid,
    firstName: rawProfile.firstName || '',
    lastName: rawProfile.lastName || '',
    fullName,
    name: rawProfile.name || fullName,
    age: Number(rawProfile.age) || 18,
    yearAtUf: rawProfile.yearAtUf || '',
    bio: rawProfile.bio || '',
    gender: rawProfile.gender || preferences.genderIdentity,
    genderPreference: rawProfile.genderPreference || preferences.genderPreference,
    intentionOpenTo: rawProfile.intentionOpenTo || preferences.intentionOpenTo,
    ageRange: rawProfile.ageRange || preferences.ageRange,
    intention: rawProfile.intention || preferences.intention,
    interests: Array.isArray(rawProfile.interests) ? rawProfile.interests : preferences.interests,
    dateBudget: rawProfile.dateBudget || preferences.dateBudget,
    dateVibe: Array.isArray(rawProfile.dateVibe) ? rawProfile.dateVibe : preferences.dateVibe,
    distance: rawProfile.distance || preferences.distance,
    availability: Array.isArray(rawProfile.availability) ? rawProfile.availability : preferences.availability,
    email: rawProfile.email || '',
    photoUrl: rawProfile.photoUrl || '',
    preferences,
    likedUsers: Array.isArray(rawProfile.likedUsers) ? rawProfile.likedUsers : [],
    passedUsers: Array.isArray(rawProfile.passedUsers) ? rawProfile.passedUsers : [],
    matches: Array.isArray(rawProfile.matches) ? rawProfile.matches : [],
    blockedUsers: Array.isArray(rawProfile.blockedUsers) ? rawProfile.blockedUsers : [],
    onboardingCompleted: rawProfile.onboardingCompleted ?? false,
    createdAt: rawProfile.createdAt,
  };
};
const compareProfilesByPreferences = (current: UserProfile, candidate: UserProfile) => {
  let score = 0;

  const sharedInterests = current.interests.filter((interest) =>
    candidate.interests.includes(interest),
  ).length;
  score += Math.min(sharedInterests * 8, 56);

  const sharedDateVibes = current.dateVibe.filter((vibe) =>
    candidate.dateVibe.includes(vibe),
  ).length;
  score += Math.min(sharedDateVibes * 12, 24);

  if (current.dateBudget === candidate.dateBudget) {
    score += 12;
  }

  if (isIntentionCompatible(current.intention, candidate.intention)) {
    score += 8;
  }

  return Math.min(score, 100);
};
const buildSampleDiscoveryFeed = (currentProfile?: UserProfile) => {
  const normalizedSamples = sampleDiscoveryProfiles
    .map((sampleProfile) => normalizeUserProfile(sampleProfile, sampleProfile.uid));

  if (!currentProfile) {
    return normalizedSamples.map((sampleProfile) => ({
      ...profileToDater(sampleProfile),
      compatibility: 0,
    }));
  }

  return normalizedSamples
    .filter((sampleProfile) => !currentProfile.likedUsers.includes(sampleProfile.uid))
    .filter((sampleProfile) => !currentProfile.passedUsers.includes(sampleProfile.uid))
    .map((sampleProfile) => ({
      sampleProfile,
      score: compareProfilesByPreferences(currentProfile, sampleProfile),
    }))
    .sort((left, right) => right.score - left.score)
    .map(({ sampleProfile, score }) => ({
      ...profileToDater(sampleProfile),
      compatibility: score,
    }));
};
const isOfflineFirestoreError = (value: unknown) =>
  value instanceof Error &&
  (value.message.toLowerCase().includes('client is offline') ||
    value.message.toLowerCase().includes('offline') ||
    value.message.toLowerCase().includes('unavailable'));
const getProfileStorageKey = (uid: string) => `gator-dater-profile:${uid}`;
const getChatId = (leftUserId: string, rightUserId: string) =>
  [leftUserId, rightUserId].sort().join('__');
const plannerGreeting =
  'Hi! I can help plan Gainesville-friendly dates around your budget, vibe, and schedule. Tell me what you want, and I’ll suggest a few options.';
const buildPlannerPrompts = (currentProfile: UserProfile | null): PlannerPrompt[] => {
  const interest = currentProfile?.interests[0] || currentProfile?.preferences.interests[0] || 'coffee';
  const vibe = currentProfile?.dateVibe[0] || currentProfile?.preferences.dateVibe[0] || 'casual';
  const availability = currentProfile?.availability[0] || currentProfile?.preferences.availability[0] || 'this weekend';
  const budget = currentProfile?.dateBudget || currentProfile?.preferences.dateBudget || 'low';

  return [
    {
      id: 'quick-coffee',
      label: 'Local coffee shops',
      prompt: `Plan a ${budget}-budget coffee date near UF with two cozy spots and an easy follow-up activity.`,
    },
    {
      id: 'quick-personalized',
      label: `Ideas for someone into ${interest}`,
      prompt: `Suggest three ${vibe} date ideas in Gainesville for someone who likes ${interest}.`,
    },
    {
      id: 'quick-weekend',
      label: 'Best picnic timing',
      prompt: `Plan a ${vibe} outdoor date around ${availability} with a picnic-friendly Gainesville route and backup indoor option.`,
    },
  ];
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [signUp, setSignUp] = useState<SignUpState>(initialSignUp);
  const [signIn, setSignIn] = useState<SignInState>(initialSignIn);
  const [profileForm, setProfileForm] = useState<ProfileState>(initialProfile);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState('Form genuine connections in a comfortable, campus-friendly environment.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('swipe');
  const [firestoreHealth, setFirestoreHealth] = useState<FirestoreHealth>('unknown');
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [likedDaters, setLikedDaters] = useState<Dater[]>([]);
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [matchesModalOpen, setMatchesModalOpen] = useState(false);
  const [matchedDaters, setMatchedDaters] = useState<Dater[]>([]);
  const [discoveryFeed, setDiscoveryFeed] = useState<Dater[]>(() => buildSampleDiscoveryFeed());
  const [discoveryFeedSource, setDiscoveryFeedSource] = useState<'sample' | 'firestore'>('sample');
  const [preferencesSection, setPreferencesSection] = useState<'preferences' | 'deal-breakers'>('preferences');
  const [plannerMessages, setPlannerMessages] = useState<PlannerChatMessage[]>([
    { role: 'assistant', text: plannerGreeting },
  ]);
  const [plannerInput, setPlannerInput] = useState('');
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState('');
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const plannerChatRef = useRef<HTMLDivElement | null>(null);
  const userChatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setError('');

      if (!user || !db) {
        setProfile(null);
        setFirestoreHealth('unknown');
        setScreen('intro');
        return;
      }

      await reload(user);

      if (!user.emailVerified) {
        setProfile(null);
        setVerificationEmail(user.email || verificationEmail);
        setScreen('signup-verification');
        return;
      }

      try {
        const nextProfile = await loadUserProfile(user);

        if (!nextProfile) {
          setProfile(null);
          setProfileForm((current) => ({
            ...current,
            firstName: user.displayName?.split(' ')[0] || current.firstName,
            photoUrl: user.photoURL || current.photoUrl,
          }));
          setScreen('profile');
          return;
        }

        setProfile(nextProfile);
        setScreen(nextProfile.onboardingCompleted ? 'home' : 'profile');
      } catch (loadError) {
        setProfile(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load your profile right now.',
        );
      }
    });
  }, []);

  useEffect(() => {
    if (!currentUser || !profile || screen !== 'home') {
      return;
    }

    void loadDiscoveryFeed(currentUser, profile).catch((loadError: unknown) => {
      const code =
        typeof loadError === 'object' &&
        loadError !== null &&
        'code' in loadError
          ? String((loadError as { code?: unknown }).code)
          : 'unknown';
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'unknown error';

      setDiscoveryFeed(buildSampleDiscoveryFeed(profile));
      setDiscoveryFeedSource('sample');
      //for firebase accounts info
      // setDiscoveryDebug(
      //   `DEBUG discovery: Firestore load failed (code=${code}, message=${message}); showing sample profiles only.`,
      // );
      if (isOfflineFirestoreError(loadError)) {
        setFirestoreHealth('fallback');
      }
      setSwipeIndex(0);
      setStatus('Using sample daters while the discovery feed loads.');
    });
  }, [currentUser, profile, screen]);

  useEffect(() => {
    if (!currentUser || !profile) {
      setLikedDaters([]);
      return;
    }

    void loadLikedDaters(profile);
  }, [currentUser, profile]);

  useEffect(() => {
    const chatContainer = plannerChatRef.current;

    if (!chatContainer) {
      return;
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, [plannerMessages, plannerLoading]);

  useEffect(() => {
    const chatContainer = userChatRef.current;

    if (!chatContainer) {
      return;
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (!currentUser || !profile?.matches.length || !db) {
      setChatConversations([]);
      setSelectedChatId('');
      return;
    }

    const firestore = db;
    let cancelled = false;

    const loadChatConversations = async () => {
      const conversations = await Promise.all(
        profile.matches.map(async (matchId) => {
          const matchDoc = await getDoc(doc(firestore, 'users', matchId));

          if (!matchDoc.exists()) {
            return null;
          }

          const matchProfile = normalizeUserProfile(matchDoc.data() as Partial<UserProfile>, matchId);
          const chatId = getChatId(currentUser.uid, matchId);
          const chatDoc = await getDoc(doc(firestore, 'chats', chatId));
          const chatData = chatDoc.exists() ? (chatDoc.data() as { lastMessage?: string }) : null;

          return {
            chatId,
            matchId,
            matchName: matchProfile.fullName || matchProfile.name || 'New match',
            matchPhotoUrl: matchProfile.photoUrl || '',
            preview: chatData?.lastMessage || `You matched with ${matchProfile.firstName || matchProfile.name || 'someone'}!`,
            unread: false as boolean,
          };
        }),
      );

      if (cancelled) {
        return;
      }

      const nextConversations = conversations.filter((conversation): conversation is ChatConversation => conversation !== null);
      setChatConversations(nextConversations);
      setSelectedChatId((current) =>
        current && nextConversations.some((conversation) => conversation.chatId === current)
          ? current
          : nextConversations[0]?.chatId || '',
      );
    };

    void loadChatConversations().catch(() => {
      if (!cancelled) {
        setChatError('Unable to load chats right now.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser, profile?.matches, db]);

  useEffect(() => {
    if (!db || !selectedChatId) {
      setChatMessages([]);
      return;
    }

    setChatLoading(true);
    setChatError('');

    const unsubscribe = onSnapshot(
      query(collection(db, 'chats', selectedChatId, 'messages'), orderBy('createdAt', 'asc')),
      (snapshot) => {
        const nextMessages = snapshot.docs.map((messageDoc) => {
          const data = messageDoc.data() as { senderId?: string; text?: string };

          return {
            id: messageDoc.id,
            senderId: data.senderId || '',
            text: data.text || '',
          };
        });

        setChatMessages(nextMessages);
        setChatLoading(false);
      },
      () => {
        setChatLoading(false);
        setChatError('Unable to sync messages right now.');
      },
    );

    return () => {
      unsubscribe();
    };
  }, [db, selectedChatId]);

  const resetMessages = () => {
    setError('');
    setStatus('');
  };

  const getLocalProfile = (uid: string) => {
    const storedProfile = window.localStorage.getItem(getProfileStorageKey(uid));

    if (!storedProfile) {
      return null;
    }

    try {
      const parsedProfile = JSON.parse(storedProfile) as Partial<UserProfile>;

      return normalizeUserProfile(parsedProfile, uid);
    } catch {
      return null;
    }
  };

  const saveLocalProfile = (uid: string, nextProfile: UserProfile) => {
    window.localStorage.setItem(
      getProfileStorageKey(uid),
      JSON.stringify(nextProfile),
    );
  };

  const saveProfilePhoto = async (photoUrl: string) => {
    if (!currentUser || !currentUser.email) {
      return;
    }

    const nextPreferences = normalizePreferences(profile?.preferences || {
      intention: profileForm.intention,
      genderIdentity: profileForm.genderIdentity,
      genderPreference: profileForm.genderPreference,
      intentionOpenTo: profileForm.intentionOpenTo,
      ageRange: {
        min: Number(profileForm.ageRangeMin),
        max: Number(profileForm.ageRangeMax),
      },
      vibeWords: profileForm.vibeWords,
      socialEnergy: profileForm.socialEnergy,
      dateBudget: profileForm.dateBudget,
      dateVibe: profileForm.dateVibe,
      distance: profileForm.distance,
      availability: profileForm.availability,
      interests: profileForm.interests,
    });

    const updatedProfile: UserProfile = {
      uid: currentUser.uid,
      firstName: profile?.firstName || profileForm.firstName || '',
      lastName: profile?.lastName || profileForm.lastName || '',
      fullName:
        profile?.fullName ||
        `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim() ||
        currentUser.displayName ||
        '',
      name:
        profile?.name ||
        profile?.fullName ||
        `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim() ||
        currentUser.displayName ||
        '',
      age: profile?.age || Number(profileForm.age) || 18,
      yearAtUf: profile?.yearAtUf || profileForm.yearAtUf || '',
      bio: profile?.bio || profileForm.bio || '',
      gender: profile?.gender || nextPreferences.genderIdentity,
      genderPreference: profile?.genderPreference || nextPreferences.genderPreference,
      intentionOpenTo: profile?.intentionOpenTo || nextPreferences.intentionOpenTo,
      ageRange: profile?.ageRange || nextPreferences.ageRange,
      intention: profile?.intention || nextPreferences.intention,
      interests: profile?.interests || nextPreferences.interests,
      dateBudget: profile?.dateBudget || nextPreferences.dateBudget,
      dateVibe: profile?.dateVibe || nextPreferences.dateVibe,
      distance: profile?.distance || nextPreferences.distance,
      availability: profile?.availability || nextPreferences.availability,
      email: currentUser.email || '',
      photoUrl,
      preferences: nextPreferences,
      likedUsers: profile?.likedUsers || [],
      passedUsers: profile?.passedUsers || [],
      matches: profile?.matches || [],
      blockedUsers: profile?.blockedUsers || [],
      onboardingCompleted: profile?.onboardingCompleted ?? true,
      createdAt: profile?.createdAt,
    };

    setProfileForm((current) => ({
      ...current,
      photoUrl,
    }));
    saveLocalProfile(currentUser.uid, updatedProfile);
    setProfile(updatedProfile);

    try {
      if (db) {
        await setDoc(doc(db, 'users', currentUser.uid), updatedProfile, { merge: true });
        setFirestoreHealth('connected');
      }

      await updateProfile(currentUser, {
        displayName: updatedProfile.fullName,
      });

      setStatus('Profile photo updated.');
    } catch (photoError) {
      if (isOfflineFirestoreError(photoError)) {
        setFirestoreHealth('fallback');
        setStatus('Photo updated on this device. Firestore will sync later.');
        return;
      }

      setError(
        photoError instanceof Error
          ? photoError.message
          : 'Unable to update your profile photo right now.',
      );
    }
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        return;
      }

      setProfileForm((current) => ({
        ...current,
        photoUrl: result,
      }));
      setStatus('Photo selected.');
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleProfilePhotoUpdate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !currentUser || !currentUser.email) {
      return;
    }
    const reader = new FileReader();

    reader.onload = async () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        return;
      }

      await saveProfilePhoto(result);
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const loadUserProfile = async (user: User) => {
    if (!db) {
      return getLocalProfile(user.uid);
    }

    try {
      const snapshot = await getDoc(doc(db, 'users', user.uid));
      const nextProfile = snapshot.exists()
        ? normalizeUserProfile(snapshot.data() as Partial<UserProfile>, user.uid)
        : null;

      setFirestoreHealth('connected');

      if (nextProfile) {
        saveLocalProfile(user.uid, nextProfile);
      }

      return nextProfile;
    } catch (loadError) {
      if (isOfflineFirestoreError(loadError)) {
        const fallbackProfile = getLocalProfile(user.uid);

        if (fallbackProfile) {
          setFirestoreHealth('fallback');
          setStatus('Using your saved profile while Firestore is unavailable.');
          return fallbackProfile;
        }

        setFirestoreHealth('fallback');
        setStatus('Firestore is unavailable, but you can still continue.');
        return null;
      }

      throw loadError;
    }
  };

  const handleBack = () => {
    resetMessages();

    if (screen === 'signup-password') {
      setScreen('signup-email');
      return;
    }

    if (screen === 'signup-email' || screen === 'signup-verification' || screen === 'signin') {
      setScreen('intro');
      return;
    }

    if (screen === 'preferences') {
      setScreen('home');
      setActiveTab('profile-tab');
    }
  };

  const handleCreateEmailStep = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(signUp.email);

    if (!isUflEmail(normalizedEmail)) {
      setError('Please use your @ufl.edu email address.');
      return;
    }

    setSignUp((current) => ({ ...current, email: normalizedEmail }));
    setError('');
    setStatus('');
    setScreen('signup-password');
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFirebaseConfigured || !auth) {
      setError('Add your Firebase web config to .env before using auth.');
      return;
    }

    const normalizedEmail = normalizeEmail(signUp.email);

    if (!isUflEmail(normalizedEmail)) {
      setError('Please use your @ufl.edu email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        signUp.password,
      );

      await updateProfile(credential.user, {
        displayName: profileForm.firstName || '',
      });
      await sendEmailVerification(credential.user);
      await signOut(auth);

      setVerificationEmail(normalizedEmail);
      setSignIn({
        email: normalizedEmail,
        password: signUp.password,
      });
      setScreen('signup-verification');
      setStatus('A verification email has been sent to your UFL email.');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create your account right now.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFirebaseConfigured || !auth || !db) {
      setError('Add your Firebase web config to .env before using auth.');
      return;
    }

    const normalizedEmail = normalizeEmail(signIn.email);

    if (!isUflEmail(normalizedEmail)) {
      setError('Only @ufl.edu email addresses can sign in.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        signIn.password,
      );

      await reload(credential.user);

      if (!credential.user.emailVerified) {
        await signOut(auth);
        setVerificationEmail(normalizedEmail);
        setScreen('signup-verification');
        setStatus('Check your email, verify your account, then sign in again.');
        return;
      }

      const nextProfile = await loadUserProfile(credential.user);

      if (!nextProfile) {
        setProfile(null);
        setScreen('profile');
        setStatus('Tell us a bit about yourself to finish setting up your account.');
        return;
      }

      setProfile(nextProfile);
      setScreen(nextProfile.onboardingCompleted ? 'home' : 'profile');
      setStatus('Signed in successfully.');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to sign in right now.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!isFirebaseConfigured || !auth) {
      setError('Firebase is not configured.');
      return;
    }

    const email = normalizeEmail(signIn.email || verificationEmail);

    if (!email || !isUflEmail(email)) {
      setError('Enter a valid @ufl.edu email address first.');
      return;
    }

    if (!signIn.password) {
      setError('Enter your password on the sign in screen before resending the code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credential = await signInWithEmailAndPassword(auth, email, signIn.password);
      await sendEmailVerification(credential.user);
      await signOut(auth);
      setVerificationEmail(email);
      setStatus('A new verification email has been sent.');
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : 'Unable to resend the verification email right now.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUser || !currentUser.email || !db) {
      setError('You need to be signed in before completing your profile.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const nextPreferences = normalizePreferences({
        intention: profileForm.intention,
        genderIdentity: profileForm.genderIdentity,
        genderPreference: profileForm.genderPreference,
        intentionOpenTo: profileForm.intentionOpenTo,
        ageRange: {
          min: Number(profileForm.ageRangeMin),
          max: Number(profileForm.ageRangeMax),
        },
        vibeWords: profileForm.vibeWords,
        socialEnergy: profileForm.socialEnergy,
        dateBudget: profileForm.dateBudget,
        dateVibe: profileForm.dateVibe,
        distance: profileForm.distance,
        availability: profileForm.availability,
        interests: profileForm.interests,
      });

      const fullName = `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim();
      const nextProfile: UserProfile = {
        uid: currentUser.uid,
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        fullName,
        name: fullName,
        age: Number(profileForm.age),
        yearAtUf: profileForm.yearAtUf,
        bio: profileForm.bio.trim(),
        gender: nextPreferences.genderIdentity,
        genderPreference: nextPreferences.genderPreference,
        intentionOpenTo: nextPreferences.intentionOpenTo,
        ageRange: nextPreferences.ageRange,
        intention: nextPreferences.intention,
        interests: nextPreferences.interests,
        dateBudget: nextPreferences.dateBudget,
        dateVibe: nextPreferences.dateVibe,
        distance: nextPreferences.distance,
        availability: nextPreferences.availability,
        email: currentUser.email,
        photoUrl: profileForm.photoUrl,
        preferences: nextPreferences,
        likedUsers: profile?.likedUsers || [],
        passedUsers: profile?.passedUsers || [],
        matches: profile?.matches || [],
        blockedUsers: profile?.blockedUsers || [],
        onboardingCompleted: true,
        createdAt: profile?.createdAt || serverTimestamp(),
      };

      saveLocalProfile(currentUser.uid, nextProfile);

      await setDoc(doc(db, 'users', currentUser.uid), nextProfile, { merge: true });
      setFirestoreHealth('connected');
      await updateProfile(currentUser, {
        displayName: nextProfile.fullName,
      });

      setProfile(nextProfile);
      setScreen('all-set');
      setStatus('You are all set.');
    } catch (profileError) {
      if (isOfflineFirestoreError(profileError)) {
        const nextPreferences = normalizePreferences({
          intention: profileForm.intention,
          genderIdentity: profileForm.genderIdentity,
          genderPreference: profileForm.genderPreference,
          intentionOpenTo: profileForm.intentionOpenTo,
          ageRange: {
            min: Number(profileForm.ageRangeMin),
            max: Number(profileForm.ageRangeMax),
          },
          vibeWords: profileForm.vibeWords,
          socialEnergy: profileForm.socialEnergy,
          dateBudget: profileForm.dateBudget,
          dateVibe: profileForm.dateVibe,
          distance: profileForm.distance,
          availability: profileForm.availability,
          interests: profileForm.interests,
        });
        const fullName = `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim();
        const nextProfile: UserProfile = {
          uid: currentUser.uid,
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          fullName,
          name: fullName,
          age: Number(profileForm.age),
          yearAtUf: profileForm.yearAtUf,
          bio: profileForm.bio.trim(),
          gender: nextPreferences.genderIdentity,
          genderPreference: nextPreferences.genderPreference,
          intentionOpenTo: nextPreferences.intentionOpenTo,
          ageRange: nextPreferences.ageRange,
          intention: nextPreferences.intention,
          interests: nextPreferences.interests,
          dateBudget: nextPreferences.dateBudget,
          dateVibe: nextPreferences.dateVibe,
          distance: nextPreferences.distance,
          availability: nextPreferences.availability,
          email: currentUser.email,
          photoUrl: profileForm.photoUrl,
          preferences: nextPreferences,
          likedUsers: profile?.likedUsers || [],
          passedUsers: profile?.passedUsers || [],
          matches: profile?.matches || [],
          blockedUsers: profile?.blockedUsers || [],
          onboardingCompleted: true,
          createdAt: profile?.createdAt,
        };

        saveLocalProfile(currentUser.uid, nextProfile);
        setFirestoreHealth('fallback');
        setProfile(nextProfile);
        setScreen('all-set');
        setStatus('Profile saved on this device. We will sync it when Firestore is available again.');
        return;
      }

      setError(
        profileError instanceof Error
          ? profileError.message
          : 'Unable to save your profile right now.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleContinueFromAllSet = () => {
    if (currentUser && profile) {
      void findTopPreferenceMatches(currentUser.uid, profile)
        .then((matches) => {
          if (matches.length) {
            setStatus(`Found ${matches.length} potential matches from profile preferences.`);
          }
        })
        .catch(() => {
          setStatus('');
        });
    }

    setScreen('home');
    setActiveTab('swipe');
  };

  const handleOpenPreferences = () => {
    setProfileForm((current) => ({
      ...current,
      bio: profile?.bio || current.bio,
      intention: profile?.preferences.intention || current.intention,
      genderIdentity: profile?.preferences.genderIdentity || current.genderIdentity,
      genderPreference: profile?.preferences.genderPreference || current.genderPreference,
      intentionOpenTo: profile?.preferences.intentionOpenTo || current.intentionOpenTo,
      ageRangeMin: String(profile?.preferences.ageRange.min || current.ageRangeMin),
      ageRangeMax: String(profile?.preferences.ageRange.max || current.ageRangeMax),
      vibeWords: profile?.preferences.vibeWords || current.vibeWords,
      socialEnergy: profile?.preferences.socialEnergy ?? current.socialEnergy,
      dateBudget: profile?.preferences.dateBudget || current.dateBudget,
      dateVibe: profile?.preferences.dateVibe || current.dateVibe,
      distance: profile?.preferences.distance || current.distance,
      availability: profile?.preferences.availability || current.availability,
      interests: profile?.preferences.interests || current.interests,
    }));
    setScreen('preferences');
  };

  const handlePreferencesSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUser || !currentUser.email) {
      setError('You need to be signed in before saving preferences.');
      return;
    }

    setLoading(true);
    setError('');

    const minAge = Number(profileForm.ageRangeMin);
    const maxAge = Number(profileForm.ageRangeMax);

    if (minAge < 18 || maxAge < 18 || minAge > maxAge) {
      setError('Choose a valid age range (minimum 18 and min <= max).');
      setLoading(false);
      return;
    }

    if (profileForm.vibeWords.length > 3) {
      setError('Pick up to 3 vibe words.');
      setLoading(false);
      return;
    }

    if (profileForm.interests.length > 10) {
      setError('Pick up to 10 interests.');
      setLoading(false);
      return;
    }

    const nextPreferences: Preferences = {
      intention: profileForm.intention,
      genderIdentity: profileForm.genderIdentity,
      genderPreference: profileForm.genderPreference,
      intentionOpenTo: profileForm.intentionOpenTo,
      ageRange: {
        min: minAge,
        max: maxAge,
      },
      vibeWords: profileForm.vibeWords,
      socialEnergy: profileForm.socialEnergy,
      dateBudget: profileForm.dateBudget,
      dateVibe: profileForm.dateVibe,
      distance: profileForm.distance,
      availability: profileForm.availability,
      interests: profileForm.interests,
    };

    const fullName =
      profile?.fullName ||
      `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim() ||
      currentUser.displayName ||
      '';
    const updatedProfile: UserProfile = {
      uid: currentUser.uid,
      firstName: profile?.firstName || profileForm.firstName || '',
      lastName: profile?.lastName || profileForm.lastName || '',
      fullName,
      name: fullName,
      age: profile?.age || Number(profileForm.age) || 18,
      yearAtUf: profile?.yearAtUf || profileForm.yearAtUf || '',
      bio: profileForm.bio.trim() || profile?.bio || '',
      gender: nextPreferences.genderIdentity,
      genderPreference: nextPreferences.genderPreference,
      intentionOpenTo: nextPreferences.intentionOpenTo,
      ageRange: nextPreferences.ageRange,
      intention: nextPreferences.intention,
      interests: nextPreferences.interests,
      dateBudget: nextPreferences.dateBudget,
      dateVibe: nextPreferences.dateVibe,
      distance: nextPreferences.distance,
      availability: nextPreferences.availability,
      email: currentUser.email,
      photoUrl: profile?.photoUrl || profileForm.photoUrl || '',
      preferences: nextPreferences,
      likedUsers: profile?.likedUsers || [],
      passedUsers: profile?.passedUsers || [],
      matches: profile?.matches || [],
      blockedUsers: profile?.blockedUsers || [],
      onboardingCompleted: profile?.onboardingCompleted ?? true,
      createdAt: profile?.createdAt,
    };

    saveLocalProfile(currentUser.uid, updatedProfile);
    setProfile(updatedProfile);

    try {
      if (db) {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            preferences: nextPreferences,
            gender: updatedProfile.gender,
            genderPreference: updatedProfile.genderPreference,
            intentionOpenTo: updatedProfile.intentionOpenTo,
            ageRange: updatedProfile.ageRange,
            intention: updatedProfile.intention,
            bio: updatedProfile.bio,
            interests: updatedProfile.interests,
            dateBudget: updatedProfile.dateBudget,
            dateVibe: updatedProfile.dateVibe,
            distance: updatedProfile.distance,
            availability: updatedProfile.availability,
          },
          { merge: true },
        );
        setFirestoreHealth('connected');
      }

      setScreen('home');
      setActiveTab('profile-tab');
      setStatus('Preferences saved.');
    } catch (preferencesError) {
      if (isOfflineFirestoreError(preferencesError)) {
        setFirestoreHealth('fallback');
        setScreen('home');
        setActiveTab('profile-tab');
        setStatus('Preferences saved on this device. Firestore will sync later.');
        return;
      }

      setError(
        preferencesError instanceof Error
          ? preferencesError.message
          : 'Unable to save preferences right now.',
      );
    } finally {
      setLoading(false);
    }
  };

  const findTopPreferenceMatches = async (userId: string, currentProfile: UserProfile) => {
    if (!db) {
      return [] as Array<{ id: string; profile: UserProfile; score: number }>;
    }

    const profilesQuery = query(
      collection(db, 'users'),
      limit(50),
    );
    const snapshot = await getDocs(profilesQuery);

    return snapshot.docs
      .filter((profileDoc) => profileDoc.id !== userId)
      .map((profileDoc) => {
        const candidateProfile = normalizeUserProfile(
          profileDoc.data() as Partial<UserProfile>,
          profileDoc.id,
        );

        return {
          id: profileDoc.id,
          profile: candidateProfile,
          score: compareProfilesByPreferences(currentProfile, candidateProfile),
        };
      })
      .sort((left, right) => right.score - left.score);
  };

  const loadDiscoveryFeed = async (currentUserEntry: User, currentProfile: UserProfile) => {
    if (!db) {
      setDiscoveryFeed(buildSampleDiscoveryFeed(currentProfile));
      setDiscoveryFeedSource('sample');
      //for firebase accounts info
      // setDiscoveryDebug('DEBUG discovery: Firestore not configured; showing sample profiles only.');
      setSwipeIndex(0);
      return;
    }

    const discoveryQuery = query(
      collection(db, 'users'),
      limit(100),
    );

    const snapshot = await getDocs(discoveryQuery);
    const currentLikedUsers = new Set(currentProfile.likedUsers);
    const currentPassedUsers = new Set(currentProfile.passedUsers);
    const currentBlockedUsers = new Set(currentProfile.blockedUsers || []);

    const baseRemoteCandidates = snapshot.docs
      .map((profileDoc) => normalizeUserProfile(profileDoc.data() as Partial<UserProfile>, profileDoc.id))
      .filter((candidateProfile) => candidateProfile.uid !== currentUserEntry.uid)
      .filter((candidateProfile) => !currentLikedUsers.has(candidateProfile.uid))
      .filter((candidateProfile) => !currentPassedUsers.has(candidateProfile.uid))
      .filter((candidateProfile) => !candidateProfile.blockedUsers.includes(currentUserEntry.uid))
      .filter((candidateProfile) => !currentBlockedUsers.has(candidateProfile.uid));

    const remoteCandidates = baseRemoteCandidates
      .map((candidateProfile) => ({
        candidateProfile,
        score: compareProfilesByPreferences(currentProfile, candidateProfile),
      }))
      .sort((left, right) => right.score - left.score)
      .map(({ candidateProfile, score }) => ({
        ...profileToDater(candidateProfile),
        compatibility: score,
      }));

    const sampleCandidates = buildSampleDiscoveryFeed(currentProfile)
      .filter((sampleCandidate) => !remoteCandidates.some((remoteCandidate) => remoteCandidate.id === sampleCandidate.id));

    //for firebase accounts info
    // setDiscoveryDebug(
    //   `DEBUG discovery: firestoreDocs=${snapshot.docs.length} eligibleFirebase=${baseRemoteCandidates.length} firebaseShown=${remoteCandidates.length} sampleAppended=${sampleCandidates.length} totalFeed=${remoteCandidates.length + sampleCandidates.length}`,
    // );

    if (remoteCandidates.length) {
      setDiscoveryFeed([...remoteCandidates, ...sampleCandidates]);
      setDiscoveryFeedSource('firestore');
      setSwipeIndex(0);
      return;
    }

    setDiscoveryFeed(buildSampleDiscoveryFeed(currentProfile));
    setDiscoveryFeedSource('sample');
    //for firebase accounts info
    // setDiscoveryDebug(
    //   `DEBUG discovery: firestoreDocs=${snapshot.docs.length} eligibleFirebase=${baseRemoteCandidates.length} firebaseShown=0; using sample fallback`,
    // );
    setSwipeIndex(0);
  };

  const loadMatchedDaters = async () => {
    if (!db || !profile?.matches.length) {
      setMatchedDaters([]);
      return;
    }

    const firestore = db;

    const matchDocs = await Promise.all(
      profile.matches.map(async (matchId) => {
        const matchDoc = await getDoc(doc(firestore, 'users', matchId));

        if (!matchDoc.exists()) {
          return null;
        }

        return profileToDater(normalizeUserProfile(matchDoc.data() as Partial<UserProfile>, matchId));
      }),
    );

    setMatchedDaters(matchDocs.filter((match): match is Dater => Boolean(match)));
  };

  const loadLikedDaters = async (currentProfile: UserProfile) => {
    if (!currentProfile.likedUsers.length) {
      setLikedDaters([]);
      return;
    }

    const sampleProfileMap = new Map(
      sampleDiscoveryProfiles.map((sampleProfile) => [
        sampleProfile.uid,
        normalizeUserProfile(sampleProfile, sampleProfile.uid),
      ]),
    );

    const likedCards = await Promise.all(
      currentProfile.likedUsers.map(async (likedUserId) => {
        if (db) {
          try {
            const likedUserDoc = await getDoc(doc(db, 'users', likedUserId));

            if (likedUserDoc.exists()) {
              const likedProfile = normalizeUserProfile(
                likedUserDoc.data() as Partial<UserProfile>,
                likedUserId,
              );
              return {
                ...profileToDater(likedProfile),
                compatibility: compareProfilesByPreferences(currentProfile, likedProfile),
              };
            }
          } catch {
            // Fall back to local sample profile map when Firestore fetch fails.
          }
        }

        const sampleFallback = sampleProfileMap.get(likedUserId);

        if (sampleFallback) {
          return {
            ...profileToDater(sampleFallback),
            compatibility: compareProfilesByPreferences(currentProfile, sampleFallback),
          };
        }

        return null;
      }),
    );

    setLikedDaters(likedCards.filter((card): card is Dater => Boolean(card)));
  };

  const handleSignOut = async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
    setProfile(null);
    setScreen('intro');
    setStatus('Signed out.');
    setLikedDaters([]);
    setMatchesModalOpen(false);
    setMatchedDaters([]);
  };

  const sendPlannerMessage = async (rawPrompt: string) => {
    const trimmedPrompt = rawPrompt.trim();

    if (!trimmedPrompt || plannerLoading) {
      return;
    }

    const nextMessages = [...plannerMessages, { role: 'user' as const, text: trimmedPrompt }];
    setPlannerMessages(nextMessages);
    setPlannerInput('');
    setPlannerError('');
    setPlannerLoading(true);

    try {
      const reply = await generatePlannerReply(nextMessages, profile || undefined);
      setPlannerMessages((current) => [...current, { role: 'assistant', text: reply }]);
    } catch (plannerRequestError) {
      setPlannerError(
        plannerRequestError instanceof Error
          ? plannerRequestError.message
          : 'The planner could not respond right now.',
      );
    } finally {
      setPlannerLoading(false);
    }
  };

  const handlePlannerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendPlannerMessage(plannerInput);
  };

  const handlePlannerPromptClick = async (prompt: string) => {
    setPlannerInput(prompt);
    await sendPlannerMessage(prompt);
  };

  const handleSendChatMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!db || !currentUser || !selectedChatId || !chatInput.trim()) {
      return;
    }

    const text = chatInput.trim();
    const selectedConversation = chatConversations.find(
      (conversation) => conversation.chatId === selectedChatId,
    );

    setChatInput('');
    setChatError('');

    try {
      await addDoc(collection(db, 'chats', selectedChatId, 'messages'), {
        senderId: currentUser.uid,
        text,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, 'chats', selectedChatId),
        {
          participants: [currentUser.uid, selectedConversation?.matchId].filter(Boolean),
          lastMessage: text,
          lastMessageAt: serverTimestamp(),
        },
        { merge: true },
      );

      setChatConversations((current) =>
        current.map((conversation) =>
          conversation.chatId === selectedChatId
            ? { ...conversation, preview: text }
            : conversation,
        ),
      );
    } catch {
      setChatInput(text);
      setChatError('Unable to send your message right now.');
    }
  };

  const renderFrame = (content: ReactNode) => (
    <main className="app-shell">
      <section className="phone-shell">
        <div className="phone-content">
          {!isFirebaseConfigured ? (
            <div className="notice warning">
              Firebase is not configured yet. Add your keys to
              <code> gator-dater-app/.env </code>
              first.
            </div>
          ) : null}
          {content}
          {/* {status ? <p className="status-text">{status}</p> : null} */}
          {/* {error ? <p className="error-text">{error}</p> : null} */}
        </div>
      </section>
    </main>
  );

  if (screen === 'intro') {
    return renderFrame(
      <div className="screen intro-screen" style={{ position: 'relative' }}>
        <div className="intro-copy" style={{ zIndex: 10 }}>
          <h1 className="script-title">GatorDator</h1>
          <h3>Form genuine connections in a comfortable, campus-friendly environment</h3>
        </div>

        <div className="gator-layer">
          <img src={gatorImg} className="gator-1" alt="Gator Top" />
          <img src={heartImg} className="gator-heart" alt="Heart" />
          <img src={gatorImg} className="gator-2" alt="Gator Bottom" />
        </div>

        <div className="button-stack" style={{ zIndex: 10 }}>
          <button className="primary-button" onClick={() => setScreen('signup-email')}>
            Get Started
          </button>
          <button className="secondary-button" onClick={() => setScreen('signin')}>
            Sign In
          </button>
        </div>
      </div>,
    );
  }

  const renderTabContent = () => {
    if (activeTab === 'calendar') {
      return (
        <>
          <section className="calendar">
            <h2>Calendar</h2>
            <div className="calendar-grid">
            </div>
          </section>

          <section className="home-grid">
            <article className="home-tile">
              <h3>Pascal's Coffeehouse - Friday</h3>
              <p>7:00 PM with Maya. Saved as a casual first date near campus.</p>
            </article>
          </section>
        </>
      );
    }

    if (activeTab === 'planner') {
      const plannerPrompts = buildPlannerPrompts(profile);

      return (
        <>
          <p className="account-detail">Describe the kind of date you want and get Gainesville-friendly suggestions.</p>
          {!isGeminiConfigured ? (
            <p className="planner-helper-text">
              Add <code>VITE_GEMINI_API_KEY</code> to <code>gator-dater-app/.env</code> to enable the chatbot.
            </p>
          ) : null}

          <section className="prompt-grid">
            {plannerPrompts.map((prompt) => (
              <button
                key={prompt.id}
                className="prompt-button"
                type="button"
                onClick={() => void handlePlannerPromptClick(prompt.prompt)}
                disabled={plannerLoading}
              >
                <p>{prompt.label}</p>
                <img src={searchImg} alt="Search" className="Search" />
              </button>
            ))}
          </section>

          <section className="chat">
            <div className="chat-section planner-chat-section" ref={plannerChatRef}>
              {plannerMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={message.role === 'assistant' ? 'message-from-other' : 'message-from-user'}
                >
                  <p>{message.text}</p>
                </div>
              ))}
              {plannerLoading ? (
                <div className="message-from-other planner-typing">
                  <p>Thinking through a few ideas...</p>
                </div>
              ) : null}
            </div>
            {plannerError ? <p className="planner-error-text">{plannerError}</p> : null}
            <form className="chat-input" onSubmit={handlePlannerSubmit}>
              <input
                type="text"
                placeholder="Ask for date ideas..."
                value={plannerInput}
                onChange={(event) => setPlannerInput(event.target.value)}
                disabled={!isGeminiConfigured || plannerLoading}
              />
              <button
                className="submit-button"
                type="submit"
                disabled={!isGeminiConfigured || plannerLoading || !plannerInput.trim()}
              >
                <img src={submitImg} alt="Send" className="send-icon" />
              </button>
            </form>
          </section>
        </>
      );
    }

    if (activeTab === 'chats') {
      const selectedConversation = chatConversations.find(
        (conversation) => conversation.chatId === selectedChatId,
      );

      return (
        <>
          <p className="account-detail">Chat with your mutual matches here.</p>
          {chatError ? <p className="planner-error-text">{chatError}</p> : null}
          {!profile?.matches.length ? (
            <section className="home-grid">
              <article className="home-tile">
                <h3>No chats yet</h3>
                <p>When two users like each other, their conversation will appear here.</p>
              </article>
            </section>
          ) : (
            <>
              <section className="home-grid chat-list">
                {chatConversations.map((conversation) => (
                  <button
                    key={conversation.chatId}
                    className={
                      selectedChatId === conversation.chatId
                        ? 'chat-match-row unread chat-match-button selected-chat'
                        : conversation.unread
                          ? 'chat-match-row unread chat-match-button'
                          : 'chat-match-row chat-match-button'
                    }
                    type="button"
                    onClick={() => setSelectedChatId(conversation.chatId)}
                  >
                    {conversation.matchPhotoUrl ? (
                      <img
                        src={conversation.matchPhotoUrl}
                        alt={conversation.matchName}
                        className="profile-circle-mini profile-circle-mini-image"
                      />
                    ) : (
                      <div className="profile-circle-mini" />
                    )}
                    <div className="chat-text-meta">
                      <h3 className="chat-name">{conversation.matchName}</h3>
                      <p className="chat-preview">{conversation.preview}</p>
                    </div>
                  </button>
                ))}
              </section>

              <section className="chat user-chat-panel">
                <div className="chat-panel-header">
                  <h3>{selectedConversation?.matchName || 'Select a match'}</h3>
                  <p>{selectedConversation ? 'Start the conversation.' : 'Choose a match above.'}</p>
                </div>
                <div className="chat-section planner-chat-section" ref={userChatRef}>
                  {chatMessages.length ? (
                    chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={
                          message.senderId === currentUser?.uid ? 'message-from-user' : 'message-from-other'
                        }
                      >
                        <p>{message.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="message-from-other">
                      <p>Say hi and start planning something fun together.</p>
                    </div>
                  )}
                </div>
                <form className="chat-input" onSubmit={handleSendChatMessage}>
                  <input
                    type="text"
                    placeholder={selectedConversation ? `Message ${selectedConversation.matchName}...` : 'Select a chat first'}
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    disabled={!selectedConversation || chatLoading}
                  />
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={!selectedConversation || chatLoading || !chatInput.trim()}
                  >
                    <img src={submitImg} alt="Send" className="send-icon" />
                  </button>
                </form>
              </section>
            </>
          )}
        </>
      );
    }

    if (activeTab === 'profile-tab') {
      return (
        <>
          <section className="intro-profile-panel">
            {profile?.photoUrl || currentUser?.photoURL ? (
              <div className="profile-photo-wrap">
                <img
                  src={profile?.photoUrl || currentUser?.photoURL || ''}
                  alt={`${profile?.fullName || currentUser?.displayName || 'User'} profile`}
                  className="profile-photo"
                />
              </div>
            ) : null}
            <h1>{profile?.fullName || currentUser?.displayName || currentUser?.email}</h1>
            <p className="account-detail">{currentUser?.email}</p>
            <input
              ref={profilePhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden-input"
              onChange={handleProfilePhotoUpdate}
            />
            <button
              className="secondary-button tile-button"
              type="button"
              onClick={() => profilePhotoInputRef.current?.click()}
            >
              Edit Profile Photo
            </button>
          </section>
          <section className="home-grid">
            <article className="profile-tile">
              <h3 style={{ textDecoration: 'underline' }}>About Me</h3>
              <p>{profile?.yearAtUf || 'UF Student'}</p>
              <p>{profile?.age ? `${profile.age} years old` : '*Add more details to make matching better.*'}</p>
              <p>{profile?.bio || '*Add a bio so people can get to know you.*'}</p>
              <p>Intent: {profile?.intention || 'Open'}</p>
              <h3 style={{ textDecoration: 'underline' }}>My Preferences</h3>
              <p>Show me: {profile?.genderPreference || 'Any'}</p>
              <p>Open to: {profile?.intentionOpenTo || 'Open to anything'}</p>
              <p>Age range: {profile?.ageRange?.min || 18}-{profile?.ageRange?.max || 25}</p>
              <p>Interests: {profile?.interests.length ? profile.interests.join(', ') : '*Add interests*'}</p>
              <p>Date vibe: {profile?.dateVibe.length ? profile.dateVibe.join(', ') : '*Set your date vibe*'}</p>
              <button
                className="secondary-button tile-button"
                type="button"
                onClick={handleOpenPreferences}
              >
                Edit Preferences
              </button>
            </article>

            <article className="profile-tile">
              <h3 style={{ textDecoration: 'underline' }}>Account controls</h3>
              <p>Review your saved likes or sign out below when you are done.</p>
              <button
                className="primary-button tile-button"
                onClick={() => setLikesModalOpen(true)}
                type="button"
              >
                View Likes ({likedDaters.length})
              </button>
              <button
                className="primary-button tile-button"
                onClick={async () => {
                  setMatchesModalOpen(true);
                  await loadMatchedDaters();
                }}
                type="button"
              >
                View Matches ({profile?.matches.length || 0})
              </button>
              <button className="secondary-button tile-button" onClick={handleSignOut} type="button">
                Sign Out
              </button>
            </article>
          </section>
        </>
      );
    }

    return (
      <>
        <section className="swipe-stack">
          {currentDater ? (
            <article className="swipe-card" /*style={{ backgroundImage: `url(${currentDater.image})` }} */>
              <p>{currentDater.compatibility}% match</p>
              <h2>
                {currentDater.name}, {currentDater.age}
              </h2>
              <p>{currentDater.yearAtUf}</p>
              <p className="swipe-vibe">{currentDater.vibe}</p>
              <p>{currentDater.bio}</p>
            </article>
          ) : (
            <article className="swipe-card done-card">
              <p className="account-label">All caught up</p>
              <h3>No more sample daters</h3>
              <p>Open your likes from Profile or come back later for more people.</p>
            </article>
          )}
        </section>
        <div className="swipe-actions">
          <button className="Ellipse1 action-btn" type="button" onClick={handlePass} disabled={!currentDater}>
            <img className="action-btn-icon" src={dislikeImg} alt="Dislike" />
          </button>
          <button className="Ellipse2 action-btn" type="button" onClick={handleLike} disabled={!currentDater}>
            <img className="action-btn-icon" src={likeImg} alt="Like" />
          </button>
        </div>
        {/* //for firebase accounts info */}
        {/* {discoveryDebug ? <p className="account-detail">{discoveryDebug}</p> : null} */}
      </>
    );
  };

  const firestoreLabel =
    firestoreHealth === 'connected'
      ? 'Firestore connected'
      : firestoreHealth === 'fallback'
        ? 'Local fallback'
        : 'Firestore unknown';
  const currentDater = discoveryFeed[swipeIndex] || null;

  const handleLike = async () => {
    if (!currentDater) {
      return;
    }

    const nextLikedUserIds = profile?.likedUsers.includes(currentDater.id)
      ? profile.likedUsers
      : [...(profile?.likedUsers || []), currentDater.id];

    if (currentUser && profile) {
      const currentUserRef = db ? doc(db, 'users', currentUser.uid) : null;
      const nextProfile = { ...profile, likedUsers: nextLikedUserIds };
      setProfile(nextProfile);
      saveLocalProfile(currentUser.uid, nextProfile);

      if (db && discoveryFeedSource === 'firestore') {
        try {
          const likedUserRef = doc(db, 'users', currentDater.id);
          const likedUserSnap = await getDoc(likedUserRef);
          const likedUserProfile = likedUserSnap.exists()
            ? normalizeUserProfile(likedUserSnap.data() as Partial<UserProfile>, currentDater.id)
            : null;
          const matchedBack = !!likedUserProfile?.likedUsers.includes(currentUser.uid);

          const nextMatches = matchedBack
            ? Array.from(new Set([...(profile.matches || []), currentDater.id]))
            : profile.matches || [];
          const nextLikedUserMatches = matchedBack && likedUserProfile
            ? Array.from(new Set([...(likedUserProfile.matches || []), currentUser.uid]))
            : likedUserProfile?.matches || [];

          if (currentUserRef) {
            await setDoc(
              currentUserRef,
              { likedUsers: nextLikedUserIds, matches: nextMatches },
              { merge: true },
            );
          }

          if (matchedBack) {
            await setDoc(
              likedUserRef,
              { matches: nextLikedUserMatches },
              { merge: true },
            );

            const matchedProfile = { ...nextProfile, matches: nextMatches };
            setProfile(matchedProfile);
            saveLocalProfile(currentUser.uid, matchedProfile);
            // Future Gemini integration: use both users' shared interests/dateVibe
            // to generate a date plan once matching chat/planner is connected.
            setStatus('It\'s a match!');
          }
        } catch {
          if (currentUserRef) {
            await setDoc(currentUserRef, { likedUsers: nextLikedUserIds }, { merge: true });
          }
        }
      } else if (db) {
        if (currentUserRef) {
          await setDoc(currentUserRef, { likedUsers: nextLikedUserIds }, { merge: true });
        }
      }
    }

    setLikedDaters((current) =>
      current.some((dater) => dater.id === currentDater.id)
        ? current
        : [...current, currentDater],
    );
    setSwipeIndex((current) => current + 1);
  };

  const handlePass = async () => {
    if (!currentDater) {
      return;
    }

    const nextPassedUserIds = profile?.passedUsers.includes(currentDater.id)
      ? profile.passedUsers
      : [...(profile?.passedUsers || []), currentDater.id];

    if (currentUser && profile) {
      const nextProfile = {
        ...profile,
        passedUsers: nextPassedUserIds,
      };
      setProfile(nextProfile);
      saveLocalProfile(currentUser.uid, nextProfile);

      if (db) {
        const currentUserRef = doc(db, 'users', currentUser.uid);
        await setDoc(
          currentUserRef,
          { passedUsers: nextPassedUserIds },
          { merge: true },
        );
      }
    }

    setSwipeIndex((current) => current + 1);
  };

  const handleUnlike = (daterId: string) => {
    setLikedDaters((current) => current.filter((dater) => dater.id !== daterId));

    if (!currentUser || !profile) {
      return;
    }

    const nextLikedUsers = profile.likedUsers.filter((likedUserId) => likedUserId !== daterId);
    const nextProfile = { ...profile, likedUsers: nextLikedUsers };

    setProfile(nextProfile);
    saveLocalProfile(currentUser.uid, nextProfile);

    if (db) {
      void setDoc(
        doc(db, 'users', currentUser.uid),
        { likedUsers: nextLikedUsers },
        { merge: true },
      ).catch(() => {
        setFirestoreHealth('fallback');
      });
    }
  };

  if (screen === 'signup-email') {
    return renderFrame(
      <div className="screen info-screen">
        <button className="back-button" onClick={handleBack} type="button">
          <img src={backArrrow} alt="Back Arrow" />
        </button>

        <div className="form-copy">
          <h1 className="script-title">Sign Up</h1>
          <h3>Start making more connections.</h3>
        </div>

        <form className="auth-form" onSubmit={handleCreateEmailStep}>
          <label>
            Email
            <input
              type="email"
              value={signUp.email}
              onChange={(event) => setSignUp((current) => ({ ...current, email: event.target.value }))}
              placeholder="name@ufl.edu"
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Working...' : 'Continue'}
          </button>
        </form>
        <div className="gator-art gator-bottom" />
      </div>,
    );
  }

  if (screen === 'signup-password') {
    return renderFrame(
      <div className="screen info-screen">
        <button className="back-button" onClick={handleBack} type="button">
          <img src={backArrrow} alt="Back Arrow" />
        </button>

        <div className="form-copy">
          <h1 className="script-title">Create your Password</h1>
        </div>

        <form className="auth-form" onSubmit={handleCreateAccount}>
          <label>
            Password
            <input
              type="password"
              value={signUp.password}
              onChange={(event) =>
                setSignUp((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Password"
              minLength={6}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Working...' : 'Continue'}
          </button>
        </form>
      </div>,
    );
  }

  if (screen === 'signup-verification') {
    return renderFrame(
      <div className="screen info-screen">
        <button className="back-button" onClick={handleBack} type="button">
          <img src={backArrrow} alt="Back Arrow" />
        </button>
        <div className="form-copy">
          <h1 className="script-title">Verification</h1>
          <h3>
            A code has been sent to your UFL email:
            {verificationEmail ? ` ${verificationEmail}` : ''}
          </h3>
        </div>
        <button className="primary-button" type="button" onClick={() => setScreen('signin')}>
          Continue
        </button>
        <button className="link-button" type="button" onClick={handleResendVerification}>
          Resend Code
        </button>
      </div>,
    );
  }

  if (screen === 'signin') {
    return renderFrame(
      <div className="screen info-screen">
        <button className="back-button" onClick={handleBack} type="button">
          <img src={backArrrow} alt="Back Arrow" />
        </button>
        <div className="form-copy">
          <h1 className="script-title">Hello Again!</h1>
          <h3>Keep making more connections.</h3>
        </div>
        <form className="auth-form" onSubmit={handleSignIn}>
          <label>
            Email
            <input
              type="email"
              value={signIn.email}
              onChange={(event) => setSignIn((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={signIn.password}
              onChange={(event) =>
                setSignIn((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Password"
              minLength={6}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Working...' : 'Sign In'}
          </button>
        </form>
        <div className="inline-links">
          <button className="link-button" type="button" onClick={handleResendVerification}>
            Resend verification
          </button>
          <button className="link-button" type="button" onClick={() => setScreen('signup-email')}>
            Sign Up
          </button>
        </div>
        <div className="gator-art gator-bottom" />
      </div>,
    );
  }

  if (screen === 'profile') {
    return renderFrame(
      <div className="screen info-screen">
        <button className="back-button" onClick={handleBack} type="button">
          <img src={backArrrow} alt="Back Arrow" />
        </button>
        <div className="form-copy">
          <h1 className="script-title">So tell me about yourself</h1>
        </div>
        <form className="auth-form" onSubmit={handleProfileSubmit}>
          <label className="photo-upload-label">
            Profile Photo
            <div className="file-input-wrapper">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden-file-input"
                ref={profilePhotoInputRef}
              />
              <div className="custom-file-button">
                {profileForm.photoUrl ? 'Change Photo' : 'Choose Photo'}
              </div>
            </div>
          </label>
          {profileForm.photoUrl ? (
            <div className="profile-photo-wrap">
              <img
                src={profileForm.photoUrl}
                alt="Profile preview"
                className="profile-photo"
              />
            </div>
          ) : null}
          <label>
            What's your name?
            <input
              type="text"
              value={profileForm.firstName}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, firstName: event.target.value }))
              }
              placeholder="First Name"
              required
            />
          </label>
          <input
            type="text"
            value={profileForm.lastName}
            onChange={(event) =>
              setProfileForm((current) => ({ ...current, lastName: event.target.value }))
            }
            placeholder="Last Name"
            required
          />
          <label>
            What's your age?
            <input
              type="number"
              min="18"
              max="99"
              value={profileForm.age}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, age: event.target.value }))
              }
              placeholder="Age"
              required
            />
          </label>
          <label>
            Year at UF
            <select
              value={profileForm.yearAtUf}
              onChange={(e) => setProfileForm({ ...profileForm, yearAtUf: e.target.value })}
              required
            >
              <option value="" disabled>Select your year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bio
            {/* Keep this textarea as the place where users type and edit their bio. */}
            <textarea
              value={profileForm.bio}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, bio: event.target.value }))
              }
              placeholder="Tell people a little about yourself"
              rows={3}
              maxLength={220}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>,
    );
  }

  if (screen === 'preferences') {
    return renderFrame(
      <div className="screen info-screen preferences-screen">
        <button className="back-button" onClick={handleBack} type="button">
          <img src={backArrrow} alt="Back Arrow" />
        </button>
        <div className="form-copy">
          <h1 className="script-title">Preferences</h1>
          <h3>All about you and your ideal match</h3>
        </div>
        <div className="inline-buttons">
          <button
            /* This evaluates to true on load, applying the 'selected' class */
            className={`primary-button ${preferencesSection === 'preferences' ? 'selected' : ''}`}
            type="button"
            onClick={() => setPreferencesSection('preferences')}
          >
            Your Info
          </button>
          <button
            className={`secondary-button ${preferencesSection === 'deal-breakers' ? 'selected' : ''}`}
            type="button"
            onClick={() => setPreferencesSection('deal-breakers')}
          >
            Matching Preferences
          </button>
        </div>
        <form className="auth-form" onSubmit={handlePreferencesSave}>
          {preferencesSection === 'preferences' ? (
            <>
              <label>
                Dating Intention
                <select
                  className="preferences-select"
                  value={profileForm.intention}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, intention: event.target.value }))
                  }
                >
                  {datingIntentionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Gender Identity
                <select
                  className="preferences-select"
                  value={profileForm.genderIdentity}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, genderIdentity: event.target.value }))
                  }
                >
                  <option value="">Select gender identity</option>
                  {genderIdentityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <label style={{ display: 'block', textAlign: 'left' }}>Bio</label>
                <textarea
                  className="bio-textarea"
                  value={profileForm.bio}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, bio: event.target.value }))
                  }
                  placeholder="Tell people about yourself"
                  rows={5}
                  maxLength={220}
                />
              </div>
              <div>
                <label>Describe yourself (Pick up to 3)</label>
                <div className="hobbies-scroll-list">
                  {vibeWordOptions.map((word) => (
                    <label key={word} className="hobby-option-row">
                      <input
                        type="checkbox"
                        checked={profileForm.vibeWords.includes(word)}
                        onChange={() =>
                          setProfileForm((current) => ({
                            ...current,
                            vibeWords: current.vibeWords.includes(word)
                              ? current.vibeWords.filter((currentWord) => currentWord !== word)
                              : current.vibeWords.length >= 3
                                ? current.vibeWords
                                : [...current.vibeWords, word],
                          }))
                        }
                      />
                      <span className="hobby-option-text">{word}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label>
                Social Energy: {profileForm.socialEnergy}
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="social-range"
                  value={profileForm.socialEnergy}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      socialEnergy: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Budget
                <select
                  className="preferences-select"
                  value={profileForm.dateBudget}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, dateBudget: event.target.value }))
                  }
                >
                  {dateBudgetOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <label>Date vibe (pick one or more)</label>
                <div className="hobbies-scroll-list">
                  {dateVibeOptions.map((vibe) => (
                    <label key={vibe} className="hobby-option-row">
                      <input
                        type="checkbox"
                        checked={profileForm.dateVibe.includes(vibe)}
                        onChange={() =>
                          setProfileForm((current) => ({
                            ...current,
                            dateVibe: current.dateVibe.includes(vibe)
                              ? current.dateVibe.filter((currentVibe) => currentVibe !== vibe)
                              : [...current.dateVibe, vibe],
                          }))
                        }
                      />
                      <span className="hobby-option-text">{vibe}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label>
                Distance
                <select
                  className="preferences-select"
                  value={profileForm.distance}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, distance: event.target.value }))
                  }
                >
                  {distanceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Availability
                <select
                  className="preferences-select"
                  value={profileForm.availability[0] || 'either'}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, availability: [event.target.value] }))
                  }
                >
                  {availabilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <label>Interests (pick up to 10)</label>
                <div className="hobbies-scroll-list">
                  {interestOptions.map((interest) => (
                    <label key={interest} className="hobby-option-row">
                      <input
                        type="checkbox"
                        checked={profileForm.interests.includes(interest)}
                        onChange={() =>
                          setProfileForm((current) => ({
                            ...current,
                            interests: current.interests.includes(interest)
                              ? current.interests.filter((currentInterest) => currentInterest !== interest)
                              : current.interests.length >= 10
                                ? current.interests
                                : [...current.interests, interest],
                          }))
                        }
                      />
                      <span className="hobby-option-text">{interest}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <label>
                I Want to Meet
                <select
                  className="preferences-select"
                  value={profileForm.genderPreference}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, genderPreference: event.target.value }))
                  }
                >
                  {genderPreferenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                I'm Looking For
                <select
                  className="preferences-select"
                  value={profileForm.intentionOpenTo}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, intentionOpenTo: event.target.value }))
                  }
                >
                  {datingIntentionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Age Range I'm Open To: Minimum
                <select
                  className="preferences-select"
                  value={profileForm.ageRangeMin}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, ageRangeMin: event.target.value }))
                  }
                >
                  {Array.from({ length: 23 }, (_, index) => 18 + index).map((ageOption) => (
                    <option key={ageOption} value={String(ageOption)}>
                      {ageOption}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Age Range I'm Open To: Maximum
                <select
                  className="preferences-select"
                  value={profileForm.ageRangeMax}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, ageRangeMax: event.target.value }))
                  }
                >
                  {Array.from({ length: 23 }, (_, index) => 18 + index).map((ageOption) => (
                    <option key={ageOption} value={String(ageOption)}>
                      {ageOption}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      </div>,
    );
  }

  if (screen === 'all-set') {
    return renderFrame(
      <div className="screen info-screen">
        <img src={youreAllSetImg} alt="You're All Set!" />
        <img src={gatorImg} className="gator-set" alt="Gator" />
        <div style={{ height: '15cqh' }} />
        <button className="primary-button" type="button" onClick={handleContinueFromAllSet}>
          Continue
        </button>
      </div>,
    );
  }

  return renderFrame(
    <div className="screen home-screen">
      <div className="home-header">
        <p className="eyebrow">Gator Dator</p>
        <hr></hr>
        {/* <div className="header-badges">
          <div className={firestoreHealth === 'connected' ? 'health-pill healthy' : firestoreHealth === 'fallback' ? 'health-pill warning-pill' : 'health-pill'}>
            {firestoreLabel}
          </div>
          <div className="tab-indicator">{activeTab}</div>
        </div> */}
      </div>
      {likesModalOpen ? (
        <div className="likes-modal">
          <div className="likes-modal-card">
            <div className="likes-modal-header">
              <h2>Saved matches</h2>
              <button className="link-button" type="button" onClick={() => setLikesModalOpen(false)}>
                Close
              </button>
            </div>
            {likedDaters.length ? (
              <div className="likes-list">
                {likedDaters.map((dater) => (
                  <article key={dater.id} className="liked-card">
                    <p className="account-label">{dater.compatibility}% match</p>
                    <h3>
                      {dater.name}, {dater.age}
                    </h3>
                    <p>{dater.yearAtUf}</p>
                    <p>{dater.vibe}</p>
                    <button className="secondary-button unlike-button" type="button" onClick={() => handleUnlike(dater.id)}>
                      Unlike
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="account-detail">No likes yet. Use the Swipe tab to save a few people here.</p>
            )}
          </div>
        </div>
      ) : null}
      {matchesModalOpen ? (
        <div className="likes-modal">
          <div className="likes-modal-card">
            <div className="likes-modal-header">
              <h2>Mutual connections</h2>
              <button className="link-button" type="button" onClick={() => setMatchesModalOpen(false)}>
                Close
              </button>
            </div>
            {matchedDaters.length ? (
              <div className="likes-list">
                {matchedDaters.map((dater) => (
                  <article key={dater.id} className="liked-card">
                    <p className="account-label">{dater.compatibility}% match</p>
                    <h3>
                      {dater.name}, {dater.age}
                    </h3>
                    <p>{dater.yearAtUf}</p>
                    <p>{dater.bio}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="account-detail">No matches yet. Mutual likes will show up here.</p>
            )}
          </div>
        </div>
      ) : null}
      {renderTabContent()}

      <nav className="tab-bar">
        {/* Background Rect */}
        <div className="nav-bg" />

        {/* Moving Circle - Positions itself based on activeTab */}
        <div className={`active-indicator pos-${activeTab}`} />

        <div className="icons-wrapper">
          <div className="icons-wrapper-extra">
            <button
              className={activeTab === 'calendar' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab('calendar')}
            >
              <span className="tab-icon">
                <img src={calenderImg} alt="Calendar" />
              </span>
            </button>
            <button
              className={activeTab === 'planner' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab('planner')}
            >
              <span className="tab-icon">
                <img src={writeImg} alt="Write" />
              </span>
            </button>
          </div>
          <button
            className={activeTab === 'swipe' ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab('swipe')}
          >
            <span className="tab-icon">
              <img src={heartNavImg} alt="Like" />
            </span>
          </button>
          <div className="icons-wrapper-extra">
            <button
              className={activeTab === 'chats' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab('chats')}
            >
              <span className="tab-icon">
                <img src={chatImg} alt="Chats" />
              </span>
            </button>
            <button
              className={activeTab === 'profile-tab' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab('profile-tab')}
            >
              <span className="tab-icon">
                <img src={userImg} alt="Profile" />
              </span>
            </button>
          </div>
        </div>
      </nav>

    </div>,
  );
}
