# Internationalization (i18n) with Crowdin

This project uses [next-intl](https://next-intl-docs.vercel.app/) for internationalization and [Crowdin](https://crowdin.com/) for translation management.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create a Crowdin project:**
   - Go to https://crowdin.com/
   - Create a new project
   - Copy your project ID and add it to `crowdin.yml`

3. **Install Crowdin CLI:**
   ```bash
   npm install -g @crowdin/cli
   ```

4. **Configure Crowdin API token:**
   Create a `.crowdin-cli.yml` file in your home directory:
   ```yaml
   api_token: your-api-token-here
   ```

## Usage

### Upload source files to Crowdin:
```bash
crowdin upload sources
```

### Download translations from Crowdin:
```bash
crowdin download
```

### Add a new language:
1. Add the language code to `i18n.ts`:
   ```typescript
   export const locales = ['en', 'fr', 'es'] as const;
   ```

2. Create a new message file:
   ```bash
   cp messages/en.json messages/es.json
   ```

3. Add the language to `crowdin.yml` export_languages list

4. Upload to Crowdin:
   ```bash
   crowdin upload sources
   ```

## Translation Files

All translation files are located in the `/messages` directory:
- `en.json` - English (source language)
- `fr.json` - French
- Add more languages as needed

## How next-intl Works

### Server Components:
```typescript
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('HomePage');
  return <h1>{t('title')}</h1>;
}
```

### Client Components:
```typescript
'use client';
import { useTranslations } from 'next-intl';

export default function Component() {
  const t = useTranslations('HomePage');
  return <h1>{t('title')}</h1>;
}
```

## URL Structure

- Default locale (English): `/` or `/login`
- Other locales: `/fr` or `/fr/login`

The middleware automatically detects the user's preferred language from their browser settings.

## Best Practices

1. Always use translation keys instead of hardcoded text
2. Keep translation keys descriptive and organized
3. Test all languages before deployment
4. Use Crowdin's context feature to provide translators with screenshots
5. Review translations before publishing

## Integration with GitHub

You can set up automatic synchronization between GitHub and Crowdin:

1. Go to your Crowdin project settings
2. Navigate to Integrations > GitHub
3. Connect your repository
4. Configure automatic upload on commit and download translations as pull requests
