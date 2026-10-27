import { apiRequest } from "./client"
import { getAccessToken } from "./session"

export interface LibraryBook {
  id: number
  title: string
  author: string
  category: string
  isbn: string
  edition: string | null
  total_copies: number
  available_copies: number
  issued_copies: number
  reserved_copies: number
  cover_color: string
  pdf_url: string | null
  pdf_name: string | null
}

export interface MyBook {
  borrow_id: number
  status: "reserved" | "issued"
  borrow_date: string | null
  due_date: string | null
  reservation_date: string | null
  book_id: number
  title: string
  author: string
  edition: string | null
  category: string
  cover_color: string
  pdf_url: string | null
  pdf_name: string | null
}

/* =========================
   ADMIN LIBRARY TYPES
========================= */

export interface LibraryBorrowRecord {
  borrow_id: number
  status: "reserved" | "issued"
  reservation_date: string
  borrow_date: string | null
  due_date: string | null

  book_id: number
  title: string
  isbn: string

  user_id: string
  first_name: string
  last_name: string
  email: string
  role: "student" | "faculty"
  roll_no: string | null
  faculty_id: string | null
}

export interface AddBookData {
  title: string
  author: string
  category: string
  isbn: string
  edition: string
  totalCopies: number
  coverColor?: string
  pdfFile?: File | null
}

export interface UpdateBookData {
  title: string
  author: string
  category: string
  isbn: string
  edition: string
  totalCopies: number
  pdfFile?: File | null
  removePdf?: boolean
}

export interface AdminBookResponse {
  message: string
  id?: number
  title?: string
  pdf_url?: string | null
  pdf_name?: string | null
}

/* =========================
   STUDENT / FACULTY LIBRARY
========================= */

export async function getLibraryBooks(
  params: {
    category?: string
    search?: string
    availableOnly?: boolean
  } = {}
): Promise<LibraryBook[]> {
  const query = new URLSearchParams()

  if (params.category && params.category !== "All") {
    query.set("category", params.category)
  }

  if (params.search) {
    query.set("search", params.search)
  }

  if (params.availableOnly) {
    query.set("availableOnly", "true")
  }

  const queryString = query.toString()

  return apiRequest<LibraryBook[]>(
    `/api/library/books${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function getMyBooks(): Promise<MyBook[]> {
  return apiRequest<MyBook[]>("/api/library/my-books", {
    method: "GET",
    token: getAccessToken() ?? undefined,
  })
}

export async function reserveBook(
  bookId: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/library/reserve", {
    method: "POST",
    token: getAccessToken() ?? undefined,
    body: JSON.stringify({
      bookId,
    }),
  })
}

export async function cancelReservation(
  borrowId: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    "/api/library/cancel-reservation",
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({
        borrowId,
      }),
    }
  )
}

/* =========================
   ADMIN LIBRARY
========================= */

export async function getAdminRecords(): Promise<LibraryBorrowRecord[]> {
  return apiRequest<LibraryBorrowRecord[]>(
    "/api/library/admin/records",
    {
      method: "GET",
      token: getAccessToken() ?? undefined,
    }
  )
}

export async function adminIssueBook(
  borrowId: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    "/api/library/admin/issue",
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({
        borrowId,
      }),
    }
  )
}

export async function adminReturnBook(
  borrowId: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    "/api/library/admin/return",
    {
      method: "POST",
      token: getAccessToken() ?? undefined,
      body: JSON.stringify({
        borrowId,
      }),
    }
  )
}

/*
 * apiRequest() automatically sets Content-Type to application/json.
 * Book creation/editing can contain a PDF file, so these requests
 * must use FormData instead.
 */

async function libraryMultipartRequest<T>(
  endpoint: string,
  formData: FormData,
  method: "POST" | "PUT"
): Promise<T> {
  const token = getAccessToken()

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}${endpoint}`,
    {
      method,
      headers: {
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
      body: formData,
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.detail ||
        "Something went wrong with the library request."
    )
  }

  return data as T
}

export async function adminAddBook(
  data: AddBookData
): Promise<AdminBookResponse> {
  const formData = new FormData()

  formData.append("title", data.title)
  formData.append("author", data.author)
  formData.append("category", data.category)
  formData.append("isbn", data.isbn)
  formData.append("edition", data.edition)
  formData.append("totalCopies", String(data.totalCopies))

  if (data.coverColor) {
    formData.append("coverColor", data.coverColor)
  }

  if (data.pdfFile) {
    formData.append("pdfFile", data.pdfFile)
  }

  return libraryMultipartRequest<AdminBookResponse>(
    "/api/library/admin/add-book",
    formData,
    "POST"
  )
}

export async function adminUpdateBook(
  bookId: number,
  data: UpdateBookData
): Promise<AdminBookResponse> {
  const formData = new FormData()

  formData.append("title", data.title)
  formData.append("author", data.author)
  formData.append("category", data.category)
  formData.append("isbn", data.isbn)
  formData.append("edition", data.edition)
  formData.append("totalCopies", String(data.totalCopies))

  if (data.pdfFile) {
    formData.append("pdfFile", data.pdfFile)
  }

  if (data.removePdf) {
    formData.append("removePdf", "true")
  }

  return libraryMultipartRequest<AdminBookResponse>(
    `/api/library/books/${bookId}`,
    formData,
    "PUT"
  )
}

export async function adminDeleteBook(
  bookId: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/api/library/books/${bookId}`,
    {
      method: "DELETE",
      token: getAccessToken() ?? undefined,
    }
  )
}