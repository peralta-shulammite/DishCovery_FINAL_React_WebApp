'use client';
import { useState } from 'react';
import AboutLayout from '../../components/user-about/about';
import './styles.css';

// API Base URL
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://dishcovery-backend-wvhn.onrender.com/api';
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

export default function AboutSupportPage() {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [reportMessage, setReportMessage] = useState('');

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // Handle feedback form submission
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackLoading(true);
    setFeedbackMessage('');

    const formData = {
      name: e.target.name.value.trim(),
      email: e.target.email.value.trim(),
      message: e.target.message.value.trim()
    };

    try {
      const apiUrl = `${API_BASE_URL}/contact/feedback`;
      console.log('Submitting feedback to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Failed to submit feedback. Please try again.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        setFeedbackMessage(errorMessage);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setFeedbackMessage('success');
        e.target.reset();
      } else {
        setFeedbackMessage(data.message || 'Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect to the server. Please check if the backend server is running and try again.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setFeedbackMessage(errorMessage);
    } finally {
      setFeedbackLoading(false);
      setTimeout(() => setFeedbackMessage(''), 5000);
    }
  };

  // Handle issue report form submission
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReportLoading(true);
    setReportMessage('');

    const formData = {
      name: e.target['issue-name'].value.trim(),
      email: e.target['issue-email'].value.trim(),
      issueType: e.target['issue-type'].value,
      description: e.target['issue-description'].value.trim()
    };

    try {
      const apiUrl = `${API_BASE_URL}/contact/report`;
      console.log('Submitting report to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Failed to submit report. Please try again.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        setReportMessage(errorMessage);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setReportMessage('success');
        e.target.reset();
      } else {
        setReportMessage(data.message || 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect to the server. Please check if the backend server is running and try again.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setReportMessage(errorMessage);
    } finally {
      setReportLoading(false);
      setTimeout(() => setReportMessage(''), 5000);
    }
  };

  return (
    <AboutLayout>
      <section id="help-center" className="content-section">
        <div className="section-header">
          <h1 className="section-title">Welcome to the Help Center</h1>
        </div>
        <div className="content-body">
          <p className="lead-text">
            We're here to help you make the most of DishCovery. Explore the sections below for guidance on using our app, troubleshooting issues, or finding answers to common questions.
          </p>

          <div className="help-categories">
          <div className="help-category">
            <h3>Getting Started</h3>
            <ul className="help-links">
              <li><a href="#signup">How to Sign Up</a></li>
              <li><a href="#scanning">Scanning Ingredients</a></li>
              <li><a href="#recipes">Generating Recipes</a></li>
            </ul>
          </div>

          <div className="help-category">
            <h3>Account & Settings</h3>
            <ul className="help-links">
              <li><a href="#profile">Managing Your Profile</a></li>
              <li><a href="#dietary">Setting Dietary Restrictions</a></li>
              <li><a href="#password">Resetting Your Password</a></li>
            </ul>
          </div>

          <div className="help-category">
            <h3>Using DishCovery</h3>
            <ul className="help-links">
              <li><a href="#ingredient-recognition">Ingredient Recognition</a></li>
              <li><a href="#meal-customization">Customizing Meals</a></li>
              <li><a href="#saving-recipes">Saving Recipes</a></li>
            </ul>
          </div>
        </div>
          <div className="faq-section">
            <h3>Frequently Asked Questions</h3>
            <div className="faq-list">
              {[
                {
                  question: "How do I scan ingredients?",
                  answer: "Use the \"Scan Now\" feature to take a photo or manually input ingredients from your pantry. Our AI will recognize most common ingredients automatically."
                },
                {
                  question: "Can I customize recipes?",
                  answer: "Yes, adjust recipes based on dietary preferences or available ingredients in the customization menu. You can filter by allergens and dietary restrictions."
                },
                {
                  question: "What if the app doesn't recognize an ingredient?",
                  answer: "Try re-scanning with better lighting or manually entering the ingredient name for better accuracy. You can also browse our ingredient database."
                },
                {
                  question: "Are the recipes verified?",
                  answer: "All recipes are reviewed by dietitians and nutritionists for safety and nutritional value. We ensure every recipe meets our quality standards."
                },
                {
                  question: "How do I contact support?",
                  answer: (
                    <>
                      Reach out via <a href="mailto:dishcovery.org@gmail.com">dishcovery.org@gmail.com</a> or use the contact form below. We typically respond within 24 hours.
                    </>
                  )
                }
              ].map((faq, index) => (
                <div key={index} className="faq-item">
                  <button 
                    className="faq-question"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={expandedFaq === index}
                  >
                    <span>{faq.question}</span>
                    <svg 
                      className={`faq-chevron ${expandedFaq === index ? 'expanded' : ''}`}
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                    </svg>
                  </button>
                  {expandedFaq === index && (
                    <div className="faq-answer">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="contact-support">
            <h3>Still Need Help?</h3>
            <p>Reach out to our support team at <a href="mailto:dishcovery.org@gmail.com">dishcovery.org@gmail.com</a> or use the contact form in the Contact Us section.</p>
          </div>
        </div>
      </section>

      <section id="contact" className="content-section">
        <div className="section-header">
          <h2 className="section-title">Get in Touch</h2>
        </div>
        <div className="content-body">
          <p className="lead-text">
            We'd love to hear from you! Whether you have a question, feedback, or want to explore partnership opportunities, here's how you can reach us.
          </p>

          <div className="contact-methods">
            <div className="contact-method">
              <div className="contact-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <h3>Email Support</h3>
              <p>Have a question or need assistance? Our support team is here to help.</p>
              <a href="mailto:dishcovery.org@gmail.com" className="contact-link">dishcovery.org@gmail.com</a>
            </div>

            <div className="contact-method">
              <div className="contact-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 8V7l-3 2-3-2v1l3 2 3-2zm1-5H2C.9 3 0 3.9 0 5v14c0 1.1.9 2 2 2h20c1.1 0 1.99-.9 1.99-2L24 5c0-1.1-.9-2-2-2zM8 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm9 8H7v-2h10v2zm0-4H7V8h10v2z"/>
                </svg>
              </div>
              <h3>Business Inquiries</h3>
              <p>Interested in partnering with us? Reach out to discuss opportunities.</p>
              <a href="mailto:dishcovery.org@gmail.com" className="contact-link">dishcovery.org@gmail.com</a>
            </div>

            <div className="contact-method">
              <div className="contact-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 14v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <h3>Social Media</h3>
              <p>Connect with us on social media for updates and tips!</p>
              <div>
                <a href="https://facebook.com/dishcovery" className="contact-link">Facebook</a> | 
                <a href="https://instagram.com/dishcovery" className="contact-link"> Instagram</a> | 
                <a href="https://twitter.com/dishcovery" className="contact-link"> Twitter</a>
              </div>
            </div>
          </div>

          <div className="contact-form-section">
            <h3>Feedback & Suggestions</h3>
            <form className="contact-form" onSubmit={handleFeedbackSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input type="text" id="name" name="name" placeholder="Your Name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" placeholder="Your Email" required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="message">Your Feedback</label>
                <textarea id="message" name="message" rows="5" placeholder="Share your thoughts..." required></textarea>
              </div>
              {feedbackMessage && (
                <div style={{
                  padding: '10px',
                  marginBottom: '15px',
                  borderRadius: '4px',
                  backgroundColor: feedbackMessage === 'success' ? '#d4edda' : '#f8d7da',
                  color: feedbackMessage === 'success' ? '#155724' : '#721c24',
                  border: `1px solid ${feedbackMessage === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                  {feedbackMessage === 'success' 
                    ? '✅ Thank you for your feedback! We will review it soon.' 
                    : `❌ ${feedbackMessage}`}
                </div>
              )}
              <button type="submit" className="submit-btn" disabled={feedbackLoading}>
                {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </div>

          <div className="contact-form-section">
            <h3>Report an Issue</h3>
            <form className="contact-form" onSubmit={handleReportSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="issue-name">Name</label>
                  <input type="text" id="issue-name" name="issue-name" placeholder="Your Name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="issue-email">Email</label>
                  <input type="email" id="issue-email" name="issue-email" placeholder="Your Email" required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="issue-type">Issue Type</label>
                <select id="issue-type" name="issue-type" required>
                  <option value="">Select an issue type</option>
                  <option value="technical">Technical Issue</option>
                  <option value="account">Account Issue</option>
                  <option value="recipe">Recipe Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="issue-description">Describe the Issue</label>
                <textarea id="issue-description" name="issue-description" rows="5" placeholder="Please describe the issue..." required></textarea>
              </div>
              {reportMessage && (
                <div style={{
                  padding: '10px',
                  marginBottom: '15px',
                  borderRadius: '4px',
                  backgroundColor: reportMessage === 'success' ? '#d4edda' : '#f8d7da',
                  color: reportMessage === 'success' ? '#155724' : '#721c24',
                  border: `1px solid ${reportMessage === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                  {reportMessage === 'success' 
                    ? '✅ Thank you for reporting this issue! We will look into it soon.' 
                    : `❌ ${reportMessage}`}
                </div>
              )}
              <button type="submit" className="submit-btn" disabled={reportLoading}>
                {reportLoading ? 'Submitting...' : 'Report Issue'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </AboutLayout>
  );
}