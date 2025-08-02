'use client';

import { Shield, Clock, Database, Users, Mail, Globe, Lock, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            How we collect, use, and protect your information
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              At Subagents.sh, we are committed to protecting your privacy and being transparent about how we handle your data. 
              This Privacy Policy explains what information we collect, how we use it, and your rights regarding your personal information.
            </p>
            <p>
              By using our service, you agree to the collection and use of information in accordance with this policy.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Information You Provide</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong>Account Information:</strong> When you sign up through GitHub OAuth, we collect your GitHub username, email address, profile picture, and public profile information</li>
                <li>• <strong>Profile Data:</strong> Information you add to your profile such as bio, website, location, and social media handles</li>
                <li>• <strong>Content:</strong> Agents you submit, reviews you write, comments you post, and any other content you create on our platform</li>
                <li>• <strong>Communications:</strong> Messages you send to us for support or feedback</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Information We Automatically Collect</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong>Usage Data:</strong> How you interact with our service, pages visited, features used, and time spent</li>
                <li>• <strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers</li>
                <li>• <strong>Log Data:</strong> Server logs including access times, pages viewed, and system activity</li>
                <li>• <strong>Cookies:</strong> Authentication tokens and preferences to maintain your session and improve your experience</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Your Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span><strong>Provide Services:</strong> To operate and maintain the platform, authenticate users, and enable core functionality</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span><strong>Improve Experience:</strong> To personalize content, recommend agents, and optimize platform performance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span><strong>Communication:</strong> To send important updates, respond to support requests, and notify you of relevant activity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span><strong>Safety & Security:</strong> To prevent fraud, abuse, and security threats, and ensure platform integrity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span><strong>Analytics:</strong> To understand usage patterns and improve our services (anonymized data only)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Information Sharing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Information Sharing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                We do not sell, trade, or rent your personal information to third parties.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">We may share information in these limited circumstances:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong>Public Content:</strong> Information you choose to make public (profile, agents, reviews) is visible to other users</li>
                <li>• <strong>Service Providers:</strong> With trusted third parties who help us operate our service (hosting, analytics, support)</li>
                <li>• <strong>Legal Requirements:</strong> When required by law, regulation, or valid legal process</li>
                <li>• <strong>Safety:</strong> To protect the safety and rights of our users, platform, or the public</li>
                <li>• <strong>Business Transfer:</strong> In connection with a merger, acquisition, or sale of assets (with user notification)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              We implement appropriate technical and organizational measures to protect your personal information:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Encryption:</strong> Data is encrypted in transit and at rest using industry-standard protocols</li>
              <li>• <strong>Access Controls:</strong> Strict access controls and authentication for our systems and databases</li>
              <li>• <strong>Regular Audits:</strong> Security assessments and monitoring to identify and address vulnerabilities</li>
              <li>• <strong>Secure Infrastructure:</strong> Hosting with reputable providers that maintain high security standards</li>
              <li>• <strong>Data Minimization:</strong> We collect and retain only the information necessary for our services</li>
            </ul>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Rights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">You have the following rights regarding your personal information:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li>• <strong>Correction:</strong> Update or correct inaccurate information in your profile settings</li>
              <li>• <strong>Deletion:</strong> Request deletion of your account and associated data (available in profile settings)</li>
              <li>• <strong>Portability:</strong> Request your data in a portable format</li>
              <li>• <strong>Opt-out:</strong> Unsubscribe from promotional communications</li>
              <li>• <strong>Restriction:</strong> Request limitations on how we process your information</li>
            </ul>
            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800 mt-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Easy Account Deletion:</strong> You can delete your account and all associated data at any time 
                from your profile settings. This action is permanent and cannot be undone.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Data Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Active Accounts:</strong> We retain your information while your account is active</li>
              <li>• <strong>Deleted Accounts:</strong> Most data is immediately deleted when you delete your account</li>
              <li>• <strong>Legal Obligations:</strong> Some data may be retained longer if required by law</li>
              <li>• <strong>Backup Systems:</strong> Data in backups is automatically purged according to our retention schedule</li>
              <li>• <strong>Anonymized Data:</strong> Usage analytics may be retained in anonymized form for service improvement</li>
            </ul>
          </CardContent>
        </Card>

        {/* Cookies and Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Cookies and Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">
                We use cookies and similar technologies to provide and improve our services:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Essential Cookies</h4>
                  <p className="text-xs text-muted-foreground">
                    Required for authentication, security, and basic functionality. Cannot be disabled.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Analytics Cookies</h4>
                  <p className="text-xs text-muted-foreground">
                    Help us understand how our service is used to improve performance and user experience.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Email:</strong> privacy@subagents.sh<br />
                <strong>Subject:</strong> Privacy Policy Inquiry<br />
                <strong>Response Time:</strong> We aim to respond within 48 hours
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Updates */}
        <Card>
          <CardHeader>
            <CardTitle>Policy Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by 
              posting the new policy on this page and updating the "Last updated" date. We encourage you to 
              review this policy periodically for any changes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}