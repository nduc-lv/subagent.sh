'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, Menu, Github, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AuthButton } from '@/components/auth/auth-button';
import { UserDropdown } from '@/components/auth/user-dropdown';
import { useAuth } from '@/contexts/auth-context';
import { GitHubStars } from '@/components/github-stars';

export function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/agents?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-50 w-full border-b border-border/60 backdrop-blur-md shadow-sm">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Mobile menu trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <MobileNav />
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <div className="bg-primary h-6 w-6 rounded" />
          <span className="font-bold">subagents.sh</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden gap-6 md:flex">
          <Link
            href="/agents"
            className="hover:text-primary text-sm font-medium transition-colors"
          >
            Explore
          </Link>
          <Link
            href="/categories"
            className="hover:text-primary text-sm font-medium transition-colors"
          >
            Categories
          </Link>
          <Link
            href="/submit"
            className="hover:text-primary text-sm font-medium transition-colors"
          >
            Submit
          </Link>
        </nav>

        {/* Search and actions */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <button
                onClick={handleSearch}
                className="text-muted-foreground hover:text-foreground absolute top-2.5 left-2.5 h-4 w-4 transition-colors cursor-pointer"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
              <Input
                placeholder="Search..."
                className="pl-8 w-[120px] sm:w-[200px] md:w-[300px] lg:w-[400px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <GitHubStars />
            <ThemeToggle />
            {!loading && (
              user ? (
                <UserDropdown />
              ) : (
                <>
                  <AuthButton variant="ghost" size="sm" />
                  <Button size="sm" asChild>
                    <Link href="/auth/signin">Get Started</Link>
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col space-y-3">
      <Link href="/" className="flex items-center space-x-2">
        <div className="bg-primary h-6 w-6 rounded" />
        <span className="font-bold">subagents.sh</span>
      </Link>
      <nav className="flex flex-col space-y-2">
        <Link href="/agents" className="text-sm font-medium">
          Browse
        </Link>
        <Link href="/categories" className="text-sm font-medium">
          Categories
        </Link>
        <Link href="/submit" className="text-sm font-medium">
          Submit
        </Link>
        <Link 
          href="https://github.com/augmnt/subagents.sh" 
          className="text-sm font-medium flex items-center gap-1"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github className="h-4 w-4" />
          GitHub
        </Link>
        {user && (
          <>
            <Link href="/profile" className="text-sm font-medium">
              Profile
            </Link>
            <Link href="/collections" className="text-sm font-medium">
              Collections
            </Link>
          </>
        )}
      </nav>
      
      <div className="pt-4 border-t">
        {!loading && (
          user ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {user.user_metadata?.user_name || user.email}
              </p>
              <AuthButton variant="outline" className="w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              <AuthButton className="w-full" />
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/auth/signin">Get Started</Link>
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
