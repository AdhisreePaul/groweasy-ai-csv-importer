export interface AiInputRecord {
  source_row: number;
  raw_record: Record<string, unknown>;
}

export interface AiBatchRequest {
  batch_id?: string | undefined;
  records: AiInputRecord[];
  default_data_source?: string | undefined;
}

export interface AiPromptMessages {
  system: string;
  user: string;
}

export interface AiProvider {
  readonly name: string;
  extractBatch(
    request: AiBatchRequest,
    prompt: AiPromptMessages
  ): Promise<string>;
}
