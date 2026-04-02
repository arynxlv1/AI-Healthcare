import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock auth store
const mockSetAuth = vi.fn()
vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: any) => selector({ setAuth: mockSetAuth, token: null, user: null }),
}))

// Mock sonner toast
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const renderLogin = () =>
  render(<MemoryRouter><LoginPage /></MemoryRouter>)

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders email and password inputs', () => {
    renderLogin()
    expect(screen.getByPlaceholderText(/name@hospital\.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument()
  })

  it('renders all four demo account buttons', () => {
    renderLogin()
    expect(screen.getByText('Patient')).toBeInTheDocument()
    expect(screen.getByText('Doctor')).toBeInTheDocument()
    expect(screen.getByText('Hospital Admin')).toBeInTheDocument()
    expect(screen.getByText('Super Admin')).toBeInTheDocument()
  })

  it('fills email when a demo account is clicked', async () => {
    renderLogin()
    const patientBtn = screen.getByText('Patient')
    await userEvent.click(patientBtn)
    const emailInput = screen.getByPlaceholderText(/name@hospital\.com/i) as HTMLInputElement
    expect(emailInput.value).toBe('patient@example.com')
  })

  it('shows error toast on failed login', async () => {
    const { toast } = await import('sonner')
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false })
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText(/name@hospital\.com/i), 'bad@example.com')
    await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'wrongpass')
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/login failed/i)
    ))
  })

  it('calls setAuth and navigates on successful patient login', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'header.' + btoa(JSON.stringify({ hospital_id: 'HOSP_001' })) + '.sig',
        role: 'patient',
      }),
    })
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText(/name@hospital\.com/i), 'patient@example.com')
    await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'password')
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/patient')
    })
  })

  it('navigates to /admin for super_admin role', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'header.' + btoa(JSON.stringify({})) + '.sig',
        role: 'super_admin',
      }),
    })
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText(/name@hospital\.com/i), 'admin@example.com')
    await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'password')
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'))
  })
})
