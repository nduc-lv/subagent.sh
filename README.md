# subagents.sh

[![GitHub stars](https://img.shields.io/github/stars/augmnt/subagents.sh?style=social)](https://github.com/augmnt/subagents.sh/stargazers)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org)

**A marketplace for Claude Code sub-agents** - Discover, share, and enhance your development workflow with specialized AI sub-agents for [Claude Code](https://claude.ai/code).

🌐 **Live Site**: [subagents.sh](https://subagents.sh)

## ✨ Features

- 🔍 **Browse & Search** - Discover sub-agents by category, language, and functionality
- 🚀 **GitHub Integration** - Import sub-agents directly from GitHub repositories
- 👤 **User Profiles** - Manage your sub-agents and collections
- ⭐ **Reviews & Ratings** - Community-driven quality assessment
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🌙 **Dark Mode** - Modern UI with light/dark theme support
- 🔐 **Secure Authentication** - GitHub OAuth integration

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org) with App Router
- **Language**: [TypeScript](https://typescriptlang.org)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com)
- **Database**: [Supabase](https://supabase.com) (PostgreSQL)
- **Authentication**: [Supabase Auth](https://supabase.com/auth) with GitHub OAuth
- **Deployment**: [Vercel](https://vercel.com)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase CLI (for database development) ([Guide Download](https://supabase.com/docs/guides/local-development/cli/getting-started?queryGroups=platform))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/augmnt/subagents.sh.git
   cd subagents.sh
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GITHUB_TOKEN=your_github_token
   ```

4. **Set up the database**
   ```bash
   npm run db:setup
   npm run db:start
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the application.


## How to set up Oauth with Github
- [Guide](https://supabase.com/docs/guides/auth/social-login/auth-github)

## 📚 Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:setup        # Set up Supabase locally
npm run db:start        # Start Supabase
npm run db:stop         # Stop Supabase
npm run db:reset        # Reset database
npm run db:types        # Generate TypeScript types

# Testing
npm run test            # Run unit tests
npm run test:e2e        # Run end-to-end tests
npm run test:all        # Run all tests

# Code Quality
npm run lint            # Lint code
npm run lint:fix        # Fix linting issues
npm run format          # Format code
npm run type-check      # Type checking
```

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to get started.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Make your changes and add tests
4. Commit using conventional commits: `git commit -m "feat: add amazing feature"`
5. Push to your fork: `git push origin feat/amazing-feature`
6. Create a Pull Request

## 📋 Code of Conduct

We are committed to providing a friendly, safe, and welcoming environment for all contributors. By participating in this project, you agree to abide by our simple code of conduct:

- **Be respectful** - Treat everyone with respect and kindness
- **Be inclusive** - Welcome people of all backgrounds and experience levels  
- **Be constructive** - Focus on what's best for the community
- **Be professional** - Keep discussions focused and productive

For more details, see our [Code of Conduct](./CODE_OF_CONDUCT.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- **Website**: [subagents.sh](https://subagents.sh)
- **GitHub**: [github.com/augmnt/subagents.sh](https://github.com/augmnt/subagents.sh)
- **Issues**: [Report bugs or request features](https://github.com/augmnt/subagents.sh/issues)
- **Discussions**: [Join the conversation](https://github.com/augmnt/subagents.sh/discussions)

## 🙏 Acknowledgments

- [Claude Code](https://claude.ai/code) - The AI-powered development environment
- [Anthropic](https://anthropic.com) - For creating Claude
- [Vercel](https://vercel.com) - For hosting and deployment
- [Supabase](https://supabase.com) - For backend infrastructure
- All our [contributors](https://github.com/augmnt/subagents.sh/graphs/contributors)

---

**Made with ❤️ by the [augmnt](https://augmnt.sh) team**

⭐ **Star this repo if you find it useful!**