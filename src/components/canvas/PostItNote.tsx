'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { useTranslations } from 'next-intl';
import { PostItNote as PostItNoteType } from '@/types/canvas';

interface PostItNoteProps {
  note: PostItNoteType;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onTextChange: (id: string, text: string) => void;
  onEditStateChange: (id: string, isEditing: boolean) => void;
  onSizeChange?: (id: string, width: number, height: number) => void;
}

export function PostItNoteComponent({
  note,
  isSelected,
  onSelect,
  onDragEnd,
  onTextChange,
  onEditStateChange,
  onSizeChange,
}: PostItNoteProps) {
  const t = useTranslations('canvas.postItNote');
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isInitializedRef = useRef(false);
  const [text, setText] = useState(note.text);
  const [isEditing, setIsEditing] = useState(note.isEditing || false);

  // Sync external text changes (but not while editing to avoid interfering with typing)
  useEffect(() => {
    if (!isEditing) {
      setText(note.text);
    }
  }, [note.text, isEditing]);

  // Sync external editing state
  useEffect(() => {
    setIsEditing(note.isEditing || false);
  }, [note.isEditing]);

  // Calculate text dimensions dynamically
  const calculateDimensions = useCallback((textContent: string) => {
    if (!textContent.trim()) {
      return { width: 142, height: 100 };
    }

    const padding = 16;
    const minWidth = 142;
    const minHeight = 100;
    const lineHeight = 32;
    const maxWidth = 500; // Max width before wrapping

    // Create a temporary canvas element to measure text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { width: minWidth, height: minHeight };
    }

    ctx.font = '500 24px Inter, sans-serif';
    
    // Split text into lines and measure each
    const lines = textContent.split('\n');
    let maxLineWidth = 0;
    let totalHeight = 0;

    lines.forEach((line) => {
      if (!line.trim()) {
        totalHeight += lineHeight;
        return;
      }

      // Measure line width and handle wrapping
      const words = line.split(' ');
      let currentLine = '';
      let lineWidth = 0;

      words.forEach((word, index) => {
        const testLine = currentLine + (index > 0 ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && currentLine.length > 0) {
          // Wrap to next line
          maxLineWidth = Math.max(maxLineWidth, lineWidth);
          totalHeight += lineHeight;
          currentLine = word;
          lineWidth = ctx.measureText(word).width;
        } else {
          currentLine = testLine;
          lineWidth = testWidth;
        }
      });

      maxLineWidth = Math.max(maxLineWidth, lineWidth);
      totalHeight += lineHeight;
    });

    // Calculate note dimensions
    const width = Math.max(minWidth, Math.ceil(maxLineWidth) + padding * 2);
    const height = Math.max(minHeight, totalHeight + padding * 2);

    return { width, height };
  }, []);

  // Update size when text changes (only when not editing to avoid flicker)
  useEffect(() => {
    if (!isEditing && onSizeChange) {
      const { width, height } = calculateDimensions(text);
      if (width !== note.width || height !== note.height) {
        onSizeChange(note.id, width, height);
      }
    }
  }, [text, isEditing, note.id, note.width, note.height, calculateDimensions, onSizeChange]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    onEditStateChange(note.id, true);
  };

  const handleTextChangeInternal = useCallback((newText: string) => {
    setText(newText);
    onTextChange(note.id, newText);
  }, [note.id, onTextChange]);

  // Handle textarea editing
  useEffect(() => {
    if (isEditing && groupRef.current) {
      const stage = groupRef.current.getStage();
      if (!stage) return;
      
      // Create textarea if it doesn't exist
      let textarea = textareaRef.current || document.getElementById(`note-input-${note.id}`) as HTMLTextAreaElement;
      
      if (!textarea) {
        textarea = document.createElement('textarea');
        textarea.id = `note-input-${note.id}`;
        textarea.style.position = 'absolute';
        textarea.style.border = 'none';
        textarea.style.padding = '16px';
        textarea.style.margin = '0';
        textarea.style.overflow = 'hidden';
        textarea.style.background = '#fff085';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.fontFamily = 'Inter, sans-serif';
        textarea.style.fontSize = '24px';
        textarea.style.fontWeight = '500';
        textarea.style.lineHeight = '32px';
        textarea.style.color = '#0f0f0f';
        textarea.style.borderRadius = '16px';
        textarea.style.boxShadow = 'none';
        textarea.style.zIndex = '1000';
        textarea.style.whiteSpace = 'pre-wrap';
        textarea.style.wordWrap = 'break-word';
        document.body.appendChild(textarea);
        textareaRef.current = textarea;
      }

      // Position and size textarea
      const updateTextareaPosition = () => {
        if (!groupRef.current || !textarea) return;
        
        const group = groupRef.current;
        
        // Use Konva's getClientRect() which accounts for all transforms (position, scale, rotation)
        // This gives us the absolute screen position
        const groupBox = group.getClientRect({ skipTransform: false });
        const stageBox = stage.container().getBoundingClientRect();
        
        // Get current display dimensions to match exactly with the visual note
        const currentText = textarea.value || text;
        const { width: displayWidth, height: displayHeight } = calculateDimensions(currentText);
        
        // getClientRect returns position relative to the stage container
        // Add the container's position to get absolute screen coordinates
        const screenX = stageBox.left + groupBox.x;
        const screenY = stageBox.top + groupBox.y;
        
        // Scale dimensions to match the stage scale
        const scaleX = stage.scaleX();
        const scaleY = stage.scaleY();
        const scaledWidth = displayWidth * scaleX;
        const scaledHeight = displayHeight * scaleY;

        textarea.style.left = `${screenX}px`;
        textarea.style.top = `${screenY}px`;
        textarea.style.width = `${scaledWidth}px`;
        textarea.style.height = `${scaledHeight}px`;
      };

      updateTextareaPosition();
      
      // Only set initial value when textarea is first created
      if (!isInitializedRef.current) {
        textarea.value = text;
        textarea.focus();
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
        isInitializedRef.current = true;
      }
      // Don't update textarea.value during editing - let the user type freely

      // Handle text input
      const handleInput = (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        handleTextChangeInternal(target.value);
        
        // Auto-resize textarea height
        target.style.height = 'auto';
        const scrollHeight = target.scrollHeight;
        target.style.height = `${scrollHeight}px`;
        
        // Update note size dynamically
        if (onSizeChange) {
          const { width, height } = calculateDimensions(target.value);
          onSizeChange(note.id, width, height);
        }
        
        // Update position after size change
        requestAnimationFrame(() => {
          updateTextareaPosition();
        });
      };

      // Handle blur - finish editing
      const handleBlur = () => {
        setIsEditing(false);
        onEditStateChange(note.id, false);
      };

      // Handle keyboard shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleBlur();
        } else if (e.key === 'Enter' && !e.shiftKey && e.target === textarea) {
          // Allow Enter to create new line, only finish on blur or Escape
          // This way users can type multiple lines
        }
      };

      textarea.addEventListener('input', handleInput);
      textarea.addEventListener('blur', handleBlur);
      textarea.addEventListener('keydown', handleKeyDown);

      // Update position on stage drag/zoom/scale changes
      const updatePosition = () => {
        updateTextareaPosition();
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
      const textarea = textareaRef.current || document.getElementById(`note-input-${note.id}`);
      if (textarea && textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
        textareaRef.current = null;
        isInitializedRef.current = false;
      }
    }
  }, [isEditing, note.id, handleTextChangeInternal, onEditStateChange, calculateDimensions, onSizeChange, text]);

  // Calculate dimensions for display
  const { width: displayWidth, height: displayHeight } = calculateDimensions(text);
  const padding = 16;

  return (
    <Group
      ref={groupRef}
      x={note.x}
      y={note.y}
      draggable={!isEditing}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      onDragEnd={(e) => {
        onDragEnd(note.id, e.target.x(), e.target.y());
      }}
      shadowColor="black"
      shadowBlur={isSelected ? 10 : 5}
      shadowOpacity={isSelected ? 0.25 : 0.15}
      shadowOffsetX={0}
      shadowOffsetY={2}
    >
      {/* Post-it Background */}
      <Rect
        width={displayWidth}
        height={displayHeight}
        fill="#fff085"
        cornerRadius={16}
        stroke={isSelected ? '#2b7fff' : 'transparent'}
        strokeWidth={isSelected ? 2 : 0}
      />

      {/* Text Display (when not editing) */}
      {!isEditing && (
        <Text
          ref={textRef}
          x={padding}
          y={padding}
          width={displayWidth - padding * 2}
          text={text || t('clickToEdit')}
          fontSize={24}
          fontFamily="Inter, sans-serif"
          fontStyle="500"
          fill={text ? '#0f0f0f' : '#71717a'}
          lineHeight={32 / 24}
          align="left"
          verticalAlign="top"
          wrap="word"
        />
      )}
    </Group>
  );
}

