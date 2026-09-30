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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_draft_versions: {
        Row: {
          based_on_draft_version_id: string | null
          client_id: string
          content: Json
          created_at: string
          created_by_profile_id: string
          discard_reason: string | null
          discarded_at: string | null
          discarded_by_profile_id: string | null
          execution_id: string
          id: string
          version_number: number
        }
        Insert: {
          based_on_draft_version_id?: string | null
          client_id: string
          content: Json
          created_at?: string
          created_by_profile_id: string
          discard_reason?: string | null
          discarded_at?: string | null
          discarded_by_profile_id?: string | null
          execution_id: string
          id?: string
          version_number: number
        }
        Update: {
          based_on_draft_version_id?: string | null
          client_id?: string
          content?: Json
          created_at?: string
          created_by_profile_id?: string
          discard_reason?: string | null
          discarded_at?: string | null
          discarded_by_profile_id?: string | null
          execution_id?: string
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_draft_versions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_draft_versions_discarded_by_profile_id_fkey"
            columns: ["discarded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_draft_versions_execution_client_fkey"
            columns: ["execution_id", "client_id"]
            isOneToOne: false
            referencedRelation: "ai_executions"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "ai_draft_versions_parent_fkey"
            columns: ["based_on_draft_version_id", "execution_id", "client_id"]
            isOneToOne: false
            referencedRelation: "ai_draft_versions"
            referencedColumns: ["id", "execution_id", "client_id"]
          },
        ]
      }
      ai_execution_failure_responses: {
        Row: {
          client_id: string
          content: string
          content_format: string
          execution_id: string
          received_at: string
        }
        Insert: {
          client_id: string
          content: string
          content_format: string
          execution_id: string
          received_at: string
        }
        Update: {
          client_id?: string
          content?: string
          content_format?: string
          execution_id?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_execution_failure_responses_execution_client_fkey"
            columns: ["execution_id", "client_id"]
            isOneToOne: false
            referencedRelation: "ai_executions"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      ai_execution_outputs: {
        Row: {
          client_id: string
          content: Json
          created_at: string
          execution_id: string
        }
        Insert: {
          client_id: string
          content: Json
          created_at?: string
          execution_id: string
        }
        Update: {
          client_id?: string
          content?: Json
          created_at?: string
          execution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_execution_outputs_execution_client_fkey"
            columns: ["execution_id", "client_id"]
            isOneToOne: false
            referencedRelation: "ai_executions"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      ai_execution_sources: {
        Row: {
          anamnesis_answer_id: string | null
          anamnesis_submission_id: string | null
          assessment_id: string | null
          assessment_measurement_id: string | null
          client_file_id: string | null
          client_id: string
          created_at: string
          execution_id: string
          id: string
          professional_follow_up_id: string | null
          protocol_version_id: string | null
          source_kind: string
        }
        Insert: {
          anamnesis_answer_id?: string | null
          anamnesis_submission_id?: string | null
          assessment_id?: string | null
          assessment_measurement_id?: string | null
          client_file_id?: string | null
          client_id: string
          created_at?: string
          execution_id: string
          id?: string
          professional_follow_up_id?: string | null
          protocol_version_id?: string | null
          source_kind: string
        }
        Update: {
          anamnesis_answer_id?: string | null
          anamnesis_submission_id?: string | null
          assessment_id?: string | null
          assessment_measurement_id?: string | null
          client_file_id?: string | null
          client_id?: string
          created_at?: string
          execution_id?: string
          id?: string
          professional_follow_up_id?: string | null
          protocol_version_id?: string | null
          source_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_execution_sources_answer_submission_fkey"
            columns: ["anamnesis_answer_id", "anamnesis_submission_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_answers"
            referencedColumns: ["id", "submission_id"]
          },
          {
            foreignKeyName: "ai_execution_sources_assessment_client_fkey"
            columns: ["assessment_id", "client_id"]
            isOneToOne: false
            referencedRelation: "client_assessments"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "ai_execution_sources_execution_client_fkey"
            columns: ["execution_id", "client_id"]
            isOneToOne: false
            referencedRelation: "ai_executions"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "ai_execution_sources_file_client_fkey"
            columns: ["client_file_id", "client_id"]
            isOneToOne: false
            referencedRelation: "client_files"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "ai_execution_sources_follow_up_client_fkey"
            columns: ["professional_follow_up_id", "client_id"]
            isOneToOne: false
            referencedRelation: "professional_follow_ups"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "ai_execution_sources_measurement_assessment_fkey"
            columns: ["assessment_measurement_id", "assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment_measurements"
            referencedColumns: ["id", "assessment_id"]
          },
          {
            foreignKeyName: "ai_execution_sources_protocol_version_client_fkey"
            columns: ["protocol_version_id", "client_id"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "ai_execution_sources_submission_client_fkey"
            columns: ["anamnesis_submission_id", "client_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_submissions"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      ai_executions: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          discard_reason: string | null
          discarded_at: string | null
          discarded_by_profile_id: string | null
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          failure_stage: string | null
          id: string
          initiated_by_profile_id: string
          model_identifier: string
          anamnesis_submission_id: string | null
          prompt_version_id: string
          provider: string
          purpose_key: string
          status: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          discard_reason?: string | null
          discarded_at?: string | null
          discarded_by_profile_id?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          failure_stage?: string | null
          id?: string
          initiated_by_profile_id: string
          model_identifier: string
          anamnesis_submission_id?: string | null
          prompt_version_id: string
          provider: string
          purpose_key: string
          status?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          discard_reason?: string | null
          discarded_at?: string | null
          discarded_by_profile_id?: string | null
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          failure_stage?: string | null
          id?: string
          initiated_by_profile_id?: string
          model_identifier?: string
          anamnesis_submission_id?: string | null
          prompt_version_id?: string
          provider?: string
          purpose_key?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_executions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_executions_discarded_by_profile_id_fkey"
            columns: ["discarded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_executions_initiated_by_profile_id_fkey"
            columns: ["initiated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_executions_anamnesis_submission_client_fkey"
            columns: ["anamnesis_submission_id", "client_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_submissions"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "ai_executions_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_hypotheses: {
        Row: {
          client_id: string
          confirmed_at: string | null
          confirmed_by_profile_id: string | null
          content: Json
          created_at: string
          execution_id: string
          id: string
        }
        Insert: {
          client_id: string
          confirmed_at?: string | null
          confirmed_by_profile_id?: string | null
          content: Json
          created_at?: string
          execution_id: string
          id?: string
        }
        Update: {
          client_id?: string
          confirmed_at?: string | null
          confirmed_by_profile_id?: string | null
          content?: Json
          created_at?: string
          execution_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_hypotheses_confirmed_by_profile_id_fkey"
            columns: ["confirmed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_hypotheses_execution_client_fkey"
            columns: ["execution_id", "client_id"]
            isOneToOne: false
            referencedRelation: "ai_executions"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      ai_prompt_versions: {
        Row: {
          content: Json
          created_at: string
          created_by_profile_id: string | null
          id: string
          prompt_key: string
          version_number: number
        }
        Insert: {
          content: Json
          created_at?: string
          created_by_profile_id?: string | null
          id?: string
          prompt_key: string
          version_number: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by_profile_id?: string | null
          id?: string
          prompt_key?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_versions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_answer_corrections: {
        Row: {
          answer_id: string
          corrected_answer_value: Json
          corrected_by_profile_id: string
          created_at: string
          id: string
        }
        Insert: {
          answer_id: string
          corrected_answer_value: Json
          corrected_by_profile_id: string
          created_at?: string
          id?: string
        }
        Update: {
          answer_id?: string
          corrected_answer_value?: Json
          corrected_by_profile_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_answer_corrections_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_answer_corrections_corrected_by_profile_id_fkey"
            columns: ["corrected_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_clarification_requests: {
        Row: {
          created_at: string
          id: string
          request_text: string
          requested_by_profile_id: string
          source_answer_id: string | null
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_text: string
          requested_by_profile_id: string
          source_answer_id?: string | null
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_text?: string
          requested_by_profile_id?: string
          source_answer_id?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_clarification_requests_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_clarification_requests_source_answer_id_fkey"
            columns: ["source_answer_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_clarification_requests_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_clarification_responses: {
        Row: {
          clarification_request_id: string
          created_at: string
          id: string
          responder_profile_id: string
          response_text: string
        }
        Insert: {
          clarification_request_id: string
          created_at?: string
          id?: string
          responder_profile_id: string
          response_text: string
        }
        Update: {
          clarification_request_id?: string
          created_at?: string
          id?: string
          responder_profile_id?: string
          response_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_clarification_responses_clarification_request_id_fkey"
            columns: ["clarification_request_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_clarification_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_clarification_responses_responder_profile_id_fkey"
            columns: ["responder_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_answers: {
        Row: {
          answer_value: Json
          created_at: string
          form_version_id: string
          id: string
          question_id: string
          submission_id: string
          updated_at: string
        }
        Insert: {
          answer_value: Json
          created_at?: string
          form_version_id: string
          id?: string
          question_id: string
          submission_id: string
          updated_at?: string
        }
        Update: {
          answer_value?: Json
          created_at?: string
          form_version_id?: string
          id?: string
          question_id?: string
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_answers_question_version_fkey"
            columns: ["question_id", "form_version_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_questions"
            referencedColumns: ["id", "form_version_id"]
          },
          {
            foreignKeyName: "anamnesis_answers_submission_version_fkey"
            columns: ["submission_id", "form_version_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_submissions"
            referencedColumns: ["id", "form_version_id"]
          },
        ]
      }
      anamnesis_form_versions: {
        Row: {
          created_at: string
          form_id: string
          id: string
          published_at: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          published_at?: string | null
          version_number: number
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          published_at?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_form_versions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_forms: {
        Row: {
          created_at: string
          form_key: string
          id: string
        }
        Insert: {
          created_at?: string
          form_key: string
          id?: string
        }
        Update: {
          created_at?: string
          form_key?: string
          id?: string
        }
        Relationships: []
      }
      anamnesis_questions: {
        Row: {
          answer_type: string
          applicability_expected_answer: Json | null
          applicability_source_question_id: string | null
          created_at: string
          display_order: number
          form_version_id: string
          id: string
          label: string
          options: Json | null
          question_key: string
          required: boolean
          section_id: string
        }
        Insert: {
          answer_type: string
          applicability_expected_answer?: Json | null
          applicability_source_question_id?: string | null
          created_at?: string
          display_order: number
          form_version_id: string
          id?: string
          label: string
          options?: Json | null
          question_key: string
          required?: boolean
          section_id: string
        }
        Update: {
          answer_type?: string
          applicability_expected_answer?: Json | null
          applicability_source_question_id?: string | null
          created_at?: string
          display_order?: number
          form_version_id?: string
          id?: string
          label?: string
          options?: Json | null
          question_key?: string
          required?: boolean
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_questions_applicability_source_version_fkey"
            columns: ["applicability_source_question_id", "form_version_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_questions"
            referencedColumns: ["id", "form_version_id"]
          },
          {
            foreignKeyName: "anamnesis_questions_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_questions_section_version_fkey"
            columns: ["section_id", "form_version_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_sections"
            referencedColumns: ["id", "form_version_id"]
          },
        ]
      }
      anamnesis_reviews: {
        Row: {
          created_at: string
          id: string
          note: string
          reviewer_profile_id: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          reviewer_profile_id: string
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          reviewer_profile_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_reviews_reviewer_profile_id_fkey"
            columns: ["reviewer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_sections: {
        Row: {
          created_at: string
          display_order: number
          form_version_id: string
          id: string
          section_key: string
          title: string
        }
        Insert: {
          created_at?: string
          display_order: number
          form_version_id: string
          id?: string
          section_key: string
          title: string
        }
        Update: {
          created_at?: string
          display_order?: number
          form_version_id?: string
          id?: string
          section_key?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_sections_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_form_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_submissions: {
        Row: {
          client_id: string
          created_at: string
          form_version_id: string
          id: string
          submitted_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          form_version_id: string
          id?: string
          submitted_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          form_version_id?: string
          id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_submissions_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_form_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_files: {
        Row: {
          assessment_id: string
          client_file_id: string
          client_id: string
          created_at: string
        }
        Insert: {
          assessment_id: string
          client_file_id: string
          client_id: string
          created_at?: string
        }
        Update: {
          assessment_id?: string
          client_file_id?: string
          client_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_files_assessment_client_fkey"
            columns: ["assessment_id", "client_id"]
            isOneToOne: false
            referencedRelation: "client_assessments"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "assessment_files_file_client_fkey"
            columns: ["client_file_id", "client_id"]
            isOneToOne: false
            referencedRelation: "client_files"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      assessment_measurements: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          measurement_key: string
          measurement_value: number
          unit: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          measurement_key: string
          measurement_value: number
          unit: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          measurement_key?: string
          measurement_value?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_measurements_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "client_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assessments: {
        Row: {
          assessed_at: string
          assessment_kind: string | null
          client_id: string
          created_at: string
          created_by_profile_id: string | null
          finalized_at: string | null
          finalized_by_profile_id: string | null
          id: string
        }
        Insert: {
          assessed_at: string
          assessment_kind?: string | null
          client_id: string
          created_at?: string
          created_by_profile_id?: string | null
          finalized_at?: string | null
          finalized_by_profile_id?: string | null
          id?: string
        }
        Update: {
          assessed_at?: string
          assessment_kind?: string | null
          client_id?: string
          created_at?: string
          created_by_profile_id?: string | null
          finalized_at?: string | null
          finalized_by_profile_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          created_at: string
          ended_at: string | null
          id: string
          staff_profile_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          staff_profile_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          staff_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_content_progress: {
        Row: {
          client_content_release_id: string
          client_id: string
          completed_at: string | null
          created_at: string
          first_opened_at: string | null
          updated_at: string
        }
        Insert: {
          client_content_release_id: string
          client_id: string
          completed_at?: string | null
          created_at?: string
          first_opened_at?: string | null
          updated_at?: string
        }
        Update: {
          client_content_release_id?: string
          client_id?: string
          completed_at?: string | null
          created_at?: string
          first_opened_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_content_progress_release_client_fkey"
            columns: ["client_content_release_id", "client_id"]
            isOneToOne: false
            referencedRelation: "client_content_releases"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      client_content_releases: {
        Row: {
          client_id: string
          created_at: string
          educational_content_version_id: string
          id: string
          released_at: string
          released_by_profile_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          educational_content_version_id: string
          id?: string
          released_at?: string
          released_by_profile_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          educational_content_version_id?: string
          id?: string
          released_at?: string
          released_by_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_content_releases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_content_releases_educational_content_version_id_fkey"
            columns: ["educational_content_version_id"]
            isOneToOne: false
            referencedRelation: "educational_content_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_content_releases_released_by_profile_id_fkey"
            columns: ["released_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_file_access_events: {
        Row: {
          action: string
          actor_profile_id: string
          authorized: boolean
          file_kind: Database["public"]["Enums"]["client_file_kind"] | null
          id: string
          recorded_at: string
          requested_file_id: string
        }
        Insert: {
          action: string
          actor_profile_id: string
          authorized: boolean
          file_kind?: Database["public"]["Enums"]["client_file_kind"] | null
          id?: string
          recorded_at?: string
          requested_file_id: string
        }
        Update: {
          action?: string
          actor_profile_id?: string
          authorized?: boolean
          file_kind?: Database["public"]["Enums"]["client_file_kind"] | null
          id?: string
          recorded_at?: string
          requested_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_file_access_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_file_upload_sessions: {
        Row: {
          claimed_mime_type: string
          client_id: string
          created_at: string
          declared_byte_size: number
          expires_at: string
          file_extension: string
          file_kind: Database["public"]["Enums"]["client_file_kind"]
          id: string
          original_filename: string
          requester_profile_id: string
          status: string
          temp_object_path: string | null
        }
        Insert: {
          claimed_mime_type: string
          client_id: string
          created_at?: string
          declared_byte_size: number
          expires_at?: string
          file_extension: string
          file_kind: Database["public"]["Enums"]["client_file_kind"]
          id?: string
          original_filename: string
          requester_profile_id: string
          status?: string
          temp_object_path?: string | null
        }
        Update: {
          claimed_mime_type?: string
          client_id?: string
          created_at?: string
          declared_byte_size?: number
          expires_at?: string
          file_extension?: string
          file_kind?: Database["public"]["Enums"]["client_file_kind"]
          id?: string
          original_filename?: string
          requester_profile_id?: string
          status?: string
          temp_object_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_file_upload_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_file_upload_sessions_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files: {
        Row: {
          bucket_id: string
          byte_size: number | null
          client_id: string
          client_visibility_set_by_profile_id: string | null
          client_visible_at: string | null
          created_at: string
          file_kind: Database["public"]["Enums"]["client_file_kind"]
          id: string
          mime_type: string | null
          object_path: string
          original_filename: string | null
          uploaded_by_profile_id: string
        }
        Insert: {
          bucket_id?: string
          byte_size?: number | null
          client_id: string
          client_visibility_set_by_profile_id?: string | null
          client_visible_at?: string | null
          created_at?: string
          file_kind: Database["public"]["Enums"]["client_file_kind"]
          id?: string
          mime_type?: string | null
          object_path: string
          original_filename?: string | null
          uploaded_by_profile_id: string
        }
        Update: {
          bucket_id?: string
          byte_size?: number | null
          client_id?: string
          client_visibility_set_by_profile_id?: string | null
          client_visible_at?: string | null
          created_at?: string
          file_kind?: Database["public"]["Enums"]["client_file_kind"]
          id?: string
          mime_type?: string | null
          object_path?: string
          original_filename?: string | null
          uploaded_by_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_client_visibility_set_by_profile_id_fkey"
            columns: ["client_visibility_set_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_registration: {
        Row: {
          city: string | null
          client_id: string
          contact_email: string | null
          created_at: string
          instagram: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          client_id: string
          contact_email?: string | null
          created_at?: string
          instagram?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          client_id?: string
          contact_email?: string | null
          created_at?: string
          instagram?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_registration_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_training_requests: {
        Row: {
          client_id: string
          created_at: string
          id: string
          note: string | null
          recorded_by_profile_id: string
          requested_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          note?: string | null
          recorded_by_profile_id: string
          requested_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          note?: string | null
          recorded_by_profile_id?: string
          requested_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_training_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_training_requests_recorded_by_profile_id_fkey"
            columns: ["recorded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          profile_id: string | null
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          profile_id?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          profile_id?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      educational_content_assets: {
        Row: {
          asset_key: string
          byte_size: number
          content_type: string
          created_at: string
          educational_content_version_id: string
          id: string
          sha256_hex: string
          storage_path: string
          storage_provider: string
        }
        Insert: {
          asset_key?: string
          byte_size: number
          content_type: string
          created_at?: string
          educational_content_version_id: string
          id?: string
          sha256_hex: string
          storage_path: string
          storage_provider: string
        }
        Update: {
          asset_key?: string
          byte_size?: number
          content_type?: string
          created_at?: string
          educational_content_version_id?: string
          id?: string
          sha256_hex?: string
          storage_path?: string
          storage_provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "educational_content_assets_educational_content_version_id_fkey"
            columns: ["educational_content_version_id"]
            isOneToOne: false
            referencedRelation: "educational_content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      educational_content_versions: {
        Row: {
          category_key: string | null
          content_type_key: string | null
          created_at: string
          display_order: number
          educational_content_id: string
          id: string
          phase_key: string | null
          published_at: string | null
          title: string
          version_number: number
        }
        Insert: {
          category_key?: string | null
          content_type_key?: string | null
          created_at?: string
          display_order: number
          educational_content_id: string
          id?: string
          phase_key?: string | null
          published_at?: string | null
          title: string
          version_number: number
        }
        Update: {
          category_key?: string | null
          content_type_key?: string | null
          created_at?: string
          display_order?: number
          educational_content_id?: string
          id?: string
          phase_key?: string | null
          published_at?: string | null
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "educational_content_versions_educational_content_id_fkey"
            columns: ["educational_content_id"]
            isOneToOne: false
            referencedRelation: "educational_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      educational_contents: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      exercise_versions: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          name: string
          published_at: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          name: string
          published_at?: string | null
          version_number: number
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          name?: string
          published_at?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_versions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      food_equivalent_catalog_versions: {
        Row: {
          catalog_id: string
          created_at: string
          id: string
          version_number: number
        }
        Insert: {
          catalog_id: string
          created_at?: string
          id?: string
          version_number: number
        }
        Update: {
          catalog_id?: string
          created_at?: string
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_equivalent_catalog_versions_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "food_equivalent_catalogs"
            referencedColumns: ["id"]
          },
        ]
      }
      food_equivalent_catalogs: {
        Row: {
          catalog_key: string
          created_at: string
          id: string
        }
        Insert: {
          catalog_key: string
          created_at?: string
          id?: string
        }
        Update: {
          catalog_key?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      food_equivalent_groups: {
        Row: {
          catalog_version_id: string
          group_key: string
          id: string
          label: string
          position: number
        }
        Insert: {
          catalog_version_id: string
          group_key: string
          id?: string
          label: string
          position: number
        }
        Update: {
          catalog_version_id?: string
          group_key?: string
          id?: string
          label?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_equivalent_groups_catalog_version_id_fkey"
            columns: ["catalog_version_id"]
            isOneToOne: false
            referencedRelation: "food_equivalent_catalog_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      food_equivalent_items: {
        Row: {
          group_id: string
          id: string
          item_key: string
          label: string
          position: number
        }
        Insert: {
          group_id: string
          id?: string
          item_key: string
          label: string
          position: number
        }
        Update: {
          group_id?: string
          id?: string
          item_key?: string
          label?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_equivalent_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "food_equivalent_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_dose_allocations: {
        Row: {
          created_at: string
          dose_quantity: number
          dose_type: string
          id: string
          meal_id: string
        }
        Insert: {
          created_at?: string
          dose_quantity: number
          dose_type: string
          id?: string
          meal_id: string
        }
        Update: {
          created_at?: string
          dose_quantity?: number
          dose_type?: string
          id?: string
          meal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_dose_allocations_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_cycle_steps: {
        Row: {
          cycle_id: string
          meal_plan_version_id: string
          position: number
          variant_id: string
        }
        Insert: {
          cycle_id: string
          meal_plan_version_id: string
          position: number
          variant_id: string
        }
        Update: {
          cycle_id?: string
          meal_plan_version_id?: string
          position?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_cycle_steps_cycle_fkey"
            columns: ["cycle_id", "meal_plan_version_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_cycles"
            referencedColumns: ["id", "meal_plan_version_id"]
          },
          {
            foreignKeyName: "meal_plan_cycle_steps_variant_fkey"
            columns: ["variant_id", "meal_plan_version_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_variants"
            referencedColumns: ["id", "meal_plan_version_id"]
          },
        ]
      }
      meal_plan_cycles: {
        Row: {
          client_id: string
          created_at: string
          id: string
          meal_plan_version_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          meal_plan_version_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          meal_plan_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_cycles_client_fkey"
            columns: ["meal_plan_version_id", "client_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_versions"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "meal_plan_cycles_meal_plan_version_id_fkey"
            columns: ["meal_plan_version_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_variants: {
        Row: {
          client_id: string
          created_at: string
          id: string
          label: string | null
          meal_plan_version_id: string
          variant_key: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          label?: string | null
          meal_plan_version_id: string
          variant_key: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          label?: string | null
          meal_plan_version_id?: string
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_variants_plan_client_fkey"
            columns: ["meal_plan_version_id", "client_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_versions"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      meal_plan_versions: {
        Row: {
          client_id: string
          created_at: string
          food_equivalent_catalog_version_id: string | null
          id: string
          protocol_version_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          food_equivalent_catalog_version_id?: string | null
          id?: string
          protocol_version_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          food_equivalent_catalog_version_id?: string | null
          id?: string
          protocol_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_versions_catalog_version_fkey"
            columns: ["food_equivalent_catalog_version_id"]
            isOneToOne: false
            referencedRelation: "food_equivalent_catalog_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_versions_protocol_client_fkey"
            columns: ["protocol_version_id", "client_id"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      meals: {
        Row: {
          created_at: string
          id: string
          label: string | null
          meal_plan_variant_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          meal_plan_variant_id: string
          position: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          meal_plan_variant_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "meals_meal_plan_variant_id_fkey"
            columns: ["meal_plan_variant_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_follow_ups: {
        Row: {
          adherence_perception: string | null
          assessment_id: string | null
          author_profile_id: string
          client_id: string
          created_at: string
          decision_reason: string
          difficulty: string | null
          id: string
          patty_observation: string | null
          professional_decision: string
          recorded_at: string
        }
        Insert: {
          adherence_perception?: string | null
          assessment_id?: string | null
          author_profile_id: string
          client_id: string
          created_at?: string
          decision_reason: string
          difficulty?: string | null
          id?: string
          patty_observation?: string | null
          professional_decision: string
          recorded_at?: string
        }
        Update: {
          adherence_perception?: string | null
          assessment_id?: string | null
          author_profile_id?: string
          client_id?: string
          created_at?: string
          decision_reason?: string
          difficulty?: string | null
          id?: string
          patty_observation?: string | null
          professional_decision?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_follow_ups_assessment_client_fkey"
            columns: ["assessment_id", "client_id"]
            isOneToOne: false
            referencedRelation: "client_assessments"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "professional_follow_ups_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_follow_ups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      protocol_publications: {
        Row: {
          approval_id: string
          client_id: string
          id: string
          protocol_version_id: string
          published_at: string
          published_by_profile_id: string
        }
        Insert: {
          approval_id: string
          client_id: string
          id?: string
          protocol_version_id: string
          published_at?: string
          published_by_profile_id: string
        }
        Update: {
          approval_id?: string
          client_id?: string
          id?: string
          protocol_version_id?: string
          published_at?: string
          published_by_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_publications_approval_version_client_fkey"
            columns: ["approval_id", "protocol_version_id", "client_id"]
            isOneToOne: false
            referencedRelation: "protocol_version_approvals"
            referencedColumns: ["id", "protocol_version_id", "client_id"]
          },
          {
            foreignKeyName: "protocol_publications_published_by_profile_id_fkey"
            columns: ["published_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_version_approvals: {
        Row: {
          approved_at: string
          approved_by_profile_id: string
          client_id: string
          id: string
          protocol_version_id: string
        }
        Insert: {
          approved_at?: string
          approved_by_profile_id: string
          client_id: string
          id?: string
          protocol_version_id: string
        }
        Update: {
          approved_at?: string
          approved_by_profile_id?: string
          client_id?: string
          id?: string
          protocol_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_version_approvals_approved_by_profile_id_fkey"
            columns: ["approved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_version_approvals_version_client_fkey"
            columns: ["protocol_version_id", "client_id"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      protocol_versions: {
        Row: {
          based_on_version_id: string | null
          client_id: string
          created_at: string
          created_by_profile_id: string
          id: string
          protocol_id: string
          submitted_for_review_at: string | null
          version_number: number
        }
        Insert: {
          based_on_version_id?: string | null
          client_id: string
          created_at?: string
          created_by_profile_id: string
          id?: string
          protocol_id: string
          submitted_for_review_at?: string | null
          version_number: number
        }
        Update: {
          based_on_version_id?: string | null
          client_id?: string
          created_at?: string
          created_by_profile_id?: string
          id?: string
          protocol_id?: string
          submitted_for_review_at?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "protocol_versions_based_on_fkey"
            columns: ["based_on_version_id", "client_id"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "protocol_versions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_versions_protocol_client_fkey"
            columns: ["protocol_id", "client_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      protocols: {
        Row: {
          client_id: string
          created_at: string
          id: string
          protocol_type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          protocol_type?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          protocol_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocols_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_ai_execution: {
        Args: { p_content: Json; p_execution_id: string }
        Returns: undefined
      }
      clone_protocol_version_draft: {
        Args: {
          p_plan_snapshot: Json | null
          p_source_protocol_version_id: string
        }
        Returns: string
      }
      current_user_admin_mfa_satisfied: { Args: never; Returns: boolean }
      current_user_is_assigned_admin: { Args: never; Returns: boolean }
      fail_ai_execution: {
        Args: {
          p_execution_id: string
          p_failure_code: string
          p_failure_message: string | null
          p_failure_stage: string
          p_response_content: string | null
          p_response_content_format: string | null
          p_response_received_at: string | null
        }
        Returns: undefined
      }
      meal_plan_version_is_draft: {
        Args: { p_meal_plan_version_id: string }
        Returns: boolean
      }
      meal_plan_version_is_published_for_current_client: {
        Args: { p_meal_plan_version_id: string }
        Returns: boolean
      }
      start_anamnesis_review_execution: {
        Args: {
          p_answer_ids: string[]
          p_client_id: string
          p_initiated_by_profile_id: string
          p_model_identifier: string
          p_prompt_version_id: string
          p_provider: string
          p_submission_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "client"
      client_file_kind: "photo" | "exam" | "document"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client"],
      client_file_kind: ["photo", "exam", "document"],
    },
  },
} as const
