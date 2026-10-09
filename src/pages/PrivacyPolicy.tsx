import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="mb-8">
          <Link to={-1 as any} className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Effective Date: April 10, 2026</p>

        <div className="prose prose-indigo max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Compliance</h2>
            <p>This policy is formulated in accordance with the Digital Personal Data Protection Act, 2023 and the Information Technology (Intermediary Guidelines) Rules, 2021.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">I. Data We Collect</h2>
            <p className="mb-2">We collect only the information necessary to provide transportation services:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Personal Identity:</strong> Name, Phone Number, and Email Address.</li>
              <li><strong>Location Data:</strong> Real-time pickup and drop-off coordinates (GPS) to calculate routes and track rides.</li>
              <li><strong>Technical Data:</strong> IP address, browser type, and device identifiers for security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">II. Purpose of Processing</h2>
            <p className="mb-2">Your data is processed based on your explicit consent for:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Connecting you with drivers and calculating fares.</li>
              <li>Sending trip confirmations and digital receipts.</li>
              <li>Enhancing passenger safety via real-time tracking.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">III. Your Rights (DPDP Act, 2023)</h2>
            <p className="mb-2">As a "Data Principal" in India, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Access:</strong> Request a summary of the personal data we hold.</li>
              <li><strong>Correction:</strong> Update inaccurate or incomplete information.</li>
              <li><strong>Erasure:</strong> Request the deletion of your account and data (Right to be Forgotten).</li>
              <li><strong>Withdraw Consent:</strong> You may stop our data collection at any time via account settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">IV. Grievance Redressal</h2>
            <p className="mb-2">If you have concerns regarding your data privacy, you may contact our Grievance Officer (as mandated by the IT Act):</p>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
              <p><strong>Name:</strong> [Your Name/Designated Officer]</p>
              <p><strong>Email:</strong> privacy@yuvrajtravels.com</p>
              <p><strong>Address:</strong> [Your Physical Business Address], India.</p>
            </div>
            <p className="mt-4 text-sm text-gray-500 italic">Note: We will acknowledge your grievance within 24 hours and resolve it within 15 days.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
