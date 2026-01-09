'use client';

import { useRef, useEffect, useState } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { CanvasCard as CanvasCardType } from '@/types/canvas';

interface CanvasCardProps {
  card: CanvasCardType;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onLockToggle: (id: string) => void;
  onAddToFrequentlyUsed?: (id: string) => void;
  onSizeChange?: (id: string, width: number, height: number) => void;
}

export function CanvasCard({ card, isSelected, onSelect, onDragEnd, onDelete, onLockToggle, onAddToFrequentlyUsed, onSizeChange }: CanvasCardProps) {
  const groupRef = useRef<Konva.Group>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [deleteHovered, setDeleteHovered] = useState(false);
  const [lockHovered, setLockHovered] = useState(false);
  const [starHovered, setStarHovered] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [trashIcon, setTrashIcon] = useState<HTMLImageElement | null>(null);
  const [lockIcon, setLockIcon] = useState<HTMLImageElement | null>(null);
  const [unlockIcon, setUnlockIcon] = useState<HTMLImageElement | null>(null);
  const [starIcon, setStarIcon] = useState<HTMLImageElement | null>(null);

  // Track if we've auto-resized this card (to prevent overriding saved dimensions)
  const hasAutoResizedRef = useRef(false);

  // Load image
  useEffect(() => {
    if (!card.imageUrl) {
      setImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      
      // Only auto-resize if card has default dimensions (newly created card)
      // AND we haven't already auto-resized it
      // This preserves dimensions for cards loaded from session
      const DEFAULT_WIDTH = 280;
      const DEFAULT_HEIGHT = 320;
      const isDefaultSize = card.width === DEFAULT_WIDTH && card.height === DEFAULT_HEIGHT;
      
      if (isDefaultSize && !hasAutoResizedRef.current && onSizeChange) {
        hasAutoResizedRef.current = true;
        
        // Scale image to reasonable size (max 400px on largest side)
        const MAX_DIMENSION = 400;
        let scaledWidth = img.width;
        let scaledHeight = img.height;
        
        if (img.width > img.height) {
          // Image is wider
          if (img.width > MAX_DIMENSION) {
            scaledWidth = MAX_DIMENSION;
            scaledHeight = (img.height / img.width) * MAX_DIMENSION;
          }
        } else {
          // Image is taller or square
          if (img.height > MAX_DIMENSION) {
            scaledHeight = MAX_DIMENSION;
            scaledWidth = (img.width / img.height) * MAX_DIMENSION;
          }
        }
        
        // Update card size to match scaled image dimensions
        if (scaledWidth > 0 && scaledHeight > 0) {
          onSizeChange(card.id, scaledWidth, scaledHeight);
        }
      }
    };
    img.onerror = () => setImage(null);
    img.src = card.imageUrl;
  }, [card.imageUrl, card.id, card.width, card.height, onSizeChange]);

  // Reset auto-resize flag when card dimensions change from default (user resized it)
  useEffect(() => {
    const DEFAULT_WIDTH = 280;
    const DEFAULT_HEIGHT = 320;
    const isDefaultSize = card.width === DEFAULT_WIDTH && card.height === DEFAULT_HEIGHT;
    
    // If card is resized to non-default size, mark as already resized
    // This prevents auto-resize on re-renders
    if (!isDefaultSize) {
      hasAutoResizedRef.current = true;
    }
  }, [card.width, card.height]);

  // Load SVG icons
  useEffect(() => {
    // Trash icon SVG
    const trashSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11V17M14 11V17" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    
    // Lock icon SVG
    const lockSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#f59e0b" stroke-width="2"/><path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    
    // Unlock icon SVG
    const unlockSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#6b7280" stroke-width="2"/><path d="M7 11V7C7 5.93913 7.42143 4.92172 8.17157 4.17157C8.92172 3.42143 9.93913 3 11 3H13C14.0609 3 15.0783 3.42143 15.8284 4.17157C16.5786 4.92172 17 5.93913 17 7V10" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    
    // Star icon SVG
    const starSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    
    const loadSvgAsImage = (svgString: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        const img = new window.Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = reject;
        img.src = url;
      });
    };

    Promise.all([
      loadSvgAsImage(trashSvg),
      loadSvgAsImage(lockSvg),
      loadSvgAsImage(unlockSvg),
      loadSvgAsImage(starSvg)
    ]).then(([trash, lock, unlock, star]) => {
      setTrashIcon(trash);
      setLockIcon(lock);
      setUnlockIcon(unlock);
      setStarIcon(star);
    }).catch(console.error);
  }, []);

  // Calculate card dimensions - use card dimensions (which are updated when image loads with scaled size)
  const cardWidth = card.width;
  const cardHeight = card.height;
  const cardRotation = card.rotation ?? 0;
  const isLocked = card.locked ?? false;

  useEffect(() => {
    if (groupRef.current) {
      // Add shadow on hover and track hover state
      const handleMouseEnter = () => {
        setIsHovered(true);
        if (groupRef.current) {
          groupRef.current.to({
            shadowBlur: 15,
            shadowOpacity: 0.3,
            duration: 0.2,
          });
        }
      };

      const handleMouseLeave = () => {
        setIsHovered(false);
        if (groupRef.current) {
          groupRef.current.to({
            shadowBlur: isSelected ? 10 : 5,
            shadowOpacity: isSelected ? 0.25 : 0.15,
            duration: 0.2,
          });
        }
      };

      const currentGroup = groupRef.current;
      currentGroup.on('mouseenter', handleMouseEnter);
      currentGroup.on('mouseleave', handleMouseLeave);

      return () => {
        currentGroup?.off('mouseenter', handleMouseEnter);
        currentGroup?.off('mouseleave', handleMouseLeave);
      };
    }
  }, [isSelected, card.id]);

  return (
    <>
      <Group
        ref={groupRef}
        x={card.x}
        y={card.y}
        rotation={cardRotation}
        draggable={!isLocked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          if (!isLocked) {
            onDragEnd(card.id, e.target.x(), e.target.y());
          }
        }}
        shadowColor="black"
        shadowBlur={isSelected ? 10 : 5}
        shadowOpacity={isSelected ? 0.25 : 0.15}
        shadowOffsetX={0}
        shadowOffsetY={2}
      >
      {/* Card Background */}
      <Rect
        width={cardWidth}
        height={cardHeight}
        fill="white"
        cornerRadius={16}
        stroke={isSelected ? card.color : '#e5e7eb'}
        strokeWidth={isSelected ? 3 : 1}
      />

      {/* Card Image or Placeholder */}
      {image ? (
        <KonvaImage
          image={image}
          x={0}
          y={0}
          width={cardWidth}
          height={cardHeight}
          cornerRadius={[16, 16, 16, 16]}
        />
      ) : (
        <>
          <Rect
            x={0}
            y={0}
            width={cardWidth}
            height={cardHeight - 100}
            fill="#f3f4f6"
            cornerRadius={[16, 16, 0, 0]}
          />
          <Text
            x={cardWidth / 2}
            y={(cardHeight - 100) / 2}
            text="📷"
            fontSize={32}
            align="center"
            verticalAlign="middle"
            offsetX={16}
            offsetY={16}
          />
        </>
      )}

      {/* Text Overlay - shown when selected or hovered (text only on hover, buttons only when selected) */}
      {(isSelected || isHovered) && (
        <>
          {/* Dark overlay gradient */}
          <Rect
            x={0}
            y={cardHeight - 140}
            width={cardWidth}
            height={140}
            fill="rgba(0,0,0,0.4)"
            cornerRadius={[0, 0, 16, 16]}
          />
          
          {/* Card Title */}
          <Text
            x={16}
            y={cardHeight - 120}
            width={cardWidth - 32}
            text={card.title}
            fontSize={16}
            fontStyle="bold"
            fill="#ffffff"
            wrap="word"
            ellipsis={true}
            listening={false}
          />

          {/* Card Description */}
          {card.description && card.description.length > 0 && (
            <Text
              x={16}
              y={cardHeight - 85}
              width={cardWidth - 32}
              text={card.description}
              fontSize={13}
              fill="#ffffff"
              opacity={0.9}
              wrap="word"
              ellipsis={true}
              listening={false}
            />
          )}
        </>
      )}

      {/* Color Accent Bar */}
      <Rect
        x={0}
        y={cardHeight - 8}
        width={cardWidth}
        height={8}
        fill={card.color}
        cornerRadius={[0, 0, 16, 16]}
      />

      {/* Top Buttons - rendered last so they appear on top, only when selected */}
      {isSelected && (
        <Group>
          {/* Delete Button */}
          <Group
            x={cardWidth - 40}
            y={8}
            onClick={(e) => {
              e.cancelBubble = true;
              onDelete(card.id);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onDelete(card.id);
            }}
            onMouseEnter={() => setDeleteHovered(true)}
            onMouseLeave={() => setDeleteHovered(false)}
          >
            <Rect
              width={32}
              height={32}
              fill={deleteHovered ? "#fee2e2" : "white"}
              stroke="#e5e7eb"
              strokeWidth={1}
              cornerRadius={6}
            />
            {/* Trash icon */}
            {trashIcon && (
              <KonvaImage
                x={4}
                y={4}
                image={trashIcon}
                width={24}
                height={24}
              />
            )}
          </Group>

          {/* Lock/Unlock Button */}
          <Group
            x={cardWidth - 80}
            y={8}
            onClick={(e) => {
              e.cancelBubble = true;
              onLockToggle(card.id);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onLockToggle(card.id);
            }}
            onMouseEnter={() => setLockHovered(true)}
            onMouseLeave={() => setLockHovered(false)}
          >
            <Rect
              width={32}
              height={32}
              fill={lockHovered ? "#fef3c7" : "white"}
              stroke="#e5e7eb"
              strokeWidth={1}
              cornerRadius={6}
            />
            {/* Lock/Unlock icon */}
            {isLocked && lockIcon && (
              <KonvaImage
                x={4}
                y={4}
                image={lockIcon}
                width={24}
                height={24}
              />
            )}
            {!isLocked && unlockIcon && (
              <KonvaImage
                x={4}
                y={4}
                image={unlockIcon}
                width={24}
                height={24}
              />
            )}
          </Group>

          {/* Add to Frequently Used Button */}
          {onAddToFrequentlyUsed && card.category && card.cardNumber !== undefined && (
            <Group
              x={cardWidth - 120}
              y={8}
              onClick={(e) => {
                e.cancelBubble = true;
                onAddToFrequentlyUsed(card.id);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onAddToFrequentlyUsed(card.id);
              }}
              onMouseEnter={() => setStarHovered(true)}
              onMouseLeave={() => setStarHovered(false)}
            >
              <Rect
                width={32}
                height={32}
                fill={starHovered ? "#fef3c7" : "white"}
                stroke="#e5e7eb"
                strokeWidth={1}
                cornerRadius={6}
              />
              {/* Star icon */}
              {starIcon && (
                <KonvaImage
                  x={4}
                  y={4}
                  image={starIcon}
                  width={24}
                  height={24}
                />
              )}
            </Group>
          )}
        </Group>
      )}
      </Group>
    </>
  );
}

