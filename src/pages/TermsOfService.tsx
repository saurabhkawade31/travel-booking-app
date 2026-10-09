import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="mb-8">
          <Link to={-1 as any} className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last Updated: April 10, 2026</p>

        <div className="prose prose-indigo max-w-none text-gray-700 space-y-6">
          <p className="font-medium text-gray-900">By using the YuvRaj Tour & Travelers platform, you agree to these legally binding terms.</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">I. Nature of Service (Intermediary)</h2>
            <p>YuvRaj Tour & Travelers is a Digital Intermediary (Aggregator) that provides an electronic platform to connect passengers with independent drivers. We do not own the vehicles; we facilitate the contract between you and the service provider.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">II. Booking & Fares</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Fare Estimates:</strong> Fares displayed are estimates. Final totals may include Government taxes (GST), tolls, and parking fees.</li>
              <li><strong>Surge Pricing:</strong> In accordance with the Motor Vehicle Aggregator Guidelines, surge pricing is capped at 1.5x the base fare.</li>
              <li><strong>Payment:</strong> Payments can be made via authorized Indian gateways (UPI, Credit/Debit cards). Cash payments must be settled directly with the driver.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">III. Cancellation Policy</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>User Cancellation:</strong> If you cancel a ride after a driver has been dispatched, a cancellation fee may apply. Per Indian guidelines, this fee is capped at 10% of the total fare or ₹100, whichever is lower.</li>
              <li><strong>Driver Cancellation:</strong> We monitor driver cancellations to ensure reliability. Frequent unjustified cancellations by drivers will lead to platform suspension.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">IV. User Conduct (Prohibited Content)</h2>
            <p className="mb-2">Per the IT Rules 2021, users are prohibited from:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Hosting or uploading defamatory, obscene, or pornographic content.</li>
              <li>Impersonating another person or providing false location data.</li>
              <li>Interfering with the safety of the driver or the vehicle.</li>
              <li>Violating any Indian law currently in force.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">V. Limitation of Liability</h2>
            <p>While we perform background checks on drivers, YuvRaj Tour & Travelers shall not be held liable for indirect, incidental, or consequential damages (including loss of time or missed connections) arising out of the use of the platform, except as required by the Consumer Protection Act, 2019.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">VI. Governing Law</h2>
            <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in [Your City/District], Madhya Pradesh.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
