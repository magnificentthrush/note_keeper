# Frontend Structure

This document outlines the reorganized frontend architecture for better maintainability and scalability.

## 📁 Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── lecture/           # Lecture viewing pages
│   ├── profile/           # User profile page
│   ├── record/            # Recording page
│   └── layout.tsx         # Root layout
│
├── components/
│   ├── ui/                # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   └── index.ts       # Barrel exports
│   │
│   ├── layout/            # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── BottomNav.tsx
│   │   └── index.ts
│   │
│   └── features/          # Feature-specific components
│       ├── lecture/
│       │   ├── LectureCard.tsx
│       │   ├── NoteRenderer.tsx
│       │   └── index.ts
│       │
│       └── recording/
│           ├── Recorder.tsx
│           ├── KeypointInput.tsx
│           └── index.ts
│
├── hooks/                 # Custom React hooks (future)
│
├── lib/                   # Library code
│   ├── supabase/         # Supabase clients
│   └── types.ts          # TypeScript types
│
└── utils/                # Utility functions
    └── date.ts           # Date formatting utilities
```

## 🎨 Component Organization

### UI Components (`components/ui/`)
Reusable, unstyled base components that follow design system principles:
- **Button**: Multiple variants (primary, secondary, danger, ghost)
- **Card**: Container component with variants
- **Badge**: Status indicators with icons
- **Modal**: Dialog/overlay component
- **Input**: Form input with label and error handling

### Layout Components (`components/layout/`)
Navigation and structural components:
- **Header**: Page header with title, subtitle, and actions
- **Sidebar**: Desktop navigation sidebar
- **BottomNav**: Mobile bottom navigation

### Feature Components (`components/features/`)
Feature-specific components grouped by domain:
- **lecture/**: Components related to viewing/managing lectures
- **recording/**: Components related to recording functionality

## 📝 Utilities (`utils/`)
Shared utility functions:
- **date.ts**: Date formatting functions (formatDate, formatRelativeDate, formatTime)

## 🔄 Import Patterns

Use barrel exports for cleaner imports:

```typescript
// ✅ Good - using barrel exports
import { Button, Card, Modal } from '@/components/ui';
import { Header, Sidebar } from '@/components/layout';
import { LectureCard } from '@/components/features/lecture';

// ❌ Avoid - direct file imports
import Button from '@/components/ui/Button';
```

## 🎯 Benefits of This Structure

1. **Scalability**: Easy to add new features or UI components
2. **Maintainability**: Clear separation of concerns
3. **Reusability**: UI components can be shared across features
4. **Discoverability**: Components are easy to find by type
5. **Consistency**: Shared UI components ensure design consistency

## 🚀 Future Enhancements

- Add custom hooks in `hooks/` directory
- Add more UI components (Select, Textarea, etc.)
- Create feature-specific hooks (e.g., `useLecture`, `useRecording`)
- Add storybook for component documentation

