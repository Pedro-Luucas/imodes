/**
 * Script to upload card text files to Supabase storage
 * Usage: node scripts/upload-card-text.mjs <category> <locale>
 * Example: node scripts/upload-card-text.mjs needs en
 * 
 * Reads from stdin or uses default text for needs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default text for needs/en
const needsEnText = `Bernstein iModes
Needs - Male Version
This set contains the following cards:
1 Attachment
2 Autonomy
3 Expression of feelings and needs
4 Spontaneity and play
5 Limits
6 Justice
7 Meaningful World
8 Coherent Self














1
Attachment
Safety, stability, emotional connection, acceptance

2
Autonomy
Independence, goal directedness, performance

3
Expression of feelings and needs
Emotional expression, expression of feelings and needs, understanding, validation

4
Spontaneity and play
Playfulness, joy, pleasure, relaxation

5
Limits
Acceptance of limits, self-control, self-discipline, responsibility

6
Justice
Fairness, equality, impartiality, morality

7
Meaningful World
Can make sense of his experiences and surroundings. Finds meaning and purpose in life.

8
Coherent Self
Knows and understands himself. Has a clear sense of who he is.





`;

async function uploadCardText(category, locale, text) {
  // Load environment variables from .env.local
  let envVars = {};
  try {
    const envPath = join(__dirname, '..', '.env.local');
    const envFile = readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          envVars[key] = value;
        }
      }
    });
  } catch (error) {
    console.warn('Could not read .env.local, trying process.env...');
  }

  const supabaseUrl = envVars.SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables.');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const BUCKET_NAME = 'modes_cards';
  
  // Build text file path based on category (same logic as the API route)
  let filePath;
  if (category === 'boat') {
    filePath = `boat/text/${locale}/Text_Boat_${locale === 'en' ? 'English' : 'Portuguese'}.txt`;
  } else if (category === 'wave') {
    filePath = `wave/text/${locale}/Text_Wave_${locale === 'en' ? 'English' : 'Portuguese'}.txt`;
  } else {
    filePath = `${category}/text/${locale}.txt`;
  }

  console.log(`Uploading ${filePath} to bucket ${BUCKET_NAME}...`);

  // Convert text to buffer
  const buffer = Buffer.from(text, 'utf-8');

  // Upload file
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: 'text/plain',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error('Error uploading file:', error);
    process.exit(1);
  }

  console.log('✅ Successfully uploaded card text file!');
  console.log(`   Path: ${filePath}`);
}

// Get command line arguments
const category = process.argv[2];
const locale = process.argv[3];

if (!category || !locale) {
  console.error('Usage: node scripts/upload-card-text.mjs <category> <locale>');
  console.error('Example: node scripts/upload-card-text.mjs needs en');
  process.exit(1);
}

// Use default text for needs/en, otherwise would read from stdin or file
let text = needsEnText;
if (category === 'needs' && locale === 'en') {
  text = needsEnText;
} else {
  console.error('Currently only supports needs/en. Add more text here or modify to read from file.');
  process.exit(1);
}

uploadCardText(category, locale, text).catch(console.error);

