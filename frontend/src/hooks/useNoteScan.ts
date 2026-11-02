import { useMutation } from "@tanstack/react-query"

import {
  type ApiError,
  type NoteSaveResponse,
  type NoteScanResponse,
  NotesService,
} from "@/client"

/**
 * Mutation d'analyse d'une photo de fiche → matricule + note reconnus.
 */
export function useScanNote() {
  return useMutation<NoteScanResponse, ApiError, Blob>({
    mutationFn: (image: Blob) =>
      NotesService.scanNote({ formData: { image } }),
  })
}

export interface SaveNotePayload {
  matricule: string
  note: number
  assessment_id: string
}

/**
 * Mutation d'enregistrement/actualisation de la note d'un étudiant.
 */
export function useSaveNote() {
  return useMutation<NoteSaveResponse, ApiError, SaveNotePayload>({
    mutationFn: (payload: SaveNotePayload) =>
      NotesService.saveNote({ requestBody: payload }),
  })
}
