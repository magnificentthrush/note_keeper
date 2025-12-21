'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Send, Star, MessageSquare, Bug, Lightbulb, HelpCircle, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

type FeedbackType = 'bug' | 'feature' | 'general' | 'other';

const feedbackTypes: { value: FeedbackType; label: string; icon: typeof Bug; description: string }[] = [
  { value: 'bug', label: 'Bug Report', icon: Bug, description: 'Report a problem or issue' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, description: 'Suggest a new feature' },
  { value: 'general', label: 'General Feedback', icon: MessageSquare, description: 'Share your thoughts' },
  { value: 'other', label: 'Other', icon: HelpCircle, description: 'Something else' },
];

export default function FeedbackPage() {
  const supabase = createClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [willingToPay, setWillingToPay] = useState<boolean | null>(null);
  const [notWillingReason, setNotWillingReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        setEmail(user.email || '');
        setName(user.user_metadata?.full_name || '');
      }
    };
    loadUser();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim() || null,
          feedback_type: feedbackType,
          subject: subject.trim() || null,
          message: message.trim(),
          rating,
          willing_to_pay: willingToPay,
          not_willing_reason: willingToPay === false ? notWillingReason.trim() || null : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        {/* Header */}
        <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <div className="flex items-center justify-center md:justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src="/darkmode_logo.svg"
                  alt="NoteKeeper Logo"
                  width={62}
                  height={62}
                  className="w-[62px] h-[62px]"
                />
                <span className="text-3xl md:text-4xl font-black tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', letterSpacing: '-0.02em' }}>NoteKeeper</span>
              </div>
            </div>
          </div>
        </header>

        {/* Success Message */}
        <main className="max-w-2xl mx-auto px-4 md:px-8 py-16">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[var(--success)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
              Thank You for Your Feedback!
            </h1>
            <p className="text-[var(--text-secondary)] mb-8">
              We appreciate you taking the time to share your thoughts with us. Your feedback helps us improve NoteKeeper.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button>
                  Go to Dashboard
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => {
                setIsSubmitted(false);
                setMessage('');
                setSubject('');
                setRating(null);
                setFeedbackType('general');
                setWillingToPay(null);
                setNotWillingReason('');
              }}>
                Submit Another
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between relative">
            <Link
              href="/dashboard"
              className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105 flex-shrink-0 md:mr-0 mr-auto z-10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2 md:relative md:left-0 md:translate-x-0">
              <Image
                src="/darkmode_logo.svg"
                alt="NoteKeeper Logo"
                width={62}
                height={62}
                className="w-[62px] h-[62px]"
              />
              <span className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', letterSpacing: '-0.02em' }}>NoteKeeper</span>
            </div>
            <div className="w-9 h-9 hidden md:block" /> {/* Spacer for desktop */}
          </div>
        </div>
      </header>

      {/* Page Title */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Send Feedback</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">We&apos;d love to hear from you</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 md:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg text-[var(--error)]">
              {error}
            </div>
          )}

          {/* Feedback Type Selection */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">What type of feedback?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {feedbackTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = feedbackType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFeedbackType(type.value)}
                    className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                    <p className={`text-sm font-medium ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                      {type.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Contact Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Your Info {isLoggedIn && <span className="text-sm font-normal text-[var(--text-muted)]">(optional)</span>}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </Card>

          {/* Feedback Content */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Your Feedback</h2>
            <div className="space-y-4">
              <Input
                label="Subject (optional)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your feedback"
              />
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Message <span className="text-[var(--error)]">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you think..."
                  required
                  minLength={10}
                  rows={5}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Minimum 10 characters ({message.length}/10)
                </p>
              </div>
            </div>
          </Card>

          {/* Rating */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Rate your experience (optional)</h2>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      rating && star <= rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-[var(--text-muted)]'
                    }`}
                  />
                </button>
              ))}
              {rating && (
                <span className="text-sm text-[var(--text-muted)] ml-2">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Great'}
                  {rating === 5 && 'Excellent'}
                </span>
              )}
            </div>
          </Card>

          {/* Pricing Question */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Would you be willing to pay for NoteKeeper?
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              We&apos;re considering a subscription model: <strong className="text-[var(--text-primary)]">Rs 300/month</strong>. 
              Just record your lectures and get AI-generated notes instantly.
            </p>
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => {
                  setWillingToPay(true);
                  setNotWillingReason('');
                }}
                className={`flex-1 p-4 rounded-lg border transition-all duration-200 ${
                  willingToPay === true
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)] text-[var(--text-primary)]'
                }`}
              >
                <span className="font-medium">Yes</span>
              </button>
              <button
                type="button"
                onClick={() => setWillingToPay(false)}
                className={`flex-1 p-4 rounded-lg border transition-all duration-200 ${
                  willingToPay === false
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)] text-[var(--text-primary)]'
                }`}
              >
                <span className="font-medium">No</span>
              </button>
            </div>
            {willingToPay === false && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Please tell us why <span className="text-[var(--error)]">*</span>
                </label>
                <textarea
                  value={notWillingReason}
                  onChange={(e) => setNotWillingReason(e.target.value)}
                  placeholder="e.g., Too expensive, prefer one-time payment, need more features..."
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                />
              </div>
            )}
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isSubmitting}
            disabled={message.trim().length < 10 || (willingToPay === false && !notWillingReason.trim())}
          >
            <Send className="w-5 h-5" />
            Submit Feedback
          </Button>
        </form>
      </main>
    </div>
  );
}

