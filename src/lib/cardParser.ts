import { ParsedCardData } from '@/types/canvas';

/**
 * Parses card text files into structured card data
 * Supports two formats:
 * 1. Single-line format: "1 Card Name" (number and name on same line)
 * 2. Multi-line format: Number on one line, Name on next, Description follows
 */
export function parseCardText(text: string): ParsedCardData[] {
  const cards: ParsedCardData[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let i = 0;
  
  // Skip header lines (everything before first line starting with a number)
  while (i < lines.length && !/^\d+/.test(lines[i])) {
    i++;
  }
  
  // First pass: collect single-line format cards (as fallback)
  const singleLineCards: ParsedCardData[] = [];
  let tempIndex = i;
  while (tempIndex < lines.length) {
    const line = lines[tempIndex];
    const singleLineMatch = line.match(/^(\d+)[.\s]+(.+)$/);
    
    if (singleLineMatch) {
      const cardNumber = parseInt(singleLineMatch[1], 10);
      const name = singleLineMatch[2].trim();
      
      singleLineCards.push({
        number: cardNumber,
        name: name,
        description: '',
      });
      tempIndex++;
    } else if (/^\d+$/.test(line)) {
      // Found standalone number - multi-line section exists
      break;
    } else {
      tempIndex++;
    }
  }
  
  // Check if we found a multi-line section (standalone number)
  let foundMultilineSection = false;
  let multilineStartIndex = i;
  
  while (multilineStartIndex < lines.length) {
    if (/^\d+$/.test(lines[multilineStartIndex])) {
      foundMultilineSection = true;
      break;
    }
    multilineStartIndex++;
  }
  
  // If multi-line section exists, parse it (has descriptions)
  if (foundMultilineSection) {
    i = multilineStartIndex;
    
    while (i < lines.length) {
      const line = lines[i];
      
      if (/^\d+$/.test(line)) {
        const cardNumber = parseInt(line, 10);
        i++;
        
        // Get card name (next non-empty line)
        if (i < lines.length && lines[i].length > 0) {
          const name = lines[i];
          i++;
          
          // Get description (all lines until next number)
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
  } else {
    // No multi-line section, use single-line cards (boat/wave)
    cards.push(...singleLineCards);
  }
  
  return cards;
}

