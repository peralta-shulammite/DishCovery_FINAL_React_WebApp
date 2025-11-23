'use client';
import AboutLayout from '../../components/user-about/about';
import './styles.css';

export default function LegalPage() {
  return (
    <AboutLayout>
      <section id="privacy-policy" className="content-section">
        <div className="section-header">
          <h1 className="section-title">Privacy Policy</h1>
        </div>
        <div className="content-body">
          <p className="lead-text">
            DishCovery values your privacy and is committed to protecting your personal information in compliance with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).
          </p>
          <p className="last-updated">
            Effective Date: September 20, 2025
          </p>

          <div className="policy-section">
            <h3>1. Introduction</h3>
            <p>
              This Privacy Policy describes how DishCovery collects, uses, stores, and protects your personal information when you access or use our web application and related services. By creating an account or using our platform, you acknowledge that you have read and understood this Privacy Policy and consent to the data practices described herein. We are committed to maintaining transparency about our data handling practices and ensuring that your personal information is treated with the utmost care and security.
            </p>
          </div>

          <div className="policy-section">
            <h3>2. Information Collection</h3>
            <p>
              In order to provide you with our services, we collect certain types of information from users of the DishCovery platform. The information we collect falls into two primary categories: personal information that directly identifies you, and non-personal information that helps us understand how our services are being used and how we can improve them.
            </p>
            <p>
              <strong>Personal Information:</strong> When you create an account with DishCovery, we collect your name, email address, and contact information. This information is necessary for account creation, authentication, and communication regarding your use of our services.
            </p>
            <p>
              <strong>Usage and Device Information:</strong> We automatically collect certain information about how you interact with our platform, including the recipes you view, features you use, and preferences you set. Additionally, we gather device information such as your browser type, operating system, IP address, and access times. We may also use cookies and similar tracking technologies to analyze platform usage, remember your preferences, and improve your overall experience.
            </p>
          </div>

          <div className="policy-section">
            <h3>3. Use of Information</h3>
            <p>
              The personal and non-personal information we collect serves several important purposes in delivering and improving our services. We use your information to create and manage your account, authenticate your identity, and provide you with access to DishCovery's features and functionalities. Your usage data helps us generate personalized recipe recommendations tailored to your preferences and dietary needs.
            </p>
            <p>
              We also utilize collected information to respond to your inquiries, provide customer support, and address any issues you may encounter while using the platform. With your consent, we may send you updates, announcements, newsletters, or promotional offers about new features, recipes, or other content that may interest you. You retain the right to opt out of such communications at any time through your account settings or by following the unsubscribe instructions in our emails.
            </p>
            <p>
              Furthermore, we analyze aggregated and anonymized usage data to understand user behavior, identify trends, enhance platform functionality, and improve the overall user experience. This analysis helps us make informed decisions about feature development and service improvements.
            </p>
          </div>

          <div className="policy-section">
            <h3>4. Information Sharing and Disclosure</h3>
            <p>
              DishCovery does not sell, rent, or trade your personal information to third parties for their marketing purposes. We share your information only in the specific circumstances outlined below, and always under strict confidentiality and security requirements.
            </p>
            <p>
              <strong>Service Providers:</strong> We may engage trusted third-party service providers to perform functions on our behalf, such as hosting services, data analytics, email delivery, and payment processing. These providers are granted access to your personal information only to the extent necessary to perform their designated functions and are contractually obligated to maintain the confidentiality and security of your data.
            </p>
            <p>
              <strong>Legal Requirements:</strong> We may disclose your information when required by law, legal process, litigation, or governmental request. We may also share information when we believe in good faith that disclosure is necessary to protect our rights, your safety or the safety of others, investigate fraud, or respond to a government request.
            </p>
          </div>

          <div className="policy-section">
            <h3>5. Data Retention</h3>
            <p>
              We retain your personal information for as long as your account remains active or as necessary to provide you with our services. If you choose to delete your account, we will remove your personal information from our active databases in accordance with our data retention policies and applicable legal requirements. However, certain information may be retained in our backup systems or archives for a limited period as required by law or for legitimate business purposes such as fraud prevention, dispute resolution, or compliance with legal obligations.
            </p>
          </div>

          <div className="policy-section">
            <h3>6. Cookies and Tracking Technologies</h3>
            <p>
              DishCovery employs cookies, web beacons, and similar tracking technologies to enhance your browsing experience, remember your preferences, and analyze how users interact with our platform. Cookies are small text files stored on your device that help us recognize you on subsequent visits and maintain your session state. You have the ability to control cookie preferences through your browser settings, though disabling certain cookies may limit your ability to use some features of our platform. Our cookie usage helps us improve service performance, understand user preferences, and deliver more relevant content and features.
            </p>
          </div>

          <div className="policy-section">
            <h3>7. Your Rights Under Philippine Data Privacy Law</h3>
            <p>
              Under the Philippine Data Privacy Act of 2012, you are afforded certain rights regarding your personal information. You have the right to access your personal data and obtain copies of the information we hold about you. You may request corrections or updates to any inaccurate or incomplete personal information in your account. You have the right to object to or restrict certain types of data processing, and you may withdraw your consent for data processing activities that require your consent.
            </p>
            <p>
              Additionally, you have the right to request the deletion of your account and associated personal data, subject to legal retention requirements. You may also lodge a complaint with the National Privacy Commission of the Philippines if you believe your data privacy rights have been violated. To exercise any of these rights, please contact us at <a href="mailto:dishcovery.org@gmail.com">dishcovery.org@gmail.com</a>. We will respond to your request within the timeframe required by applicable law.
            </p>
          </div>

          <div className="policy-section">
            <h3>8. Data Security</h3>
            <p>
              The security of your personal information is of paramount importance to DishCovery. We implement industry-standard security measures designed to protect your data from unauthorized access, disclosure, alteration, or destruction. These measures include encryption of data in transit and at rest, secure server infrastructure, regular security assessments, and restricted access controls that limit data access to authorized personnel only. While we strive to protect your personal information, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.
            </p>
          </div>

          <div className="policy-section">
            <h3>9. Children's Privacy</h3>
            <p>
              DishCovery is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that we have inadvertently collected personal information from a person under 18 years of age, we will take steps to delete such information from our systems as quickly as possible.
            </p>
          </div>

          <div className="policy-section">
            <h3>10. Changes to This Privacy Policy</h3>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or operational needs. When we make material changes to this policy, we will notify you by posting the updated policy on our platform with a new effective date, and we may also send you a notification via email or through the platform. We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information. Your continued use of DishCovery after any modifications to this Privacy Policy constitutes your acceptance of the updated terms.
            </p>
          </div>

          <div className="policy-section">
            <h3>11. Contact Information</h3>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at <a href="mailto:dishcovery.org@gmail.com">dishcovery.org@gmail.com</a>. You may also reach us through the contact form available on our platform. We are committed to addressing your inquiries and resolving any issues in a timely and professional manner.
            </p>
          </div>
        </div>
      </section>

      <section id="terms-service" className="content-section">
        <div className="section-header">
          <h1 className="section-title">Terms of Service</h1>
        </div>
        <div className="content-body">
          <p className="lead-text">
            These Terms of Service govern your use of DishCovery and constitute a legally binding agreement between you and DishCovery. Please read these terms carefully before using our services.
          </p>
          <p className="last-updated">
            Effective Date: September 20, 2025
          </p>

          <div className="policy-section">
            <h3>1. Agreement to Terms</h3>
            <p>
              By accessing or using the DishCovery web application and related services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. These terms apply to all users of the platform, including visitors, registered users, and contributors. If you do not agree with any part of these terms, you must discontinue use of our services immediately. Your continued use of DishCovery following any modifications to these Terms of Service constitutes your acceptance of such changes.
            </p>
          </div>

          <div className="policy-section">
            <h3>2. Eligibility and Account Registration</h3>
            <p>
              You must be at least 18 years of age to create an account and use DishCovery. If you are under 18, you may use our services only with the involvement and consent of a parent or legal guardian. By registering for an account, you represent and warrant that you have the legal capacity to enter into this binding agreement and that all information you provide during the registration process is accurate, current, and complete.
            </p>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials, including your password, and for all activities that occur under your account. You agree to immediately notify us of any unauthorized access to or use of your account by contacting <a href="mailto:dishcovery.org@gmail.com">dishcovery.org@gmail.com</a>. You may not share your account with others or allow any third party to access your account.
            </p>
          </div>

          <div className="policy-section">
            <h3>3. User Conduct and Responsibilities</h3>
            <p>
              When using DishCovery, you agree to conduct yourself in a lawful and respectful manner. You are responsible for ensuring that all information you provide to the platform is accurate, current, and complete. You agree not to post, upload, transmit, or share any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, invasive of another's privacy, hateful, or racially or ethnically objectionable.
            </p>
            <p>
              You may not use DishCovery for any purpose that is illegal under Philippine law or the laws of your jurisdiction. Prohibited activities include but are not limited to: attempting to gain unauthorized access to our systems or networks; interfering with or disrupting the integrity or performance of the platform; using automated scripts, bots, or other automated means to access or scrape content from the platform; transmitting viruses, malware, or other harmful code; impersonating any person or entity or falsely representing your affiliation with any person or entity; and violating the intellectual property rights of DishCovery or any third party.
            </p>
          </div>

          <div className="policy-section">
            <h3>4. Intellectual Property Rights</h3>
            <p>
              All content, features, and functionality available on DishCovery, including but not limited to text, graphics, logos, images, software, and the overall design of the platform, are owned by DishCovery or its licensors and are protected by Philippine and international copyright, trademark, patent, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to access and use the platform for your personal, non-commercial use only.
            </p>
            <p>
              You may not copy, reproduce, distribute, modify, create derivative works from, publicly display, publicly perform, republish, download, store, or transmit any material from DishCovery without our prior written consent, except as necessary for normal use of the platform or as permitted by applicable law. When you submit, post, or upload content to DishCovery (such as user-generated recipes, comments, or reviews), you grant us a non-exclusive, worldwide, royalty-free, perpetual, irrevocable license to use, reproduce, modify, adapt, publish, translate, distribute, and display such content in connection with operating and promoting our services.
            </p>
          </div>

          <div className="policy-section">
            <h3>5. Paid Services and Subscriptions</h3>
            <p>
              Certain features or services offered through DishCovery may require payment of fees or subscription charges. All fees will be clearly disclosed prior to your purchase or subscription. By purchasing a paid service or subscription, you agree to pay all applicable fees and authorize us to charge your designated payment method. Fees are non-refundable except as expressly stated in our refund policy or as required by applicable law.
            </p>
            <p>
              Subscription services will automatically renew at the end of each billing period unless you cancel your subscription before the renewal date. You may cancel your subscription at any time through your account settings. Upon cancellation, you will continue to have access to the paid features until the end of your current billing period, after which your access will be downgraded to the free tier or terminated, depending on the service.
            </p>
          </div>

          <div className="policy-section">
            <h3>6. Service Modifications and Termination</h3>
            <p>
              DishCovery reserves the right to modify, suspend, or discontinue any aspect of our services at any time, with or without notice. We may also impose limits on certain features or restrict your access to parts or all of the platform without liability. We reserve the right to terminate or suspend your account and access to our services immediately, without prior notice or liability, if you breach these Terms of Service, engage in prohibited activities, or for any other reason at our sole discretion.
            </p>
            <p>
              You may terminate your account at any time by contacting us at <a href="mailto:dishcovery.org@gmail.com">dishcovery.org@gmail.com</a> or using the account deletion feature in your settings. Upon termination, your right to use the platform will immediately cease, and we may delete your account data in accordance with our data retention policies.
            </p>
          </div>

          <div className="policy-section">
            <h3>7. Disclaimers and Limitation of Liability</h3>
            <p>
              DishCovery is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the platform will be uninterrupted, secure, or error-free, or that defects will be corrected. We do not guarantee the accuracy, reliability, or completeness of any content on the platform, including user-generated content and recipes.
            </p>
            <p>
              To the fullest extent permitted by applicable law, DishCovery shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the platform; any conduct or content of any third party on the platform; unauthorized access, use, or alteration of your transmissions or content; or any other matter relating to the platform. Our total liability to you for any claims arising from or related to these Terms of Service or your use of the platform shall not exceed the amount you have paid to us in the twelve months preceding the claim, or one hundred Philippine pesos (PHP 100), whichever is greater.
            </p>
          </div>

          <div className="policy-section">
            <h3>8. Indemnification</h3>
            <p>
              You agree to defend, indemnify, and hold harmless DishCovery and its officers, directors, employees, contractors, agents, licensors, and suppliers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms of Service or your use of the platform, including but not limited to your user content, any use of the platform's content or services other than as expressly authorized in these Terms of Service, or your breach of any representation or warranty contained herein.
            </p>
          </div>

          <div className="policy-section">
            <h3>9. Governing Law and Dispute Resolution</h3>
            <p>
              These Terms of Service and any disputes arising from or relating to them or your use of DishCovery shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law principles. Any legal action or proceeding arising out of or related to these Terms of Service shall be instituted exclusively in the courts of the Philippines, and you consent to the personal jurisdiction of such courts.
            </p>
            <p>
              In the event of any dispute, controversy, or claim arising out of or relating to these Terms of Service or your use of the platform, you agree to first attempt to resolve the dispute informally by contacting us at <a href="mailto:dishcovery.org@gmail.com">dishcovery.org@gmail.com</a>. If the dispute cannot be resolved through informal negotiation within thirty (30) days, either party may pursue resolution through binding arbitration in accordance with Philippine law, or through the appropriate courts in the Philippines.
            </p>
          </div>

          <div className="policy-section">
            <h3>10. Modifications to Terms</h3>
            <p>
              DishCovery reserves the right to modify or update these Terms of Service at any time at our sole discretion. When we make material changes to these terms, we will post the updated version on our platform with a new effective date and may notify you via email or through a prominent notice on the platform. Your continued use of DishCovery after the effective date of any modifications constitutes your acceptance of the updated Terms of Service. If you do not agree with the modified terms, you must discontinue use of our services and may close your account.
            </p>
          </div>

          <div className="policy-section">
            <h3>11. General Provisions</h3>
            <p>
              These Terms of Service, together with our Privacy Policy and any other legal notices or agreements published by us on the platform, constitute the entire agreement between you and DishCovery concerning your use of the platform and supersede any prior agreements or understandings. If any provision of these Terms of Service is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect. Our failure to enforce any right or provision of these Terms of Service shall not constitute a waiver of such right or provision. These terms are personal to you and may not be assigned or transferred without our prior written consent.
            </p>
          </div>

          <div className="policy-section">
            <h3>12. Contact Information</h3>
            <p>
              If you have any questions, concerns, or feedback regarding these Terms of Service, please contact us at <a href="mailto:dishcovery.org@gmail.com">dishcovery.org@gmail.com</a>. You may also reach us through the contact form available on our platform. We are committed to addressing your inquiries in a timely manner and maintaining open communication with our users.
            </p>
          </div>
        </div>
      </section>
    </AboutLayout>
  );
}