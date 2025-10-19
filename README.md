# Universal Printing Press App

A production-ready web application for Universal Printing Press built with Next.js 15, TypeScript, TailwindCSS, and Supabase.

## Features

- 🎨 Modern UI with dark/light theme toggle
- 📱 Responsive design with mobile-first approach
- 🔔 Real-time toast notifications
- 📊 Dashboard with analytics and stats
- 📋 Order management system
- ✅ Task tracking and assignment
- 👥 Staff management
- 📈 Reports and analytics
- 🔐 Supabase integration for backend services

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: TailwindCSS with custom design system
- **Icons**: Heroicons
- **Backend**: Supabase
- **Notifications**: react-hot-toast
- **Theme**: next-themes

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── tasks/
│   │   ├── staff/
│   │   ├── reports/
│   │   └── layout.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   ├── providers/
│   │   └── ThemeProvider.tsx
│   └── ui/
│       ├── StatCard.tsx
│       ├── ThemeToggle.tsx
│       └── UserMenu.tsx
└── lib/
    ├── supabaseClient.ts
    └── utils.ts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Features Overview

### Dashboard
- Real-time statistics and metrics
- Recent orders and activities
- Quick action buttons
- Performance indicators

### Orders
- Order creation and management
- Customer information tracking
- Order status updates
- Payment tracking

### Tasks
- Task assignment and tracking
- Priority management
- Progress monitoring
- Team collaboration

### Staff
- Employee management
- Role assignments
- Performance tracking
- Schedule management

### Reports
- Business analytics
- Performance metrics
- Export functionality
- Custom report generation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
