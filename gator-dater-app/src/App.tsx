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
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import gatorImage from '../assets/gatorDatorLogo.png';
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
import {
  generatePlannerReply,
  isGeminiConfigured,
  type PlannerChatMessage,
  type PlannerDateOption,
} from './gemini';
import './index.css';
//calendar stuff
import 'react-calendar/dist/Calendar.css';
import Calendar from 'react-calendar';

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
  interests: string[];
  dateBudget: string;
  dateVibe: string[];
  availability: string[];
  photoUrl: string;
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
  senderName: string;
  text: string;
  sentAt: number;
  status?: 'pending' | 'sent' | 'failed';
};

type PlannerPrompt = {
  id: string;
  label: string;
  prompt: string;
};

type CalendarPlan = {
  id: string;
  title: string;
  place: string;
  description: string;
  matchId: string;
  matchName: string;
  date: string;
};

type CalendarInvite = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  title: string;
  place: string;
  description: string;
  date: string;
  createdAt: number;
};

type CalendarInviteRemoval = {
  id: string;
  fromUserId: string;
  toUserId: string;
  planId: string;
  createdAt: number;
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
  birthDate: string;
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
  birthDate: string;
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
  conversations?: Record<string, string>;
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
  birthDate: '',
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

// const sampleDiscoveryProfiles: Array<Partial<UserProfile> & { uid: string }> = [
//   {
//     uid: 'sample-leah',
//     firstName: 'Leah',
//     lastName: 'Sample',
//     fullName: 'Leah Sample',
//     age: 21,
//     yearAtUf: 'Junior',
//     bio: 'Quiet reader who loves coffee shop hangs and movie nights.',
//     gender: 'woman',
//     intention: 'dating',
//     interests: ['Reading', 'Coffee shops', 'Photography', 'Film'],
//     dateVibe: ['Artsy', 'Chill'],
//     dateBudget: 'low',
//     preferences: {
//       intention: 'dating',
//       genderIdentity: 'woman',
//       genderPreference: 'men',
//       intentionOpenTo: 'dating',
//       ageRange: { min: 20, max: 25 },
//       vibeWords: ['Artsy', 'Planner', 'Curious'],
//       socialEnergy: 45,
//       dateBudget: 'low',
//       dateVibe: ['Artsy', 'Chill'],
//       distance: 'near',
//       availability: ['weekends'],
//       interests: ['Reading', 'Coffee shops', 'Photography', 'Film'],
//     },
//   },
//   {
//     uid: 'sample-ethan',
//     firstName: 'Ethan',
//     lastName: 'Sample',
//     fullName: 'Ethan Sample',
//     age: 20,
//     yearAtUf: 'Sophomore',
//     bio: 'Outgoing and social, always down to try a new spot in town.',
//     gender: 'man',
//     intention: 'dating',
//     interests: ['Concerts', 'Thrifting', 'Coffee shops', 'Travel'],
//     dateVibe: ['Foodie', 'Surprise me'],
//     dateBudget: 'mid',
//     preferences: {
//       intention: 'dating',
//       genderIdentity: 'man',
//       genderPreference: 'women',
//       intentionOpenTo: 'either',
//       ageRange: { min: 18, max: 24 },
//       vibeWords: ['Spontaneous', 'Social', 'Foodie'],
//       socialEnergy: 80,
//       dateBudget: 'mid',
//       dateVibe: ['Foodie', 'Surprise me'],
//       distance: 'anywhere',
//       availability: ['either'],
//       interests: ['Concerts', 'Thrifting', 'Coffee shops', 'Travel'],
//     },
//   },
//   {
//     uid: 'sample-jordan',
//     firstName: 'Jordan',
//     lastName: 'Sample',
//     fullName: 'Jordan Sample',
//     age: 22,
//     yearAtUf: 'Senior',
//     bio: 'Gym regular who likes active first dates and football weekends.',
//     gender: 'man',
//     intention: 'either',
//     interests: ['Gym', 'Football games', 'Pickleball', 'Hiking'],
//     dateVibe: ['Active'],
//     dateBudget: 'free',
//     preferences: {
//       intention: 'either',
//       genderIdentity: 'man',
//       genderPreference: 'women',
//       intentionOpenTo: 'either',
//       ageRange: { min: 19, max: 25 },
//       vibeWords: ['Athletic', 'Spontaneous', 'Adventurous'],
//       socialEnergy: 72,
//       dateBudget: 'free',
//       dateVibe: ['Active'],
//       distance: 'near',
//       availability: ['weekdays'],
//       interests: ['Gym', 'Football games', 'Pickleball', 'Hiking'],
//     },
//   },
//   {
//     uid: 'sample-dylan',
//     firstName: 'Dylan',
//     lastName: 'Sample',
//     fullName: 'Dylan Sample',
//     age: 21,
//     yearAtUf: 'Junior',
//     bio: 'Low-key gamer and foodie who likes good playlists and better conversation.',
//     gender: 'man',
//     intention: 'dating',
//     interests: ['Board games', 'Coffee shops', 'Trying new restaurants', 'Music', 'Gaming', 'Travel'],
//     dateVibe: ['Foodie', 'Surprise me', 'Chill'],
//     dateBudget: 'low',
//     preferences: {
//       intention: 'dating',
//       genderIdentity: 'man',
//       genderPreference: 'women',
//       intentionOpenTo: 'either',
//       ageRange: { min: 18, max: 25 },
//       vibeWords: ['Foodie', 'Night owl', 'Curious'],
//       socialEnergy: 30,
//       dateBudget: 'low',
//       dateVibe: ['Foodie', 'Surprise me', 'Chill'],
//       distance: 'anywhere',
//       availability: ['either'],
//       interests: ['Board games', 'Coffee shops', 'Trying new restaurants', 'Music', 'Gaming', 'Travel'],
//     },
//   },
//   {
//     uid: 'sample-noah',
//     firstName: 'Noah',
//     lastName: 'Sample',
//     fullName: 'Noah Sample',
//     age: 21,
//     yearAtUf: 'Junior',
//     bio: 'Creative and thoughtful, happiest with art, film, and chill weekends.',
//     gender: 'man',
//     intention: 'friendship',
//     interests: ['Painting', 'Film', 'Photography', 'Board games'],
//     dateVibe: ['Artsy'],
//     dateBudget: 'low',
//     preferences: {
//       intention: 'friendship',
//       genderIdentity: 'man',
//       genderPreference: 'everyone',
//       intentionOpenTo: 'friendship',
//       ageRange: { min: 20, max: 24 },
//       vibeWords: ['Artsy', 'Homebody', 'Planner'],
//       socialEnergy: 38,
//       dateBudget: 'low',
//       dateVibe: ['Artsy'],
//       distance: 'campus',
//       availability: ['weekends'],
//       interests: ['Painting', 'Film', 'Photography', 'Board games'],
//     },
//   },
//   {
//     uid: 'sample-nina',
//     firstName: 'Nina',
//     lastName: 'Sample',
//     fullName: 'Nina Sample',
//     age: 19,
//     yearAtUf: 'Freshman',
//     bio: 'Friendly and easygoing, into coffee runs, trivia nights, and games.',
//     gender: 'woman',
//     intention: 'either',
//     interests: ['Coffee shops', 'Reading', 'Gaming', 'Trivia nights'],
//     dateVibe: ['Chill', 'Foodie'],
//     dateBudget: 'low',
//     preferences: {
//       intention: 'either',
//       genderIdentity: 'woman',
//       genderPreference: 'everyone',
//       intentionOpenTo: 'either',
//       ageRange: { min: 18, max: 22 },
//       vibeWords: ['Curious', 'Early bird', 'Chill'],
//       socialEnergy: 55,
//       dateBudget: 'low',
//       dateVibe: ['Chill', 'Foodie'],
//       distance: 'campus',
//       availability: ['either'],
//       interests: ['Coffee shops', 'Reading', 'Gaming', 'Trivia nights'],
//     },
//   },
//   {
//     uid: 'sample-liam',
//     firstName: 'Liam',
//     lastName: 'Sample',
//     fullName: 'Liam Sample',
//     age: 23,
//     yearAtUf: 'Graduate',
//     bio: 'Planner with foodie energy who enjoys weekend adventures and live music.',
//     gender: 'man',
//     intention: 'dating',
//     interests: ['Trying new restaurants', 'Travel', 'Music', 'Cooking'],
//     dateVibe: ['Foodie', 'Surprise me'],
//     dateBudget: 'mid',
//     preferences: {
//       intention: 'dating',
//       genderIdentity: 'man',
//       genderPreference: 'women',
//       intentionOpenTo: 'dating',
//       ageRange: { min: 22, max: 28 },
//       vibeWords: ['Foodie', 'Planner', 'Night owl'],
//       socialEnergy: 67,
//       dateBudget: 'mid',
//       dateVibe: ['Foodie', 'Surprise me'],
//       distance: 'anywhere',
//       availability: ['weekends'],
//       interests: ['Trying new restaurants', 'Travel', 'Music', 'Cooking'],
//     },
//   },
// ];

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isUflEmail = (email: string) => normalizeEmail(email).endsWith('@ufl.edu');
const calculateAgeFromBirthDate = (birthDate: string) => {
  if (!birthDate) {
    return 18;
  }

  const birth = new Date(`${birthDate}T12:00:00`);

  if (Number.isNaN(birth.getTime())) {
    return 18;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
};
const getLatestAllowedBirthDate = () => {
  const latest = new Date();
  latest.setFullYear(latest.getFullYear() - 18);
  return formatCalendarDateValue(latest);
};
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
const getProfilePhotoUrl = (profile: Partial<UserProfile> & Record<string, unknown>) => {
  const candidateKeys = [
    profile.photoUrl,
    typeof profile.photoURL === 'string' ? profile.photoURL : '',
    typeof profile.imageUrl === 'string' ? profile.imageUrl : '',
    typeof profile.avatarUrl === 'string' ? profile.avatarUrl : '',
    typeof profile.profilePhotoUrl === 'string' ? profile.profilePhotoUrl : '',
  ];

  return candidateKeys.find((value) => typeof value === 'string' && value.trim()) || '';
};
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
    interests: profileEntry.interests,
    dateBudget: profileEntry.dateBudget,
    dateVibe: profileEntry.dateVibe,
    availability: profileEntry.availability,
    photoUrl: profileEntry.photoUrl || '',
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
    age: rawProfile.birthDate ? calculateAgeFromBirthDate(rawProfile.birthDate) : Number(rawProfile.age) || 18,
    birthDate: rawProfile.birthDate || '',
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
    photoUrl: getProfilePhotoUrl(rawProfile),
    preferences,
    likedUsers: Array.isArray(rawProfile.likedUsers) ? rawProfile.likedUsers : [],
    passedUsers: Array.isArray(rawProfile.passedUsers) ? rawProfile.passedUsers : [],
    matches: Array.isArray(rawProfile.matches) ? rawProfile.matches : [],
    blockedUsers: Array.isArray(rawProfile.blockedUsers) ? rawProfile.blockedUsers : [],
    conversations: rawProfile.conversations && typeof rawProfile.conversations === 'object'
      ? (rawProfile.conversations as Record<string, string>)
      : {},
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
// const buildSampleDiscoveryFeed = (_currentProfile?: UserProfile) => [] as Dater[];
const isOfflineFirestoreError = (value: unknown) =>
  value instanceof Error &&
  (value.message.toLowerCase().includes('client is offline') ||
    value.message.toLowerCase().includes('offline') ||
    value.message.toLowerCase().includes('unavailable'));
const getProfileStorageKey = (uid: string) => `gator-dater-profile:${uid}`;
const buildFirestoreUserProfile = (nextProfile: UserProfile) => ({
  uid: nextProfile.uid,
  firstName: nextProfile.firstName,
  lastName: nextProfile.lastName,
  fullName: nextProfile.fullName,
  name: nextProfile.name,
  age: nextProfile.age,
  birthDate: nextProfile.birthDate,
  yearAtUf: nextProfile.yearAtUf,
  bio: nextProfile.bio,
  email: nextProfile.email,
  photoUrl: nextProfile.photoUrl,
  photoURL: nextProfile.photoUrl,
  preferences: nextProfile.preferences,
  likedUsers: nextProfile.likedUsers,
  passedUsers: nextProfile.passedUsers,
  matches: nextProfile.matches,
  blockedUsers: nextProfile.blockedUsers,
  conversations: nextProfile.conversations || {},
  onboardingCompleted: nextProfile.onboardingCompleted,
  createdAt: nextProfile.createdAt || serverTimestamp(),
  gender: deleteField(),
  genderPreference: deleteField(),
  intentionOpenTo: deleteField(),
  ageRange: deleteField(),
  intention: deleteField(),
  interests: deleteField(),
  dateBudget: deleteField(),
  dateVibe: deleteField(),
  distance: deleteField(),
  availability: deleteField(),
});
const getChatStorageKey = (leftUserId: string, rightUserId: string) =>
  `gator-dater-chat:${[leftUserId, rightUserId].sort().join('__')}`;
const getConversationId = (leftUserId: string, rightUserId: string) => {
  // console.log('uid1 raw:', JSON.stringify(leftUserId));
  // console.log('uid2 raw:', JSON.stringify(rightUserId));
  // console.log('uid1 length:', leftUserId.length);
  // console.log('uid2 length:', rightUserId.length);

  return [leftUserId, rightUserId].sort().join('_');
};
const getConversationParticipantIds = (leftUserId: string, rightUserId: string) =>
  [leftUserId, rightUserId].sort();
const mergeChatMessages = (primary: ChatMessage[], secondary: ChatMessage[]) => {
  const mergedMessages = new Map<string, ChatMessage>();

  [...primary, ...secondary].forEach((message) => {
    mergedMessages.set(message.id, message);
  });

  return Array.from(mergedMessages.values()).sort((leftMessage, rightMessage) => {
    if (leftMessage.sentAt === rightMessage.sentAt) {
      return leftMessage.id.localeCompare(rightMessage.id);
    }

    return leftMessage.sentAt - rightMessage.sentAt;
  });
};
const loadLocalChatMessages = (leftUserId: string, rightUserId: string): ChatMessage[] => {
  if (typeof window === 'undefined') {
    return [] as ChatMessage[];
  }

  try {
    const storedMessages = window.localStorage.getItem(getChatStorageKey(leftUserId, rightUserId));

    if (!storedMessages) {
      return [];
    }

    const parsedMessages = JSON.parse(storedMessages) as Array<Partial<ChatMessage> & { status?: unknown }>;

    return parsedMessages
      .map((message): ChatMessage => ({
        id: String(message.id || ''),
        senderId: String(message.senderId || ''),
        senderName: String(message.senderName || ''),
        text: String(message.text || ''),
        sentAt: Number(message.sentAt || 0),
        status: ((message.status === 'pending' || message.status === 'failed')
          ? message.status
          : 'sent') as ChatMessage['status'],
      }))
      .filter((message) => Boolean(message.id) && Boolean(message.senderId) && Boolean(message.text));
  } catch {
    return [];
  }
};
const saveLocalChatMessages = (leftUserId: string, rightUserId: string, messages: ChatMessage[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getChatStorageKey(leftUserId, rightUserId), JSON.stringify(messages));
};
const buildConversationPayload = (leftUserId: string, rightUserId: string) => ({
  participants: [leftUserId, rightUserId],
  createdAt: serverTimestamp(),
  lastMessage: '',
  lastMessageAt: serverTimestamp(),
});
const formatChatTime = (timestamp: number) => {
  if (!timestamp) {
    return '';
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const plannerGreeting =
  'Tell me the kind of date you want, and I will suggest a few Gainesville-friendly ideas.';

const buildPlannerPrompts = (profile: UserProfile | null, selectedMatch: Dater | null): PlannerPrompt[] => {
  const interestPair = profile?.interests?.slice(0, 2).join(' and ');
  const matchName = selectedMatch?.name?.split(' ')[0] || 'my match';
  const sharedInterestSummary =
    profile?.interests
      ?.filter((interest) => selectedMatch?.interests.includes(interest))
      .slice(0, 2)
      .join(' and ') || '';

  return [
    {
      id: 'coffee',
      label: 'Low-key first date',
      prompt: `Plan a casual first date near campus with ${matchName}, including coffee or dessert and a simple conversation-friendly activity.`,
    },
    {
      id: 'budget',
      label: 'Budget-friendly night',
      prompt: `Give me 3 affordable Gainesville date ideas for ${matchName} this week that feel thoughtful, not boring.`,
    },
    {
      id: 'personalized',
      label: 'Match my vibe',
      prompt: sharedInterestSummary
        ? `Plan a Gainesville date for me and ${matchName} built around our shared interest in ${sharedInterestSummary}, with a realistic student budget and an easy first message to send.`
        : interestPair
          ? `Plan a Gainesville date that fits me and ${matchName}, especially if we would enjoy ${interestPair}, with a realistic student budget and an easy first message to send.`
          : `Plan a Gainesville date idea for me and ${matchName} that feels fun, safe, and easy for two UF students to say yes to.`,
    },
  ];
};

const buildPlannerGreeting = (selectedMatch: Dater | null) =>
  selectedMatch
    ? `Tell me what kind of date you want with ${selectedMatch.name}, and I will suggest Gainesville-friendly ideas based on both of your preferences.`
    : plannerGreeting;

const describeMatchForPlanner = (selectedMatch: Dater | null) => {
  if (!selectedMatch) {
    return 'No specific match selected yet. Give broad Gainesville date ideas until the user picks a match.';
  }

  return [
    `Selected match: ${selectedMatch.name}`,
    `Year at UF: ${selectedMatch.yearAtUf}`,
    `Bio: ${selectedMatch.bio}`,
    `Top vibe: ${selectedMatch.vibe}`,
    selectedMatch.interests.length ? `Interests: ${selectedMatch.interests.join(', ')}` : '',
    selectedMatch.dateVibe.length ? `Preferred date vibes: ${selectedMatch.dateVibe.join(', ')}` : '',
    selectedMatch.availability.length ? `Availability: ${selectedMatch.availability.join(', ')}` : '',
    selectedMatch.dateBudget ? `Budget comfort: ${selectedMatch.dateBudget}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

const buildPlannerRequest = (
  userPrompt: string,
  currentProfile: UserProfile | null,
  selectedMatch: Dater | null,
) => {
  const sharedInterests = currentProfile?.interests.filter((interest) =>
    selectedMatch?.interests.includes(interest),
  ) || [];
  const sharedVibes = currentProfile?.dateVibe.filter((vibe) =>
    selectedMatch?.dateVibe.includes(vibe),
  ) || [];

  return [
    'Plan this date using the match details below.',
    describeMatchForPlanner(selectedMatch),
    currentProfile
      ? `Current user preferences:\n${[
        currentProfile.interests.length ? `Interests: ${currentProfile.interests.join(', ')}` : '',
        currentProfile.dateVibe.length ? `Preferred date vibes: ${currentProfile.dateVibe.join(', ')}` : '',
        currentProfile.availability.length ? `Availability: ${currentProfile.availability.join(', ')}` : '',
        currentProfile.dateBudget ? `Budget comfort: ${currentProfile.dateBudget}` : '',
      ]
        .filter(Boolean)
        .join('\n')}`
      : '',
    sharedInterests.length ? `Shared interests: ${sharedInterests.join(', ')}` : 'Shared interests: not obvious yet',
    sharedVibes.length ? `Shared date vibes: ${sharedVibes.join(', ')}` : 'Shared date vibes: not obvious yet',
    selectedMatch
      ? `Please make the plan feel specifically compatible with ${selectedMatch.name}, and mention why the suggestion fits both people.`
      : 'Please keep the suggestions broad until a match is selected.',
    `User request: ${userPrompt}`,
  ]
    .filter(Boolean)
    .join('\n\n');
};

const formatCalendarDateValue = (date: Date) => date.toISOString().split('T')[0];
const isSingleCalendarDate = (value: Date | null | [Date | null, Date | null]): value is Date =>
  value instanceof Date;
const isSameCalendarDay = (left: string, right: string) => left === right;
const formatCalendarEntryLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
const normalizeComparableName = (value: string) => value.trim().toLowerCase();
const normalizeCalendarPlan = (value: unknown): CalendarPlan | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const rawPlan = value as Record<string, unknown>;
  const id = typeof rawPlan.id === 'string' ? rawPlan.id : '';
  const title = typeof rawPlan.title === 'string' ? rawPlan.title : '';
  const place = typeof rawPlan.place === 'string' ? rawPlan.place : '';
  const description = typeof rawPlan.description === 'string' ? rawPlan.description : '';
  const matchName = typeof rawPlan.matchName === 'string' ? rawPlan.matchName : '';
  const matchId = typeof rawPlan.matchId === 'string' ? rawPlan.matchId : '';
  const date = typeof rawPlan.date === 'string' ? rawPlan.date : '';

  if (!id || !title || !date) {
    return null;
  }

  return {
    id,
    title,
    place,
    description,
    matchId,
    matchName,
    date,
  };
};
const normalizeCalendarPlans = (value: unknown): CalendarPlan[] =>
  Array.isArray(value)
    ? value
      .map((entry) => normalizeCalendarPlan(entry))
      .filter((entry): entry is CalendarPlan => Boolean(entry))
      .sort((left, right) => left.date.localeCompare(right.date))
    : [];
const upsertCalendarPlan = (plans: CalendarPlan[], nextPlan: CalendarPlan) => {
  const withoutDuplicate = plans.filter((plan) => plan.id !== nextPlan.id);
  return [...withoutDuplicate, nextPlan].sort((left, right) => left.date.localeCompare(right.date));
};
const removeCalendarPlan = (plans: CalendarPlan[], planId: string) =>
  plans.filter((plan) => plan.id !== planId).sort((left, right) => left.date.localeCompare(right.date));
/*
const isCalendarDebugEnabled = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const queryParamEnabled = new URLSearchParams(window.location.search).get('debugCalendar') === '1';
  const localStorageEnabled = window.localStorage.getItem('calendar-debug') === '1';

  return queryParamEnabled || localStorageEnabled;
};
const getFirestoreErrorMeta = (error: unknown) => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : 'unknown';
  const message = error instanceof Error ? error.message : 'Unknown Firestore error';

  return { code, message };
};
const debugCalendar = (step: string, details?: unknown) => {
  if (!isCalendarDebugEnabled()) {
    return;
  }

  const timestamp = new Date().toISOString();

  if (typeof details === 'undefined') {
    console.log(`[calendar-debug ${timestamp}] ${step}`);
    return;
  }

  console.log(`[calendar-debug ${timestamp}] ${step}`, details);
};
*/
const getFirestoreErrorMeta = (_error: unknown) => ({
  code: 'debug-disabled',
  message: 'debug-disabled',
});
const debugCalendar = (_step: string, _details?: unknown) => {};
const normalizeCalendarInvite = (value: unknown): CalendarInvite | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const rawInvite = value as Record<string, unknown>;
  const id = typeof rawInvite.id === 'string' ? rawInvite.id : '';
  const fromUserId = typeof rawInvite.fromUserId === 'string' ? rawInvite.fromUserId : '';
  const fromUserName = typeof rawInvite.fromUserName === 'string' ? rawInvite.fromUserName : '';
  const toUserId = typeof rawInvite.toUserId === 'string' ? rawInvite.toUserId : '';
  const title = typeof rawInvite.title === 'string' ? rawInvite.title : '';
  const place = typeof rawInvite.place === 'string' ? rawInvite.place : '';
  const description = typeof rawInvite.description === 'string' ? rawInvite.description : '';
  const date = typeof rawInvite.date === 'string' ? rawInvite.date : '';
  const createdAt = typeof rawInvite.createdAt === 'number' ? rawInvite.createdAt : 0;

  if (!id || !fromUserId || !toUserId || !title || !date) {
    return null;
  }

  return {
    id,
    fromUserId,
    fromUserName,
    toUserId,
    title,
    place,
    description,
    date,
    createdAt,
  };
};
const normalizeCalendarInvites = (value: unknown): CalendarInvite[] =>
  Array.isArray(value)
    ? value
      .map((entry) => normalizeCalendarInvite(entry))
      .filter((entry): entry is CalendarInvite => Boolean(entry))
      .sort((left, right) => left.createdAt - right.createdAt)
    : [];
const normalizeCalendarInviteRemoval = (value: unknown): CalendarInviteRemoval | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const rawRemoval = value as Record<string, unknown>;
  const id = typeof rawRemoval.id === 'string' ? rawRemoval.id : '';
  const fromUserId = typeof rawRemoval.fromUserId === 'string' ? rawRemoval.fromUserId : '';
  const toUserId = typeof rawRemoval.toUserId === 'string' ? rawRemoval.toUserId : '';
  const planId = typeof rawRemoval.planId === 'string' ? rawRemoval.planId : '';
  const createdAt = typeof rawRemoval.createdAt === 'number' ? rawRemoval.createdAt : 0;

  if (!id || !fromUserId || !toUserId || !planId) {
    return null;
  }

  return {
    id,
    fromUserId,
    toUserId,
    planId,
    createdAt,
  };
};
const normalizeCalendarInviteRemovals = (value: unknown): CalendarInviteRemoval[] =>
  Array.isArray(value)
    ? value
      .map((entry) => normalizeCalendarInviteRemoval(entry))
      .filter((entry): entry is CalendarInviteRemoval => Boolean(entry))
      .sort((left, right) => left.createdAt - right.createdAt)
    : [];
const isPermissionDeniedFirestoreError = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return String((error as { code?: unknown }).code).includes('permission-denied');
  }

  return false;
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
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState('');
  const [conversationReadBy, setConversationReadBy] = useState<Record<string, number>>({});
  const [discoveryFeed, setDiscoveryFeed] = useState<Dater[]>([]);
  const [discoveryFeedSource, setDiscoveryFeedSource] = useState<'sample' | 'firestore'>('sample');
  const [preferencesSection, setPreferencesSection] = useState<'preferences' | 'deal-breakers'>('preferences');
  const [plannerMessages, setPlannerMessages] = useState<PlannerChatMessage[]>([
    { role: 'assistant', text: plannerGreeting },
  ]);
  const [plannerInput, setPlannerInput] = useState('');
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState('');
  const [selectedPlannerMatchId, setSelectedPlannerMatchId] = useState('');
  const [calendarPlans, setCalendarPlans] = useState<CalendarPlan[]>([]);
  const [pendingCalendarSave, setPendingCalendarSave] = useState<{
    messageIndex: number;
    optionIndex: number;
    date: string;
  } | null>(null);
  const [selectedCalendarPlan, setSelectedCalendarPlan] = useState<CalendarPlan | null>(null);
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);
  const plannerChatRef = useRef<HTMLDivElement | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  //hehe calendar
  type ValuePiece = Date | null;
  type Value = ValuePiece | [ValuePiece, ValuePiece];
  const [calendarValue, setCalendarValue] = useState<Value>(new Date());
  const profilePhotoFileRef = useRef<HTMLInputElement | null>(null);

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
        setProfileForm((current) => ({
          ...current,
          firstName: nextProfile.firstName || current.firstName,
          lastName: nextProfile.lastName || current.lastName,
          birthDate: nextProfile.birthDate || current.birthDate,
          yearAtUf: nextProfile.yearAtUf || current.yearAtUf,
          bio: nextProfile.bio || current.bio,
          photoUrl: nextProfile.photoUrl || user.photoURL || current.photoUrl,
          intention: nextProfile.preferences.intention || current.intention,
          genderIdentity: nextProfile.preferences.genderIdentity || current.genderIdentity,
          genderPreference: nextProfile.preferences.genderPreference || current.genderPreference,
          intentionOpenTo: nextProfile.preferences.intentionOpenTo || current.intentionOpenTo,
          ageRangeMin: String(nextProfile.preferences.ageRange.min || current.ageRangeMin),
          ageRangeMax: String(nextProfile.preferences.ageRange.max || current.ageRangeMax),
          vibeWords: nextProfile.preferences.vibeWords || current.vibeWords,
          socialEnergy: nextProfile.preferences.socialEnergy ?? current.socialEnergy,
          dateBudget: nextProfile.preferences.dateBudget || current.dateBudget,
          dateVibe: nextProfile.preferences.dateVibe || current.dateVibe,
          distance: nextProfile.preferences.distance || current.distance,
          availability: nextProfile.preferences.availability || current.availability,
          interests: nextProfile.preferences.interests || current.interests,
        }));
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
    if (!db || !currentUser) {
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);

    return onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const liveProfile = normalizeUserProfile(
          snapshot.data() as Partial<UserProfile>,
          currentUser.uid,
        );

        setFirestoreHealth('connected');
        saveLocalProfile(currentUser.uid, liveProfile);
        setProfile((current) => {
          if (!current) {
            return liveProfile;
          }

          return JSON.stringify(current) === JSON.stringify(liveProfile)
            ? current
            : liveProfile;
        });
      },
      () => {
        setFirestoreHealth('fallback');
      },
    );
  }, [currentUser]);

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

      setDiscoveryFeed([]);
      setDiscoveryFeedSource('firestore');
      //for firebase accounts info
      // setDiscoveryDebug(
      //   `DEBUG discovery: Firestore load failed (code=${code}, message=${message}); showing sample profiles only.`,
      // );
      if (isOfflineFirestoreError(loadError)) {
        setFirestoreHealth('fallback');
      }
      setSwipeIndex(0);
      setStatus('Using fallback daters while the discovery feed loads.');
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
    if (!currentUser || !profile) {
      setMatchedDaters([]);
      return;
    }

    void loadMatchedDaters();
  }, [currentUser, profile]);

  useEffect(() => {
    if (!currentUser) {
      setCalendarPlans([]);
      return;
    }

    if (!db) {
      setCalendarPlans(loadLocalCalendarPlans(currentUser.uid));
      return;
    }

    const calendarRef = doc(db, 'users', currentUser.uid, 'appData', 'calendar');
    debugCalendar('subscribe user calendar snapshot', { uid: currentUser.uid });

    const unsubscribe = onSnapshot(
      calendarRef,
      (snapshot) => {
        const nextPlans = snapshot.exists()
          ? normalizeCalendarPlans(snapshot.data()?.plans)
          : loadLocalCalendarPlans(currentUser.uid);

        debugCalendar('user calendar snapshot received', {
          uid: currentUser.uid,
          exists: snapshot.exists(),
          planCount: nextPlans.length,
          planIds: nextPlans.map((plan) => plan.id),
        });

        saveLocalCalendarPlans(currentUser.uid, nextPlans);
        setCalendarPlans(nextPlans);
        setFirestoreHealth('connected');
      },
      (calendarLoadError) => {
        debugCalendar('user calendar snapshot error', {
          uid: currentUser.uid,
          ...getFirestoreErrorMeta(calendarLoadError),
        });
        setCalendarPlans(loadLocalCalendarPlans(currentUser.uid));

        if (isOfflineFirestoreError(calendarLoadError)) {
          setFirestoreHealth('fallback');
          return;
        }

        setError(
          calendarLoadError instanceof Error
            ? calendarLoadError.message
            : 'Unable to load your saved calendar plans right now.',
        );
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!matchedDaters.length) {
      setSelectedMatchId('');
      return;
    }

    setSelectedMatchId((currentSelected) =>
      currentSelected && matchedDaters.some((dater) => dater.id === currentSelected)
        ? currentSelected
        : '',
    );
  }, [matchedDaters]);

  useEffect(() => {
    if (!db || !currentUser || !matchedDaters.length) {
      return;
    }

    const firestore = db;

    const unsubscribers = matchedDaters.map((dater) => {
      const conversationRef = doc(firestore, 'conversations', getConversationId(currentUser.uid, dater.id));
      debugCalendar('subscribe conversation invite snapshot', {
        currentUid: currentUser.uid,
        matchUid: dater.id,
        conversationId: getConversationId(currentUser.uid, dater.id),
      });

      return onSnapshot(
        conversationRef,
        async (snapshot) => {
          if (!snapshot.exists()) {
            debugCalendar('conversation snapshot missing', {
              conversationId: getConversationId(currentUser.uid, dater.id),
            });
            return;
          }

          const incomingInvites = normalizeCalendarInvites(snapshot.data()?.calendarInvites)
            .filter((invite) => invite.toUserId === currentUser.uid);
          const incomingRemovals = normalizeCalendarInviteRemovals(snapshot.data()?.calendarInviteRemovals)
            .filter((removal) => removal.toUserId === currentUser.uid);

          debugCalendar('conversation snapshot received', {
            conversationId: getConversationId(currentUser.uid, dater.id),
            totalInviteCount: normalizeCalendarInvites(snapshot.data()?.calendarInvites).length,
            incomingInviteCount: incomingInvites.length,
            incomingInviteIds: incomingInvites.map((invite) => invite.id),
            incomingRemovalCount: incomingRemovals.length,
            incomingRemovalPlanIds: incomingRemovals.map((removal) => removal.planId),
          });

          if (!incomingInvites.length && !incomingRemovals.length) {
            return;
          }

          const invitePlans: CalendarPlan[] = incomingInvites.map((invite) => ({
            id: invite.id,
            title: invite.title,
            place: invite.place,
            description: invite.description,
            matchId: invite.fromUserId,
            matchName: invite.fromUserName,
            date: invite.date,
          }));

          let importedCount = 0;
          let removedCount = 0;
          let hasCalendarChanges = false;
          let nextPlansToPersist: CalendarPlan[] = [];
          const removalPlanIds = new Set(incomingRemovals.map((removal) => removal.planId));

          setCalendarPlans((currentPlans) => {
            let nextPlans = invitePlans.reduce((plans, invitePlan) => {
              if (plans.some((plan) => plan.id === invitePlan.id)) {
                return plans;
              }

              importedCount += 1;
              return upsertCalendarPlan(plans, invitePlan);
            }, currentPlans);

            if (removalPlanIds.size) {
              const filteredPlans = nextPlans.filter((plan) => !removalPlanIds.has(plan.id));
              removedCount = nextPlans.length - filteredPlans.length;
              nextPlans = filteredPlans;
            }

            if (!importedCount && !removedCount) {
              return currentPlans;
            }

            hasCalendarChanges = true;
            nextPlansToPersist = nextPlans;
            return nextPlans;
          });

          if (!hasCalendarChanges) {
            debugCalendar('invite/removal sync skipped (already up to date)', {
              currentUid: currentUser.uid,
              conversationId: getConversationId(currentUser.uid, dater.id),
            });
            return;
          }

          debugCalendar('invite/removal synced into recipient calendar state', {
            currentUid: currentUser.uid,
            importedCount,
            removedCount,
            planCount: nextPlansToPersist.length,
          });

          try {
            await persistCalendarPlans(currentUser.uid, nextPlansToPersist);
          } catch (calendarSaveError) {
            debugCalendar('invite persist after import failed', {
              currentUid: currentUser.uid,
              ...getFirestoreErrorMeta(calendarSaveError),
            });
            setError(
              calendarSaveError instanceof Error
                ? calendarSaveError.message
                : 'Unable to sync a shared date to your calendar right now.',
            );
          }
        },
        (conversationError) => {
          debugCalendar('conversation invite snapshot error', {
            currentUid: currentUser.uid,
            conversationId: getConversationId(currentUser.uid, dater.id),
            ...getFirestoreErrorMeta(conversationError),
          });
          setError(
            conversationError instanceof Error
              ? conversationError.message
              : 'Unable to listen for shared calendar updates right now.',
          );
        },
      );
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUser, matchedDaters]);

  useEffect(() => {
    if (!matchedDaters.length) {
      setSelectedPlannerMatchId('');
      return;
    }

    setSelectedPlannerMatchId((currentSelected) => {
      if (currentSelected && matchedDaters.some((dater) => dater.id === currentSelected)) {
        return currentSelected;
      }

      if (selectedMatchId && matchedDaters.some((dater) => dater.id === selectedMatchId)) {
        return selectedMatchId;
      }

      return matchedDaters[0]?.id || '';
    });
  }, [matchedDaters, selectedMatchId]);

  useEffect(() => {
    if (!db || !currentUser || !selectedMatchId) {
      setChatMessages([]);
      setConversationReadBy({});
      return;
    }

    let unsubscribeMessages = () => { };
    let unsubscribeConversation = () => { };
    let cancelled = false;

    void (async () => {
      try {
        if (cancelled) {
          return;
        }

        const conversationId = getConversationId(currentUser.uid, selectedMatchId);
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationSnap = await getDoc(conversationRef);

        if (!conversationSnap.exists()) {
          setChatMessages([]);
          setConversationReadBy({});
          return;
        }

        const messagesQuery = query(
          collection(db, 'conversations', conversationId, 'messages'),
          orderBy('sentAt', 'asc'),
          limit(200),
        );

        unsubscribeMessages = onSnapshot(
          messagesQuery,
          (snapshot) => {
            const nextMessages = snapshot.docs.map((snapshotDoc): ChatMessage => ({
              id: snapshotDoc.id,
              senderId: String(snapshotDoc.data().senderId || ''),
              senderName: String(snapshotDoc.data().senderName || ''),
              text: String(snapshotDoc.data().text || ''),
              sentAt: Number(snapshotDoc.data().sentAt || 0),
              status: 'sent',
            }));

            setChatMessages((current) => mergeChatMessages(current, nextMessages));
          },
          () => {
            setChatMessages([]);
          },
        );

        unsubscribeConversation = onSnapshot(
          conversationRef,
          (snapshot) => {
            const readByRaw = snapshot.data()?.lastReadAtBy;

            if (!readByRaw || typeof readByRaw !== 'object') {
              setConversationReadBy({});
              return;
            }

            const normalizedReadBy = Object.entries(readByRaw as Record<string, unknown>).reduce<Record<string, number>>(
              (accumulator, [uid, value]) => {
                const numericValue = Number(value);

                if (!Number.isNaN(numericValue) && numericValue > 0) {
                  accumulator[uid] = numericValue;
                }

                return accumulator;
              },
              {},
            );

            setConversationReadBy(normalizedReadBy);
          },
          () => {
            setConversationReadBy({});
          },
        );
      } catch {
        if (!cancelled) {
          setChatMessages([]);
          setConversationReadBy({});
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeMessages();
      unsubscribeConversation();
    };
  }, [currentUser, selectedMatchId]);

  useEffect(() => {
    if (!plannerChatRef.current) {
      return;
    }

    plannerChatRef.current.scrollTop = plannerChatRef.current.scrollHeight;
  }, [plannerMessages, plannerLoading]);

  useEffect(() => {
    const selectedPlannerMatch =
      matchedDaters.find((dater) => dater.id === selectedPlannerMatchId) || null;

    setPlannerMessages([{ role: 'assistant', text: buildPlannerGreeting(selectedPlannerMatch) }]);
    setPlannerInput('');
    setPlannerError('');
    setPendingCalendarSave(null);
  }, [matchedDaters, selectedPlannerMatchId]);

  const resetMessages = () => {
    setError('');
    setStatus('');
  };

  const submitPlannerPrompt = async (messageText: string) => {
    const trimmedMessage = messageText.trim();
    const selectedPlannerMatch =
      matchedDaters.find((dater) => dater.id === selectedPlannerMatchId) || null;

    if (!trimmedMessage) {
      return;
    }

    if (!isGeminiConfigured) {
      setPlannerError('Add VITE_GEMINI_API_KEY to gator-dater-app/.env to enable the chatbot.');
      return;
    }

    const nextMessages: PlannerChatMessage[] = [
      ...plannerMessages,
      { role: 'user', text: trimmedMessage },
    ];

    setPlannerInput('');
    setPlannerError('');
    setPlannerLoading(true);
    setPlannerMessages(nextMessages);

    try {
      const plannerMessagesWithContext: PlannerChatMessage[] = [
        ...plannerMessages,
        {
          role: 'user',
          text: buildPlannerRequest(trimmedMessage, profile, selectedPlannerMatch),
        },
      ];
      const reply = await generatePlannerReply(plannerMessagesWithContext, profile || undefined);

      setPlannerMessages([
        ...nextMessages,
        { role: 'assistant', text: reply.intro, dateOptions: reply.dateOptions },
      ]);
    } catch (plannerReplyError) {
      setPlannerError(
        plannerReplyError instanceof Error
          ? plannerReplyError.message
          : 'The planner could not respond right now.',
      );
    } finally {
      setPlannerLoading(false);
    }
  };

  const handlePlannerPromptClick = async (prompt: string) => {
    await submitPlannerPrompt(prompt);
  };

  const handlePlannerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitPlannerPrompt(plannerInput);
  };

  const handleStartCalendarSave = (messageIndex: number, optionIndex: number) => {
    const selectedDate = isSingleCalendarDate(calendarValue) ? calendarValue : new Date();

    setPendingCalendarSave({
      messageIndex,
      optionIndex,
      date: formatCalendarDateValue(selectedDate),
    });
  };

  const handleConfirmCalendarSave = async (
    option: PlannerDateOption,
    matchId: string,
    matchName: string,
  ) => {
    if (!pendingCalendarSave?.date || !currentUser) {
      return;
    }

    const nextPlan: CalendarPlan = {
      id: `${option.title}-${pendingCalendarSave.date}`,
      title: option.title,
      place: option.place,
      description: option.description,
      matchId,
      matchName,
      date: pendingCalendarSave.date,
    };

    const nextPlans = upsertCalendarPlan(calendarPlans, nextPlan);

    setCalendarPlans(nextPlans);
    setCalendarValue(new Date(`${pendingCalendarSave.date}T12:00:00`));
    setPendingCalendarSave(null);
    setActiveTab('calendar');
    setStatus(`Added "${option.title}" to your calendar.`);
    debugCalendar('sender saved planner date (local state)', {
      currentUid: currentUser.uid,
      matchId,
      planId: nextPlan.id,
      date: nextPlan.date,
      title: nextPlan.title,
    });

    let senderSaveError: unknown = null;

    try {
      await persistCalendarPlans(currentUser.uid, nextPlans);
      debugCalendar('sender calendar persisted', {
        currentUid: currentUser.uid,
        planId: nextPlan.id,
        planCount: nextPlans.length,
      });
    } catch (calendarSaveError) {
      senderSaveError = calendarSaveError;
      debugCalendar('sender calendar persist failed, continuing share flow', {
        currentUid: currentUser.uid,
        ...getFirestoreErrorMeta(calendarSaveError),
      });
    }

    if (matchId && profile) {
      const mirroredPlan: CalendarPlan = {
        ...nextPlan,
        matchId: currentUser.uid,
        matchName: profile.fullName || currentUser.displayName || 'Your match',
      };

      debugCalendar('attempting shared calendar mirror', {
        senderUid: currentUser.uid,
        recipientUid: matchId,
        planId: mirroredPlan.id,
      });

      try {
        await persistSharedCalendarPlan(matchId, mirroredPlan);
      } catch (shareSaveError) {
        debugCalendar('shared calendar mirror flow failed', {
          senderUid: currentUser.uid,
          recipientUid: matchId,
          ...getFirestoreErrorMeta(shareSaveError),
        });
        setError(
          shareSaveError instanceof Error
            ? shareSaveError.message
            : 'Unable to sync this calendar plan with your match right now.',
        );
        return;
      }
    }

    if (senderSaveError) {
      setError(
        senderSaveError instanceof Error
          ? `Saved locally and shared, but your own Firestore calendar write failed: ${senderSaveError.message}`
          : 'Saved locally and shared, but your own Firestore calendar write failed.',
      );
    }
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
  const getCalendarStorageKey = (uid: string) => `gator-dater-calendar:${uid}`;

  const loadLocalCalendarPlans = (uid: string) => {
    if (typeof window === 'undefined') {
      return [] as CalendarPlan[];
    }

    try {
      const storedPlans = window.localStorage.getItem(getCalendarStorageKey(uid));

      if (!storedPlans) {
        return [] as CalendarPlan[];
      }

      return normalizeCalendarPlans(JSON.parse(storedPlans) as unknown);
    } catch {
      return [];
    }
  };

  const saveLocalCalendarPlans = (uid: string, plans: CalendarPlan[]) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(getCalendarStorageKey(uid), JSON.stringify(plans));
  };
  const resolveCalendarPlanMatchId = (plan: CalendarPlan) => {
    if (plan.matchId && matchedDaters.some((dater) => dater.id === plan.matchId)) {
      return plan.matchId;
    }

    const normalizedPlanName = normalizeComparableName(plan.matchName);
    const matchedDater = matchedDaters.find(
      (dater) => normalizeComparableName(dater.name) === normalizedPlanName,
    );

    return matchedDater?.id || '';
  };

  const loadUserCalendarPlans = async (uid: string) => {
    const localPlans = loadLocalCalendarPlans(uid);

    if (!db) {
      return localPlans;
    }

    try {
      const calendarDoc = await getDoc(doc(db, 'users', uid, 'appData', 'calendar'));

      if (!calendarDoc.exists()) {
        return localPlans;
      }

      const remotePlans = normalizeCalendarPlans(calendarDoc.data()?.plans);
      saveLocalCalendarPlans(uid, remotePlans);
      setFirestoreHealth('connected');
      return remotePlans;
    } catch (calendarLoadError) {
      if (isOfflineFirestoreError(calendarLoadError)) {
        setFirestoreHealth('fallback');
        return localPlans;
      }

      throw calendarLoadError;
    }
  };

  const persistCalendarPlans = async (uid: string, plans: CalendarPlan[]) => {
    saveLocalCalendarPlans(uid, plans);

    if (!db) {
      return;
    }

    try {
      await setDoc(
        doc(db, 'users', uid, 'appData', 'calendar'),
        {
          plans,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      debugCalendar('persistCalendarPlans success', {
        uid,
        planCount: plans.length,
        planIds: plans.map((plan) => plan.id),
      });
      setFirestoreHealth('connected');
    } catch (calendarSaveError) {
      debugCalendar('persistCalendarPlans failed', {
        uid,
        ...getFirestoreErrorMeta(calendarSaveError),
      });
      if (isOfflineFirestoreError(calendarSaveError)) {
        setFirestoreHealth('fallback');
        return;
      }

      throw calendarSaveError;
    }
  };

  const persistSharedCalendarPlan = async (uid: string, plan: CalendarPlan) => {
    if (!db || !currentUser || !profile) {
      return;
    }

    try {
      debugCalendar('persistSharedCalendarPlan start', {
        senderUid: currentUser.uid,
        recipientUid: uid,
        planId: plan.id,
      });
      const calendarRef = doc(db, 'users', uid, 'appData', 'calendar');
      const calendarSnap = await getDoc(calendarRef);
      const existingPlans = calendarSnap.exists()
        ? normalizeCalendarPlans(calendarSnap.data()?.plans)
        : [];
      const nextPlans = upsertCalendarPlan(existingPlans, plan);

      await setDoc(
        calendarRef,
        {
          plans: nextPlans,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      debugCalendar('persistSharedCalendarPlan success', {
        senderUid: currentUser.uid,
        recipientUid: uid,
        planId: plan.id,
        recipientPlanCount: nextPlans.length,
      });
    } catch (calendarSaveError) {
      if (isPermissionDeniedFirestoreError(calendarSaveError)) {
        debugCalendar('persistSharedCalendarPlan permission denied, using invite fallback', {
          senderUid: currentUser.uid,
          recipientUid: uid,
          planId: plan.id,
          ...getFirestoreErrorMeta(calendarSaveError),
        });
        await persistCalendarInvite(uid, plan);
        return;
      }

      debugCalendar('persistSharedCalendarPlan failed', {
        senderUid: currentUser.uid,
        recipientUid: uid,
        planId: plan.id,
        ...getFirestoreErrorMeta(calendarSaveError),
      });

      if (isOfflineFirestoreError(calendarSaveError)) {
        setFirestoreHealth('fallback');
        return;
      }

      throw calendarSaveError;
    }
  };

  const persistCalendarInvite = async (recipientUid: string, plan: CalendarPlan) => {
    if (!db || !currentUser || !profile) {
      return;
    }

    const conversationId = getConversationId(currentUser.uid, recipientUid);
    const conversationRef = doc(db, 'conversations', conversationId);
    debugCalendar('persistCalendarInvite start', {
      senderUid: currentUser.uid,
      recipientUid,
      conversationId,
      planId: plan.id,
    });
    const conversationSnap = await getDoc(conversationRef);
    const existingInvites = conversationSnap.exists()
      ? normalizeCalendarInvites(conversationSnap.data()?.calendarInvites)
      : [];
    const inviteId = `${plan.id}__${currentUser.uid}__${recipientUid}`;
    const invite: CalendarInvite = {
      id: inviteId,
      fromUserId: currentUser.uid,
      fromUserName: profile.fullName || currentUser.displayName || 'Your match',
      toUserId: recipientUid,
      title: plan.title,
      place: plan.place,
      description: plan.description,
      date: plan.date,
      createdAt: Date.now(),
    };

    const nextInvites = [
      ...existingInvites.filter((existingInvite) => existingInvite.id !== inviteId),
      invite,
    ];

    try {
      await setDoc(
        conversationRef,
        {
          participants: getConversationParticipantIds(currentUser.uid, recipientUid),
          updatedAt: serverTimestamp(),
          calendarInvites: nextInvites,
        },
        { merge: true },
      );
      debugCalendar('persistCalendarInvite success', {
        senderUid: currentUser.uid,
        recipientUid,
        conversationId,
        inviteId,
        inviteCount: nextInvites.length,
      });
    } catch (inviteError) {
      debugCalendar('persistCalendarInvite failed', {
        senderUid: currentUser.uid,
        recipientUid,
        conversationId,
        inviteId,
        ...getFirestoreErrorMeta(inviteError),
      });
      throw inviteError;
    }
  };

  const deleteSharedCalendarPlan = async (uid: string, planId: string) => {
    if (!db || !currentUser) {
      return;
    }

    try {
      const calendarRef = doc(db, 'users', uid, 'appData', 'calendar');
      const calendarSnap = await getDoc(calendarRef);
      const existingPlans = calendarSnap.exists()
        ? normalizeCalendarPlans(calendarSnap.data()?.plans)
        : [];
      const nextPlans = removeCalendarPlan(existingPlans, planId);

      await setDoc(
        calendarRef,
        {
          plans: nextPlans,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (calendarDeleteError) {
      if (isPermissionDeniedFirestoreError(calendarDeleteError)) {
        await persistCalendarInviteRemoval(uid, planId);
        return;
      }

      if (isOfflineFirestoreError(calendarDeleteError)) {
        setFirestoreHealth('fallback');
        return;
      }

      throw calendarDeleteError;
    }
  };

  const persistCalendarInviteRemoval = async (recipientUid: string, planId: string) => {
    if (!db || !currentUser) {
      return;
    }

    const conversationId = getConversationId(currentUser.uid, recipientUid);
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    const existingRemovals = conversationSnap.exists()
      ? normalizeCalendarInviteRemovals(conversationSnap.data()?.calendarInviteRemovals)
      : [];
    const removalId = `${planId}__rm__${currentUser.uid}__${recipientUid}`;
    const removalEvent: CalendarInviteRemoval = {
      id: removalId,
      fromUserId: currentUser.uid,
      toUserId: recipientUid,
      planId,
      createdAt: Date.now(),
    };
    const nextRemovals = [
      ...existingRemovals.filter((removal) => removal.id !== removalId),
      removalEvent,
    ];

    await setDoc(
      conversationRef,
      {
        participants: getConversationParticipantIds(currentUser.uid, recipientUid),
        updatedAt: serverTimestamp(),
        calendarInviteRemovals: nextRemovals,
      },
      { merge: true },
    );
  };

  const handleDeleteCalendarPlan = async (plan: CalendarPlan) => {
    if (!currentUser) {
      return;
    }

    const nextPlans = removeCalendarPlan(calendarPlans, plan.id);
    const mirroredMatchId = resolveCalendarPlanMatchId(plan);

    setCalendarPlans(nextPlans);
    setSelectedCalendarPlan(null);
    setStatus(`Deleted "${plan.title}" from your calendar.`);

    let senderDeleteError: unknown = null;

    try {
      await persistCalendarPlans(currentUser.uid, nextPlans);
    } catch (calendarDeleteError) {
      senderDeleteError = calendarDeleteError;
    }

    if (mirroredMatchId) {
      try {
        await deleteSharedCalendarPlan(mirroredMatchId, plan.id);
      } catch (mirroredDeleteError) {
        setError(
          mirroredDeleteError instanceof Error
            ? mirroredDeleteError.message
            : 'Unable to sync this deletion with your match right now.',
        );
        return;
      }
    }

    if (senderDeleteError) {
      setError(
        senderDeleteError instanceof Error
          ? `Deleted locally and synced, but your own Firestore delete failed: ${senderDeleteError.message}`
          : 'Deleted locally and synced, but your own Firestore delete failed.',
      );
    }
  };

  const readPhotoFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;

        if (typeof result !== 'string') {
          reject(new Error('Unable to read the selected photo.'));
          return;
        }

        const image = new Image();

        image.onload = () => {
          const maxDimension = 512;
          const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) {
            resolve(result);
            return;
          }

          canvas.width = width;
          canvas.height = height;
          context.drawImage(image, 0, 0, width, height);

          const compressedResult = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressedResult.length < result.length ? compressedResult : result);
        };

        image.onerror = () => resolve(result);
        image.src = result;
      };

      reader.onerror = () => reject(new Error('Unable to read the selected photo.'));
      reader.readAsDataURL(file);
    });

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
      age: profileForm.birthDate ? calculateAgeFromBirthDate(profileForm.birthDate) : profile?.age || 18,
      birthDate: profileForm.birthDate || profile?.birthDate || '',
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
        await setDoc(doc(db, 'users', currentUser.uid), buildFirestoreUserProfile(updatedProfile), { merge: true });
        setFirestoreHealth('connected');
      }

      await updateProfile(currentUser, {
        displayName: updatedProfile.fullName,
        photoURL: photoUrl,
      });

      await reload(currentUser);
      setCurrentUser(auth?.currentUser || currentUser);

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

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }
    event.target.value = '';

    try {
      const result = await readPhotoFile(file);

      setProfileForm((current) => ({
        ...current,
        photoUrl: result,
      }));
      setStatus('Photo selected.');
    } catch (photoError) {
      setError(
        photoError instanceof Error
          ? photoError.message
          : 'Unable to process the selected photo.',
      );
    }
  };

  const handleProfilePhotoUpdate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !currentUser || !currentUser.email) {
      return;
    }
    event.target.value = '';

    try {
      const result = await readPhotoFile(file);
      await saveProfilePhoto(result);
    } catch (photoError) {
      setError(
        photoError instanceof Error
          ? photoError.message
          : 'Unable to process the selected photo.',
      );
    }
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

  const activeProfilePhoto =
    profileForm.photoUrl || profile?.photoUrl || currentUser?.photoURL || '';

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

    const nextAge = calculateAgeFromBirthDate(profileForm.birthDate);

    if (!profileForm.birthDate || nextAge < 18) {
      setError('Enter a valid birthday for a user who is at least 18.');
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
        age: nextAge,
        birthDate: profileForm.birthDate,
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

      await setDoc(doc(db, 'users', currentUser.uid), buildFirestoreUserProfile(nextProfile), { merge: true });
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
          age: nextAge,
          birthDate: profileForm.birthDate,
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
    setScreen('home');
    setActiveTab('swipe');

    if (!currentUser || !profile) {
      return;
    }

    const nextProfile = profile.onboardingCompleted
      ? profile
      : {
          ...profile,
          onboardingCompleted: true,
        };

    if (!profile.onboardingCompleted) {
      setProfile(nextProfile);
      saveLocalProfile(currentUser.uid, nextProfile);

      if (db) {
        void setDoc(
          doc(db, 'users', currentUser.uid),
          { onboardingCompleted: true },
          { merge: true },
        ).catch(() => {
          setFirestoreHealth('fallback');
        });
      }
    }

    void findTopPreferenceMatches(currentUser.uid, nextProfile)
      .then((matches) => {
        if (matches.length) {
          setStatus(`Found ${matches.length} potential matches from profile preferences.`);
        }
      })
      .catch(() => {
        setStatus('');
      });
  };

  const handleOpenPreferences = () => {
    setProfileForm((current) => ({
      ...current,
      firstName: profile?.firstName || current.firstName,
      lastName: profile?.lastName || current.lastName,
      birthDate: profile?.birthDate || current.birthDate,
      yearAtUf: profile?.yearAtUf || current.yearAtUf,
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
    const nextAge = profileForm.birthDate
      ? calculateAgeFromBirthDate(profileForm.birthDate)
      : profile?.age || 18;

    if (!profileForm.birthDate || nextAge < 18) {
      setError('Enter a valid birthday for a user who is at least 18.');
      setLoading(false);
      return;
    }

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
      firstName: profileForm.firstName.trim() || profile?.firstName || '',
      lastName: profileForm.lastName.trim() || profile?.lastName || '',
      fullName,
      name: fullName,
      age: nextAge,
      birthDate: profileForm.birthDate || profile?.birthDate || '',
      yearAtUf: profileForm.yearAtUf || profile?.yearAtUf || '',
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
      photoUrl: profileForm.photoUrl || profile?.photoUrl || '',
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
        await setDoc(doc(db, 'users', currentUser.uid), buildFirestoreUserProfile(updatedProfile), { merge: true });
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
      setDiscoveryFeed([]);
      setDiscoveryFeedSource('firestore');
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

    // const sampleCandidates: Dater[] = [];

    //for firebase accounts info
    // setDiscoveryDebug(
    //   `DEBUG discovery: firestoreDocs=${snapshot.docs.length} eligibleFirebase=${baseRemoteCandidates.length} firebaseShown=${remoteCandidates.length} sampleAppended=${sampleCandidates.length} totalFeed=${remoteCandidates.length + sampleCandidates.length}`,
    // );

    if (remoteCandidates.length) {
      setDiscoveryFeed(remoteCandidates);
      setDiscoveryFeedSource('firestore');
      setSwipeIndex(0);
      return;
    }

    setDiscoveryFeed([]);
    setDiscoveryFeedSource('firestore');
    //for firebase accounts info
    // setDiscoveryDebug(
    //   `DEBUG discovery: firestoreDocs=${snapshot.docs.length} eligibleFirebase=${baseRemoteCandidates.length} firebaseShown=0; using sample fallback`,
    // );
    setSwipeIndex(0);
  };

  const loadMatchedDaters = async () => {
    if (!db || !profile || !currentUser) {
      setMatchedDaters([]);
      return;
    }

    const firestore = db;
    const candidateMatchIds = Array.from(
      new Set([...(profile.matches || []), ...(profile.likedUsers || [])]),
    );

    if (!candidateMatchIds.length) {
      setMatchedDaters([]);
      return;
    }

    const matchDocs = await Promise.all(
      candidateMatchIds.map(async (matchId) => {
        const matchDoc = await getDoc(doc(firestore, 'users', matchId));

        if (!matchDoc.exists()) {
          return null;
        }

        const candidateProfile = normalizeUserProfile(
          matchDoc.data() as Partial<UserProfile>,
          matchId,
        );
        const isMutualLike = candidateProfile.likedUsers.includes(currentUser.uid);
        const isMutualMatch = candidateProfile.matches.includes(currentUser.uid) || isMutualLike;
        const wasRecordedMatch = profile.matches.includes(matchId);

        if (!isMutualMatch && !wasRecordedMatch) {
          return null;
        }

        return {
          ...profileToDater(candidateProfile),
          compatibility: compareProfilesByPreferences(profile, candidateProfile),
        };
      }),
    );

    const nextMatchedDaters = matchDocs.filter((match): match is Dater => Boolean(match));
    const nextMatchIds = nextMatchedDaters.map((match) => match.id);

    setMatchedDaters(nextMatchedDaters);

    const existingMatches = profile.matches || [];
    const hasMatchListChanged =
      nextMatchIds.length !== existingMatches.length ||
      nextMatchIds.some((matchId) => !existingMatches.includes(matchId));

    if (hasMatchListChanged) {
      const syncedProfile = {
        ...profile,
        matches: nextMatchIds,
      };

      setProfile(syncedProfile);
      saveLocalProfile(currentUser.uid, syncedProfile);

      await setDoc(
        doc(firestore, 'users', currentUser.uid),
        { matches: nextMatchIds },
        { merge: true },
      );
    }
  };

  const loadLikedDaters = async (currentProfile: UserProfile) => {
    if (!currentProfile.likedUsers.length) {
      setLikedDaters([]);
      return;
    }

    // const sampleProfileMap = new Map<string, UserProfile>();

    const likedCards = await Promise.all(
      currentProfile.likedUsers.map(async (likedUserId) => {
        if (currentProfile.matches.includes(likedUserId)) {
          return null;
        }

        if (db) {
          try {
            const likedUserDoc = await getDoc(doc(db, 'users', likedUserId));

            if (likedUserDoc.exists()) {
              const likedProfile = normalizeUserProfile(
                likedUserDoc.data() as Partial<UserProfile>,
                likedUserId,
              );

              if (likedProfile.likedUsers.includes(currentProfile.uid)) {
                return null;
              }

              return {
                ...profileToDater(likedProfile),
                compatibility: compareProfilesByPreferences(currentProfile, likedProfile),
              };
            }
          } catch {
            // Fall back to local sample profile map when Firestore fetch fails.
          }
        }

        return null;
      }),
    );

    setLikedDaters(likedCards.filter((card): card is Dater => Boolean(card)));
  };

  const ensureConversationExists = async (leftUserId: string, rightUserId: string) => {
    if (!db) {
      return;
    }

    const conversationId = getConversationId(leftUserId, rightUserId);
    const conversationRef = doc(db, 'conversations', conversationId);

    // Create or update the conversation first so a denied pre-read cannot block creation.
    await setDoc(
      conversationRef,
      {
        participants: [leftUserId, rightUserId],
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
      },
      { merge: true },
    );

    try {
      const conversationSnap = await getDoc(conversationRef);
      // console.log('conversation exists after ensure:', conversationSnap.exists());
      // console.log('conversation data after ensure:', JSON.stringify(conversationSnap.data() || null));
    } catch (readError) {
      const code =
        typeof readError === 'object' &&
          readError !== null &&
          'code' in readError
          ? String((readError as { code?: unknown }).code)
          : 'unknown';
      const message =
        readError instanceof Error
          ? readError.message
          : 'Unknown conversation read error';
      // console.log(`ensureConversationExists read-back failed: (${code}) ${message}`);
    }
  };

  const persistChatMessage = async (message: ChatMessage) => {
    if (!db || !currentUser || !profile || !selectedMatchId) {
      return;
    }

    const conversationId = getConversationId(currentUser.uid, selectedMatchId);
    const conversationRef = doc(db, 'conversations', conversationId);
    const messageRef = doc(db, 'conversations', conversationId, 'messages', message.id);

    // Temporary debug instrumentation for rules troubleshooting.
    // console.log('--- sendMessage debug ---');
    // console.log('senderId:', currentUser.uid);
    // console.log('conversationId:', conversationId);
    // console.log('auth uid:', auth?.currentUser?.uid || null);

    const currentUid = auth?.currentUser?.uid || '';

    if (!currentUid) {
      // console.error('PROBLEM: No authenticated user found');
      throw new Error('No authenticated user found.');
    }

    try {
      const conversationSnap = await getDoc(conversationRef);
      // console.log('conversation exists:', conversationSnap.exists());
      // console.log('conversation data:', conversationSnap.data() || null);

      if (!conversationSnap.exists()) {
        // console.error('PROBLEM: Conversation document does not exist yet!');
      }

      const participantsRaw = conversationSnap.data()?.participants;
      const participants = Array.isArray(participantsRaw)
        ? participantsRaw.map((entry) => String(entry))
        : [];

      // console.log('participants:', participants);
      // console.log('current user in participants:', participants.includes(currentUid));
    } catch (conversationReadError) {
      const code =
        typeof conversationReadError === 'object' &&
          conversationReadError !== null &&
          'code' in conversationReadError
          ? String((conversationReadError as { code?: unknown }).code)
          : 'unknown';
      const message =
        conversationReadError instanceof Error
          ? conversationReadError.message
          : 'Unknown conversation read error';
      // console.error(`PROBLEM: Conversation read blocked before send. (${code}) ${message}`);
    }

    const batch = writeBatch(db);

    batch.set(
      conversationRef,
      {
        participants: [currentUser.uid, selectedMatchId],
        updatedAt: serverTimestamp(),
        lastMessage: message.text,
        lastMessageSenderId: currentUser.uid,
        lastMessageSenderName: message.senderName,
        lastMessageAt: serverTimestamp(),
      },
      { merge: true },
    );

    batch.set(messageRef, {
      senderId: currentUser.uid,
      senderName: message.senderName,
      text: message.text,
      sentAt: message.sentAt,
      createdAt: serverTimestamp(),
      type: 'text',
    });

    // console.log('attempting batch commit for conversation + message');
    await batch.commit();
    // console.log('batch commit succeeded');
  };

  const handleSendChatMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!db || !currentUser || !profile || !selectedMatchId) {
      return;
    }

    if (!matchedDaters.some((dater) => dater.id === selectedMatchId)) {
      setChatError('You can only message someone after you both match.');
      return;
    }

    const messageText = chatDraft.trim();

    if (!messageText) {
      return;
    }

    setChatError('');
    const senderName = profile.fullName || currentUser.displayName || 'User';
    const optimisticMessage: ChatMessage = {
      id: doc(collection(db, 'conversations', getConversationId(currentUser.uid, selectedMatchId), 'messages')).id,
      senderId: currentUser.uid,
      senderName,
      text: messageText,
      sentAt: Date.now(),
      status: 'pending',
    };

    setChatDraft('');
    setChatMessages((current) => mergeChatMessages(current, [optimisticMessage]));

    try {
      await ensureConversationExists(currentUser.uid, selectedMatchId);
      await persistChatMessage(optimisticMessage);

      setChatMessages((current) =>
        current.map((entry) =>
          entry.id === optimisticMessage.id ? { ...entry, status: 'sent' } : entry,
        ),
      );
    } catch (sendError) {
      const code =
        typeof sendError === 'object' &&
          sendError !== null &&
          'code' in sendError
          ? String((sendError as { code?: unknown }).code)
          : 'unknown';
      const errorMessage =
        sendError instanceof Error
          ? sendError.message
          : 'Unknown send error';

      setChatMessages((current) =>
        current.map((entry) =>
          entry.id === optimisticMessage.id ? { ...entry, status: 'failed' } : entry,
        ),
      );
      setChatDraft(messageText);
      setChatError(`Unable to send message. (${code}) ${errorMessage}`);
    }
  };

  const handleRetryChatMessage = async (message: ChatMessage) => {
    if (!db || !currentUser || !profile || !selectedMatchId) {
      return;
    }

    setChatError('');
    setChatMessages((current) =>
      current.map((entry) =>
        entry.id === message.id ? { ...entry, status: 'pending' } : entry,
      ),
    );

    try {
      await persistChatMessage({
        ...message,
        status: 'pending',
      });

      setChatMessages((current) =>
        current.map((entry) =>
          entry.id === message.id ? { ...entry, status: 'sent' } : entry,
        ),
      );
    } catch (retryError) {
      const code =
        typeof retryError === 'object' &&
          retryError !== null &&
          'code' in retryError
          ? String((retryError as { code?: unknown }).code)
          : 'unknown';
      const errorMessage =
        retryError instanceof Error
          ? retryError.message
          : 'Unknown send error';

      setChatMessages((current) =>
        current.map((entry) =>
          entry.id === message.id ? { ...entry, status: 'failed' } : entry,
        ),
      );
      setChatError(`Unable to send message. (${code}) ${errorMessage}`);
    }
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
    setCalendarPlans([]);
    setSelectedCalendarPlan(null);
    setProfilePreviewOpen(false);
    setSelectedMatchId('');
    setChatDraft('');
    setChatMessages([]);
    setChatError('');
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
      const selectedCalendarValue = isSingleCalendarDate(calendarValue) ? calendarValue : new Date();
      const selectedCalendarDate = isSingleCalendarDate(calendarValue)
        ? formatCalendarDateValue(calendarValue)
        : formatCalendarDateValue(new Date());
      const plansForSelectedDay = calendarPlans.filter((plan) =>
        isSameCalendarDay(plan.date, selectedCalendarDate),
      );
      const selectedDayPrimaryPlan = plansForSelectedDay[0] || null;
      const todayCalendarDate = formatCalendarDateValue(new Date());
      const selectedMonthStart = new Date(
        selectedCalendarValue.getFullYear(),
        selectedCalendarValue.getMonth(),
        1,
      );
      const selectedMonthEnd = new Date(
        selectedCalendarValue.getFullYear(),
        selectedCalendarValue.getMonth() + 1,
        0,
      );
      const monthLabel = selectedCalendarValue.toLocaleDateString([], {
        month: 'long',
        year: 'numeric',
      });
      const upcomingPlansForMonth = calendarPlans.filter((plan) => {
        const planDate = new Date(`${plan.date}T12:00:00`);
        return planDate >= selectedMonthStart && planDate <= selectedMonthEnd && plan.date >= todayCalendarDate;
      });
      const nextPlannedDate = upcomingPlansForMonth[0] || null;
      const restOfMonthPlans = upcomingPlansForMonth.slice(1);
      const plannedDates = new Set(calendarPlans.map((plan) => plan.date));
      const selectedCalendarMatchId = selectedCalendarPlan
        ? resolveCalendarPlanMatchId(selectedCalendarPlan)
        : '';
      const canOpenChatForSelectedPlan = Boolean(selectedCalendarMatchId);

      return (
        <>
          <section className="calendar">
            <h2>Calendar</h2>

            <div>
              {/* className="calendar-grid"> */}
              <Calendar
                onChange={setCalendarValue}
                value={calendarValue}
                tileClassName={({ date, view }) =>
                  view === 'month' && plannedDateSet.has(formatCalendarDateValue(date))
                    ? 'calendar-tile--planned'
                    : undefined
                }
              />
            </div>
          </section>

          <section className="home-grid">
            {selectedDayPrimaryPlan ? (
              <button
                key={selectedDayPrimaryPlan.id}
                className="home-tile calendar-plan-card calendar-selected-plan"
                type="button"
                onClick={() => setSelectedCalendarPlan(selectedDayPrimaryPlan)}
              >
                <h3>{selectedDayPrimaryPlan.title}</h3>
                <p>With {selectedDayPrimaryPlan.matchName} on {formatCalendarEntryLabel(selectedDayPrimaryPlan.date)}</p>
                <p>{selectedDayPrimaryPlan.place}</p>
                <p>{selectedDayPrimaryPlan.description}</p>
              </button>
            ) : (
              <article className="home-tile">
                <h3>No saved dates for this day</h3>
                <p>Use the planner tab to generate 3 ideas, then add one to your calendar.</p>
              </article>
            )}
          </section>

          {!selectedDayPrimaryPlan ? (
            <section className="home-grid calendar-upcoming-list">
              <article className="home-tile">
                <h3>Upcoming in {monthLabel}</h3>
                {nextPlannedDate ? (
                  <>
                    <p className="account-label">Next date planned</p>
                    <button
                      className="home-tile calendar-plan-card calendar-next-plan"
                      type="button"
                      onClick={() => setSelectedCalendarPlan(nextPlannedDate)}
                    >
                      <h3>{nextPlannedDate.title}</h3>
                      <p>With {nextPlannedDate.matchName} on {formatCalendarEntryLabel(nextPlannedDate.date)}</p>
                      <p>{nextPlannedDate.place}</p>
                      <p>{nextPlannedDate.description}</p>
                    </button>
                  </>
                ) : (
                  <p>No more dates planned for the rest of this month.</p>
                )}
              </article>

              {restOfMonthPlans.length ? (
                <article className="home-tile">
                  <h3>Rest of month</h3>
                  <div className="calendar-month-list">
                    {restOfMonthPlans.map((plan) => (
                      <button
                        key={`month-${plan.id}`}
                        className="home-tile calendar-plan-card"
                        type="button"
                        onClick={() => setSelectedCalendarPlan(plan)}
                      >
                        <h3>{plan.title}</h3>
                        <p>With {plan.matchName} on {formatCalendarEntryLabel(plan.date)}</p>
                        <p>{plan.place}</p>
                      </button>
                    ))}
                  </div>
                </article>
              ) : null}
            </section>
          ) : null}

          {selectedCalendarPlan ? (
            <div className="likes-modal" onClick={() => setSelectedCalendarPlan(null)}>
              <div
                className="likes-modal-card calendar-plan-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="likes-modal-header">
                  <h2>{selectedCalendarPlan.title}</h2>
                  <button className="link-button" type="button" onClick={() => setSelectedCalendarPlan(null)}>
                    Close
                  </button>
                </div>
                <div className="calendar-plan-modal-body">
                  <p><strong>With:</strong> {selectedCalendarPlan.matchName}</p>
                  <p><strong>Date:</strong> {formatCalendarEntryLabel(selectedCalendarPlan.date)}</p>
                  <p><strong>Place:</strong> {selectedCalendarPlan.place}</p>
                  <p>{selectedCalendarPlan.description}</p>
                  <button
                    className="primary-button tile-button"
                    type="button"
                    disabled={!canOpenChatForSelectedPlan}
                    onClick={() => {
                      if (!selectedCalendarMatchId) {
                        return;
                      }

                      setSelectedMatchId(selectedCalendarMatchId);
                      setSelectedCalendarPlan(null);
                      setActiveTab('chats');
                    }}
                  >
                    Go to chat
                  </button>
                  <button
                    className="secondary-button tile-button"
                    type="button"
                    onClick={() => void handleDeleteCalendarPlan(selectedCalendarPlan)}
                  >
                    Delete date
                  </button>
                  {!canOpenChatForSelectedPlan ? (
                    <p className="account-detail">Chat is only available for active mutual matches.</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </>
      );
    }

    if (activeTab === 'planner') {
      const selectedPlannerMatch =
        matchedDaters.find((dater) => dater.id === selectedPlannerMatchId) || null;
      const plannerPrompts = buildPlannerPrompts(profile, selectedPlannerMatch);
      const hasPlannerSessionStarted = plannerMessages.some((message) => message.role === 'user');

      return (
        <>
          {!isGeminiConfigured ? (
            <p className="planner-helper-text">
              Add <code>VITE_GEMINI_API_KEY</code> to <code>gator-dater-app/.env</code> to enable the chatbot.
            </p>
          ) : null}
          {!matchedDaters.length ? (
            <p className="planner-helper-text">
              Match with someone first to plan a date together!
            </p>
          ) : (
            <section className="home-tile">
              <label className="account-label" htmlFor="planner-match-select">
                Plan for a specific match
              </label>
              <select
                id="planner-match-select"
                className="preferences-select"
                value={selectedPlannerMatchId}
                onChange={(event) => setSelectedPlannerMatchId(event.target.value)}
                disabled={plannerLoading}
              >
                {matchedDaters.map((dater) => (
                  <option key={dater.id} value={dater.id}>
                    {dater.name}
                  </option>
                ))}
              </select>
            </section>
          )}

          {!hasPlannerSessionStarted ? (
            <section className="prompt-grid">
              {plannerPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  className="prompt-button"
                  type="button"
                  onClick={() => void handlePlannerPromptClick(prompt.prompt)}
                  disabled={plannerLoading || !matchedDaters.length}
                >
                  <p>{prompt.label}</p>
                  <img src={searchImg} alt="Search" className="Search" />
                </button>
              ))}
            </section>
          ) : null}

          <section className="chat">
            <div className="chat-section planner-chat-section" ref={plannerChatRef}>
              {plannerMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === 'assistant'
                      ? `message-from-other${message.dateOptions?.length ? ' planner-response-message' : ''}`
                      : 'message-from-user'
                  }
                >
                  <p>{message.text}</p>
                  {message.role === 'assistant' && message.dateOptions?.length ? (
                    <div className="planner-option-list">
                      {message.dateOptions.map((option, optionIndex) => {
                        const isSavingThisOption =
                          pendingCalendarSave?.messageIndex === index &&
                          pendingCalendarSave?.optionIndex === optionIndex;

                        return (
                          <article key={`${option.title}-${optionIndex}`} className="home-tile planner-date-block">
                            <h3>{option.title}</h3>
                            <p>{option.place}</p>
                            <p>{option.description}</p>
                            <p>{option.whyItFits}</p>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => handleStartCalendarSave(index, optionIndex)}
                            >
                              Add to calendar
                            </button>
                            {isSavingThisOption ? (
                              <div className="planner-calendar-save">
                                <label htmlFor={`planner-date-${index}-${optionIndex}`}>
                                  Pick a date
                                </label>
                                <input
                                  id={`planner-date-${index}-${optionIndex}`}
                                  type="date"
                                  value={pendingCalendarSave.date}
                                  onChange={(event) =>
                                    setPendingCalendarSave((current) =>
                                      current
                                        ? {
                                          ...current,
                                          date: event.target.value,
                                        }
                                        : current,
                                    )
                                  }
                                />
                                <button
                                  className="primary-button"
                                  type="button"
                                  onClick={() =>
                                    handleConfirmCalendarSave(
                                      option,
                                      selectedPlannerMatch?.id || '',
                                      selectedPlannerMatch?.name || 'your match',
                                    )
                                  }
                                  disabled={!pendingCalendarSave.date}
                                >
                                  Save date
                                </button>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
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
                placeholder={matchedDaters.length ? 'Ask for date ideas for this match...' : 'Match with someone first!'}
                value={plannerInput}
                onChange={(event) => setPlannerInput(event.target.value)}
                disabled={!isGeminiConfigured || plannerLoading || !matchedDaters.length}
              />
              <button
                className="submit-button"
                type="submit"
                disabled={!isGeminiConfigured || plannerLoading || !plannerInput.trim() || !matchedDaters.length}
              >
                <img src={submitImg} alt="Send" className="send-icon" />
              </button>
            </form>
          </section>
        </>
      );
    }

    if (activeTab === 'chats') {
      const selectedMatch = matchedDaters.find((dater) => dater.id === selectedMatchId) || null;

      if (!selectedMatch) {
        return (
          <section className="home-grid">
            {matchedDaters.length ? (
              matchedDaters.map((dater) => (
                <article
                  key={dater.id}
                  className="chat-match-row"
                  onClick={() => {
                    setChatError('');
                    setSelectedMatchId(dater.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      setChatError('');
                      setSelectedMatchId(dater.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {dater.photoUrl ? (
                    <img
                      src={dater.photoUrl}
                      alt={`${dater.name} profile`}
                      className="profile-circle-mini profile-circle-mini-image"
                    />
                  ) : (
                    <div className="profile-circle-mini" />
                  )}
                  <div className="chat-text-meta">
                    <h3 className="chat-name">{dater.name}</h3>
                    <p className="chat-preview">Open conversation</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="account-detail">No mutual matches yet. Chats appear once both users like each other.</p>
            )}
          </section>
        );
      }

      return (
        <section className="chat no-scroll">
          <div className="chat-thread-top">
            <button className="chat-back-link" type="button" onClick={() => {
              setChatError('');
              setSelectedMatchId('');
            }}>
              <img src={backArrrow} alt="Back" className="chat-back-icon" />
              <span>Back to matches</span>
            </button>
            <h3 className="chat-thread-name">{selectedMatch.name}</h3>
          </div>
          <div className="chat-section">
            {chatMessages.length ? (
              chatMessages.map((message) => {
                const isCurrentUserMessage = message.senderId === currentUser?.uid;
                const otherUserReadAt = selectedMatch ? conversationReadBy[selectedMatch.id] || 0 : 0;
                const messageStatus = isCurrentUserMessage
                  ? otherUserReadAt >= message.sentAt
                    ? 'Viewed'
                    : 'Sent'
                  : '';
                const timeLabel = formatChatTime(message.sentAt);

                return (
                  <div
                    key={message.id}
                    className={isCurrentUserMessage ? 'message-from-user' : 'message-from-other'}
                    data-status={message.status || ''}
                  >
                    <p>{message.text}</p>
                    <span className="chat-message-meta">
                      {timeLabel}
                      {messageStatus ? ` • ${messageStatus}` : ''}
                      {message.status === 'failed' ? ' • Failed' : ''}
                    </span>
                    {isCurrentUserMessage && message.status === 'failed' ? (
                      <button
                        className="chat-retry-button"
                        type="button"
                        onClick={() => handleRetryChatMessage(message)}
                      >
                        Retry
                      </button>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="account-detail">No messages yet. Say hi.</p>
            )}
          </div>

          <form className="chat-input" onSubmit={handleSendChatMessage}>
            <input
              type="text"
              value={chatDraft}
              onChange={(event) => setChatDraft(event.target.value)}
              placeholder={`Message ${selectedMatch.name}`}
            />
            <button className="submit-button" type="submit" disabled={!chatDraft.trim()}>
              <img src={submitImg} alt="Send" className="send-icon" />
            </button>
          </form>
          {chatError ? <p className="error-text chat-error-line">{chatError}</p> : null}
        </section>
      );
    }

    if (activeTab === 'profile-tab') {
      const selfPreviewDater: Dater = {
        id: currentUser?.uid || 'self-preview',
        name: profile?.fullName || currentUser?.displayName || 'User',
        age: profile?.age || 18,
        yearAtUf: profile?.yearAtUf || 'UF Student',
        bio: profile?.bio || 'Add a bio so other users can get to know you.',
        compatibility: 100,
        vibe: profile?.preferences.vibeWords?.[0] || profile?.dateVibe?.[0] || 'Good energy',
        interests: profile?.interests || [],
        dateBudget: profile?.dateBudget || 'low',
        dateVibe: profile?.dateVibe || [],
        availability: profile?.availability || [],
        photoUrl: activeProfilePhoto,
      };

      return (
        <>
          <section className="intro-profile-panel">
            {activeProfilePhoto ? (
              <div className="profile-photo-wrap">
                <img
                  src={activeProfilePhoto}
                  alt={`${profile?.fullName || currentUser?.displayName || 'User'} profile`}
                  className="profile-photo"
                  onClick={() => setProfilePreviewOpen(true)}
                />
                <button
                  className="profile-photo-edit-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    profilePhotoInputRef.current?.click();
                  }}
                  aria-label="Edit profile photo"
                >
                  <img src={writeImg} alt="" className="profile-photo-edit-icon" />
                </button>
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
          </section>
          {profilePreviewOpen ? (
            <div className="likes-modal" onClick={() => setProfilePreviewOpen(false)}>
              <div
                className="likes-modal-card profile-preview-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="likes-modal-header">
                  <h2>Profile Preview</h2>
                  <button className="link-button" type="button" onClick={() => setProfilePreviewOpen(false)}>
                    Close
                  </button>
                </div>
                <section className="swipe-stack profile-preview-stack">
                  <article
                    className="swipe-card profile-preview-swipe-card"
                    style={{
                      backgroundImage: selfPreviewDater.photoUrl ? `url(${selfPreviewDater.photoUrl})` : 'none',
                    }}
                  >
                    <div className="swipe-overlay">
                      <p>{selfPreviewDater.compatibility}% match</p>
                      <h2>
                        {selfPreviewDater.name}, {selfPreviewDater.age}
                      </h2>
                      <p>{selfPreviewDater.yearAtUf}</p>
                      <p className="swipe-vibe">{selfPreviewDater.vibe}</p>
                      <p>{selfPreviewDater.bio}</p>
                    </div>
                  </article>
                </section>
              </div>
            </div>
          ) : null}
          <section className="home-grid">
            <article className="profile-tile">
              <h3 style={{ textDecoration: 'underline' }}>About Me</h3>
              <p>{profile?.yearAtUf || 'UF Student'}</p>
              <p>{profile?.age ? `${profile.age} years old` : '*Add more details to make matching better.*'}</p>
              <p>{profile?.birthDate ? `Birthday: ${formatCalendarEntryLabel(profile.birthDate)}` : '*Add your birthday*'}</p>
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
                Edit Profile & Preferences
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
                View Matches ({matchedDaters.length})
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
            <article
              className="swipe-card"
              style={{
                backgroundImage: `url(${currentDater.photoUrl})`,
              }}
            >
              <div className="swipe-overlay">
                <p>{currentDater.compatibility}% match</p>
                <h2>
                  {currentDater.name}, {currentDater.age}
                </h2>
                <p>{currentDater.yearAtUf}</p>
                <p className="swipe-vibe">{currentDater.vibe}</p>
                <p>{currentDater.bio}</p>
              </div>
            </article>
          ) : (
            <article className="swipe-card done-card">
              <p className="account-label">All caught up</p>
              <h3>No more daters right now</h3>
              <p>Check back later or refresh the deck when new people are available.</p>
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

    let matchedOnThisLike = false;

    if (currentUser && profile) {
      const currentUserRef = db ? doc(db, 'users', currentUser.uid) : null;
      const nextProfile = { ...profile, likedUsers: nextLikedUserIds };
      setProfile(nextProfile);
      saveLocalProfile(currentUser.uid, nextProfile);

      if (db && discoveryFeedSource === 'firestore') {
        try {
          const likedUserSnap = await getDoc(doc(db, 'users', currentDater.id));
          const likedUserProfile = likedUserSnap.exists()
            ? normalizeUserProfile(likedUserSnap.data() as Partial<UserProfile>, currentDater.id)
            : null;
          const matchedBack = !!likedUserProfile?.likedUsers.includes(currentUser.uid);
          const conversationId = getConversationId(currentUser.uid, currentDater.id);

          const nextMatches = matchedBack
            ? Array.from(new Set([...(profile.matches || []), currentDater.id]))
            : profile.matches || [];
          const nextConversations = matchedBack
            ? {
              ...(profile.conversations || {}),
              [currentDater.id]: conversationId,
            }
            : (profile.conversations || {});

          const likedUserMatches = matchedBack && likedUserProfile
            ? Array.from(new Set([...(likedUserProfile.matches || []), currentUser.uid]))
            : likedUserProfile?.matches || [];
          const likedUserConversations = matchedBack && likedUserProfile
            ? {
              ...(likedUserProfile.conversations || {}),
              [currentUser.uid]: conversationId,
            }
            : (likedUserProfile?.conversations || {});

          if (matchedBack && currentUserRef && likedUserSnap.exists()) {
            const likedUserRef = doc(db, 'users', currentDater.id);
            const conversationRef = doc(db, 'conversations', conversationId);
            const batch = writeBatch(db);

            batch.set(
              currentUserRef,
              {
                likedUsers: nextLikedUserIds,
                matches: nextMatches,
                conversations: nextConversations,
              },
              { merge: true },
            );
            batch.set(
              likedUserRef,
              {
                matches: likedUserMatches,
                conversations: likedUserConversations,
              },
              { merge: true },
            );
            batch.set(conversationRef, buildConversationPayload(currentUser.uid, currentDater.id), { merge: true });

            await batch.commit();

            const matchedProfile = {
              ...nextProfile,
              matches: nextMatches,
              conversations: nextConversations,
            };
            setProfile(matchedProfile);
            saveLocalProfile(currentUser.uid, matchedProfile);
            setMatchedDaters((current) =>
              current.some((dater) => dater.id === currentDater.id)
                ? current
                : [currentDater, ...current],
            );
            matchedOnThisLike = true;
            setStatus('It\'s a match!');
          } else if (currentUserRef) {
            await setDoc(
              currentUserRef,
              { likedUsers: nextLikedUserIds },
              { merge: true },
            );
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
      matchedOnThisLike
        ? current.filter((dater) => dater.id !== currentDater.id)
        : current.some((dater) => dater.id === currentDater.id)
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
      <div className="screen info-screen pref">
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
            What's your birthday?
            <input
              type="date"
              max={getLatestAllowedBirthDate()}
              value={profileForm.birthDate}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, birthDate: event.target.value }))
              }
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
                Birthday
                <input
                  type="date"
                  max={getLatestAllowedBirthDate()}
                  value={profileForm.birthDate}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, birthDate: event.target.value }))
                  }
                  required
                />
              </label>
              <p className="account-detail">
                {profileForm.birthDate
                  ? `Current age: ${calculateAgeFromBirthDate(profileForm.birthDate)}`
                  : 'Your age will be calculated automatically from your birthday.'}
              </p>
              <label>
                Year at UF
                <select
                  className="preferences-select"
                  value={profileForm.yearAtUf}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, yearAtUf: event.target.value }))
                  }
                >
                  <option value="">Select your year</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
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
        <div style={{ height: '18cqh' }} />
        <button className="primary-button all-set-continue" type="button" onClick={handleContinueFromAllSet}>
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
                    {dater.photoUrl ? (
                      <div className="profile-photo-wrap">
                        <img
                          src={dater.photoUrl}
                          alt={`${dater.name} profile`}
                          className="profile-photo liked-profile-photo"
                        />
                      </div>
                    ) : null}
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
                    {dater.photoUrl ? (
                      <div className="profile-photo-wrap">
                        <img
                          src={dater.photoUrl}
                          alt={`${dater.name} profile`}
                          className="profile-photo liked-profile-photo"
                        />
                      </div>
                    ) : null}
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
