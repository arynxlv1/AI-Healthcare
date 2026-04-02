import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NavBar } from '../components/NavBar'

const mockNavigate = vi.fn()
const mockLogout = vi.fn()

// NavBar calls useAuthStore() with no selector — return the store object directly
let mockStoreState = {
  user: { email: 'doctor@example.com', role: 'doctor', hospital_id: 'HOSP_001' } as any,
  logout: mockLogout,
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../store/authStore', () => ({
  useAuthStore: () => mockStoreState,
}))

const renderNavBar = () => render(<MemoryRouter><NavBar /></MemoryRouter>)

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState = {
      user: { email: 'doctor@example.com', role: 'doctor', hospital_id: 'HOSP_001' },
      logout: mockLogout,
    }
  })

  it('renders brand name', () => {
    renderNavBar()
    expect(screen.getByText('FedHealth AI')).toBeInTheDocument()
  })

  it('shows Doctor role badge', () => {
    renderNavBar()
    expect(screen.getByText('Doctor')).toBeInTheDocument()
  })

  it('shows Patient role badge', () => {
    mockStoreState.user = { email: 'patient@example.com', role: 'patient', hospital_id: 'HOSP_001' }
    renderNavBar()
    expect(screen.getByText('Patient')).toBeInTheDocument()
  })

  it('calls logout and navigates to /login on sign out', () => {
    renderNavBar()
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockLogout).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('renders nothing when user is null', () => {
    mockStoreState.user = null
    const { container } = renderNavBar()
    expect(container.firstChild).toBeNull()
  })
})
