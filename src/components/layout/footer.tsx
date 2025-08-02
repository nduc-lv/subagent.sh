import Link from 'next/link';
import { Github, Twitter, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-background border-t border-border/60">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          {/* Company */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-primary h-6 w-6 rounded" />
              <span className="font-bold">subagents.sh</span>
            </Link>
            <p className="text-muted-foreground/80 mt-4 text-sm leading-relaxed">
              Discover and share Claude Code sub-agents to enhance your
              development workflow.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/agents"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Browse
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Categories
                </Link>
              </li>
              <li>
                <Link
                  href="/submit"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Submit Agent
                </Link>
              </li>
            </ul>
          </div>


          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/augmnt/subagents.sh"
                  className="text-muted-foreground hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Feedback & Issues
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
            <p className="text-muted-foreground/80 text-sm">
              &copy; 2024 subagents.sh. All rights reserved.
            </p>
            <span className="hidden md:inline text-muted-foreground/60">•</span>
            <p className="text-muted-foreground/80 text-sm flex items-center gap-1">
              Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> by{' '}
              <Link href="https://augmnt.sh/" className="hover:text-foreground transition-colors">
                augmnt
              </Link>
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="https://github.com/augmnt/subagents.sh"
              className="text-muted-foreground hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub Source</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
