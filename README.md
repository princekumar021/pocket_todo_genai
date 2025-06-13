# Pocket Tasks AI

An AI-powered task management application built with Next.js and Google's Gemini AI.

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Update `GEMINI_API_KEY` in `.env.local` with your API key

4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

The following environment variables are required:

- `GEMINI_API_KEY`: Your Google Gemini API key for AI functionality

Never commit `.env.local` or any other files containing actual API keys to version control.
