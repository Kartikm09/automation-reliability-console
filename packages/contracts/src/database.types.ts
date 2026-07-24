export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      approval_requests: {
        Row: {
          assigned_to: string;
          created_at: string;
          decided_at: string | null;
          decision_note: string | null;
          description: string;
          due_at: string | null;
          id: string;
          organization_id: string;
          requested_by: string | null;
          run_step_id: string | null;
          status: string;
          title: string;
          workflow_run_id: string;
        };
        Insert: {
          assigned_to: string;
          created_at?: string;
          decided_at?: string | null;
          decision_note?: string | null;
          description: string;
          due_at?: string | null;
          id?: string;
          organization_id: string;
          requested_by?: string | null;
          run_step_id?: string | null;
          status?: string;
          title: string;
          workflow_run_id: string;
        };
        Update: {
          assigned_to?: string;
          created_at?: string;
          decided_at?: string | null;
          decision_note?: string | null;
          description?: string;
          due_at?: string | null;
          id?: string;
          organization_id?: string;
          requested_by?: string | null;
          run_step_id?: string | null;
          status?: string;
          title?: string;
          workflow_run_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approval_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_requests_run_step_id_fkey";
            columns: ["run_step_id"];
            isOneToOne: false;
            referencedRelation: "run_steps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_requests_workflow_run_id_fkey";
            columns: ["workflow_run_id"];
            isOneToOne: false;
            referencedRelation: "workflow_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          action: string;
          actor_type: string;
          actor_user_id: string | null;
          correlation_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          new_values: Json;
          old_values: Json;
          organization_id: string;
          resource_id: string | null;
          resource_type: string;
        };
        Insert: {
          action: string;
          actor_type: string;
          actor_user_id?: string | null;
          correlation_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          new_values?: Json;
          old_values?: Json;
          organization_id: string;
          resource_id?: string | null;
          resource_type: string;
        };
        Update: {
          action?: string;
          actor_type?: string;
          actor_user_id?: string | null;
          correlation_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          new_values?: Json;
          old_values?: Json;
          organization_id?: string;
          resource_id?: string | null;
          resource_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      environments: {
        Row: {
          created_at: string;
          environment_type: string;
          id: string;
          name: string;
          organization_id: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          environment_type: string;
          id?: string;
          name: string;
          organization_id: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          environment_type?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "environments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      incident_events: {
        Row: {
          actor_user_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          incident_id: string;
          metadata: Json;
          note: string | null;
          organization_id: string;
        };
        Insert: {
          actor_user_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          incident_id: string;
          metadata?: Json;
          note?: string | null;
          organization_id: string;
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          incident_id?: string;
          metadata?: Json;
          note?: string | null;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incident_events_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incident_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      incidents: {
        Row: {
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          assigned_to: string | null;
          created_at: string;
          detected_at: string;
          detection_source: string;
          id: string;
          organization_id: string;
          resolution_summary: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          root_cause: string | null;
          severity: string;
          status: string;
          summary: string;
          title: string;
          updated_at: string;
          workflow_definition_id: string;
          workflow_run_id: string | null;
        };
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          detected_at?: string;
          detection_source: string;
          id?: string;
          organization_id: string;
          resolution_summary?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          root_cause?: string | null;
          severity: string;
          status?: string;
          summary: string;
          title: string;
          updated_at?: string;
          workflow_definition_id: string;
          workflow_run_id?: string | null;
        };
        Update: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          detected_at?: string;
          detection_source?: string;
          id?: string;
          organization_id?: string;
          resolution_summary?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          root_cause?: string | null;
          severity?: string;
          status?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
          workflow_definition_id?: string;
          workflow_run_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_workflow_definition_id_fkey";
            columns: ["workflow_definition_id"];
            isOneToOne: false;
            referencedRelation: "workflow_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_workflow_run_id_fkey";
            columns: ["workflow_run_id"];
            isOneToOne: false;
            referencedRelation: "workflow_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_sources: {
        Row: {
          created_at: string;
          created_by: string | null;
          environment_id: string;
          external_account_reference: string | null;
          id: string;
          last_event_at: string | null;
          name: string;
          organization_id: string;
          provider_type: string;
          public_configuration: Json;
          status: string;
          updated_at: string;
          webhook_key_hash: string | null;
          webhook_key_prefix: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          environment_id: string;
          external_account_reference?: string | null;
          id?: string;
          last_event_at?: string | null;
          name: string;
          organization_id: string;
          provider_type: string;
          public_configuration?: Json;
          status?: string;
          updated_at?: string;
          webhook_key_hash?: string | null;
          webhook_key_prefix?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          environment_id?: string;
          external_account_reference?: string | null;
          id?: string;
          last_event_at?: string | null;
          name?: string;
          organization_id?: string;
          provider_type?: string;
          public_configuration?: Json;
          status?: string;
          updated_at?: string;
          webhook_key_hash?: string | null;
          webhook_key_prefix?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "environment_matches_organization";
            columns: ["organization_id", "environment_id"];
            isOneToOne: false;
            referencedRelation: "environments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "integration_sources_environment_id_fkey";
            columns: ["environment_id"];
            isOneToOne: false;
            referencedRelation: "environments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_sources_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_rules: {
        Row: {
          channel_type: string;
          created_at: string;
          created_by: string | null;
          destination_configuration: Json;
          enabled: boolean;
          event_type: string;
          id: string;
          minimum_severity: string | null;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          channel_type: string;
          created_at?: string;
          created_by?: string | null;
          destination_configuration?: Json;
          enabled?: boolean;
          event_type: string;
          id?: string;
          minimum_severity?: string | null;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          channel_type?: string;
          created_at?: string;
          created_by?: string | null;
          destination_configuration?: Json;
          enabled?: boolean;
          event_type?: string;
          id?: string;
          minimum_severity?: string | null;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_rules_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          incident_id: string | null;
          notification_type: string;
          organization_id: string;
          read_at: string | null;
          status: string;
          title: string;
          user_id: string | null;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          incident_id?: string | null;
          notification_type: string;
          organization_id: string;
          read_at?: string | null;
          status?: string;
          title: string;
          user_id?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          incident_id?: string | null;
          notification_type?: string;
          organization_id?: string;
          read_at?: string | null;
          status?: string;
          title?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          id: string;
          invited_by: string | null;
          joined_at: string | null;
          membership_status: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          joined_at?: string | null;
          membership_status?: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          joined_at?: string | null;
          membership_status?: string;
          organization_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      raw_execution_events: {
        Row: {
          correlation_id: string;
          event_timestamp: string | null;
          event_type: string;
          external_event_id: string | null;
          id: string;
          integration_source_id: string;
          organization_id: string;
          original_payload: Json;
          payload_hash: string;
          processed_at: string | null;
          processing_attempts: number;
          processing_error_code: string | null;
          processing_error_message: string | null;
          processing_status: string;
          provider_type: string;
          received_at: string;
          signature_valid: boolean;
          source_schema_version: string;
        };
        Insert: {
          correlation_id?: string;
          event_timestamp?: string | null;
          event_type: string;
          external_event_id?: string | null;
          id?: string;
          integration_source_id: string;
          organization_id: string;
          original_payload: Json;
          payload_hash: string;
          processed_at?: string | null;
          processing_attempts?: number;
          processing_error_code?: string | null;
          processing_error_message?: string | null;
          processing_status?: string;
          provider_type: string;
          received_at?: string;
          signature_valid?: boolean;
          source_schema_version?: string;
        };
        Update: {
          correlation_id?: string;
          event_timestamp?: string | null;
          event_type?: string;
          external_event_id?: string | null;
          id?: string;
          integration_source_id?: string;
          organization_id?: string;
          original_payload?: Json;
          payload_hash?: string;
          processed_at?: string | null;
          processing_attempts?: number;
          processing_error_code?: string | null;
          processing_error_message?: string | null;
          processing_status?: string;
          provider_type?: string;
          received_at?: string;
          signature_valid?: boolean;
          source_schema_version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "raw_execution_events_integration_source_id_fkey";
            columns: ["integration_source_id"];
            isOneToOne: false;
            referencedRelation: "integration_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "raw_execution_events_integration_source_id_fkey";
            columns: ["integration_source_id"];
            isOneToOne: false;
            referencedRelation: "integration_sources_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "raw_execution_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      replay_requests: {
        Row: {
          approved_by: string | null;
          error_message: string | null;
          id: string;
          idempotency_key: string;
          organization_id: string;
          original_workflow_run_id: string;
          processed_at: string | null;
          reason: string;
          requested_at: string;
          requested_by: string;
          resulting_workflow_run_id: string | null;
          status: string;
        };
        Insert: {
          approved_by?: string | null;
          error_message?: string | null;
          id?: string;
          idempotency_key: string;
          organization_id: string;
          original_workflow_run_id: string;
          processed_at?: string | null;
          reason: string;
          requested_at?: string;
          requested_by: string;
          resulting_workflow_run_id?: string | null;
          status?: string;
        };
        Update: {
          approved_by?: string | null;
          error_message?: string | null;
          id?: string;
          idempotency_key?: string;
          organization_id?: string;
          original_workflow_run_id?: string;
          processed_at?: string | null;
          reason?: string;
          requested_at?: string;
          requested_by?: string;
          resulting_workflow_run_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "replay_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "replay_requests_original_workflow_run_id_fkey";
            columns: ["original_workflow_run_id"];
            isOneToOne: false;
            referencedRelation: "workflow_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "replay_requests_resulting_workflow_run_id_fkey";
            columns: ["resulting_workflow_run_id"];
            isOneToOne: false;
            referencedRelation: "workflow_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      run_artifacts: {
        Row: {
          byte_size: number;
          created_at: string;
          id: string;
          mime_type: string;
          organization_id: string;
          original_filename: string;
          run_step_id: string | null;
          sha256_hash: string;
          storage_path: string;
          uploaded_by: string | null;
          workflow_run_id: string;
        };
        Insert: {
          byte_size: number;
          created_at?: string;
          id?: string;
          mime_type: string;
          organization_id: string;
          original_filename: string;
          run_step_id?: string | null;
          sha256_hash: string;
          storage_path: string;
          uploaded_by?: string | null;
          workflow_run_id: string;
        };
        Update: {
          byte_size?: number;
          created_at?: string;
          id?: string;
          mime_type?: string;
          organization_id?: string;
          original_filename?: string;
          run_step_id?: string | null;
          sha256_hash?: string;
          storage_path?: string;
          uploaded_by?: string | null;
          workflow_run_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "run_artifacts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "run_artifacts_run_step_id_fkey";
            columns: ["run_step_id"];
            isOneToOne: false;
            referencedRelation: "run_steps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "run_artifacts_workflow_run_id_fkey";
            columns: ["workflow_run_id"];
            isOneToOne: false;
            referencedRelation: "workflow_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      run_steps: {
        Row: {
          attempt_number: number;
          created_at: string;
          duration_ms: number | null;
          ended_at: string | null;
          error_code: string | null;
          error_message: string | null;
          external_step_id: string;
          id: string;
          input_summary: Json;
          name: string;
          organization_id: string;
          output_summary: Json;
          sequence_number: number;
          started_at: string | null;
          status: string;
          step_type: string;
          updated_at: string;
          workflow_run_id: string;
        };
        Insert: {
          attempt_number?: number;
          created_at?: string;
          duration_ms?: number | null;
          ended_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          external_step_id: string;
          id?: string;
          input_summary?: Json;
          name: string;
          organization_id: string;
          output_summary?: Json;
          sequence_number: number;
          started_at?: string | null;
          status: string;
          step_type?: string;
          updated_at?: string;
          workflow_run_id: string;
        };
        Update: {
          attempt_number?: number;
          created_at?: string;
          duration_ms?: number | null;
          ended_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          external_step_id?: string;
          id?: string;
          input_summary?: Json;
          name?: string;
          organization_id?: string;
          output_summary?: Json;
          sequence_number?: number;
          started_at?: string | null;
          status?: string;
          step_type?: string;
          updated_at?: string;
          workflow_run_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "run_steps_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "run_steps_workflow_run_id_fkey";
            columns: ["workflow_run_id"];
            isOneToOne: false;
            referencedRelation: "workflow_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_credentials: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          integration_source_id: string;
          key_hash: string;
          key_prefix: string;
          last_used_at: string | null;
          organization_id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          integration_source_id: string;
          key_hash: string;
          key_prefix: string;
          last_used_at?: string | null;
          organization_id: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          integration_source_id?: string;
          key_hash?: string;
          key_prefix?: string;
          last_used_at?: string | null;
          organization_id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_credentials_integration_source_id_fkey";
            columns: ["integration_source_id"];
            isOneToOne: false;
            referencedRelation: "integration_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "webhook_credentials_integration_source_id_fkey";
            columns: ["integration_source_id"];
            isOneToOne: false;
            referencedRelation: "integration_sources_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "webhook_credentials_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_definitions: {
        Row: {
          created_at: string;
          description: string | null;
          enabled: boolean;
          environment_id: string;
          expected_sla_seconds: number | null;
          external_workflow_id: string;
          failure_threshold: number;
          id: string;
          integration_source_id: string;
          metadata: Json;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          enabled?: boolean;
          environment_id: string;
          expected_sla_seconds?: number | null;
          external_workflow_id: string;
          failure_threshold?: number;
          id?: string;
          integration_source_id: string;
          metadata?: Json;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          enabled?: boolean;
          environment_id?: string;
          expected_sla_seconds?: number | null;
          external_workflow_id?: string;
          failure_threshold?: number;
          id?: string;
          integration_source_id?: string;
          metadata?: Json;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_environment_id_fkey";
            columns: ["environment_id"];
            isOneToOne: false;
            referencedRelation: "environments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_definitions_integration_source_id_fkey";
            columns: ["integration_source_id"];
            isOneToOne: false;
            referencedRelation: "integration_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_definitions_integration_source_id_fkey";
            columns: ["integration_source_id"];
            isOneToOne: false;
            referencedRelation: "integration_sources_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_definitions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_runs: {
        Row: {
          attempt_number: number;
          created_at: string;
          duration_ms: number | null;
          ended_at: string | null;
          error_code: string | null;
          error_message: string | null;
          external_run_id: string;
          id: string;
          idempotency_key: string;
          input_summary: Json;
          integration_source_id: string;
          last_event_at: string;
          organization_id: string;
          output_summary: Json;
          parent_run_id: string | null;
          started_at: string | null;
          status: string;
          summary: string | null;
          trigger_type: string;
          updated_at: string;
          workflow_definition_id: string;
        };
        Insert: {
          attempt_number?: number;
          created_at?: string;
          duration_ms?: number | null;
          ended_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          external_run_id: string;
          id?: string;
          idempotency_key: string;
          input_summary?: Json;
          integration_source_id: string;
          last_event_at?: string;
          organization_id: string;
          output_summary?: Json;
          parent_run_id?: string | null;
          started_at?: string | null;
          status: string;
          summary?: string | null;
          trigger_type?: string;
          updated_at?: string;
          workflow_definition_id: string;
        };
        Update: {
          attempt_number?: number;
          created_at?: string;
          duration_ms?: number | null;
          ended_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          external_run_id?: string;
          id?: string;
          idempotency_key?: string;
          input_summary?: Json;
          integration_source_id?: string;
          last_event_at?: string;
          organization_id?: string;
          output_summary?: Json;
          parent_run_id?: string | null;
          started_at?: string | null;
          status?: string;
          summary?: string | null;
          trigger_type?: string;
          updated_at?: string;
          workflow_definition_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_runs_integration_source_id_fkey";
            columns: ["integration_source_id"];
            isOneToOne: false;
            referencedRelation: "integration_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_runs_integration_source_id_fkey";
            columns: ["integration_source_id"];
            isOneToOne: false;
            referencedRelation: "integration_sources_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_runs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_runs_parent_run_id_fkey";
            columns: ["parent_run_id"];
            isOneToOne: false;
            referencedRelation: "workflow_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_runs_workflow_definition_id_fkey";
            columns: ["workflow_definition_id"];
            isOneToOne: false;
            referencedRelation: "workflow_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      integration_sources_public: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          environment_id: string | null;
          external_account_reference: string | null;
          id: string | null;
          last_event_at: string | null;
          name: string | null;
          organization_id: string | null;
          provider_type: string | null;
          public_configuration: Json | null;
          status: string | null;
          updated_at: string | null;
          webhook_key_prefix: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          environment_id?: string | null;
          external_account_reference?: string | null;
          id?: string | null;
          last_event_at?: string | null;
          name?: string | null;
          organization_id?: string | null;
          provider_type?: string | null;
          public_configuration?: Json | null;
          status?: string | null;
          updated_at?: string | null;
          webhook_key_prefix?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          environment_id?: string | null;
          external_account_reference?: string | null;
          id?: string | null;
          last_event_at?: string | null;
          name?: string | null;
          organization_id?: string | null;
          provider_type?: string | null;
          public_configuration?: Json | null;
          status?: string | null;
          updated_at?: string | null;
          webhook_key_prefix?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "environment_matches_organization";
            columns: ["organization_id", "environment_id"];
            isOneToOne: false;
            referencedRelation: "environments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "integration_sources_environment_id_fkey";
            columns: ["environment_id"];
            isOneToOne: false;
            referencedRelation: "environments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_sources_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      apply_canonical_event: {
        Args: { canonical: Json; target_raw_event_id: string };
        Returns: Json;
      };
      archive_platform_job: {
        Args: { message_id: number; queue_name: string };
        Returns: boolean;
      };
      can_access_workflow_run: {
        Args: { target_run_id: string };
        Returns: boolean;
      };
      can_mutate_incident: {
        Args: { target_incident_id: string };
        Returns: boolean;
      };
      create_organization_with_owner: {
        Args: { organization_name: string; organization_slug: string };
        Returns: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "organizations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      dead_letter_platform_job: {
        Args: {
          failure_message: string;
          message_id: number;
          payload: Json;
          queue_name: string;
        };
        Returns: boolean;
      };
      decide_approval: {
        Args: { decision: string; note?: string; target_approval_id: string };
        Returns: {
          assigned_to: string;
          created_at: string;
          decided_at: string | null;
          decision_note: string | null;
          description: string;
          due_at: string | null;
          id: string;
          organization_id: string;
          requested_by: string | null;
          run_step_id: string | null;
          status: string;
          title: string;
          workflow_run_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "approval_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      decide_replay_request: {
        Args: { decision: string; target_replay_request_id: string };
        Returns: {
          approved_by: string | null;
          error_message: string | null;
          id: string;
          idempotency_key: string;
          organization_id: string;
          original_workflow_run_id: string;
          processed_at: string | null;
          reason: string;
          requested_at: string;
          requested_by: string;
          resulting_workflow_run_id: string | null;
          status: string;
        };
        SetofOptions: {
          from: "*";
          to: "replay_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      enqueue_platform_job: {
        Args: { payload: Json; queue_name: string };
        Returns: number;
      };
      has_org_role: {
        Args: { required_role: string; target_organization_id: string };
        Returns: boolean;
      };
      is_legal_run_transition: {
        Args: { current_status: string; target_status: string };
        Returns: boolean;
      };
      is_org_member: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      org_role: { Args: { target_organization_id: string }; Returns: string };
      process_replay_job: {
        Args: { target_replay_request_id: string };
        Returns: Json;
      };
      read_platform_jobs: {
        Args: {
          batch_size?: number;
          queue_name: string;
          visibility_timeout_seconds?: number;
        };
        Returns: Json[];
      };
      request_replay: {
        Args: {
          replay_reason: string;
          request_idempotency_key: string;
          target_run_id: string;
        };
        Returns: {
          approved_by: string | null;
          error_message: string | null;
          id: string;
          idempotency_key: string;
          organization_id: string;
          original_workflow_run_id: string;
          processed_at: string | null;
          reason: string;
          requested_at: string;
          requested_by: string;
          resulting_workflow_run_id: string | null;
          status: string;
        };
        SetofOptions: {
          from: "*";
          to: "replay_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      role_rank: { Args: { candidate_role: string }; Returns: number };
      store_integration_credential: {
        Args: {
          new_key_hash: string;
          new_key_prefix: string;
          target_source_id: string;
        };
        Returns: string;
      };
      transition_incident: {
        Args: {
          target_incident_id: string;
          target_status: string;
          transition_note?: string;
        };
        Returns: {
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          assigned_to: string | null;
          created_at: string;
          detected_at: string;
          detection_source: string;
          id: string;
          organization_id: string;
          resolution_summary: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          root_cause: string | null;
          severity: string;
          status: string;
          summary: string;
          title: string;
          updated_at: string;
          workflow_definition_id: string;
          workflow_run_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "incidents";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
