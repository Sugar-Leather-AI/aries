export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
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
      activity_feed: {
        Row: {
          client_id: string
          contact_id: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          icon: string
          id: string
          metadata: Json | null
          title: string
          type: string
        }
        Insert: {
          client_id: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          icon?: string
          id?: string
          metadata?: Json | null
          title: string
          type: string
        }
        Update: {
          client_id?: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          icon?: string
          id?: string
          metadata?: Json | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          accent_color: string | null
          created_at: string
          custom_domain: string | null
          id: string
          logo_url: string | null
          mrr: number | null
          name: string
          owner_id: string
          plan: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          mrr?: number | null
          name: string
          owner_id: string
          plan?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          mrr?: number | null
          name?: string
          owner_id?: string
          plan?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          active: boolean | null
          agent_type: string
          category: string | null
          client_id: string
          config: Json | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          metric: string | null
          name: string
          roi: string | null
          trigger_count: number | null
        }
        Insert: {
          active?: boolean | null
          agent_type: string
          category?: string | null
          client_id: string
          config?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          metric?: string | null
          name: string
          roi?: string | null
          trigger_count?: number | null
        }
        Update: {
          active?: boolean | null
          agent_type?: string
          category?: string | null
          client_id?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          metric?: string | null
          name?: string
          roi?: string | null
          trigger_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string
          contact_id: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          reminder_1h_sent_at: string | null
          reminder_24h_sent_at: string | null
          reminder_48h_sent_at: string | null
          review_requested: boolean | null
          scheduled_at: string
          service: string | null
          status: string | null
        }
        Insert: {
          client_id: string
          contact_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          reminder_48h_sent_at?: string | null
          review_requested?: boolean | null
          scheduled_at: string
          service?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string
          contact_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          reminder_48h_sent_at?: string | null
          review_requested?: boolean | null
          scheduled_at?: string
          service?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_accounts: {
        Row: {
          channel: string
          client_id: string
          config: Json | null
          created_at: string | null
          id: string
          identifier: string
          is_active: boolean | null
          provider: string
        }
        Insert: {
          channel: string
          client_id: string
          config?: Json | null
          created_at?: string | null
          id?: string
          identifier: string
          is_active?: boolean | null
          provider: string
        }
        Update: {
          channel?: string
          client_id?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          identifier?: string
          is_active?: boolean | null
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          agency_id: string
          agents_active: number | null
          business_name: string
          cal_api_key: string | null
          cal_url: string | null
          city: string | null
          contacts_count: number | null
          created_at: string
          email: string
          google_place_id: string | null
          health_score: number | null
          id: string
          invoice_settings: Json
          logo_url: string | null
          mrr: number | null
          niche: string | null
          owner_name: string
          phone: string | null
          plan: string | null
          state: string | null
          status: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          agency_id: string
          agents_active?: number | null
          business_name: string
          cal_api_key?: string | null
          cal_url?: string | null
          city?: string | null
          contacts_count?: number | null
          created_at?: string
          email: string
          google_place_id?: string | null
          health_score?: number | null
          id?: string
          invoice_settings?: Json
          logo_url?: string | null
          mrr?: number | null
          niche?: string | null
          owner_name: string
          phone?: string | null
          plan?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          agency_id?: string
          agents_active?: number | null
          business_name?: string
          cal_api_key?: string | null
          cal_url?: string | null
          city?: string | null
          contacts_count?: number | null
          created_at?: string
          email?: string
          google_place_id?: string | null
          health_score?: number | null
          id?: string
          invoice_settings?: Json
          logo_url?: string | null
          mrr?: number | null
          niche?: string | null
          owner_name?: string
          phone?: string | null
          plan?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          ai_analysis: Json | null
          city: string | null
          client_id: string
          country: string | null
          created_at: string
          description: string | null
          domain: string | null
          email: string | null
          employee_count: string | null
          founded_year: number | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          phone: string | null
          revenue_range: string | null
          scraped_data: Json | null
          segment: string | null
          social_facebook: string | null
          social_linkedin: string | null
          social_twitter: string | null
          state: string | null
          tags: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          ai_analysis?: Json | null
          city?: string | null
          client_id: string
          country?: string | null
          created_at?: string
          description?: string | null
          domain?: string | null
          email?: string | null
          employee_count?: string | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          revenue_range?: string | null
          scraped_data?: Json | null
          segment?: string | null
          social_facebook?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          ai_analysis?: Json | null
          city?: string | null
          client_id?: string
          country?: string | null
          created_at?: string
          description?: string | null
          domain?: string | null
          email?: string | null
          employee_count?: string | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          revenue_range?: string | null
          scraped_data?: Json | null
          segment?: string | null
          social_facebook?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      company_knowledge: {
        Row: {
          client_id: string
          company_id: string | null
          content: string
          content_type: string | null
          created_at: string
          id: string
          page_title: string | null
          page_type: string | null
          page_url: string
          scraped_at: string
          summary: string | null
        }
        Insert: {
          client_id: string
          company_id?: string | null
          content: string
          content_type?: string | null
          created_at?: string
          id?: string
          page_title?: string | null
          page_type?: string | null
          page_url: string
          scraped_at?: string
          summary?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string | null
          content?: string
          content_type?: string | null
          created_at?: string
          id?: string
          page_title?: string | null
          page_type?: string | null
          page_url?: string
          scraped_at?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_knowledge_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_knowledge_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar_url: string | null
          client_id: string
          company_id: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_contacted_at: string | null
          last_name: string
          lead_score: number | null
          phone: string | null
          source: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          client_id: string
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_contacted_at?: string | null
          last_name: string
          lead_score?: number | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_contacted_at?: string | null
          last_name?: string
          lead_score?: number | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          ai_score: number | null
          client_id: string
          company_id: string | null
          company_name: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string
          days_in_stage: number | null
          expected_close_date: string | null
          id: string
          notes: string | null
          stage: string | null
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          ai_score?: number | null
          client_id: string
          company_id?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          days_in_stage?: number | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          stage?: string | null
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          ai_score?: number | null
          client_id?: string
          company_id?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          days_in_stage?: number | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          stage?: string | null
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          message_id: string | null
          payload: Json | null
          provider_message_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          message_id?: string | null
          payload?: Json | null
          provider_message_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          message_id?: string | null
          payload?: Json | null
          provider_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string
          contact_name: string | null
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          status: string | null
        }
        Insert: {
          amount: number
          client_id: string
          contact_name?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          contact_name?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel: string
          client_id: string
          contact_id: string | null
          content: string
          direction: string
          id: string
          is_read: boolean | null
          metadata: Json | null
          provider_message_id: string | null
          recipient_identifier: string | null
          sender_name: string | null
          sent_at: string
          status: string | null
          subject: string | null
        }
        Insert: {
          channel: string
          client_id: string
          contact_id?: string | null
          content: string
          direction: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_identifier?: string | null
          sender_name?: string | null
          sent_at?: string
          status?: string | null
          subject?: string | null
        }
        Update: {
          channel?: string
          client_id?: string
          contact_id?: string | null
          content?: string
          direction?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_identifier?: string | null
          sender_name?: string | null
          sent_at?: string
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          actual_cost: number | null
          budget: number | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number | null
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          budget?: number | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          budget?: number | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          client_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          actual_hours: number | null
          assigned_name: string | null
          assigned_to: string | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          labels: string[] | null
          milestone_id: string | null
          position: number | null
          priority: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_name?: string | null
          assigned_to?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          labels?: string[] | null
          milestone_id?: string | null
          position?: number | null
          priority?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_name?: string | null
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          labels?: string[] | null
          milestone_id?: string | null
          position?: number | null
          priority?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_cost: number | null
          client_id: string
          color: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          description: string | null
          id: string
          name: string
          status: string
          technologies: string[] | null
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          client_id: string
          color?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          technologies?: string[] | null
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          client_id?: string
          color?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          technologies?: string[] | null
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: string
          contact_name: string | null
          content: string | null
          id: string
          platform: string | null
          posted_at: string | null
          rating: number
          responded: boolean | null
          response: string | null
        }
        Insert: {
          client_id: string
          contact_name?: string | null
          content?: string | null
          id?: string
          platform?: string | null
          posted_at?: string | null
          rating: number
          responded?: boolean | null
          response?: string | null
        }
        Update: {
          client_id?: string
          contact_name?: string | null
          content?: string | null
          id?: string
          platform?: string | null
          posted_at?: string | null
          rating?: number
          responded?: boolean | null
          response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string | null
          email: string
          id: string
          invited_by: string | null
          role: string
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string | null
          email: string
          id?: string
          invited_by?: string | null
          role?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      welcome_sequences: {
        Row: {
          client_id: string
          completed: boolean | null
          contact_id: string
          created_at: string
          id: string
          next_send_at: string
          sent_at: string | null
          step: number
        }
        Insert: {
          client_id: string
          completed?: boolean | null
          contact_id: string
          created_at?: string
          id?: string
          next_send_at?: string
          sent_at?: string | null
          step?: number
        }
        Update: {
          client_id?: string
          completed?: boolean | null
          contact_id?: string
          created_at?: string
          id?: string
          next_send_at?: string
          sent_at?: string | null
          step?: number
        }
        Relationships: [
          {
            foreignKeyName: "welcome_sequences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welcome_sequences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_user_client_id: { Args: never; Returns: string }
      get_user_agency_id: { Args: never; Returns: string }
      get_user_client_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "agency_owner" | "client" | "staff"
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
      app_role: ["agency_owner", "client", "staff"],
    },
  },
} as const
