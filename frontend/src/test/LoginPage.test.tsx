import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockSetAuth = vi.fn()
vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: any) => selector({ setAuth: mockSetAuth, token: null, user: null }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Mock the authApi used by LoginPage
vi.mock('../lib/api', () => ({
  default: {},
  authApi: { login: vi.fn() },
}))

const renderLogin = () => render(<MemoryRouter><LoginPage /></MemoryRouter>)

// Helpers — match actual Stitch placeholders
const getEmailInput  = () => screen.getByPlaceholderText(/user_id@fedhealth\.ai/i)
const getPasswordInput = () => screen.getByPlaceholderText(/••••••••••••/)
const getSignInBtn   = () => screen.getByRole('button', { name: /sign in/i })

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders email and password inputs', () => {
    renderLogin()
    expect(getEmailInput()).toBeInTheDocument()
    expect(getPasswordInput()).toBeInTheDocument()
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
    await userEvent.click(screen.getByText('Patient'))
    expect((getEmailInput() as HTMLInputElement).value).toBe('patient@example.com')
  })

  it('shows error toast on failed login', async () => {
    const { toast } = await import('sonner')
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false })
    renderLogin()

    await userEvent.type(getEmailInput(), 'bad@example.com')
    await userEvent.type(getPasswordInput(), 'wrongpass')
    fireEvent.submit(getSignInBtn())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/authentication failed/i)
    ))
  })

  it('calls setAuth and navigates on successful patient login', async () => {
    const { authApi } = await import('../lib/api')
    vi.mocked(authApi.login).mockResolvedValueOnce({
      access_token: 'header.' + btoa(JSON.stringify({ hospital_id: 'HOSP_001' })) + '.sig',
      token_type: 'bearer',
      role: 'patient',
    })
    renderLogin()

    await userEvent.type(getEmailInput(), 'patient@example.com')
    await userEvent.type(getPasswordInput(), 'password')
    fireEvent.submit(getSignInBtn())

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/patient')
    })
  })

  it('navigates to /admin for super_admin role', async () => {
    const { authApi } = await import('../lib/api')
    vi.mocked(authApi.login).mockResolvedValueOnce({
      access_token: 'header.' + btoa(JSON.stringify({})) + '.sig',
      token_type: 'bearer',
      role: 'super_admin',
    })
    renderLogin()

    await userEvent.type(getEmailInput(), 'admin@example.com')
    await userEvent.type(getPasswordInput(), 'password')
    fireEvent.submit(getSignInBtn())

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'))
  })
})
