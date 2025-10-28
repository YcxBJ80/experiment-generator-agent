# Environment Variable Setup Guide

To run the project locally, create a `.env` file and populate the environment variables below.

## Create the `.env` file

Add a `.env` file in the project root. The file is ignored by Git, so it will not be committed.

## Required variables

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://openrouter.ai/api/v1

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Authentication Configuration
JWT_SECRET=replace_with_strong_random_secret

# Other configurations
NODE_ENV=development
```

## Obtaining API keys

### OpenAI API key
1. Visit the [OpenAI Platform](https://platform.openai.com/api-keys).
2. Sign in and create a new API key.
3. Copy the key into `OPENAI_API_KEY`.

### Supabase settings
1. Open the [Supabase Dashboard](https://app.supabase.com).
2. Create a project or pick an existing one.
3. Navigate to **Settings > API** to find the project URL and anon key.
4. Copy them into `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## Notes

- Never commit the `.env` file to version control.
- If you deploy with Vercel, configure these variables in the Vercel dashboard.
- For other hosting platforms, follow their documentation to provide the same values.
