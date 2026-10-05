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
          anamnesis_submission_id: string | null
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
          prompt_version_id: string
          provider: string
          purpose_key: string
          status: string
        }
        Insert: {
          anamnesis_submission_id?: string | null
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
          prompt_version_id: string
          provider: string
          purpose_key: string
          status?: string
        }
        Update: {
          anamnesis_submission_id?: string | null
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
          prompt_version_id?: string
          provider?: string
          purpose_key?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_executions_anamnesis_submission_client_fkey"
            columns: ["anamnesis_submission_id", "client_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_submissions"
            referencedColumns: ["id", "client_id"]
          },
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
            foreignKeyName: "ai_executions_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_finding_actions: {
        Row: {
          acted_by_profile_id: string
          action: string
          anamnesis_review_id: string | null
          client_id: string
          created_at: string
          execution_id: string
          finding_index: number
          finding_snapshot: Json
          id: string
        }
        Insert: {
          acted_by_profile_id: string
          action: string
          anamnesis_review_id?: string | null
          client_id: string
          created_at?: string
          execution_id: string
          finding_index: number
          finding_snapshot: Json
          id?: string
        }
        Update: {
          acted_by_profile_id?: string
          action?: string
          anamnesis_review_id?: string | null
          client_id?: string
          created_at?: string
          execution_id?: string
          finding_index?: number
          finding_snapshot?: Json
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_finding_actions_acted_by_profile_id_fkey"
            columns: ["acted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_finding_actions_anamnesis_review_id_fkey"
            columns: ["anamnesis_review_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_finding_actions_execution_client_fkey"
            columns: ["execution_id", "client_id"]
            isOneToOne: false
            referencedRelation: "ai_executions"
            referencedColumns: ["id", "client_id"]
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
      anamnesis_clarification_resolutions: {
        Row: {
          clarification_request_id: string
          id: string
          resolved_at: string
          resolved_by_profile_id: string
        }
        Insert: {
          clarification_request_id: string
          id?: string
          resolved_at?: string
          resolved_by_profile_id: string
        }
        Update: {
          clarification_request_id?: string
          id?: string
          resolved_at?: string
          resolved_by_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_clarification_resolutio_clarification_request_id_fkey"
            columns: ["clarification_request_id"]
            isOneToOne: true
            referencedRelation: "anamnesis_clarification_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_clarification_resolutions_resolved_by_profile_id_fkey"
            columns: ["resolved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      assessment_measurement_corrections: {
        Row: {
          assessment_measurement_id: string
          corrected_by_profile_id: string
          corrected_measurement_value: number
          corrected_unit: string
          created_at: string
          id: string
          note: string | null
        }
        Insert: {
          assessment_measurement_id: string
          corrected_by_profile_id: string
          corrected_measurement_value: number
          corrected_unit: string
          created_at?: string
          id?: string
          note?: string | null
        }
        Update: {
          assessment_measurement_id?: string
          corrected_by_profile_id?: string
          corrected_measurement_value?: number
          corrected_unit?: string
          created_at?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_measurement_correctio_assessment_measurement_id_fkey"
            columns: ["assessment_measurement_id"]
            isOneToOne: false
            referencedRelation: "assessment_measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_measurement_corrections_corrected_by_profile_id_fkey"
            columns: ["corrected_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
      client_activity_checkin_events: {
        Row: {
          checkin_date: string
          client_id: string
          did_activity: boolean
          id: string
          recorded_at: string
          recorded_by_profile_id: string
        }
        Insert: {
          checkin_date?: string
          client_id: string
          did_activity: boolean
          id?: string
          recorded_at?: string
          recorded_by_profile_id: string
        }
        Update: {
          checkin_date?: string
          client_id?: string
          did_activity?: boolean
          id?: string
          recorded_at?: string
          recorded_by_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_activity_checkin_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_activity_checkin_events_recorded_by_profile_id_fkey"
            columns: ["recorded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          method_configuration_snapshot_set_id: string | null
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
          method_configuration_snapshot_set_id?: string | null
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
          method_configuration_snapshot_set_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assessments_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assessments_finalized_by_profile_id_fkey"
            columns: ["finalized_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assessments_snapshot_set_client_fkey"
            columns: ["method_configuration_snapshot_set_id", "client_id"]
            isOneToOne: false
            referencedRelation: "method_configuration_snapshot_sets"
            referencedColumns: ["id", "client_id"]
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
      client_hydration_targets: {
        Row: {
          client_id: string
          created_at: string
          created_by_profile_id: string
          id: string
          method_configuration_snapshot_set_id: string | null
          method_key: string
          resolved_target_ml: number | null
          target_ml: number | null
          weight_kg: number
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by_profile_id: string
          id?: string
          method_configuration_snapshot_set_id?: string | null
          method_key?: string
          resolved_target_ml?: number | null
          target_ml?: number | null
          weight_kg: number
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by_profile_id?: string
          id?: string
          method_configuration_snapshot_set_id?: string | null
          method_key?: string
          resolved_target_ml?: number | null
          target_ml?: number | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_hydration_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_hydration_targets_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_hydration_targets_snapshot_set_client_fkey"
            columns: ["method_configuration_snapshot_set_id", "client_id"]
            isOneToOne: false
            referencedRelation: "method_configuration_snapshot_sets"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      client_liquid_intake_events: {
        Row: {
          amount_ml: number
          client_id: string
          id: string
          liquid_kind: string
          method_configuration_snapshot_set_id: string | null
          recorded_at: string
          recorded_by_profile_id: string
        }
        Insert: {
          amount_ml: number
          client_id: string
          id?: string
          liquid_kind: string
          method_configuration_snapshot_set_id?: string | null
          recorded_at?: string
          recorded_by_profile_id: string
        }
        Update: {
          amount_ml?: number
          client_id?: string
          id?: string
          liquid_kind?: string
          method_configuration_snapshot_set_id?: string | null
          recorded_at?: string
          recorded_by_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_liquid_events_snapshot_set_client_fkey"
            columns: ["method_configuration_snapshot_set_id", "client_id"]
            isOneToOne: false
            referencedRelation: "method_configuration_snapshot_sets"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "client_liquid_intake_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_liquid_intake_events_recorded_by_profile_id_fkey"
            columns: ["recorded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_method_configuration_override_versions: {
        Row: {
          activated_at: string | null
          activated_by_profile_id: string | null
          based_on_template_version_id: string
          client_id: string
          created_at: string
          created_by_profile_id: string
          id: string
          override_configuration: Json
          protocol_version_id: string | null
          reason: string | null
          retired_at: string | null
          retired_by_profile_id: string | null
          template_id: string
          version_number: number
        }
        Insert: {
          activated_at?: string | null
          activated_by_profile_id?: string | null
          based_on_template_version_id: string
          client_id: string
          created_at?: string
          created_by_profile_id: string
          id?: string
          override_configuration: Json
          protocol_version_id?: string | null
          reason?: string | null
          retired_at?: string | null
          retired_by_profile_id?: string | null
          template_id: string
          version_number: number
        }
        Update: {
          activated_at?: string | null
          activated_by_profile_id?: string | null
          based_on_template_version_id?: string
          client_id?: string
          created_at?: string
          created_by_profile_id?: string
          id?: string
          override_configuration?: Json
          protocol_version_id?: string | null
          reason?: string | null
          retired_at?: string | null
          retired_by_profile_id?: string | null
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_method_configuration_overri_activated_by_profile_id_fkey"
            columns: ["activated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_method_configuration_override_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_method_configuration_override_retired_by_profile_id_fkey"
            columns: ["retired_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_method_configuration_override_versions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_method_configuration_override_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "method_configuration_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_method_configuration_overrides_protocol_client_fkey"
            columns: ["protocol_version_id", "client_id"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "client_method_configuration_overrides_template_version_fkey"
            columns: ["based_on_template_version_id", "template_id"]
            isOneToOne: false
            referencedRelation: "method_configuration_versions"
            referencedColumns: ["id", "template_id"]
          },
        ]
      }
      client_notification_delivery_attempts: {
        Row: {
          attempt_number: number
          channel_key: string
          client_id: string
          completed_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          lease_expires_at: string
          notification_event_id: string
          provider_key: string
          provider_message_id: string | null
          started_at: string
          status: string
          weekly_feedback_id: string
        }
        Insert: {
          attempt_number: number
          channel_key: string
          client_id: string
          completed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          lease_expires_at: string
          notification_event_id: string
          provider_key: string
          provider_message_id?: string | null
          started_at?: string
          status: string
          weekly_feedback_id: string
        }
        Update: {
          attempt_number?: number
          channel_key?: string
          client_id?: string
          completed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          lease_expires_at?: string
          notification_event_id?: string
          provider_key?: string
          provider_message_id?: string | null
          started_at?: string
          status?: string
          weekly_feedback_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notification_delivery_attempt_notification_event_id_fkey"
            columns: ["notification_event_id"]
            isOneToOne: false
            referencedRelation: "client_notification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notification_delivery_attempts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notification_delivery_attempts_weekly_feedback_id_fkey"
            columns: ["weekly_feedback_id"]
            isOneToOne: false
            referencedRelation: "client_weekly_feedbacks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notification_events: {
        Row: {
          blocked_reason: string | null
          channel_key: string | null
          client_id: string
          created_at: string
          delivered_at: string | null
          delivery_state: string
          event_key: string
          id: string
          preference_version_id: string | null
          schedule_configuration_version_id: string
          weekly_feedback_id: string
        }
        Insert: {
          blocked_reason?: string | null
          channel_key?: string | null
          client_id: string
          created_at?: string
          delivered_at?: string | null
          delivery_state: string
          event_key: string
          id?: string
          preference_version_id?: string | null
          schedule_configuration_version_id: string
          weekly_feedback_id: string
        }
        Update: {
          blocked_reason?: string | null
          channel_key?: string | null
          client_id?: string
          created_at?: string
          delivered_at?: string | null
          delivery_state?: string
          event_key?: string
          id?: string
          preference_version_id?: string | null
          schedule_configuration_version_id?: string
          weekly_feedback_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notification_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notification_events_preference_version_id_fkey"
            columns: ["preference_version_id"]
            isOneToOne: false
            referencedRelation: "client_notification_preference_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notification_events_schedule_configuration_version__fkey"
            columns: ["schedule_configuration_version_id"]
            isOneToOne: false
            referencedRelation: "method_configuration_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notification_events_weekly_feedback_id_fkey"
            columns: ["weekly_feedback_id"]
            isOneToOne: false
            referencedRelation: "client_weekly_feedbacks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notification_preference_versions: {
        Row: {
          activated_at: string
          activated_by_profile_id: string
          channel_key: string
          client_id: string
          created_at: string
          created_by_profile_id: string
          id: string
          purpose_key: string
          retired_at: string | null
          retired_by_profile_id: string | null
          version_number: number
        }
        Insert: {
          activated_at?: string
          activated_by_profile_id: string
          channel_key: string
          client_id: string
          created_at?: string
          created_by_profile_id: string
          id?: string
          purpose_key: string
          retired_at?: string | null
          retired_by_profile_id?: string | null
          version_number: number
        }
        Update: {
          activated_at?: string
          activated_by_profile_id?: string
          channel_key?: string
          client_id?: string
          created_at?: string
          created_by_profile_id?: string
          id?: string
          purpose_key?: string
          retired_at?: string | null
          retired_by_profile_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_notification_preference_ver_activated_by_profile_id_fkey"
            columns: ["activated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notification_preference_versi_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notification_preference_versi_retired_by_profile_id_fkey"
            columns: ["retired_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notification_preference_versions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      client_training_plan_items: {
        Row: {
          created_at: string
          execution_notes: string | null
          exercise_name: string
          exercise_version_id: string | null
          id: string
          position: number
          repetitions_text: string
          rest_text: string | null
          sets_text: string
          training_plan_version_id: string
        }
        Insert: {
          created_at?: string
          execution_notes?: string | null
          exercise_name: string
          exercise_version_id?: string | null
          id?: string
          position: number
          repetitions_text: string
          rest_text?: string | null
          sets_text: string
          training_plan_version_id: string
        }
        Update: {
          created_at?: string
          execution_notes?: string | null
          exercise_name?: string
          exercise_version_id?: string | null
          id?: string
          position?: number
          repetitions_text?: string
          rest_text?: string | null
          sets_text?: string
          training_plan_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_training_plan_items_exercise_version_id_fkey"
            columns: ["exercise_version_id"]
            isOneToOne: false
            referencedRelation: "exercise_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_training_plan_items_training_plan_version_id_fkey"
            columns: ["training_plan_version_id"]
            isOneToOne: false
            referencedRelation: "client_training_plan_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_training_plan_versions: {
        Row: {
          created_at: string
          created_by_profile_id: string
          id: string
          notes: string | null
          published_at: string | null
          published_by_profile_id: string | null
          reviewed_at: string | null
          reviewed_by_profile_id: string | null
          title: string
          training_plan_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by_profile_id: string
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by_profile_id?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          title: string
          training_plan_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by_profile_id?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          title?: string
          training_plan_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_training_plan_versions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_training_plan_versions_published_by_profile_id_fkey"
            columns: ["published_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_training_plan_versions_reviewed_by_profile_id_fkey"
            columns: ["reviewed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_training_plan_versions_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "client_training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_training_plans: {
        Row: {
          client_id: string
          created_at: string
          id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_training_plans_client_id_fkey"
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
      client_weekly_feedbacks: {
        Row: {
          answers: Json
          client_id: string
          created_at: string
          due_at: string | null
          form_version_id: string
          id: string
          period_end: string
          period_start: string
          request_source: string
          requested_by_profile_id: string | null
          schedule_configuration_version_id: string | null
          submitted_at: string | null
        }
        Insert: {
          answers?: Json
          client_id: string
          created_at?: string
          due_at?: string | null
          form_version_id: string
          id?: string
          period_end: string
          period_start: string
          request_source?: string
          requested_by_profile_id?: string | null
          schedule_configuration_version_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          answers?: Json
          client_id?: string
          created_at?: string
          due_at?: string | null
          form_version_id?: string
          id?: string
          period_end?: string
          period_start?: string
          request_source?: string
          requested_by_profile_id?: string | null
          schedule_configuration_version_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_weekly_feedbacks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_weekly_feedbacks_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "weekly_feedback_form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_weekly_feedbacks_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_weekly_feedbacks_schedule_configuration_version_id_fkey"
            columns: ["schedule_configuration_version_id"]
            isOneToOne: false
            referencedRelation: "method_configuration_versions"
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
      method_configuration_snapshot_overrides: {
        Row: {
          client_id: string
          created_at: string
          override_version_id: string
          precedence: number
          snapshot_id: string
          template_id: string
          template_version_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          override_version_id: string
          precedence: number
          snapshot_id: string
          template_id: string
          template_version_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          override_version_id?: string
          precedence?: number
          snapshot_id?: string
          template_id?: string
          template_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "method_configuration_snapshot_overrides_override_fkey"
            columns: [
              "override_version_id",
              "client_id",
              "template_id",
              "template_version_id",
            ]
            isOneToOne: false
            referencedRelation: "client_method_configuration_override_versions"
            referencedColumns: [
              "id",
              "client_id",
              "template_id",
              "based_on_template_version_id",
            ]
          },
          {
            foreignKeyName: "method_configuration_snapshot_overrides_snapshot_fkey"
            columns: [
              "snapshot_id",
              "client_id",
              "template_id",
              "template_version_id",
            ]
            isOneToOne: false
            referencedRelation: "method_configuration_snapshots"
            referencedColumns: [
              "id",
              "client_id",
              "template_id",
              "template_version_id",
            ]
          },
        ]
      }
      method_configuration_snapshot_sets: {
        Row: {
          client_id: string
          created_at: string
          created_by_profile_id: string
          engine_contract_version: number
          id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by_profile_id: string
          engine_contract_version: number
          id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by_profile_id?: string
          engine_contract_version?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "method_configuration_snapshot_sets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "method_configuration_snapshot_sets_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      method_configuration_snapshots: {
        Row: {
          client_id: string
          created_at: string
          id: string
          input_values: Json
          resolved_configuration: Json
          result_values: Json
          snapshot_set_id: string
          template_id: string
          template_key: string
          template_version_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          input_values: Json
          resolved_configuration: Json
          result_values: Json
          snapshot_set_id: string
          template_id: string
          template_key: string
          template_version_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          input_values?: Json
          resolved_configuration?: Json
          result_values?: Json
          snapshot_set_id?: string
          template_id?: string
          template_key?: string
          template_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "method_configuration_snapshots_set_client_fkey"
            columns: ["snapshot_set_id", "client_id"]
            isOneToOne: false
            referencedRelation: "method_configuration_snapshot_sets"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "method_configuration_snapshots_template_key_fkey"
            columns: ["template_id", "template_key"]
            isOneToOne: false
            referencedRelation: "method_configuration_templates"
            referencedColumns: ["id", "template_key"]
          },
          {
            foreignKeyName: "method_configuration_snapshots_template_version_fkey"
            columns: ["template_version_id", "template_id"]
            isOneToOne: false
            referencedRelation: "method_configuration_versions"
            referencedColumns: ["id", "template_id"]
          },
        ]
      }
      method_configuration_templates: {
        Row: {
          config_schema_key: string
          created_at: string
          created_by_kind: string
          created_by_profile_id: string | null
          description: string | null
          display_name: string
          domain_key: string
          id: string
          template_key: string
        }
        Insert: {
          config_schema_key: string
          created_at?: string
          created_by_kind?: string
          created_by_profile_id?: string | null
          description?: string | null
          display_name: string
          domain_key: string
          id?: string
          template_key: string
        }
        Update: {
          config_schema_key?: string
          created_at?: string
          created_by_kind?: string
          created_by_profile_id?: string | null
          description?: string | null
          display_name?: string
          domain_key?: string
          id?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "method_configuration_templates_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      method_configuration_versions: {
        Row: {
          activated_at: string | null
          activated_by_profile_id: string | null
          configuration: Json
          created_at: string
          created_by_kind: string
          created_by_profile_id: string | null
          id: string
          retired_at: string | null
          retired_by_profile_id: string | null
          schema_version: number
          source_kind: string
          source_reference: string | null
          template_id: string
          version_number: number
        }
        Insert: {
          activated_at?: string | null
          activated_by_profile_id?: string | null
          configuration: Json
          created_at?: string
          created_by_kind?: string
          created_by_profile_id?: string | null
          id?: string
          retired_at?: string | null
          retired_by_profile_id?: string | null
          schema_version: number
          source_kind: string
          source_reference?: string | null
          template_id: string
          version_number: number
        }
        Update: {
          activated_at?: string | null
          activated_by_profile_id?: string | null
          configuration?: Json
          created_at?: string
          created_by_kind?: string
          created_by_profile_id?: string | null
          id?: string
          retired_at?: string | null
          retired_by_profile_id?: string | null
          schema_version?: number
          source_kind?: string
          source_reference?: string | null
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "method_configuration_versions_activated_by_profile_id_fkey"
            columns: ["activated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "method_configuration_versions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "method_configuration_versions_retired_by_profile_id_fkey"
            columns: ["retired_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "method_configuration_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "method_configuration_templates"
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
      weekly_feedback_form_versions: {
        Row: {
          created_at: string
          definition: Json
          id: string
          published_at: string | null
          title: string
          version_number: number
        }
        Insert: {
          created_at?: string
          definition: Json
          id?: string
          published_at?: string | null
          title: string
          version_number: number
        }
        Update: {
          created_at?: string
          definition?: Json
          id?: string
          published_at?: string | null
          title?: string
          version_number?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_client_notification_preference_version_server: {
        Args: {
          p_actor_profile_id: string
          p_channel_key: string
          p_client_id: string
          p_expected_active_version_id: string | null
          p_purpose_key: string
        }
        Returns: string
      }
      activate_method_configuration_version_server: {
        Args: {
          p_actor_profile_id: string
          p_configuration: Json
          p_expected_active_version_id: string
          p_source_reference: string
          p_template_id: string
        }
        Returns: string
      }
      claim_weekly_feedback_email_deliveries_server: {
        Args: { p_limit?: number; p_now?: string }
        Returns: {
          attempt_id: string
          client_id: string
          notification_event_id: string
          period_end: string
          period_start: string
          recipient_email: string
          weekly_feedback_id: string
        }[]
      }
      clone_protocol_version_draft: {
        Args: { p_plan_snapshot: Json; p_source_protocol_version_id: string }
        Returns: string
      }
      complete_ai_execution: {
        Args: { p_content: Json; p_execution_id: string }
        Returns: undefined
      }
      complete_weekly_feedback_email_delivery_server: {
        Args: {
          p_attempt_id: string
          p_now?: string
          p_provider_message_id: string
        }
        Returns: string
      }
      create_client_training_plan_draft: {
        Args: { p_client_id: string; p_notes?: string; p_title: string }
        Returns: string
      }
      create_hydration_target_from_method_snapshot: {
        Args: {
          p_client_id: string
          p_created_by_profile_id: string
          p_override_version_id?: string
          p_resolved_configuration: Json
          p_resolved_target_ml: number
          p_result_values: Json
          p_template_version_id: string
          p_weight_kg: number
        }
        Returns: string
      }
      create_liquid_intake_event_from_method_snapshot: {
        Args: {
          p_amount_ml: number
          p_client_id: string
          p_liquid_kind: string
          p_recorded_by_profile_id: string
          p_resolved_configuration: Json
          p_result_values: Json
          p_template_version_id: string
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
      fail_weekly_feedback_email_delivery_server: {
        Args: {
          p_attempt_id: string
          p_failure_code: string
          p_failure_message?: string
          p_now?: string
        }
        Returns: string
      }
      finalize_assessment_from_method_snapshot: {
        Args: {
          p_assessment_id: string
          p_catalog_configuration: Json
          p_catalog_result_values: Json
          p_catalog_template_version_id: string
          p_definition_configuration: Json
          p_definition_result_values: Json
          p_definition_template_version_id: string
          p_finalized_by_profile_id: string
        }
        Returns: string
      }
      generate_weekly_feedback_reminder_events: {
        Args: { p_now?: string }
        Returns: number
      }
      list_current_client_finalized_assessment_measurements: {
        Args: never
        Returns: {
          assessment_id: string
          assessed_at: string
          assessment_kind: string | null
          measurement_key: string
          measurement_value: number
          unit: string
        }[]
      }
      meal_plan_version_is_draft: {
        Args: { p_meal_plan_version_id: string }
        Returns: boolean
      }
      meal_plan_version_is_published_for_current_client: {
        Args: { p_meal_plan_version_id: string }
        Returns: boolean
      }
      publish_client_training_plan_version: {
        Args: { p_training_plan_version_id: string }
        Returns: string
      }
      record_ai_finding_action_server: {
        Args: {
          p_acted_by_profile_id: string
          p_action: string
          p_execution_id: string
          p_finding_index: number
          p_note?: string
        }
        Returns: {
          action_id: string
          anamnesis_review_id: string
        }[]
      }
      review_client_training_plan_version: {
        Args: { p_training_plan_version_id: string }
        Returns: string
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
