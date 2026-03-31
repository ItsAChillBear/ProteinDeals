"use client";

import { useState } from "react";
import { Send, Store, Users, CheckCircle } from "lucide-react";

type SubjectType = "" | "supplier" | "general" | "press";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "" as SubjectType,
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: wire to backend
    setSubmitted(true);
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-white mb-3">Get in Touch</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Whether you&apos;re a supplement retailer looking to get listed, or
            a user with a question — we&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* For Suppliers */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-green-950/50 border border-green-800/40 flex items-center justify-center">
                <Store className="h-5 w-5 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white">For Suppliers</h2>
            </div>
            <p className="text-gray-400 leading-relaxed text-sm mb-6">
              If you run a UK supplement retail brand and want to be listed on
              ProteinDeals, we&apos;d love to work with you. We currently track{" "}
              <strong className="text-white">10+ retailers</strong> and are
              always expanding.
            </p>
            <ul className="space-y-2.5 text-sm">
              {[
                "Free to list your products",
                "Affiliate partnership opportunities",
                "Direct traffic to your product pages",
                "Performance reporting included",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* For Users */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-950/50 border border-blue-800/40 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">For Users</h2>
            </div>
            <p className="text-gray-400 leading-relaxed text-sm mb-6">
              Found a price that&apos;s out of date? Know of a retailer
              we&apos;re missing? Want to suggest a feature? We read every
              message and appreciate the feedback.
            </p>
            <ul className="space-y-2.5 text-sm">
              {[
                "Report incorrect or outdated prices",
                "Request a retailer or brand to be added",
                "Suggest new features or improvements",
                "General questions about how ProteinDeals works",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-gray-300">
                  <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Send a Message</h2>

          {submitted ? (
            <div className="text-center py-10">
              <div className="h-16 w-16 rounded-full bg-green-950/50 border border-green-800/40 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Message Sent!
              </h3>
              <p className="text-gray-400 text-sm">
                Thanks for reaching out. We&apos;ll get back to you within 1–2
                business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-700 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-700 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Subject <span className="text-red-400">*</span>
                </label>
                <select
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-700 transition-colors appearance-none"
                >
                  <option value="" disabled>
                    Select a subject
                  </option>
                  <option value="supplier">Supplier Enquiry</option>
                  <option value="general">General Question</option>
                  <option value="press">Press / Media</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us how we can help..."
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-700 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-gray-950 font-bold py-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20 hover:scale-[1.01]"
              >
                Send Message <Send className="h-4 w-4" />
              </button>

              <p className="text-gray-600 text-xs text-center">
                We typically reply within 1–2 business days.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
