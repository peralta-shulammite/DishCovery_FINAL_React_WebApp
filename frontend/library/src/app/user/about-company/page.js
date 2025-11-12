'use client';
import AboutLayout from '../../components/user-about/about';
import './styles.css';

export default function CareersPage() {
  const teamMembers = [
    {
      name: "Shulammite Peralta",
      role: "Project Leader & Frontend Developer",
      image: "/images/team/shulammite-peralta.png",
      social: {
        instagram: "#",
        linkedin: "#",
        portfolio: "#"
      }
    },
    {
      name: "Askia Islance Pesa",
      role: "Machine Learning Engineer & Backend Developer",
      image: "/images/team/askia-islance-pesa.png",
      social: {
        instagram: "#",
        linkedin: "#",
        portfolio: "#"
      }
    },
    {
      name: "Fatimah Sta. Romana",
      role: "Frontend Developer & UX/UI Designer",
      image: "/images/team/fatimah-sta-romana.jpeg",
      social: {
        instagram: "#",
        linkedin: "#",
        portfolio: "#"
      }
    },
    {
      name: "Samantha Nicole Boado",
      role: "Backend Developer",
      image: "/images/team/samantha-nicole-boado.png",
      social: {
        instagram: "#",
        linkedin: "#",
        portfolio: "#"
      }
    }
  ];

  return (
    <AboutLayout>
      <section id="careers" className="content-section">
        <div className="section-header">
          <h2 className="section-title">Our Team</h2>
        </div>
        <div className="content-body">
          <p className="lead-text">
            Meet the passionate team behind DishCovery. Our talented group of developers, designers, and engineers work together to make healthy cooking accessible to everyone.
          </p>
          
          <div className="developers-grid">
            {teamMembers.map((member, index) => (
              <div key={index} className="developer-card">
                <div className="developer-image">
                  <img src={member.image} alt={member.name} />
                </div>
                <div className="developer-info">
                  <h3 className="developer-name">{member.name}</h3>
                  <p className="developer-role">{member.role}</p>
                  <div className="contact-methods">
                    <div className="contact-method">
                      <div className="social-links">
                        <a href={member.social.instagram} className="contact-link">
                          <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849s-.012 3.584-.07 4.85c-.149 3.227-1.664 4.771-4.919 4.919-1.266.058-1.645.07-4.849.07s-3.584-.012-4.849-.07c-3.256-.148-4.771-1.664-4.919-4.919-.058-1.266-.07-1.645-.07-4.849s.012-3.584.07-4.849c.149-3.252 1.664-4.771 4.919-4.919 1.265-.058 1.645-.07 4.849-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.2-4.354-2.617-6.782-6.979-6.979-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        </a>
                        <a href={member.social.linkedin} className="contact-link">
                          <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                          </svg>
                        </a>
                        <a href={member.social.portfolio} className="contact-link">
                          <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 6h-4.5l-2-2h-7l-2 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H4V8h4.59l2-2h2.82l2 2H20v12zm-8-2c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="apply-section">
            <h4>Join Our Team</h4>
            <p>We're looking for passionate innovators to help us grow DishCovery. Send your resume and portfolio to <a href="mailto:careers@dishcovery.com">careers@dishcovery.com</a>.</p>
          </div>
        </div>
      </section>
    </AboutLayout>
  );
}