# AI Personality Pal

Create your digital twin powered by AI! This application allows you to create a personalized AI avatar that mimics your communication style, interests, and personality.

## Features

- Create a digital twin by providing your bio, interests, and preferences
- Optional integration with Spotify (music preferences) and Letterboxd (movie preferences)
- Chat with your AI twin in real-time
- Personalized responses based on your personality profile
- Modern, responsive UI built with Next.js and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM
- **AI**: OpenAI GPT-4o
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Neon account)
- OpenAI API key
- Spotify API credentials (optional)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ai-personality-pal.git
   cd ai-personality-pal
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   ```bash
   cp .env.example .env.local
   ```
   
   Then edit `.env.local` with your credentials.

4. Set up the database
   ```bash
   npm run db:push
   ```

5. Run the development server
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

This project is optimized for deployment on Vercel. To deploy:

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Configure environment variables in the Vercel dashboard
4. Deploy!

## Environment Variables

The following environment variables are required:

- `DATABASE_URL`: Your PostgreSQL connection string
- `OPENAI_API_KEY`: Your OpenAI API key
- `NEXTAUTH_SECRET`: A secret key for NextAuth.js
- `NEXTAUTH_URL`: Your application URL

Optional variables:

- `SPOTIFY_CLIENT_ID`: Spotify API client ID
- `SPOTIFY_CLIENT_SECRET`: Spotify API client secret
- `SPOTIFY_REDIRECT_URI`: Spotify OAuth redirect URI

## License

This project is licensed under the MIT License - see the LICENSE file for details.
