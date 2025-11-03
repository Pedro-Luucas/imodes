import { ParsedCardData } from '@/types/canvas';

/**
 * Parses card text files into structured card data
 * Format: Number, Name, Description (separated by newlines/empty lines)
 */
export function parseCardText(text: string): ParsedCardData[] {
  const cards: ParsedCardData[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let i = 0;
  
  // Skip header lines (everything before first number)
  while (i < lines.length && !/^\d+$/.test(lines[i])) {
    i++;
  }
  
  // Parse cards
  while (i < lines.length) {
    // Look for a number (card number)
    if (/^\d+$/.test(lines[i])) {
      const cardNumber = parseInt(lines[i], 10);
      i++;
      
      // Get card name (next non-empty line)
      if (i < lines.length && lines[i].length > 0) {
        const name = lines[i];
        i++;
        
        // Get description (next non-empty line or until next number)
        let description = '';
        while (i < lines.length && !/^\d+$/.test(lines[i])) {
          if (lines[i].length > 0) {
            if (description.length > 0) {
              description += ' ';
            }
            description += lines[i];
          }
          i++;
        }
        
        cards.push({
          number: cardNumber,
          name: name,
          description: description.trim(),
        });
      }
    } else {
      i++;
    }
  }
  
  return cards;
}

