'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { useTranslations } from 'next-intl';
import { PostItElement as PostItElementType } from '@/types/canvas';

interface PostItElementProps {
  element: PostItElementType;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onTextChange: (id: string, text: string) => void;
  onEditStateChange: (id: string, isEditing: boolean) => void;
}

// Fixed size for post-it notes
const POSTIT_SIZE = 200;
const POSTIT_PADDING = 16;

export function PostItElementComponent({
  element,
  isSelected,
  onSelect,
  onDragEnd,
  onTextChange,
  onEditStateChange,
}: PostItElementProps) {
  const t = useTranslations('canvas.postItElement');
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
      let textarea = textareaRef.current || document.getElementById(`postit-input-${element.id}`) as HTMLTextAreaElement;
      
      if (!textarea) {
        textarea = document.createElement('textarea');
        textarea.id = `postit-input-${element.id}`;
        textarea.style.position = 'absolute';
        textarea.style.border = 'none';
        textarea.style.padding = `${POSTIT_PADDING}px`;
        textarea.style.margin = '0';
        textarea.style.overflow = 'hidden';
        textarea.style.background = element.color;
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.fontFamily = 'Inter, sans-serif';
        textarea.style.fontSize = '18px';
        textarea.style.fontWeight = '500';
        textarea.style.lineHeight = '1.4';
        textarea.style.color = getContrastColor(element.color);
        textarea.style.borderRadius = '12px';
        textarea.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
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
        const groupBox = group.getClientRect({ skipTransform: false });
        const stageBox = stage.container().getBoundingClientRect();
        
        const screenX = stageBox.left + groupBox.x;
        const screenY = stageBox.top + groupBox.y;
        
        const scaleX = stage.scaleX();
        const scaleY = stage.scaleY();
        const scaledWidth = POSTIT_SIZE * scaleX;
        const scaledHeight = POSTIT_SIZE * scaleY;

        textarea.style.left = `${screenX}px`;
        textarea.style.top = `${screenY}px`;
        textarea.style.width = `${scaledWidth}px`;
        textarea.style.height = `${scaledHeight}px`;
        textarea.style.fontSize = `${18 * scaleX}px`;
        textarea.style.padding = `${POSTIT_PADDING * scaleX}px`;
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

      // Handle text input
      const handleInput = (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        handleTextChangeInternal(target.value);
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
      const textarea = textareaRef.current || document.getElementById(`postit-input-${element.id}`);
      if (textarea && textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
        textareaRef.current = null;
        isInitializedRef.current = false;
      }
    }
  }, [isEditing, element.id, element.color, handleTextChangeInternal, onEditStateChange, text]);

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
      shadowColor="rgba(0, 0, 0, 0.3)"
      shadowBlur={isSelected ? 15 : 8}
      shadowOpacity={isSelected ? 0.4 : 0.25}
      shadowOffsetX={0}
      shadowOffsetY={4}
    >
      {/* Post-it Background */}
      <Rect
        width={POSTIT_SIZE}
        height={POSTIT_SIZE}
        fill={element.color}
        cornerRadius={12}
        stroke={isSelected ? '#3b82f6' : 'transparent'}
        strokeWidth={isSelected ? 3 : 0}
      />

      {/* Folded corner effect */}
      <Rect
        x={POSTIT_SIZE - 20}
        y={0}
        width={20}
        height={20}
        fill={darkenColor(element.color, 15)}
        cornerRadius={[0, 12, 0, 0]}
      />

      {/* Text Display (when not editing) */}
      {!isEditing && (
        <Text
          ref={textRef}
          x={POSTIT_PADDING}
          y={POSTIT_PADDING}
          width={POSTIT_SIZE - POSTIT_PADDING * 2}
          height={POSTIT_SIZE - POSTIT_PADDING * 2}
          text={text || t('clickToEdit') || 'Click to edit'}
          fontSize={18}
          fontFamily="Inter, sans-serif"
          fontStyle="500"
          fill={text ? getContrastColor(element.color) : adjustAlpha(getContrastColor(element.color), 0.5)}
          lineHeight={1.4}
          align="left"
          verticalAlign="top"
          wrap="word"
          ellipsis={true}
        />
      )}
    </Group>
  );
}

// Helper function to determine contrasting text color
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, dark gray for dark backgrounds
  return luminance > 0.5 ? '#1a1a1a' : '#f5f5f5';
}

// Helper function to darken a color
function darkenColor(hexColor: string, percent: number): string {
  const hex = hexColor.replace('#', '');
  
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  r = Math.max(0, Math.floor(r * (1 - percent / 100)));
  g = Math.max(0, Math.floor(g * (1 - percent / 100)));
  b = Math.max(0, Math.floor(b * (1 - percent / 100)));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper function to adjust alpha of a hex color
function adjustAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

