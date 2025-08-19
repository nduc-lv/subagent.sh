export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_downloads: {
        Row: {
          agent_id: string | null
          created_at: string | null
          download_type: string | null
          id: string
          ip_address: unknown | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          download_type?: string | null
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          download_type?: string | null
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_downloads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_views: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_views_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          allow_comments: boolean | null
          author_id: string | null
          category_id: string | null
          created_at: string | null
          demo_url: string | null
          description: string | null
          detailed_description: string | null
          documentation_url: string | null
          download_count: number | null
          featured: boolean | null
          framework: string | null
          github_forks: number | null
          github_last_commit: string | null
          github_owner: string | null
          github_repo_name: string | null
          github_repo_url: string | null
          github_stars: number | null
          github_sync_enabled: boolean | null
          homepage_url: string | null
          id: string
          language: string | null
          license: string | null
          name: string
          published_at: string | null
          rating_average: number | null
          rating_count: number | null
          status: Database["public"]["Enums"]["agent_status"] | null
          tags: string[] | null
          updated_at: string | null
          version: string | null
          slug: string | null
          short_description: string | null
          view_count: number | null
        }
        Insert: {
          allow_comments?: boolean | null
          author_id?: string | null
          category_id?: string | null
          created_at?: string | null
          demo_url?: string | null
          description?: string | null
          detailed_description?: string | null
          documentation_url?: string | null
          download_count?: number | null
          featured?: boolean | null
          framework?: string | null
          github_forks?: number | null
          github_last_commit?: string | null
          github_owner?: string | null
          github_repo_name?: string | null
          github_repo_url?: string | null
          github_stars?: number | null
          github_sync_enabled?: boolean | null
          homepage_url?: string | null
          id?: string
          language?: string | null
          license?: string | null
          name: string
          published_at?: string | null
          rating_average?: number | null
          rating_count?: number | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          tags?: string[] | null
          updated_at?: string | null
          version?: string | null
          view_count?: number | null
        }
        Update: {
          allow_comments?: boolean | null
          author_id?: string | null
          category_id?: string | null
          created_at?: string | null
          demo_url?: string | null
          description?: string | null
          detailed_description?: string | null
          documentation_url?: string | null
          download_count?: number | null
          featured?: boolean | null
          framework?: string | null
          github_forks?: number | null
          github_last_commit?: string | null
          github_owner?: string | null
          github_repo_name?: string | null
          github_repo_url?: string | null
          github_stars?: number | null
          github_sync_enabled?: boolean | null
          homepage_url?: string | null
          id?: string
          language?: string | null
          license?: string | null
          name?: string
          published_at?: string | null
          rating_average?: number | null
          rating_count?: number | null
          status?: Database["public"]["Enums"]["agent_status"] | null
          tags?: string[] | null
          updated_at?: string | null
          version?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          agent_count: number | null
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          agent_count?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          agent_count?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      collection_agents: {
        Row: {
          added_at: string | null
          agent_id: string | null
          collection_id: string | null
          id: string
          position: number | null
        }
        Insert: {
          added_at?: string | null
          agent_id?: string | null
          collection_id?: string | null
          id?: string
          position?: number | null
        }
        Update: {
          added_at?: string | null
          agent_id?: string | null
          collection_id?: string | null
          id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_agents_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          agent_count: number | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          slug: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          slug?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          slug?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          commit_sha: string | null
          created_at: string | null
          deployed_at: string | null
          deployed_by: string | null
          environment: string
          id: string
          notes: string | null
          status: string
          updated_at: string | null
          url: string | null
          version: string
        }
        Insert: {
          commit_sha?: string | null
          created_at?: string | null
          deployed_at?: string | null
          deployed_by?: string | null
          environment?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
          url?: string | null
          version: string
        }
        Update: {
          commit_sha?: string | null
          created_at?: string | null
          deployed_at?: string | null
          deployed_by?: string | null
          environment?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
          url?: string | null
          version?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string | null
          following_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      github_sync_log: {
        Row: {
          agent_id: string | null
          completed_at: string | null
          data: Json | null
          id: string
          message: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          completed_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          started_at?: string | null
          status: string
        }
        Update: {
          agent_id?: string | null
          completed_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_sync_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          github_username: string | null
          id: string
          location: string | null
          twitter_username: string | null
          updated_at: string | null
          username: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          github_username?: string | null
          id: string
          location?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          username?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          github_username?: string | null
          id?: string
          location?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          username?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      review_analytics: {
        Row: {
          agent_id: string
          average_rating: number | null
          avg_documentation_rating: number | null
          avg_performance_rating: number | null
          avg_reliability_rating: number | null
          avg_usability_rating: number | null
          created_at: string | null
          flagged_reviews: number | null
          helpful_votes: number | null
          id: string
          new_reviews: number | null
          period_end: string
          period_start: string
          rating_distribution: Json | null
          response_rate: number | null
          total_reviews: number | null
          total_votes: number | null
          verified_reviews: number | null
        }
        Insert: {
          agent_id: string
          average_rating?: number | null
          avg_documentation_rating?: number | null
          avg_performance_rating?: number | null
          avg_reliability_rating?: number | null
          avg_usability_rating?: number | null
          created_at?: string | null
          flagged_reviews?: number | null
          helpful_votes?: number | null
          id?: string
          new_reviews?: number | null
          period_end: string
          period_start: string
          rating_distribution?: Json | null
          response_rate?: number | null
          total_reviews?: number | null
          total_votes?: number | null
          verified_reviews?: number | null
        }
        Update: {
          agent_id?: string
          average_rating?: number | null
          avg_documentation_rating?: number | null
          avg_performance_rating?: number | null
          avg_reliability_rating?: number | null
          avg_usability_rating?: number | null
          created_at?: string | null
          flagged_reviews?: number | null
          helpful_votes?: number | null
          id?: string
          new_reviews?: number | null
          period_end?: string
          period_start?: string
          rating_distribution?: Json | null
          response_rate?: number | null
          total_reviews?: number | null
          total_votes?: number | null
          verified_reviews?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_analytics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      review_drafts: {
        Row: {
          agent_id: string
          cons: string[] | null
          content: string | null
          created_at: string | null
          documentation_rating: number | null
          id: string
          overall_rating: number | null
          performance_rating: number | null
          pros: string[] | null
          reliability_rating: number | null
          title: string | null
          updated_at: string | null
          usability_rating: number | null
          use_case: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          cons?: string[] | null
          content?: string | null
          created_at?: string | null
          documentation_rating?: number | null
          id?: string
          overall_rating?: number | null
          performance_rating?: number | null
          pros?: string[] | null
          reliability_rating?: number | null
          title?: string | null
          updated_at?: string | null
          usability_rating?: number | null
          use_case?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          cons?: string[] | null
          content?: string | null
          created_at?: string | null
          documentation_rating?: number | null
          id?: string
          overall_rating?: number | null
          performance_rating?: number | null
          pros?: string[] | null
          reliability_rating?: number | null
          title?: string | null
          updated_at?: string | null
          usability_rating?: number | null
          use_case?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_drafts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_edit_history: {
        Row: {
          content_after: string | null
          content_before: string | null
          created_at: string | null
          edit_reason: string | null
          edited_by: string | null
          id: string
          review_id: string
          title_after: string | null
          title_before: string | null
        }
        Insert: {
          content_after?: string | null
          content_before?: string | null
          created_at?: string | null
          edit_reason?: string | null
          edited_by?: string | null
          id?: string
          review_id: string
          title_after?: string | null
          title_before?: string | null
        }
        Update: {
          content_after?: string | null
          content_before?: string | null
          created_at?: string | null
          edit_reason?: string | null
          edited_by?: string | null
          id?: string
          review_id?: string
          title_after?: string | null
          title_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_edit_history_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_edit_history_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_flags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          review_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flags_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_responses: {
        Row: {
          content: string
          created_at: string | null
          id: string
          review_id: string
          status: Database["public"]["Enums"]["review_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          review_id: string
          status?: Database["public"]["Enums"]["review_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          review_id?: string
          status?: Database["public"]["Enums"]["review_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_responses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_votes: {
        Row: {
          created_at: string | null
          id: string
          review_id: string
          user_id: string
          vote_type: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          review_id: string
          user_id: string
          vote_type: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          review_id?: string
          user_id?: string
          vote_type?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          agent_id: string
          cons: string[] | null
          content: string | null
          created_at: string | null
          documentation_rating: number | null
          edit_count: number | null
          edit_reason: string | null
          flagged_count: number | null
          helpful_count: number | null
          id: string
          image_urls: string[] | null
          is_verified_purchase: boolean | null
          last_edited_at: string | null
          last_flagged_at: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          not_helpful_count: number | null
          overall_rating: number
          performance_rating: number | null
          pros: string[] | null
          quality_score: number | null
          reliability_rating: number | null
          status: Database["public"]["Enums"]["review_status"] | null
          title: string | null
          total_votes: number | null
          updated_at: string | null
          usability_rating: number | null
          use_case: string | null
          user_id: string
          verification_level:
            | Database["public"]["Enums"]["verification_level"]
            | null
        }
        Insert: {
          agent_id: string
          cons?: string[] | null
          content?: string | null
          created_at?: string | null
          documentation_rating?: number | null
          edit_count?: number | null
          edit_reason?: string | null
          flagged_count?: number | null
          helpful_count?: number | null
          id?: string
          image_urls?: string[] | null
          is_verified_purchase?: boolean | null
          last_edited_at?: string | null
          last_flagged_at?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          not_helpful_count?: number | null
          overall_rating: number
          performance_rating?: number | null
          pros?: string[] | null
          quality_score?: number | null
          reliability_rating?: number | null
          status?: Database["public"]["Enums"]["review_status"] | null
          title?: string | null
          total_votes?: number | null
          updated_at?: string | null
          usability_rating?: number | null
          use_case?: string | null
          user_id: string
          verification_level?:
            | Database["public"]["Enums"]["verification_level"]
            | null
        }
        Update: {
          agent_id?: string
          cons?: string[] | null
          content?: string | null
          created_at?: string | null
          documentation_rating?: number | null
          edit_count?: number | null
          edit_reason?: string | null
          flagged_count?: number | null
          helpful_count?: number | null
          id?: string
          image_urls?: string[] | null
          is_verified_purchase?: boolean | null
          last_edited_at?: string | null
          last_flagged_at?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          not_helpful_count?: number | null
          overall_rating?: number
          performance_rating?: number | null
          pros?: string[] | null
          quality_score?: number | null
          reliability_rating?: number | null
          status?: Database["public"]["Enums"]["review_status"] | null
          title?: string | null
          total_votes?: number | null
          updated_at?: string | null
          usability_rating?: number | null
          use_case?: string | null
          user_id?: string
          verification_level?:
            | Database["public"]["Enums"]["verification_level"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alert_frequency: string | null
          created_at: string | null
          filters: Json | null
          id: string
          is_alert: boolean | null
          last_alert_sent: string | null
          name: string
          query: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_frequency?: string | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_alert?: boolean | null
          last_alert_sent?: string | null
          name: string
          query?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_frequency?: string | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_alert?: boolean | null
          last_alert_sent?: string | null
          name?: string
          query?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_analytics: {
        Row: {
          clicked_agent_id: string | null
          created_at: string | null
          filters: Json | null
          id: string
          ip_address: unknown | null
          query: string
          result_count: number | null
          search_time_ms: number | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          clicked_agent_id?: string | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          ip_address?: unknown | null
          query: string
          result_count?: number | null
          search_time_ms?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_agent_id?: string | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          ip_address?: unknown | null
          query?: string
          result_count?: number | null
          search_time_ms?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_analytics_clicked_agent_id_fkey"
            columns: ["clicked_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_suggestions: {
        Row: {
          created_at: string | null
          frequency: number | null
          id: string
          last_used: string | null
          term: string
        }
        Insert: {
          created_at?: string | null
          frequency?: number | null
          id?: string
          last_used?: string | null
          term: string
        }
        Update: {
          created_at?: string | null
          frequency?: number | null
          id?: string
          last_used?: string | null
          term?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          review_id: string | null
          review_vote_id: string | null
          user_id: string | null
          vote_type: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          review_id?: string | null
          review_vote_id?: string | null
          user_id?: string | null
          vote_type: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          review_id?: string | null
          review_vote_id?: string | null
          user_id?: string | null
          vote_type?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "votes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_review_vote_id_fkey"
            columns: ["review_vote_id"]
            isOneToOne: false
            referencedRelation: "review_votes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      search_facets: {
        Row: {
          count: number | null
          facet_type: string | null
          value: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_agent_rating: {
        Args: { agent_uuid: string }
        Returns: {
          average_rating: number
          total_reviews: number
        }[]
      }
      calculate_review_quality_score: {
        Args: { review_id: string }
        Returns: number
      }
      dmetaphone: {
        Args: { "": string }
        Returns: string
      }
      dmetaphone_alt: {
        Args: { "": string }
        Returns: string
      }
      enhanced_search_agents: {
        Args: {
          category_filter?: string
          date_from?: string
          date_to?: string
          featured_only?: boolean
          framework_filter?: string
          language_filter?: string
          limit_count?: number
          offset_count?: number
          rating_min?: number
          search_query?: string
          session_id_param?: string
          sort_by?: string
          tag_filters?: string[]
          user_id_param?: string
        }
        Returns: {
          author_avatar_url: string
          author_full_name: string
          author_id: string
          author_username: string
          category_color: string
          category_icon: string
          category_id: string
          category_name: string
          category_slug: string
          created_at: string
          description: string
          detailed_description: string
          download_count: number
          featured: boolean
          framework: string
          github_forks: number
          github_stars: number
          id: string
          is_bookmarked: boolean
          language: string
          license: string
          name: string
          original_author_avatar_url: string
          original_author_github_url: string
          original_author_github_username: string
          published_at: string
          rating_average: number
          rating_count: number
          search_rank: number
          tags: string[]
          updated_at: string
          view_count: number
        }[]
      }
      get_platform_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_rating: number
          total_agents: number
          total_downloads: number
        }[]
      }
      get_review_statistics: {
        Args: { agent_uuid: string }
        Returns: {
          average_rating: number
          category_ratings: Json
          rating_distribution: Json
          recent_reviews: number
          response_rate: number
          total_reviews: number
          verified_reviews: number
        }[]
      }
      get_search_analytics: {
        Args: { days_back?: number; user_id_param?: string }
        Returns: {
          avg_results: number
          search_trends: Json
          top_queries: string[]
          total_searches: number
          unique_queries: number
        }[]
      }
      get_search_suggestions: {
        Args: { limit_count?: number; query_prefix: string }
        Returns: {
          frequency: number
          suggestion: string
        }[]
      }
      get_trending_agents: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          author_username: string
          category_name: string
          description: string
          download_count: number
          id: string
          name: string
          rating_average: number
          recent_downloads: number
          trend_score: number
        }[]
      }
      get_trending_searches: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          query: string
          search_count: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      immutable_array_to_string: {
        Args: { arr: unknown; sep: string }
        Returns: string
      }
      refresh_search_facets: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      search_agents: {
        Args: {
          category_filter?: string
          limit_count?: number
          offset_count?: number
          search_query?: string
          sort_by?: string
          tag_filters?: string[]
        }
        Returns: {
          author_id: string
          author_username: string
          category_id: string
          category_name: string
          created_at: string
          description: string
          download_count: number
          id: string
          name: string
          rating_average: number
          rating_count: number
          search_rank: number
          tags: string[]
          updated_at: string
          view_count: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      soundex: {
        Args: { "": string }
        Returns: string
      }
      sync_github_repo: {
        Args: { agent_uuid: string; repo_data: Json }
        Returns: boolean
      }
      text_soundex: {
        Args: { "": string }
        Returns: string
      }
      update_agent_rating: {
        Args: { agent_uuid: string }
        Returns: undefined
      }
      update_search_suggestion: {
        Args: { search_term: string }
        Returns: undefined
      }
    }
    Enums: {
      agent_status: "draft" | "published" | "archived" | "under_review"
      moderation_action: "approve" | "hide" | "remove" | "flag"
      review_category:
        | "usability"
        | "documentation"
        | "performance"
        | "reliability"
        | "overall"
      review_status: "active" | "hidden" | "flagged"
      verification_level: "none" | "email" | "github" | "verified_user"
      vote_type: "upvote" | "downvote"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          format: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      agent_status: ["draft", "published", "archived", "under_review"],
      moderation_action: ["approve", "hide", "remove", "flag"],
      review_category: [
        "usability",
        "documentation",
        "performance",
        "reliability",
        "overall",
      ],
      review_status: ["active", "hidden", "flagged"],
      verification_level: ["none", "email", "github", "verified_user"],
      vote_type: ["upvote", "downvote"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS"],
    },
  },
} as const

