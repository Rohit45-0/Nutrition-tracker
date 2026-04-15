# 🥗 NutriTrack - Indian Diet Calorie & Protein Tracker

A mobile-first calorie and protein tracker designed specifically for **Indian diets**. Track your daily nutrition, set fitness goals, and get personalized recommendations.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)

## ✨ Features

- **🎯 Goal-Based Planning** — Muscle Building, Weight Loss, or Maintain
- **🇮🇳 Indian Food Database** — 100+ Indian foods with accurate nutrition data
- **🤖 AI-Powered Analysis** — GPT-4o-mini for natural language food input
- **📊 Visual Progress** — Circular calorie ring + macro progress bars
- **💧 Water Tracker** — Track daily water intake
- **📅 History** — Day-by-day logs with weekly averages & streak tracking
- **💡 Smart Tips** — Contextual Indian diet suggestions based on your goal
- **📱 Mobile-First** — Designed for phone screens with PWA support
- **🔒 No Login Required** — Data stored locally, just open and use

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Rohit45-0/Nutrition-tracker.git
cd Nutrition-tracker
npm install
```

### 2. Set up API Key (Optional)
Create a `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
```
> **Note:** The app works without an API key using the built-in Indian food database. The API key enables natural language food parsing via GPT-4o-mini.

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

## 📱 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Rohit45-0/Nutrition-tracker)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add `OPENAI_API_KEY` as environment variable (optional)
4. Deploy!

## 🍛 Supported Indian Foods

| Category | Examples |
|----------|----------|
| Breads | Roti, Paratha, Naan, Puri, Dosa, Idli |
| Rice | White Rice, Brown Rice, Biryani, Pulao, Khichdi |
| Dal & Lentils | Toor Dal, Moong Dal, Rajma, Chole, Sambar |
| Vegetables | Palak Paneer, Aloo Gobi, Mix Veg, Paneer Butter Masala |
| Non-Veg | Chicken Curry, Butter Chicken, Fish Curry, Egg Curry |
| Dairy | Milk, Curd, Paneer, Lassi, Chaas, Ghee |
| Fruits | Banana, Guava, Mango, Papaya, Apple |
| Snacks | Samosa, Poha, Upma, Dhokla, Bhel Puri |
| Supplements | Whey Protein, Protein Bar |
| Beverages | Chai, Coffee, Coconut Water, Nimbu Pani |

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **AI:** OpenAI GPT-4o-mini (optional)
- **Storage:** localStorage (Supabase integration planned)
- **Deployment:** Vercel

## 📂 Project Structure
```
src/
├── app/
│   ├── api/nutrition/route.ts   # AI nutrition API + Indian food DB
│   ├── globals.css              # Design system
│   ├── layout.tsx               # Root layout with SEO
│   └── page.tsx                 # Main app orchestrator
├── components/
│   ├── ProfileSetup.tsx         # Onboarding wizard
│   ├── Dashboard.tsx            # Daily tracking dashboard
│   ├── AddMeal.tsx              # Meal logging with quick-add
│   ├── History.tsx              # Historical data view
│   ├── Settings.tsx             # Profile & targets
│   └── BottomNav.tsx            # Mobile navigation
└── lib/
    ├── types.ts                 # TypeScript interfaces
    ├── nutrition.ts             # BMR/TDEE/macro calculations
    └── storage.ts               # localStorage persistence
```

## 🔮 Planned Features

- [ ] Supabase integration for cloud storage
- [ ] Weight progress tracking with charts
- [ ] Meal templates / favorites
- [ ] Barcode scanner for packaged foods
- [ ] Weekly/monthly nutrition reports

---

Made with ❤️ for Indian fitness enthusiasts
