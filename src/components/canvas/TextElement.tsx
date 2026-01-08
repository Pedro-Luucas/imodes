'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Group, Text } from 'react-konva';
import Konva from 'konva';
import { useTranslations } from 'next-intl';
import { TextElement as TextElementType } from '@/types/canvas';

interface TextElementProps {
  element: TextElementType;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onTextChange: (id: string, text: string) => void;
  onEditStateChange: (id: string, isEditing: boolean) => void;
}

// Parse text for bold (*text*) and underline (_text_) formatting
function parseFormattedText(text: string): { text: string; isBold: boolean; isUnderline: boolean }[] {
  const segments: { text: string; isBold: boolean; isUnderline: boolean }[] = [];
  
  // Simple regex-based parsing for *bold* and _underline_ markers
  const boldRegex = /\*([^*]+)\*/g;
  const underlineRegex = /_([^_]+)_/g;
  
  let lastIndex = 0;
  let processedText = text;
  
  // This is a simplified approach - just mark segments
  // For a full implementation, you'd want to properly parse nested formatting
  const matches: { start: number; end: number; text: string; isBold: boolean; isUnderline: boolean }[] = [];
  
  let match;
  while ((match = boldRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
      isBold: true,
      isUnderline: false,
    });
  }
  
  boldRegex.lastIndex = 0;
  
  while ((match = underlineRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
      isBold: false,
      isUnderline: true,
    });
  }
  
  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);
  
  // Build segments
  lastIndex = 0;
  for (const m of matches) {
    if (m.start > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, m.start),
        isBold: false,
        isUnderline: false,
      });
    }
    segments.push({
      text: m.text,
      isBold: m.isBold,
      isUnderline: m.isUnderline,
    });
    lastIndex = m.end;
  }
  
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isBold: false,
      isUnderline: false,
    });
  }
  
  if (segments.length === 0) {
    segments.push({ text, isBold: false, isUnderline: false });
  }
  
  return segments;
}

export function TextElementComponent({
  element,
  isSelected,
  onSelect,
  onDragEnd,
  onTextChange,
  onEditStateChange,
}: TextElementProps) {
  const t = useTranslations('canvas.textElement');
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isInitializedRef = useRef(false);
  const [text, setText] = useState(element.text);
  const [isEditing, setIsEditing] = useState(element.isEditing || false);

  // Sync external text changes (but not while editing to avoid interfering with typing)
  useEffect(() => {
    if (!isEditing) {
      setText(element.text);
    }
  }, [element.text, isEditing]);

  // Sync external editing state
  useEffect(() => {
    setIsEditing(element.isEditing || false);
  }, [element.isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    onEditStateChange(element.id, true);
  };

  const handleTextChangeInternal = useCallback((newText: string) => {
    setText(newText);
    onTextChange(element.id, newText);
  }, [element.id, onTextChange]);

  // Handle textarea editing
  useEffect(() => {
    if (isEditing && groupRef.current) {
      const stage = groupRef.current.getStage();
      if (!stage) return;
      
      // Create textarea if it doesn't exist
      let textarea = textareaRef.current || document.getElementById(`text-input-${element.id}`) as HTMLTextAreaElement;
      
      if (!textarea) {
        textarea = document.createElement('textarea');
        textarea.id = `text-input-${element.id}`;
        textarea.style.position = 'absolute';
        textarea.style.border = '2px dashed #3b82f6';
        textarea.style.borderRadius = '4px';
        textarea.style.padding = '4px';
        textarea.style.margin = '0';
        textarea.style.overflow = 'auto';
        textarea.style.overflowY = 'hidden';
        textarea.style.background = 'transparent';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.fontFamily = 'Inter, sans-serif';
        textarea.style.fontSize = `${element.fontSize}px`;
        textarea.style.fontWeight = element.isBold ? '700' : '400';
        textarea.style.textDecoration = element.isUnderline ? 'underline' : 'none';
        textarea.style.lineHeight = '1.4';
        textarea.style.color = element.color;
        textarea.style.minWidth = '200px';
        textarea.style.minHeight = '40px';
        textarea.style.zIndex = '1000';
        textarea.style.whiteSpace = 'pre-wrap';
        textarea.style.wordWrap = 'break-word';
        textarea.style.boxSizing = 'border-box';
        document.body.appendChild(textarea);
        textareaRef.current = textarea;
      }

      // Position and size textarea dynamically
      const updateTextareaPosition = () => {
        if (!groupRef.current || !textarea) return;
        
        const group = groupRef.current;
        const stageBox = stage.container().getBoundingClientRect();
        
        const scaleX = stage.scaleX();
        const scaleY = stage.scaleY();
        
        // Get position in screen coordinates
        const groupBox = group.getClientRect({ skipTransform: false });
        const screenX = stageBox.left + groupBox.x;
        const screenY = stageBox.top + groupBox.y;

        textarea.style.left = `${screenX}px`;
        textarea.style.top = `${screenY}px`;
        textarea.style.fontSize = `${element.fontSize * scaleX}px`;
      };

      // Auto-resize textarea to fit content
      const resizeTextarea = () => {
        if (!textarea) return;
        
        const scaleX = stage.scaleX();
        const scaleY = stage.scaleY();
        
        // Apply minimum sizes (scaled)
        const minWidth = 200 * scaleX;
        const minHeight = 40 * scaleY;
        
        // First, set height to auto to measure the required height for current width
        textarea.style.height = 'auto';
        textarea.style.overflowY = 'hidden';
        
        // Measure the scroll height (actual content height)
        const contentHeight = textarea.scrollHeight;
        
        // Set the height to fit content
        textarea.style.height = `${Math.max(minHeight, contentHeight + 4)}px`;
        
        // For width, measure the longest line
        const lines = textarea.value.split('\n');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          context.font = textarea.style.font || `${element.fontSize * scaleX}px Inter, sans-serif`;
          let maxWidth = minWidth;
          lines.forEach(line => {
            const metrics = context.measureText(line);
            const lineWidth = metrics.width + 40; // Add padding
            if (lineWidth > maxWidth) {
              maxWidth = lineWidth;
            }
          });
          textarea.style.width = `${maxWidth}px`;
        } else {
          // Fallback if canvas is not available
          textarea.style.width = `${Math.max(minWidth, textarea.scrollWidth + 20)}px`;
        }
        
        // Update position after resize
        updateTextareaPosition();
      };

      updateTextareaPosition();
      
      // Only set initial value when textarea is first created
      if (!isInitializedRef.current) {
        textarea.value = text;
        // Initial resize to fit existing text
        requestAnimationFrame(() => {
          resizeTextarea();
        });
        textarea.focus();
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
        isInitializedRef.current = true;
      }

      // Handle text input
      const handleInput = (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        handleTextChangeInternal(target.value);
        
        // Auto-resize textarea to fit content
        requestAnimationFrame(() => {
          resizeTextarea();
        });
      };

      // Handle blur - finish editing
      const handleBlur = () => {
        setIsEditing(false);
        onEditStateChange(element.id, false);
      };

      // Handle keyboard shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleBlur();
        }
      };

      textarea.addEventListener('input', handleInput);
      textarea.addEventListener('blur', handleBlur);
      textarea.addEventListener('keydown', handleKeyDown);

      // Update position and size on stage drag/zoom/scale changes
      const updatePosition = () => {
        resizeTextarea();
      };
      stage.on('dragmove', updatePosition);
      stage.on('wheel', updatePosition);

      return () => {
        textarea.removeEventListener('input', handleInput);
        textarea.removeEventListener('blur', handleBlur);
        textarea.removeEventListener('keydown', handleKeyDown);
        stage.off('dragmove', updatePosition);
        stage.off('wheel', updatePosition);
        
        if (textarea && textarea.parentNode) {
          textarea.parentNode.removeChild(textarea);
        }
        textareaRef.current = null;
        isInitializedRef.current = false;
      };
    } else {
      // Remove textarea when not editing
      const textarea = textareaRef.current || document.getElementById(`text-input-${element.id}`);
      if (textarea && textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
        textareaRef.current = null;
        isInitializedRef.current = false;
      }
    }
  }, [isEditing, element.id, element.fontSize, element.color, element.isBold, element.isUnderline, handleTextChangeInternal, onEditStateChange, text]);

  // Get display text (process formatting markers for display)
  const getDisplayText = () => {
    if (!text) return t('clickToEdit') || 'Click to edit';
    // Remove formatting markers for display (Konva Text doesn't support inline formatting)
    return text.replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1');
  };

  // Check if text has any bold markers
  const hasBoldMarkers = text.includes('*') && /\*([^*]+)\*/.test(text);
  // Check if text has any underline markers  
  const hasUnderlineMarkers = text.includes('_') && /_([^_]+)_/.test(text);

  return (
    <Group
      ref={groupRef}
      x={element.x}
      y={element.y}
      draggable={!isEditing}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      onDragEnd={(e) => {
        onDragEnd(element.id, e.target.x(), e.target.y());
      }}
    >
      {/* Text Display (when not editing) */}
      {!isEditing && (
        <Text
          ref={textRef}
          text={getDisplayText()}
          fontSize={element.fontSize}
          fontFamily="Inter, sans-serif"
          fontStyle={hasBoldMarkers || element.isBold ? 'bold' : 'normal'}
          textDecoration={hasUnderlineMarkers || element.isUnderline ? 'underline' : ''}
          fill={text ? element.color : '#71717a'}
          lineHeight={1.4}
          align="left"
          verticalAlign="top"
          shadowColor={isSelected ? '#3b82f6' : 'transparent'}
          shadowBlur={isSelected ? 8 : 0}
          shadowOpacity={0.5}
        />
      )}
    </Group>
  );
}

