'use client';

import { Scale, Clock, Shield, AlertTriangle, Users, Code, Globe, Mail, Gavel } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Scale className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Your rights and responsibilities when using Subagents.sh
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Agreement */}
        <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50/30 to-blue-50/20 dark:from-blue-950/20 dark:to-blue-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Agreement to Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              By accessing or using Subagents.sh ("Service", "Platform"), you agree to be bound by these Terms of Service ("Terms"). 
              If you disagree with any part of these terms, you may not access the Service.
            </p>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Service Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Subagents.sh is a platform that allows users to discover, share, and review AI agents and automation tools. 
              Our service includes:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Agent discovery and browsing functionality</li>
              <li>• User-generated content including agent submissions and reviews</li>
              <li>• Community features for sharing and discussing AI tools</li>
              <li>• User profiles and social interactions</li>
              <li>• Integration with GitHub for authentication and content importing</li>
            </ul>
          </CardContent>
        </Card>

        {/* User Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Account Creation</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• You must be at least 13 years old to create an account</li>
                <li>• You must provide accurate and complete information</li>
                <li>• You are responsible for maintaining the security of your account</li>
                <li>• One account per person - multiple accounts are not permitted</li>
                <li>• We use GitHub OAuth for authentication - you must have a valid GitHub account</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Account Responsibilities</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• You are responsible for all activities under your account</li>
                <li>• Notify us immediately of any unauthorized access</li>
                <li>• Keep your contact information current</li>
                <li>• You may delete your account at any time from your profile settings</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Acceptable Use */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Acceptable Use Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium mb-2 text-green-900 dark:text-green-100">You May:</h4>
              <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                <li>• Share and discover AI agents and automation tools</li>
                <li>• Write honest reviews and provide constructive feedback</li>
                <li>• Engage respectfully with the community</li>
                <li>• Report inappropriate content or behavior</li>
                <li>• Use the platform for legitimate business or personal purposes</li>
              </ul>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h4 className="font-medium mb-2 text-red-900 dark:text-red-100">You May NOT:</h4>
              <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
                <li>• Submit malicious, harmful, or illegal agents or content</li>
                <li>• Post spam, fake reviews, or manipulate ratings</li>
                <li>• Harass, abuse, or discriminate against other users</li>
                <li>• Violate intellectual property rights</li>
                <li>• Attempt to gain unauthorized access to our systems</li>
                <li>• Use automated tools to scrape or abuse the platform</li>
                <li>• Share personal information of others without consent</li>
                <li>• Circumvent security measures or rate limits</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Content Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Content Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">User-Generated Content</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• You retain ownership of content you create and submit</li>
                <li>• By posting content, you grant us a license to display and distribute it on the platform</li>
                <li>• Content must be original or you must have rights to share it</li>
                <li>• We may remove content that violates these terms or our community guidelines</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Prohibited Content</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Illegal, harmful, or malicious software or agents</li>
                <li>• Content that infringes copyright, trademark, or other IP rights</li>
                <li>• Hate speech, harassment, or discriminatory content</li>
                <li>• Adult content, violence, or material harmful to minors</li>
                <li>• Misleading information or fraudulent claims</li>
                <li>• Personal information or privacy violations</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Intellectual Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Our Rights</h3>
              <p className="text-sm text-muted-foreground mb-3">
                The Subagents.sh platform, including its design, functionality, and branding, is owned by us and protected by intellectual property laws.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Your Rights</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• You retain ownership of agents and content you create</li>
                <li>• You grant us a license to display your content on the platform</li>
                <li>• You can remove your content at any time</li>
                <li>• You're responsible for ensuring you have rights to content you share</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">DMCA Compliance</h3>
              <p className="text-sm text-muted-foreground">
                If you believe content on our platform infringes your copyright, please contact us with a DMCA takedown notice at augmnts@protonmail.com.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy and Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy and Data Protection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-3">
              Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• We collect only necessary information to provide our services</li>
              <li>• We implement security measures to protect your data</li>
              <li>• You can delete your account and data at any time</li>
              <li>• We comply with applicable data protection laws</li>
            </ul>
          </CardContent>
        </Card>

        {/* Service Availability */}
        <Card>
          <CardHeader>
            <CardTitle>Service Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• We strive for high availability but cannot guarantee 100% uptime</li>
              <li>• We may perform maintenance that temporarily affects service availability</li>
              <li>• We reserve the right to modify or discontinue features with notice</li>
              <li>• We are not liable for service interruptions or data loss</li>
            </ul>
          </CardContent>
        </Card>

        {/* Disclaimers and Limitations */}
        <Card className="border-orange-200/50 bg-gradient-to-br from-orange-50/30 to-orange-50/20 dark:from-orange-950/20 dark:to-orange-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Disclaimers and Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Service Disclaimers</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• The service is provided "as is" without warranties of any kind</li>
                <li>• We don't endorse or guarantee the quality of user-submitted agents</li>
                <li>• Users are responsible for evaluating agents before use</li>
                <li>• We are not liable for damages from using agents found on our platform</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Limitation of Liability</h3>
              <p className="text-sm text-muted-foreground">
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, 
                consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, 
                or any loss of data, use, goodwill, or other intangible losses.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card>
          <CardHeader>
            <CardTitle>Account Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Your Right to Terminate</h3>
              <p className="text-sm text-muted-foreground mb-2">
                You may delete your account at any time from your profile settings. Upon deletion:
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Your profile and personal data will be permanently removed</li>
                <li>• Your agents and reviews will be deleted</li>
                <li>• This action cannot be undone</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Our Right to Terminate</h3>
              <p className="text-sm text-muted-foreground mb-2">
                We may suspend or terminate your account if you:
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Violate these Terms of Service</li>
                <li>• Engage in harmful or illegal activities</li>
                <li>• Abuse the platform or other users</li>
                <li>• Fail to respond to security concerns</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Governing Law and Disputes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Governing Law</h3>
              <p className="text-sm text-muted-foreground">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
                where Subagents.sh operates, without regard to conflict of law principles.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Dispute Resolution</h3>
              <p className="text-sm text-muted-foreground">
                We encourage resolving disputes through direct communication. For formal disputes, 
                parties agree to first attempt resolution through mediation before pursuing litigation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will notify users of material changes 
              by posting the updated terms on this page and updating the "Last updated" date. Continued use of 
              the service after changes constitutes acceptance of the new terms.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Email:</strong> augmnts@protonmail.com<br />
                <strong>Subject:</strong> Terms of Service Inquiry<br />
                <strong>Response Time:</strong> We aim to respond within 48 hours
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Severability */}
        <Card>
          <CardHeader>
            <CardTitle>Severability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions 
              will remain in full force and effect. The invalid provision will be replaced with a valid provision 
              that most closely matches the intent of the original provision.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}