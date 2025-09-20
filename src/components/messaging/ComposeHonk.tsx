'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


export interface ComposeHonkProps {
  onSend: (message: {
    title: string;
    content: string;
    locationSharing: 'state' | 'country' | 'anonymous';
  }) => Promise<void>;
  characterLimit?: number;
  titleLimit?: number;
  isLoading?: boolean;
}

interface ValidationErrors {
  title?: string;
  content?: string;
  locationSharing?: string;
}

export function ComposeHonk({
  onSend,
  characterLimit = 280,
  titleLimit = 100,
  isLoading = false,
}: ComposeHonkProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [locationSharing, setLocationSharing] = useState<'state' | 'country' | 'anonymous'>('state');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateMessage = useCallback((): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    // Title validation
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > titleLimit) {
      newErrors.title = `Title must be ${titleLimit} characters or less`;
    }

    // Content validation
    if (!content.trim()) {
      newErrors.content = 'Message content is required';
    } else if (content.length > characterLimit) {
      newErrors.content = `Message must be ${characterLimit} characters or less`;
    }

    // Location sharing validation
    if (!locationSharing) {
      newErrors.locationSharing = 'Please select a location sharing option';
    }

    return newErrors;
  }, [title, content, locationSharing, titleLimit, characterLimit]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Clear title error if it exists and title is now valid
    if (errors.title && newTitle.trim() && newTitle.length <= titleLimit) {
      setErrors(prev => ({ ...prev, title: undefined }));
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Clear content error if it exists and content is now valid
    if (errors.content && newContent.trim() && newContent.length <= characterLimit) {
      setErrors(prev => ({ ...prev, content: undefined }));
    }
  };

  const handleLocationSharingChange = (value: 'state' | 'country' | 'anonymous') => {
    setLocationSharing(value);
    
    // Clear location sharing error if it exists
    if (errors.locationSharing) {
      setErrors(prev => ({ ...prev, locationSharing: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateMessage();
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSend({
        title: title.trim(),
        content: content.trim(),
        locationSharing,
      });
      
      // Reset form on successful send
      setTitle('');
      setContent('');
      setLocationSharing('state');
      setErrors({});
    } catch (error) {
      // Error handling is managed by parent component
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = isLoading || isSubmitting;
  const remainingChars = characterLimit - content.length;
  const remainingTitleChars = titleLimit - title.length;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Send a Honk! 🦆
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              type="text"
              placeholder="Give your honk a catchy title..."
              value={title}
              onChange={handleTitleChange}
              disabled={isFormDisabled}
              className={errors.title ? 'border-red-500' : ''}
              maxLength={titleLimit + 10} // Allow slight overflow for better UX
            />
            <div className="flex justify-between items-center text-sm">
              {errors.title ? (
                <span className="text-red-500">{errors.title}</span>
              ) : (
                <span></span>
              )}
              <span className={remainingTitleChars < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                {remainingTitleChars} characters remaining
              </span>
            </div>
          </div>

          {/* Content Field */}
          <div className="space-y-2">
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              placeholder="What's on your mind? Share your thoughts with the world..."
              value={content}
              onChange={handleContentChange}
              disabled={isFormDisabled}
              className={errors.content ? 'border-red-500' : ''}
              rows={4}
              maxLength={characterLimit + 10} // Allow slight overflow for better UX
            />
            <div className="flex justify-between items-center text-sm">
              {errors.content ? (
                <span className="text-red-500">{errors.content}</span>
              ) : (
                <span></span>
              )}
              <span className={remainingChars < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                {remainingChars} characters remaining
              </span>
            </div>
          </div>

          {/* Location Sharing Options */}
          <div className="space-y-2">
            <Label htmlFor="location-sharing">Location Sharing</Label>
            <Select
              value={locationSharing}
              onValueChange={handleLocationSharingChange}
              disabled={isFormDisabled}
            >
              <SelectTrigger className={errors.locationSharing ? 'border-red-500' : ''}>
                <SelectValue placeholder="Choose how to share your location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="state">
                  Share State/Province - Recipients see your state or province
                </SelectItem>
                <SelectItem value="country">
                  Share Country - Recipients see only your country
                </SelectItem>
                <SelectItem value="anonymous">
                  Anonymous - No location information shared
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.locationSharing && (
              <span className="text-red-500 text-sm">{errors.locationSharing}</span>
            )}
          </div>

          {/* Send Button */}
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              size="lg"
              disabled={isFormDisabled || remainingChars < 0 || remainingTitleChars < 0}
              className="min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending Honk...
                </>
              ) : isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Loading...
                </>
              ) : (
                'Send Honk! 🚀'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}