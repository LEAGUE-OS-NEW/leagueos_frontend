export type BackendProfile = {
  id?: number;
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  full_name?: string;
  role?: string;
  role_display?: string;
  roles?: string[];
  is_sponsor?: boolean;
  sponsor_type?: string | null;
  club?:
    | string
    | {
        id?: number;
        name?: string;
      }
    | null;
  avatar?: string | null;
  avatar_url?: string | null;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  date_joined?: string;
  location?: string;
  favourite_sport?: string;
  favorite_sport?: string;
  bio?: string;
  gender?: string;
  date_of_birth?: string;
};

export type CurrentUser = {
  name: string;
  email: string;
  phoneNumber: string;
  fanId: string;
  location: string;
  favoriteSport: string;
  membership: string;
  avatarInitials: string;
  avatarUrl?: string | null;
  memberSince: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  primaryClubMembership: {
    clubName: string;
    tier: string;
    status: string;
    validUntil: string;
  };
  clubMemberships: Array<{
    clubName: string;
    tier: string;
    sport: string;
    validUntil: string;
  }>;
};

export const currentUser: CurrentUser = {
  name: 'Fan',
  email: 'No email available',
  phoneNumber: 'No phone number added',
  fanId: 'LOS-FAN',
  location: 'Kampala, Uganda',
  favoriteSport: 'Rugby',
  membership: 'Fan / Member',
  avatarInitials: 'F',
  avatarUrl: null,
  memberSince: 'Recently',
  isEmailVerified: false,
  isPhoneVerified: false,

  primaryClubMembership: {
    clubName: 'No club linked yet',
    tier: 'Fan Account',
    status: 'Active',
    validUntil: 'N/A',
  },

  clubMemberships: [],
};

function clean(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getName(profile?: BackendProfile | null) {
  const fullName = clean(profile?.full_name);
  const firstName = clean(profile?.first_name);
  const lastName = clean(profile?.last_name);
  const email = clean(profile?.email);

  if (fullName) return fullName;
  if (`${firstName} ${lastName}`.trim()) return `${firstName} ${lastName}`.trim();
  if (firstName) return firstName;
  if (email.includes('@')) return email.split('@')[0] ?? 'Fan';

  return currentUser.name;
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'F'
  );
}

function getClubName(club: BackendProfile["club"]) {
  if (!club) return "No club linked yet";

  if (typeof club === "string") {
    return clean(club, "No club linked yet");
  }

  return clean(club.name, "No club linked yet");
}

function formatDate(value?: string) {
  if (!value) return currentUser.memberSince;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return currentUser.memberSince;

  return new Intl.DateTimeFormat('en-UG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function mapProfileToCurrentUser(profile?: BackendProfile | null): CurrentUser {
  if (!profile) return currentUser;

  const name = getName(profile);
  const roleLabel = clean(profile.role_display || profile.role, currentUser.membership);
  const clubName = getClubName(profile.club);

  return {
    ...currentUser,
    name,
    email: clean(profile.email, currentUser.email),
    phoneNumber: clean(profile.phone_number, currentUser.phoneNumber),
    fanId: profile.id ? `LOS-FAN-${String(profile.id).padStart(6, '0')}` : currentUser.fanId,
    location: clean(profile.location, currentUser.location),
    favoriteSport: clean(profile.favourite_sport || profile.favorite_sport, currentUser.favoriteSport),
    membership: roleLabel,
    avatarInitials: getInitials(name),
    avatarUrl: clean(profile.avatar_url || profile.avatar) || null,
    memberSince: formatDate(profile.date_joined),
    isEmailVerified: Boolean(profile.is_email_verified),
    isPhoneVerified: Boolean(profile.is_phone_verified),
    primaryClubMembership: {
      clubName,
      tier: roleLabel,
      status: profile.is_email_verified ? 'Verified' : 'Pending verification',
      validUntil: 'N/A',
    },
    clubMemberships:
      clubName === 'No club linked yet'
        ? []
        : [
            {
              clubName,
              tier: roleLabel,
              sport: 'Club',
              validUntil: 'N/A',
            },
          ],
  };
}
