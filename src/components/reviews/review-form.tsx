'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  Plus, 
  Minus, 
  ImagePlus, 
  AlertCircle, 
  CheckCircle, 
  Save, 
  Send,
  X,
  Upload,
  Shield,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Target,
  Book,
  Zap,
  Wrench
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StarRatingInput } from '@/components/ui/rating';
import { cn } from '@/lib/utils';
import type { Review, ReviewDraft, Agent, VerificationLevel } from '@/types';

interface ReviewFormProps {
  agent: Agent;
  existingReview?: Review;
  draft?: ReviewDraft;
  onSubmit: (reviewData: Partial<Review>) => Promise<void>;
  onSaveDraft: (draftData: Partial<ReviewDraft>) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

const categoryIcons = {
  usability: Target,
  documentation: Book,
  performance: Zap,
  reliability: Wrench
};

export function ReviewForm({
  agent,
  existingReview,
  draft,
  onSubmit,
  onSaveDraft,
  onCancel,
  className
}: ReviewFormProps) {
  const [formData, setFormData] = useState({
    overall_rating: existingReview?.overall_rating || draft?.overall_rating || 0,
    usability_rating: existingReview?.usability_rating || draft?.usability_rating || 0,
    documentation_rating: existingReview?.documentation_rating || draft?.documentation_rating || 0,
    performance_rating: existingReview?.performance_rating || draft?.performance_rating || 0,
    reliability_rating: existingReview?.reliability_rating || draft?.reliability_rating || 0,
    title: existingReview?.title || draft?.title || '',
    content: existingReview?.content || draft?.content || '',
    pros: existingReview?.pros || draft?.pros || [],
    cons: existingReview?.cons || draft?.cons || [],
    use_case: existingReview?.use_case || draft?.use_case || ''
  });

  const [newPro, setNewPro] = useState('');
  const [newCon, setNewCon] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(existingReview?.image_urls || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isEditing = !!existingReview;
  const hasChanges = JSON.stringify(formData) !== JSON.stringify({
    overall_rating: existingReview?.overall_rating || 0,
    usability_rating: existingReview?.usability_rating || 0,
    documentation_rating: existingReview?.documentation_rating || 0,
    performance_rating: existingReview?.performance_rating || 0,
    reliability_rating: existingReview?.reliability_rating || 0,
    title: existingReview?.title || '',
    content: existingReview?.content || '',
    pros: existingReview?.pros || [],
    cons: existingReview?.cons || [],
    use_case: existingReview?.use_case || ''
  });

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!isEditing && hasChanges) {
      const interval = setInterval(() => {
        handleSaveDraft();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [formData, hasChanges, isEditing]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.overall_rating === 0) {
      newErrors.overall_rating = 'Overall rating is required';
    }

    if (!formData.title?.trim()) {
      newErrors.title = 'Review title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!formData.content?.trim()) {
      newErrors.content = 'Review content is required';
    } else if (formData.content.length < 10) {
      newErrors.content = 'Review must be at least 10 characters long';
    } else if (formData.content.length > 10000) {
      newErrors.content = 'Review must be less than 10,000 characters';
    }

    if (formData.use_case && formData.use_case.length > 1000) {
      newErrors.use_case = 'Use case must be less than 1,000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        image_urls: imageUrls
      });
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (isEditing) return;

    setIsSaving(true);
    try {
      await onSaveDraft(formData);
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPro = () => {
    if (newPro.trim() && formData.pros.length < 10) {
      setFormData(prev => ({
        ...prev,
        pros: [...prev.pros, newPro.trim()]
      }));
      setNewPro('');
    }
  };

  const handleAddCon = () => {
    if (newCon.trim() && formData.cons.length < 10) {
      setFormData(prev => ({
        ...prev,
        cons: [...prev.cons, newCon.trim()]
      }));
      setNewCon('');
    }
  };

  const handleRemovePro = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pros: prev.pros.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveCon = (index: number) => {
    setFormData(prev => ({
      ...prev,
      cons: prev.cons.filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length + imageUrls.length > 5) {
      setErrors(prev => ({
        ...prev,
        images: 'Maximum 5 images allowed'
      }));
      return;
    }

    setImages(prev => [...prev, ...files]);
    setErrors(prev => {
      const { images, ...rest } = prev;
      return rest;
    });
  };

  const removeImage = (index: number, isExisting = false) => {
    if (isExisting) {
      setImageUrls(prev => prev.filter((_, i) => i !== index));
    } else {
      setImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("w-full max-w-4xl mx-auto", className)}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {isEditing ? 'Edit Review' : 'Write a Review'}
          </CardTitle>
          <CardDescription>
            Share your experience with {agent.name} to help other users
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Overall Rating */}
            <div className="space-y-2">
              <Label htmlFor="overall_rating" className="text-base font-semibold">
                Overall Rating *
              </Label>
              <div className="flex items-center gap-4">
                <StarRatingInput
                  value={formData.overall_rating}
                  onChange={(value) => setFormData(prev => ({ ...prev, overall_rating: value }))}
                  size="lg"
                  required
                />
                <span className="text-sm text-muted-foreground">
                  {formData.overall_rating > 0 && (
                    {
                      1: 'Poor',
                      2: 'Fair',
                      3: 'Good',
                      4: 'Very Good',
                      5: 'Excellent'
                    }[formData.overall_rating]
                  )}
                </span>
              </div>
              {errors.overall_rating && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.overall_rating}
                </p>
              )}
            </div>

            {/* Category Ratings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Category Ratings</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {Object.entries(categoryIcons).map(([category, Icon]) => (
                      <div key={category} className="space-y-2">
                        <Label className="flex items-center gap-2 capitalize">
                          <Icon className="h-4 w-4" />
                          {category}
                        </Label>
                        <StarRatingInput
                          value={formData[`${category}_rating` as keyof typeof formData] as number}
                          onChange={(value) => setFormData(prev => ({ 
                            ...prev, 
                            [`${category}_rating`]: value 
                          }))}
                          size="md"
                        />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-semibold">
                Review Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Summarize your experience..."
                className={cn(errors.title && "border-destructive")}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{errors.title || 'Be specific and helpful'}</span>
                <span>{formData.title.length}/200</span>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-base font-semibold">
                Review Content *
              </Label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Share your detailed experience, what worked well, what could be improved..."
                rows={6}
                className={cn(
                  "w-full p-3 border rounded-md resize-none bg-background",
                  "focus:outline-none focus:ring-2 focus:ring-terminal-green/50",
                  errors.content && "border-destructive"
                )}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{errors.content || 'Markdown supported'}</span>
                <span>{formData.content.length}/10,000</span>
              </div>
            </div>

            {/* Pros and Cons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pros */}
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  What's Good
                </Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newPro}
                      onChange={(e) => setNewPro(e.target.value)}
                      placeholder="Add a positive point..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPro())}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddPro}
                      disabled={!newPro.trim() || formData.pros.length >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {formData.pros.map((pro, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded border">
                        <span className="flex-1 text-sm">{pro}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemovePro(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cons */}
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                  What Could Improve
                </Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newCon}
                      onChange={(e) => setNewCon(e.target.value)}
                      placeholder="Add a point for improvement..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCon())}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddCon}
                      disabled={!newCon.trim() || formData.cons.length >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {formData.cons.map((con, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded border">
                        <span className="flex-1 text-sm">{con}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveCon(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Use Case */}
            <div className="space-y-2">
              <Label htmlFor="use_case" className="text-base font-semibold">
                Use Case
              </Label>
              <textarea
                id="use_case"
                value={formData.use_case}
                onChange={(e) => setFormData(prev => ({ ...prev, use_case: e.target.value }))}
                placeholder="Describe how you used this agent and in what context..."
                rows={3}
                className={cn(
                  "w-full p-3 border rounded-md resize-none bg-background",
                  "focus:outline-none focus:ring-2 focus:ring-terminal-green/50",
                  errors.use_case && "border-destructive"
                )}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{errors.use_case || 'Help others understand when this agent is useful'}</span>
                <span>{formData.use_case.length}/1,000</span>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                Screenshots (Optional)
              </Label>
              <div className="space-y-2">
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Upload images (max 5)
                    </span>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
                
                {(imageUrls.length > 0 || images.length > 0) && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {imageUrls.map((url, index) => (
                      <div key={`existing-${index}`} className="relative group">
                        <img
                          src={url}
                          alt={`Review image ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index, true)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {images.map((file, index) => (
                      <div key={`new-${index}`} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`New image ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index, false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {errors.images && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.images}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Reviews are public and help the community</span>
              </div>

              <div className="flex items-center gap-3">
                {!isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isSaving || !hasChanges}
                  >
                    {isSaving ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Draft
                      </>
                    )}
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting || formData.overall_rating === 0}
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"
                      />
                      {isEditing ? 'Updating...' : 'Publishing...'}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {isEditing ? 'Update Review' : 'Publish Review'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}