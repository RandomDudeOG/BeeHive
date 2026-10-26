export interface UserProfile {
  uid: string;
  username: string;
  location: string;
  grade: number;
  interests: string[];
  bio: string;
  contact?: {
    discord?: string;
    email?: string;
    phone?: string;
  };
  followers?: string[];
  following?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  creatorId: string;
  creatorName: string;
  createdAt: any;
  likes?: string[];
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  type: 'like' | 'comment' | 'follow';
  projectId?: string;
  projectTitle?: string;
  read: boolean;
  createdAt: any;
}

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  location: string;
  type: 'internship' | 'job' | 'volunteer' | 'competition' | string;
  tags: string[];
  description: string;
  url: string;
  createdAt: any;
  savedBy?: string[];
  generatedFor?: string;
}
