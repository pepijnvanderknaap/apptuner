import React, { useState } from 'react';

export function Contact({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Get Formspree form ID from environment variable
    const formspreeId = import.meta.env.VITE_FORMSPREE_FORM_ID;

    if (!formspreeId) {
      console.warn('Formspree not configured - form submission logged only');
      console.log('Form submitted:', formData);
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: '', email: '', subject: '', message: '' });
      }, 3000);
      return;
    }

    try {
      const response = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => {
          setSubmitted(false);
        }, 5000);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setError('Failed to send message. Please try emailing us directly at info@apptuner.io');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #eaeaea',
        padding: '16px 24px',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Contact Us</h1>
        </div>
      </nav>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '48px 24px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '40px',
          border: '1px solid #eaeaea',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Get in Touch</h2>
          <p style={{ color: '#666', lineHeight: '1.7', marginBottom: '32px' }}>
            Have questions, feedback, or need support? We'd love to hear from you.
          </p>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '20px',
              color: '#991b1b',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {submitted ? (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              padding: '20px',
              color: '#166534',
              textAlign: 'center',
            }}>
              Thank you for your message! We'll get back to you soon.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#333',
                }}>
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Your name"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#333',
                }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                  }}
                  placeholder="your@email.com"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#333',
                }}>
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                  }}
                  placeholder="How can we help?"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#333',
                }}>
                  Message
                </label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                  placeholder="Tell us more..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: submitting ? '#9ca3af' : '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  width: '100%',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}

          <div style={{
            marginTop: '40px',
            paddingTop: '32px',
            borderTop: '1px solid #eaeaea',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#666' }}>
              Prefer email?
            </h3>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '12px' }}>
              You can also reach us directly at:
            </p>
            <div style={{ color: '#666', lineHeight: '2', fontSize: '14px' }}>
              <p>
                <strong>General:</strong>{' '}
                <a href="mailto:info@apptuner.io" style={{ color: '#667eea', textDecoration: 'none' }}>
                  info@apptuner.io
                </a>
              </p>
              <p>
                <strong>Support:</strong>{' '}
                <a href="mailto:support@apptuner.io" style={{ color: '#667eea', textDecoration: 'none' }}>
                  support@apptuner.io
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
