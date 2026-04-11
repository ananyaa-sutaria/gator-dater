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
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import gatorImage from '../assets/PLEASE REPLACE.png';
import heartIcon from '../assets/heartIcon.png';
import backArrrow from '../assets/backArrowIcon.png';
import youreAllSet from '../assets/youreAllSet.png';
import './index.css';

const gatorImg = gatorImage;
const heartImg = heartIcon;
const youreAllSetImg = youreAllSet;

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
  photoUrl: string;
  intention: string;
  genderIdentity: string;
  genderPreference: string;
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
  gender: string;
  genderPreference: string;
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
  photoUrl: '',
  intention: 'open',
  genderIdentity: '',
  genderPreference: 'any',
  ageRangeMin: '18',
  ageRangeMax: '25',
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
  { value: 'friends', label: 'Friendship' },
  { value: 'casual', label: 'Casual dating' },
  { value: 'serious', label: 'Serious relationship' },
  { value: 'open', label: 'Open to anything' },
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
  { value: 'any', label: 'Any' },
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
  { value: 'low', label: '$$' },
  { value: 'mid', label: '$$$' },
];
const dateVibeOptions = [
  'Chill & lowkey',
  'Active & outdoorsy',
  'Cultural & artsy',
  'Foodie',
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
const sampleDaters: Dater[] = [
  { id: 'leah', name: 'Leah', age: 21, yearAtUf: 'Junior', bio: 'Loves bookstores, matcha, and spontaneous Gainesville adventures.', compatibility: 92, vibe: 'Low-key creative' },
  { id: 'ava', name: 'Ava', age: 20, yearAtUf: 'Sophomore', bio: 'Big on live music, sunset walks, and trying every coffee shop once.', compatibility: 88, vibe: 'Outgoing planner' },
  { id: 'jordan', name: 'Jordan', age: 22, yearAtUf: 'Senior', bio: 'Gym in the morning, tacos at night, and always down for a campus event.', compatibility: 86, vibe: 'Active and social' },
  { id: 'maya', name: 'Maya', age: 21, yearAtUf: 'Junior', bio: 'Film photos, thrift finds, and dessert-first kind of dates.', compatibility: 94, vibe: 'Artsy romantic' },
  { id: 'nina', name: 'Nina', age: 19, yearAtUf: 'Freshman', bio: 'New to UF, loves boba, study dates, and trying cute hidden spots.', compatibility: 84, vibe: 'Sweet and curious' },
  { id: 'sophia', name: 'Sophia', age: 23, yearAtUf: 'Graduate', bio: 'A good dinner reservation and an even better conversation win every time.', compatibility: 90, vibe: 'Confident foodie' },
];

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isUflEmail = (email: string) => normalizeEmail(email).endsWith('@ufl.edu');
const defaultPreferences: Preferences = {
  intention: 'open',
  genderIdentity: '',
  genderPreference: 'any',
  ageRange: { min: 18, max: 25 },
  vibeWords: [],
  socialEnergy: 50,
  dateBudget: 'low',
  dateVibe: [],
  distance: 'near',
  availability: ['either'],
  interests: [],
};
const normalizePreferences = (preferences: Partial<Preferences> | undefined): Preferences => ({
  intention: preferences?.intention || defaultPreferences.intention,
  genderIdentity: preferences?.genderIdentity || defaultPreferences.genderIdentity,
  genderPreference: preferences?.genderPreference || defaultPreferences.genderPreference,
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
    gender: rawProfile.gender || preferences.genderIdentity,
    genderPreference: rawProfile.genderPreference || preferences.genderPreference,
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
    onboardingCompleted: rawProfile.onboardingCompleted ?? false,
    createdAt: rawProfile.createdAt,
  };
};
const compareProfilesByPreferences = (current: UserProfile, candidate: UserProfile) => {
  let score = 0;

  if (current.preferences.intention === candidate.preferences.intention) {
    score += 20;
  }

  const ageOverlap =
    Math.min(current.preferences.ageRange.max, candidate.ageRange.max) -
    Math.max(current.preferences.ageRange.min, candidate.ageRange.min);

  if (ageOverlap >= 0) {
    score += 15;
  }

  const socialEnergyDelta = Math.abs(current.preferences.socialEnergy - candidate.preferences.socialEnergy);
  score += Math.max(0, 20 - Math.round(socialEnergyDelta / 5));

  const sharedVibeWords = current.preferences.vibeWords.filter((word) =>
    candidate.preferences.vibeWords.includes(word),
  ).length;
  score += Math.min(sharedVibeWords * 5, 15);

  const sharedInterests = current.preferences.interests.filter((interest) =>
    candidate.preferences.interests.includes(interest),
  ).length;
  score += Math.min(sharedInterests * 5, 30);

  return Math.min(score, 100);
};
const isOfflineFirestoreError = (value: unknown) =>
  value instanceof Error &&
  (value.message.toLowerCase().includes('client is offline') ||
    value.message.toLowerCase().includes('offline') ||
    value.message.toLowerCase().includes('unavailable'));
const getProfileStorageKey = (uid: string) => `gator-dater-profile:${uid}`;

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
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

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
      gender: profile?.gender || nextPreferences.genderIdentity,
      genderPreference: profile?.genderPreference || nextPreferences.genderPreference,
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
        gender: nextPreferences.genderIdentity,
        genderPreference: nextPreferences.genderPreference,
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
          gender: nextPreferences.genderIdentity,
          genderPreference: nextPreferences.genderPreference,
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
      intention: profile?.preferences.intention || current.intention,
      genderIdentity: profile?.preferences.genderIdentity || current.genderIdentity,
      genderPreference: profile?.preferences.genderPreference || current.genderPreference,
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
      gender: nextPreferences.genderIdentity,
      genderPreference: nextPreferences.genderPreference,
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
            ageRange: updatedProfile.ageRange,
            intention: updatedProfile.intention,
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
      where('onboardingCompleted', '==', true),
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

  const handleSignOut = async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
    setProfile(null);
    setScreen('intro');
    setStatus('Signed out.');
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
          <section className="welcome-panel">
            <p className="account-label">Calendar</p>
            <h2>Saved dates and upcoming plans</h2>
            <p className="account-detail">Keep every coffee, study date, and dinner plan in one place.</p>
          </section>

          <section className="home-grid">
            <article className="home-tile">
              <p className="account-label">Friday</p>
              <h3>Pascal's Coffeehouse</h3>
              <p>7:00 PM with Maya. Saved as a casual first date near campus.</p>
            </article>

            <article className="home-tile">
              <p className="account-label">Planner</p>
              <h3>Need another idea?</h3>
              <p>Move over to Plan to build a date around vibes, budget, and distance.</p>
            </article>
          </section>
        </>
      );
    }

    if (activeTab === 'planner') {
      return (
        <>
          <section className="welcome-panel">
            <p className="account-label">Plan the Date</p>
            <h2>AI-assisted local date ideas</h2>
            <p className="account-detail">Describe the kind of date you want and get Gainesville-friendly suggestions.</p>
          </section>

          <section className="home-grid">
            <article className="home-tile">
              <p className="account-label">Prompt</p>
              <h3>Cheap and low-key</h3>
              <p>Think coffee, a walk by Lake Alice, and dessert after if the vibe is good.</p>
            </article>

            <article className="home-tile">
              <p className="account-label">Spot idea</p>
              <h3>Depot Park picnic</h3>
              <p>Open space, easy parking, and a relaxed place to talk without pressure.</p>
            </article>
          </section>
        </>
      );
    }

    if (activeTab === 'chats') {
      return (
        <>
          <section className="welcome-panel">
            <p className="account-label">Chats</p>
            <h2>Keep the conversation moving</h2>
            <p className="account-detail">Jump back into recent messages and plan the next step.</p>
          </section>
          
          <section className="home-grid">
            <article className="home-tile">
              <p className="account-label">New</p>
              <h3>Ava</h3>
              <p>"That coffee place looks cute. Want to go Thursday?"</p>
            </article>
            <article className="home-tile">
              <p className="account-label">Unread</p>
              <h3>Jordan</h3>
              <p>"What kind of food do you usually like for first dates?"</p>
            </article>
          </section>
        </>
      );
    }

    if (activeTab === 'profile-tab') {
      return (
        <>
          <section className="welcome-panel">
            {profile?.photoUrl || currentUser?.photoURL ? (
              <div className="profile-photo-wrap">
                <img
                  src={profile?.photoUrl || currentUser?.photoURL || ''}
                  alt={`${profile?.fullName || currentUser?.displayName || 'User'} profile`}
                  className="profile-photo"
                />
              </div>
            ) : null}
            <p className="account-label">Profile</p>
            <h2>{profile?.fullName || currentUser?.displayName || currentUser?.email}</h2>
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
            <article className="home-tile">
              <p className="account-label">About</p>
              <h3>{profile?.yearAtUf || 'UF Student'}</h3>
              <p>{profile?.age ? `${profile.age} years old` : 'Add more details to make matching better.'}</p>
              <p>Intent: {profile?.intention || 'Open'}</p>
              <p>Show me: {profile?.genderPreference || 'Any'}</p>
              <p>
                Age range: {profile?.ageRange?.min || 18}-{profile?.ageRange?.max || 25}
              </p>
              <p>
                Interests: {profile?.interests.length ? profile.interests.join(', ') : 'Add interests'}
              </p>
              <p>
                Date vibe: {profile?.dateVibe.length ? profile.dateVibe.join(', ') : 'Set your date vibe'}
              </p>
              <button
                className="secondary-button tile-button"
                type="button"
                onClick={handleOpenPreferences}
              >
                Edit Preferences
              </button>
            </article>
            <article className="home-tile">
              <p className="account-label">Session</p>
              <h3>Account controls</h3>
              <p>Review your saved likes or sign out below when you are done.</p>
              <button
                className="primary-button tile-button"
                onClick={() => setLikesModalOpen(true)}
                type="button"
              >
                View Likes ({likedDaters.length})
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
        <section className="welcome-panel swipe-panel">
          <p className="account-label">Main</p>
          <h2>Swipe compatible people</h2>
          <p className="account-detail">This is the main page. Browse profiles and decide who you want to know better.</p>
        </section>
        <section className="swipe-stack">
          {currentDater ? (
            <article className="swipe-card">
              <p className="account-label">{currentDater.compatibility}% match</p>
              <h3>
                {currentDater.name}, {currentDater.age}
              </h3>
              <p>{currentDater.yearAtUf}</p>
              <p>{currentDater.bio}</p>
              <p className="swipe-vibe">{currentDater.vibe}</p>
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
          <button className="secondary-button swipe-button" type="button" onClick={handlePass} disabled={!currentDater}>
            Pass
          </button>
          <button className="primary-button swipe-button" type="button" onClick={handleLike} disabled={!currentDater}>
            Like
          </button>
        </div>
      </>
    );
  };

  const firestoreLabel =
    firestoreHealth === 'connected'
      ? 'Firestore connected'
      : firestoreHealth === 'fallback'
        ? 'Local fallback'
        : 'Firestore unknown';
  const currentDater = sampleDaters[swipeIndex] || null;

  const handleLike = () => {
    if (!currentDater) {
      return;
    }

    const nextLikedUserIds = profile?.likedUsers.includes(currentDater.id)
      ? profile.likedUsers
      : [...(profile?.likedUsers || []), currentDater.id];

    if (currentUser && profile) {
      const nextProfile = {
        ...profile,
        likedUsers: nextLikedUserIds,
      };
      setProfile(nextProfile);
      saveLocalProfile(currentUser.uid, nextProfile);

      if (db) {
        void setDoc(
          doc(db, 'users', currentUser.uid),
          { likedUsers: nextLikedUserIds },
          { merge: true },
        );
      }
    }

    setLikedDaters((current) =>
      current.some((dater) => dater.id === currentDater.id)
        ? current
        : [...current, currentDater],
    );
    setSwipeIndex((current) => current + 1);
  };

  const handlePass = () => {
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
        void setDoc(
          doc(db, 'users', currentUser.uid),
          { passedUsers: nextPassedUserIds },
          { merge: true },
        );
      }
    }

    setSwipeIndex((current) => current + 1);
  };

  const handleUnlike = (daterId: string) => {
    setLikedDaters((current) => current.filter((dater) => dater.id !== daterId));
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
          <h3>Choose your matching preferences.</h3>
        </div>
        <form className="auth-form" onSubmit={handlePreferencesSave}>
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
          <label>
            Show Me
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
            Minimum Age
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
            Maximum Age
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
          <div>
            <label>Pick up to 3 vibe words</label>
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
        <div>
          <p className="eyebrow">Gator Dator</p>
          <h1 className="script-title">Home</h1>
        </div>
        <div className="header-badges">
          <div className={firestoreHealth === 'connected' ? 'health-pill healthy' : firestoreHealth === 'fallback' ? 'health-pill warning-pill' : 'health-pill'}>
            {firestoreLabel}
          </div>
          <div className="tab-indicator">{activeTab}</div>
        </div>
      </div>
      {likesModalOpen ? (
        <div className="likes-modal">
          <div className="likes-modal-card">
            <div className="likes-modal-header">
              <div>
                <p className="account-label">Likes</p>
                <h2>Saved matches</h2>
              </div>
              <button className="link-button" type="button" onClick={() => setLikesModalOpen(false)}>
                Close
              </button>
            </div>
            {likedDaters.length ? (
              <div className="likes-list">
                {likedDaters.map((dater) => (
                  <article key={dater.id} className="liked-card">
                    <div>
                      <p className="account-label">{dater.compatibility}% match</p>
                      <h3>
                        {dater.name}, {dater.age}
                      </h3>
                      <p>{dater.yearAtUf}</p>
                      <p>{dater.vibe}</p>
                    </div>
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
      {renderTabContent()}
      <nav className="tab-bar" aria-label="Primary">
        <button
          className={activeTab === 'calendar' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('calendar')}
          type="button"
        >
          <span className="tab-icon">□</span>
          <span>Dates</span>
        </button>
        <button
          className={activeTab === 'planner' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('planner')}
          type="button"
        >
          <span className="tab-icon">✦</span>
          <span>Plan</span>
        </button>
        <button
          className={activeTab === 'swipe' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('swipe')}
          type="button"
        >
          <span className="tab-icon">♡</span>
          <span>Swipe</span>
        </button>
        <button
          className={activeTab === 'chats' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('chats')}
          type="button"
        >
          <span className="tab-icon">✉</span>
          <span>Chats</span>
        </button>
        <button
          className={activeTab === 'profile-tab' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('profile-tab')}
          type="button"
        >
          <span className="tab-icon">◌</span>
          <span>Profile</span>
        </button>
      </nav>
    </div>,
  );
}
