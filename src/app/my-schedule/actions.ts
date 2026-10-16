"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { setlistAssignmentResponseSchema } from "@/lib/service-assignment-validation"
import { createClient } from "@/lib/supabase/server"

export type AssignmentResponseState = {
  success: boolean
  status: "confirmed" | "declined" | null
  error: string
}

async function getCurrentUser() {
  const supabase = await createClient()

  const { data: claimsData } =
    await supabase.auth.getClaims()

  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  return {
    supabase,
    userId,
  }
}

export async function respondToSetlistAssignment(
  assignmentId: string,
  status: string,
  responseNote?: string
): Promise<AssignmentResponseState> {
  const parsedResponse = setlistAssignmentResponseSchema.safeParse({
    assignmentId,
    status,
    responseNote: responseNote ?? "",
  })

  if (!parsedResponse.success) {
    return {
      success: false,
      status: null,
      error: "The confirmation response is invalid.",
    }
  }

  const {
    supabase,
    userId,
  } = await getCurrentUser()

  const { error } = await supabase.rpc(
    "respond_to_setlist_assignment",
    {
      p_assignment_id:
        parsedResponse.data.assignmentId,
      p_status:
        parsedResponse.data.status,
      p_response_note:
        parsedResponse.data.responseNote || null,
    }
  )

  if (error) {
    console.error(
      "respond_to_setlist_assignment failed:",
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        assignmentId:
          parsedResponse.data.assignmentId,
        userId,
      }
    )

    if (
      error.message.includes(
        "AUTHENTICATION_REQUIRED"
      )
    ) {
      return {
        success: false,
        status: null,
        error:
          "Your session could not be verified. Please sign in again.",
      }
    }

    if (
      error.message.includes(
        "ASSIGNMENT_NOT_FOUND"
      )
    ) {
      return {
        success: false,
        status: null,
        error:
          "This service assignment could not be found.",
      }
    }

    if (
      error.message.includes(
        "MEMBERSHIP_REQUIRED"
      )
    ) {
      return {
        success: false,
        status: null,
        error:
          "You are no longer a member of this church.",
      }
    }

    if (
      error.message.includes(
        "INVALID_CONFIRMATION_STATUS"
      )
    ) {
      return {
        success: false,
        status: null,
        error:
          "The confirmation response is invalid.",
      }
    }

    if (
      error.message.includes(
        "RESPONSE_NOTE_TOO_LONG"
      )
    ) {
      return {
        success: false,
        status: null,
        error:
          "Your response note must be 500 characters or fewer.",
      }
    }

    return {
      success: false,
      status: null,
      error:
        "The assignment response could not be saved. Please try again.",
    }
  }

  revalidatePath("/my-schedule")
  revalidatePath("/services")

  return {
    success: true,
    status: parsedResponse.data.status,
    error: "",
  }
}